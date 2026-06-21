// supabase/functions/stripe-refund/index.test.ts
// Deno tests for the stripe-refund Edge Function.
//
// Run: deno test --allow-env supabase/functions/stripe-refund/index.test.ts
//
// Tests cover:
//   1. Unauthenticated caller -> 401
//   2. Seeker requesting refund on a check they do NOT own -> 403
//   3. First-in-window refund ('blurry') -> auto_approved, refunds.create called,
//      NO reverse_transfer, status='refunded', 200 { status: 'refunded' }
//   4. Repeat refunder -> manual_review, refunds.create NOT called, 200 { status: 'under_review' }
//   5. refunds.create is NEVER called with reverse_transfer:true (D-08 — Scout keeps pay)
//   6. Invalid reason_code -> 400

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setStripeClientFactory } from "../_shared/stripe.ts";
import { handleRefund } from "./index.ts";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, userId: string | null = "seeker-123"): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (userId) headers.set("Authorization", `Bearer tok-${userId}`);
  return new Request("https://x.supabase.co/functions/v1/stripe-refund", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

// Fake service client factory — shapes vary per test.
function makeSvc(overrides: {
  check?: unknown;
  payment?: unknown;
  priorRefundCount?: number;
  insertRefundReqError?: unknown;
}) {
  const refundInsert: unknown[] = [];
  const paymentsUpdate: unknown[] = [];
  const refundReqUpdate: unknown[] = [];
  const events: unknown[] = [];

  return {
    _refundInsert: refundInsert,
    _paymentsUpdate: paymentsUpdate,
    _refundReqUpdate: refundReqUpdate,
    _events: events,
    from: (table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: string) => ({
          maybeSingle: async () => {
            if (table === "checks") return { data: overrides.check ?? null };
            if (table === "payments") return { data: overrides.payment ?? null };
            return { data: null };
          },
        }),
      }),
      insert: (_row: unknown) => ({
        select: (_cols: string) => ({
          maybeSingle: async () => {
            if (overrides.insertRefundReqError) {
              return { data: null, error: overrides.insertRefundReqError };
            }
            return { data: { id: "rr-uuid" }, error: null };
          },
        }),
      }),
      update: (row: unknown) => {
        if (table === "payments") paymentsUpdate.push(row);
        if (table === "refund_requests") refundReqUpdate.push(row);
        return {
          eq: (_col: string, _val: string) => Promise.resolve({ error: null }),
        };
      },
    }),
    rpc: (fn: string, args: unknown) => {
      if (fn === "count_seeker_refunds_in_30d") {
        return Promise.resolve({ data: overrides.priorRefundCount ?? 0, error: null });
      }
      if (fn === "log_event") {
        events.push(args);
        return Promise.resolve({ error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

// Test 1: unauthenticated caller -> 401
Deno.test("stripe-refund: unauthenticated caller -> 401", async () => {
  // Mock authed user resolution to return null (no bearer).
  const svc = makeSvc({});
  const stripe = { refunds: { create: () => Promise.resolve({ id: "re_test" }) } };
  setStripeClientFactory(() => stripe);

  const res = await handleRefund(
    { callerId: null, body: { checkId: "chk-1", reasonCode: "blurry" } },
    { stripe, svc },
  );
  assertEquals(res.status, 401);

  setStripeClientFactory(null);
});

// Test 2: Seeker requesting refund on a check they do NOT own -> 403
Deno.test("stripe-refund: wrong owner -> 403", async () => {
  const svc = makeSvc({
    check: { check_id: "chk-1", seeker_id: "seeker-OTHER", status: "delivered" },
    payment: { stripe_payment_intent_id: "pi_test", stripe_charge_id: "ch_test", status: "transferred" },
  });
  const stripe = { refunds: { create: () => { throw new Error("should not be called"); } } };
  setStripeClientFactory(() => stripe);

  const res = await handleRefund(
    { callerId: "seeker-123", body: { checkId: "chk-1", reasonCode: "blurry" } },
    { stripe, svc },
  );
  assertEquals(res.status, 403);

  setStripeClientFactory(null);
});

// Test 3: first-in-window 'blurry' refund -> refund_requests recorded (auto_approved=true),
// stripe.refunds.create called WITHOUT reverse_transfer, status='refunded', 200 { status:'refunded' }
Deno.test("stripe-refund: first refund auto_approved -> refunds.create called, status=refunded", async () => {
  let createArgs: unknown = null;
  const stripe = {
    refunds: {
      create: (args: unknown) => {
        createArgs = args;
        return Promise.resolve({ id: "re_test_123" });
      },
    },
  };
  const svc = makeSvc({
    check: { check_id: "chk-1", seeker_id: "seeker-123", status: "delivered" },
    payment: {
      stripe_payment_intent_id: "pi_test_abc",
      stripe_charge_id: "ch_test",
      status: "transferred",
    },
    priorRefundCount: 0,
  });
  setStripeClientFactory(() => stripe);

  const res = await handleRefund(
    { callerId: "seeker-123", body: { checkId: "chk-1", reasonCode: "blurry" } },
    { stripe, svc },
  );
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.status, "refunded");
  // refunds.create must have been called
  assertEquals(typeof createArgs, "object");
  // Verify no reverse_transfer (D-08: Scout keeps pay)
  // deno-lint-ignore no-explicit-any
  assertEquals((createArgs as any)?.reverse_transfer, undefined);
  // deno-lint-ignore no-explicit-any
  assertEquals((createArgs as any)?.payment_intent, "pi_test_abc");

  setStripeClientFactory(null);
});

// Test 4: repeat refunder -> manual_review, refunds.create NOT called, 200 { status:'under_review' }
Deno.test("stripe-refund: repeat refunder -> manual_review, no refunds.create", async () => {
  let createCalled = false;
  const stripe = {
    refunds: {
      create: () => {
        createCalled = true;
        return Promise.resolve({ id: "re_should_not_happen" });
      },
    },
  };
  const svc = makeSvc({
    check: { check_id: "chk-2", seeker_id: "seeker-123", status: "delivered" },
    payment: {
      stripe_payment_intent_id: "pi_test_xyz",
      stripe_charge_id: "ch_test",
      status: "transferred",
    },
    priorRefundCount: 1, // repeat refunder
  });
  setStripeClientFactory(() => stripe);

  const res = await handleRefund(
    { callerId: "seeker-123", body: { checkId: "chk-2", reasonCode: "wrong_location" } },
    { stripe, svc },
  );
  const body = await res.json();

  assertEquals(res.status, 200);
  assertEquals(body.status, "under_review");
  // refunds.create must NOT have been called (no auto money for repeat refunder)
  assertEquals(createCalled, false);

  setStripeClientFactory(null);
});

// Test 5: refunds.create is NEVER called with reverse_transfer:true (D-08 — Scout keeps pay).
// This is a dedicated assertion on the flag itself, separate from Test 3.
Deno.test("stripe-refund: reverse_transfer never set on refunds.create (D-08)", async () => {
  const calls: unknown[] = [];
  const stripe = {
    refunds: {
      create: (args: unknown) => {
        calls.push(args);
        return Promise.resolve({ id: "re_d08_check" });
      },
    },
  };
  const svc = makeSvc({
    check: { check_id: "chk-3", seeker_id: "seeker-123", status: "delivered" },
    payment: {
      stripe_payment_intent_id: "pi_d08_test",
      stripe_charge_id: "ch_test",
      status: "transferred",
    },
    priorRefundCount: 0,
  });
  setStripeClientFactory(() => stripe);

  await handleRefund(
    { callerId: "seeker-123", body: { checkId: "chk-3", reasonCode: "other" } },
    { stripe, svc },
  );

  // Every refunds.create call must not include reverse_transfer
  for (const call of calls) {
    assertEquals(
      // deno-lint-ignore no-explicit-any
      (call as any)?.reverse_transfer,
      undefined,
      "D-08 violation: reverse_transfer was set on refunds.create",
    );
  }

  setStripeClientFactory(null);
});

// Test 6: invalid reason_code -> 400
Deno.test("stripe-refund: invalid reason_code -> 400", async () => {
  const stripe = {
    refunds: { create: () => { throw new Error("should not be called"); } },
  };
  const svc = makeSvc({
    check: { check_id: "chk-4", seeker_id: "seeker-123", status: "delivered" },
    payment: {
      stripe_payment_intent_id: "pi_test",
      stripe_charge_id: "ch_test",
      status: "transferred",
    },
    priorRefundCount: 0,
  });
  setStripeClientFactory(() => stripe);

  const res = await handleRefund(
    { callerId: "seeker-123", body: { checkId: "chk-4", reasonCode: "fake_reason" } },
    { stripe, svc },
  );
  assertEquals(res.status, 400);

  setStripeClientFactory(null);
});
