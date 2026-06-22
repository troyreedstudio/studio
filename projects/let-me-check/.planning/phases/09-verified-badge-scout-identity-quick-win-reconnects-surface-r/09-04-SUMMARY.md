---
phase: 09-verified-badge-scout-identity-quick-win-reconnects-surface-r
plan: "04"
subsystem: db-ops + client-types
tags: [migration, pgtap, types-regen, idor, supabase, tsc]
dependency_graph:
  requires:
    - 09-01 (migration 0017 authored — notification_prefs, preferred_cities, get_check_scout_public)
    - 09-02 (delivery.tsx get_check_scout_public call written with as-any cast)
    - 09-03 (notifications.tsx + preferred-cities.tsx + profile.tsx with as-any casts)
  provides:
    - 0017 live in production Supabase project (cawqasszfbzvbtunamda)
    - database.types.ts: typed notification_prefs, preferred_cities, get_check_scout_public
    - app-wide tsc clean after type regen
  affects:
    - Phase 9 device verification (badge, scout identity, reconnect screens all backed by real schema)
tech_stack:
  added: []
  patterns:
    - supabase db push --linked --include-all (migration behind remote history)
    - supabase gen types typescript --project-id for live schema capture
    - manual pgTAP verification via supabase db query --linked (no Docker available)
key_files:
  created: []
  modified:
    - lmc-app/app/lib/database.types.ts
decisions:
  - "pgTAP run via supabase db query --linked (Docker unavailable on this machine); all 6 assertions executed as raw SQL against the live DB and individually verified"
  - "0017 required --include-all flag because it was inserted before the 20260621000002 migration already on the remote history table"
  - "as-any casts in notifications.tsx, preferred-cities.tsx, delivery.tsx now have real types backing them — left in place as harmless (tsc clean)"
metrics:
  duration: "12m"
  completed_date: "2026-06-22"
  tasks_completed: 2
  files_created: 0
  files_modified: 1
---

# Phase 9 Plan 04: Live DB Push + pgTAP + Type Regen + tsc Clean Summary

Migration 0017 applied to the live Supabase project, all 6 pgTAP assertions verified green (IDOR cross-seeker denial confirmed), `database.types.ts` regenerated with `notification_prefs`, `preferred_cities`, and `get_check_scout_public` typed, and `npx tsc --noEmit` is clean across the full app.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Push 0017 to live DB + run pgTAP assertions | (live infra — no file commit) | supabase/migrations/0017_phase9_surface_reconnects.sql (applied) |
| 2 | Regen database.types.ts + tsc clean | c3c1c88 | lmc-app/app/lib/database.types.ts |

## What Was Built

### Task 1: Migration 0017 Live

- `supabase db push --linked --include-all` applied `0017_phase9_surface_reconnects.sql` to `cawqasszfbzvbtunamda`.
- Migration confirmed in `supabase_migrations.schema_migrations` (version `0017`, name `phase9_surface_reconnects`).
- `--include-all` was required because 0017's version string places it before the already-applied `20260621000002` migration.
- Schema changes confirmed live:
  - `profiles.notification_prefs` (jsonb, nullable) — present
  - `profiles.preferred_cities` (text[], nullable) — present
  - `public.get_check_scout_public(uuid)` function — present

### Task 1: pgTAP Assertions (all 6 GREEN)

Docker Desktop unavailable on this machine so `supabase test db` was not runnable. All pgTAP assertions from `supabase/tests/0017_phase9_reconnects.test.sql` were executed as raw SQL via `supabase db query --linked`:

| # | Assertion | Result |
|---|-----------|--------|
| 1 | `profiles.notification_prefs` column exists | PASS |
| 2 | `profiles.preferred_cities` column exists | PASS |
| 3 | `get_check_scout_public(uuid)` function exists | PASS |
| 4 | S1 reads "Jordan K." from own delivered check (D1) | PASS — display_name returned |
| 5 | IDOR: S1 cannot read scout of D2 (owned by S2) | PASS — exception raised: `get_check_scout_public: caller does not own check dddddddd-0017-0001-0001-000000000002` |
| 6 | Not-delivered gate: dispatching check rejected | PASS — exception raised: `get_check_scout_public: check dddddddd-0017-0001-0001-000000000003 not yet delivered (status=dispatching)` |

**The IDOR guard is confirmed working against the live database.**

### Task 2: Types Regen + tsc

- `supabase gen types typescript --project-id cawqasszfbzvbtunamda` regenerated `lmc-app/app/lib/database.types.ts`.
- Confirmed present in regenerated file:
  - `profiles.Row.notification_prefs: Json | null` (line 437)
  - `profiles.Row.preferred_cities: string[] | null` (line 439)
  - `Functions.get_check_scout_public: { Args: { p_check_id: string }; Returns: { avg_rating, clip_count, display_name }[] }` (line 1081)
- `cd lmc-app && npx tsc --noEmit` — clean (zero output, exit 0).
- Wave-2 `as-any` casts in `delivery.tsx`, `notifications.tsx`, `preferred-cities.tsx` remain harmless and in place; tsc does not object.

## Deviations from Plan

### Deviation: pgTAP via raw SQL instead of `supabase test db`

- **Found during:** Task 1
- **Issue:** `supabase test db` (both `--linked` and without flags) requires Docker Desktop to spin up a pg_prove container. Docker is not running on this machine.
- **Fix:** Ran all 6 assertions from `0017_phase9_reconnects.test.sql` as equivalent raw SQL via `supabase db query --linked`. All 6 pass with identical semantics to the pgTAP test file.
- **Impact:** None — the functional and security assertions are fully verified against the live DB. The Docker runner is a convenience wrapper; the SQL is the actual test.
- **Rule:** [Rule 3 - Blocking] Resolved by adapting test execution path.

### Deviation: `--include-all` required for db push

- **Found during:** Task 1
- **Issue:** 0017's filename places it chronologically before the `20260621000002` migration already in remote history. Supabase CLI flagged it as a "local migration to be inserted before the last remote migration" and refused without `--include-all`.
- **Fix:** Added `--include-all` flag. The migration itself is additive and idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`), so applying it out of the remote-history sequence is safe.
- **Rule:** [Rule 3 - Blocking] Resolved automatically.

## Known Stubs

None introduced in this plan. The only stub from prior plans (`scout_count` per city in preferred-cities.tsx) remains unchanged.

## Threat Flags

None. This plan is ops-only (migration push + type regen). No new network endpoints, auth paths, or schema changes at trust boundaries beyond what 0017 explicitly models (verified by pgTAP). The IDOR guard is confirmed active.

## Self-Check: PASSED

- `supabase_migrations.schema_migrations` contains version `0017`, name `phase9_surface_reconnects` — CONFIRMED
- `profiles.notification_prefs` and `profiles.preferred_cities` columns exist in live DB — CONFIRMED
- `get_check_scout_public` function exists and IDOR guard fires on cross-seeker access — CONFIRMED
- `lmc-app/app/lib/database.types.ts` contains `notification_prefs`, `preferred_cities`, `get_check_scout_public` — CONFIRMED
- `npx tsc --noEmit` returns clean (zero output) — CONFIRMED
- Commit `c3c1c88` present in git log — CONFIRMED
