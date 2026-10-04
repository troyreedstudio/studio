# Android On-Device Face Blur — Build Plan

> Goal: give the `lmc-blur` Expo module a native **Android** implementation so Android Scouts can film, have faces auto-blurred **on-device**, and deliver — matching the iOS privacy model (raw/unblurred video never leaves the phone). Created 2026-10-04.

## Why (decision)
- Android Scouts are core to the launch. Without on-device blur, the app fail-safes and blocks their clips → Android Scouts can't deliver.
- Decision (Troy, 2026-10-04): **on-device**, not server-side — keep the "faces blurred on your device, raw never uploaded" promise intact and consistent with iOS.
- Separate, already-fixed: the *crash* when the delivery screen loaded on Android (made `requireNativeModule` optional). That ships regardless and keeps Android **Seekers** working now.

## What exists (iOS, to mirror)
`modules/lmc-blur/` — Expo module. iOS (`ios/*.swift`): Vision (face detect) + CoreImage (gaussian/pixelate) + AVFoundation (streaming export). JS API the app depends on (keep identical):
- `blurFaces(inputPath, { radius, mode }): Promise<BlurResult>` where `BlurResult = { outputPath, facesBlurred, status: 'blurred'|'no_faces'|'failed' }`.
- App wrapper `app/lib/blur-native.ts` → `blurFacesWithFallback()` (gaussian → retry → pixelate → 'failed'), already handles failures gracefully.
- iOS lesson ([[project_lmc_blur_memory_crash]]): OOM-prone — fixed with autoreleasepool + CIContext cache-off + 720p. Android will have the **same memory/perf battle**.

## Android approach
Native Expo module in `modules/lmc-blur/android/` (Kotlin). Register as `Name("LmcBlur")` with the same `blurFaces` async function so the JS wrapper is unchanged.

Pipeline (streaming, memory-safe):
1. **Decode** the recorded mp4 frame-by-frame — `MediaExtractor` + `MediaCodec` (decoder) → frames to a `Surface`/`SurfaceTexture`.
2. **Detect faces** — Google **ML Kit Face Detection** (`com.google.mlkit:face-detection`, on-device, free). Run on sampled frames (e.g. every N frames) and interpolate/expand boxes for in-between frames (perf).
3. **Blur face regions** — OpenGL ES fragment shader (gaussian/pixelate) applied to detected boxes (with padding), rendering to the encoder input `Surface`.
4. **Encode** — `MediaCodec` (H.264 encoder) + `MediaMuxer` → output mp4. Carry through/transcode at **720p** to bound memory (same cap as iOS).
5. Return `BlurResult` (outputPath, facesBlurred, status). Never return `blurred` unless every sampled frame's faces were covered; otherwise `failed` (fail-safe).

Config:
- `expo-module.config.json` → add the `android` platform + `modules: ["LmcBlurModule"]` (Kotlin class).
- Android Gradle deps: ML Kit face-detection. Min SDK check. Permissions: none extra (operates on a local file; camera perm is the existing recording concern).
- EAS: already builds Android; the local module gets autolinked.

## Risks / hard parts (honest)
- **Memory/perf** — video decode+detect+blur+encode is heavy; must stream, not buffer. Mirror the iOS 720p cap + release aggressively. Biggest risk (iOS proved it).
- **MediaCodec/OpenGL plumbing** — notoriously fiddly (color formats, surface timing). The real engineering cost.
- **Detection quality** — ML Kit vs iOS Vision will differ; tune sampling + box padding so no face slips through (fail-safe on doubt).
- **Device fragmentation** — codec behavior varies across Android devices; test on real hardware.

## Testing constraint (BLOCKER to resolve)
- The **emulator has no camera**, so we cannot film a real clip to blur on it. We can unit-test the blur on a pre-supplied video file pushed to the device, but verifying the **end-to-end Scout film → blur → deliver** needs a **real Android phone**.
- Troy has no Android device. Options: borrow/buy a cheap Android phone, or use a cloud device farm (Firebase Test Lab / BrowserStack) for the camera path.
- We CAN iterate the blur algorithm on the emulator by `adb push`-ing sample videos and calling the module on them (no camera needed for the file-processing path) — that covers most of the engineering; only the live-camera capture needs real hardware.

## Build phases
1. **Scaffold** — Android Kotlin module skeleton (`LmcBlurModule.kt`) registered as `LmcBlur`, `blurFaces` returning a stub, Gradle wired, builds green on EAS. (Proves the native require resolves on Android — no more optional-null path for Scouts.)
2. **Detect + still blur** — ML Kit face detection on frames; blur boxes on extracted frames; prove correctness on a pushed sample video (emulator OK).
3. **Streaming pipeline** — full MediaCodec decode→blur→encode at 720p; memory-safe; returns real `BlurResult`.
4. **Fallback + fail-safe** — gaussian→pixelate, never deliver unblurred; wire status.
5. **Real-device test** — film on a physical Android phone, verify blur quality + memory + delivery end-to-end.
6. **Ship** — include in the Android production build; flip Scout mode on for Android.

## Sequencing with launch
iOS ships now (in Apple review, iOS Scouts fine). This Android-blur project runs in parallel; Android launches with full Seeker+Scout once phases 1–5 pass. Android **Seeker-only** could soft-launch earlier (crash fixed) if desired.

See [[project_lmc_blur_memory_crash]] (iOS blur), [[project_lmc_appstore_submission]].
