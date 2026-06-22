---
phase: 08-on-device-face-blur-custom-expo-native-module-post-record-bl
plan: 01
subsystem: on-device-face-blur
tags: [expo-module, native-ios, blur, packaging, new-arch]
status: awaiting-device-checkpoint
requires: []
provides:
  - "lmc-blur local Expo module (iOS, no-op) — links via prebuild auto-link"
  - "BlurResult/BlurStatus/BlurMode/BlurOptions contract (locked for Plans 02-06)"
  - "app/lib/blur-native.ts — sole app-facing typed blurFaces wrapper"
affects:
  - "Plans 08-02..08-06 implement against this BlurResult contract"
tech-stack:
  added:
    - "Expo Modules API local module (lmc-blur) — iOS only this step"
  patterns:
    - "AsyncFunction (Promise) native call — no worklet/JSI camera bridge (avoids SIGSEGV class)"
    - "no-op returns status 'no_faces' not 'blurred' (Pitfall 5: never pass a raw file as blurred)"
key-files:
  created:
    - lmc-app/modules/lmc-blur/expo-module.config.json
    - lmc-app/modules/lmc-blur/index.ts
    - lmc-app/modules/lmc-blur/src/LmcBlur.types.ts
    - lmc-app/modules/lmc-blur/src/LmcBlurModule.ts
    - lmc-app/modules/lmc-blur/ios/LmcBlurModule.swift
    - lmc-app/modules/lmc-blur/ios/LmcBlur.podspec
    - lmc-app/app/lib/blur-native.ts
  modified: []
decisions:
  - "Module is iOS-only (web stub + android dir removed from the create-expo-module scaffold); Android is a deferred fast-follow noted as TODO in index.ts (08-CONTEXT D-03)"
  - "podspec deployment target pinned to iOS 15.5 to match app.config.js expo-build-properties (scaffold defaulted to 16.4)"
  - "blurFaces is a plain AsyncFunction Promise — structurally no worklet/JSI bridge, so the worklets-core SIGSEGV class cannot fire"
  - "no-op returns status 'no_faces' (never 'blurred') so a passthrough can never be mistaken for a real blur (Pitfall 5)"
metrics:
  tasks: 3
  tasks_completed_autonomously: 2
  files: 7
  duration: 1
  completed: 2026-06-22
---

# Phase 8 Plan 1: lmc-blur Empty Module + JS Bridge Summary

An empty (no-op) local Expo native module `lmc-blur` plus its typed JS bridge and the locked `BlurResult` contract — the smallest possible native layer, built to prove the Expo packaging links under New Architecture and the app boots BEFORE any computer-vision code (Step 1 of the 6-step incremental de-risk plan, D-05).

## What Was Built

- **Local Expo module `lmc-blur`** (`lmc-app/modules/lmc-blur/`), scaffolded with `create-expo-module --local` so Expo prebuild auto-links it — no manual `ios/` edits (ios/ is gitignored, D-03). Trimmed to iOS-only (removed the scaffold's web stub and android dir).
- **Locked contract** `src/LmcBlur.types.ts`: `BlurMode`, `BlurStatus`, `BlurResult`, `BlurOptions` — the exact shape every later step (02-06) implements against.
- **Typed native proxy** `src/LmcBlurModule.ts` → `requireNativeModule('LmcBlur')` exposing `blurFaces(inputPath, opts?): Promise<BlurResult>`.
- **iOS no-op** `ios/LmcBlurModule.swift`: a single `AsyncFunction("blurFaces")` that resolves `{ outputPath: input, facesBlurred: 0, status: "no_faces" }` — NO AVFoundation/Vision/CoreImage. Plain Promise-backed async (no worklet/JSI bridge).
- **App-facing wrapper** `app/lib/blur-native.ts`: the sole import path the app will use (decouples app from the module). Dormant — nothing in the recording/upload flow calls it yet.

## Tasks

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Scaffold local Expo module + lock BlurResult contract | Done | ef800ae |
| 2 | iOS no-op blurFaces + JS wrapper | Done | bd86bfa |
| 3 | [DEVICE BUILD] Step-1 gate (prebuild links, build, boot, no-op call) | Handed to orchestrator (checkpoint:human-verify) | — |

## Verification

- `cd lmc-app && npx tsc --noEmit` → clean (exit 0).
- No app-flow files modified: `filming.tsx`, `clips.ts`, `app.config.js` plugins all untouched (confirmed via git status).
- Module files are tracked (not gitignored) — `modules/` is committed even though `ios/` is not.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Trimmed create-expo-module scaffold to iOS-only**
- **Found during:** Task 1
- **Issue:** `create-expo-module@latest --local` (template v56) generated a multi-platform scaffold (web stub `LmcBlurModule.web.ts`, an `android/` dir, multi-platform `expo-module.config.json`). The plan scopes this to iOS-only (Android deferred per D-03), and the web stub would have conflicted with the typed `requireNativeModule` proxy.
- **Fix:** Removed `src/LmcBlurModule.web.ts` and the `android/` directory; set `expo-module.config.json` platforms to `["apple"]`; noted Android as a TODO in `index.ts`.
- **Files modified:** expo-module.config.json, index.ts (+ deletions)
- **Commit:** ef800ae

**2. [Rule 1 - Bug] podspec deployment target lowered 16.4 → 15.5**
- **Found during:** Task 1
- **Issue:** The scaffolded podspec defaulted to `:ios => '16.4'`, which is higher than the app's declared deployment target (15.5 in app.config.js expo-build-properties). A module pod above the app target risks a pod-install/version mismatch at the device build.
- **Fix:** Set the podspec `:ios` platform to `15.5`.
- **Files modified:** ios/LmcBlur.podspec
- **Commit:** ef800ae

## DEVICE CHECKPOINT — handed to orchestrator

Task 3 is the Step-1 device gate (`checkpoint:human-verify`). The autonomous work is complete; the orchestrator runs the build:

```
cd lmc-app && npx expo prebuild --clean -p ios
cd lmc-app && npx expo run:ios --configuration Release --device <udid>
```

PASS = prebuild auto-links `lmc-blur` (no manual ios/ edits) + "Build Succeeded" + app boots to splash + filming screen opens + a smoke `blurFaces('file:///tmp/x.mov')` resolves to `{ status: 'no_faces', facesBlurred: 0 }` in the device log. Any failure → STOP and fix packaging before Plan 02.

## Self-Check: PASSED

- All 7 created files verified present on disk + 08-01-SUMMARY.md.
- Both task commits verified in git history: ef800ae, bd86bfa.
- tsc clean (exit 0). No app-flow files modified.
