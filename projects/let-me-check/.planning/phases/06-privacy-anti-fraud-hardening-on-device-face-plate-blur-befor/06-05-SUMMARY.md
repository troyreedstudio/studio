---
phase: 06-privacy-anti-fraud-hardening-on-device-face-plate-blur-befor
plan: "05"
subsystem: lmc-app/native-blur
tags: [native, skia, face-detection, privacy, feature-flag, category-b]
dependency_graph:
  requires: [06-04]
  provides: [BLUR-NATIVE-01]
  affects: [lmc-app/app/(scout)/filming.tsx]
tech_stack:
  added:
    - react-native-worklets-core@1.6.3
    - react-native-vision-camera-face-detector@1.10.2
    - "@shopify/react-native-skia@2.6.6"
  patterns:
    - flag-gated native scaffold (BLUR_NATIVE_ENABLED=false)
    - Skia Canvas absolute overlay over Camera (no SkiaCamera bridge)
    - useRunOnJS for worklet-to-JS face bounds bridge
key_files:
  created:
    - lmc-app/app/lib/blur-config.ts
    - lmc-app/app/(scout)/_filming-blur-overlay.tsx
  modified:
    - lmc-app/package.json
    - lmc-app/package-lock.json
    - lmc-app/app.config.js
    - lmc-app/app/(scout)/filming.tsx
decisions:
  - "react-native-vision-camera-face-detector pinned to v1.10.2 not v2.0.1: v2.x requires vision-camera >= 5.0; we are pinned to v4.7.x"
  - "react-native-vision-camera-skia has NO v4-compatible version (all versions are v5.x — A3 confirmed false); blur overlay uses plain Skia Canvas positioned absolutely over the Camera preview instead of SkiaCamera bridge"
  - "@shopify/react-native-skia installed at 2.6.6 (pinned per RESEARCH); expo install suggested 2.2.12 — delta noted"
  - "babel.config.js not yet created; worklets-core Babel plugin must be added before BLUR_NATIVE_ENABLED is flipped true"
  - "Task 3 (EAS dev build) deferred to orchestrator — not run by this executor per explicit objective"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-22"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 6
---

# Phase 06 Plan 05: On-Device Blur Native Scaffold Summary

**One-liner:** On-device face-blur native scaffold (worklets-core + face-detector + Skia Canvas) installed and wired into filming.tsx behind BLUR_NATIVE_ENABLED=false — fully dormant until device build passes.

---

## Tasks Executed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Install native blur stack + BLUR_NATIVE_ENABLED flag | Complete | `98d51a7` |
| 2 | SkiaCamera face-blur overlay + flag-gated filming.tsx wiring | Complete | `3bc5f8a` |
| 3 | EAS dev build (Category B gate) | **Deferred to orchestrator** | — |

**Task 3 note:** Per the objective, the orchestrator (Guy) runs the EAS dev build itself after this executor finishes. This executor does NOT run `eas build` or `expo run:ios`.

---

## What Was Built

### Task 1: Native stack + feature flag

Three native packages installed via `npx expo install` (pinned per 06-RESEARCH):

| Package | Version Installed | Notes |
|---------|------------------|-------|
| `react-native-worklets-core` | 1.6.3 | Frame processor worklet runtime |
| `react-native-vision-camera-face-detector` | **1.10.2** (not 2.0.1) | See deviation below |
| `@shopify/react-native-skia` | 2.6.6 | Expo suggested 2.2.12; pinned per RESEARCH |

`app/lib/blur-config.ts` created with:
- `BLUR_NATIVE_ENABLED = false` — the hard gate; no blur code path runs with this off
- `BLUR_PIXEL_RADIUS = 18` — tunable blur strength for the Skia BlurMask

`app.config.js` updated with a Category B comment block: New-Arch risk, prior bites (createUploadTask, google-signin), the babel.config.js requirement, and the three-step enable checklist.

### Task 2: BlurViewfinder component + filming.tsx wiring

`_filming-blur-overlay.tsx` created. Exports `BlurViewfinder` with the identical prop surface as `CameraViewfinder` — a direct drop-in replacement. Internals:

- `useFaceDetector({ performanceMode: 'fast', autoMode: false, cameraFacing: 'back' })` from `react-native-vision-camera-face-detector`
- `useFrameProcessor` calling `detectFaces(frame)` in a `'worklet'` context
- `useRunOnJS` bridging face `Bounds[]` from the worklet thread back to React state
- Skia `Canvas` (absolute fill, `pointerEvents="none"`) rendering `Rect` + `BlurMask` + `Paint` per detected face bounding box

`filming.tsx` change is minimal — 2 additional imports + one ternary replacing the single `<CameraViewfinder>`:

```tsx
{BLUR_NATIVE_ENABLED ? (
  <BlurViewfinder {...viewfinderProps} />
) : (
  <CameraViewfinder {...viewfinderProps} />
)}
```

With `BLUR_NATIVE_ENABLED = false`, the `BlurViewfinder` branch is never entered. The existing camera flow is byte-for-byte unchanged.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] react-native-vision-camera-face-detector v2.0.1 requires vision-camera >= 5.0**

- **Found during:** Task 1, checking peer dependencies after install
- **Issue:** The research-specified version `2.0.1` (v2.x) has a peer dependency of `react-native-vision-camera >= 5.0`. This repo is pinned to `v4.7.x` (decision logged in STATE.md: "vision-camera pinned to v4.7.x — v5 ships no Expo config plugin"). Installing v2.0.1 would create a peer conflict.
- **Fix:** Downgraded to `v1.10.2` — the latest v1.x release, which requires `react-native-vision-camera >= 4.0`. The API (`useFaceDetector`, `Face`, `Bounds`) is identical in shape. The plan's own research explicitly flags A2 as an assumption and says "if incompatible, skip or document."
- **Files modified:** `lmc-app/package.json`, `lmc-app/package-lock.json`
- **Commit:** `98d51a7`

