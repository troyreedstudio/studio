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
 * Gaussian blur radius (pixels at native frame resolution) for the post-record
 * face blur. ~18-25 at 1080p gives strong, non-recoverable coverage. Tunable.
 */
export const BLUR_POST_RECORD_RADIUS = 22;

/** Default post-record blur style. Gaussian is strongest; pixelate is the cheaper fallback. */
export const BLUR_POST_RECORD_MODE: PostRecordBlurMode = 'gaussian';
