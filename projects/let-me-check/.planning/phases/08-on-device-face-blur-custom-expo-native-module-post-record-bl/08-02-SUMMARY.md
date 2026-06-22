---
phase: 08-on-device-face-blur-custom-expo-native-module-post-record-bl
plan: 02
subsystem: on-device-face-blur
tags: [native-ios, avfoundation, vision, re-encode, face-detection]
status: awaiting-device-checkpoint
requires:
  - "lmc-blur local Expo module + BlurResult contract (08-01)"
provides:
  - "LmcVideoExport — AVAssetExportSession video-only passthrough re-encode (no blur), returns new temp path"
  - "LmcFaceDetect — VNDetectFaceRectanglesRequest over <=15fps sampled frames, returns detections + max-faces count"
  - "blurFaces now re-encodes + detects, returns real face count in facesBlurred (status stays no_faces — no pixels changed)"
affects:
  - "Plan 08-03 swaps the passthrough handler for a real CIFilter composite over detected face rects"
tech-stack:
  added:
    - "AVFoundation (AVURLAsset, AVMutableVideoComposition applyingCIFiltersWithHandler, AVAssetExportSession)"
    - "Vision (VNDetectFaceRectanglesRequest)"
    - "Metal-backed CIContext (reused by Plan 03 blur step)"
  patterns:
    - "applyingCIFiltersWithHandler passthrough scaffold — Plan 03 swaps one line for the blur composite"
    - "<=15fps frame sampling via AVAssetImageGenerator (Pitfall 3) — never loads whole clip into RAM"
    - "video track ONLY on export (VID-02 — no audio re-introduced)"
    - "facesBlurred carries DETECTED count as telemetry; status stays no_faces until pixels change (Pitfall 5)"
key-files:
  created:
    - lmc-app/modules/lmc-blur/ios/LmcVideoExport.swift
    - lmc-app/modules/lmc-blur/ios/LmcFaceDetect.swift
  modified:
    - lmc-app/modules/lmc-blur/ios/LmcBlurModule.swift
    - lmc-app/modules/lmc-blur/src/LmcBlur.types.ts
decisions:
  - "Detection confidence threshold = 0.3 (D-05 Claude discretion) — keeps a real selfie face, rejects most spurious texture; under-detection backstopped by Plan 05 fallback"
  - "faceCount = max faces in any single sampled frame (plausible people-in-shot), not sum across frames"
  - "Export preset AVAssetExportPresetHighestQuality (preserve ~1080p capture quality); outputFileType .mp4; 0-byte/missing output treated as failure"
  - "Detection failure is non-fatal (logged, count=0); only EXPORT failure routes to status 'failed' — export is the framework-link gate this step"
  - "Internal LmcDetectionResult TS type added for Plan 03; public BlurResult contract shape unchanged"
metrics:
  tasks: 3
  tasks_completed_autonomously: 2
  files: 4
  duration: 1
  completed: 2026-06-22
---

# Phase 8 Plan 2: AVFoundation Re-encode + Vision Detection Summary

Steps 2+3 of the 6-step on-device de-risk plan (D-05): prove the Apple frameworks LINK and RUN — AVFoundation re-encodes the recorded clip to a new playable (audio-free) file, and Vision reports a plausible face count — all with NO blur applied. Splitting export-link from detection from blur means a future failure points at exactly one framework.

## What Was Built

- **`ios/LmcVideoExport.swift`** — `reencode(inputPath:)` builds an `AVURLAsset`, wires an `AVMutableVideoComposition(asset:applyingCIFiltersWithHandler:)` whose handler currently passes the source frame straight through (`request.finish(with: request.sourceImage, context:)` — NO filter), and exports via `AVAssetExportSession` (HighestQuality preset, `.mp4`, video track only — no audio per VID-02) to a fresh temp path. Uses a reused Metal-backed `CIContext` (Plan 03's blur step shares it). Validates a non-empty output (0-byte/missing → throws → status `failed`).
- **`ios/LmcFaceDetect.swift`** — `detectFaces(inputPath:)` runs `VNDetectFaceRectanglesRequest` over frames sampled at <=15fps (`AVAssetImageGenerator`, sequential — never the whole clip in RAM, T-08-06), filters by confidence >= 0.3, and returns per-time normalized face rects plus a max-faces count for telemetry.
- **`ios/LmcBlurModule.swift`** — `blurFaces` now runs detection (logs `"Vision detected N face(s)..."` to the device console), then re-encodes. Resolves `{ outputPath: file://<new>, facesBlurred: <detected count>, status: 'no_faces' }` on success, or `{ outputPath: inputPath, facesBlurred: 0, status: 'failed' }` if export errors. Still a plain `AsyncFunction` Promise — no worklet/JSI bridge.
- **`src/LmcBlur.types.ts`** — added internal `LmcFrameDetection` / `LmcDetectionResult` types (diagnostics/Plan-03 reference only). Public `BlurResult` shape unchanged.

## Tasks

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | AVFoundation re-encode passthrough (export links, no blur) | Done | b8969d7 |
| 2 | Vision face detection (count only, still no blur) | Done | 03b1dcc |
| 3 | [DEVICE BUILD] Step-2 gate (export re-encodes + detection counts faces) | Handed to orchestrator (checkpoint:human-verify) | — |

## Verification

- `cd lmc-app && npx tsc --noEmit` → clean (exit 0) after each task.
- No app-flow files touched: `filming.tsx`, `clips.ts`, `app.config.js` all untouched (only `modules/lmc-blur/**` changed).
- Public `BlurResult` contract unchanged (only internal types added).
- Vision/CoreImage/AVFoundation are first-party — NO extra pods added (08-CONTEXT canonical_refs note); frameworks link via `import` only.

## Deviations from Plan

None — plan executed as written. (Task 1's commit deliberately scoped the module to export-only with `facesBlurred: 0`; Task 2's commit then added detection and wired the real count in, keeping the two device checks cleanly separated in history.)

## DEVICE CHECKPOINT — handed to orchestrator

Task 3 is the Step-2 device gate (`checkpoint:human-verify`). Autonomous work is complete; the orchestrator runs the build:

```
cd lmc-app && npx expo run:ios --configuration Release --device <udid>
```

(If frameworks were not previously linked, prebuild first: `cd lmc-app && npx expo prebuild --clean -p ios`.)

PASS =
1. "Build Succeeded" (AVFoundation + Vision now linked).
2. App boots, filming opens — no crash.
3. Export check: `blurFaces` on a real recorded clip returns a NEW `outputPath` that PLAYS, with NO audio track (VID-02), `status: 'no_faces'`.
4. Detection check: a SELFIE clip logs `~1` face; a WALL/empty shot logs `~0`. Count is plausible (not always-0, not always-huge).

FAIL on export → codec/export-config issue (isolated). FAIL on detection → model/threshold issue (isolated). Either way STOP and fix at THIS layer before Plan 03 (blur).

## Self-Check: PASSED

- Both created files verified present: LmcVideoExport.swift, LmcFaceDetect.swift.
- Modified files present: LmcBlurModule.swift, LmcBlur.types.ts.
- Both task commits verified in git: b8969d7, 03b1dcc.
- tsc clean (exit 0). No app-flow files modified.
