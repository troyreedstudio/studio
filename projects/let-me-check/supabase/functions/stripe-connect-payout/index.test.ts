// supabase/functions/stripe-connect-payout/index.test.ts
// Deno unit tests for the stripe-connect-payout Edge Function.
// Run: deno test --allow-env supabase/functions/stripe-connect-payout/index.test.ts
//
// Money-integrity invariants:
//   Test 1 (auth):         callerId null → 401.
//   Test 2 (validation):   amountCents <= 0 → 400; no Stripe call.
//   Test 3 (standard):     payout_speed 'standard' → payouts.create with method:'standard'.
//   Test 4 (instant net):  instant payout amount > instantNet → 400 'insufficient instant balance';
//                           amount <= instantNet → payouts.create with method:'instant';
//                           amount NEVER exceeds net_available (Pitfall 5).
//   Test 5 (no account):   missing scout_stripe_accounts → 400 'no payout account'.
//   Test 6 (event log):    log_event payment.payout_initiated called BEFORE payouts.create.

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Fake secrets BEFORE any module import.
Deno.env.set("STRIPE_SECRET_KEY", "sk_test_FAKE_payout_DO_NOT_LEAK");
Deno.env.set("STRIPE_WEBHOOK_SECRET", "whsec_fake_payout_DO_NOT_LEAK");
Deno.env.set("SUPABASE_URL", "https://fake.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service_role_fake_payout");
Deno.env.set("SUPABASE_ANON_KEY", "anon_fake_payout");

import { handleRequestPayout } from "./index.ts";

// ── Mock helpers ────────────────────────────────────────────────────────────

type MockSvcOpts = {
  scoutAccount?: Record<string, unknown> | null;
};

function makeSvc(opts: MockSvcOpts) {
  const rpcCalls: Array<{ fn: string; args: unknown; calledAt: number }> = [];
  let callIdx = 0;

  return {
    _rpcCalls: rpcCalls,
    from(table: string) {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, _val: string) {
              return {
                maybeSingle() {
                  if (table === "scout_stripe_accounts") {
                    return Promise.resolve({ data: opts.scoutAccount ?? null, error: null });
                  }
                  return Promise.resolve({ data: null, error: null });
                },
              };
            },
          };
        },
      };
    },
    rpc(fn: string, args: unknown) {
      rpcCalls.push({ fn, args, calledAt: callIdx++ });
      return Promise.resolve({ data: null, error: null });
    },
  };
}

type MockStripeOpts = {
  instantNetCents?: number;
  availableCents?: number;
  payoutId?: string;
  trackCallOrder?: Array<string>;
};

function mockStripe(opts: MockStripeOpts) {
  const log = {
    payoutsCreate: [] as Array<{ args: Record<string, unknown>; idx: number }>,
    balanceCalls: 0,
  };
  let callIdx = 0;

  // Shared call order tracker (mutable ref so both balance + payouts write to it)
  const callOrder = opts.trackCallOrder ?? [];

  return {
    _log: log,
    balance: {
      retrieve(_params: unknown, _stripeOpts: unknown) {
        log.balanceCalls++;
        callOrder.push("balance.retrieve");
        return Promise.resolve({
          available: [{ currency: "usd", amount: opts.availableCents ?? 10000 }],
          instant_available: opts.instantNetCents !== undefined
            ? [{ currency: "usd", net_available: [{ amount: opts.instantNetCents }] }]
            : undefined,
        });
      },
    },
    payouts: {
      create(args: Record<string, unknown>, _stripeOpts: unknown) {
        callOrder.push("payouts.create");
        log.payoutsCreate.push({ args, idx: callIdx++ });
        return Promise.resolve({ id: opts.payoutId ?? "po_test_001" });
      },
    },
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

// Test 1: auth gate — callerId null → 401
Deno.test("stripe-connect-payout: null callerId → 401", async () => {
  const svc = makeSvc({});
  const stripe = mockStripe({});

  const res = await handleRequestPayout(
    { callerId: null, body: { amountCents: 1000 } },
    { stripe, svc },
  );

  assertEquals(res.status, 401);
  assertEquals(stripe._log.payoutsCreate.length, 0, "no Stripe payout on 401");
});

// Test 2: amountCents <= 0 → 400, no Stripe call
Deno.test("stripe-connect-payout: amountCents <= 0 → 400, no Stripe call", async () => {
  const svc = makeSvc({
    scoutAccount: { stripe_account_id: "acct_test", payout_speed: "standard" },
  });
  const stripe = mockStripe({});

  const res = await handleRequestPayout(
    { callerId: "scout-abc", body: { amountCents: 0 } },
    { stripe, svc },
  );

  assertEquals(res.status, 400);
  assertEquals(stripe._log.payoutsCreate.length, 0, "no payout.create on invalid amount");
  assertEquals(stripe._log.balanceCalls, 0, "no balance.retrieve on invalid amount");
});

// Test 3: standard payout — method:'standard', correct stripeAccount
Deno.test("stripe-connect-payout: standard payout → payouts.create with method:'standard'", async () => {
  const svc = makeSvc({
    scoutAccount: { stripe_account_id: "acct_standard_test", payout_speed: "standard" },
  });
  const stripe = mockStripe({ payoutId: "po_standard_001" });

  const res = await handleRequestPayout(
    { callerId: "scout-standard", body: { amountCents: 5000 } },
    { stripe, svc },
  );
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.status, "initiated");
  assertEquals(body.payoutId, "po_standard_001");

  assertEquals(stripe._log.payoutsCreate.length, 1, "exactly one payout.create");
  const createArgs = stripe._log.payoutsCreate[0].args;
  assertEquals(createArgs.method, "standard", "method must be 'standard'");
  assertEquals(createArgs.amount, 5000, "amount must match requested");
  assertEquals(createArgs.currency, "usd");

  // Standard payout does not call balance.retrieve
  assertEquals(stripe._log.balanceCalls, 0, "no balance check for standard payout");
});

// Test 4a: instant payout — amount within net_available → payouts.create with method:'instant'
Deno.test("stripe-connect-payout: instant within net → payouts.create method:'instant'", async () => {
  const svc = makeSvc({
    scoutAccount: { stripe_account_id: "acct_instant_001", payout_speed: "instant" },
  });
  const stripe = mockStripe({
    availableCents: 10000,
    instantNetCents: 9800, // net after 2% fee
    payoutId: "po_instant_001",
  });

  const res = await handleRequestPayout(
    { callerId: "scout-instant", body: { amountCents: 5000 } }, // 5000 < 9800 net
    { stripe, svc },
  );
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.status, "initiated");

  assertEquals(stripe._log.payoutsCreate.length, 1);
  const createArgs = stripe._log.payoutsCreate[0].args;
  assertEquals(createArgs.method, "instant", "method must be 'instant'");
  assertEquals(createArgs.amount, 5000, "amount must match requested (within net)");
});

