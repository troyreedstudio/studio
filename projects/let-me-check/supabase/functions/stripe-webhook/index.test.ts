// supabase/functions/stripe-webhook/index.test.ts
// Deno unit tests for the signature-verified Stripe event handler.
// Mirrors mux-webhook/index.test.ts pattern exactly: inject mock verify + mock svc,
// raw body verified BEFORE JSON parse, no real secrets or network.
// Run: deno test --allow-env supabase/functions/stripe-webhook/index.test.ts
//
// Behaviors covered:
//   1. Forged/missing signature -> 401, body never parsed/acted on
//   2. charge.dispute.created -> logged 'payment.dispute_created' (D-08 no clawback); 200
//   3. account.updated (charges_enabled+payouts_enabled=true) -> scout_stripe_accounts updated; 200
//   4. payment_intent.canceled -> payments.status='canceled', log 'payment.hold_released'; 200
//   5. Unhandled event type -> 200 'ignored' (no error)

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Fake secrets MUST be set before importing helpers that read Deno.env.
Deno.env.set("STRIPE_SECRET_KEY", "sk_test_FAKE_04_03_WH_DO_NOT_LEAK");
Deno.env.set("STRIPE_WEBHOOK_SECRET", "whsec_fake_04_03_WH_DO_NOT_LEAK");
Deno.env.set("SUPABASE_URL", "https://fake.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service_role_fake_04_03_wh");
Deno.env.set("SUPABASE_ANON_KEY", "anon_fake_04_03_wh");

import { verifyStripeSignature } from "../_shared/stripe.ts";
import { handleStripeWebhook } from "./index.ts";

// ── Mock factories ──────────────────────────────────────────────────────────

type SvcCalls = {
  updates: Array<{ table: string; values: Record<string, unknown> }>;
  upserts: Array<{ table: string; values: Record<string, unknown> }>;
  rpcs: Array<{ fn: string; args: unknown }>;
};

