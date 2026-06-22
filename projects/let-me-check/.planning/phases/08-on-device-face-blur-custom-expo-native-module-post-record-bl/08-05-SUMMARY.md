---
phase: 08-on-device-face-blur-custom-expo-native-module-post-record-bl
plan: 05
subsystem: on-device-face-blur
tags: [native-ios, core-image, blur, upload, privacy, clips, expo-file-system]
status: awaiting-device-checkpoint
requires:
  - "LmcFaceBlur per-face proportional blur (08-03/08-04)"
  - "blurFaces wrapper + BlurResult contract (08-02/08-03)"
  - "useClipUpload.submit() upload seam (Phase 3 VID-03)"
provides:
  - "BLUR_POST_RECORD_ENABLED flag (default TRUE for beta) gating the post-record blur path"
  - "blurFacesWithFallback() — ordered gaussian -> retry gaussian -> retry pixelate -> 'failed'"
  - "clips.ts submit() blurs on-device BEFORE upload; uploads the BLURRED file; deletes the raw on success; 'failed' never uploads the raw as a normal delivery"
  - "'securing' ClipUploadStatus + 'Securing your clip…' UX in filming.tsx"
  - "Soft OVAL feathered face-blur mask in LmcFaceBlur (no square censor box)"
affects:
  - "Plan 08-06 cleanup removes the dev BLUR buttons; Phase 6 end-to-end confirms the DELIVERED clip is blurred"
tech-stack:
  added:
    - "Core Image CIRadialGradient + CIBlendWithMask for the feathered oval alpha mask"
    - "expo-file-system/legacy deleteAsync for post-upload raw cleanup"
  patterns:
    - "Flag-gated privacy step inserted at the single upload seam (OFF = byte-for-byte today's flow)"
    - "Ordered fallback chain (retry -> alternate mode -> server hold) so a blur failure never delivers an unblurred face and never blocks the working upload"
    - "Anisotropically-scaled radial gradient -> face-shaped oval alpha; opaque to 88% radius then feather to clear in the +20% background padding"
    - "Delete the raw capture ONLY after a successful blurred upload (never on 'failed')"
key-files:
  created:
    - lmc-app/app/lib/blur-native.test.ts
  modified:
    - lmc-app/modules/lmc-blur/ios/LmcFaceBlur.swift
    - lmc-app/app/lib/blur-config.ts
    - lmc-app/app/lib/blur-native.ts
    - lmc-app/app/lib/clips.ts
    - lmc-app/app/lib/clips.test.ts
    - lmc-app/app/(scout)/filming.tsx
decisions:
  - "Oval feathered mask = CIRadialGradient (opaque to 88% radius, clear by edge) anisotropically scaled to the padded rect aspect, blended over the blurred crop via CIBlendWithMask. Privacy coverage UNCHANGED — face core + hairline stays 100% blurred; only the outer ~12% (background padding) softens."
  - "BLUR_POST_RECORD_ENABLED defaults TRUE — the beta wants every delivered clip auto-blurred (08-CONTEXT: on-device blur is non-negotiable). The flag stays so the path can be flipped off instantly without code changes."
  - "On blur 'failed' (after retry->pixelate) the client REFUSES the clip (status 'error', Scout retakes) AND records a blur_failed marker via requestUploadUrl so the dormant server-side detect-and-hold net is the last resort. Chosen over silently uploading the raw — guarantees D-07 (no unblurred face delivered)."
  - "Raw deleted with deleteAsync(idempotent) only AFTER the blurred upload PUT succeeds (Pitfall 6); never on 'failed' (the fallback/retry still needs the file)."
  - "Test isolation: mock ./blur-native + ./blur-config in clips.test.ts so the native lmc-blur module (references RN __DEV__) never loads under vitest — fixes the import-time regression my new imports introduced."
metrics:
  tasks: 3
  tasks_completed_autonomously: 2
  files: 7
  duration: 1
  completed: 2026-06-22
---

# Phase 8 Plan 5: Wire Post-Record Blur Into Upload + Soft Oval Mask Summary

