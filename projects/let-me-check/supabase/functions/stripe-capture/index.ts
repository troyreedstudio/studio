// supabase/functions/stripe-capture/index.ts
// LMC Phase 4 — Payments: the ONLY actor that captures the held PaymentIntent
// and transfers funds to the Scout. Called by the Mux-webhook after delivery
// (Plan 04-05) or directly by the stripe-webhook on payment-related events.
//
// This is SERVICE-ROLE ONLY — no human caller can reach this logic. The client
// never captures (T-04-12). Every money movement is immutably logged (T-04-14).
//
// Key decisions (D-03/D-04/D-08/D-09):
//   - Capture the PI on delivery.
//   - Create a SEPARATE Transfer to the Scout (never a destination charge — Pitfall 2).
//   - D-09: if capture fails, the Scout is STILL paid from platform balance (no source_transaction).
//   - D-09: Seeker is blocked_from_booking until they settle.
//   - Never set reverse_transfer (D-08 — Scout keeps pay on refunds/disputes).
//   - IDEMPOTENT: if payments.status === 'transferred', return 200 'ok (dup)' immediately.

import { getStripeClient } from "../_shared/stripe.ts";
import { serviceClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type Svc = any;
// deno-lint-ignore no-explicit-any
type StripeClient = any;

export interface CaptureInput {
  checkId: string;
}

export interface CaptureDeps {
  stripe: StripeClient;
  svc: Svc;
}

/**
 * Core capture + transfer logic, decoupled from Deno.serve so it is unit-testable
 * with injected mock stripe + svc (same handleX(input, deps) pattern as mux-upload-url).
 */
export async function handleCapture(
  input: CaptureInput,
  deps: CaptureDeps,
): Promise<Response> {
  const { checkId } = input;
  const { stripe, svc } = deps;

  // 1. Load the payments row for this check.
  const { data: payment, error: payErr } = await svc
    .from("payments")
    .select("stripe_payment_intent_id, scout_amount, currency, status, check_id")
    .eq("check_id", checkId)
    .maybeSingle();

  if (payErr || !payment) {
    return new Response("payment row not found", { status: 404 });
  }

  const { stripe_payment_intent_id: paymentIntentId, scout_amount: scoutAmount, currency, status } = payment;

  // 2. IDEMPOTENCY: if already transferred, return immediately — no-op.
  if (status === "transferred") {
    return new Response("ok (dup)", { status: 200 });
  }

  // 3. Load the check row to get scout_id, seeker_id, and tier.
  // NOTE: the checks table's PK is `id` (only the payments table has `check_id`).
  // Filtering by `check_id` here returned nothing → scout_id was always null →
  // the Scout transfer ALWAYS deferred (Scouts never got paid). Fixed to `id`.
  const { data: check } = await svc
    .from("checks")
    .select("scout_id, tier, currency, seeker_id")
    .eq("id", checkId)
    .maybeSingle();

  const scoutId = check?.scout_id ?? null;
  const seekerId = check?.seeker_id ?? null;

  // 4. Attempt to capture the PaymentIntent.
  let captureSucceeded = false;
  let latestCharge: string | undefined;

  try {
    const pi = await stripe.paymentIntents.capture(paymentIntentId);
    latestCharge = pi.latest_charge as string;
    captureSucceeded = true;

    // Update payments row: captured + record charge id.
    await svc
      .from("payments")
      .update({ status: "captured", stripe_charge_id: latestCharge })
      .eq("check_id", checkId);

    // Log the capture event (T-04-14 repudiation mitigation).
    await svc.rpc("log_event", {
      p_event_type: "payment.captured",
      p_context: { check_id: checkId, charge_id: latestCharge },
    });
  } catch (_e) {
    // D-09: capture failed. Mark the payment, block the Seeker, but DO NOT return yet —
    // fall through to pay the Scout from the platform balance.
    captureSucceeded = false;

    await svc
      .from("payments")
      .update({ status: "capture_failed" })
      .eq("check_id", checkId);

    // Block the Seeker from booking new checks until they settle (D-09).
    if (seekerId) {
      await svc
        .from("profiles")
        .update({ blocked_from_booking: true })
        .eq("id", seekerId);
    }

    // Log capture failure.
    await svc.rpc("log_event", {
      p_event_type: "payment.capture_failed",
      p_context: { check_id: checkId, seeker_id: seekerId },
    });
    // Fall through — Scout must still be paid (D-09).
  }

  // 5. Transfer to Scout: look up their connected account.
  const { data: scoutAccount } = await svc
    .from("scout_stripe_accounts")
    .select("stripe_account_id")
    .eq("scout_id", scoutId)
    .maybeSingle();

  const scoutStripeAccountId: string | null = scoutAccount?.stripe_account_id ?? null;

  if (!scoutStripeAccountId) {
    // No Scout account on file — defer the transfer. Log it so ops can retry.
    // NEVER throw here; the Seeker has (or hasn't) been charged — we log and move on.
    await svc.rpc("log_event", {
      p_event_type: "payment.transfer_deferred",
      p_context: {
        check_id: checkId,
        scout_id: scoutId,
        reason: "no_scout_stripe_account",
      },
    });
    return new Response("ok (transfer deferred)", { status: 200 });
  }

  // Scout account found — create the Transfer.
  // NOTE: NEVER set reverse_transfer (D-08 — Scout keeps pay on refunds/disputes).
  // NOTE: NEVER use destination charges (separate charges + transfers — Pitfall 2).
  const transferArgs: {
    amount: number;
    currency: string;
    destination: string;
    transfer_group: string;
    metadata: Record<string, string>;
    source_transaction?: string;
  } = {
    amount: scoutAmount,
    currency,
    destination: scoutStripeAccountId,
    transfer_group: checkId,
    metadata: {
      check_id: checkId,
      scout_id: scoutId ?? "",
    },
  };

  if (captureSucceeded && latestCharge) {
    // Normal path: link the Transfer to the charge (source_transaction).
    // This delays the transfer until the charge settles — correct separate-charges+transfers pattern.
    transferArgs.source_transaction = latestCharge;
  }
  // D-09 path: no source_transaction — platform balance funds it.

  const transfer = await stripe.transfers.create(transferArgs);

  // Update payments row to reflect transfer.
  await svc
    .from("payments")
    .update({
      status: "transferred",
      stripe_transfer_id: transfer.id,
    })
    .eq("check_id", checkId);

  // Log transfer event (T-04-14).
  await svc.rpc("log_event", {
    p_event_type: "payment.transferred",
    p_context: {
      check_id: checkId,
      transfer_id: transfer.id,
      scout_id: scoutId,
      d9_platform_funded: !captureSucceeded,
    },
  });

  return new Response("ok", { status: 200 });
}

// Live entrypoint: wire the real Stripe client + service-role Supabase client.
// Service-role only — this function must never be exposed to unauthenticated callers.
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    try {
      const body = await req.json() as { checkId?: string };
      const checkId = body?.checkId;
      if (!checkId || typeof checkId !== "string") {
        return new Response("missing checkId", { status: 400 });
      }
      const stripe = await getStripeClient();
      const svc = serviceClient();
      return await handleCapture({ checkId }, { stripe, svc });
    } catch (e) {
      return new Response(`internal error: ${(e as Error).message}`, { status: 500 });
    }
  });
}
