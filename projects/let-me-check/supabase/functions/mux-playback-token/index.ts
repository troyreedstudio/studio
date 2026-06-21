// supabase/functions/mux-playback-token/index.ts
// LMC Phase 3 — mint a 1h signed Mux playback JWT ONLY for the OWNING SEEKER of a
// check (VID-04, T-03-05 information disclosure). Ownership here is the seeker_id,
// NOT the scout: a scout (or any second account) must NOT be able to watch the clip,
// so this verifies seeker_id === callerId before signing. The asset is signed-policy,
// so the stream URL is useless without this short-lived token. Returns only { token }.
import { getMuxClient, signingKeyOpts } from "../_shared/mux.ts";
import { authedClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type Mux = any;
// deno-lint-ignore no-explicit-any
type Svc = any;

/**
 * Core mint logic, decoupled from Deno.serve so it is unit-testable with an injected
 * mux client + service client (mocked offline). `callerId` is the already-resolved
 * authenticated user id; the entrypoint resolves it from the bearer token.
 */
export async function handlePlaybackToken(
  input: { checkId: string; callerId: string | null },
  deps: { mux: Mux; svc: Svc; signOpts?: unknown },
): Promise<Response> {
  const { checkId, callerId } = input;
  if (!callerId) return new Response("not authenticated", { status: 401 });
  if (!checkId) return new Response("missing checkId", { status: 400 });

  // OWNERSHIP: the buyer is the SEEKER. A non-owner (incl. the scout) -> 403.
  const { data: check } = await deps.svc
    .from("checks")
    .select("seeker_id")
    .eq("id", checkId)
    .maybeSingle();

  if (!check) return new Response("check not found", { status: 404 });
  if (check.seeker_id !== callerId) {
    return new Response("forbidden", { status: 403 });
  }

  // The clip must be ready (has a signed playback id) before a token is meaningful.
  const { data: clip } = await deps.svc
    .from("clips")
    .select("mux_playback_id, status")
    .eq("check_id", checkId)
    .maybeSingle();

  if (!clip?.mux_playback_id || clip.status !== "ready") {
    return new Response("clip not ready", { status: 409 });
  }

  // Mint a 1h signed playback JWT scoped to this playback id.
  const token = await deps.mux.jwt.signPlaybackId(
    clip.mux_playback_id,
    deps.signOpts ?? { type: "video", expiration: "1h" },
  );
  return Response.json({ token });
}

// Live entrypoint: resolve the caller from their bearer, then run the core handler.
// import.meta.main guard prevents Deno.serve from binding a port when this module
// is imported by tests (same pattern as mux-webhook, verify-clip, stripe-capture).
if (import.meta.main) Deno.serve(async (req: Request) => {
  const authed = authedClient(req);
  const { data: userData } = await authed.auth.getUser();
  const callerId = userData?.user?.id ?? null;
  let checkId = "";
  try {
    ({ checkId } = await req.json());
  } catch (_e) {
    return new Response("bad body", { status: 400 });
  }
  const mux = await getMuxClient();
  return handlePlaybackToken(
    { checkId, callerId },
    { mux, svc: authed, signOpts: signingKeyOpts() },
  );
});