**2. [A3 Confirmed False] react-native-vision-camera-skia has no v4-compatible version**

- **Found during:** Task 1, before install
- **Issue:** All published versions of `react-native-vision-camera-skia` are `5.0.x` — there is no v4-compatible release. The plan's own fallback path applies: "if no v4-compatible Skia bridge exists, fall back to a Skia `<Canvas>` overlay positioned from face bounding boxes."
- **Fix:** Used a plain `@shopify/react-native-skia` `Canvas` component positioned absolutely over the `Camera`. Same visual result; no SkiaCamera bridge needed. `react-native-vision-camera-skia` was NOT installed.
- **Files modified:** `_filming-blur-overlay.tsx` (uses Canvas overlay pattern, not SkiaCamera)
- **Commit:** `3bc5f8a`

**3. [Note — NOT fixed] babel.config.js missing**

- **Found during:** Task 1
- **Issue:** `react-native-worklets-core` requires its Babel plugin (`"react-native-worklets-core/plugin"`) in `babel.config.js` for the `'worklet'` directive to be compiled. No `babel.config.js` exists in `lmc-app/`.
- **NOT fixed:** The scaffold is dormant (flag=false), so the missing Babel plugin causes no runtime issue now. The `'worklet'` directive in `_filming-blur-overlay.tsx` is dead code while the flag is off.
- **Action required before enabling:** Create `lmc-app/babel.config.js` with the worklets-core plugin before flipping `BLUR_NATIVE_ENABLED = true`. Documented prominently in `app.config.js` and `_filming-blur-overlay.tsx`.
- **Deferred to:** Pre-enable checklist (Troy's AM decision after Task 3 passes)

---

## New-Arch Risk Summary (for Troy's AM review)

| Assumption | Status | Risk |
|------------|--------|------|
| A1: `react-native-worklets-core` New-Arch compatible on RN 0.83.2 | **UNVERIFIED** — only confirmed by build boot | App crashes on boot if incompatible |
| A2: `react-native-vision-camera-face-detector` v4.7.x compat | **CONFIRMED** for v1.x (v2.x is v5-only) | v1.10.2 installed; peer dep satisfied |
| A3: `react-native-vision-camera-skia` v4 bridge exists | **CONFIRMED FALSE** — no v4 version exists | Mitigated: plain Skia Canvas used instead |

Prior New-Arch bites in this repo: `createUploadTask` (EventEmitter dead under New Arch, Phase 5) and `google-signin` (Old-Arch only without explicit `newArchEnabled: true`, Phase 4). The worklets-core / Skia combination is the highest-risk unknown.

---

## Category C — Troy AM Review

After the Task 3 EAS dev build runs and reports (orchestrator's job), Troy reviews:

1. **D-01 confirm:** Is on-device blur (before upload) the right v1 privacy mechanism, or does the server-side "detect + hold" gate (Plans 02-03, `blur_enabled`) cover launch adequately?
2. **D-03 confirm:** Hold-on-blur-failure vs soft-flag. Current implementation: hold (privacy-by-default). Docs currently say "soft-flag." Troy reconciles.
3. **D-04 confirm:** Flag-only vs auto-reject on fraud signals. Current: flag-only (`fraud_strictness = 'flag'`). Auto-reject deferred.
4. **D-06 confirm:** On-device signage detection stays server-side. Correct per plan.
5. **Visual blur quality:** Does the filming viewfinder actually blur faces? (Only verifiable on device with `BLUR_NATIVE_ENABLED = true`.)
6. **Enable decision:** When to flip `BLUR_NATIVE_ENABLED = true` (client) AND `blur_enabled = true` (server). Both must be set together for the full privacy guarantee.
7. **babel.config.js:** Must be created with `["react-native-worklets-core/plugin"]` before the flag is enabled.

---

## Known Stubs

None. The blur overlay is a complete TypeScript scaffold — all imports wired, all types satisfied, tsc clean. The runtime correctness (face bounding box accuracy, blur visual quality, 60fps performance) is deferred to the device build (Category B/C), not a code stub.

---

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: category-b-new-arch | `_filming-blur-overlay.tsx` | Three new native packages (worklets-core, face-detector, Skia) are UNVERIFIED on New Arch. If any crash on boot, T-06-20 triggers — revert or keep dormant. |

---

## Self-Check: PASSED

Files created/exist:
- `lmc-app/app/lib/blur-config.ts` — FOUND (created in Task 1)
- `lmc-app/app/(scout)/_filming-blur-overlay.tsx` — FOUND (created in Task 2)

Commits exist:
- `98d51a7` — feat(06-05): install on-device blur native stack + BLUR_NATIVE_ENABLED flag
- `3bc5f8a` — feat(06-05): SkiaCamera face-blur overlay + flag-gated wiring in filming.tsx

tsc clean: CONFIRMED (both verification gates passed with `echo OVERLAY-OK`)

BLUR_NATIVE_ENABLED defaults false: CONFIRMED (`grep -q "BLUR_NATIVE_ENABLED = false" app/lib/blur-config.ts` passed)

Task 3 (EAS dev build): intentionally NOT run — deferred to orchestrator per objective.
