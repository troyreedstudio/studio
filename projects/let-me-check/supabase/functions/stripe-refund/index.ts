// supabase/functions/stripe-refund/index.ts
// LMC Phase 4 — Payments: reason-coded, rules-reviewed Seeker refund endpoint.
//
// This is a USER-CALLABLE function (JWT verification enabled — do NOT use --no-verify-jwt).
// The caller is the OWNING SEEKER on their own delivered check. Only they may request a
// refund; ownership is enforced before any money moves (T-04-31).
//
// Key decisions (D-06/D-07/D-08):
//   D-06: no instant self-refund; reason required + automated review runs first.
//   D-07: EVERY refund request is recorded immutably with its reason code.
//   D-08: refund is issued to the ORIGINAL CARD via the platform charge.
//         NEVER set reverse_transfer — the Scout's Transfer is not touched.
//         The Scout always keeps their pay; LMC absorbs the refund.
//
// Flow:
//   1. Resolve seekerId from bearer → 401 if null.
//   2. Validate body (checkId, reasonCode required).
//   3. Load check + payment row; ownership check → 403.
//   4. Guard: if payment not captured/transferred and reasonCode != 'never_delivered' → 400.
//   5. Count Seeker's prior approved refunds in last 30 days.
//   6. evaluateRefund() → decision (throws on invalid reason → 400).
//   7. ALWAYS insert refund_requests row (D-07 immutable record).
//   8a. auto_approved: refunds.create WITHOUT reverse_transfer → log + return {status:'refunded'}.
//   8b. manual_review: do NOT call Stripe → log + return {status:'under_review'}.

import { getStripeClient } from "../_shared/stripe.ts";
import { authedClient, serviceClient } from "../_shared/supabase.ts";
import { evaluateRefund } from "../_shared/refund-rules.ts";

// deno-lint-ignore no-explicit-any
type Svc = any;
// deno-lint-ignore no-explicit-any
type StripeClient = any;

export interface RefundInput {
  callerId: string | null;
  body: {
    checkId?: string;
    reasonCode?: string;
    note?: string;
  };
}

export interface RefundDeps {
  stripe: StripeClient;
  svc: Svc;
}

/**
 * Core refund logic, decoupled from Deno.serve so it is unit-testable
 * with an injected mock stripe + svc (same handleX(input, deps) pattern as stripe-capture).
 */
export async function handleRefund(
  input: RefundInput,
  deps: RefundDeps,
): Promise<Response> {
  const { callerId, body } = input;
  const { stripe, svc } = deps;

  // 1. Auth gate (T-04-31).
  if (!callerId) {
    return new Response("not authenticated", { status: 401 });
  }

  // 2. Validate body.
  const { checkId, reasonCode, note } = body;
  if (!checkId || !reasonCode) {
    return new Response("missing checkId or reasonCode", { status: 400 });
  }

  // 3. Load check row (ownership + status).
  const { data: check } = await svc
    .from("checks")
    .select("check_id, seeker_id, status")
    .eq("check_id", checkId)
    .maybeSingle();

  if (!check) {
    return new Response("check not found", { status: 404 });
  }

  // Ownership enforcement (T-04-31): Seeker may only refund their own check.
  if (check.seeker_id !== callerId) {
    return new Response("forbidden", { status: 403 });
  }

  // 3b. Load payment row.
  const { data: payment } = await svc
    .from("payments")
    .select("stripe_payment_intent_id, stripe_charge_id, status")
    .eq("check_id", checkId)
    .maybeSingle();

  // Determine whether the clip was genuinely delivered.
  const deliveredStatuses = ["captured", "transferred", "refunded"];
  const delivered = deliveredStatuses.includes(payment?.status ?? "");

  // 4. Guard: nothing to refund if payment never captured (except never_delivered).
  if (!delivered && reasonCode !== "never_delivered") {
    return new Response(
      "no captured payment to refund for this check",
      { status: 400 },
    );
  }

  // 5. Count prior approved/auto_approved refunds in the last 30 days for this Seeker.
  // Using an RPC to keep the date arithmetic server-side (avoids clock skew).
  const { data: priorCount } = await svc.rpc("count_seeker_refunds_in_30d", {
    p_seeker_id: callerId,
  });
  const priorRefundsIn30d = typeof priorCount === "number" ? priorCount : 0;

  // 6. Apply the auto-approval rule (throws on invalid reasonCode -> map to 400).
  let decision: "auto_approved" | "manual_review";
  try {
    ({ decision } = evaluateRefund({ reasonCode, priorRefundsIn30d, delivered }));
  } catch (e) {
    return new Response((e as Error).message, { status: 400 });
  }

  // 7. ALWAYS insert a refund_requests row (D-07: every request recorded immutably).
  await svc
    .from("refund_requests")
    .insert({
      check_id: checkId,
      seeker_id: callerId,
      reason_code: reasonCode,
      reason_note: note ?? null,
      review_status: decision === "auto_approved" ? "auto_approved" : "manual_review",
      auto_approved: decision === "auto_approved",
    })
    .select("id")
    .maybeSingle();

  // 8a. Auto-approved: issue refund to the original card via the platform charge.
  // NEVER include reverse_transfer (D-08 — Scout keeps their pay; platform absorbs).
  if (decision === "auto_approved") {
    const refund = await stripe.refunds.create({
      payment_intent: payment?.stripe_payment_intent_id,
      reason: "requested_by_customer",
      metadata: {
        lmc_reason_code: reasonCode,
        check_id: checkId,
      },
      // D-08: DO NOT set reverse_transfer here — the Scout's transfer is NEVER clawed back.
      // Bad/fake clip handling is Phase-5 (D-08a), not here.
    });

    // Update the refund_requests row with the Stripe refund id.
    await svc
      .from("refund_requests")
      .update({ stripe_refund_id: refund.id })
      .eq("check_id", checkId);

    // Update payments.status to reflect the refund.
    await svc
      .from("payments")
      .update({ status: "refunded" })
      .eq("check_id", checkId);

    // Immutable event log (T-04-34 repudiation mitigation).
    await svc.rpc("log_event", {
      p_event_type: "payment.refunded",
      p_context: { check_id: checkId, reason_code: reasonCode, stripe_refund_id: refund.id },
    });

    return Response.json({ status: "refunded" });
  }

  // 8b. Manual review: flag but do NOT call Stripe. Money stays put until a human approves.
  await svc.rpc("log_event", {
    p_event_type: "payment.refund_flagged",
    p_context: { check_id: checkId, reason_code: reasonCode, seeker_id: callerId },
  });

  return Response.json({ status: "under_review" });
}

// Live entrypoint: resolve the caller from their bearer, then run the core handler.
// This function IS user-callable — JWT verification is ENABLED (do NOT deploy with --no-verify-jwt).
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    const authed = authedClient(req);
    const { data: userData } = await authed.auth.getUser();
    const callerId = userData?.user?.id ?? null;

    let body: RefundInput["body"] = {};
    try {
      body = await req.json();
    } catch (_e) {
      return new Response("bad body", { status: 400 });
    }

    try {
      const stripe = await getStripeClient();
      const svc = serviceClient();
      return await handleRefund({ callerId, body }, { stripe, svc });
    } catch (e) {
      return new Response(`internal error: ${(e as Error).message}`, {
        status: 500,
      });
    }
  });
}
