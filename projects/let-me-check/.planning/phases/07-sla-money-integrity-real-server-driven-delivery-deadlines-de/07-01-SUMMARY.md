---
phase: 07-sla-money-integrity-real-server-driven-delivery-deadlines-de
plan: "01"
subsystem: database/sla-engine
tags: [migration, pgTAP, SLA, deadline, server-clock, state-machine]
dependency_graph:
  requires: [06-05]
  provides: [deadline_at column, accepted_at column, expire_stale_filming RPC, no_scout transition edges]
  affects: [supabase/migrations, supabase/tests, Plan 07-02, Plan 07-03, Plan 07-04]
tech_stack:
  added: []
  patterns: [SECURITY DEFINER CASE-from-tier, partial index WHERE status IN, pg_cron exception-swallow guard]
key_files:
  created:
    - supabase/migrations/0015_sla_deadline.sql
    - supabase/tests/0015_sla_deadline.test.sql
    - supabase/tests/0015_expire_stale_filming.test.sql
  modified: []
decisions:
  - "deadline clock starts at Scout-ACCEPT (accepted_at + tier window) per D-01 defaults; confirm with Troy at Wave-4 device review"
  - "deadline_at derived server-side inside accept_check SECURITY DEFINER from checks.tier — client cannot influence it (T-07-01)"
  - "assigned->no_scout and filming->no_scout edges added to is_valid_check_transition (BLOCKER-1 fix); do NOT add cancelled for service role (guard uses v_uid is distinct from v_seeker which blocks null uid by design)"
  - "expire_stale_filming is pure SQL (no Stripe call) — PI release is Plan 04 sla-sweeper Edge Function responsibility (Pitfall 4)"
  - "dispatch_timeout_s updated to 300 (5-min unclaimed, D-02)"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-22"
  tasks: 2
  files: 3
---

# Phase 7 Plan 01: SLA Deadline Engine Summary

Server-owned SLA clock via `accepted_at` + `deadline_at` on checks, seeded atomically in `accept_check` from tier (priority 420 s, standard 600 s), plus `expire_stale_filming()` sweeper and BLOCKER-1 transition edges.

## What Was Built

### Task 1 — RED pgTAP scaffolds (commit c866555)

Two test files written as intentionally failing assertions against the schema additions from Task 2.

**`supabase/tests/0015_sla_deadline.test.sql`** (5 tests):
- D-01a: `accept_check(priority)` returns `assigned`
- D-01b: `deadline_at - accepted_at = interval '420 seconds'` (priority tier)
- D-01a+: `accepted_at IS NOT NULL` after accept
- D-01c: `accept_check(standard)` returns `assigned`
- D-01c: `deadline_at - accepted_at = interval '600 seconds'` (standard tier)

**`supabase/tests/0015_expire_stale_filming.test.sql`** (7 tests):
- D-03a: past-deadline `assigned` check swept to `no_scout`
- D-03b: future-deadline `filming` check untouched
- D-03c: `deadline_at IS NULL` (legacy) check untouched (NULL-safety guard)
- Return count >= 1 when at least one expired row exists
- BLOCKER-1a: `is_valid_check_transition('assigned','no_scout')` IS TRUE
- BLOCKER-1b: `is_valid_check_transition('filming','no_scout')` IS TRUE

### Task 2 — Migration 0015 (commit 32fa1aa)

**`supabase/migrations/0015_sla_deadline.sql`** (358 lines, additive, idempotent):

1. **Additive columns**: `accepted_at timestamptz`, `deadline_at timestamptz` on `checks` (both nullable; ADD COLUMN IF NOT EXISTS)
2. **Partial index**: `checks_deadline_idx ON checks (deadline_at) WHERE status IN ('assigned','filming')` — excludes terminal/dispatching rows
3. **`accept_check` v4**: verbatim Phase 5 body + extended SET list:
   ```sql
   accepted_at = now(),
   deadline_at = now() + make_interval(secs =>
     case when tier::text = 'priority' then 420 else 600 end)
   ```
   Client supplies only `p_check_id`; server derives deadline from `checks.tier` inside SECURITY DEFINER (T-07-01)
4. **`is_valid_check_transition` updated**: adds `assigned -> no_scout` and `filming -> no_scout` edges (BLOCKER-1 fix); all 0014 edges preserved verbatim
5. **`expire_stale_filming()`**: sweeper over `status IN ('assigned','filming') AND deadline_at IS NOT NULL AND deadline_at < now()` → `transition_check(id, 'no_scout', {reason:'sla_deadline_missed'})`
6. **Data change**: `UPDATE public.market_config SET dispatch_timeout_s = 300` (5-min unclaimed window, D-02)
7. **pg_cron guard**: schedules `lmc-expire-filming` at `* * * * *`; exception-swallowed DO block safe on free tier; also re-schedules `lmc-expire-dispatching` for idempotency

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Deadline clock starts at Scout-accept | Unclaimed time covered by D-02 (dispatch timeout); promise starts when Scout commits |
| 420 s priority / 600 s standard hardcoded in migration | Easy to audit, requires explicit migration to change (no runtime magic) |
| BLOCKER-1: no `cancelled` edge for service role | `cancelled` actor-auth uses `v_uid is distinct from v_seeker` — TRUE for null uid, always raises by design; `no_scout` uses relaxed `v_uid is not null` form |
| expire_stale_filming has no Stripe call | PI release is Plan 04 concern; SQL-only sweeper is testable without Stripe credentials |
| dispatch_timeout_s = 300 | D-02 default; tunable per-market by ops without code deploy |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. This plan is pure SQL — no UI, no Edge Function. `deadline_at` values are written to the DB by `accept_check`; client reading is Plan 03's concern.

## Threat Surface Scan

No new network endpoints introduced. All additions are SQL SECURITY DEFINER RPCs callable only via Supabase REST/PostgREST. Threat register coverage:

| Flag | File | Description |
|------|------|-------------|
| Covered by T-07-01 | 0015_sla_deadline.sql | `deadline_at` derived server-side; client cannot supply it via accept_check |
| Covered by T-07-02 | 0015_sla_deadline.sql | `expire_stale_filming` only sweeps assigned/filming past non-null deadline; uploaded/processing/delivered excluded |
| Covered by T-07-04 | 0015_sla_deadline.sql | `transition_check` logs `check.status_changed` with `reason: sla_deadline_missed` to event_log |

No new unmitigated surface.

## Self-Check: PASSED

- `supabase/migrations/0015_sla_deadline.sql` exists, 358 lines, all 7 grep acceptance checks pass
- `supabase/tests/0015_sla_deadline.test.sql` exists, 5 pgTAP tests, `interval '420 seconds'` present
- `supabase/tests/0015_expire_stale_filming.test.sql` exists, 7 pgTAP tests, NULL-safety + BLOCKER-1 edges asserted
- Task 1 commit `c866555` confirmed in git log; Task 2 commit `32fa1aa` confirmed
- Both pgTAP files are RED by design (migration not yet pushed to live DB — Plan 04)
