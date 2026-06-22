// Phase 8 — POST-RECORD on-device face blur (the LIVE mechanism).
//
// Faces are blurred AFTER recording by the lmc-blur native module (AVFoundation +
// Vision + Core Image), which re-encodes the saved clip before upload. The OLD
// worklets-core live-viewfinder scaffold (BLUR_NATIVE_ENABLED + _filming-blur-
// overlay.tsx + Skia + the face-detector frame processor) was ABANDONED
// (08-CONTEXT D-02) and has been removed — it added build-linking fragility
// (undefined RNWorklet symbol, native heap corruption) with no benefit.
//
// These tunables are passed by app/lib/blur-native.ts into the native blurFaces
// call (BlurOptions { radius, mode }). The dormant server-side detect-and-hold
// net (face-blur-check + the mux-webhook gate + market_config.blur_enabled)
// remains as the last-resort fallback (D-04).
// ---------------------------------------------------------------------------

/** Blur style for the post-record module: 'gaussian' (default) or 'pixelate' (cheaper). */
export type PostRecordBlurMode = 'gaussian' | 'pixelate';

/**
 * FALLBACK / baseline gaussian radius (pixels at native frame resolution).
 *
 * As of 08-04 the native blur SCALES TO EACH FACE'S SIZE: per detected face the
 * module computes its own strength from the face's pixel width
 * (gaussian radius ≈ faceWidthPx * 0.30, clamped 12..220; pixelate block ≈
 * faceWidthPx * 0.18, clamped 8..120). This fixes the "flat white box" a single
 * fixed radius produced on small/distant faces while still heavily obscuring
 * close-up faces — every face is de-identified at any distance.
 *
 * This value is now only the FALLBACK used when a face's pixel size can't be
 * derived; it is NOT the strength applied to a normally-detected face. Leave it
 * generous so the fallback still over-blurs (privacy errs toward more blur).
 */
export const BLUR_POST_RECORD_RADIUS = 70;

/** Default post-record blur style. Gaussian is strongest; pixelate is the cheaper fallback. */
export const BLUR_POST_RECORD_MODE: PostRecordBlurMode = 'gaussian';
