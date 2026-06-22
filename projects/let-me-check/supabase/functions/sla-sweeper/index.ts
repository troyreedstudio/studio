// supabase/functions/sla-sweeper/index.ts
// LMC Phase 7 / Plan 04 — SLA sweeper Edge Function.
//
// Called every minute by pg_cron via pg_net with the service-role bearer token.
// This is the SINGLE caller of expire_stale_filming() — do NOT schedule a separate
// SQL `lmc-expire-filming` pg_cron job (that would double-run the filming sweep).
// expire_stale_dispatching() keeps its own SQL cron because its hold-release goes
// through the existing no_scout path, not this sweeper.
//
// What this function does (in order):
//   1. Calls expire_stale_filming() via svc.rpc — drives assigned/filming checks
//      past deadline_at to no_scout. The SQL function is idempotent; re-running
//      on already-swept rows is a no-op.
//   2. Queries ALL checks WHERE status='no_scout' AND payments.status='authorized'.
//      No time window — the payments.status='authorized' filter IS the idempotency:
//      once we cancel a PI, payments.status becomes 'canceled' and that row never
//      re-matches. Bounded queries would orphan holds from missed earlier runs.
//   3. For each matched payment: cancel the uncaptured PaymentIntent, set
//      payments.status='canceled', log payment.hold_released.
//      Guard: only when payment.status === 'authorized' (double-cancel safety,
//      T-07-16 — per-row check in addition to the WHERE clause).
//
// DEPLOY: --no-verify-jwt (service-to-service; reachable ONLY via pg_net with the
// service-role bearer; no public user should invoke this directly).
//
// NOFAULT note: this sweeper only cancels holds; Scout no-fault pay for SLA misses
// is NOT issued here (only trouble-report pays no-fault). The SLA miss hold-cancel
// frees the Seeker without compensating the Scout for the elapsed time — see D-04.

import { getStripeClient } from "../_shared/stripe.ts";
import { serviceClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type StripeClient = any;
// deno-lint-ignore no-explicit-any
type Svc = any;

export interface SlaSweepDeps {
  stripe: StripeClient;
  svc: Svc;
}

export interface SlaSweepResult {
  expiredCount: number;
  releasedCount: number;
  errors: string[];
}

/**
 * Core sweeper logic — decoupled from Deno.serve for offline unit testing.
 * Run as service role (bypasses RLS). Auth.uid() will be null; only no_scout
 * and authorized-payment filters constrain the rows touched.
 */
export async function runSlaSweep(deps: SlaSweepDeps): Promise<SlaSweepResult> {
  const { stripe, svc } = deps;
  const errors: string[] = [];

  // ── Step 1: drive state transitions for SLA-missed checks ─────────────────
  // expire_stale_filming() sweeps assigned/filming checks past deadline_at ->
  // no_scout (via transition_check). Service role passes the relaxed actor guard.
  // BLOCKER-3 note: this Edge fn is the SOLE caller; no separate SQL cron for filming.
  const { data: expiredCount, error: expireErr } = await svc.rpc(
    "expire_stale_filming",
  );

  if (expireErr) {
    // Log but don't abort — we still want to release orphaned holds from prior runs.
    errors.push(`expire_stale_filming error: ${expireErr.message}`);
  }

  // ── Step 2: query ALL no_scout checks with an authorized (uncaptured) hold ─
  // No time window — the filter IS the idempotency: once we cancel the PI,
  // payments.status becomes 'canceled' and this row never re-matches. Bounding
  // the query by a recent time window would orphan holds from missed sweeper runs.
  const { data: rows, error: queryErr } = await svc
    .from("payments")
    .select(`
      id,
      check_id,
      stripe_payment_intent_id,
      status,
      checks!inner(status)
    `)
    .eq("status", "authorized")
    .eq("checks.status", "no_scout");

  if (queryErr) {
    errors.push(`hold query error: ${queryErr.message}`);
    return {
      expiredCount: typeof expiredCount === "number" ? expiredCount : 0,
      releasedCount: 0,
      errors,
    };
  }

  // ── Step 3: cancel each uncaptured PaymentIntent + mark released ───────────
  let releasedCount = 0;

  for (const row of rows ?? []) {
    try {
      // Per-row guard (T-07-16: double-cancel safety — in addition to the WHERE clause).
      // This guard fires if the row was freshly matched but payment.status changed
      // between the SELECT and this point (e.g., a concurrent trouble-report).
      if (row.status !== "authorized") continue;

      const piId: string | null = row.stripe_payment_intent_id;
      if (!piId) {
        errors.push(`check ${row.check_id}: no stripe_payment_intent_id — skipping`);
        continue;
      }

      // Cancel the uncaptured PaymentIntent. NEVER use stripe-refund here —
      // refunds.create FAILS on an uncaptured (authorized) PI (Pitfall 4).
      await stripe.paymentIntents.cancel(piId);

      // Mark payment as canceled in our DB.
      const { error: updateErr } = await svc
        .from("payments")
        .update({ status: "canceled" })
        .eq("id", row.id)
        .eq("status", "authorized"); // extra idempotency guard on update

      if (updateErr) {
        errors.push(`check ${row.check_id}: payments update error: ${updateErr.message}`);
        continue;
      }

      // Immutable event log (T-07-19 repudiation mitigation + ops analytics).
      await svc.rpc("log_event", {
        p_event_type: "payment.hold_released",
        p_subject_type: "check",
        p_subject_id: row.check_id,
        p_context: {
          check_id: row.check_id,
          reason: "sla",
          stripe_payment_intent_id: piId,
        },
      });

      releasedCount++;
    } catch (err) {
      errors.push(
        `check ${row.check_id}: ${(err as Error).message}`,
      );
    }
  }

  return {
    expiredCount: typeof expiredCount === "number" ? expiredCount : 0,
    releasedCount,
    errors,
  };
}

// ── Live entrypoint ────────────────────────────────────────────────────────────
// pg_cron + pg_net invoke this every minute with the service-role bearer.
// Deployed with --no-verify-jwt because Supabase's JWT verification layer would
// reject the service-role key (it is not a user JWT). The service-role key IS
// validated by the Deno runtime when serviceClient() bootstraps the Supabase
// client — reaching this fn without a valid service-role key returns an empty
// result, not a successful sweep.
if (import.meta.main) {
  Deno.serve(async (_req: Request) => {
    try {
      const stripe = await getStripeClient();
      const svc = serviceClient();
      const result = await runSlaSweep({ stripe, svc });

      // Surface errors in the response body for cron.job_run_details visibility.
      const status = result.errors.length > 0 ? 207 : 200;
      return Response.json(result, { status });
    } catch (e) {
      return new Response(`sla-sweeper internal error: ${(e as Error).message}`, {
        status: 500,
      });
    }
  });
}
