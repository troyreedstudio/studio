// supabase/functions/mux-webhook/index.ts
// LMC Phase 3 — the ONLY actor allowed to drive a check to `delivered`. Mux POSTs
// asset lifecycle events here; this function VERIFIES the Mux signature BEFORE
// trusting the body, is IDEMPOTENT on duplicates/out-of-order delivery, finalizes
// the clip row, and drives the check filming -> uploaded -> processing -> delivered
// via transition_check as the SERVICE ROLE (auth.uid() NULL -> 0010 system actor).
//
// Phase 5 (D-04/D-05, VER-01): GPS VERIFICATION GATE added between step 6 (finalize
// clip) and step 7 (delivered transition). A clip beyond the film-fence hard max (30 m)
// is auto-rejected: check re-dispatches via reset_check_for_redispatch, stripe-capture
// never fires (Seeker not charged, Scout not paid). A rejected clip NEVER becomes delivered.
//
// A dropped client network can therefore NEVER fake delivery: "ready" is a Mux fact.
// The Seeker's existing Realtime subscription flips the screen on the `delivered`
// UPDATE — no push here (Phase 7). See 03-RESEARCH.md Pattern 4 + Pitfalls 3/4.
import { verifyMuxSignature } from "../_shared/mux.ts";
import { serviceClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type Svc = any;

interface MuxEvent {
  type: string;
  data: {
    id?: string;
    upload_id?: string;  // the Mux direct-upload id that produced this asset
    passthrough?: string;
    duration?: number;
    playback_ids?: Array<{ id: string; policy: string }>;
  };
}

/**
 * Core webhook logic, decoupled from Deno.serve so it is unit-testable with an
 * injected service client + signature verifier (both mocked offline).
 */
export async function handleMuxWebhook(
  req: Request,
  deps: {
    verify: (rawBody: string, headers: Headers) => Promise<void> | void;
    svc: Svc;
  },
): Promise<Response> {
  // 1. Read the raw body (needed verbatim for signature verification).
  const rawBody = await req.text();

  // 2. VERIFY SIGNATURE before trusting anything in the body.
  try {
    await deps.verify(rawBody, req.headers);
  } catch (_e) {
    return new Response("bad signature", { status: 401 });
  }

  // 3. Parse the verified event.
  let evt: MuxEvent;
  try {
    evt = JSON.parse(rawBody) as MuxEvent;
  } catch (_e) {
    return new Response("bad body", { status: 400 });
  }

  const checkId = evt.data?.passthrough;
  const assetId = evt.data?.id;
  // upload_id ties the asset back to the specific clip row inserted by mux-upload-url
  // (mux_upload_id column). On re-dispatch a check can have multiple clip rows; using
  // mux_upload_id rather than check_id ensures we only touch the row for THIS asset.
  const uploadId = evt.data?.upload_id;
  // Pick the SIGNED playback id (the asset is created playback_policy: ['signed']).
  // deno-fmt-ignore — kept on one line so the policy === 'signed' guard is explicit.
  const playbackId = evt.data?.playback_ids?.find((p) => p.policy === 'signed')?.id;
  const duration = evt.data?.duration;

  // 4. Branch on event type — only ready/errored act; everything else is ignored.
  if (evt.type === "video.asset.errored") {
    if (checkId) {
      // Target the specific clip by upload_id when available (re-dispatch safety);
      // fall back to check_id if upload_id absent (e.g. legacy events).
      const errQuery = deps.svc.from("clips").update({ status: "errored" });
      if (uploadId) {
        await errQuery.eq("mux_upload_id", uploadId);
      } else {
        await errQuery.eq("check_id", checkId);
      }
    }
    return new Response("errored noted", { status: 200 });
  }

  if (evt.type !== "video.asset.ready") {
    return new Response("ignored", { status: 200 });
  }

  if (!checkId) {
    return new Response("missing passthrough", { status: 400 });
  }

  // 5. IDEMPOTENT: if the specific clip is already 'ready', a duplicate event is a no-op.
  // Use mux_upload_id to target the exact row (re-dispatch: multiple rows per check_id).
  // Fall back to check_id match when upload_id absent (legacy/test events).
  let existingQuery = deps.svc.from("clips").select("status");
  existingQuery = uploadId
    ? existingQuery.eq("mux_upload_id", uploadId)
    : existingQuery.eq("check_id", checkId).order("created_at", { ascending: false }).limit(1);
  const { data: existing } = await existingQuery.maybeSingle();
  if (existing?.status === "ready") {
    return new Response("ok (dup)", { status: 200 });
  }

  // 6. Finalize the clip row (service role bypasses RLS).
  // Target by mux_upload_id (the specific clip for this asset) when available;
  // fall back to check_id for legacy events. This prevents a re-dispatch scenario
  // from accidentally flipping a previously-rejected clip back to 'ready'.
  const finalizeQuery = deps.svc.from("clips").update({
    mux_asset_id: assetId,
    mux_playback_id: playbackId,
    mux_playback_policy: "signed",
    duration_secs: duration,
    status: "ready",
  });
  if (uploadId) {
    await finalizeQuery.eq("mux_upload_id", uploadId);
  } else {
    await finalizeQuery.eq("check_id", checkId);
  }

  // 6b. GPS VERIFICATION GATE (Phase 5, D-04/D-05, VER-01). MUST run BEFORE delivered:
  //     a rejected clip is re-dispatched and NEVER delivered or captured.
  //     On passed:false -> reset_check_for_redispatch (re-dispatch), return gps_rejected.
  //     On passed:true or unverifiable (missing GPS) -> fall through to deliver normally.
  //     Network/invoke error from verify-clip -> treat as unverifiable (soft-pass);
  //     consistent with "can't reject what we can't verify" policy (verify-clip design).
  let verifyResult: { data?: { passed?: boolean } | null } = {};
  try {
    verifyResult = await deps.svc.functions.invoke('verify-clip', { body: { checkId } });
  } catch (_verifyErr) {
    // verify-clip invoke failed (network, cold-start, etc.) — treat as unverifiable.
    // The clip is NOT rejected: we fall through to deliver rather than silently blocking.
    verifyResult = { data: null };
  }
  if (verifyResult?.data?.passed === false) {
    await deps.svc.rpc('reset_check_for_redispatch', { p_check_id: checkId });
    return new Response('gps_rejected', { status: 200 });
  }
  // (verify-clip pass path, unverifiable, or invoke-error pass-through -> deliver.)

  // 6c. BLUR GATE (Phase 6, D-03/D-07, BLUR-04/BLUR-05). Runs AFTER the GPS gate
  //     and BEFORE the uploaded/processing/delivered chain (step 7). The check is
  //     STILL in `filming` at this point — step 7 has not run yet — so the legal
  //     edge is filming -> blur_review (defined in migration 0014, Plan 06-01).
  //
  //     When blur_enabled=false (the launch default, D-07), face-blur-check returns
  //     action='pass' immediately (zero Vision calls, zero cost). This gate is a
  //     structural no-op at launch: it exists so that activating blur per-market
  //     (setting blur_enabled=true in market_config) immediately takes effect with
  //     no further code changes.
  //
  //     Fail-open (BLUR-05): any invoke error is caught and treated as 'pass'.
  //     Consistent with verify-clip/signage "can't reject what we can't verify"
  //     policy. Only a CONFIRMED face detection (action==='hold') holds the clip.
  let blurResult: { data?: { action?: string } | null } = {};
  try {
    blurResult = await deps.svc.functions.invoke('face-blur-check', { body: { checkId } });
  } catch (_blurErr) {
    // face-blur-check invoke failed (network, cold-start, etc.) — fail-open (BLUR-05).
    // The clip is NOT held: we fall through to deliver rather than blocking silently.
    blurResult = { data: null };
  }
  if (blurResult?.data?.action === 'hold') {
    // Legal edge: filming -> blur_review (migration 0014). transition_check enforces
    // actor-authz (0012). The Seeker is NOT charged, the Scout is NOT paid for a
    // held clip (stripe-capture never fires on this path — privacy invariant D-03/D-07).
    await deps.svc.rpc('transition_check', { p_check_id: checkId, p_to: 'blur_review' });
    return new Response('blur_held', { status: 200 });
  }
  // blur_enabled=false -> action='pass', or error fall-through -> deliver normally.

  // 7. Drive the check forward as the SERVICE ROLE (auth.uid() NULL). 0010's
  //    service-actor branch authorizes uploaded/processing/delivered.
  // deno-fmt-ignore-start — one call per line so rpc('transition_check' is greppable.
  await deps.svc.rpc('transition_check', { p_check_id: checkId, p_to: 'uploaded' });
  await deps.svc.rpc('transition_check', { p_check_id: checkId, p_to: 'processing' });
  await deps.svc.rpc('transition_check', { p_check_id: checkId, p_to: 'delivered' });
  // deno-fmt-ignore-end

  // 8. Trigger capture-on-delivery (D-03). This is fault-tolerant: a capture hiccup
  //    MUST NOT undo the delivered transition (clip already delivered; stripe-capture's
  //    D-09 branch handles capture failure by still paying the Scout). Service-role
  //    invoke so no Seeker token is ever near the capture path (T-04-12).
  try {
    await deps.svc.functions.invoke('stripe-capture', { body: { checkId } });
  } catch (_captureErr) {
    // Capture failure is logged inside stripe-capture (D-09 path). Do not surface
    // the error here — the Seeker already has their clip.
  }

  // 8b. Fraud-eval advisory (Phase 6, D-04 flag-only). Fire-and-forget AFTER delivered.
  //     A fraud flag NEVER blocks delivery at launch. fraud-eval writes fraud_flag +
  //     fraud_score to the clips row; a human reviewer acts on flagged clips.
  //     Swallows all errors — a fraud-eval failure must never undo a completed delivery.
  try { await deps.svc.functions.invoke('fraud-eval', { body: { checkId } }); } catch (_e) { /* advisory only — D-04 */ }

  // 9. Signage advisory (D-06) — fire-and-forget AFTER delivered. NEVER gates delivery.
  //    Runs only on the GPS-passed path (gps_rejected returned earlier). Only writes
  //    clips.signage_confirmed. No transition_check, no reset_check_for_redispatch.
  //    Swallows all errors — a signage failure must never affect a completed delivery.
  try { await deps.svc.functions.invoke('signage-check', { body: { checkId } }); } catch (_e) { /* advisory only */ }

  // 8c. Seeker delivery push (Phase 10, D-03/PUSH). Fire-and-forget AFTER delivered.
  //     send-push resolves the seeker server-side from checkId (IDOR-safe, T-10-15) and
  //     respects notification_prefs. A push failure NEVER undoes a completed delivery
  //     (mirrors 8b — advisory only, T-10-14).
  try { await deps.svc.functions.invoke('send-push', { body: { checkId, event: 'video-ready' } }); } catch (_e) { /* advisory only — D-03, push never blocks delivery */ }

  return new Response("ok", { status: 200 });
}

// Live entrypoint: wire the real signature verifier + service-role client.
// import.meta.main guard so `deno test --allow-env` can import this module
// without trying to bind a network port (same pattern as all Phase 4 functions).
if (import.meta.main) {
  Deno.serve((req: Request) =>
    handleMuxWebhook(req, { verify: verifyMuxSignature, svc: serviceClient() })
  );
}
