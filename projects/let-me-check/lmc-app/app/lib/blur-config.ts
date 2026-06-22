// Phase 6 — D-01/D-07: Privacy-by-default on-device blur path.
//
// BLUR_NATIVE_ENABLED = false by default.
//
// This flag gates the on-device face-blur overlay (SkiaCamera + face-detector
// frame processor) in the filming viewfinder. When false, the existing
// CameraViewfinder runs unchanged — no blur code path activates.
//
// ENABLE ONLY AFTER:
//   1. The EAS dev build compiles and the app boots (Category B gate — run by
//      the orchestrator overnight after 06-05-PLAN.md is committed).
//   2. Troy visually confirms faces are blurred in the filming viewfinder
//      (Category C — Troy's AM check).
//   3. blur_enabled is also set to true in market_config (server gate, Plan 04).
//
// Prior New-Arch bites in this repo:
//   - createUploadTask (EventEmitter dead under New Arch, Phase 5)
//   - google-signin (Old-Arch only without explicit newArchEnabled: true, Phase 4)
// The three packages added in Phase 6 (react-native-worklets-core, react-native-
// vision-camera-face-detector, @shopify/react-native-skia) are UNVERIFIED on this
// exact Expo 54 / RN 0.83.2 / New Arch combo until the device build boots
// (06-RESEARCH Assumptions A1-A3).

/**
 * CATEGORY B feature flag: on-device face-blur overlay in the filming viewfinder.
 * Defaults FALSE. See comments above for the enable checklist.
 */
export const BLUR_NATIVE_ENABLED = false;

/**
 * Blur radius applied to each detected face bounding box (in pixels).
 * Tunable. 18px gives a strong but not pixelated bokeh-style blur at 1080p.
 * Only active when BLUR_NATIVE_ENABLED = true.
 */
export const BLUR_PIXEL_RADIUS = 18;

// ---------------------------------------------------------------------------
// Phase 8 — POST-RECORD on-device face blur (the LIVE mechanism now).
//
// The BLUR_NATIVE_ENABLED flag + viewfinder overlay above are the OLD live-path
// (worklets-core) that was ABANDONED (08-CONTEXT D-02). Leave it FALSE. Faces are
// now blurred AFTER recording by the lmc-blur native module (AVFoundation + Vision
// + Core Image), which re-encodes the saved clip before upload.
//
// These tunables are passed by app/lib/blur-native.ts into the native blurFaces
// call (BlurOptions { radius, mode }). The post-record path is NOT yet wired into
// the upload flow — that wiring lands in Plan 05 behind a NEW feature flag added
// there. Until then only a dev trigger calls it.
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
