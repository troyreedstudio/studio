---
phase: 03-video-pipeline
plan: 03
subsystem: video-pipeline
tags: [mux, upload, vision-camera, clips, webhook-seam, security]
requires:
  - "lib/checks.ts (Phase 2 check wrappers)"
  - "lib/supabase.ts (single client)"
  - "Edge Functions mux-upload-url + mux-playback-token (authored in 03-02)"
provides:
  - "lib/clips.ts — requestUploadUrl, uploadClip, uploadWithRetry, getPlaybackToken (device upload/playback seam)"
  - "markDelivered RETIRED — no client-side delivered transition remains"
  - "filming.tsx markDelivered-free, temporary no-op submit + TODO(03-05)"
  - "vision-camera config (audio off) + native deps"
  - "scripts/check-video-invariants.sh — reusable phase invariants gate"
affects:
  - "03-04 (full-app tsc gate — now passes), 03-05 (wires the real recorder + upload into filming.tsx submit)"
tech-stack:
  added:
    - "react-native-vision-camera ^4.7.3 (live capture; ships the Expo config plugin)"
    - "expo-file-system ~19.0.23 (createUploadTask resumable PUT — via /legacy entry)"
  patterns:
    - "token-handoff: device only holds a one-time upload URL + short-lived playback JWT; no Mux secret in the bundle"
    - "webhook owns delivered: client stops at 'upload PUT returned success'"
    - "bounded exponential-backoff retry (1s,2s,4s,8s) for weak-network uploads"
key-files:
  created:
    - "lmc-app/app/lib/clips.ts"
    - "lmc-app/app/lib/clips.test.ts"
    - "lmc-app/scripts/check-video-invariants.sh"
    - ".planning/phases/03-video-pipeline/deferred-items.md"
  modified:
    - "lmc-app/app/lib/checks.ts (markDelivered removed)"
    - "lmc-app/app/lib/checks.test.ts (stub-delivery tests removed)"
    - "lmc-app/app/(scout)/filming.tsx (markDelivered import+call removed; no-op submit + TODO)"
    - "lmc-app/app.config.js (vision-camera plugin; mic usage string removed)"
    - "lmc-app/package.json (native deps)"
decisions:
  - "Pinned vision-camera to v4.7.x instead of expo-install's resolved v5.0.11 — v5 ships NO Expo config plugin, so the plan's required ['react-native-vision-camera', { enableMicrophonePermission: false }] entry would break EAS prebuild. v4 is the version the research locked."
  - "Imported createUploadTask from 'expo-file-system/legacy' — SDK-54's expo-file-system 19 moved the resumable upload API to the /legacy entry point."
  - "markDelivered removed from checks.ts AND its only consumer filming.tsx in the SAME wave (Wave 1) so the Wave-2 03-04 full-app tsc stays consistent."
metrics:
  duration_min: 17
  tasks: 4
  files: 9
  completed: 2026-06-20
---

# Phase 3 Plan 03: Device Upload/Playback Seam + markDelivered Retirement Summary

The honest client upload/playback library (`lib/clips.ts`) plus the cross-wave fix that strips the client's ability to mark a check delivered — markDelivered removed from `checks.ts` and its sole consumer `filming.tsx` in one wave — with vision-camera configured audio-off and a reusable invariants gate. All offline-verifiable green; on-device capture and live deploy remain blocked on later waves.

## What Was Built

- **`lib/clips.ts`** — `requestUploadUrl` (invokes `mux-upload-url`), `uploadClip` (resumable PUT via `createUploadTask`, throws on HTTP >= 300), `uploadWithRetry` (bounded exponential backoff, throws after max), `getPlaybackToken` (invokes `mux-playback-token`). Never transitions a check; never imports a gallery API; holds no Mux secret.
- **markDelivered retired** — deleted from `checks.ts` (no `p_to:'delivered'` path left in the client), its stub-delivery `describe` block + the DATA-02 call removed from `checks.test.ts`, and its dangling import + call removed from `filming.tsx` (submit is now a temporary no-op + `TODO(03-05)`, keeping `markFilming` and the existing fake-upload chrome). The webhook (03-02) is the sole `delivered` driver.
- **`app.config.js`** — added `['react-native-vision-camera', { enableMicrophonePermission: false }]`; removed `NSMicrophoneUsageDescription`. Native deps installed.
- **`scripts/check-video-invariants.sh`** — one re-runnable gate: no gallery path (VID-01), audio off (VID-02), no client delivered (VID-03), no Mux secret in the bundle (T-03-07). Exits 0 now; re-run after 03-05.

