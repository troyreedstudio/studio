// lmc-app/app/lib/payments.ts
// LMC Phase 4 — Payments: client-side contract layer for all payment operations.
//
// This module is the ONLY place the UI touches the payments Edge Functions.
// It holds NO business logic — the server owns all pricing, validation, and
// state transitions. These are pure typed invoke-wrappers (mirrors clips.ts).
//
// Calling order in the Seeker booking flow (D-01/D-02):
//   1. createPaymentHold(tier)  — authorizes a card hold server-side
//   2. presentPaymentSheet(...)  — UI collects / confirms payment (Plan 06)
//   3. createCheck(...)          — check row created ONLY if hold succeeded
//
// If createPaymentHold throws (card declined, unknown tier, network error),
// the booking is blocked and the Seeker is re-prompted — no check is created.

import { supabase } from './supabase';

// ── Shared tier type ───────────────────────────────────────────────────────────
// Must match the server-side Tier in _shared/pricing.ts and the checks.tier
// CHECK constraint in the DB. Kept minimal here — all pricing lives server-side.

export type Tier = 'standard' | 'priority';

// ── createPaymentHold ─────────────────────────────────────────────────────────

/**
 * The values returned by the stripe-create-payment-intent Edge Function.
 * ONLY client-safe, non-secret fields are included (T-04-08).
 *
 * clientSecret     — passed to initPaymentSheet; short-lived, scoped to this PI
 * customerId       — passed to initPaymentSheet for saved-card support
 * ephemeralKey     — passed to initPaymentSheet; short-lived, scoped to customer
 * paymentIntentId  — stored on the check row after createCheck succeeds
 */
export type PaymentHold = {
  clientSecret: string;
  customerId: string;
  ephemeralKey: string;
  paymentIntentId: string;
};

/**
 * PAY-01 / D-01: authorize a card hold for the given tier BEFORE creating a
 * check. If this throws, the booking is blocked (D-02) — do NOT call createCheck.
 *
 * The server derives the amount from _shared/pricing.ts (server-authoritative);
 * the client cannot influence the charged amount (T-04-06).
 */
export async function createPaymentHold(tier: Tier): Promise<PaymentHold> {
  const { data, error } = await supabase.functions.invoke('stripe-create-payment-intent', { body: { tier } });
  if (error) throw error;
  if (
    !data?.clientSecret ||
    !data?.customerId ||
    !data?.ephemeralKey ||
    !data?.paymentIntentId
  ) {
    throw new Error('createPaymentHold: incomplete response from Edge Function');
  }
  return {
    clientSecret: data.clientSecret,
    customerId: data.customerId,
    ephemeralKey: data.ephemeralKey,
    paymentIntentId: data.paymentIntentId,
  };
}

// ── requestRefund ─────────────────────────────────────────────────────────────

/**
 * Structured reason codes for refund requests (D-06/D-07).
 * Every refund must carry one of these codes — feeds clip-quality and
 * abuse/fraud signals via the event log.
 */
export type RefundReason =
  | 'blurry'
  | 'wrong_location'
  | 'didnt_show_needed'
  | 'never_delivered'
  | 'other';

/**
 * D-06: submit a refund request for a delivered check. The server runs
 * automated rules review and responds with { status }. No instant self-refund
 * at launch — reason capture + review is mandatory (Uber/Grab model).
 *
 * The stripe-refund Edge Function ships in Plan 07; this is the contract
 * delivery.tsx consumes then.
 */
export async function requestRefund(
  checkId: string,
  reasonCode: RefundReason,
  note?: string,
): Promise<{ status: 'refunded' | 'under_review' }> {
  const { data, error } = await supabase.functions.invoke('stripe-refund', {
    body: { checkId, reasonCode, note },
  });
  if (error) throw error;
  if (!data?.status) {
    throw new Error('requestRefund: missing status in response');
  }
  return { status: data.status };
}

// ── startConnectOnboarding ────────────────────────────────────────────────────

/**
 * SCOUT-02 / D-05: payout speed the Scout chooses at onboarding.
 * instant — 2% Scout-facing fee (Stripe's ~1% rail + ~1% LMC margin)
 * standard — free ACH, ~24h
 */
export type PayoutSpeed = 'standard' | 'instant';

/**
 * SCOUT-01: begin (or resume) Stripe Connect Express onboarding for the Scout.
 * Returns a single-use Stripe hosted account_link URL that the Scout's payout
 * screen opens in an in-app browser (expo-web-browser).
 *
 * The payoutSpeed preference is the D-05 sole write path — the Edge Function
 * persists it to scout_stripe_accounts.payout_speed.
 *
 * The stripe-connect-onboard Edge Function ships in Plan 04; this is the
 * contract scout/payout.tsx consumes then.
 */
export async function startConnectOnboarding(
  payoutSpeed?: PayoutSpeed,
): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke(
    'stripe-connect-onboard',
    { body: { payoutSpeed } },
  );
  if (error) throw error;
  if (!data?.url) {
    throw new Error('startConnectOnboarding: missing url in response');
  }
  return { url: data.url };
}

// ── getConnectStatus ──────────────────────────────────────────────────────────

/**
 * Check the Scout's Stripe Connect account status. Used to gate "go online" on
 * charges_enabled (Pitfall 5 from 04-RESEARCH: always check both fields).
 *
 * The stripe-connect-status Edge Function ships in Plan 04.
 */
export async function getConnectStatus(): Promise<{
  eligible: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  payoutSpeed: PayoutSpeed;
}> {
  const { data, error } = await supabase.functions.invoke(
    'stripe-connect-status',
    { body: {} },
  );
  if (error) throw error;
  return {
    eligible: data?.eligible ?? false,
    chargesEnabled: data?.chargesEnabled ?? false,
    payoutsEnabled: data?.payoutsEnabled ?? false,
    payoutSpeed: data?.payoutSpeed ?? 'standard',
  };
}
