// supabase/functions/stripe-connect-status/index.test.ts
// Deno unit tests for the Stripe Connect status / go-online gate Edge Function.
// Mirrors stripe-create-payment-intent/index.test.ts pattern: inject fake
// secrets, mock Stripe client via setStripeClientFactory + mock Supabase svc.
//
// Behaviors covered:
//   Test 1: unauthenticated caller (scoutId null) -> 401
//   Test 2: Scout with no account row -> { eligible: false, chargesEnabled: false, payoutsEnabled: false }
//   Test 3: live account with charges_enabled=true && payouts_enabled=true ->
//           { eligible: true, chargesEnabled: true, payoutsEnabled: true };
//           scout_stripe_accounts row is synced (defence in depth, Pitfall 5)
//   Test 4: live account with charges_enabled=true but payouts_enabled=false ->
//           { eligible: false, chargesEnabled: true, payoutsEnabled: false }
//   Test 5: response contains no Stripe secret; exposes only
//           { eligible, chargesEnabled, payoutsEnabled, payoutSpeed }
//
// Run: deno test --allow-env supabase/functions/stripe-connect-status/index.test.ts

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Fake secrets MUST be set before importing helpers that read Deno.env.
const FAKE_SECRET_KEY = "sk_test_FAKE_SECRET_KEY_DO_NOT_LEAK_04_04_status";
const FAKE_WEBHOOK_SECRET = "whsec_fake_webhook_secret_04_04_status_DO_NOT_LEAK";
Deno.env.set("STRIPE_SECRET_KEY", FAKE_SECRET_KEY);
Deno.env.set("STRIPE_WEBHOOK_SECRET", FAKE_WEBHOOK_SECRET);
Deno.env.set("SUPABASE_URL", "https://fake.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service_role_fake_key_do_not_use");
Deno.env.set("SUPABASE_ANON_KEY", "anon_fake_key_do_not_use");

import { setStripeClientFactory } from "../_shared/stripe.ts";
import { handleConnectStatus } from "./index.ts";

// ── Mock factories ──────────────────────────────────────────────────────────

function mockStripe(opts: {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}) {
  const retrieveCalls: string[] = [];
  return {
    _retrieveCalls: retrieveCalls,
    accounts: {
      retrieve(accountId: string) {
        retrieveCalls.push(accountId);
        return Promise.resolve({
          id: accountId,
          charges_enabled: opts.chargesEnabled,
          payouts_enabled: opts.payoutsEnabled,
          // Include some extra Stripe fields that must NOT appear in the response
          email: "scout@example.com",
          created: 1700000000,
        });
      },
    },
  };
}

/**
 * Build a mock Supabase service client.
 * existingAccountId: if null, scout_stripe_accounts row does not exist.
 */
function mockSvc(opts: {
  existingAccountId?: string | null;
  payoutSpeed?: string;
} = {}) {
  const updates: unknown[] = [];

  const svc = {
    from(table: string) {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, _val: string) {
              return {
                maybeSingle() {
                  if (table === "scout_stripe_accounts") {
                    if (opts.existingAccountId) {
                      return Promise.resolve({
                        data: {
                          stripe_account_id: opts.existingAccountId,
                          payout_speed: opts.payoutSpeed ?? "standard",
                          charges_enabled: false,
                          payouts_enabled: false,
                        },
                        error: null,
                      });
                    }
                    return Promise.resolve({ data: null, error: null });
                  }
                  return Promise.resolve({ data: null, error: null });
                },
              };
            },
          };
        },
        update(values: unknown) {
          updates.push(values);
          return {
            eq(_col: string, _val: string) {
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };
    },
  };

  return { svc, updates };
}

// ── Tests ───────────────────────────────────────────────────────────────────

Deno.test("Test 1: unauthenticated caller (scoutId null) -> 401", async () => {
  const stripe = mockStripe({ chargesEnabled: false, payoutsEnabled: false });
  setStripeClientFactory(() => stripe);
  const { svc } = mockSvc();

  const client = await (await import("../_shared/stripe.ts")).getStripeClient();
  const res = await handleConnectStatus(
    { scoutId: null },
    { stripe: client, svc },
  );
  assertEquals(res.status, 401, "expected 401 for null scoutId");
  assertEquals(stripe._retrieveCalls.length, 0, "accounts.retrieve must not be called");
});

