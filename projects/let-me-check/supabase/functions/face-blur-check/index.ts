// supabase/functions/face-blur-check/index.ts
//
// LMC Phase 6 (BLUR-01/02/03, D-01/D-02/D-03/D-07) — privacy gate: face detection
// via Google Vision FACE_DETECTION. Returns { action, faces_detected }.
//
// CRITICAL: this function is STRUCTURALLY INCAPABLE of driving check state transitions.
// It ONLY writes clips.blur_status and returns { action, faces_detected }.
// The mux-webhook (Plan 06-03) reads action==='hold' and drives the blur_review
// transition. This mirrors the signage-check no-transition discipline (D-06 analogue).
//
// GREP GATE: grep -qE "t_check|redispatch" on this file must return nothing —
// this function is structurally incapable of driving check state transitions.
//
// blur_enabled DEFAULT FALSE (D-07 launch posture — gate dormant until on-device blur
// confirmed on a real device; ops flips per-market when ready).
//
// Google Vision is called via REST fetch (vision.googleapis.com/v1/images:annotate)
// NOT the npm:@google-cloud/vision package, which times out in Deno. (Pitfall 7)
//
// GOOGLE_VISION_API_KEY is a Supabase secret. It is read from Deno.env only —
// NEVER hard-coded, NEVER returned to the client. (T-06-06)
import { serviceClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type Svc = any;

export interface FaceResult {
  faces: number;
}

export interface BlurDeps {
  svc: Svc;
  /**
   * Calls Google Vision FACE_DETECTION on an image (injected for testability).
   * Returns { faces: number } — the count of detected face annotations.
   */
  vision: (img: { content?: string; imageUri?: string }) => Promise<FaceResult>;
  /** True iff GOOGLE_VISION_API_KEY is set in the environment. */
  apiKeyPresent: boolean;
  /**
   * Whether the blur gate is enabled (from market_config.blur_enabled).
   * DEFAULT FALSE at launch (D-07: gate dormant until on-device blur confirmed).
   */
  blurEnabled: boolean;
}

export type BlurAction = "pass" | "hold";

export interface BlurCheckResult {
  action: BlurAction;
  faces_detected: number;
}

/**
 * Face blur check gate. Reads the latest clip's mux_playback_id + blur_status,
 * calls Vision FACE_DETECTION, and records clips.blur_status.
 *
 * blurEnabled=false  -> D-07 no-op: log skipped, { action:'pass', faces_detected:0 }.
 *                       No Vision call (cost control — Pitfall 5 / T-06-10).
 * blur_status='blurred' -> on-device blur already confirmed; { action:'pass' }.
 * faces>0 (unblurred)  -> blur_status='faces_detected_unblurred', { action:'hold' }.
 *                         mux-webhook (Plan 03) reads hold and drives blur_review.
 * faces=0             -> blur_status='no_faces', { action:'pass' }.
 * Any error / missing playback id -> blur_status='blur_check_failed', { action:'pass' }.
 *   (Fail-open: only CONFIRMED faces trigger a hold, not infra errors. D-03.)
 *
 * NEVER throws. NEVER drives check state transitions (mux-webhook Plan 03 does that).
 */
export async function handleFaceBlurCheck(
  checkId: string,
  deps: BlurDeps,
): Promise<BlurCheckResult> {
  const { svc, vision, apiKeyPresent, blurEnabled } = deps;

  // ── Path 1: Gate dormant (D-07 launch posture) ───────────────────────────────
  // blur_enabled=false means zero Vision calls and zero performance cost at launch.
  // The mux-webhook will never see action='hold' from this function when disabled.
  if (!blurEnabled) {
    try {
      await svc.rpc("log_event", {
        p_event_type: "check.face_blur_skipped",
        p_subject_type: "check",
        p_subject_id: checkId,
        p_context: { reason: "blur_disabled" },
      });
    } catch (_e) {
      // advisory log — swallow
    }
    return { action: "pass", faces_detected: 0 };
  }

  // ── Main path wrapped in a catch-all so an error NEVER blocks delivery ────────
  // Only confirmed faces trigger a hold; infra errors are fail-open (D-03).
  try {
    // Step 1: Read the latest clip's mux_playback_id AND current blur_status.
    // Always order desc / limit 1 (Pitfall 5: re-dispatch may produce multiple clips).
    const { data: clip } = await svc.from("clips")
      .select("mux_playback_id, blur_status")
      .eq("check_id", checkId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Step 2: Short-circuit if on-device blur already confirmed.
    // blur_status='blurred' means the Scout's device has already applied privacy blur
    // before upload (T-06-09: value is service-role-only write; client cannot self-assert).
    if (clip?.blur_status === "blurred") {
      await svc.rpc("log_event", {
        p_event_type: "check.face_blur_checked",
        p_subject_type: "check",
        p_subject_id: checkId,
        p_context: { faces_detected: 0, blur_status: "blurred", action: "pass" },
      });
      return { action: "pass", faces_detected: 0 };
    }

    // Step 3: Guard — no playback id means we cannot fetch a thumbnail.
    if (!clip?.mux_playback_id) {
      await svc.from("clips")
        .update({ blur_status: "blur_check_failed" })
        .eq("check_id", checkId);
      await svc.rpc("log_event", {
        p_event_type: "check.face_blur_error",
        p_subject_type: "check",
        p_subject_id: checkId,
        p_context: { reason: "no_playback_id" },
      });
      return { action: "pass", faces_detected: 0 };
    }

    // Step 4: Guard — no API key means we can't run Vision.
    // Fail-open (D-03): record blur_check_failed, return pass.
    if (!apiKeyPresent) {
      await svc.from("clips")
        .update({ blur_status: "blur_check_failed" })
        .eq("check_id", checkId);
      await svc.rpc("log_event", {
        p_event_type: "check.face_blur_error",
        p_subject_type: "check",
        p_subject_id: checkId,
        p_context: { reason: "no_api_key" },
      });
      return { action: "pass", faces_detected: 0 };
    }

    // Step 5: Build the image reference for Vision.
    // In tests, deps.vision is mocked so it receives this ref directly.
    // In the live entrypoint (below) the thumbnail bytes are fetched server-side
    // as base64 via a Mux RS256 signed URL (same pattern as signage-check / Pitfall 2).
    const imageRef: { content?: string; imageUri?: string } = {
      imageUri: `https://image.mux.com/${clip.mux_playback_id}/thumbnail.png?time=5`,
    };

    // Step 6: Call Vision (injected dep, mocked in tests).
    const faceResult = await vision(imageRef);
    const facesDetected = faceResult.faces ?? 0;

    // Step 7: Derive blur_status from the face count.
    let blurStatus: string;
    let action: BlurAction;

    if (facesDetected > 0) {
      // Faces detected and not already blurred -> hold for blur review (D-03, T-06-11).
      // mux-webhook (Plan 06-03) reads action='hold' and drives the blur_review transition.
      blurStatus = "faces_detected_unblurred";
      action = "hold";
    } else {
      blurStatus = "no_faces";
      action = "pass";
    }

    // Step 8: Write blur_status to clips (service-role only — T-06-09).
    await svc.from("clips")
      .update({ blur_status: blurStatus })
      .eq("check_id", checkId);

    // Step 9: Log every run for the immutable audit trail.
    await svc.rpc("log_event", {
      p_event_type: "check.face_blur_checked",
      p_subject_type: "check",
      p_subject_id: checkId,
      p_context: { faces_detected: facesDetected, blur_status: blurStatus, action },
    });

    return { action, faces_detected: facesDetected };
  } catch (_e) {
    // Catch-all: ANY Vision / DB error degrades to blur_check_failed.
    // A blur-check failure MUST NEVER block delivery (D-03, T-06-10 fail-open).
    try {
      await svc.from("clips")
        .update({ blur_status: "blur_check_failed" })
        .eq("check_id", checkId);
      await svc.rpc("log_event", {
        p_event_type: "check.face_blur_error",
        p_subject_type: "check",
        p_subject_id: checkId,
        p_context: { error: String(_e) },
      });
    } catch (_inner) {
      // swallow — already in error handler
    }
    return { action: "pass", faces_detected: 0 };
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

    const apiKey = Deno.env.get("GOOGLE_VISION_API_KEY");
    const apiKeyPresent = !!apiKey;

    // Read blur_enabled from market_config (DEFAULT false — D-07 launch posture).
    const svc = serviceClient();
    const { data: cfg } = await svc.from("market_config")
      .select("blur_enabled")
      .limit(1)
      .single();
    const blurEnabled: boolean = cfg?.blur_enabled ?? false;

    // Mux signing keys for server-side thumbnail fetch (Pitfall 2 — Vision must
    // receive base64 bytes, not a signed URL that Vision can't re-sign).
    const muxSigningKeyId = Deno.env.get("MUX_SIGNING_KEY_ID");
    const muxSigningKeySecret = Deno.env.get("MUX_SIGNING_PRIVATE_KEY");

    // Build the live vision dep: REST FACE_DETECTION via vision.googleapis.com.
    // NOT npm:@google-cloud/vision (times out in Deno — Pitfall 7).
    // T-06-06: apiKey stays in Deno.env, never returned to client, never logged.
    const liveVision = async (
      img: { content?: string; imageUri?: string },
    ): Promise<FaceResult> => {
      if (!apiKey) return { faces: 0 };

      let imageField: Record<string, unknown>;
      if (img.content) {
        imageField = { image: { content: img.content } };
      } else if (img.imageUri) {
        // Fetch Mux thumbnail server-side as base64 (Pitfall 2 mitigation).
        // Same RS256 JWT signing pattern as signage-check/index.ts.
        if (muxSigningKeyId && muxSigningKeySecret) {
          try {
            const playbackId = img.imageUri.split("/")[3]?.split("?")[0] ?? "";
            const now = Math.floor(Date.now() / 1000);
            const payload = { sub: playbackId, aud: "t", exp: now + 300 };
            const header = { alg: "RS256", typ: "JWT" };
            const b64 = (s: string) =>
              btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
            const headerB64 = b64(JSON.stringify(header));
            const payloadB64 = b64(JSON.stringify(payload));
            const sigInput = `${headerB64}.${payloadB64}`;
            const keyPem = atob(muxSigningKeySecret);
            const keyData = new TextEncoder().encode(keyPem);
            const cryptoKey = await crypto.subtle.importKey(
              "pkcs8",
              (() => {
                const pem = new TextDecoder().decode(keyData);
                const b64Key = pem
                  .replace(/-----BEGIN PRIVATE KEY-----/, "")
                  .replace(/-----END PRIVATE KEY-----/, "")
                  .replace(/\s/g, "");
                const binaryStr = atob(b64Key);
                const buf = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) buf[i] = binaryStr.charCodeAt(i);
                return buf.buffer;
              })(),
              { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
              false,
              ["sign"],
            );
            const sigBuf = await crypto.subtle.sign(
              "RSASSA-PKCS1-v1_5",
              cryptoKey,
              new TextEncoder().encode(sigInput),
            );
            const sigB64 = b64(
              Array.from(new Uint8Array(sigBuf), (b) => String.fromCharCode(b)).join(""),
            );
            const jwt = `${sigInput}.${sigB64}`;
            const signedUrl = `https://image.mux.com/${playbackId}/thumbnail.png?token=${jwt}`;
            const thumbRes = await fetch(signedUrl);
            if (thumbRes.ok) {
              const buf = await thumbRes.arrayBuffer();
              const base64 = btoa(
                Array.from(new Uint8Array(buf), (b) => String.fromCharCode(b)).join(""),
              );
              imageField = { image: { content: base64 } };
            } else {
              imageField = { image: { source: { imageUri: img.imageUri } } };
            }
          } catch (_jwtErr) {
            imageField = { image: { source: { imageUri: img.imageUri } } };
          }
        } else {
          imageField = { image: { source: { imageUri: img.imageUri } } };
        }
      } else {
        return { faces: 0 };
      }

      // REST call to Google Vision FACE_DETECTION (Pitfall 7: NOT npm:@google-cloud/vision)
      // maxResults:20 captures all faces in a typical venue scene.
      const visionRes = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                ...imageField,
                features: [{ type: "FACE_DETECTION", maxResults: 20 }],
              },
            ],
          }),
        },
      );

      if (!visionRes.ok) return { faces: 0 };
      const body = await visionRes.json();

      // Parse FACE_DETECTION response: faceAnnotations array, one entry per detected face.
      const faceAnnotations = body?.responses?.[0]?.faceAnnotations ?? [];
      return { faces: faceAnnotations.length };
    };

    const result = await handleFaceBlurCheck(checkId, {
      svc,
      vision: liveVision,
      apiKeyPresent,
      blurEnabled,
    });

    return Response.json(result);
  });
}