Two deliverables in one pass. (A) Rounded + feathered the face-blur mask so it reads as a natural oval, not a hard square censor box. (B) Step 5 of the 6-step de-risk plan: wired the proven blur module into the real upload flow at the single seam in `submit()`, behind `BLUR_POST_RECORD_ENABLED` (defaulted TRUE for the beta), with the privacy-safe fallback chain so a blur failure NEVER delivers an unblurred clip and NEVER blocks the working upload. Autonomous tasks complete + committed; the device build is the orchestrator's checkpoint.

## What Was Built

### (A) Soft oval feathered mask — `LmcFaceBlur.swift`
- Replaced the hard SQUARE per-face composite with a FEATHERED ELLIPSE. New `featheredOval(blurred:faceRect:)`: builds a `CIRadialGradient` (opaque white out to ~88% radius, clear by the edge), anisotropically scales the circular gradient to the padded rect's aspect so it becomes a face-shaped oval, then `CIBlendWithMask` blends the blurred crop over a transparent backdrop through that oval alpha. Compositing the result over the sharp frame gives a blur that fades smoothly into the background instead of a hard cut.
- Privacy unchanged: the face core + hairline (the +20% padding box) stays 100% blurred; only the outermost ~12% (which sits in the background padding, not on the face) softens. Errs toward coverage.

### (B) The wiring (Step 5)
- **`blur-config.ts`** — added `BLUR_POST_RECORD_ENABLED` (default **TRUE**), the master switch for the post-record path. Separate from the abandoned live-viewfinder `BLUR_NATIVE_ENABLED`.
- **`blur-native.ts`** — added `blurFacesWithFallback(localPath)`: gaussian → retry gaussian → retry pixelate → `'failed'` (06-RESEARCH-BLUR-V2 Fallback). Never throws on a blur failure (resolves `'failed'`).
- **`clips.ts` `submit()`** — when the flag is ON: `setStatus('securing')` → `blurFacesWithFallback`. `'blurred'` uploads the blurred `outputPath` then deletes the raw on success; `'no_faces'` uploads the original; `'failed'` does NOT upload the raw as a normal delivery — it surfaces an error (Scout retakes) and records a `blur_failed` marker so the dormant server hold catches anything that reaches Mux. Flag OFF = byte-for-byte today's flow. Added `'securing'` to `ClipUploadStatus`. Uses the existing `invokeEdgeFunction` fetch pattern (no `supabase.functions.invoke`). clips.ts stays at 406 lines.
- **`filming.tsx`** — renders a "Securing your clip…" state (spinner + copy, no em-dash) for status `'securing'`, transitioning into the existing upload progress UI. `handleSubmit`'s contract is unchanged (the blur happens inside `submit()`). The dev BLUR buttons are LEFT in place for now (removed in 08-06).

### Tests
- **`clips.test.ts`** — mocked `./blur-native` + `./blur-config` (flag defaults FALSE in the mock) so the native module never loads under vitest; all 13 existing tests green again. Added `deleteAsync` to the file-system mock.
- **`blur-native.test.ts`** (new) — 6 tests asserting the fallback ORDER and terminal result: first-success, no_faces passthrough, retry-then-success, pixelate fallback, fully-failed → `'failed'`, and unexpected-throw → `'failed'`. This is the privacy contract under test.

## Tasks

| Task | Name | Status | Commit |
|------|------|--------|--------|
| A | Soft oval feathered blur mask (LmcFaceBlur) | Done | 8c176f0 |
| 1 | Flag-gated blur step + fallback in submit() (+ config/native + tests) | Done | f4526bf |
| 2 | filming.tsx 'Securing your clip…' UX | Done | f4526bf |
| 3 | [DEVICE BUILD] Step-5 gate (flag ON/OFF + forced failure) | Handed to orchestrator (checkpoint:human-verify) | — |

## Verification

- `cd lmc-app && npx tsc --noEmit` → clean (exit 0).
- `npx vitest run app/lib/clips.test.ts app/lib/blur-native.test.ts` → 19/19 pass.
- clips.ts 406 lines, LmcFaceBlur.swift 244 lines, blur-native.ts 85, blur-config.ts 56 — all <500.
- No sibling-project files staged (cross-contamination check: only `lmc-app/**` + `.planning/**` touched).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] New blur import broke clips.test.ts (`__DEV__ is not defined`)**
- **Found during:** Task 1 verification (full test run).
- **Issue:** Importing `./blur-native` into clips.ts pulled the native `lmc-blur` module into the vitest module graph, which references RN's `__DEV__` at import time and threw, failing all 13 clips tests (they passed before).
- **Fix:** Mocked `./blur-native` and `./blur-config` in clips.test.ts so the native module never loads under node; added `deleteAsync` to the file-system mock. All 13 green again.
- **Files modified:** app/lib/clips.test.ts
- **Commit:** f4526bf

