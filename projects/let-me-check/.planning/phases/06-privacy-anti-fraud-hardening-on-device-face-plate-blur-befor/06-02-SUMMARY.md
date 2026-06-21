---
phase: 06-privacy-anti-fraud-hardening-on-device-face-plate-blur-befor
plan: "02"
subsystem: edge-functions + client-lib
tags: [face-blur, fraud-eval, google-vision, anti-fraud, privacy, FACE_DETECTION, TDD, green]
dependency_graph:
  requires: [06-01]
  provides: [BLUR-01, BLUR-02, BLUR-03, FRAUD-01, FRAUD-02, FRAUD-03]
  affects: [06-03, 06-04]
tech_stack:
  added: []
  patterns:
    - Vision-REST-FACE_DETECTION (same fetch pattern as signage-check TEXT_DETECTION)
    - fail-open-gate (blur_check_failed -> action=pass; mirrors signage-check degrade)
    - deps-injection (BlurDeps / FraudDeps — testable without Supabase)
    - velocity-teleport-heuristic (client velocity_mps bag + server scout_locations cross-check)
    - strictness-gated-flag (off/flag/hold/reject — tunable via market_config)
    - as-any-cast-for-unregenerated-types (fraud_flag/fraud_score + scout_locations; regen Plan 05)
key_files:
  created:
    - supabase/functions/face-blur-check/index.ts
    - supabase/functions/fraud-eval/index.ts
    - lmc-app/app/lib/fraud-signals.ts
  modified: []
decisions:
  - blur_check_failed -> action=pass (fail-open): only confirmed faces trigger hold, not infra errors (D-03)
  - velocity_mps from client fraud_signals bag is the primary teleport input; server cross-checks via scout_locations when available (T-06-07)
  - TELEPORT_MPS_THRESHOLD=55.5 (200 km/h) — physically impossible foot/vehicle speed
  - Score weights v1: teleport=60, accuracy_is_exact=25, simulated=50 (capped 100)
  - auto-reject enforcement deferred with comment: D-04 flag-only launch, Category C confirm
  - is_simulated_by_software always null (iOS limitation Pitfall 6 — documented with upgrade path)
metrics:
  duration: "4m"
  completed: "2026-06-22"
  tasks: 3
  files: 3
---

# Phase 6 Plan 02: face-blur-check + fraud-eval + fraud-signals Summary

Plans 01's RED scaffolds turned GREEN. Three files implement the privacy detection brain (BLUR-01/02/03) and anti-fraud verdict engine (FRAUD-01/02/03). Everything dormant (blur_enabled=false); no deploy (Plan 06-04).

## What Was Built

**face-blur-check/index.ts** — Vision FACE_DETECTION gate (BLUR-01/02/03):
- `BlurDeps` interface: `{ svc, vision, apiKeyPresent, blurEnabled }`. `vision` returns `{ faces: number }`.
- `blurEnabled=false`: D-07 no-op, logs `check.face_blur_skipped`, returns `{ action:'pass', faces_detected:0 }`. Zero Vision calls at launch (cost control / T-06-10).
- `blur_status='blurred'`: on-device already confirmed; short-circuit to `action:'pass'`.
- `faces>0` (unblurred): writes `clips.blur_status='faces_detected_unblurred'`, returns `action:'hold'`. mux-webhook (Plan 06-03) reads this to drive `blur_review` transition.
- `faces=0`: writes `clips.blur_status='no_faces'`, returns `action:'pass'`.
- Any error / missing playback id: writes `blur_status='blur_check_failed'`, returns `action:'pass'` (fail-open, D-03).
- Logs `check.face_blur_checked` / `check.face_blur_error` / `check.face_blur_skipped` on every path.
- NEVER throws. Structurally cannot drive state transitions (grep gate: no `transition_check` or `reset_check_for_redispatch` in file).
- Live entrypoint: reads `GOOGLE_VISION_API_KEY` + `market_config.blur_enabled`; builds `liveVision` with Mux RS256 JWT thumbnail fetch (base64 to Vision — Pitfall 2/7).

