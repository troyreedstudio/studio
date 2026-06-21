// supabase/functions/stripe-create-payment-intent/index.test.ts
// Deno unit tests for the manual-capture PaymentIntent Edge Function.
// Mirrors mux-upload-url/index.test.ts pattern: inject fake secrets first,
// then mock the Stripe client (setStripeClientFactory) + a mock Supabase
// service client. Run: deno test --allow-env index.test.ts
//
// Behaviors covered:
//   1. Unauthenticated caller (callerId null) -> 401
//   2. Valid 'standard' tier -> PI created with capture_method='manual', amount 1650,
//      returns { clientSecret, customerId, ephemeralKey, paymentIntentId }
//   3. Response body never contains the fake STRIPE_SECRET_KEY (no-leak)
//   4. Unknown tier ('deluxe') -> 400 (priceForTier throws, mapped to 400)
//   5. When user already has stripe_customer_id, customers.create is NOT called

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Fake secrets MUST be set before importing helpers that read Deno.env.
const FAKE_SECRET_KEY = "sk_test_FAKE_SECRET_KEY_DO_NOT_LEAK_04_02";
const FAKE_WEBHOOK_SECRET = "whsec_fake_webhook_secret_04_02_DO_NOT_LEAK";
Deno.env.set("STRIPE_SECRET_KEY", FAKE_SECRET_KEY);
Deno.env.set("STRIPE_WEBHOOK_SECRET", FAKE_WEBHOOK_SECRET);
// Supabase env vars needed by _shared/supabase.ts
Deno.env.set("SUPABASE_URL", "https://fake.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service_role_fake_key_do_not_use");
Deno.env.set("SUPABASE_ANON_KEY", "anon_fake_key_do_not_use");

import { setStripeClientFactory } from "../_shared/stripe.ts";
import { handleCreatePaymentIntent } from "./index.ts";

// ── Mock factories ──────────────────────────────────────────────────────────

type CallLog = {
  customersCreate: unknown[];
  ephemeralKeysCreate: unknown[];
  paymentIntentsCreate: unknown[];
};

function mockStripe(log: CallLog) {
  return {
    customers: {
      create(params: unknown) {
        log.customersCreate.push(params);
        return Promise.resolve({ id: "cus_mock_new" });
      },
    },
    ephemeralKeys: {
      create(_params: unknown, _opts: unknown) {
        log.ephemeralKeysCreate.push(_params);
        return Promise.resolve({ secret: "ek_mock_ephemeral_secret" });
      },
    },
    paymentIntents: {
      create(params: unknown) {
        log.paymentIntentsCreate.push(params);
        return Promise.resolve({
          id: "pi_mock_abc123",
          client_secret: "pi_mock_abc123_secret_xyz",
          status: "requires_payment_method",
        });
      },
    },
  };
}

/**
 * Build a mock Supabase service client.
 * existingCustomerId: if set, profiles.stripe_customer_id is pre-populated.
 */
function mockSvc(opts: {
  existingCustomerId?: string | null;
} = {}) {
  const profileUpdates: unknown[] = [];
  const rpcCalls: unknown[] = [];

  const svc = {
    from(table: string) {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, _val: string) {
              return {
                maybeSingle() {
                  if (table === "profiles") {
                    return Promise.resolve({
                      data: {
                        stripe_customer_id: opts.existingCustomerId ?? null,
                      },
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: null, error: null });
                },
              };
            },
          };
        },
        update(values: unknown) {
          profileUpdates.push(values);
          return {
            eq(_col: string, _val: string) {
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };
    },
    rpc(_fn: string, _args: unknown) {
      rpcCalls.push({ fn: _fn, args: _args });
      return Promise.resolve({ data: null, error: null });
    },
  };

  return { svc, profileUpdates, rpcCalls };
}

// ── Tests ───────────────────────────────────────────────────────────────────

Deno.test("Test 1: unauthenticated caller (callerId null) -> 401", async () => {
  const log: CallLog = { customersCreate: [], ephemeralKeysCreate: [], paymentIntentsCreate: [] };
  setStripeClientFactory(() => mockStripe(log));
  const { svc } = mockSvc();

  const stripe = await (await import("../_shared/stripe.ts")).getStripeClient();
  const res = await handleCreatePaymentIntent(
    { tier: "standard", callerId: null },
    { stripe, svc },
  );
  assertEquals(res.status, 401, "expected 401 for null callerId");
});

