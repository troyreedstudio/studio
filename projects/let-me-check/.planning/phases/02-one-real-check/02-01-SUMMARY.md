---
phase: 02-one-real-check
plan: 01
subsystem: database
tags: [postgres, supabase, rls, state-machine, pgtap, realtime, security-definer]

# Dependency graph
requires:
  - phase: 01-foundation-auth-persistence-event-log
    provides: "checks table + check_status enum, transition_check() (unguarded), log_event() immutable event log, RLS (no client UPDATE on checks), ratings table, pgTAP harness"
provides:
  - "is_valid_check_transition() legal-edge table (Phase 2 subset)"
  - "Hardened transition_check(): valid-transition guard + actor authorization + deliver-needs-clip guard"
  - "accept_check() atomic first-wins claim (sole writer of scout_id)"
  - "clips placeholder table (FK to checks) + checks location columns + no_scout enum value"
  - "Narrow Scout SELECT RLS (open + own-assigned only) + clips RLS"
  - "checks added to the supabase_realtime publication (DISP-04 live status)"
  - "pgTAP contract: transition matrix + actor authz + atomic accept race + Scout RLS"
affects: [02-02 (live push + type regen checkpoint), 02-03 (lib/checks.ts + realtime client), 02-04 (seeker screens), 02-05 (scout screens), phase-3 (Mux clip columns slot into clips), phase-5 (geofence before accept_check)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Postgres-as-state-machine: a fixed legal-edge function gates every transition"
    - "SECURITY DEFINER self-authorization: definer fns check auth.uid() vs seeker_id/scout_id internally (RLS does not cover their writes)"
    - "Atomic first-wins claim via guarded UPDATE ... WHERE status='dispatching' AND scout_id IS NULL"
    - "Additive RLS: new Scout SELECT policies added alongside the seeker-own policy; no UPDATE path introduced"
    - "Realtime publication toggle version-controlled in a migration, not just the dashboard"

key-files:
  created:
    - supabase/migrations/0007_check_transitions.sql
    - supabase/migrations/0008_clips_location.sql
    - supabase/migrations/0009_scout_rls_realtime.sql
    - supabase/tests/check_transitions.test.sql
    - supabase/tests/accept_check_atomic.test.sql
    - supabase/tests/scout_rls.test.sql
  modified: []

key-decisions:
  - "Added a no_scout terminal enum value (distinct from cancelled/expired) for an honest no-Scout outcome (Research Open Q1)"
  - "clips as a first-class table (not a column on checks) so Phase-3 Mux columns slot in additively"
  - "is_valid_check_transition compares enum params on ::text to keep 0007 push-safe BEFORE 0008 adds the no_scout enum value (ordering fix)"
  - "Terminal no_scout/expired transitions allowed by the owning seeker (test-trigger this phase) OR the service role (auth.uid() null); automatic timeout deferred to Phase 5"

patterns-established:
  - "Legal-edge table: is_valid_check_transition(from,to) is the single source of transition legality, extended additively by later phases"
  - "Sole writers: transition_check owns status, accept_check owns scout_id — nothing else writes either"
  - "deliver-needs-clip: a check cannot reach delivered without a clips row (even a stub)"

requirements-completed: [CHECK-01, CHECK-02, CHECK-03, CHECK-05, CHECK-06, DISP-04]

# Metrics
duration: ~25min
completed: 2026-06-20
---

# Phase 2 Plan 01: Check State-Machine Spine Summary

**The server-side spine for one real check: a guarded, actor-authorized state machine (`transition_check` + `is_valid_check_transition`), an atomic first-wins `accept_check`, a `clips` placeholder table + location columns + `no_scout` state, narrow Scout RLS, and Realtime on `checks` — authored TDD-first with a full pgTAP contract, offline-verified, and ready for the Wave-2 live push.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 4/4 complete (TDD: 1 RED tests, 3 GREEN migrations)
- **Files created:** 6 (3 migrations + 3 pgTAP tests)
- **Commits:** 5 (1 test, 3 feat, 1 fix)

## Accomplishments
- Hardened `transition_check()` from "accepts anything" (Phase-1 stub) to a guarded state machine: rejects illegal jumps, authorizes the actor (only-seeker rate/cancel/dispatch, only-assigned-scout film/deliver), and refuses delivery without a clip — all inside the SECURITY DEFINER function so it self-authorizes.
- Added `accept_check()`, the atomic first-wins claim and the *only* writer of `scout_id`; two scouts racing leave exactly one assigned, the loser raises "already taken".
- Created the `clips` placeholder table (FK to `checks`), the `requested_lat/lng/location_label` columns, and the `no_scout` enum value — the seams Phase 3 (Mux) and the location follow-on fill with no further schema change.
- Opened a *narrow* Scout read path (open + own-assigned only, never another seeker's delivered check), secured `clips` RLS, and version-controlled the `supabase_realtime` publication toggle for `checks`.
- Wrote the full pgTAP contract FIRST (transition matrix, actor-authz negatives, two-scout race, Scout RLS count=0) so the migrations are written against a real test spec.

## Task Commits

1. **Task 1: pgTAP test matrix (RED)** — `26ab04d` (test)
2. **Task 2: Migration 0008 — clips + location + no_scout** — `947f526` (feat)
3. **Task 3: Migration 0007 — hardened transition_check + is_valid + accept_check** — `e07268b` (feat)
4. **Task 4: Migration 0009 — Scout RLS + clips RLS + Realtime** — `52ebf00` (feat)
5. **Deviation fix: push-safe enum ordering in 0007** — `198872a` (fix)

_Note: Task 3 was authored after Task 2 so the deliver-needs-clip guard could reference the real `clips` table; this matches the TDD GREEN order (schema before logic that depends on it)._

## Files Created
- `supabase/migrations/0007_check_transitions.sql` — `is_valid_check_transition()` legal-edge table, hardened `transition_check()` (guard + actor authz + deliver-needs-clip, same `log_event` shape as 0006), atomic `accept_check()`.
- `supabase/migrations/0008_clips_location.sql` — `public.clips` table (FK to checks, stub status), `checks.requested_lat/lng/location_label`, `no_scout` enum value.
- `supabase/migrations/0009_scout_rls_realtime.sql` — two narrow Scout SELECT policies, `clips` RLS (participant read + assigned-scout insert), `alter publication supabase_realtime add table public.checks`.
- `supabase/tests/check_transitions.test.sql` — valid/invalid transition matrix + actor-authz negatives + deliver-without-clip throw + event_log assertion (plan 11).
- `supabase/tests/accept_check_atomic.test.sql` — two-scout race → exactly one wins, loser leaves `scout_id` unchanged (plan 4).
- `supabase/tests/scout_rls.test.sql` — Scout sees open + own, count=0 for another seeker's delivered check (plan 4).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Made 0007 push-safe ahead of 0008's enum-add**
- **Found during:** Task 3 (then fixed before SUMMARY)
- **Issue:** Migration 0007 (`is_valid_check_transition`, a `LANGUAGE sql IMMUTABLE` function) is numbered before 0008, which adds the `no_scout` enum value. A SQL function resolves its literals at CREATE time, so embedding `'no_scout'::check_status` would fail on live push because the label does not exist yet at 0007's transaction. (Postgres also forbids using an enum value in the same transaction it is added, so simply moving the enum-add into 0007 is not an option.)
- **Fix:** `is_valid_check_transition` now compares the enum params cast to `::text` (`p_from::text = 'requested'` etc.) — identical semantics, zero create-time enum-label resolution, no forward dependency on 0008. The `plpgsql` bodies (`transition_check`'s `clips` reference and `no_scout`/`expired` comparisons) resolve only at execution time, after the full push, so they were already safe.
- **Files modified:** `supabase/migrations/0007_check_transitions.sql`
- **Commit:** `198872a`
- **Net effect:** The three migrations push cleanly in numeric order (0007 → 0008 → 0009) with no reordering or renaming, preserving the plan's locked filenames.

## Known Stubs
- `public.clips` rows are inserted with `status='stub'` (no real Mux asset/playback columns yet) — this is the **intentional** Phase-2 seam. Phase 3 adds the real Mux columns additively and replaces the stub insert with a real upload. Documented in the `clips` table comment and the Phase-2 research (Pattern 5). Does not block this plan's goal: a check can legitimately reach `delivered` with a stub clip this phase (no real camera until Phase 3).

## Blocked / Deferred (live push — Wave 2)
The following are intentionally **BLOCKED** this plan (no Docker locally; the live push is Plan 02's blocking checkpoint, run by Troy):
- `supabase db push` — apply 0007–0009 to the LIVE linked project. **BLOCKED: live push is Wave 2.**
- `supabase test db` — run the pgTAP matrix (goes GREEN once migrations are live). **BLOCKED: needs Docker/local DB.**
- `supabase db reset` — **BLOCKED: needs Docker.**
- `supabase gen types typescript` — regenerate `database.types.ts` for the new `clips` table + `accept_check`/`is_valid_check_transition` + location columns (needed before `lib/checks.ts` in Plan 03 type-checks). **Deferred to Wave 2 after the push.**
- Confirm `checks` appears under the `supabase_realtime` publication in the dashboard (the migration version-controls it; verify on-device). **Wave 2.**

## Offline Verification (this plan's gate — PASSED)
- All 6 files exist; the three test files end with `select * from finish();` then `rollback;`.
- Per-task greps pass: M0007_OK, M0008_OK, M0009_OK, TESTS_OK, plus every per-task acceptance criterion.
- Migration ordering is correct and contiguous: 0006 < 0007 < 0008 < 0009.
- No new `UPDATE` policy on `public.checks` anywhere in the three migrations (status/scout_id remain server-only).
- No Phase-3 Mux columns leaked into 0008 (`! grep mux_asset_id`, `! grep playback_id`).
- No TypeScript source changed this plan, so `tsc --noEmit` is not applicable.

## Migration Filenames to Push (Wave 2, in order)
1. `supabase/migrations/0007_check_transitions.sql`
2. `supabase/migrations/0008_clips_location.sql`
3. `supabase/migrations/0009_scout_rls_realtime.sql`

Then: `supabase test db` (pgTAP green) → `supabase gen types typescript` (regen `database.types.ts`) → confirm `checks` in the realtime publication.

## Self-Check: PASSED
- All 6 created files verified present on disk.
- All 5 commit hashes verified in `git log`.