function mockSvc(): { svc: unknown; calls: SvcCalls } {
  const calls: SvcCalls = { updates: [], upserts: [], rpcs: [] };

  const svc = {
    from(table: string) {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, _val: string) {
              return {
                maybeSingle() {
                  // Return a mock payments row for lookup by stripe_charge_id
                  if (table === "payments") {
                    return Promise.resolve({
                      data: {
                        check_id: "check-uuid-webhook-001",
                        stripe_payment_intent_id: "pi_webhook_mock_001",
                      },
                      error: null,
                    });
                  }
                  // Return mock event_log for idempotency check
                  if (table === "event_log") {
                    return Promise.resolve({ data: null, error: null });
                  }
                  return Promise.resolve({ data: null, error: null });
                },
              };
            },
          };
        },
        update(values: Record<string, unknown>) {
          calls.updates.push({ table, values });
          return {
            eq(_col: string, _val: string) {
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
        upsert(values: Record<string, unknown>) {
          calls.upserts.push({ table, values });
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
    rpc(fn: string, args: unknown) {
      calls.rpcs.push({ fn, args });
      return Promise.resolve({ data: null, error: null });
    },
  };

  return { svc, calls };
}

// Build a fake Request with a Stripe event body + optional stripe-signature header.
function makeReq(body: string, sigHeader?: string): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (sigHeader !== undefined) headers.set("stripe-signature", sigHeader);
  return new Request("https://fn.local/stripe-webhook", {
    method: "POST",
    body,
    headers,
  });
}

// Injected verifier stubs: resolve = valid sig, throw = bad sig.
const goodVerify = (_rawBody: string, _headers: Headers) => Promise.resolve();
const badVerify = (_rawBody: string, _headers: Headers) => {
  throw new Error("bad stripe signature");
};

// ── Event bodies ────────────────────────────────────────────────────────────

const DISPUTE_CREATED_EVENT = JSON.stringify({
  id: "evt_dispute_001",
  type: "charge.dispute.created",
  data: {
    object: {
      id: "dp_mock_001",
      charge: "ch_mock_charge_001",
      amount: 1650,
      currency: "usd",
    },
  },
});

const ACCOUNT_UPDATED_EVENT = JSON.stringify({
  id: "evt_account_001",
  type: "account.updated",
  data: {
    object: {
      id: "acct_mock_scout_001",
      charges_enabled: true,
      payouts_enabled: true,
    },
  },
});

const PI_CANCELED_EVENT = JSON.stringify({
  id: "evt_canceled_001",
  type: "payment_intent.canceled",
  data: {
    object: {
      id: "pi_mock_canceled_001",
      metadata: { check_id: "check-uuid-webhook-001" },
    },
  },
});

const UNKNOWN_EVENT = JSON.stringify({
  id: "evt_unknown_001",
  type: "radar.early_fraud_warning.created",
  data: { object: {} },
});

// ── Tests ───────────────────────────────────────────────────────────────────

Deno.test("Test 1: forged/missing signature -> 401, body never parsed or acted on", async () => {
  // Reference the real verifyStripeSignature so the contract names it.
  assert(typeof verifyStripeSignature === "function", "verifyStripeSignature must be exported from _shared/stripe.ts");

  const { svc, calls } = mockSvc();
  const req = makeReq(DISPUTE_CREATED_EVENT, "t=1,v1=forged");

  const res = await handleStripeWebhook(req, { verify: badVerify, svc });
  assertEquals(res.status, 401, "bad signature must return 401");

  // Nothing must have been acted on
  assertEquals(calls.updates.length, 0, "no db updates on bad signature");
  assertEquals(calls.upserts.length, 0, "no db upserts on bad signature");
  assertEquals(calls.rpcs.length, 0, "no rpc calls on bad signature");
});

Deno.test("Test 2: charge.dispute.created -> logged payment.dispute_created (no Transfer reversal); 200", async () => {
  const { svc, calls } = mockSvc();
  const req = makeReq(DISPUTE_CREATED_EVENT);

  const res = await handleStripeWebhook(req, { verify: goodVerify, svc });
  assertEquals(res.status, 200, "dispute event should return 200");

  // Must log the dispute (D-08: platform absorbs, Scout never clawed back)
  const disputeLog = calls.rpcs.find(
    // deno-lint-ignore no-explicit-any
    (r) => r.fn === "log_event" && JSON.stringify((r.args as any)).includes("dispute"),
  );
  assert(disputeLog, "payment.dispute_created must be logged");

  // Must NOT set reverse_transfer anywhere in updates
  for (const u of calls.updates) {
    assert(!("reverse_transfer" in u.values), "reverse_transfer must NEVER be set on dispute (D-08)");
  }
});

Deno.test("Test 3: account.updated (charges+payouts enabled) -> scout_stripe_accounts updated; 200", async () => {
  const { svc, calls } = mockSvc();
  const req = makeReq(ACCOUNT_UPDATED_EVENT);

  const res = await handleStripeWebhook(req, { verify: goodVerify, svc });
  assertEquals(res.status, 200, "account.updated should return 200");

  // scout_stripe_accounts should be upserted with both flags true
  const accountUpsert = calls.upserts.find((u) => u.table === "scout_stripe_accounts");
  assert(accountUpsert, "scout_stripe_accounts must be upserted on account.updated");
  assertEquals(
    (accountUpsert!.values as Record<string, unknown>).charges_enabled,
    true,
    "charges_enabled must be set to true",
  );
  assertEquals(
    (accountUpsert!.values as Record<string, unknown>).payouts_enabled,
    true,
    "payouts_enabled must be set to true",
  );

  // scout.connect_updated must be logged
  const connectLog = calls.rpcs.find(
    // deno-lint-ignore no-explicit-any
    (r) => r.fn === "log_event" && JSON.stringify((r.args as any)).includes("connect"),
  );
  assert(connectLog, "scout.connect_updated must be logged");
});

Deno.test("Test 4: payment_intent.canceled -> payments.status='canceled', log payment.hold_released; 200", async () => {
  const { svc, calls } = mockSvc();
  const req = makeReq(PI_CANCELED_EVENT);

  const res = await handleStripeWebhook(req, { verify: goodVerify, svc });
  assertEquals(res.status, 200, "payment_intent.canceled should return 200");

  // payments table updated to 'canceled'
  const canceledUpdate = calls.updates.find(
    (u) => u.table === "payments" && u.values.status === "canceled",
  );
  assert(canceledUpdate, "payments.status must be set to 'canceled' on PI canceled event");

  // hold_released logged
  const holdReleasedLog = calls.rpcs.find(
    // deno-lint-ignore no-explicit-any
    (r) => r.fn === "log_event" && JSON.stringify((r.args as any)).includes("hold_released"),
  );
  assert(holdReleasedLog, "payment.hold_released must be logged on PI cancellation (PAY-02)");
});

Deno.test("Test 5: unhandled event type -> 200 'ignored' (no error, no db writes)", async () => {
  const { svc, calls } = mockSvc();
  const req = makeReq(UNKNOWN_EVENT);

  const res = await handleStripeWebhook(req, { verify: goodVerify, svc });
  assertEquals(res.status, 200, "unknown events must return 200");
  const body = await res.text();
  assert(body.includes("ignored"), "response must include 'ignored' for unhandled events");

  // No side effects
  assertEquals(calls.updates.length, 0, "no db updates for unhandled events");
  assertEquals(calls.upserts.length, 0, "no db upserts for unhandled events");
});
