---
phase: 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in
plan: "02"
subsystem: database
tags: [postgis, dispatch, geofence, pgtap, sql, migration, accept-check, dispatch-rpc, one-active-job, timeout-sweeper]
dependency_graph:
  requires: [05-01-dispatch-verification-spine]
  provides: [list_open_checks_for_scout, accept_check_v3, expire_stale_dispatching]
  affects: [05-03-verify-clip, 05-04-signage-check, 05-05-create-check, lmc-app/lib/dispatch.ts]
tech_stack:
  added: [expire_stale_dispatching pg_cron integration, one-active-job snapshot guard]
  patterns: [SECURITY DEFINER RPC geo-filter, geo-eligibility guard in accept path, service-role timeout sweeper]
key_files:
  created:
    - supabase/migrations/0012b_dispatch_rpc_accept.sql
    - supabase/tests/0012b_dispatch_accept.test.sql
  modified: []
decisions:
  - "list_open_checks_for_scout uses checks.coord fallback to venues.coord when checks.coord is null — defence in depth without blocking legacy rows"
  - "accept_check geo gate skips rather than blocks when checks.coord is null (legacy backfill gap) — honest Scout never hard-blocked by a missing geometry"
  - "one-active-job guard is a snapshot read (not row-locked) — acceptable at v1 Scout density per T-05-09/RESEARCH A2; advisory-lock solution deferred"
  - "expire_stale_dispatching uses make_interval(secs => v_timeout_s) to read dispatch_timeout_s from market_config — never hard-coded"
  - "pg_cron schedule wrapped in exception-swallowing DO block — migration is a no-op on tiers without pg_cron; Edge Function cron is the fallback"
  - "expireUnmatchedCheck in checks.ts kept as harmless client-side optimistic no-op — server sweeper is the authoritative path"
metrics:
  duration: "4 min"
  completed: "2026-06-21"
  tasks: 3
  files_created: 2
  files_modified: 0
---

# Phase 5 Plan 02: Geo-Filtered Dispatch RPC + accept_check v3 Summary

**One-liner:** Geo-filtered dispatch RPC (list_open_checks_for_scout) + hardened accept_check v3 (geo-eligibility + one-active-job guards) + server-side dispatch timeout sweeper (expire_stale_dispatching) — the full dispatch half of the verification moat.

## What Was Built

### Task 1 — Wave-0 RED pgTAP Test Suite (commit: b35f89d)

`supabase/tests/0012b_dispatch_accept.test.sql` — 9 assertions covering:

1. **DISP-01 near**: scout-NEAR (1,199 m) calling `list_open_checks_for_scout(25.77248, -80.1918)` returns 1 check (within 1500 m radius).
2. **DISP-01 far**: scout-FAR (1,998 m) calling the same RPC returns 0 checks (outside radius).
3. **DISP-02 geo**: scout-FAR calling `accept_check` raises `%outside%` (geo-ineligible).
4. **D-03 one-active-job**: scout-NEAR with an existing `assigned` check cannot accept a second open check — raises `%active job%`.
5. **Race winner**: eligible scout-RACE1 accepts the primary open check → returns `assigned`.
6. **Race loser**: scout-RACE2 accepts the now-claimed check → raises `%already taken%`.
7. **Race scout_id**: `scout_id` on the check row remains RACE1 (unchanged by the losing accept).
8. **DISP-03 stale**: `expire_stale_dispatching()` transitions a 20-min-old dispatching check to `no_scout`.
9. **DISP-03 fresh**: `expire_stale_dispatching()` leaves a fresh dispatching check untouched.

File is RED until 0012b lands on live Supabase (Wave 4 blocking task).

### Task 2 — Migration 0012b (commit: 21fe55c)

`supabase/migrations/0012b_dispatch_rpc_accept.sql` — 3 server-side functions:

**FUNCTION 1: `list_open_checks_for_scout(p_scout_lat, p_scout_lng)`**
- SECURITY DEFINER, `set search_path = public`
- NaN/null guard: `not (p_lat = p_lat)` IEEE-754 trick returns empty set (T-05-11)
- Reads `dispatch_radius_m` from `market_config` (never hard-coded; coalesced to 1500 m safe default)
- `ST_MakePoint(p_scout_lng, p_scout_lat)` — lng FIRST (Pitfall 1 protected)
- Geo filter: `c.coord` checked first; falls back to `v.coord` if `checks.coord` is null
- Returns `dispatching` + `scout_id IS NULL` checks only, ordered by `created_at asc`

