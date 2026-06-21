// supabase/functions/stripe-connect-onboard/index.test.ts
// Deno unit tests for the Stripe Connect Express onboarding Edge Function.
// Mirrors stripe-create-payment-intent/index.test.ts pattern: inject fake
// secrets, mock Stripe client via setStripeClientFactory + mock Supabase svc.
//
// Behaviors covered:
//   Test 1: unauthenticated caller (scoutId null) -> 401
//   Test 2: first-time Scout -> accounts.create called; row upserted with
//           stripe_account_id + accepted_scout_code_at + payout_speed='standard';
//           accountLinks.create called; returns { url }
//   Test 3: returning Scout (existing account row) -> NO second accounts.create;
//           fresh accountLinks.create still called (Pitfall 4 — links are single-use)
//   Test 4: response contains ONLY { url } — never the account object or any secret
//   Test 5: refresh_url and return_url use the lmc:// deep-link scheme
//   Test 6: payoutSpeed:'instant' in body -> payout_speed='instant' written to DB;
//           omitting payoutSpeed leaves default 'standard' untouched
//
// Run: deno test --allow-env supabase/functions/stripe-connect-onboard/index.test.ts

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Fake secrets MUST be set before importing helpers that read Deno.env.
const FAKE_SECRET_KEY = "sk_test_FAKE_SECRET_KEY_DO_NOT_LEAK_04_04_onboard";
const FAKE_WEBHOOK_SECRET = "whsec_fake_webhook_secret_04_04_onboard_DO_NOT_LEAK";
Deno.env.set("STRIPE_SECRET_KEY", FAKE_SECRET_KEY);
Deno.env.set("STRIPE_WEBHOOK_SECRET", FAKE_WEBHOOK_SECRET);
Deno.env.set("SUPABASE_URL", "https://fake.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service_role_fake_key_do_not_use");
Deno.env.set("SUPABASE_ANON_KEY", "anon_fake_key_do_not_use");

import { setStripeClientFactory } from "../_shared/stripe.ts";
import { handleConnectOnboard } from "./index.ts";

// ── Mock factories ──────────────────────────────────────────────────────────

type ConnectLog = {
  accountsCreate: unknown[];
  accountLinksCreate: unknown[];
};

function mockStripe(log: ConnectLog) {
  return {
    accounts: {
      create(params: unknown) {
        log.accountsCreate.push(params);
        return Promise.resolve({ id: "acct_mock_new123" });
      },
    },
    accountLinks: {
      create(params: unknown) {
        log.accountLinksCreate.push(params);
        return Promise.resolve({ url: "https://connect.stripe.com/setup/s/mock_link_abc" });
      },
    },
  };
}

/**
 * Build a mock Supabase service client.
 * existingAccountId: if set, scout_stripe_accounts row pre-exists with this account id.
 * existingConsentAt: if set, accepted_scout_code_at is already stamped.
 */
