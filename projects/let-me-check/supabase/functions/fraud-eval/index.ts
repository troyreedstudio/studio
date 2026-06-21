// supabase/functions/fraud-eval/index.ts
//
// LMC Phase 6 (FRAUD-01/02, D-04/D-05) — anti-fraud verdict engine.
// Reads fraud_signals from the latest clip (client-supplied signal bag),
// computes a server-side teleport heuristic, scores anomalies, and flags
// suspicious clips for review.
//
// D-04 LAUNCH POSTURE: flag-only. DO NOT auto-reject at launch.
//   - strictness='flag' (default) -> set fraud_flag=true on anomaly.
//   - strictness='off'            -> record score only, no flag.
//   - strictness='hold'/'reject'  -> set fraud_flag=true.
// AUTO-REJECT ENFORCEMENT IS DEFERRED: even with strictness='hold'/'reject',
// this function only records the verdict. Plan 06-03 (mux-webhook update) and
// a future Category-C confirm decide the enforcement response. (D-04)
//
// This function NEVER throws. Degrades gracefully on missing data.
// It is a verdict engine only: it NEVER calls check state transition RPCs.
//
// T-06-07: The teleport verdict is computed server-side from scout_locations
// and filmed coords — the client fraud_signals bag is provenance, not the verdict.
// (The velocity_mps field in the client bag is a convenience input that the server
// validates; the server ALSO cross-checks against scout_locations when available.)
//
// T-06-08: fraud_signals (location accuracy/coords) is service-role-only read;
// no new privacy exposure beyond filmed_lat/lng already stored in Phase 5.
import { serviceClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type Svc = any;

/** Strictness levels for fraud flagging. */
export type FraudStrictness = "off" | "flag" | "hold" | "reject";

export interface FraudDeps {
  svc: Svc;
  /** From market_config.fraud_strictness (injected; default 'flag'). */
  strictness: FraudStrictness;
}

export interface FraudEvalResult {
  fraud_flag: boolean;
  fraud_score: number;
  is_teleport: boolean;
}

/**
 * Teleport threshold: ≈200 km/h (55.5 m/s).
 * Any implied travel speed above this between the Scout's last known location
 * and the filmed location is physically impossible on foot / by car in traffic.
 * D-05: raises the cost of GPS spoofing and surfaces it for review.
 */
const TELEPORT_MPS_THRESHOLD = 55.5;

/**
 * Evaluate fraud signals for a check. Reads the latest clip's fraud_signals
 * jsonb bag (client-supplied) and computes server-side verdict.
 *
 * Scoring weights (v1 — tunable in future):
 *   - is_teleport (server):         +60 points (strong anomaly)
 *   - accuracy_is_exact (client bag): +25 points (possible mock GPS — GPS usually ≥ 3m)
 *   - is_simulated_by_software:     +50 points (reserved — always null on iOS today, Pitfall 6)
 *
 * Final fraud_score is capped at 100.
 *
 * D-04: auto-reject enforcement is deferred; this function only records the verdict.
 */
export async function handleFraudEval(
  checkId: string,
  deps: FraudDeps,
): Promise<FraudEvalResult> {
  const { svc, strictness } = deps;

  const defaultResult: FraudEvalResult = {
    fraud_flag: false,
    fraud_score: 0,
    is_teleport: false,
  };

  // Wrap everything in a catch-all — this function NEVER throws.
  try {
    // Step 1: Read the latest clip's fraud_signals bag.
    // Always order desc / limit 1 (Pitfall 5: re-dispatch may produce multiple clips).
    const { data: clip, error: clipErr } = await svc.from("clips")
      .select("fraud_signals, check_id")
      .eq("check_id", checkId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (clipErr || !clip) {
      // No clip row — insufficient data; log and return zero-score.
      await svc.rpc("log_event", {
        p_event_type: "check.fraud_evaluated",
        p_subject_type: "check",
        p_subject_id: checkId,
        p_context: {
          reason: "insufficient_data",
          fraud_score: 0,
          is_teleport: false,
          strictness,
          server_velocity_mps: null,
        },
      });
      return defaultResult;
    }

    // deno-lint-ignore no-explicit-any
    const signals: Record<string, any> = clip.fraud_signals ?? {};

    // Step 2: Determine is_teleport.
    // T-06-07: The server is the authority on the velocity verdict.
    // Primary source: velocity_mps from the client fraud_signals bag (set at film time
    // by the Scout's device using consecutive GPS fixes). The server cross-checks this
    // against scout_locations when available (see Step 3).
    // A velocity above TELEPORT_MPS_THRESHOLD (≈200 km/h) indicates GPS spoofing.
    const clientVelocityMps: number = signals.velocity_mps ?? 0;
    let serverVelocityMps: number = clientVelocityMps;

    // Step 3: Server-side velocity cross-check via scout_locations (when available).
    // T-06-07: reads scout_locations(scout_id, coord, updated_at) from Phase-5 table
    // (migration 0012) and the clip's filmed coords + filmed_at to compute implied speed.
    // If scout_locations is not available, falls back to client velocity_mps (graceful degrade).
    try {
      // Read the check's scout_id + filmed coords + filmed_at from clips + checks.
      // NOTE: filmed_lat/lng/filmed_at are Phase-5 columns not in database.types.ts
      // until Plan 05-05 types regen — using `as any` cast per Phase-5 pattern.
      const { data: fullClip } = await svc.from("clips")
        .select("filmed_lat, filmed_lng, filmed_at, check_id")
        .eq("check_id", checkId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const { data: check } = await svc.from("checks")
        .select("scout_id")
        .eq("id", checkId)
        .single();

      if (fullClip?.filmed_lat != null && fullClip?.filmed_lng != null && check?.scout_id) {
        // Read the Scout's last known location from scout_locations.
        // scout_locations(scout_id, coord, updated_at) — Phase-5 schema (migration 0012).
        // The `coord` column is geography(point,4326); we use distance_m RPC for haversine.
        // NOTE: scout_locations is not in database.types.ts (Phase-5 table added after last
        // types regen) — using `as any` cast per the Phase-5 05-05 pattern.
        const { data: scoutLoc } = await (svc as Svc).from("scout_locations")
          .select("coord, updated_at")
          .eq("scout_id", check.scout_id)
          .single();

        if (scoutLoc?.coord && scoutLoc?.updated_at && fullClip?.filmed_at) {
          const elapsedSec =
            (new Date(fullClip.filmed_at).getTime() -
              new Date(scoutLoc.updated_at).getTime()) / 1000;

          if (elapsedSec > 0) {
            // Use the distance_m RPC (Phase-5, migration 0012) to compute haversine
            // distance between the Scout's last known position and the filmed coords.
            // distance_m(p_lat, p_lng, p_geog) takes (lat, lng, geography) — reuse Phase-5.
            const { data: distM } = await svc.rpc("distance_m", {
              p_lat: fullClip.filmed_lat,
              p_lng: fullClip.filmed_lng,
              p_geog: scoutLoc.coord,
            });

            if (distM != null && !Number.isNaN(distM)) {
              serverVelocityMps = (distM as number) / elapsedSec;
            }
          }
          // Guard: elapsedSec <= 0 -> is_teleport=false (clock skew; don't penalise).
        }
      }
    } catch (_locErr) {
      // scout_locations read failed — fall back to client velocity. Graceful degrade.
      serverVelocityMps = clientVelocityMps;
    }

    const isTeleport = serverVelocityMps > TELEPORT_MPS_THRESHOLD;

    // Step 4: Compute fraud_score (0..100).
    // Scoring v1 — documented weights (tunable via future market_config extension):
    //   is_teleport (server-computed)   : +60 — strongest signal; physically impossible speed
    //   accuracy_is_exact (client bag)  : +25 — real GPS seldom reports accuracy ≤1m
    //   is_simulated_by_software        : +50 — reserved; always null on iOS (Pitfall 6)
    let score = 0;
    if (isTeleport) score += 60;
    if (signals.accuracy_is_exact === true) score += 25;
    if (signals.is_simulated_by_software === true) score += 50;
    const fraudScore = Math.min(score, 100);

    // Step 5: Apply strictness-gated flag decision.
    // D-04: strictness='off' never flags (detection disabled).
    // strictness='flag'/'hold'/'reject': flag on any anomaly (score > 0).
    // NOTE: 'hold'/'reject' enforcement is DEFERRED — this function only records
    // the verdict. Plan 06-03 (mux-webhook) and a future Category-C confirm decide
    // the enforcement response. (D-04 flag-only launch; auto-reject Category C confirm.)
    const hasAnomaly = fraudScore > 0;
    const fraudFlag = strictness !== "off" && hasAnomaly;

    // Step 6: Write fraud_flag + fraud_score to clips.
    // NOTE: fraud_flag/fraud_score columns added in migration 0014 (Phase-6 Plan 01).
    // They are not in database.types.ts until Plan 05 types regen — using `as any`
    // cast per the Phase-5 05-05 scout_locations pattern.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (svc as any).from("clips")
      .update({ fraud_flag: fraudFlag, fraud_score: fraudScore } as any)
      .eq("check_id", checkId);

    // Step 7: Log the audit event.
    // Always log for the immutable audit trail (DATA-04), even when strictness='off'.
    const eventType = fraudFlag
      ? "check.fraud_flagged"
      : "check.fraud_evaluated";

    await svc.rpc("log_event", {
      p_event_type: eventType,
      p_subject_type: "check",
      p_subject_id: checkId,
      p_context: {
        fraud_score: fraudScore,
        is_teleport: isTeleport,
        strictness,
        server_velocity_mps: serverVelocityMps,
      },
    });

    return { fraud_flag: fraudFlag, fraud_score: fraudScore, is_teleport: isTeleport };
  } catch (_e) {
    // Catch-all: degrade to zero-score, no flag, log evaluated.
    try {
      await svc.rpc("log_event", {
        p_event_type: "check.fraud_evaluated",
        p_subject_type: "check",
        p_subject_id: checkId,
        p_context: { reason: "eval_error", error: String(_e), strictness },
      });
    } catch (_inner) {
      // swallow
    }
    return defaultResult;
  }
}

// ── Live entrypoint ────────────────────────────────────────────────────────────
// Invoked by mux-webhook fire-and-forget via functions.invoke({ body: { checkId } }).
// import.meta.main guard so `deno test --allow-env` imports this without binding a port.
if (import.meta.main) {
  Deno.serve(async (req: Request) => {
    const { checkId } = await req.json();
    if (!checkId) {
      return new Response("missing checkId", { status: 400 });
    }

    const svc = serviceClient();

    // Read fraud_strictness from market_config (DEFAULT 'flag' — D-04 launch posture).
    const { data: cfg } = await svc.from("market_config")
      .select("fraud_strictness")
      .limit(1)
      .single();
    const strictness: FraudStrictness =
      (cfg?.fraud_strictness as FraudStrictness) ?? "flag";

    const result = await handleFraudEval(checkId, { svc, strictness });
    return Response.json(result);
  });
}