**FUNCTION 2: `accept_check(p_check_id)` — v3**
- Full 0007/0010 body with TWO guards inserted before the atomic UPDATE:
- **(a) Geo-eligibility (T-05-07/DISP-02):** reads `scout_locations.coord` server-side; raises `Scout location unknown` if null; raises `outside the dispatch radius` if `ST_DWithin` fails on `checks.coord`
- **(b) One-active-job (D-03/T-05-08):** counts `assigned/filming/uploaded/processing`; raises `already has an active job` if > 0
- Atomic `UPDATE WHERE status='dispatching' AND scout_id IS NULL` unchanged
- `log_event('check.accepted', ...)` call shape unchanged from 0007

**FUNCTION 3: `expire_stale_dispatching()`**
- Service-role (auth.uid() null) loops over `dispatching + scout_id IS NULL` checks with `updated_at < now() - make_interval(secs => v_timeout_s)`
- Calls `transition_check(r.id, 'no_scout', ...)` which logs and releases the Stripe hold
- Returns the count of checks expired (useful for monitoring/alerting)
- pg_cron schedule guarded in a `DO $$ exception when others then null end $$` block — migration is safe on plans without pg_cron

### Task 3 — DISP-03 pgTAP Assertions (commit: 5d6275f)

Added Tests 8 and 9 to `0012b_dispatch_accept.test.sql`:
- Plan count updated from 7 to 9
- Test 8: stale check (20 min old) → `expire_stale_dispatching()` → `no_scout`
- Test 9: fresh check → `expire_stale_dispatching()` → still `dispatching`

## Deviations from Plan

None — plan executed exactly as written.

The plan's Task 3 spec said to ADD `expire_stale_dispatching` to the migration AND the pgTAP assertions to the test. The migration function was included in Task 2's commit (since Task 2 created 0012b and the sweeper is part of it architecturally). Task 3's commit added only the pgTAP assertions. The final artifact state matches the plan's specified files exactly.

## Known Stubs

None. This plan is pure SQL — no UI rendering paths, no hardcoded empty values in components.

The pg_cron schedule is wrapped in a no-op guard; if pg_cron is unavailable (Supabase free tier), the sweeper function still exists and must be called by a scheduled Edge Function. This is documented in the migration comment and is intentional, not a stub.

## Threat Flags

No new threat surface beyond what is covered in the plan's threat model. All five STRIDE threats in the plan's register are addressed:

| Flag | File | Description |
|------|------|-------------|
| T-05-07 addressed | 0012b_dispatch_rpc_accept.sql | accept_check reads scout_locations.coord server-side; client cannot bypass geo gate |
| T-05-08 addressed | 0012b_dispatch_rpc_accept.sql | one-active-job snapshot count raises on a second concurrent accept |
| T-05-09 accepted | 0012b_dispatch_rpc_accept.sql | Snapshot read not row-locked; acceptable at v1 Scout density (RESEARCH A2) |
| T-05-10 addressed | 0012b_dispatch_rpc_accept.sql | list_open_checks_for_scout SECURITY DEFINER returns only dispatching+unclaimed within radius |
| T-05-11 addressed | 0012b_dispatch_rpc_accept.sql | NaN/null guard in list_open_checks_for_scout returns empty set; accept_check raises on missing location |

## Next

Plan 03 (verify-clip Edge Function): reads `distance_m()` and `film_fence_max_m` from `market_config`, writes `clips.gps_verified`, calls `reset_check_for_redispatch()` on GPS rejection — all built against the contracts from Plans 01 + 02.

## Self-Check: PASSED

- `supabase/migrations/0012b_dispatch_rpc_accept.sql` exists (299 lines, 3 functions)
- `supabase/tests/0012b_dispatch_accept.test.sql` exists (238 lines, 9 assertions, plan(9))
- Task 1 commit b35f89d present in git log
- Task 2 commit 21fe55c present in git log
- Task 3 commit 5d6275f present in git log
- All plan grep gates pass (verified above during execution)
- `npx tsc --noEmit` clean (no client files touched)
- No new client UPDATE policy on checks or clips (DATA-02 preserved)
