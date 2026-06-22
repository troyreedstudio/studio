---
phase: 08-on-device-face-blur-custom-expo-native-module-post-record-bl
plan: 03
subsystem: on-device-face-blur
tags: [native-ios, core-image, cigaussianblur, vision, avfoundation, blur]
status: awaiting-device-checkpoint
requires:
  - "LmcVideoExport (re-encode passthrough) + LmcFaceDetect (sampled detections) + BlurResult contract (08-02)"
provides:
  - "LmcFaceBlur — CIGaussianBlur/CIPixellate masked to detected face rects (+20% padding) via CIBlendWithMask"
  - "LmcDetectionLookup — nearest-sampled-time face-rect reuse for the per-frame export handler (no per-frame Vision)"
  - "blurFaces returns real status: 'blurred' (faces>0), 'no_faces' (faces==0, original untouched), 'failed' (any error)"
  - "blur-config post-record tunables: BLUR_POST_RECORD_RADIUS=22, BLUR_POST_RECORD_MODE='gaussian'"
  - "DEV-ONLY blur test trigger on the filming review panel (Step-3 device gate; removed in Plan 05/06)"
affects:
  - "Plan 08-04 tunes video-file perf on the now-real blur; Plan 08-05 wires blurFaces into the upload flow behind a new flag"
tech-stack:
  added:
    - "Core Image filters: CIFilter.gaussianBlur / CIFilter.pixellate / CIFilter.blendWithMask (first-party, no pods)"
  patterns:
    - "Whole-frame blur once -> CIBlendWithMask(blurred, sharp, white-on-black face-rect mask) -> blurred shows only inside faces"
    - "Vision normalized boundingBox (bottom-left, 0..1) -> CI pixels (also bottom-left) by *extent; no Y-flip"
    - "Face rect expanded +20% on every side (insetBy negative) so blur covers the full face + margin (T-08-08)"
    - "applyingCIFiltersWithHandler looks up rects at request.compositionTime via nearest-sampled detection (Pitfall 3 — no per-frame re-detect)"
    - "no_faces returns the ORIGINAL path untouched (no wasted re-encode); 'failed' never masquerades as 'blurred' (Pitfall 5)"
key-files:
  created:
    - lmc-app/modules/lmc-blur/ios/LmcFaceBlur.swift
  modified:
    - lmc-app/modules/lmc-blur/ios/LmcVideoExport.swift
    - lmc-app/modules/lmc-blur/ios/LmcFaceDetect.swift
    - lmc-app/modules/lmc-blur/ios/LmcBlurModule.swift
    - lmc-app/app/lib/blur-config.ts
    - lmc-app/app/lib/blur-native.ts
    - lmc-app/app/(scout)/filming.tsx
decisions:
  - "Blur technique = CIBlendWithMask (blur whole frame once, composite through a white-on-black face-rect mask) — simpler + faster than per-rect CICrop loops, single blur pass per frame"
  - "Default post-record radius bumped to 22 (from Phase-6 BLUR_PIXEL_RADIUS=18) for stronger, non-recoverable coverage at 1080p (D-05 discretion)"
  - "Face rect padding = +20% on every side (T-08-08 edge-leak mitigation)"
  - "Coordinate mapping relies on appliesPreferredTrackTransform=true at detection so the sampled frame and export frame share upright orientation — both Vision and CI are bottom-left, so normalized*extent maps cleanly with NO Y-flip"
  - "ANY pipeline error (detect OR export OR blur) -> status 'failed' (08-02 made only export-failure fatal; Step 3 makes the whole pipeline fail-safe so a detect throw never silently returns a sharp file)"
  - "Per-frame rect lookup = nearest sampled detection in time (faces move little between 15fps samples) — keeps Vision off the export thread (Pitfall 3)"
  - "Dev gate uses expo-video (already installed) to PLAY the blurred output in-app — no new dependency, no camera-roll/media-library pod added"
metrics:
  tasks: 3
  tasks_completed_autonomously: 2
  files: 7
  duration: 1
  completed: 2026-06-22
---

# Phase 8 Plan 3: Core Image Face Blur Summary

Step 3 of the 6-step on-device de-risk plan (D-05): the FIRST step with a visible outcome. Swapped the Step-2 passthrough export handler for a real Core Image composite that blurs ONLY the detected face rects, frame by frame, during the AVFoundation export. `blurFaces` now actually obscures faces and returns honest status — `blurred` / `no_faces` / `failed`. Still NOT wired into the upload flow (that is Plan 05); proven in isolation so a failure here points squarely at the masking/compositing math.

## What Was Built