Deno.test("Test 2: Scout with no account row -> { eligible: false, chargesEnabled: false, payoutsEnabled: false }", async () => {
  const stripe = mockStripe({ chargesEnabled: false, payoutsEnabled: false });
  setStripeClientFactory(() => stripe);
  // No existing row — existingAccountId is null
  const { svc } = mockSvc({ existingAccountId: null });

  const client = await (await import("../_shared/stripe.ts")).getStripeClient();
  const res = await handleConnectStatus(
    { scoutId: "scout-no-account-001" },
    { stripe: client, svc },
  );
  assertEquals(res.status, 200, "expected 200 when no account row exists");

  const body = await res.json();
  assertEquals(body.eligible, false, "eligible must be false when no account");
  assertEquals(body.chargesEnabled, false, "chargesEnabled must be false when no account");
  assertEquals(body.payoutsEnabled, false, "payoutsEnabled must be false when no account");

  // accounts.retrieve must NOT be called (no account id to retrieve)
  assertEquals(stripe._retrieveCalls.length, 0, "accounts.retrieve must not be called with no account row");
});

Deno.test("Test 3: charges_enabled=true && payouts_enabled=true -> { eligible: true }; DB row synced", async () => {
  const stripe = mockStripe({ chargesEnabled: true, payoutsEnabled: true });
  setStripeClientFactory(() => stripe);
  const { svc, updates } = mockSvc({ existingAccountId: "acct_live_789", payoutSpeed: "instant" });

  const client = await (await import("../_shared/stripe.ts")).getStripeClient();
  const res = await handleConnectStatus(
    { scoutId: "scout-eligible-002" },
    { stripe: client, svc },
  );
  assertEquals(res.status, 200);

  const body = await res.json();
  assertEquals(body.eligible, true, "eligible must be true when both flags are true");
  assertEquals(body.chargesEnabled, true, "chargesEnabled must reflect live account");
  assertEquals(body.payoutsEnabled, true, "payoutsEnabled must reflect live account");
  assertEquals(body.payoutSpeed, "instant", "payoutSpeed must be returned from the row");

  // DB row must be synced (defence in depth alongside account.updated webhook)
  assert(updates.length > 0, "scout_stripe_accounts row must be synced with live values (Pitfall 5)");
  const syncedRow = updates[0] as Record<string, unknown>;
  assertEquals(syncedRow.charges_enabled, true, "synced charges_enabled must be true");
  assertEquals(syncedRow.payouts_enabled, true, "synced payouts_enabled must be true");
});

Deno.test("Test 4: charges_enabled=true but payouts_enabled=false -> { eligible: false }", async () => {
  const stripe = mockStripe({ chargesEnabled: true, payoutsEnabled: false });
  setStripeClientFactory(() => stripe);
  const { svc } = mockSvc({ existingAccountId: "acct_partial_012" });

  const client = await (await import("../_shared/stripe.ts")).getStripeClient();
  const res = await handleConnectStatus(
    { scoutId: "scout-partial-003" },
    { stripe: client, svc },
  );
  assertEquals(res.status, 200);

  const body = await res.json();
  assertEquals(body.eligible, false, "eligible must be false when payouts_enabled is false");
  assertEquals(body.chargesEnabled, true, "chargesEnabled must reflect live value");
  assertEquals(body.payoutsEnabled, false, "payoutsEnabled must reflect live value");
});

Deno.test("Test 5: response exposes only { eligible, chargesEnabled, payoutsEnabled, payoutSpeed } — no secrets", async () => {
  const stripe = mockStripe({ chargesEnabled: true, payoutsEnabled: true });
  setStripeClientFactory(() => stripe);
  const { svc } = mockSvc({ existingAccountId: "acct_clean_345", payoutSpeed: "standard" });

  const client = await (await import("../_shared/stripe.ts")).getStripeClient();
  const res = await handleConnectStatus(
    { scoutId: "scout-noleak-004" },
    { stripe: client, svc },
  );
  assertEquals(res.status, 200);

  const bodyText = await res.text();
  // Must not contain secret key
  assert(
    !bodyText.includes(FAKE_SECRET_KEY),
    "Response must never contain STRIPE_SECRET_KEY",
  );
  assert(
    !bodyText.includes(FAKE_WEBHOOK_SECRET),
    "Response must never contain STRIPE_WEBHOOK_SECRET",
  );

  // Must not contain the raw Stripe account object fields like 'email' or 'created'
  const body = JSON.parse(bodyText);
  assert(!("email" in body), "response must not contain Stripe account email");
  assert(!("id" in body), "response must not contain raw Stripe account id");

  // Must contain only the documented response fields
  assert("eligible" in body, "response must include 'eligible'");
  assert("chargesEnabled" in body, "response must include 'chargesEnabled'");
  assert("payoutsEnabled" in body, "response must include 'payoutsEnabled'");
  assert("payoutSpeed" in body, "response must include 'payoutSpeed'");
});
