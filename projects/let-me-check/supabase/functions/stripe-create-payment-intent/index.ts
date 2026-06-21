// supabase/functions/stripe-create-payment-intent/index.ts
// LMC Phase 4 — Payments: authorize + hold a Seeker's card at request time.
//
// D-01: The hold is the card-validity gate (Uber-style). If it fails, the Seeker
// is blocked from booking and re-prompted to update their card (D-02).
// D-03: Capture happens later in stripe-capture when the clip is delivered.
//
// Returns ONLY client-safe values: { clientSecret, customerId, ephemeralKey,
// paymentIntentId }. The STRIPE_SECRET_KEY never leaves this Edge Function.
//
// Pattern references: 04-RESEARCH.md Pattern 1 + Pitfall 1 (never create PI on
// the client), Pitfall 2 (separate charges + Transfer — no destination charge),
// T-04-06 (amount server-authoritative via _shared/pricing.ts),
// T-04-07 (callerId from bearer, not client claim),
// T-04-08 (no secret key in response), T-04-10 (payment.authorized logged).
//
// Mirror of mux-upload-url/index.ts: handleFn(input, deps) decoupled from
// Deno.serve; deps { stripe, svc } injectable for offline tests.

import { getStripeClient } from "../_shared/stripe.ts";
import { authedClient, serviceClient } from "../_shared/supabase.ts";
import { priceForTier } from "../_shared/pricing.ts";

// deno-lint-ignore no-explicit-any
type StripeClient = any;
// deno-lint-ignore no-explicit-any
type Svc = any;

const STRIPE_API_VERSION = "2023-10-16";

/**
 * Core handler — decoupled from Deno.serve for unit-testability.
 * `callerId` is the already-resolved authed user id (null = unauthenticated).
 * `deps.stripe` is the Stripe client (real or mock).
 * `deps.svc`    is the Supabase service-role client (real or mock).
 */
export async function handleCreatePaymentIntent(
  input: { tier: string; callerId: string | null },
  deps: { stripe: StripeClient; svc: Svc },
): Promise<Response> {
  const { tier, callerId } = input;
  const { stripe, svc } = deps;

  // ── Auth gate: T-04-07 ────────────────────────────────────────────────────
  if (!callerId) {
    return new Response("not authenticated", { status: 401 });
  }

  // ── Tier validation: T-04-06 — amount is server-authoritative ────────────
  let pricing: { seekerTotal: number; scoutAmount: number; currency: string };
  try {
    pricing = priceForTier(tier);
  } catch (_e) {
    return new Response(`bad request: unknown tier '${tier}'`, { status: 400 });
  }

  // ── Ensure a Stripe Customer exists for this user (one-tap reorders) ──────
  // Read the persisted customer id from the caller's profiles row.
  const { data: profile } = await svc
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", callerId)
    .maybeSingle();

  let customerId: string = profile?.stripe_customer_id ?? "";

  if (!customerId) {
    // First payment attempt: create a Stripe Customer and persist the id.
    const customer = await stripe.customers.create({
      metadata: { user_id: callerId },
    });
    customerId = customer.id;
    // Persist for future requests (service role bypasses RLS).
    await svc
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", callerId);
  }

  // ── Mint an ephemeral key (scoped to this customer, session-lived) ────────
  // Required by the PaymentSheet SDK for saved-card support (Pattern 6).
  // The key is short-lived and never stored — T-04-09.
  const ek = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: STRIPE_API_VERSION },
  );

  // ── Create the manual-capture PaymentIntent ───────────────────────────────
  // capture_method:'manual' = authorize + hold now; capture on delivery (D-03).
  // setup_future_usage:'off_session' = save the card for one-tap reorders.
  // transfer_group is NOT set here (we don't have a check id yet — that comes
  // from createCheck after the hold succeeds). The capture edge sets it then.
  // payment_method_types:['card'] also enables Apple Pay / Google Pay via
  // PaymentSheet config (Pattern 6 from 04-RESEARCH.md).
  const pi = await stripe.paymentIntents.create({
    amount: pricing.seekerTotal,     // minor units; server-authoritative (T-04-06)
    currency: pricing.currency,      // per-tier; no hard-coded 'usd' at the call site
    capture_method: "manual",        // key flag: authorize now, capture on delivery
    setup_future_usage: "off_session",
    customer: customerId,
    payment_method_types: ["card"],
    metadata: { seeker_id: callerId, tier },
  });

  // ── Audit log: T-04-10 (repudiation mitigation) ──────────────────────────
  // Fires even if the Seeker doesn't end up presenting the PaymentSheet — the
  // hold was authorized server-side and we record it immediately.
  await svc.rpc("log_event", {
    p_event_type: "payment.authorized",
    p_subject_type: "payment",
    p_context: {
      payment_intent_id: pi.id,
      tier,
      amount: pricing.seekerTotal,
      currency: pricing.currency,
      seeker_id: callerId,
    },
  });

  // ── Return only client-safe values (T-04-08) ─────────────────────────────
  // NEVER return the Stripe secret key or the full PI / ephemeral key objects.
  return Response.json({
    clientSecret: pi.client_secret,   // short-lived; scoped to this PI
    customerId,                        // needed by PaymentSheet initPaymentSheet
    ephemeralKey: ek.secret,          // short-lived; scoped to customerId
    paymentIntentId: pi.id,           // stored on the check row after createCheck
  });
}

// ── Live Deno.serve entrypoint ────────────────────────────────────────────────
// Resolves the caller identity from the bearer token (T-04-07: callerId from
// authed client, never from a client-supplied claim). Then delegates to the
// decoupled handler with live Stripe + service clients.
//
// Guarded by import.meta.main so the server does NOT start when this module
// is imported by unit tests (which import only handleCreatePaymentIntent).
// This mirrors the Deno pattern for testable entrypoints.
if (import.meta.main) Deno.serve(async (req: Request) => {
  // Resolve caller from their Authorization bearer.
  const authed = authedClient(req);
  const { data: userData } = await authed.auth.getUser();
  const callerId = userData?.user?.id ?? null;

  // Parse the request body.
  let tier = "";
  try {
    ({ tier } = await req.json());
  } catch (_e) {
    return new Response("bad body", { status: 400 });
  }

  const stripe = await getStripeClient();
  return handleCreatePaymentIntent(
    { tier, callerId },
    { stripe, svc: serviceClient() },
  );
});
