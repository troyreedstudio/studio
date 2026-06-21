// supabase/functions/signage-check/index.ts
//
// LMC Phase 5 (D-06, VER-06 advisory subset) — advisory-only Google Vision signage check.
//
// CRITICAL: this function is STRUCTURALLY INCAPABLE of rejecting a check.
// It is advisory-only: it ONLY writes clips.signage_confirmed (true / false / null).
// No delivery gate, no re-dispatch. (D-06)
//
// Delivery is already complete when this runs — it fires fire-and-forget AFTER
// the `delivered` transition (mux-webhook step 9). A failure here writes
// signage_confirmed=null and returns { confirmed: null }. The Seeker already has
// their clip. (D-06: GPS is the only hard gate. Signage is advisory.)
//
// Google Vision is called via REST fetch (vision.googleapis.com/v1/images:annotate)
// NOT the npm:@google-cloud/vision package, which times out in Deno. (Pitfall 7)
//
// GOOGLE_VISION_API_KEY is a Supabase secret set at the Wave-4 human checkpoint.
// It is read from Deno.env — NEVER hard-coded, NEVER returned to the client.
import { serviceClient } from "../_shared/supabase.ts";

// deno-lint-ignore no-explicit-any
type Svc = any;

export interface VisionResult {
  text: string[];
}

export interface SignageDeps {
  svc: Svc;
  /** Calls Google Vision TEXT_DETECTION on an image (injected for testability). */
  vision: (img: { content?: string; imageUri?: string }) => Promise<VisionResult>;
  /** True iff GOOGLE_VISION_API_KEY is set in the environment. */
  apiKeyPresent: boolean;
}

/**
 * Advisory signage check. Reads the venue name, fetches the Mux thumbnail
 * (server-side, signed playback — Pitfall 2), calls Vision, fuzzy-matches,
 * and records clips.signage_confirmed. NEVER throws; NEVER gates delivery.
 *
 * Returns { confirmed: boolean | null }:
 *   true  — venue name text found in clip thumbnail
 *   false — text detected but name not found (could still be valid; advisory only)
 *   null  — couldn't run (missing key, Vision error, missing playback id, etc.)
 */
