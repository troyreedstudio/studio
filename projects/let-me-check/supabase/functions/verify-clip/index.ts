// supabase/functions/verify-clip/index.ts
// LMC Phase 5 (D-04/D-05, VER-01) — service-role GPS fence check invoked by mux-webhook
// BEFORE the `delivered` transition. A clip within film_fence_max_m passes; a clip beyond
// the hard 30 m cap is auto-rejected. Missing/NaN GPS is logged as unverifiable and passes
// (can't reject what we can't verify — honest-Scout-friendly; signage advisory runs separately
// in Plan 04 and is never a gate here).
//
// This function does NOT itself call reset_check_for_redispatch or transition to delivered.
// mux-webhook orchestrates those based on the { passed } return value so the gate sits
// exactly between clip-finalize (step 6) and the delivered transition (step 7).
//
// Only ever invoked server-to-server (mux-webhook service role -> functions.invoke).
// No --no-verify-jwt flag needed; Supabase service-role invokes bypass the JWT gate.
import { serviceClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type Svc = any;

/**
 * GPS fence check for a single check. Reads the LATEST clip for the check (Pitfall 5 —
 * multiple clips possible after re-dispatch), compares the filmed GPS against the venue/check
 * coord via the server-side distance_m() RPC (NaN guard, ST_MakePoint(lng,lat) internally),
 * and uses the tunable film_fence_max_m from market_config (hard max 30 m per D-04).
 *
 * Returns { passed, distance_m } for mux-webhook to act on:
 *   passed: true  -> proceed to delivered + stripe-capture (unchanged)
 *   passed: false -> mux-webhook calls reset_check_for_redispatch + returns gps_rejected
 */
export async function handleVerifyClip(
  checkId: string,
  deps: { svc: Svc },
): Promise<{ passed: boolean; distance_m: number | null }> {
  const svc = deps.svc;

  // Step 1: Read the LATEST clip for this check (Pitfall 5: always verify the most recent one).
  const { data: clip, error: clipErr } = await svc.from("clips")
    .select("filmed_lat, filmed_lng, filmed_accuracy_m")
    .eq("check_id", checkId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (clipErr) {
    // No clip row yet — treat as unverifiable, log, and pass through.
    await svc.rpc("log_event", {
      p_event_type: "check.gps_unverifiable",
      p_subject_type: "check",
      p_subject_id: checkId,
      p_context: { reason: "no_gps_data", detail: "clip row not found" },
    });
    return { passed: true, distance_m: null };
  }

  // Step 2: Read the check's venue/requested coord (used as the film-fence centre).
  const { data: check } = await svc.from("checks")
    .select("coord")
    .eq("id", checkId)
    .single();

  // Step 3: Guard — if filmed GPS is missing or the check has no coord, log as unverifiable.
  // Policy: "can't reject what we can't verify" — honest-Scout-friendly; missing GPS is
  // NEVER silently treated as on-site verified (gps_verified stays null, not true).
  const hasGps =
    clip?.filmed_lat != null &&
    clip?.filmed_lng != null &&
    !Number.isNaN(clip.filmed_lat) &&
    !Number.isNaN(clip.filmed_lng);

  if (!hasGps || !check?.coord) {
    await svc.rpc("log_event", {
      p_event_type: "check.gps_unverifiable",
      p_subject_type: "check",
      p_subject_id: checkId,
      p_context: {
        reason: "no_gps_data",
        has_filmed_lat: clip?.filmed_lat != null,
        has_filmed_lng: clip?.filmed_lng != null,
        has_check_coord: check?.coord != null,
      },
    });
    // Do NOT update gps_verified — leave it null to signal "unverified, not confirmed".
    return { passed: true, distance_m: null };
  }

  // Step 4: Read film_fence_max_m from market_config (tunable; hard max 30 m per D-04).
  const { data: cfg } = await svc.from("market_config")
    .select("film_fence_max_m")
    .limit(1)
    .single();
  // Default to 30 m if market_config row is missing (shouldn't happen post-0012).
  const maxFence: number = cfg?.film_fence_max_m ?? 30;

  // Step 5: Compute server-side distance using distance_m() RPC.
  // distance_m(p_lat, p_lng, p_geog) handles ST_MakePoint(lng, lat) internally — NaN-guarded.
  const { data: dist } = await svc.rpc("distance_m", {
    p_lat: clip.filmed_lat,
    p_lng: clip.filmed_lng,
    p_geog: check.coord,
  });

  // Step 6: Apply the hard fence. <= maxFence passes; > maxFence is rejected.
  const passed = (dist as number) <= maxFence;

  // Step 7: Stamp the clip with the GPS verdict (true/false; NOT true on missing GPS).
  await svc.from("clips")
    .update({ gps_verified: passed })
    .eq("check_id", checkId);

  // Step 8: Log the GPS verdict for the immutable audit trail (T-05-16, DATA-04).
  await svc.rpc("log_event", {
    p_event_type: passed ? "check.gps_verified" : "check.gps_rejected",
    p_subject_type: "check",
    p_subject_id: checkId,
    p_context: {
      distance_m: dist,
      film_fence_max_m: maxFence,
      filmed_accuracy_m: clip.filmed_accuracy_m ?? null,
    },
  });

  // Step 9: Return the verdict. mux-webhook acts on passed:false by calling
  // reset_check_for_redispatch and returning 'gps_rejected' without delivering.
  return { passed, distance_m: dist as number };
}

// Live entrypoint: invoked server-to-server by mux-webhook via functions.invoke.
// import.meta.main guard so `deno test --allow-env` imports this module without
// trying to bind a network port (same pattern as mux-webhook, stripe-capture, etc.).
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    const { checkId } = await req.json();
    if (!checkId) {
      return new Response("missing checkId", { status: 400 });
    }
    const result = await handleVerifyClip(checkId, { svc: serviceClient() });
    return Response.json(result);
  });
}
