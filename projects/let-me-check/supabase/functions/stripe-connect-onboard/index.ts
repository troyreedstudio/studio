// supabase/functions/stripe-connect-onboard/index.ts
// LMC Phase 4 — Scout Connect Express Onboarding Edge Function.
//
// Responsibilities:
//   1. Resolve the Scout's identity from their bearer token (null -> 401).
//   2. Read optional payoutSpeed from the body; validate if present (400 on bad value).
//   3. Read scout_stripe_accounts for the Scout (service role):
//      - No row / no stripe_account_id -> create a Stripe Express account (SCOUT-01)
//        and upsert the row with stripe_account_id + accepted_scout_code_at = now()
//        (SCOUT-02: the AUTHORIZE checkbox in payout.tsx is consent; calling this edge
//        implies consent has been given, so we stamp it) + payout_speed.
//      - Existing row -> reuse stripe_account_id, stamp accepted_scout_code_at if null,
//        and update payout_speed when supplied (D-05 sole write path for payout_speed).
//   4. ALWAYS create a fresh single-use account_link (Pitfall 4 — links expire ~5 min).
//      return_url / refresh_url use the lmc:// deep-link scheme.
//   5. Return { url } only — no account object, no secrets.
//   6. Log 'scout.connect_onboarding_started'.
//
// Security:
//   T-04-17: scoutId from bearer (null -> 401); Scout can only touch their own account.
//   T-04-18: link is single-use, fresh per request, never stored.
//   T-04-20: scout_stripe_accounts has no client write policy; service role writes only.
//   T-04-21: accepted_scout_code_at stamped server-side; event logged.
//
// Mirrors mux-upload-url/index.ts: export handleConnectOnboard(input, deps) for tests;
// Deno.serve entrypoint guarded by import.meta.main.

import { getStripeClient } from "../_shared/stripe.ts";
import { authedClient, serviceClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type StripeClient = any;
// deno-lint-ignore no-explicit-any
type Svc = any;

export type PayoutSpeed = "standard" | "instant";

export interface ConnectOnboardInput {
  scoutId: string | null;
  payoutSpeed: PayoutSpeed | undefined;
}

export interface ConnectOnboardDeps {
  stripe: StripeClient;
  svc: Svc;
}

/**
 * Core onboarding logic, decoupled from Deno.serve for offline unit tests.
 * `scoutId` is the already-resolved authenticated user id.
 */
export async function handleConnectOnboard(
  input: ConnectOnboardInput,
  deps: ConnectOnboardDeps,
): Promise<Response> {
  const { scoutId, payoutSpeed } = input;
  const { stripe, svc } = deps;

  // T-04-17: auth gate — scoutId resolved from bearer; null means unauthenticated.
  if (!scoutId) {
    return new Response("not authenticated", { status: 401 });
  }

  // Validate payoutSpeed if supplied. The only valid values are 'standard' | 'instant'.
  if (payoutSpeed !== undefined && payoutSpeed !== "standard" && payoutSpeed !== "instant") {
    return new Response("invalid payoutSpeed: must be 'standard' or 'instant'", { status: 400 });
  }

  // Read the Scout's existing Connect row (service role bypasses RLS).
  const { data: existingRow } = await svc
    .from("scout_stripe_accounts")
    .select("stripe_account_id, accepted_scout_code_at, payout_speed")
    .eq("scout_id", scoutId)
    .maybeSingle();

  let stripeAccountId: string;

  if (existingRow?.stripe_account_id) {
    // Returning Scout — reuse the existing Stripe account (never create a second one).
    // Pitfall 4: we will STILL create a fresh account_link below.
    stripeAccountId = existingRow.stripe_account_id as string;

    // Build the update payload.
    // D-05: payout_speed is the SOLE write path through this edge (RLS bars client writes).
    // Stamp accepted_scout_code_at if not yet recorded (SCOUT-02).
    const updatePayload: Record<string, unknown> = {};
    if (!existingRow.accepted_scout_code_at) {
      updatePayload.accepted_scout_code_at = new Date().toISOString();
    }
    if (payoutSpeed !== undefined) {
      updatePayload.payout_speed = payoutSpeed;
    }
    if (Object.keys(updatePayload).length > 0) {
      await svc
        .from("scout_stripe_accounts")
        .update(updatePayload)
        .eq("scout_id", scoutId);
    }
  } else {
    // First-time Scout — create a Stripe Connect Express account (SCOUT-01).
    // Stripe absorbs all KYC/tax/identity; LMC never sees sensitive data.
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      business_type: "individual",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { scout_id: scoutId },
    });
    stripeAccountId = account.id;

    // Upsert the row: stripe_account_id + accepted_scout_code_at (SCOUT-02 consent stamp)
    // + payout_speed (D-05 write path).
    await svc
      .from("scout_stripe_accounts")
      .upsert(
        {
          scout_id: scoutId,
          stripe_account_id: stripeAccountId,
          accepted_scout_code_at: new Date().toISOString(),
          payout_speed: payoutSpeed ?? "standard",
        },
        { onConflict: "scout_id" },
      );
  }

  // ALWAYS create a fresh single-use account_link (Pitfall 4 — links are single-use,
  // ~5-minute expiry; never store or reuse them).
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    type: "account_onboarding",
    // Stripe rejects custom app schemes (lmc://) here ("not a valid URL") — these
    // MUST be https. Point at the public `stripe-return` function, which is a valid
    // https URL Stripe accepts and which bounces the Scout back into the app via the
    // lmc:// deep link (lmc-app/app/scout/payout.tsx).
    refresh_url: "https://cawqasszfbzvbtunamda.supabase.co/functions/v1/stripe-return?status=refresh",
    return_url: "https://cawqasszfbzvbtunamda.supabase.co/functions/v1/stripe-return?status=onboarded",
  });

  // Audit log — T-04-21 repudiation mitigation (SCOUT-02).
  await svc.rpc("log_event", {
    p_event_type: "scout.connect_onboarding_started",
    p_entity_type: "scout",
    p_entity_id: scoutId,
    p_payload: { account_id: stripeAccountId },
  });

  // Return ONLY the onboarding URL — never the account object or any secret (T-04-18).
  return Response.json({ url: link.url });
}

// Live entrypoint — resolve caller from bearer, parse optional payoutSpeed, run handler.
// import.meta.main guard means this block is skipped during `deno test` (no --allow-net needed).
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    // Resolve scoutId from the caller's bearer token (RLS + auth.uid()).
    const authed = authedClient(req);
    const { data: userData } = await authed.auth.getUser();
    const scoutId = userData?.user?.id ?? null;

    // Parse optional payoutSpeed from the request body.
    let payoutSpeed: PayoutSpeed | undefined;
    try {
      const body = await req.json();
      if (body.payoutSpeed !== undefined) {
        payoutSpeed = body.payoutSpeed as PayoutSpeed;
      }
    } catch (_e) {
      // Body is optional; missing or non-JSON body is fine (payoutSpeed defaults to undefined).
    }

    const stripe = await getStripeClient();
    try {
      return await handleConnectOnboard({ scoutId, payoutSpeed }, { stripe, svc: serviceClient() });
    } catch (e) {
      // Surface the real Stripe/runtime error instead of a bare 500 (diagnostics +
      // the client can show a useful message). The most common cause here is
      // Stripe Connect not being enabled/configured on the platform account.
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[stripe-connect-onboard] failed:", msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  });
}
