// supabase/functions/stripe-webhook/index.ts
// LMC Phase 4 — Payments: signature-verified handler for all Stripe events.
// Mirrors mux-webhook/index.ts EXACTLY in structure:
//   1. Read raw body via req.text()
//   2. Verify signature BEFORE JSON.parse (Pitfall 3 — never parse before verify)
//   3. Parse the verified event
//   4. Branch on evt.type; unknown events return 200 'ignored'
//   5. Idempotent on Stripe event id
//
// Key decisions:
//   - D-08: disputes NEVER reverse the Scout's Transfer (no reverse_transfer anywhere)
//   - PAY-02: payment_intent.canceled -> hold released -> payments.status='canceled'
//   - SCOUT-01: account.updated drives scout_stripe_accounts (charges_enabled/payouts_enabled)
//   - T-04-11: raw-body-first verify (grep-assertable ordering)
//   - T-04-15: idempotency on evt.id
//   - T-04-14: every handled event writes a log_event row

import { verifyStripeSignature } from "../_shared/stripe.ts";
import { serviceClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type Svc = any;

// deno-lint-ignore no-explicit-any
type StripeEvent = Record<string, any>;

/**
 * Core webhook logic, decoupled from Deno.serve for offline unit testing.
 * deps.verify is the injected signature verifier (real or stub).
 * deps.svc is the injected Supabase service-role client.
 */
export async function handleStripeWebhook(
  req: Request,
  deps: {
    verify: (rawBody: string, headers: Headers) => Promise<void> | void;
    svc: Svc;
  },
): Promise<Response> {
  // 1. Read the raw body FIRST (needed verbatim for HMAC verification — Pitfall 3).
  const rawBody = await req.text();

  // 2. VERIFY SIGNATURE before trusting ANYTHING in the body (T-04-11).
  try {
    await deps.verify(rawBody, req.headers);
  } catch (_e) {
    return new Response("bad signature", { status: 401 });
  }

  // 3. Parse the verified event (safe to JSON.parse only after verification).
  let evt: StripeEvent;
  try {
    evt = JSON.parse(rawBody) as StripeEvent;
  } catch (_e) {
    return new Response("bad body", { status: 400 });
  }

  const eventId: string = evt.id ?? "";
  const eventType: string = evt.type ?? "";

  // 4. Idempotency: if this event id was already processed, short-circuit (T-04-15).
  // Query event_log for an existing row with this stripe_event_id in context.
  const { data: existingLog } = await deps.svc
    .from("event_log")
    .select("id")
    .eq("context->>'stripe_event_id'", eventId)
    .maybeSingle();
  if (existingLog) {
    return new Response("ok (dup)", { status: 200 });
  }

  // 5. Branch on event type.
  const svc = deps.svc;

  if (eventType === "charge.dispute.created" || eventType === "charge.dispute.closed") {
    // D-08: platform absorbs. Log the dispute. Do NOT reverse the Scout's Transfer.
    // Lookup the check_id via the charge id so we can reference it in the log.
    const chargeId: string = evt.data?.object?.charge ?? evt.data?.object?.id ?? "";
    const { data: payment } = await svc
      .from("payments")
      .select("check_id")
      .eq("stripe_charge_id", chargeId)
      .maybeSingle();

    const checkId: string | null = payment?.check_id ?? null;
    const disputeEventType =
      eventType === "charge.dispute.created"
        ? "payment.dispute_created"
        : "payment.dispute_closed";

    await svc.rpc("log_event", {
      p_event_type: disputeEventType,
      p_context: {
        stripe_event_id: eventId,
        dispute_id: evt.data?.object?.id ?? "",
        charge_id: chargeId,
        check_id: checkId,
        // D-08: platform absorbs; Scout Transfer is never reversed
        platform_absorbs: true,
      },
    });
    return new Response("ok", { status: 200 });
  }

  if (eventType === "account.updated") {
    // SCOUT-01 + Pitfall 5: sync charges_enabled/payouts_enabled from Connect account.
    const account = evt.data?.object ?? {};
    const stripeAccountId: string = account.id ?? "";
    const chargesEnabled: boolean = account.charges_enabled === true;
    const payoutsEnabled: boolean = account.payouts_enabled === true;

    // Upsert scout_stripe_accounts keyed on stripe_account_id.
    await svc
      .from("scout_stripe_accounts")
      .upsert({
        stripe_account_id: stripeAccountId,
        charges_enabled: chargesEnabled,
        payouts_enabled: payoutsEnabled,
      });

    await svc.rpc("log_event", {
      p_event_type: "scout.connect_updated",
      p_context: {
        stripe_event_id: eventId,
        stripe_account_id: stripeAccountId,
        charges_enabled: chargesEnabled,
        payouts_enabled: payoutsEnabled,
      },
    });
    return new Response("ok", { status: 200 });
  }

  if (eventType === "payment_intent.canceled") {
    // PAY-02: hold released (no Scout / expired / cancelled check).
    const pi = evt.data?.object ?? {};
    const piId: string = pi.id ?? "";
    const checkId: string = pi.metadata?.check_id ?? "";

    // Mark payment row as canceled.
    if (checkId) {
      await svc
        .from("payments")
        .update({ status: "canceled" })
        .eq("check_id", checkId);
    } else {
      // Fallback: lookup by PI id if check_id not in metadata.
      await svc
        .from("payments")
        .update({ status: "canceled" })
        .eq("stripe_payment_intent_id", piId);
    }

    await svc.rpc("log_event", {
      p_event_type: "payment.hold_released",
      p_context: {
        stripe_event_id: eventId,
        payment_intent_id: piId,
        check_id: checkId,
      },
    });
    return new Response("ok", { status: 200 });
  }

  if (eventType === "payment_intent.payment_failed") {
    // D-02 server-side record: auth failed (declined / expired card).
    const pi = evt.data?.object ?? {};
    const piId: string = pi.id ?? "";
    const checkId: string = pi.metadata?.check_id ?? "";

    await svc.rpc("log_event", {
      p_event_type: "payment.auth_failed",
      p_context: {
        stripe_event_id: eventId,
        payment_intent_id: piId,
        check_id: checkId,
        failure_code: pi.last_payment_error?.code ?? null,
        failure_message: pi.last_payment_error?.message ?? null,
      },
    });
    return new Response("ok", { status: 200 });
  }

  if (eventType === "payout.paid" || eventType === "payout.failed") {
    // Scout payout settled or failed — log for Scout ledger reconciliation.
    const payout = evt.data?.object ?? {};
    const payoutId: string = payout.id ?? "";
    const logType =
      eventType === "payout.paid" ? "scout.payout_paid" : "scout.payout_failed";

    await svc.rpc("log_event", {
      p_event_type: logType,
      p_context: {
        stripe_event_id: eventId,
        payout_id: payoutId,
        amount: payout.amount ?? 0,
        currency: payout.currency ?? "",
        failure_code: payout.failure_code ?? null,
      },
    });
    return new Response("ok", { status: 200 });
  }

  // Default: unhandled event — return 200 'ignored' (mirrors mux-webhook pattern).
  return new Response("ignored", { status: 200 });
}

// Live entrypoint: wire the real signature verifier + service-role Supabase client.
// import.meta.main guard prevents Deno.serve from running during `deno test`
// (same pattern as stripe-create-payment-intent/index.ts — no --allow-net needed for tests).
if (import.meta.main) {
  Deno.serve((req: Request) =>
    handleStripeWebhook(req, {
      verify: verifyStripeSignature,
      svc: serviceClient(),
    })
  );
}
