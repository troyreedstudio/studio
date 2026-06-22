---
phase: 9
slug: verified-badge-scout-identity-quick-win-reconnects-surface-r
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-22
---

# Phase 9 — Validation Strategy

> Mostly client wiring + one small migration. Offline-verifiable: pgTAP (0017 RPC + columns + IDOR guard), tsc/vitest (client), grep (fake-data removed). Device: delivery shows real badge + real Scout; reconnected screens persist.

## Test Infrastructure
| Property | Value |
|----------|-------|
| Framework | pgTAP (0017: get_check_scout_public IDOR guard, notification_prefs/preferred_cities cols) + tsc/vitest (client) |
| Quick run | `cd lmc-app && npx tsc --noEmit` |
| Full | `deno test --allow-env supabase/functions/ && cd lmc-app && npx tsc --noEmit` + live pgTAP at deploy |

## Sampling Rate
- After each task: that task's `<automated>`.
- IDOR: a pgTAP test MUST assert a Seeker canNOT read another seeker's check's scout via get_check_scout_public.
- Verified badge: a test/grep asserts the badge renders ONLY on gps_verified===true.
- Fake removed: grep asserts no AI-verdict/crowd TAGS remain in delivery.tsx.

## Per-Task Verification Map
*Each task → its `<automated>` check (from the 4 PLAN files).*

| Plan | Task | Automated check |
|------|------|-----------------|
| 09-01 | T1 RED pgTAP 0017 | `grep -c "throws_ok" supabase/tests/0017_phase9_reconnects.test.sql` (file has IDOR + not-delivered throws_ok, both new columns, plan(6)) |
| 09-01 | T2 migration 0017 | `grep -c "raise exception" supabase/migrations/0017_phase9_surface_reconnects.sql` (security definer + search_path + `is distinct from auth.uid()`; NOT calling scout_earnings_totals) |
| 09-02 | T1 remove fake AI/crowd | `cd lmc-app && npx tsc --noEmit` (+ grep: no AI VERDICT/CROWD REPORT/TAGS/aiVerdictRow/tagRow; sectionLabel + RATE YOUR CHECK retained) |
| 09-02 | T2 real badge + scout RPC | `cd lmc-app && npx tsc --noEmit` (+ grep: `gps_verified === true`, `get_check_scout_public`, no "Jake C."/"247 videos") |
| 09-03 | T1 notification prefs persist | `cd lmc-app && npx tsc --noEmit` (+ grep: notification_prefs, getProfile, `from('profiles').update`, useEffect) |
| 09-03 | T2 preferred cities persist | `cd lmc-app && npx tsc --noEmit` (+ grep: preferred_cities, getProfile, Array.from, no mia/nyc seed) |
| 09-03 | T3 real profile stats | `cd lmc-app && npx tsc --noEmit` (+ grep: getProfile, listMyChecks, `from('ratings')`, no "Troy R."/"January 2026") |
| 09-04 | T1 live push + pgTAP | `supabase test db` passes 0017 (operator-run) |
| 09-04 | T2 regen types + tsc | `cd lmc-app && npx tsc --noEmit` (+ grep: notification_prefs, preferred_cities, get_check_scout_public in database.types.ts) |

**Wave-0 order:** 09-01 Task 1 (RED pgTAP) precedes Task 2 (migration) — correct Wave-0 sequencing. Live pgTAP green is the Wave-3 gate (09-04 Task 1).

## Wave 0 Requirements
- [ ] pgTAP for 0017 (RPC IDOR + new columns)
- [ ] grep gate for fake-AI/crowd removal

## Manual-Only (device)
| Behavior | Why | Instruction |
|----------|-----|-------------|
| Real Verified badge | needs a delivered clip | delivered clip with gps_verified shows ✓ Verified; an unverified one does not |
| Real Scout identity | needs delivered check | delivery shows the real Scout name/rating, not "Jake C." |
| Reconnects persist | needs device | saved places / recurring / notification prefs / preferred cities survive app restart |

## Validation Sign-Off
- [ ] Category-A tasks have automated verify
- [ ] IDOR + badge-conditional asserted
- [ ] nyquist_compliant true once map populated

**Approval:** pending (fast-track)