// Test 4b: instant payout — amount exceeds net_available → 400 (Pitfall 5 guard)
Deno.test("stripe-connect-payout: instant amount > net_available → 400 insufficient balance", async () => {
  const svc = makeSvc({
    scoutAccount: { stripe_account_id: "acct_instant_002", payout_speed: "instant" },
  });
  const stripe = mockStripe({
    availableCents: 10000,
    instantNetCents: 9800, // net after 2% fee
  });

  const res = await handleRequestPayout(
    { callerId: "scout-overdraw", body: { amountCents: 9900 } }, // 9900 > 9800 net
    { stripe, svc },
  );

  assertEquals(res.status, 400, "Pitfall 5 guard: must reject amount exceeding net_available");
  assertEquals(
    stripe._log.payoutsCreate.length,
    0,
    "payouts.create must NOT be called when amount exceeds net",
  );
});

// Test 5: no scout_stripe_accounts → 400 'no payout account'
Deno.test("stripe-connect-payout: no stripe account → 400 no payout account", async () => {
  const svc = makeSvc({ scoutAccount: null });
  const stripe = mockStripe({});

  const res = await handleRequestPayout(
    { callerId: "scout-no-account", body: { amountCents: 1000 } },
    { stripe, svc },
  );

  assertEquals(res.status, 400);
  const text = await res.text();
  assert(
    text.includes("no payout account") || text.includes("account"),
    "response must indicate missing account",
  );
  assertEquals(stripe._log.payoutsCreate.length, 0, "no payout.create without account");
});

// Test 6: event log called BEFORE payouts.create (audit-first, double-payout mitigation)
Deno.test("stripe-connect-payout: log_event payment.payout_initiated called BEFORE payouts.create", async () => {
  const callOrder: string[] = [];
  const svc = makeSvc({
    scoutAccount: { stripe_account_id: "acct_order_test", payout_speed: "standard" },
  });
  // Override rpc to track order
  const rpcCalls: Array<{ fn: string; calledAt: number }> = [];
  let callIdx = 0;
  const svcWithTracking = {
    ...svc,
    _rpcCalls: rpcCalls,
    rpc(fn: string, args: unknown) {
      const idx = callIdx++;
      callOrder.push(`rpc:${fn}`);
      rpcCalls.push({ fn, calledAt: idx });
      return Promise.resolve({ data: null, error: null });
    },
  };
  const stripe = mockStripe({ trackCallOrder: callOrder });

  await handleRequestPayout(
    { callerId: "scout-order-test", body: { amountCents: 2000 } },
    { stripe, svc: svcWithTracking },
  );

  const logEventIdx = callOrder.indexOf("rpc:log_event");
  const payoutsCreateIdx = callOrder.indexOf("payouts.create");

  assert(logEventIdx !== -1, "log_event must be called");
  assert(payoutsCreateIdx !== -1, "payouts.create must be called");
  assert(
    logEventIdx < payoutsCreateIdx,
    `AUDIT-FIRST: log_event (idx ${logEventIdx}) must be called BEFORE payouts.create (idx ${payoutsCreateIdx})`,
  );
});
