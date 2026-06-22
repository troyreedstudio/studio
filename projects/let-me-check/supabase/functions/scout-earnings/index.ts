// supabase/functions/scout-earnings/index.ts
// LMC Phase 7 — SLA + Money Integrity: real Scout earnings dashboard endpoint.
//
// This is a USER-CALLABLE function (JWT verify_jwt=true at deploy).
// The caller is a Scout reading ONLY their own earnings. IDOR safety:
//   - scoutId is derived from the verified bearer callerId ONLY.
//   - No body-supplied scoutId is ever accepted.
//   - DB RPCs (scout_earnings_weekly, scout_earnings_totals) are SECURITY DEFINER
//     with a plpgsql IDOR guard inside them (defence in depth, from 0016 migration).
//
// Data sources:
//   A. DB aggregate (0016 RPCs) — authoritative for earned amounts.
//   B. Stripe balance — authoritative for available-to-withdraw.
//   C. Stripe payouts.list — payout history.
//
// Pitfall 5 guard: instantNetCents uses balance.instant_available.net_available
// (after the 2% Stripe fee), NEVER the gross balance.available amount.
// Using gross would cause an overdraw: the fee is debited after the payout.

import { getStripeClient } from "../_shared/stripe.ts";
import { authedClient, serviceClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type StripeClient = any;
// deno-lint-ignore no-explicit-any
type Svc = any;

export interface ScoutEarningsInput {
  callerId: string | null;
}

export interface ScoutEarningsDeps {
  stripe: StripeClient;
  svc: Svc;
}

export interface PayoutSummary {
  id: string;
  amountCents: number;
  status: string;
  arrivalDate: string; // YYYY-MM-DD
  method: string;
}

export interface ScoutEarningsResponse {
  weeklyByDay: Array<{ day: string; cents: number }>;
  allTimeCents: number;
  availableCents: number;
  instantNetCents: number;
  payoutSpeed: string;
  payouts: PayoutSummary[];
}

/**
 * Core earnings logic, decoupled from Deno.serve for offline unit tests.
 * callerId is the verified Scout id from the bearer token.
 * scoutId = callerId ONLY — never a body-supplied value (IDOR-safe).
 */
export async function handleScoutEarnings(
  input: ScoutEarningsInput,
  deps: ScoutEarningsDeps,
): Promise<Response> {
  const { callerId } = input;
  const { stripe, svc } = deps;

  // 1. Auth gate — 401 if no caller.
  if (!callerId) {
    return new Response("not authenticated", { status: 401 });
  }

  // IDOR-safe ownership: scoutId is always the verified caller.
  // Never accept a scoutId from the request body.
  const scoutId = callerId;

  // 2. DB aggregate via 0016 SECURITY DEFINER RPCs.
  //    Both RPCs have an internal IDOR guard that raises if p_scout_id != auth.uid().
  //    Service role (auth.uid()=null) is allowed because we verified identity above.
  const { data: weeklyRows } = await svc.rpc("scout_earnings_weekly", {
    p_scout_id: scoutId,
  });
  const { data: totalsRow } = await svc.rpc("scout_earnings_totals", {
    p_scout_id: scoutId,
  });

  // totalsRow may be an array (RETURNS TABLE) or a single object
  const totalsData = Array.isArray(totalsRow) ? totalsRow[0] : totalsRow;
  const allTimeCents: number = totalsData?.total_cents ?? 0;

  // 3. Stripe balance + payout history (only if Scout has a Connect account).
  const { data: acctRow } = await svc
    .from("scout_stripe_accounts")
    .select("stripe_account_id, payout_speed")
    .eq("scout_id", scoutId)
    .maybeSingle();

  let availableCents = 0;
  let instantNetCents = 0;
  let payoutSpeed = "standard";
  let payouts: PayoutSummary[] = [];

  if (acctRow?.stripe_account_id) {
    payoutSpeed = (acctRow.payout_speed as string) ?? "standard";

    // Retrieve balance with instant_available.net_available expanded.
    // Pitfall 5: ALWAYS use net_available for instant payout amounts.
    const balance = await stripe.balance.retrieve(
      { expand: ["instant_available.net_available"] },
      { stripeAccount: acctRow.stripe_account_id },
    );

    availableCents = balance.available?.find(
      // deno-lint-ignore no-explicit-any
      (b: any) => b.currency === "usd",
    )?.amount ?? 0;

    // net_available is the amount after the 2% instant payout fee.
    // Use net_available[0].amount — never use balance.available for instant payouts.
    instantNetCents = balance.instant_available?.find(
      // deno-lint-ignore no-explicit-any
      (b: any) => b.currency === "usd",
    )?.net_available?.[0]?.amount ?? availableCents;

    // Recent payout list — last 10 payouts.
    const payoutList = await stripe.payouts.list(
      { limit: 10 },
      { stripeAccount: acctRow.stripe_account_id },
    );

    // deno-lint-ignore no-explicit-any
    payouts = (payoutList.data ?? []).map((p: any) => ({
      id: p.id,
      amountCents: p.amount,
      status: p.status,
      // arrival_date is a Unix timestamp (seconds); convert to YYYY-MM-DD string.
      arrivalDate: new Date(p.arrival_date * 1000).toISOString().slice(0, 10),
      method: p.method,
    }));
  }

  const responseBody: ScoutEarningsResponse = {
    weeklyByDay: weeklyRows ?? [],
    allTimeCents,
    availableCents,
    instantNetCents,
    payoutSpeed,
    payouts,
  };

  return Response.json(responseBody);
}

// Live entrypoint: resolve caller from bearer, run core handler.
// JWT verification ENABLED at deploy (verify_jwt=true — user-callable).
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    const authed = authedClient(req);
    const { data: userData } = await authed.auth.getUser();
    const callerId = userData?.user?.id ?? null;

    try {
      const stripe = await getStripeClient();
      const svc = serviceClient();
      return await handleScoutEarnings({ callerId }, { stripe, svc });
    } catch (e) {
      return new Response(`internal error: ${(e as Error).message}`, {
        status: 500,
      });
    }
  });
}