function mockSvc(opts: {
  existingAccountId?: string | null;
  existingConsentAt?: string | null;
} = {}) {
  const upserts: unknown[] = [];
  const rpcCalls: unknown[] = [];

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
                          accepted_scout_code_at: opts.existingConsentAt ?? null,
                          payout_speed: "standard",
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
        upsert(values: unknown, _opts?: unknown) {
          upserts.push(values);
          return Promise.resolve({ data: null, error: null });
        },
        update(values: unknown) {
          upserts.push(values);
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

  return { svc, upserts, rpcCalls };
}

// ── Tests ───────────────────────────────────────────────────────────────────

Deno.test("Test 1: unauthenticated caller (scoutId null) -> 401", async () => {
  const log: ConnectLog = { accountsCreate: [], accountLinksCreate: [] };
  setStripeClientFactory(() => mockStripe(log));
  const { svc } = mockSvc();

  const stripe = await (await import("../_shared/stripe.ts")).getStripeClient();
  const res = await handleConnectOnboard(
    { scoutId: null, payoutSpeed: undefined },
    { stripe, svc },
  );
  assertEquals(res.status, 401, "expected 401 for null scoutId");
  assertEquals(log.accountsCreate.length, 0, "no account should be created");
  assertEquals(log.accountLinksCreate.length, 0, "no link should be created");
});

Deno.test("Test 2: first-time Scout -> accounts.create called; row upserted; accountLinks.create called; returns { url }", async () => {
  const log: ConnectLog = { accountsCreate: [], accountLinksCreate: [] };
  setStripeClientFactory(() => mockStripe(log));
  const { svc, upserts, rpcCalls } = mockSvc({ existingAccountId: null });

  const stripe = await (await import("../_shared/stripe.ts")).getStripeClient();
  const res = await handleConnectOnboard(
    { scoutId: "scout-new-001", payoutSpeed: undefined },
    { stripe, svc },
  );
  assertEquals(res.status, 200, "expected 200 for first-time Scout");

  // accounts.create must be called exactly once
  assertEquals(log.accountsCreate.length, 1, "accounts.create must be called once");
  const acctParams = log.accountsCreate[0] as Record<string, unknown>;
  assertEquals(acctParams.type, "express", "account type must be 'express'");

  // accountLinks.create must be called
  assertEquals(log.accountLinksCreate.length, 1, "accountLinks.create must be called");
  const linkParams = log.accountLinksCreate[0] as Record<string, unknown>;
  assertEquals(linkParams.type, "account_onboarding", "link type must be 'account_onboarding'");

  // DB row must be upserted
  assert(upserts.length > 0, "svc upsert must be called to record the account");

  // Event logged
  assert(rpcCalls.length > 0, "log_event must be called");

  // Response must include { url }
  const body = await res.json();
  assert(typeof body.url === "string", "response must include 'url'");
  assert(body.url.startsWith("https://"), "url must be a valid https URL");
});

Deno.test("Test 3: returning Scout (existing account row) -> NO second accounts.create; fresh accountLinks.create called", async () => {
  const log: ConnectLog = { accountsCreate: [], accountLinksCreate: [] };
  setStripeClientFactory(() => mockStripe(log));
  // Pre-seed an existing account row
  const { svc } = mockSvc({ existingAccountId: "acct_existing_456", existingConsentAt: "2026-06-01T00:00:00Z" });

  const stripe = await (await import("../_shared/stripe.ts")).getStripeClient();
  const res = await handleConnectOnboard(
    { scoutId: "scout-returning-002", payoutSpeed: undefined },
    { stripe, svc },
  );
  assertEquals(res.status, 200, "expected 200 for returning Scout");

  // Must NOT create a second account
  assertEquals(log.accountsCreate.length, 0, "accounts.create must NOT be called for returning Scout (Pitfall 4)");

  // MUST create a fresh account link (single-use — Pitfall 4)
  assertEquals(log.accountLinksCreate.length, 1, "fresh accountLinks.create must be called on every request");
  const linkParams = log.accountLinksCreate[0] as Record<string, unknown>;
  // The link must use the existing account id, not a new one
  assertEquals(linkParams.account, "acct_existing_456", "link must reference the existing account id");

  const body = await res.json();
  assert(typeof body.url === "string", "response must include 'url'");
});

Deno.test("Test 4: response contains ONLY { url } — no account object, no secrets", async () => {
  const log: ConnectLog = { accountsCreate: [], accountLinksCreate: [] };
  setStripeClientFactory(() => mockStripe(log));
  const { svc } = mockSvc({ existingAccountId: null });

  const stripe = await (await import("../_shared/stripe.ts")).getStripeClient();
  const res = await handleConnectOnboard(
    { scoutId: "scout-leak-check-003", payoutSpeed: undefined },
    { stripe, svc },
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
  // Must not expose account id directly — only the url is needed by the client
  // (The account id is an internal identifier; we don't check for its absence
  //  since it's not sensitive, but we verify only 'url' is the documented field)
  const body = JSON.parse(bodyText);
  const keys = Object.keys(body);
  assertEquals(keys, ["url"], "response body must contain only 'url'");
});

Deno.test("Test 5: refresh_url and return_url use the lmc:// deep-link scheme", async () => {
  const log: ConnectLog = { accountsCreate: [], accountLinksCreate: [] };
  setStripeClientFactory(() => mockStripe(log));
  const { svc } = mockSvc({ existingAccountId: "acct_deeplink_789" });

  const stripe = await (await import("../_shared/stripe.ts")).getStripeClient();
  await handleConnectOnboard(
    { scoutId: "scout-deeplink-004", payoutSpeed: undefined },
    { stripe, svc },
  );

  assertEquals(log.accountLinksCreate.length, 1, "accountLinks.create must be called");
  const linkParams = log.accountLinksCreate[0] as Record<string, unknown>;
  const refreshUrl = linkParams.refresh_url as string;
  const returnUrl = linkParams.return_url as string;

  assert(
    typeof refreshUrl === "string" && refreshUrl.startsWith("lmc://"),
    `refresh_url must start with lmc:// (got: ${refreshUrl})`,
  );
  assert(
    typeof returnUrl === "string" && returnUrl.startsWith("lmc://"),
    `return_url must start with lmc:// (got: ${returnUrl})`,
  );
});

Deno.test("Test 6: payoutSpeed:'instant' writes payout_speed='instant'; omitting it preserves 'standard'", async () => {
  // Part A: payoutSpeed 'instant' supplied
  const logA: ConnectLog = { accountsCreate: [], accountLinksCreate: [] };
  setStripeClientFactory(() => mockStripe(logA));
  const { svc: svcA, upserts: upsertsA } = mockSvc({ existingAccountId: null });

  const stripeA = await (await import("../_shared/stripe.ts")).getStripeClient();
  const resA = await handleConnectOnboard(
    { scoutId: "scout-instant-005", payoutSpeed: "instant" },
    { stripe: stripeA, svc: svcA },
  );
  assertEquals(resA.status, 200, "expected 200 with payoutSpeed=instant");
  const upsertedA = upsertsA[0] as Record<string, unknown>;
  assertEquals(
    upsertedA.payout_speed,
    "instant",
    "payout_speed must be 'instant' when payoutSpeed='instant' is supplied (D-05 write path)",
  );

  // Part B: payoutSpeed omitted -> defaults to 'standard'
  const logB: ConnectLog = { accountsCreate: [], accountLinksCreate: [] };
  setStripeClientFactory(() => mockStripe(logB));
  const { svc: svcB, upserts: upsertsB } = mockSvc({ existingAccountId: null });

  const stripeB = await (await import("../_shared/stripe.ts")).getStripeClient();
  const resB = await handleConnectOnboard(
    { scoutId: "scout-standard-006", payoutSpeed: undefined },
    { stripe: stripeB, svc: svcB },
  );
  assertEquals(resB.status, 200, "expected 200 with payoutSpeed omitted");
  const upsertedB = upsertsB[0] as Record<string, unknown>;
  assertEquals(
    upsertedB.payout_speed,
    "standard",
    "payout_speed must default to 'standard' when payoutSpeed is omitted",
  );
});
