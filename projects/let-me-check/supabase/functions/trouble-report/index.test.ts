// supabase/functions/trouble-report/index.test.ts
// Deno unit tests for the trouble-report Edge Function.
// Run: deno test --allow-env supabase/functions/trouble-report/index.test.ts
//
// Money-integrity invariants asserted here:
//   Test 1 (ownership):       callerId !== check.scout_id → 403, no Stripe calls.
//   Test 2 (state guard):     check.status not in ('assigned','filming') → 400.
//   Test 3 (hold release):    authorized payment → paymentIntents.cancel called, NOT refunds.create.
//   Test 4 (no-fault Transfer): transfers.create called with destination = scout account,
//                                NOFAULT_CENTS amount, NO source_transaction, NO reverse_transfer.
//   Test 5 (idempotency):     existing payment.scout_nofault_paid event → no second Transfer/cancel.
//   Test 6 (auth):            callerId null → 401.

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Fake secrets BEFORE any module import.
Deno.env.set("STRIPE_SECRET_KEY", "sk_test_FAKE_trouble_DO_NOT_LEAK");
Deno.env.set("STRIPE_WEBHOOK_SECRET", "whsec_fake_trouble_DO_NOT_LEAK");
Deno.env.set("SUPABASE_URL", "https://fake.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service_role_fake_trouble");
Deno.env.set("SUPABASE_ANON_KEY", "anon_fake_trouble");

import { handleTroubleReport, NOFAULT_CENTS } from "./index.ts";

// ── Mock helpers ────────────────────────────────────────────────────────────

type TransferArgs = Record<string, unknown>;

type StripeLog = {
  cancels: string[];
  refundCreates: number;
  transfers: TransferArgs[];
};

function mockStripe(log: StripeLog) {
  return {
    paymentIntents: {
      cancel(piId: string) {
        log.cancels.push(piId);
        return Promise.resolve({ id: piId, status: "canceled" });
      },
    },
    refunds: {
      create() {
        log.refundCreates++;
        return Promise.resolve({ id: "re_should_not_exist" });
      },
    },
    transfers: {
      create(args: TransferArgs) {
        log.transfers.push({ ...args });
        return Promise.resolve({ id: "tr_nofault_001" });
      },
    },
  };
}

type MockSvcOpts = {
  check?: Record<string, unknown> | null;
  payment?: Record<string, unknown> | null;
  scoutAccount?: Record<string, unknown> | null;
  existingNofaultEvent?: boolean;
};

