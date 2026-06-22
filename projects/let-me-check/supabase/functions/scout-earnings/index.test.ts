// supabase/functions/scout-earnings/index.test.ts
// Deno unit tests for the scout-earnings Edge Function.
// Run: deno test --allow-env supabase/functions/scout-earnings/index.test.ts
//
// Tests cover:
//   Test 1 (auth):           callerId null → 401.
//   Test 2 (DB aggregate):   weeklyByDay and allTimeCents reflect DB values (not constants);
//                             ownership: scoutId = callerId (IDOR-safe — no body scoutId).
//   Test 3 (instant net):    balance.instant_available.net_available → instantNetCents (not gross).
//   Test 4 (no account):     missing scout_stripe_accounts → 0 balances, empty payouts, no Stripe call.
//   Test 5 (payouts list):   stripe.payouts.list maps to id/amountCents/status/arrivalDate/method.

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Fake secrets BEFORE any module import.
Deno.env.set("STRIPE_SECRET_KEY", "sk_test_FAKE_earnings_DO_NOT_LEAK");
Deno.env.set("STRIPE_WEBHOOK_SECRET", "whsec_fake_earnings_DO_NOT_LEAK");
Deno.env.set("SUPABASE_URL", "https://fake.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service_role_fake_earnings");
Deno.env.set("SUPABASE_ANON_KEY", "anon_fake_earnings");

import { handleScoutEarnings } from "./index.ts";

// ── Mock helpers ────────────────────────────────────────────────────────────

type MockSvcOpts = {
  weeklyRows?: Array<{ day: string; cents: number }>;
  totals?: { total_cents: number; total_clips: number } | null;
  scoutAccount?: Record<string, unknown> | null;
  stripeCalled?: { balance: boolean; payouts: boolean };
};

