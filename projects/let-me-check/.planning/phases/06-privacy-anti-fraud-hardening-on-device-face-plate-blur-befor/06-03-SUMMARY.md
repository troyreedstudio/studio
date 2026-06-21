---
phase: 06-privacy-anti-fraud-hardening-on-device-face-plate-blur-befor
plan: "03"
subsystem: edge-functions + client-lib
tags: [blur-gate, blur_review, fraud-eval, fraud-signals, mux-webhook, mux-upload-url, filming, clips, TDD, green, BLUR-04, BLUR-05, FRAUD-01, FRAUD-02]
dependency_graph:
  requires: [06-01, 06-02]
  provides: [BLUR-04, BLUR-05, FRAUD-01, FRAUD-02]
  affects: [06-04]
tech_stack:
  added: []
  patterns:
    - blur-gate-before-delivered (step 6c: GPS gate -> blur gate -> delivered chain)
    - fail-open-gate (blur-check throws -> action=pass; mirrors verify-clip/signage pattern)
    - fire-and-forget-advisory (fraud-eval after delivered; same pattern as signage-check)
    - deps-injection (mockSvc blurAction + blurCheckThrows — testable without Supabase)
    - isPlainObject-validation (V5: only persist plain-object fraud_signals; mirrors isFiniteNum GPS)
    - as-any-cast-for-unregenerated-types (filming.tsx FraudSignals -> Record cast; regen Plan 05)
key_files:
  created: []
  modified:
    - supabase/functions/mux-webhook/index.ts
    - supabase/functions/mux-webhook/index.test.ts
    - supabase/functions/mux-upload-url/index.ts
    - lmc-app/app/(scout)/filming.tsx
    - lmc-app/app/lib/clips.ts
    - lmc-app/app/lib/clips.test.ts
decisions:
  - blur gate (step 6c) fires BEFORE uploaded/processing/delivered — check still in filming at that point; uses filming->blur_review edge (0014)
  - fail-open on face-blur-check error: only a confirmed hold blocks delivery (consistent with verify-clip/signage "can't reject what we can't verify")
  - fraud-eval is fire-and-forget AFTER stripe-capture (step 8b) — advisory only, never blocks delivery at launch (D-04 flag-only)
  - isPlainObject validation for fraud_signals mirrors isFiniteNum GPS: non-plain-objects silently dropped
  - client FraudSignals cast to Record<string,unknown> with as-any at filming.tsx call site (regen Plan 05 will fix the type gap)
metrics:
  duration: "6m"
  completed: "2026-06-22"
  tasks: 3
  files: 6
---

# Phase 6 Plan 03: blur gate + fraud-eval wiring + fraud_signals chain Summary

Privacy gate wired end-to-end: mux-webhook now holds detected-face clips in `blur_review` before delivering, fraud-eval runs advisory fire-and-forget post-delivery, and the fraud signal bag travels from the Scout's Record press through filming.tsx → clips.ts → mux-upload-url → clips.fraud_signals.

## What Was Built

**mux-webhook/index.ts** — step 6c blur gate + step 8b fraud-eval (BLUR-04/05, D-03/D-04/D-07):
- Step 6c inserted AFTER the GPS gate (step 6b) and BEFORE the uploaded/processing/delivered chain (step 7). The check is still in `filming` at this point — the legal edge is `filming -> blur_review` (migration 0014, Plan 06-01).
- `face-blur-check` invoked with try/catch: on error → `blurResult = { data: null }` (fail-open, BLUR-05). On `action === 'hold'` → `transition_check(blur_review)` + return `blur_held` 200 (privacy invariant: stripe-capture never fires, Seeker not charged, Scout not paid).
- When `blur_enabled=false` (launch default), face-blur-check returns `action='pass'` immediately → gate is a structural no-op at launch.
- Step 8b: `fraud-eval` invoked fire-and-forget after stripe-capture. try/catch swallows all errors — a fraud-eval failure never undoes a completed delivery (D-04 flag-only, T-06-16).
- Heavy comments on both blocks cite the design decisions (D-03/D-04/D-07, BLUR-04/05).

**mux-webhook/index.test.ts** — 10 tests green (5 existing + BLUR-04 + BLUR-05 + fraud-eval + 2 GPS):
- `mockSvc` gains `blurAction?: 'pass'|'hold'` and `blurCheckThrows?: boolean` options (mirrors `verifyClipPassed`).
- `face-blur-check` branch in the invoke mock: `blurCheckThrows` → `Promise.reject`; `blurAction` → `{ data: { action } }`; undefined → `{ data: null }` (all 7 pre-existing tests unaffected).
- BLUR-04 test: asserts `transition_check(blur_review)` called, no `delivered`, no `stripe-capture`.
- BLUR-05 test: asserts error falls through to full `delivered` + `stripe-capture` (fail-open).
- Fraud-eval test: asserts `fraud-eval` invoke present on delivered path with correct `checkId`.

**mux-upload-url/index.ts** — accepts + persists `fraud_signals` (FRAUD-03, T-06-07):
- `handleUploadUrl` input gains `fraud_signals?: Record<string, unknown>`.
- `isPlainObject` validator (V5): `typeof === 'object' && !== null && !Array.isArray` — non-plain-objects silently dropped (mirrors `isFiniteNum` GPS pattern).
- `fraudSignalsUpdate` spread into the clips INSERT alongside `gpsUpdate`.
- Live entrypoint parses `body.fraud_signals` and forwards to `handleUploadUrl`.
- Comment: client-supplied provenance only; fraud verdict recomputed server-side by fraud-eval (T-06-07).

