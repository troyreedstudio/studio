// supabase/functions/stripe-connect-payout/index.ts
// LMC Phase 7 — SLA + Money Integrity: Stripe Connect payout (withdraw) endpoint.
//
// This is a USER-CALLABLE function (JWT verify_jwt=true at deploy).
// The caller is a Scout withdrawing ONLY their own earnings. IDOR safety:
//   - scoutId = callerId (derived from verified bearer), NEVER from request body.
//
// Supports two payout speeds:
//   'standard' — ACH bank transfer, free, typically arrives next business day.
//   'instant'  — Instant payout via debit card/supported bank, 2% Scout-facing fee.
//
// Critical money-integrity constraints:
//   1. Instant payout amount bounded by balance.instant_available.net_available
//      (AFTER the 2% fee). Using gross balance would overdraw the account.
//      Pitfall 5: NEVER use balance.available for instant payout amounts.
//   2. log_event is called BEFORE payouts.create (audit-first).
//      If the function crashes mid-call, the event log still shows an attempt.
//      This provides double-payout mitigation: ops can detect un-matched events.
//   3. No source_transaction or special headers beyond stripeAccount — Stripe
//      handles routing, fee deduction, and eligibility detection.

import { getStripeClient } from "../_shared/stripe.ts";
import { authedClient, serviceClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type StripeClient = any;
// deno-lint-ignore no-explicit-any
type Svc = any;

export interface RequestPayoutInput {
  callerId: string | null;
  body: {
    amountCents?: number;
  };
}

export interface RequestPayoutDeps {
  stripe: StripeClient;
  svc: Svc;
}

/**
 * Core payout logic, decoupled from Deno.serve for offline unit tests.
 * callerId is the verified Scout id from the bearer token.
 * scoutId = callerId ONLY — never a body-supplied value (IDOR-safe, T-07-10).
 */
export async function handleRequestPayout(
  input: RequestPayoutInput,
  deps: RequestPayoutDeps,
): Promise<Response> {
  const { callerId, body } = input;
  const { stripe, svc } = deps;

  // 1. Auth gate — 401 if no caller.
  if (!callerId) {
    return new Response("not authenticated", { status: 401 });
  }

  const { amountCents } = body;

  // 2. Validate amount — must be a positive integer.
  if (!amountCents || amountCents <= 0) {
    return new Response("amountCents must be > 0", { status: 400 });
  }

  // IDOR-safe: scoutId is always the verified caller, never from request body.
  const scoutId = callerId;

  // 3. Load Scout's Connect account details.
  const { data: acctRow } = await svc
    .from("scout_stripe_accounts")
    .select("stripe_account_id, payout_speed")
    .eq("scout_id", scoutId)
    .maybeSingle();

  if (!acctRow?.stripe_account_id) {
    return new Response("no payout account configured", { status: 400 });
  }

  const stripeAccountId: string = acctRow.stripe_account_id;
  const payoutSpeed: string = (acctRow.payout_speed as string) ?? "standard";

  // 4. For instant payouts: check available net balance BEFORE creating.
  //    Pitfall 5: ALWAYS use net_available, NEVER gross balance.available.
  //    The 2% fee is deducted from the net figure — using gross would create a
  //    negative balance after the fee is applied.
  if (payoutSpeed === "instant") {
    const balance = await stripe.balance.retrieve(
      { expand: ["instant_available.net_available"] },
      { stripeAccount: stripeAccountId },
    );

    // deno-lint-ignore no-explicit-any
    const instantNetCents: number = balance.instant_available?.find((b: any) => b.currency === "usd")
      ?.net_available?.[0]?.amount ?? 0;

    if (amountCents > instantNetCents) {
      return new Response(
        `insufficient instant balance: requested ${amountCents}, available ${instantNetCents}`,
        { status: 400 },
      );
    }
  }

  // 5. AUDIT-FIRST: log the payout attempt BEFORE calling Stripe.
  //    If the function crashes mid-payout, the event log shows an unmatched
  //    payment.payout_initiated — ops can identify and reconcile it.
  //    This is the double-payout mitigation (T-07-07).
  await svc.rpc("log_event", {
    p_event_type: "payment.payout_initiated",
    p_subject_type: "scout",
    p_subject_id: scoutId,
    p_context: {
      scout_id: scoutId,
      amount: amountCents,
      method: payoutSpeed,
    },
  });

  // 6. Create the payout on the Scout's Connect account.
  //    method: 'instant' requires an eligible external account (debit card or
  //    supported bank account). method: 'standard' is ACH, always eligible.
  const payout = await stripe.payouts.create(
    {
      amount: amountCents,
      currency: "usd",
      method: payoutSpeed as "standard" | "instant",
    },
    { stripeAccount: stripeAccountId },
  );

  return Response.json({ status: "initiated", payoutId: payout.id });
}

// Live entrypoint: resolve caller from bearer, run core handler.
// JWT verification ENABLED at deploy (verify_jwt=true — user-callable).
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    const authed = authedClient(req);
    const { data: userData } = await authed.auth.getUser();
    const callerId = userData?.user?.id ?? null;

    let body: RequestPayoutInput["body"] = {};
    try {
      body = await req.json();
    } catch (_e) {
      return new Response("bad body", { status: 400 });
    }

    try {
      const stripe = await getStripeClient();
      const svc = serviceClient();
      return await handleRequestPayout({ callerId, body }, { stripe, svc });
    } catch (e) {
      return new Response(`internal error: ${(e as Error).message}`, {
        status: 500,
      });
    }
  });
}
