// supabase/functions/mux-upload-url/index.ts
// LMC Phase 3 — mint a single-use Mux DIRECT-UPLOAD URL for the ASSIGNED SCOUT on a
// check. The client never holds a Mux secret; it receives only { uploadUrl, uploadId }.
// Self-authorizes (the caller is untrusted re: which check they film): only the
// assigned scout, only while the check is assigned/filming, may mint. A non-assigned
// caller -> 403 (T-03-06 elevation). The upload is created playback_policy: ['signed']
// + passthrough=checkId so the webhook can correlate by check regardless of order.
import { getMuxClient } from "../_shared/mux.ts";
import { authedClient, serviceClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type Mux = any;
// deno-lint-ignore no-explicit-any
type Svc = any;

/**
 * Core mint logic, decoupled from Deno.serve so it is unit-testable with an injected
 * mux client + service client (mocked offline). `callerId` is the already-resolved
 * authenticated user id; the entrypoint resolves it from the bearer token.
 */
export async function handleUploadUrl(
  input: { checkId: string; callerId: string | null },
  deps: { mux: Mux; svc: Svc },
): Promise<Response> {
  const { checkId, callerId } = input;
  if (!callerId) return new Response("not authenticated", { status: 401 });
  if (!checkId) return new Response("missing checkId", { status: 400 });

  // Confirm the caller is the assigned scout on this check (ownership BEFORE Mux).
  const { data: check } = await deps.svc
    .from("checks")
    .select("scout_id, status")
    .eq("id", checkId)
    .maybeSingle();

  if (!check) return new Response("check not found", { status: 404 });
  if (
    check.scout_id !== callerId ||
    !["assigned", "filming"].includes(check.status)
  ) {
    return new Response("forbidden", { status: 403 });
  }

  // Mint the Mux upload: SIGNED playback policy + passthrough=checkId (webhook key).
  const upload = await deps.mux.video.uploads.create({
    cors_origin: "*",
    new_asset_settings: {
      playback_policy: ["signed"],
      passthrough: checkId,
    },
  });

  // Record the upload id on the clip row -> 'pending' so the webhook can find it.
  await deps.svc
    .from("clips")
    .update({ mux_upload_id: upload.id, status: 'pending' })
    .eq("check_id", checkId);

  return Response.json({ uploadUrl: upload.url, uploadId: upload.id });
}

// Live entrypoint: resolve the caller from their bearer, then run the core handler.
Deno.serve(async (req: Request) => {
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
  return handleUploadUrl({ checkId, callerId }, { mux, svc: serviceClient() });
});
