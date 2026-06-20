// supabase/functions/mux-webhook/index.ts
// LMC Phase 3 — the ONLY actor allowed to drive a check to `delivered`. Mux POSTs
// asset lifecycle events here; this function VERIFIES the Mux signature BEFORE
// trusting the body, is IDEMPOTENT on duplicates/out-of-order delivery, finalizes
// the clip row, and drives the check filming -> uploaded -> processing -> delivered
// via transition_check as the SERVICE ROLE (auth.uid() NULL -> 0010 system actor).
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
  // Pick the SIGNED playback id (the asset is created playback_policy: ['signed']).
  // deno-fmt-ignore — kept on one line so the policy === 'signed' guard is explicit.
  const playbackId = evt.data?.playback_ids?.find((p) => p.policy === 'signed')?.id;
  const duration = evt.data?.duration;

  // 4. Branch on event type — only ready/errored act; everything else is ignored.
  if (evt.type === "video.asset.errored") {
    if (checkId) {
      await deps.svc.from("clips").update({ status: "errored" }).eq(
        "check_id",
        checkId,
      );
    }
    return new Response("errored noted", { status: 200 });
  }

  if (evt.type !== "video.asset.ready") {
    return new Response("ignored", { status: 200 });
  }

  if (!checkId) {
    return new Response("missing passthrough", { status: 400 });
  }

  // 5. IDEMPOTENT: if this clip is already 'ready', a duplicate event is a no-op.
  const { data: existing } = await deps.svc.from("clips").select("status").eq(
    "check_id",
    checkId,
  ).maybeSingle();
  if (existing?.status === "ready") {
    return new Response("ok (dup)", { status: 200 });
  }

  // 6. Finalize the clip row (service role bypasses RLS).
  await deps.svc.from("clips").update({
    mux_asset_id: assetId,
    mux_playback_id: playbackId,
    mux_playback_policy: "signed",
    duration_secs: duration,
    status: "ready",
  }).eq("check_id", checkId);

  // 7. Drive the check forward as the SERVICE ROLE (auth.uid() NULL). 0010's
  //    service-actor branch authorizes uploaded/processing/delivered.
  // deno-fmt-ignore-start — one call per line so rpc('transition_check' is greppable.
  await deps.svc.rpc('transition_check', { p_check_id: checkId, p_to: 'uploaded' });
  await deps.svc.rpc('transition_check', { p_check_id: checkId, p_to: 'processing' });
  await deps.svc.rpc('transition_check', { p_check_id: checkId, p_to: 'delivered' });
  // deno-fmt-ignore-end

  return new Response("ok", { status: 200 });
}

// Live entrypoint: wire the real signature verifier + service-role client.
Deno.serve((req: Request) =>
  handleMuxWebhook(req, { verify: verifyMuxSignature, svc: serviceClient() })
);