**filming.tsx** — collects fraud signals at GPS-stamp time (FRAUD-03):
- TODO comment added at top of file: `// TODO(phase-7): extract the HUD/steps/trouble UI out of filming.tsx — file is >500 lines; refactor BEFORE any further Phase-7 edits.`
- Import: `collectFraudSignals, FraudSignals` from `../lib/fraud-signals`.
- `capturedFraud` ref (`useRef<FraudSignals | null>(null)`).
- In `stampGps()`: `capturedFraud.current = collectFraudSignals(pos.coords.accuracy ?? undefined)` after `capturedGps.current` is set. Best-effort — inside the same try/catch that already guards GPS failure.
- In `handleSubmit()`: passes `capturedFraud.current as any ?? undefined` as the fourth arg to `clipUpload.submit`.
- Total new lines in filming.tsx: 5 (TODO comment + import + ref + collect + submit wire). Minimal as required.

**clips.ts** — threads `fraudSignals` through the upload path (FRAUD-03):
- `requestUploadUrl(checkId, gps?, fraudSignals?)` — spreads `{ fraud_signals: fraudSignals }` into the `invokeEdgeFunction('mux-upload-url', ...)` body when `fraudSignals != null`.
- `UseClipUpload.submit` type gains `fraudSignals?: Record<string, unknown>`.
- `useClipUpload().submit(checkId, localPath, gps?, fraudSignals?)` — passes `fraudSignals ?? undefined` to `requestUploadUrl`. Backward-compatible (new param optional).

**clips.test.ts** — rewritten to match current fetch-based invokeEdgeFunction + uploadAsync API:
- Mocks `fetch` globally (invokeEdgeFunction uses plain fetch, not `supabase.functions.invoke`).
- Mocks `supabase.auth.getSession` (invokeEdgeFunction reads the session token).
- Mocks `expo-file-system/legacy` with `uploadAsync` + `getInfoAsync` (not the old `createUploadTask`).
- 13 tests green: requestUploadUrl body shape (checkId, GPS fields, fraud_signals present/absent), getPlaybackToken, uploadClip (2xx/5xx/progress), uploadWithRetry (retry loop, max-exhausted), VID-03 invariant (no supabase.rpc).

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| mux-webhook/index.test.ts (Deno) | 10/10 | GREEN |
| clips.test.ts (Vitest) | 13/13 | GREEN |
| tsc --noEmit (lmc-app) | — | CLEAN |
| grep gate (blur_review + face-blur-check + fraud-eval in mux-webhook) | — | CLEAN |
| grep gate (fraud_signals in mux-upload-url + clips.ts; collectFraudSignals in filming.tsx) | — | CLEAN |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] clips.test.ts was broken against the current clips.ts implementation**
- **Found during:** Task 3 verification (`npx vitest run app/lib/clips.test.ts`)
- **Issue:** clips.test.ts was written for the old Phase-3 clips.ts which used `createUploadTask` and `supabase.functions.invoke`. Phase-5 refactored clips.ts to use `uploadAsync` (no EventEmitter, New Arch compatible) and `invokeEdgeFunction` (plain `fetch`, bypassing the Hermes hang). The test mock for `expo-file-system/legacy` exported `createUploadTask` but not `uploadAsync`/`getInfoAsync`; the supabase mock had `functions.invoke` but clips.ts no longer calls it. 7 of 10 tests were already failing before this plan's changes.
- **Fix:** Rewrote clips.test.ts to mock `fetch` globally (for `invokeEdgeFunction`), mock `supabase.auth.getSession` (for the session token), and mock `uploadAsync`/`getInfoAsync` (for the legacy upload path). Added 3 new fraud_signals body assertions. Old `createUploadTask` mock removed.
- **Files modified:** `lmc-app/app/lib/clips.test.ts`
- **Commit:** c79e869 (included in Task 3 commit)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: mux-webhook blur gate + fraud-eval | 08a03ba | feat(06-03): mux-webhook blur gate (blur_review) + fraud-eval fire-and-forget |
| Task 2: mux-upload-url fraud_signals | 8fd51b3 | feat(06-03): mux-upload-url persists fraud_signals onto clips row |
| Task 3: filming.tsx + clips.ts chain | c79e869 | feat(06-03): collect + forward fraud_signals from filming.tsx through clips.ts |

## Known Stubs

None — all data paths are wired. `blur_enabled=false` (the launch dormant posture, D-07) is intentional, not a stub. `fraud-eval` advisory-only with `strictness=flag` is intentional (D-04 flag-only launch), not a stub.

## Threat Surface Scan

No new network endpoints or auth paths introduced. The blur gate and fraud-eval fire-and-forget are server-to-server calls inside mux-webhook (service role, sig-verified). All threat register items from the plan are addressed:

- T-06-12 (unblurred delivery): blur gate (step 6c) holds in `blur_review` on `action=hold` BEFORE delivered + stripe-capture. Privacy invariant enforced.
- T-06-13 (face-blur-check error blocking delivery): fail-open catch (BLUR-05) — invoke error falls through to deliver. Acceptable at launch (blur_enabled=false).
- T-06-14 (client forging fraud_signals): fraud-eval recomputes teleport server-side; client bag is provenance only. Mitigated.
- T-06-15 (client driving blur_review/delivered): DATA-02 unchanged; transition_check actor-authz (0012) blocks non-service callers. Mitigated.
- T-06-16 (fraud-eval failure cascading): fire-and-forget try/catch (step 8b) — fraud-eval failure never undoes a delivered clip. Mitigated.

## Self-Check: PASSED

All 5 modified/created files confirmed on disk. All 3 task commits (08a03ba, 8fd51b3, c79e869) present in git log. 10 Deno tests + 13 Vitest tests confirmed passing. tsc --noEmit clean. All grep gates passed.