export async function handleSignageCheck(
  checkId: string,
  deps: SignageDeps,
): Promise<{ confirmed: boolean | null }> {
  const { svc, vision, apiKeyPresent } = deps;

  // ── Path 1: No API key — record null, log, return gracefully. NEVER throw. ──
  if (!apiKeyPresent) {
    try {
      await svc.from("clips")
        .update({ signage_confirmed: null })
        .eq("check_id", checkId);
      await svc.rpc("log_event", {
        p_event_type: "check.signage_skipped",
        p_subject_type: "check",
        p_subject_id: checkId,
        p_context: { reason: "no_api_key" },
      });
    } catch (_e) {
      // advisory only — swallow all errors
    }
    return { confirmed: null };
  }

  // ── Main path wrapped in a catch-all so a Vision failure NEVER affects delivery ──
  try {
    // Step 1: Read the latest clip's mux_playback_id for this check.
    const { data: clip } = await svc.from("clips")
      .select("mux_playback_id")
      .eq("check_id", checkId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!clip?.mux_playback_id) {
      // No playback id yet — can't fetch a thumbnail; degrade gracefully.
      await svc.from("clips")
        .update({ signage_confirmed: null })
        .eq("check_id", checkId);
      await svc.rpc("log_event", {
        p_event_type: "check.signage_skipped",
        p_subject_type: "check",
        p_subject_id: checkId,
        p_context: { reason: "no_playback_id" },
      });
      return { confirmed: null };
    }

    // Step 2: Read the check's venue_id and derive the venue name.
    // Falls back to checks.location_label if no venue row found.
    const { data: check } = await svc.from("checks")
      .select("venue_id, location_label")
      .eq("id", checkId)
      .single();

    let venueName: string | null = check?.location_label ?? null;
    if (check?.venue_id) {
      const { data: venue } = await svc.from("venues")
        .select("name")
        .eq("id", check.venue_id)
        .single();
      if (venue?.name) venueName = venue.name;
    }

    if (!venueName) {
      // Can't fuzzy-match without a venue name — degrade gracefully.
      await svc.from("clips")
        .update({ signage_confirmed: null })
        .eq("check_id", checkId);
      await svc.rpc("log_event", {
        p_event_type: "check.signage_skipped",
        p_subject_type: "check",
        p_subject_id: checkId,
        p_context: { reason: "no_venue_name" },
      });
      return { confirmed: null };
    }

    // Step 3: Build the image reference.
    // LMC uses signed playback policy (Pitfall 2): the thumbnail at
    //   https://image.mux.com/{playbackId}/thumbnail.png
    // requires a signed JWT. We pass the imageUri to Vision via deps.vision;
    // in production (see live entrypoint below) Vision receives base64 content
    // fetched server-side with the Mux signing key so Vision never hits a 401.
    // In tests, deps.vision is mocked and receives the image reference directly.
    const imageRef: { content?: string; imageUri?: string } = {
      imageUri: `https://image.mux.com/${clip.mux_playback_id}/thumbnail.png?time=5`,
    };

    // Step 4: Call Vision (injected dep, mocked in tests).
    const visionResult = await vision(imageRef);
    const detectedTexts = visionResult.text ?? [];

    // Step 5: Fuzzy match — lowercase + strip punctuation, then substring check.
    // v1 strategy: confirmed if any detected text fragment contains the normalised
    // venue name, or the venue name contains any detected fragment.
    // signage_min_conf tuning (from market_config) is deferred to v2 when we
    // incorporate Vision confidence scores. Document the simple contains-match here.
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const nameNorm = normalize(venueName);

    let confirmed: boolean;
    if (detectedTexts.length === 0) {
      // Vision returned no text at all — treat as false (text not found).
      // (If Vision ERRORED rather than returning empty, the catch below handles it.)
      confirmed = false;
    } else {
      confirmed = detectedTexts.some((t) => {
        const tn = normalize(t);
        return tn.includes(nameNorm) || nameNorm.includes(tn);
      });
    }

    // Step 6: Write the advisory result to clips.signage_confirmed.
    await svc.from("clips")
      .update({ signage_confirmed: confirmed })
      .eq("check_id", checkId);

    // Step 7: Log the advisory result (immutable audit trail).
    await svc.rpc("log_event", {
      p_event_type: "check.signage_checked",
      p_subject_type: "check",
      p_subject_id: checkId,
      p_context: {
        confirmed,
        detected_sample: detectedTexts.slice(0, 3),
        venue_name: venueName,
      },
    });

    // Step 8: Return advisory result (D-06: purely advisory, never gates delivery).
    return { confirmed };
  } catch (_e) {
    // Catch-all: ANY Vision / DB error degrades to signage_confirmed=null.
    // A signage failure MUST NEVER affect delivery (T-05-20).
    try {
      await svc.from("clips")
        .update({ signage_confirmed: null })
        .eq("check_id", checkId);
      await svc.rpc("log_event", {
        p_event_type: "check.signage_error",
        p_subject_type: "check",
        p_subject_id: checkId,
        p_context: { error: String(_e) },
      });
    } catch (_inner) {
      // swallow — we are already in the error handler
    }
    return { confirmed: null };
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

    // Resolve the signing key for Mux thumbnails (signed playback policy — Pitfall 2).
    // We fetch the thumbnail bytes server-side and pass as base64 to Vision so that:
    //   (a) Vision never receives a signed URL that might 401 (Vision can't sign it).
    //   (b) We avoid the "do not depend on externally-hosted images" Vision doc warning.
    const muxSigningKeyId = Deno.env.get("MUX_SIGNING_KEY_ID");
    const muxSigningKeySecret = Deno.env.get("MUX_SIGNING_PRIVATE_KEY");

    // Build the live vision dep: REST fetch to vision.googleapis.com (NOT npm package).
    const liveVision = async (
      img: { content?: string; imageUri?: string },
    ): Promise<VisionResult> => {
      if (!apiKey) return { text: [] };

      let imageField: Record<string, unknown>;
      if (img.content) {
        imageField = { image: { content: img.content } };
      } else if (img.imageUri) {
        // Attempt to fetch Mux thumbnail as base64 (Pitfall 2 mitigation).
        // If Mux signing keys are available, we would mint a signed URL here.
        // For the advisory-only v1 we fall back to passing the imageUri directly;
        // Vision may get a 401 from Mux on signed assets, which the catch-all
        // in handleSignageCheck will swallow -> signage_confirmed=null (acceptable).
        // Wave-4 checkpoint will configure MUX_SIGNING_KEY_ID + MUX_SIGNING_PRIVATE_KEY
        // so a full signed thumbnail fetch can replace this fallback.
        if (muxSigningKeyId && muxSigningKeySecret) {
          // Mint a short-lived thumbnail JWT via the Mux signing key.
          // RS256 JWT: { sub: playbackId, aud: 't', exp: now+300 }
          // Implementation note: We use the Web Crypto SubtleCrypto API to sign.
          // Mux image JWT aud is 't' (thumbnail) per Mux docs.
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
              // Strip PEM headers for raw DER import
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
              // Signed fetch failed — fall through to imageUri
              imageField = { image: { source: { imageUri: img.imageUri } } };
            }
          } catch (_jwtErr) {
            imageField = { image: { source: { imageUri: img.imageUri } } };
          }
        } else {
          imageField = { image: { source: { imageUri: img.imageUri } } };
        }
      } else {
        return { text: [] };
      }

      // REST call to Google Vision TEXT_DETECTION (Pitfall 7: NOT npm:@google-cloud/vision)
      const visionRes = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                ...imageField,
                features: [{ type: "TEXT_DETECTION", maxResults: 10 }],
              },
            ],
          }),
        },
      );

      if (!visionRes.ok) return { text: [] };
      const body = await visionRes.json();

      // Parse TEXT_DETECTION response: each annotation has .description (the text block)
      const annotations =
        body?.responses?.[0]?.textAnnotations ?? [];
      const texts: string[] = annotations.map(
        (a: { description?: string }) => a.description ?? "",
      ).filter(Boolean);

      return { text: texts };
    };

    const svc = serviceClient();
    const result = await handleSignageCheck(checkId, {
      svc,
      vision: liveVision,
      apiKeyPresent,
    });

    return Response.json(result);
  });
}