Deno.test("Test 2: valid 'standard' request creates PI with capture_method=manual, amount 1650", async () => {
  const log: CallLog = { customersCreate: [], ephemeralKeysCreate: [], paymentIntentsCreate: [] };
  setStripeClientFactory(() => mockStripe(log));
  const { svc } = mockSvc({ existingCustomerId: null });

  const stripe = await (await import("../_shared/stripe.ts")).getStripeClient();
  const res = await handleCreatePaymentIntent(
    { tier: "standard", callerId: "user-seeker-123" },
    { stripe, svc },
  );
  assertEquals(res.status, 200, "expected 200 for valid standard request");

  const body = await res.json();
  // Must return the four client-safe fields
  assert(typeof body.clientSecret === "string", "missing clientSecret");
  assert(typeof body.customerId === "string", "missing customerId");
  assert(typeof body.ephemeralKey === "string", "missing ephemeralKey");
  assert(typeof body.paymentIntentId === "string", "missing paymentIntentId");

  // PI must be created with capture_method=manual and correct amount
  assertEquals(log.paymentIntentsCreate.length, 1, "expected exactly one PI create call");
  const piParams = log.paymentIntentsCreate[0] as Record<string, unknown>;
  assertEquals(piParams.capture_method, "manual", "capture_method must be 'manual'");
  assertEquals(piParams.amount, 1650, "amount must be 1650 for standard tier");
  assertEquals(piParams.currency, "usd", "currency must be 'usd'");
});

Deno.test("Test 3: response body never contains STRIPE_SECRET_KEY (no-leak)", async () => {
  const log: CallLog = { customersCreate: [], ephemeralKeysCreate: [], paymentIntentsCreate: [] };
  setStripeClientFactory(() => mockStripe(log));
  const { svc } = mockSvc({ existingCustomerId: "cus_existing_456" });

  const stripe = await (await import("../_shared/stripe.ts")).getStripeClient();
  const res = await handleCreatePaymentIntent(
    { tier: "priority", callerId: "user-seeker-456" },
    { stripe, svc },
  );
  assertEquals(res.status, 200);

  const bodyText = await res.text();
  assert(
    !bodyText.includes(FAKE_SECRET_KEY),
    "Response must never contain STRIPE_SECRET_KEY",
  );
  assert(
    !bodyText.includes(FAKE_WEBHOOK_SECRET),
    "Response must never contain STRIPE_WEBHOOK_SECRET",
  );
});

Deno.test("Test 4: unknown tier 'deluxe' -> 400", async () => {
  const log: CallLog = { customersCreate: [], ephemeralKeysCreate: [], paymentIntentsCreate: [] };
  setStripeClientFactory(() => mockStripe(log));
  const { svc } = mockSvc();

  const stripe = await (await import("../_shared/stripe.ts")).getStripeClient();
  const res = await handleCreatePaymentIntent(
    { tier: "deluxe", callerId: "user-seeker-789" },
    { stripe, svc },
  );
  assertEquals(res.status, 400, "unknown tier must return 400");
  assertEquals(log.paymentIntentsCreate.length, 0, "no PI should be created for unknown tier");
});

Deno.test("Test 5: existing stripe_customer_id -> customers.create NOT called", async () => {
  const log: CallLog = { customersCreate: [], ephemeralKeysCreate: [], paymentIntentsCreate: [] };
  setStripeClientFactory(() => mockStripe(log));
  const { svc } = mockSvc({ existingCustomerId: "cus_already_exists_789" });

  const stripe = await (await import("../_shared/stripe.ts")).getStripeClient();
  const res = await handleCreatePaymentIntent(
    { tier: "standard", callerId: "user-seeker-existing" },
    { stripe, svc },
  );
  assertEquals(res.status, 200, "expected 200 when customer already exists");
  assertEquals(
    log.customersCreate.length,
    0,
    "customers.create must NOT be called when stripe_customer_id already exists",
  );
  // PI should still be created
  assertEquals(log.paymentIntentsCreate.length, 1, "PI should still be created");
});
