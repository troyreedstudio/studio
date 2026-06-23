// supabase/functions/stripe-record-hold/index.ts
// LMC Phase 4 — Payments: create the payments row that links a check to its
// Stripe PaymentIntent hold. This is the missing server step that makes
// stripe-capture / stripe-refund / trouble-report work: those functions all
// read `payments` by check_id; without this row they return 404.
//
// Calling order (already enforced in payment.tsx):
//   1. stripe-create-payment-intent  → PI authorized, pi_id stored on check row
//   2. [PaymentSheet presented]      → Seeker confirms the hold
//   3. createCheck(...)              → check row written, stripe_payment_intent_id set
//   4. stripe-record-hold (THIS)     → payments row written (auth → capture later)
//   5. stripe-capture                → on delivery, reads the payments row
//
// Security invariants:
//   T-04-07 — callerId from bearer, NEVER from client-supplied body.
//   T-04-06 — amounts are server-authoritative (_shared/pricing.ts); client
//              cannot influence amount_total, scout_amount, or currency.
//   T-04-31 (IDOR) — check.seeker_id MUST match callerId; service-role read
//              so RLS cannot be bypassed by a crafted auth header.
//   IDEMPOTENT — ON CONFLICT (check_id) DO NOTHING; returns the existing row.
//              payments has unique (check_id) from migration 0011.
//
// JWT verification ENABLED (user-callable). Deploy with --no-verify-jwt=FALSE
// (the default). NEVER pass --no-verify-jwt to `supabase functions deploy`.

import { authedClient, serviceClient } from "../_shared/supabase.ts";
import { priceForTier } from "../_shared/pricing.ts";

// deno-lint-ignore no-explicit-any
type Svc = any;

export interface RecordHoldInput {
  /** Resolved from the bearer token — NEVER from the request body. */
  callerId: string | null;
  /** Sent by the client after createCheck succeeds. */
  checkId: string | null;
}

export interface RecordHoldDeps {
  svc: Svc;
}

/**
 * Core handler — decoupled from Deno.serve so it is unit-testable with an
 * injected mock svc (same handleX(input, deps) pattern as stripe-capture).
 */
export async function handleRecordHold(
  input: RecordHoldInput,
  deps: RecordHoldDeps,
): Promise<Response> {
  const { callerId, checkId } = input;
  const { svc } = deps;

  // ── Auth gate: T-04-07 ────────────────────────────────────────────────────
  if (!callerId) {
    return new Response("not authenticated", { status: 401 });
  }

  // ── Input validation ──────────────────────────────────────────────────────
  if (!checkId || typeof checkId !== "string") {
    return new Response("missing checkId", { status: 400 });
  }

  // ── Load the check via service role (bypasses RLS) ────────────────────────
  // Service-role read is required so we can reliably resolve seeker_id for the
  // IDOR check — an authed RLS read would silently return null if the caller
  // is not the seeker, masking the ownership mismatch as a 404.
  const { data: check, error: checkErr } = await svc
    .from("checks")
    .select("id, seeker_id, tier, stripe_payment_intent_id")
    .eq("id", checkId)
    .maybeSingle();

  if (checkErr || !check) {
    return new Response("check not found", { status: 404 });
  }

  // ── IDOR guard: T-04-31 ───────────────────────────────────────────────────
  // The caller MUST own this check. We compare against the service-role read
  // (trusted) not a client claim.
  if (check.seeker_id !== callerId) {
    return new Response("forbidden", { status: 403 });
  }

  // ── Require the PI to already be linked (set by createCheck) ─────────────
  // If stripe_payment_intent_id is null the hold was never linked to this
  // check — we MUST NOT fabricate a payments row with a null PI id.
  if (!check.stripe_payment_intent_id) {
    return new Response(
      "hold not linked: stripe_payment_intent_id is null on this check",
      { status: 409 },
    );
  }

  // ── Server-authoritative amounts: T-04-06 ────────────────────────────────
  // Amounts come from _shared/pricing.ts keyed on the check's tier. The client
  // cannot influence these values — they are never read from the request body.
  let pricing: { seekerTotal: number; scoutAmount: number; currency: string };
  try {
    pricing = priceForTier(check.tier);
  } catch (_e) {
    return new Response(`unknown tier on check: ${check.tier}`, { status: 500 });
  }

  // ── IDEMPOTENT insert ─────────────────────────────────────────────────────
  // payments has unique (check_id) — migration 0011, line 92.
  // ON CONFLICT DO NOTHING means a duplicate call is a safe no-op.
  // We return 200 either way so the caller's retry loop terminates.
  // upsert with ignoreDuplicates = INSERT ... ON CONFLICT (check_id) DO NOTHING.
  // (.insert().onConflict() is NOT a supabase-js method — that was the 500.)
  const { error: insertErr } = await svc
    .from("payments")
    .upsert(
      {
        check_id: checkId,
        stripe_payment_intent_id: check.stripe_payment_intent_id,
        amount_total: pricing.seekerTotal,
        scout_amount: pricing.scoutAmount,
        currency: pricing.currency,
        status: "authorized",
      },
      { onConflict: "check_id", ignoreDuplicates: true },
    );

  if (insertErr) {
    return new Response(
      `failed to insert payments row: ${insertErr.message}`,
      { status: 500 },
    );
  }

  // ── Audit log: payment.authorized ────────────────────────────────────────
  // Mirrors stripe-create-payment-intent's event-log call so operations can
  // correlate "PI authorized" (at createPaymentHold time) with "row written"
  // (this call). If the log RPC fails we do NOT surface it — the payments row
  // is already committed (the important thing).
  try {
    await svc.rpc("log_event", {
      p_event_type: "payment.authorized",
      p_subject_type: "payment",
      p_context: {
        check_id: checkId,
        payment_intent_id: check.stripe_payment_intent_id,
        tier: check.tier,
        amount_total: pricing.seekerTotal,
        scout_amount: pricing.scoutAmount,
        currency: pricing.currency,
        seeker_id: callerId,
      },
    });
  } catch (_logErr) {
    // Non-fatal — row is written; log failure is not a booking failure.
  }

  return Response.json({ ok: true }, { status: 200 });
}

// ── Live Deno.serve entrypoint ────────────────────────────────────────────────
// Resolves the caller identity from the bearer token (T-04-07 — never trust body).
// JWT verification ENABLED — do NOT deploy with --no-verify-jwt.
// Deploy: supabase functions deploy stripe-record-hold
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    // Resolve caller from bearer token.
    const authed = authedClient(req);
    const { data: userData } = await authed.auth.getUser();
    const callerId = userData?.user?.id ?? null;

    // Parse request body — only checkId comes from the client.
    let checkId: string | null = null;
    try {
      ({ checkId } = await req.json());
    } catch (_e) {
      return new Response("bad body", { status: 400 });
    }

    try {
      return await handleRecordHold(
        { callerId, checkId },
        { svc: serviceClient() },
      );
    } catch (e) {
      return new Response(`internal error: ${(e as Error).message}`, {
        status: 500,
      });
    }
  });
}
