// supabase/functions/trouble-report/index.ts
// LMC Phase 7 — SLA + Money Integrity: trouble-report Edge Function.
//
// Called by the Scout from filming.tsx when they encounter a situation that
// prevents them from completing the check (venue closed, access denied, safety
// concern, etc.). This is a USER-CALLABLE function (JWT verify_jwt=true at deploy).
//
// Money-integrity invariants (each asserted by a deno test):
//   1. CANCEL not refund — payment is still 'authorized' (uncaptured hold).
//      We call stripe.paymentIntents.cancel(pi) to release the hold.
//      stripe-refund.refunds.create() would FAIL on an uncaptured PI (Pitfall 4).
//   2. Scout no-fault Transfer is PLATFORM-FUNDED — no source_transaction,
//      so a Seeker refund can NEVER claw it back (D-04 invariant).
//   3. Idempotent — transition_check state guard + event_log lookup both prevent
//      a second cancel/Transfer on retry.
//   4. BLOCKER-1 — drives check to 'no_scout' NOT 'cancelled':
//      service role (auth.uid()=null) cannot pass the 'cancelled' actor guard
//      which uses `v_uid is distinct from v_seeker` (always true for null uid).
//      'no_scout' uses the relaxed `v_uid is not null` form and permits service role.
//
// NOFAULT_CENTS: change this ONE constant to update the no-fault pay amount.
// $3.00 default (D-04). One-line change if Troy sends an updated figure.
export const NOFAULT_CENTS = 300; // $3.00 flat — D-04 default; change here only

import { getStripeClient } from "../_shared/stripe.ts";
import { authedClient, serviceClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type StripeClient = any;
// deno-lint-ignore no-explicit-any
type Svc = any;

export interface TroubleReportInput {
  callerId: string | null;
  body: {
    checkId?: string;
    reason?: string;
  };
}

export interface TroubleReportDeps {
  stripe: StripeClient;
  svc: Svc;
}

/**
 * Core trouble-report logic, decoupled from Deno.serve for offline unit tests.
 * callerId is the already-resolved authenticated user id from the bearer token.
 * This function MUST run as service role (svc) for all Supabase writes.
 */
export async function handleTroubleReport(
  input: TroubleReportInput,
  deps: TroubleReportDeps,
): Promise<Response> {
  const { callerId, body } = input;
  const { stripe, svc } = deps;

  // 1. Auth gate — 401 if no caller.
  if (!callerId) {
    return new Response("not authenticated", { status: 401 });
  }

  const { checkId, reason } = body;
  if (!checkId || !reason) {
    return new Response("missing checkId or reason", { status: 400 });
  }

  // 2. Load check: ownership + status guard.
  const { data: check, error: checkErr } = await svc
    .from("checks")
    .select("id, status, scout_id, stripe_payment_intent_id, seeker_id, tier")
    .eq("id", checkId)
    .maybeSingle();

  if (checkErr || !check) {
    return new Response("check not found", { status: 404 });
  }

  // T-07-05: Scout can only trouble-report their OWN check.
  if (check.scout_id !== callerId) {
    return new Response("forbidden", { status: 403 });
  }

  // State guard: only in-progress checks can be troubled.
  if (!["assigned", "filming"].includes(check.status)) {
    return new Response("check not in a reportable state", { status: 400 });
  }

  // 3. Idempotency guard: transition_check is the primary lock (state machine
  //    rejects a second 'no_scout' from a terminal state). Additionally, if the
  //    event log already has a payment.scout_nofault_paid for this check, skip
  //    all Stripe calls. This handles any race where the state transition succeeded
  //    but the function crashed before logging.
  //
  //    We rely on the state transition as the primary idempotency layer:
  //    transition_check(no_scout) from a terminal state will raise, so the
  //    function returns a server error on a true duplicate. The event_log check
  //    is an additional guard surfaced via the check_event_exists RPC if available.
  const { data: nofaultExists } = await svc.rpc("check_event_exists", {
    p_event_type: "payment.scout_nofault_paid",
    p_subject_id: checkId,
  }).catch(() => ({ data: null }));

  if (nofaultExists === true) {
    return Response.json({ status: "reported" });
  }

  // 4. Transition check → 'no_scout' (BLOCKER-1 — NOT 'cancelled').
  //    Service role (auth.uid()=null) is authorised for 'no_scout' transitions.
  //    'cancelled' guard uses v_uid is distinct from v_seeker which always raises
  //    for a null uid, blocking service-role callers.
  await svc.rpc("transition_check", {
    p_check_id: checkId,
    p_to: "no_scout",
    p_context: { reason: "scout_trouble", trouble_reason: reason },
  });

  // 5. Hold release: cancel the uncaptured PaymentIntent.
  //    NEVER use stripe-refund here — it calls refunds.create which FAILS on an
  //    uncaptured PI (Pitfall 4 / confirmed from stripe-refund source).
  const { data: payment } = await svc
    .from("payments")
    .select("stripe_payment_intent_id, status")
    .eq("check_id", checkId)
    .maybeSingle();

  if (payment?.stripe_payment_intent_id && payment.status === "authorized") {
    await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
    await svc
      .from("payments")
      .update({ status: "canceled" })
      .eq("check_id", checkId);
  }

  // 6. Scout no-fault pay — flat NOFAULT_CENTS Transfer from platform balance.
  //    NO source_transaction: platform balance funds it, not the Seeker's charge.
  //    This means a Seeker refund CANNOT claw this back (D-04).
  //    NO reverse_transfer: this Transfer is never undone.
  const { data: scoutAccount } = await svc
    .from("scout_stripe_accounts")
    .select("stripe_account_id")
    .eq("scout_id", callerId)
    .maybeSingle();

  if (scoutAccount?.stripe_account_id) {
    await stripe.transfers.create({
      amount: NOFAULT_CENTS,
      currency: "usd",
      destination: scoutAccount.stripe_account_id,
      transfer_group: checkId,
      metadata: {
        check_id: checkId,
        scout_id: callerId,
        type: "trouble_nofault",
      },
      // CRITICAL: NO source_transaction — platform-funded (D-04).
      // CRITICAL: NO reverse_transfer — this Transfer is never clawed back.
    });
  }

  // 7. Immutable event log (T-07-11 repudiation mitigation).
  await svc.rpc("log_event", {
    p_event_type: "check.trouble_reported",
    p_subject_type: "check",
    p_subject_id: checkId,
    p_context: { check_id: checkId, reason, scout_id: callerId },
  });
  await svc.rpc("log_event", {
    p_event_type: "payment.scout_nofault_paid",
    p_subject_type: "check",
    p_subject_id: checkId,
    p_context: { check_id: checkId, scout_id: callerId, amount: NOFAULT_CENTS },
  });

  return Response.json({ status: "reported" });
}

// Live entrypoint: resolve caller from their bearer token, then run core handler.
// JWT verification ENABLED at deploy (verify_jwt=true — this is user-callable).
// Service role used for all DB writes (bypasses RLS; ownership is enforced above).
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    const authed = authedClient(req);
    const { data: userData } = await authed.auth.getUser();
    const callerId = userData?.user?.id ?? null;

    let body: TroubleReportInput["body"] = {};
    try {
      body = await req.json();
    } catch (_e) {
      return new Response("bad body", { status: 400 });
    }

    try {
      const stripe = await getStripeClient();
      const svc = serviceClient();
      return await handleTroubleReport({ callerId, body }, { stripe, svc });
    } catch (e) {
      return new Response(`internal error: ${(e as Error).message}`, {
        status: 500,
      });
    }
  });
}
