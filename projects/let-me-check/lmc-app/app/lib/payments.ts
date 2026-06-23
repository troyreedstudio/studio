// lmc-app/app/lib/payments.ts
// LMC Phase 4 — Payments: client-side contract layer for all payment operations.
//
// This module is the ONLY place the UI touches the payments Edge Functions.
// It holds NO business logic — the server owns all pricing, validation, and
// state transitions. These are typed Edge Function wrappers (mirrors clips.ts).
//
// Calling order in the Seeker booking flow (D-01/D-02):
//   1. createPaymentHold(tier)  — authorizes a card hold server-side
//   2. presentPaymentSheet(...)  — UI collects / confirms payment (Plan 06)
//   3. createCheck(...)          — check row created ONLY if hold succeeded
//
// If createPaymentHold throws (card declined, unknown tier, network error),
// the booking is blocked and the Seeker is re-prompted — no check is created.
//
// NOTE: Edge Functions are called via plain fetch() rather than
// supabase.functions.invoke(). The invoke() wrapper's generator-based async
// internals (tslib.__awaiter) can hang indefinitely on Hermes/Release builds,
// leaving the Promise unresolved with no error surfaced. A direct authenticated
// fetch with an explicit AbortController timeout guarantees the call always
// resolves or rejects within 30 seconds.

import { supabase } from './supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// ── Shared Edge Function fetch helper ─────────────────────────────────────────

/**
 * Authenticated fetch to a Supabase Edge Function. Uses plain fetch() with an
 * explicit 30-second AbortController timeout instead of supabase.functions.invoke
 * to avoid a Hermes/Release build hang in the tslib.__awaiter Promise chain.
 *
 * Throws on:
 *   - Network failure (FetchError)
 *   - Timeout after 30 seconds
 *   - Non-2xx HTTP status (message includes status + body)
 *   - Missing or invalid JSON response
 */
async function invokeEdgeFunction(
  functionName: string,
  body: unknown,
): Promise<unknown> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token ?? SUPABASE_ANON_KEY;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(
      `${SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      controller.signal.aborted
        ? `invokeEdgeFunction(${functionName}): timed out after 30s`
        : `invokeEdgeFunction(${functionName}): network error — ${msg}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch { /* ignore */ }
    throw new Error(
      `invokeEdgeFunction(${functionName}): HTTP ${response.status}${detail ? ` — ${detail}` : ''}`,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(`invokeEdgeFunction(${functionName}): invalid JSON in response`);
  }
  return data;
}

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
  const data = await invokeEdgeFunction('stripe-create-payment-intent', { tier }) as Record<string, unknown>;
  if (
    !data?.clientSecret ||
    !data?.customerId ||
    !data?.ephemeralKey ||
    !data?.paymentIntentId
  ) {
    throw new Error('createPaymentHold: incomplete response from Edge Function');
  }
  return {
    clientSecret: data.clientSecret as string,
    customerId: data.customerId as string,
    ephemeralKey: data.ephemeralKey as string,
    paymentIntentId: data.paymentIntentId as string,
  };
}

// ── recordHold ────────────────────────────────────────────────────────────────

/**
 * PAY-02 / D-01: create the payments row that links a check to its Stripe hold.
 * Must be called AFTER createCheck returns a checkId. Without this row,
 * stripe-capture, stripe-refund, and trouble-report all return 404.
 *
 * Idempotent on the server — a second call for the same checkId is a safe no-op
 * (ON CONFLICT DO NOTHING on payments.check_id unique index).
 *
 * If this call fails (network, 5xx) do NOT hard-fail the booking — the Seeker's
 * card hold and check row both exist. Log and proceed; a backfill can repair it.
 * The caller in payment.tsx wraps this in a try/catch and swallows the error.
 */
export async function recordHold(checkId: string): Promise<void> {
  await invokeEdgeFunction('stripe-record-hold', { checkId });
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
  const data = await invokeEdgeFunction('stripe-refund', { checkId, reasonCode, note }) as Record<string, unknown>;
  if (!data?.status) {
    throw new Error('requestRefund: missing status in response');
  }
  return { status: data.status as 'refunded' | 'under_review' };
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
  const data = await invokeEdgeFunction('stripe-connect-onboard', { payoutSpeed }) as Record<string, unknown>;
  if (!data?.url) {
    throw new Error('startConnectOnboarding: missing url in response');
  }
  return { url: data.url as string };
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
  const data = await invokeEdgeFunction('stripe-connect-status', {}) as Record<string, unknown>;
  return {
    eligible: (data?.eligible as boolean) ?? false,
    chargesEnabled: (data?.chargesEnabled as boolean) ?? false,
    payoutsEnabled: (data?.payoutsEnabled as boolean) ?? false,
    payoutSpeed: (data?.payoutSpeed as PayoutSpeed) ?? 'standard',
  };
}

// ── reportTrouble ─────────────────────────────────────────────────────────────

/**
 * D-04: Report a trouble situation from the Scout at the filming location.
 * Calls the trouble-report Edge Function which transitions the check to no_scout,
 * auto-refunds the Seeker, and pays the Scout a flat no-fault fee.
 *
 * ONLY show the REPORTED state in the UI after this resolves successfully.
 * On error, show an Alert — never claim "SEEKER REFUNDED" before the server confirms.
 * (T-07-12: prevents client-side spoofing/repudiation of the reported state.)
 */
export type TroubleReason = string; // matches filming.tsx TROUBLE_REASONS

export async function reportTrouble(
  checkId: string,
  reason: TroubleReason,
): Promise<{ status: 'reported' }> {
  const data = await invokeEdgeFunction('trouble-report', { checkId, reason }) as Record<string, unknown>;
  if (data.status !== 'reported') {
    throw new Error('reportTrouble: unexpected response from server');
  }
  return { status: 'reported' };
}

// ── getScoutEarnings ──────────────────────────────────────────────────────────

/**
 * D-06: Fetch the Scout's real earnings data from the scout-earnings Edge Function.
 * The server derives identity from the caller's bearer token (T-07-14: no scoutId in body).
 */
export interface ScoutEarnings {
  weeklyByDay: { day: string; cents: number }[];
  allTimeCents: number;
  availableCents: number;
  instantNetCents: number;
  payoutSpeed: 'instant' | 'standard';
  payouts: {
    id: string;
    amountCents: number;
    status: string;
    arrivalDate: string;
    method: string;
  }[];
}

export async function getScoutEarnings(): Promise<ScoutEarnings> {
  return await invokeEdgeFunction('scout-earnings', {}) as ScoutEarnings;
}

// ── requestPayout ─────────────────────────────────────────────────────────────

/**
 * D-06: Initiate a Scout payout via the stripe-connect-payout Edge Function.
 * The server bounds amountCents to the Scout's actual available balance —
 * the client cannot overdraw (T-07-13). Pass speed from the Scout's stored preference.
 */
export async function requestPayout(
  amountCents: number,
  speed?: 'instant' | 'standard',
): Promise<{ status: 'initiated'; payoutId: string }> {
  return await invokeEdgeFunction(
    'stripe-connect-payout',
    { amountCents, speed },
  ) as { status: 'initiated'; payoutId: string };
}