## Verification

- Full-app `npx tsc --noEmit`: CLEAN (so the Wave-2 03-04 full-app tsc passes).
- Plan-scoped `npx vitest run app/lib/clips.test.ts app/lib/checks.test.ts`: 27 passed.
- `bash lmc-app/scripts/check-video-invariants.sh`: exit 0, "video-invariants OK".
- `markDelivered` occurrences across checks.ts + checks.test.ts + filming.tsx: 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] expo-file-system createUploadTask moved to /legacy**
- **Found during:** Task 1
- **Issue:** Research assumed `expo-file-system ~56`; SDK-54 installs v19 where `createUploadTask`/`FileSystemUploadType` live under `expo-file-system/legacy` (the main export no longer has them). tsc failed.
- **Fix:** import from `expo-file-system/legacy` in clips.ts (and mock the same path in clips.test.ts). Acceptance greps (`createUploadTask`, `expo-file-system` in package.json) still satisfied.
- **Files modified:** lmc-app/app/lib/clips.ts, lmc-app/app/lib/clips.test.ts
- **Commit:** 6f39cee

**2. [Rule 3 - Blocking] vision-camera v5 ships no Expo config plugin**
- **Found during:** Task 3
- **Issue:** `npx expo install` resolved vision-camera 5.0.11, which has no `app.plugin.js` / config plugin and no `enableMicrophonePermission` option. The plan's required plugin entry would fail EAS prebuild (03-04). The research locked v4 (`^4.7.x`) precisely because v4 carries the plugin.
- **Fix:** pinned `react-native-vision-camera@^4.7.3` (plugin present, `enableMicrophonePermission` supported). Honors the plan's locked decision.
- **Files modified:** lmc-app/package.json
- **Commit:** ee2c58e

**3. [Rule 3 - Hygiene] reworded comments that tripped invariant greps**
- **Found during:** Tasks 2 + 4
- **Issue:** Explanatory comments in clips.ts/checks.ts contained the literal tokens `markDelivered`, `p_to:'delivered'`, `image-picker`, falsely tripping the strict acceptance greps / invariants script.
- **Fix:** reworded the prose (no behavioral change) so the gates match only real code paths.
- **Commit:** 744f333, 6c937f0

### Out-of-Scope (logged, NOT fixed)
- `app/lib/auth.test.ts` (6) and `app/lib/supabase.test.ts` (3) fail under full `vitest run` with `ReferenceError: __DEV__ is not defined` and a rolldown `Parse failure`. Confirmed pre-existing (fail identically with all 03-03 changes stashed). Logged to `deferred-items.md`. Not touched — unrelated to this plan's files.

## Blocked (later waves)
- **Wave 2 (03-04, deploy/native build):** a fresh EAS dev build is required before any on-device capture — vision-camera + expo-file-system are native deps the current build predates. Edge Functions deploy + Mux dashboard config (account, webhook URL, signing key, secrets) also land there.
- **Wave 3 (03-05, device camera + screen wiring):** `filming.tsx` submit is a temporary no-op (`TODO(03-05)`). The real `<Camera audio={false}>` recorder + `requestUploadUrl` → `uploadWithRetry` upload + `delivery.tsx` signed-HLS playback are wired in 03-05 and verified on a real device (no simulator camera).

## Self-Check: PASSED

All created files exist on disk (clips.ts, clips.test.ts, check-video-invariants.sh, 03-03-SUMMARY.md, deferred-items.md). All five task commits present in git history (b18876b, 6f39cee, 744f333, ee2c58e, 6c937f0).