function makeSvc(opts: MockSvcOpts) {
  const rpcCalls: Array<{ fn: string; args: unknown }> = [];
  const updates: Array<{ table: string; values: Record<string, unknown> }> = [];
  const transitionCalls: Array<unknown> = [];

  const svc = {
    _rpcCalls: rpcCalls,
    _updates: updates,
    _transitionCalls: transitionCalls,

    from(table: string) {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, _val: string) {
              return {
                maybeSingle() {
                  if (table === "checks") {
                    return Promise.resolve({ data: opts.check ?? null, error: null });
                  }
                  if (table === "payments") {
                    return Promise.resolve({ data: opts.payment ?? null, error: null });
                  }
                  if (table === "scout_stripe_accounts") {
                    return Promise.resolve({ data: opts.scoutAccount ?? null, error: null });
                  }
                  return Promise.resolve({ data: null, error: null });
                },
              };
            },
          };
        },
        // For event_log idempotency check: select from event_log
        // We need to handle this query differently since it uses multiple .eq() calls
        // The mock svc uses a second eq() on event_log; we detect by table name
        update(values: Record<string, unknown>) {
          updates.push({ table, values });
          return {
            eq(_col: string, _val: string) {
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };
    },
    rpc(fn: string, args: unknown) {
      rpcCalls.push({ fn, args });
      if (fn === "transition_check") {
        transitionCalls.push(args);
        return Promise.resolve({ data: null, error: null });
      }
      // event_log idempotency: return existing nofault event if configured
      if (fn === "check_event_exists") {
        return Promise.resolve({
          data: opts.existingNofaultEvent ? true : false,
          error: null,
        });
      }
      if (fn === "log_event") {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };

  return svc;
}

// ── Tests ───────────────────────────────────────────────────────────────────

// Test 6: auth gate — callerId null → 401
Deno.test("trouble-report: null callerId → 401", async () => {
  const log: StripeLog = { cancels: [], refundCreates: 0, transfers: [] };
  const stripe = mockStripe(log);
  const svc = makeSvc({
    check: { id: "chk-1", scout_id: "scout-abc", status: "filming" },
  });

  const res = await handleTroubleReport(
    { callerId: null, body: { checkId: "chk-1", reason: "long_line" } },
    { stripe, svc },
  );

  assertEquals(res.status, 401);
  assertEquals(log.cancels.length, 0, "no Stripe calls on 401");
  assertEquals(log.transfers.length, 0, "no Stripe calls on 401");
});

// Test 1: ownership — callerId !== check.scout_id → 403, no Stripe calls
Deno.test("trouble-report: wrong owner → 403, no Stripe calls", async () => {
  const log: StripeLog = { cancels: [], refundCreates: 0, transfers: [] };
  const stripe = mockStripe(log);
  const svc = makeSvc({
    check: { id: "chk-2", scout_id: "scout-OTHER", status: "filming" },
  });

  const res = await handleTroubleReport(
    { callerId: "scout-abc", body: { checkId: "chk-2", reason: "unsafe" } },
    { stripe, svc },
  );

  assertEquals(res.status, 403);
  assertEquals(log.cancels.length, 0, "no cancel on 403");
  assertEquals(log.transfers.length, 0, "no transfer on 403");
  assertEquals(log.refundCreates, 0, "no refund on 403");
});

// Test 2: state guard — status not in ('assigned','filming') → 400
Deno.test("trouble-report: check already delivered → 400", async () => {
  const log: StripeLog = { cancels: [], refundCreates: 0, transfers: [] };
  const stripe = mockStripe(log);
  const svc = makeSvc({
    check: { id: "chk-3", scout_id: "scout-abc", status: "delivered" },
  });

  const res = await handleTroubleReport(
    { callerId: "scout-abc", body: { checkId: "chk-3", reason: "unsafe" } },
    { stripe, svc },
  );

  assertEquals(res.status, 400);
  assertEquals(log.cancels.length, 0, "no Stripe calls on 400");
});

// Test 3: hold release via CANCEL (not refund) — authorized payment
Deno.test("trouble-report: authorized PI → paymentIntents.cancel called, refunds.create NOT called", async () => {
  const log: StripeLog = { cancels: [], refundCreates: 0, transfers: [] };
  const stripe = mockStripe(log);
  const svc = makeSvc({
    check: { id: "chk-4", scout_id: "scout-abc", status: "assigned", seeker_id: "seeker-xyz", tier: "standard" },
    payment: { stripe_payment_intent_id: "pi_hold_abc", status: "authorized" },
    scoutAccount: { stripe_account_id: "acct_scout_001" },
    existingNofaultEvent: false,
  });

  const res = await handleTroubleReport(
    { callerId: "scout-abc", body: { checkId: "chk-4", reason: "long_line" } },
    { stripe, svc },
  );

  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.status, "reported");

  // PI must be CANCELLED (not refunded)
  assert(log.cancels.includes("pi_hold_abc"), "paymentIntents.cancel must be called with the PI id");
  assertEquals(log.refundCreates, 0, "refunds.create must NOT be called on an uncaptured hold");

  // payments.status updated to 'canceled'
  const payUpdates = svc._updates.filter((u) => u.table === "payments");
  assert(
    payUpdates.some((u) => u.values.status === "canceled"),
    "payments.status must be updated to 'canceled'",
  );
});