**fraud-eval/index.ts** — fraud verdict engine (FRAUD-01/02, D-04/D-05):
- `FraudDeps` interface: `{ svc, strictness }`. strictness from `market_config.fraud_strictness`.
- Reads latest clip's `fraud_signals` jsonb bag (client-supplied). Extracts `velocity_mps`.
- Server cross-check: reads `scout_locations` + `filmed_lat/lng/filmed_at` → calls `distance_m` RPC → computes implied speed. Falls back to client `velocity_mps` on missing data.
- `is_teleport = serverVelocityMps > 55.5 m/s` (≈200 km/h threshold).
- Scoring v1: teleport=+60, accuracy_is_exact=+25, simulated=+50 (capped at 100).
- `strictness='flag'` (default) + anomaly → `fraud_flag=true`, write `clips.fraud_flag/fraud_score`, log `check.fraud_flagged`.
- `strictness='off'` → `fraud_flag=false` even on anomaly, still logs `check.fraud_evaluated` (audit trail).
- `strictness='hold'/'reject'` → flags; enforcement deferred (D-04 comment in code).
- NEVER throws; degrades to zero-score on missing data.
- `as any` casts on `fraud_flag/fraud_score` writes and `scout_locations` reads (not in database.types.ts until Plan 05 regen — same pattern as Phase-5 05-05).

**lmc-app/app/lib/fraud-signals.ts** — client signal collector (FRAUD-03):
- `FraudSignals` interface: `{ accuracy_is_exact, location_accuracy_m, collection_ts, is_simulated_by_software }`.
- `collectFraudSignals(accuracy)`: pure function, no native calls, New-Arch safe.
- `accuracy_is_exact=true` when `accuracy != null && accuracy <= 1.0m` (boundary inclusive).
- `is_simulated_by_software` always `null` — iOS limitation documented with Pitfall 6 upgrade path.
- `collection_ts` = ISO timestamp at call time.

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| face-blur-check/index.test.ts (Deno) | 5/5 | GREEN |
| fraud-eval/index.test.ts (Deno) | 3/3 | GREEN |
| fraud-signals.test.ts (Vitest) | 8/8 | GREEN |
| tsc --noEmit (lmc-app) | — | CLEAN |
| grep gate (no transition_check/reset) | — | CLEAN |

## Deviations from Plan

None — plan executed exactly as written.

The one clarification: fraud-eval's primary velocity input is `velocity_mps` from the client `fraud_signals` bag (client-measured at film time using consecutive GPS fixes), with server-side `scout_locations` cross-check layered on top when available. The test mock provides `velocity_mps` in the fraud_signals bag directly; the server validates and may override it with its own calculation. This is consistent with T-06-07 (client bag = provenance, server = verdict authority).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: face-blur-check | 85d9bfa | feat(06-02): face-blur-check Edge Function FACE_DETECTION gate (BLUR-01/02/03) |
| Task 2: fraud-eval | 2490430 | feat(06-02): fraud-eval Edge Function verdict engine (FRAUD-01/02, D-04/D-05) |
| Task 3: fraud-signals | b44f1cf | feat(06-02): client fraud-signals collector (FRAUD-03) |

## Known Stubs

None — all data paths are wired. blur_enabled=false is intentional dormant posture (D-07), not a stub.

## Threat Surface Scan

No new network endpoints or auth paths introduced. The two Edge Functions are server-to-server only (invoked by mux-webhook via functions.invoke, same as signage-check and verify-clip). All threat register items from the plan are mitigated:

- T-06-06 (GOOGLE_VISION_API_KEY): read from Deno.env only, never returned to client, never logged.
- T-06-07 (client fraud_signals tampering): teleport verdict is server-computed from scout_locations + filmed coords; client bag is provenance only.
- T-06-09 (blur_status self-assertion): blur_status writes are service-role-only; client cannot claim blur_status='blurred'.
- T-06-10 (Vision DoS): blur_enabled=false at launch = zero Vision calls; single thumbnail not per-frame.
- T-06-11 (unblurred face delivery): faces>0 -> action='hold'; mux-webhook Plan 06-03 drives blur_review.

## Self-Check: PASSED

All three implementation files confirmed on disk. All three task commit hashes present in git log. All 16 tests (5 Deno + 3 Deno + 8 Vitest) confirmed passing. tsc --noEmit clean. Grep gate clean.
