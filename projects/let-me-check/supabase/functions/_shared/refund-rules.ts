// supabase/functions/_shared/refund-rules.ts
// LMC Phase 4 — Payments: pure, dependency-free auto-approval rule for refunds.
//
// This module is intentionally dependency-free (no Stripe, no DB) so it can be
// unit-tested fully offline. It encodes the three-part refund policy:
//
//   1. Validate the reason code — unknown codes are rejected at the boundary.
//   2. 'never_delivered' + !delivered → auto_approved (clip genuinely never arrived).
//   3. First refund in 30-day window → auto_approved.
//   4. Repeat refunder (>=1 prior) → manual_review (abuse guard; no auto money).
//
// Security: evaluateRefund is the single gate between "user requests money back"
// and "stripe.refunds.create is called". Tests are MANDATORY (see refund-rules.test.ts).
//
// Decision (locked here, 04-CONTEXT.md D-06/D-07):
//   - Eligibility window: 24h after delivery (enforced by the calling Edge Function).
//   - Scout keeps pay regardless; the refund is from the platform charge (D-08).
//   - Bad/fake clips are NOT handled here — that is Phase-5 (D-08a).

/** The five structured reason codes a Seeker may choose when reporting a problem. */
export type RefundReason =
  | "blurry"
  | "wrong_location"
  | "didnt_show_needed"
  | "never_delivered"
  | "other";

/** Outcome of the automated review rule. */
export type RefundDecision = "auto_approved" | "manual_review";

const VALID_REASONS: ReadonlySet<string> = new Set<RefundReason>([
  "blurry",
  "wrong_location",
  "didnt_show_needed",
  "never_delivered",
  "other",
]);

/**
 * Pure auto-approval rule for refund requests.
 *
 * @param input.reasonCode       - The Seeker's chosen reason (must be a valid RefundReason)
 * @param input.priorRefundsIn30d - Count of approved/auto_approved refunds for this
 *                                   Seeker in the last 30 days (queried server-side)
 * @param input.delivered         - true if the check has a delivered/transferred status
 *
 * @returns { decision: RefundDecision }
 * @throws Error("invalid refund reason: <code>") for unknown reason codes
 */
export function evaluateRefund(input: {
  reasonCode: string;
  priorRefundsIn30d: number;
  delivered: boolean;
}): { decision: RefundDecision } {
  const { reasonCode, priorRefundsIn30d, delivered } = input;

  // Validate reason code at the boundary — unknown codes are rejected immediately.
  if (!VALID_REASONS.has(reasonCode)) {
    throw new Error(`invalid refund reason: ${reasonCode}`);
  }

  // Special case: 'never_delivered' on a genuinely undelivered check.
  // The clip never arrived, so we auto-approve regardless of prior refund count.
  if (reasonCode === "never_delivered" && !delivered) {
    return { decision: "auto_approved" };
  }

  // Standard rule: first refund in the 30-day window -> auto_approved.
  // Repeat refunders (abuse guard) -> manual_review; a human decides before money moves.
  if (priorRefundsIn30d === 0) {
    return { decision: "auto_approved" };
  }

  return { decision: "manual_review" };
}