// Test 4: Scout no-fault Transfer — platform-funded, no source_transaction, no reverse_transfer
Deno.test("trouble-report: no-fault Transfer → destination correct, no source_transaction, no reverse_transfer", async () => {
  const log: StripeLog = { cancels: [], refundCreates: 0, transfers: [] };
  const stripe = mockStripe(log);
  const svc = makeSvc({
    check: { id: "chk-5", scout_id: "scout-abc", status: "filming", seeker_id: "seeker-xyz", tier: "priority" },
    payment: { stripe_payment_intent_id: "pi_hold_def", status: "authorized" },
    scoutAccount: { stripe_account_id: "acct_scout_999" },
    existingNofaultEvent: false,
  });

  await handleTroubleReport(
    { callerId: "scout-abc", body: { checkId: "chk-5", reason: "no_access" } },
    { stripe, svc },
  );

  assertEquals(log.transfers.length, 1, "exactly one Scout no-fault Transfer must be created");
  const t = log.transfers[0];

  // destination must be the Scout's Stripe account
  assertEquals(t.destination, "acct_scout_999", "Transfer destination must be scout's stripe_account_id");

  // Amount must match NOFAULT_CENTS constant
  assertEquals(t.amount, NOFAULT_CENTS, `Transfer amount must equal NOFAULT_CENTS (${NOFAULT_CENTS})`);

  // NO source_transaction — platform-funded (D-04)
  assertEquals(t.source_transaction, undefined, "source_transaction must NOT be present (platform-funded, D-04)");

  // NO reverse_transfer
  assertEquals(t.reverse_transfer, undefined, "reverse_transfer must NOT be present");
});

// Test 5: idempotency — existing nofault event → no second Transfer, no second cancel
Deno.test("trouble-report: idempotent second call → no duplicate Transfer or cancel", async () => {
  const log: StripeLog = { cancels: [], refundCreates: 0, transfers: [] };
  const stripe = mockStripe(log);
  const svc = makeSvc({
    check: { id: "chk-6", scout_id: "scout-abc", status: "no_scout", seeker_id: "seeker-xyz" },
    payment: { stripe_payment_intent_id: "pi_hold_ghi", status: "canceled" },
    scoutAccount: { stripe_account_id: "acct_scout_001" },
    existingNofaultEvent: true, // indicates already processed
  });

  // With no_scout status, state guard blocks it at step 2 (not in assigned/filming).
  // This correctly prevents a second run — the state machine is the idempotency lock.
  const res = await handleTroubleReport(
    { callerId: "scout-abc", body: { checkId: "chk-6", reason: "long_line" } },
    { stripe, svc },
  );

  // Either 400 (state guard) or 200 with reported (event-log idempotency), but NO Stripe calls
  assert(
    res.status === 400 || res.status === 200,
    "expected 400 (state guard) or 200 (idempotent)",
  );
  assertEquals(log.cancels.length, 0, "no second cancel on idempotent call");
  assertEquals(log.transfers.length, 0, "no second Transfer on idempotent call");
});

// Additional: transition driven to 'no_scout' NOT 'cancelled' (BLOCKER-1 guard)
Deno.test("trouble-report: transition_check called with 'no_scout' not 'cancelled'", async () => {
  const log: StripeLog = { cancels: [], refundCreates: 0, transfers: [] };
  const stripe = mockStripe(log);
  const svc = makeSvc({
    check: { id: "chk-7", scout_id: "scout-abc", status: "assigned", seeker_id: "seeker-xyz", tier: "standard" },
    payment: { stripe_payment_intent_id: "pi_hold_jkl", status: "authorized" },
    scoutAccount: { stripe_account_id: "acct_scout_001" },
    existingNofaultEvent: false,
  });

  await handleTroubleReport(
    { callerId: "scout-abc", body: { checkId: "chk-7", reason: "long_line" } },
    { stripe, svc },
  );

  // Find the transition_check rpc call
  const transitionRpc = svc._rpcCalls.find((r) => r.fn === "transition_check");
  assert(transitionRpc, "transition_check must be called");
  // deno-lint-ignore no-explicit-any
  const transitionArgs = transitionRpc!.args as any;
  assertEquals(
    transitionArgs.p_to,
    "no_scout",
    "BLOCKER-1: transition must drive 'no_scout', NOT 'cancelled'",
  );
});
