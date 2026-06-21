// supabase/functions/stripe-connect-status/index.ts
// LMC Phase 4 — Authoritative "go-online" gate for Scouts.
//
// This edge function is the SOLE authority for whether a Scout may go online.
// It fetches the live Stripe Connect account and checks:
//   charges_enabled === true && payouts_enabled === true
//
// It does NOT trust the deep-link return alone (Pitfall 5 from 04-RESEARCH:
// the return_url fires when the Scout finishes the Stripe hosted flow, but
// Stripe may not have completed verification yet). Only a live account read
// is authoritative.
//
// Responsibilities:
//   1. Resolve the Scout's identity from their bearer token (null -> 401).
//   2. Read scout_stripe_accounts for the Scout (service role).
//      - No stripe_account_id -> return { eligible: false, ... } immediately
//        (Scout hasn't started onboarding).
//   3. Fetch the live account: stripe.accounts.retrieve(stripe_account_id).
//   4. eligible = charges_enabled && payouts_enabled.
//   5. Sync the DB row (set charges_enabled/payouts_enabled from live account)
//      as defence in depth alongside the account.updated webhook.
//   6. Return { eligible, chargesEnabled, payoutsEnabled, payoutSpeed }.
//      No secrets, no full account object.
//
// Security:
//   T-04-17: scoutId from bearer (null -> 401); Scout can only query their own account.
//   T-04-19: Eligibility = live charges_enabled && payouts_enabled (not the deep-link return).
//   T-04-18: No secrets in response; no account_link URLs in response.
//
// Mirrors mux-playback-token/index.ts authed-caller shape:
//   export handleConnectStatus(input, deps) for offline tests;
//   Deno.serve guarded by import.meta.main.

import { getStripeClient } from "../_shared/stripe.ts";
import { authedClient, serviceClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type StripeClient = any;
// deno-lint-ignore no-explicit-any
type Svc = any;

export interface ConnectStatusInput {
  scoutId: string | null;
}

export interface ConnectStatusDeps {
  stripe: StripeClient;
  svc: Svc;
}

export interface ConnectStatusResponse {
  eligible: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  payoutSpeed: string;
}

/**
 * Core status logic, decoupled from Deno.serve for offline unit tests.
 * `scoutId` is the already-resolved authenticated user id from the bearer token.
 */
export async function handleConnectStatus(
  input: ConnectStatusInput,
  deps: ConnectStatusDeps,
): Promise<Response> {
  const { scoutId } = input;
  const { stripe, svc } = deps;

  // T-04-17: auth gate — scoutId resolved from bearer; null means unauthenticated.
  if (!scoutId) {
    return new Response("not authenticated", { status: 401 });
  }

  // Read the Scout's Connect row (service role bypasses RLS).
  const { data: row } = await svc
    .from("scout_stripe_accounts")
    .select("stripe_account_id, payout_speed, charges_enabled, payouts_enabled")
    .eq("scout_id", scoutId)
    .maybeSingle();

  // No Stripe account — Scout has not started onboarding.
  // Return safe defaults immediately; no Stripe API call needed.
  if (!row?.stripe_account_id) {
    const result: ConnectStatusResponse = {
      eligible: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      payoutSpeed: "standard",
    };
    return Response.json(result);
  }

  // Fetch the LIVE account state from Stripe (T-04-19: don't trust deep-link return).
  const acct = await stripe.accounts.retrieve(row.stripe_account_id);

  // eligible = BOTH flags must be true (Assumption A4 from 04-RESEARCH).
  const eligible =
    acct.charges_enabled === true && acct.payouts_enabled === true;

  // Sync the DB row with the live values — defence in depth alongside the
  // account.updated webhook (Pitfall 5: webhook may arrive before or after
  // the Scout polls this endpoint).
  await svc
    .from("scout_stripe_accounts")
    .update({
      charges_enabled: acct.charges_enabled,
      payouts_enabled: acct.payouts_enabled,
    })
    .eq("scout_id", scoutId);

  // Return only the documented response fields — no secrets, no raw Stripe object.
  const result: ConnectStatusResponse = {
    eligible,
    chargesEnabled: acct.charges_enabled,
    payoutsEnabled: acct.payouts_enabled,
    payoutSpeed: (row.payout_speed as string) ?? "standard",
  };
  return Response.json(result);
}

// Live entrypoint — resolve caller from bearer, run handler.
// import.meta.main guard means this block is skipped during `deno test` (no --allow-net needed).
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    const authed = authedClient(req);
    const { data: userData } = await authed.auth.getUser();
    const scoutId = userData?.user?.id ?? null;

    const stripe = await getStripeClient();
    return handleConnectStatus({ scoutId }, { stripe, svc: serviceClient() });
  });
}