**2. [Rule 2 - Missing critical functionality] No test for the fallback chain (the privacy contract)**
- **Found during:** Task 1.
- **Issue:** The ordered fallback is the single most important privacy guarantee but had no automated coverage; hook-level testing of `submit()` is not feasible (no jsdom/hook lib).
- **Fix:** Added `blur-native.test.ts` with 6 tests over `blurFacesWithFallback` covering order + terminal `'failed'`.
- **Files modified:** app/lib/blur-native.test.ts (new)
- **Commit:** f4526bf

**3. [Rule 1 - Copy rule] Em-dash in existing processing copy**
- **Found during:** Task 2 (editing the upload-status block).
- **Issue:** The "We're finishing your clip — the Seeker gets it" line used an em-dash, against the project copy rule.
- **Fix:** Changed to a comma.
- **Files modified:** app/(scout)/filming.tsx
- **Commit:** f4526bf

### Notes (within plan discretion)
- The `'failed'` branch surfaces an error to the Scout (retake) AND records a `blur_failed` marker — both belt and suspenders for D-07. The plan explicitly allowed either path; this uses both.
- `BLUR_POST_RECORD_ENABLED` defaulted TRUE (the plan said default false). Per the orchestrator's explicit instruction the beta wants blur ON by default; documented in the flag comment.

## Deferred Issues (out of scope)
- `app/lib/scout-location.test.ts`: 7 pre-existing failures (`supabase.rpc is not a function`) — a test-mock gap that predates this plan. Logged in `deferred-items.md`.
- `app/(scout)/filming.tsx` is 798 lines (>500), pre-existing (TODO at top of file). The 08-05 change was a small presentational addition; extract in 08-06.

## Known Stubs
None that affect the plan's goal. The `'failed'` server-hold escalation rides the existing dormant Phase-6 net (`face-blur-check` / `blur_review`, `market_config.blur_enabled` default FALSE) — that gate is intentionally dormant per 08-CONTEXT D-04 and is the documented last-resort, not a stub introduced here.

## DEVICE CHECKPOINT — handed to orchestrator

Task 3 is the Step-5 device gate (`checkpoint:human-verify`). Autonomous work is complete and committed; the orchestrator runs the build (flag is ON by default now).

**Exact command (orchestrator runs it — do NOT run expo run:ios from this executor):**

```
cd lmc-app && npx expo run:ios --configuration Release --device <udid>
```

(If the lmc-blur native frameworks were not previously linked: `cd lmc-app && npx expo prebuild --clean -p ios` first.)

**PASS check:**
1. "Build Succeeded".
2. Flag ON (default): accept → film a FACE → submit. Scout sees "Securing your clip…" then upload progress; the clip uploads (status processing). The DELIVERED clip to the Seeker shows the face blurred with a SOFT OVAL (not a square box), and the raw is gone from tmp after.
3. Flag OFF (flip `BLUR_POST_RECORD_ENABLED=false`): full Scout flow uploads as today, no 'securing' state — confirm NO regression.
4. Forced-failure (flag ON): feed a corrupt/zero-byte input so blurFaces returns 'failed' → the app does NOT upload the sharp file as a normal delivery; it retries/pixelates then surfaces a retry + records the hold signal.
5. No crash across repeated submits.

## Self-Check: PASSED

- All created/modified files verified present (LmcFaceBlur.swift, blur-config.ts, blur-native.ts, clips.ts, clips.test.ts, blur-native.test.ts, filming.tsx + this SUMMARY).
- Both task commits verified in git: 8c176f0 (oval mask), f4526bf (wiring + tests).
- tsc clean (exit 0); clips + blur-native suites 19/19 green; all touched files <500 lines except the pre-existing filming.tsx (deferred).
</content>
