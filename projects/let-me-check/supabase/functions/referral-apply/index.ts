// supabase/functions/referral-apply/index.ts
// LMC Referral System — REF-03 attribution entry point.
//
// This function is USER-CALLABLE (verify_jwt=true at deploy).
// Given a { code } body, it:
//   1. Resolves the referrer by looking up profiles.referral_code.
//   2. Guards: valid code, no self-referral, once-only (referred_id UNIQUE).
//   3. Inserts a referrals row (status='pending', code_used snapshot).
//   4. Logs a referral.attributed event to the event_log.
//
// The credit step (qualify_referral) is NOT called here.
// It fires later when the referred user completes their first qualifying event
// (default: 'check.delivered' per referral_config.qualify_event).
// Wire it via a separate edge function or DB trigger — see qualify_referral() in 0022.
//
// Security invariants:
//   - callerId = auth.uid() from the verified bearer. NEVER from the request body.
//   - referrer is resolved by code lookup, not by a caller-supplied UUID.
//   - No self-referral: callerId == referrer_id raises 'self_referral'.
//   - Once-only: unique(referred_id) on referrals; conflict returns 'already_attributed'.
//   - The insert is via service role (no INSERT RLS on referrals from clients).
//
// Idempotency: if the caller calls this twice with the same code, the second call
// returns 'already_attributed' from the ON CONFLICT path — no duplicate row.

import { authedClient, serviceClient } from "../_shared/supabase.ts";

export interface ReferralApplyInput {
  callerId: string | null;
  code: string;
}

export interface ReferralApplyDeps {
  // deno-lint-ignore no-explicit-any
  svc: any;
}

/** Structured error response */
function errorResponse(code: string, status = 400): Response {
  return Response.json({ error: code }, { status });
}

/**
 * Core handler — decoupled from Deno.serve for unit tests.
 */
export async function handleReferralApply(
  input: ReferralApplyInput,
  deps: ReferralApplyDeps,
): Promise<Response> {
  const { callerId, code } = input;
  const { svc } = deps;

  // 1. Auth gate.
  if (!callerId) {
    return errorResponse("not_authenticated", 401);
  }

  // 2. Validate code is non-empty (trimmed + uppercased by client, defensive here).
  const trimmedCode = (code ?? "").trim().toUpperCase();
  if (!trimmedCode) {
    return errorResponse("invalid_code");
  }

  // 3. Resolve the referrer by code — if no profile matches, the code is invalid.
  const { data: referrerProfile, error: lookupErr } = await svc
    .from("profiles")
    .select("id")
    .eq("referral_code", trimmedCode)
    .maybeSingle();

  if (lookupErr) {
    console.error("referral-apply: referrer lookup error", lookupErr);
    return errorResponse("internal_error", 500);
  }

  if (!referrerProfile) {
    return errorResponse("invalid_code");
  }

  const referrerId: string = referrerProfile.id;

  // 4. No self-referral guard.
  if (referrerId === callerId) {
    return errorResponse("self_referral");
  }

  // 5. Insert the attribution row (service role bypasses RLS INSERT restriction).
  // ON CONFLICT(referred_id) means a second call for the same referred user is
  // a no-op at the DB level; we detect it via the affected row count below.
  const { error: insertErr, count } = await svc
    .from("referrals")
    .insert({
      referrer_id: referrerId,
      referred_id: callerId,
      code_used: trimmedCode,
      status: "pending",
    }, { count: "exact" });

  if (insertErr) {
    // Postgres unique violation on referred_id (code 23505).
    if (
      insertErr.code === "23505" ||
      (insertErr.message ?? "").includes("duplicate") ||
      (insertErr.message ?? "").includes("unique")
    ) {
      return errorResponse("already_attributed");
    }
    console.error("referral-apply: insert error", insertErr);
    return errorResponse("internal_error", 500);
  }

  // Defensive: if count is 0 (e.g. RLS rejected the insert despite service role),
  // treat as already_attributed rather than silently succeeding.
  if (count === 0) {
    return errorResponse("already_attributed");
  }

  // 6. Log the attribution event to the immutable event log.
  await svc.rpc("log_event", {
    p_event_type: "referral.attributed",
    p_subject_type: "profile",
    p_subject_id: callerId,
    p_context: {
      referrer_id: referrerId,
      code_used: trimmedCode,
    },
  });

  return Response.json({ result: "ok" });
}

// Live entrypoint. verify_jwt=true at deploy.
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    // Resolve caller from verified bearer (verify_jwt ensures the token is valid).
    const authed = authedClient(req);
    const { data: userData } = await authed.auth.getUser();
    const callerId = userData?.user?.id ?? null;

    let body: { code?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }

    const code = (body?.code ?? "").trim().toUpperCase();

    try {
      const svc = serviceClient();
      return await handleReferralApply({ callerId, code }, { svc });
    } catch (e) {
      console.error("referral-apply: unhandled error", e);
      return Response.json(
        { error: `internal_error: ${(e as Error).message}` },
        { status: 500 },
      );
    }
  });
}