- **`ios/LmcFaceBlur.swift`** (new) — the compositor. `composite(source:normalizedFaceRects:)`: blur the whole frame once (`CIGaussianBlur`, or `CIPixellate` for the cheaper fallback), build a white-on-black MASK that is white inside the padded (+20%) union of face rects, then `CIBlendWithMask(blurred, sharpOriginal, mask)` so blurred pixels show ONLY inside the faces. Vision's normalized bottom-left rects map to Core Image pixels (also bottom-left) by multiplying by the frame extent — no Y-flip. Radius clamped to a sane floor so a bad config can't produce a no-op blur.
- **`ios/LmcVideoExport.swift`** — `reencode` now takes `detections` + an `LmcFaceBlur`; the `applyingCIFiltersWithHandler` handler looks up the face rects active at `request.compositionTime` and composites the blur (frames with no faces pass through unchanged). Added the `LmcBlurMode` enum (gaussian/pixelate, parsed from the JS option). Still video-track-only (VID-02), HighestQuality preset, 0-byte output -> throws.
- **`ios/LmcFaceDetect.swift`** — added `LmcDetectionLookup`: sorts the sampled detections once and returns the nearest-in-time rects for any export frame, so Vision never runs per frame (Pitfall 3).
- **`ios/LmcBlurModule.swift`** — finalized status semantics: detect → if `faceCount == 0` return the ORIGINAL untouched (`no_faces`); else re-encode WITH the blur composite and return `blurred` + count; any throw returns the input path as `failed`. Parses `radius`/`mode` from `BlurOptions`.
- **`app/lib/blur-config.ts`** — added `BLUR_POST_RECORD_RADIUS = 22` + `BLUR_POST_RECORD_MODE = 'gaussian'` (+ `PostRecordBlurMode` type). The old `BLUR_NATIVE_ENABLED` live-viewfinder flag stays FALSE/abandoned (D-02), with a comment that the post-record module is the live mechanism now, flag-gated in Plan 05.
- **`app/lib/blur-native.ts`** — the app-facing wrapper now applies the post-record radius/mode defaults unless the caller overrides them.
- **`app/(scout)/filming.tsx`** — a clearly-marked `__DEV__`-only blur test block on the recording-review panel: BLUR (GAUSSIAN) / BLUR (PIXELATE) buttons run `blurFaces` on the just-recorded clip and play the BLURRED output in an in-app `VideoView` so Troy can confirm his face is obscured before the upload flow exists. Removed in Plan 05/06.

## Tasks

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Core Image face-blur compositor (CIGaussianBlur masked to rects, wired into export) | Done | 172f7a3 |
| 2 | Status semantics ('blurred'/'no_faces'/'failed') + post-record tunables | Done | 5952b1e |
| — | Dev-only blur test trigger (makes the Step-3 device gate testable pre-wiring) | Done | bb525a8 |
| 3 | [DEVICE BUILD] Step-3 gate — faces visibly blurred in the saved clip | Handed to orchestrator (checkpoint:human-verify) | — |

## Verification

- `cd lmc-app && npx tsc --noEmit` → clean (exit 0) after each task.
- All four Swift module files under 500 lines (LmcBlurModule 82, LmcFaceBlur 129, LmcFaceDetect 139, LmcVideoExport 142).
- Public `BlurResult` contract shape unchanged (status string values were already in the locked enum; this plan starts RETURNING `blurred`).
- Core Image / Vision / AVFoundation are first-party — no pods added; expo-video (already installed) reused for the dev preview, no new dependency.
- No sibling-project files touched (cross-contamination check: only `lmc-app/**` staged).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Whole-pipeline fail-safe, not export-only**
- **Found during:** Task 2
- **Issue:** 08-02 made only EXPORT failure route to `failed` (detection failure was non-fatal, count=0). At Step 3 a detection throw on a clip that actually has faces could otherwise fall through and return a sharp file — violating the privacy invariant (Pitfall 5 / T-08-09).
- **Fix:** Wrapped the entire detect→blur→export pipeline in one `do/catch`; ANY throw returns the input path with status `failed` (caller uses the fallback). This is consistent with Task 2's stated "any error → failed".
- **Files modified:** LmcBlurModule.swift
- **Commit:** 5952b1e

### Notes (within plan discretion, not deviations)

- Default post-record radius set to **22** (Phase-6 default was 18) for stronger coverage at 1080p — explicit D-05 "blur strength" discretion.
- Compositing uses **CIBlendWithMask** (one blur pass + a rect mask) rather than a per-rect CICrop loop — fewer filter passes per frame, same visual result. Within the research's "CIGaussianBlur masked to face rects" guidance.

## DEVICE CHECKPOINT — handed to orchestrator

Task 3 is the Step-3 device gate (`checkpoint:human-verify`). Autonomous work is complete and committed; the orchestrator runs the build. This is the first VISUAL privacy proof — Troy's eyes are the gate.

**Exact command (orchestrator runs it — do NOT run expo run:ios from this executor):**

```
cd lmc-app && npx expo run:ios --configuration Release --device <udid>
```

(If the lmc-blur native frameworks were not previously linked on this build, prebuild first: `cd lmc-app && npx expo prebuild --clean -p ios`.)

**PASS check:**
1. "Build Succeeded" (Core Image + Vision + AVFoundation linked).
2. App boots; open the Scout filming screen — no crash.
3. Troy films HIMSELF (face clearly in frame) for 15s → on the review panel tap the DEV button **BLUR (GAUSSIAN)** → the in-app player shows the BLURRED clip → Troy confirms his FACE IS BLURRED across the whole clip (full face + margin, not just one frame). Alert shows `status: blurred`, `faces ≥ 1`.
4. Film a WALL / no-face shot → tap BLUR → Alert shows `status: no_faces`, the original is returned untouched (clip looks normal).
5. (Optional) tap **BLUR (PIXELATE)** to sanity-check the cheaper path also obscures the face.

**FAIL = a masking/compositing issue** (isolated — NOT export, NOT detection, both proven in Step 2). Symptoms to report: face not fully covered (edge showing → increase padding), wrong region blurred (coordinate/orientation bug → revisit the no-Y-flip assumption), or whole frame blurred (mask inverted). STOP and fix the blur math here before Plan 04 (perf) / Plan 05 (wiring).

**Resume signal:** Troy types "approved" when his face is clearly blurred in the saved clip and a no-face clip is untouched; or describes what's wrong.

## Self-Check: PASSED

- All created/modified files verified present (LmcFaceBlur.swift + 5 modified module/app files + 08-03-SUMMARY.md).
- All three task commits verified in git: 172f7a3, 5952b1e, bb525a8.
- tsc clean (exit 0) after each task. All Swift files under 500 lines. No sibling-project files touched.