function makeSvc(opts: MockSvcOpts) {
  const rpcCalls: Array<{ fn: string; args: unknown }> = [];

  const svc = {
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
      rpcCalls.push({ fn, args });
      if (fn === "scout_earnings_weekly") {
        return Promise.resolve({ data: opts.weeklyRows ?? [], error: null });
      }
      if (fn === "scout_earnings_totals") {
        return Promise.resolve({ data: opts.totals ?? null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };

  return svc;
}

type MockStripeOpts = {
  available?: number;
  instantNetAvailable?: number;
  payouts?: Array<{ id: string; amount: number; status: string; arrival_date: number; method: string }>;
  trackCalls?: { balance: boolean; payoutsList: boolean };
};

function mockStripe(opts: MockStripeOpts) {
  const log = { balanceCalls: 0, payoutsListCalls: 0 };
  return {
    _log: log,
    balance: {
      retrieve(_params: unknown, _opts: unknown) {
        log.balanceCalls++;
        return Promise.resolve({
          available: [{ currency: "usd", amount: opts.available ?? 0 }],
          instant_available: opts.instantNetAvailable !== undefined
            ? [{ currency: "usd", net_available: [{ amount: opts.instantNetAvailable }] }]
            : undefined,
        });
      },
    },
    payouts: {
      list(_params: unknown, _opts: unknown) {
        log.payoutsListCalls++;
        return Promise.resolve({ data: opts.payouts ?? [] });
      },
    },
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

// Test 1: auth gate — callerId null → 401
Deno.test("scout-earnings: null callerId → 401", async () => {
  const svc = makeSvc({});
  const stripe = mockStripe({});

  const res = await handleScoutEarnings(
    { callerId: null },
    { stripe, svc },
  );

  assertEquals(res.status, 401);
  assertEquals(stripe._log.balanceCalls, 0, "no Stripe calls on 401");
});

// Test 2: DB aggregate — weeklyByDay and allTimeCents from RPC, not constants
// Also: scoutId = callerId (ownership — IDOR-safe)
Deno.test("scout-earnings: weeklyByDay + allTimeCents come from DB RPCs, not constants", async () => {
  const weeklyRows = [
    { day: "2026-06-15", cents: 800 },
    { day: "2026-06-17", cents: 1200 },
  ];
  const totals = { total_cents: 5000, total_clips: 6 };
  const svc = makeSvc({
    weeklyRows,
    totals,
    scoutAccount: { stripe_account_id: "acct_mock_001", payout_speed: "standard" },
  });
  const stripe = mockStripe({ available: 0, instantNetAvailable: 0 });

  const res = await handleScoutEarnings(
    { callerId: "scout-user-abc" },
    { stripe, svc },
  );
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.weeklyByDay, weeklyRows, "weeklyByDay must match DB RPC response");
  assertEquals(body.allTimeCents, 5000, "allTimeCents must reflect DB totals, not a constant");

  // Verify scoutId = callerId in RPC args (IDOR-safe — never a body scoutId)
  const weeklyRpc = svc._rpcCalls.find((r) => r.fn === "scout_earnings_weekly");
  assert(weeklyRpc, "scout_earnings_weekly RPC must be called");
  // deno-lint-ignore no-explicit-any
  assertEquals((weeklyRpc!.args as any).p_scout_id, "scout-user-abc",
    "IDOR: p_scout_id must equal callerId, not a body-supplied value");

  const totalsRpc = svc._rpcCalls.find((r) => r.fn === "scout_earnings_totals");
  assert(totalsRpc, "scout_earnings_totals RPC must be called");
  // deno-lint-ignore no-explicit-any
  assertEquals((totalsRpc!.args as any).p_scout_id, "scout-user-abc",
    "IDOR: p_scout_id must equal callerId");
});

// Test 3: instant net — instantNetCents uses net_available, not gross available
Deno.test("scout-earnings: instantNetCents uses net_available (9800), not gross available (10000)", async () => {
  const svc = makeSvc({
    weeklyRows: [],
    totals: { total_cents: 0, total_clips: 0 },
    scoutAccount: { stripe_account_id: "acct_instant_test", payout_speed: "instant" },
  });
  const stripe = mockStripe({
    available: 10000,       // gross: $100.00
    instantNetAvailable: 9800, // net after 2% fee: $98.00
  });

  const res = await handleScoutEarnings(
    { callerId: "scout-instant-123" },
    { stripe, svc },
  );
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.availableCents, 10000, "availableCents must be the gross balance");
  assertEquals(body.instantNetCents, 9800, "instantNetCents must be net_available (after 2% fee), NOT gross");
  assert(
    body.instantNetCents < body.availableCents,
    "Pitfall 5 guard: net must be less than gross for instant payout",
  );
});

// Test 4: no scout_stripe_accounts → 0 balances, empty payouts, no Stripe calls
Deno.test("scout-earnings: no stripe account → 0 balances, empty payouts, no Stripe API calls", async () => {
  let stripeCalled = false;
  const svc = makeSvc({
    weeklyRows: [],
    totals: { total_cents: 0, total_clips: 0 },
    scoutAccount: null, // no row
  });
  const stripe = {
    balance: {
      retrieve() {
        stripeCalled = true;
        throw new Error("should not be called");
      },
    },
    payouts: {
      list() {
        stripeCalled = true;
        throw new Error("should not be called");
      },
    },
    _log: { balanceCalls: 0, payoutsListCalls: 0 },
  };

  const res = await handleScoutEarnings(
    { callerId: "scout-no-account" },
    { stripe, svc },
  );
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.availableCents, 0, "availableCents must be 0 with no account");
  assertEquals(body.instantNetCents, 0, "instantNetCents must be 0 with no account");
  assertEquals(body.payouts, [], "payouts must be empty with no account");
  assertEquals(stripeCalled, false, "Stripe must NOT be called when no account exists");
});

// Test 5: payouts list — maps to expected fields
Deno.test("scout-earnings: payouts.list mapped to id/amountCents/status/arrivalDate/method", async () => {
  const svc = makeSvc({
    weeklyRows: [],
    totals: { total_cents: 0, total_clips: 0 },
    scoutAccount: { stripe_account_id: "acct_payouts_test", payout_speed: "instant" },
  });
  // arrival_date is a Unix timestamp (seconds)
  const arrivalDateUnix = Math.floor(new Date("2026-06-15").getTime() / 1000);
  const stripe = mockStripe({
    available: 5000,
    instantNetAvailable: 4900,
    payouts: [
      {
        id: "po_test_001",
        amount: 4900,
        status: "paid",
        arrival_date: arrivalDateUnix,
        method: "instant",
      },
    ],
  });

  const res = await handleScoutEarnings(
    { callerId: "scout-payout-test" },
    { stripe, svc },
  );
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.payouts.length, 1);
  const payout = body.payouts[0];
  assertEquals(payout.id, "po_test_001", "payout id must be mapped");
  assertEquals(payout.amountCents, 4900, "payout amountCents must be mapped");
  assertEquals(payout.status, "paid", "payout status must be mapped");
  assertEquals(payout.arrivalDate, "2026-06-15", "payout arrivalDate must be YYYY-MM-DD string");
  assertEquals(payout.method, "instant", "payout method must be mapped");
});
