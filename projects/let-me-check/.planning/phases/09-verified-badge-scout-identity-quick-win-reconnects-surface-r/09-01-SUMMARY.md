---
phase: 09-verified-badge-scout-identity-quick-win-reconnects-surface-r
plan: "01"
subsystem: database
tags: [migration, security, rpc, idor, pgtap, profiles]
dependency_graph:
  requires:
    - 0005_rls_policies (profiles_update_own covers new columns — no widening needed)
    - 0004_core_entities (ratings table, checks table)
    - 0016_scout_earnings (pattern mirror; IDOR pitfall documented)
  provides:
    - profiles.notification_prefs jsonb
    - profiles.preferred_cities text[]
    - public.get_check_scout_public(uuid) SECURITY DEFINER RPC
  affects:
    - supabase/tests/0017_phase9_reconnects.test.sql (RED until 0017 pushed)
    - Plan 09-02 (scout identity client wiring needs this RPC)
    - Plan 09-03 (notifications/preferred-cities screens write to new columns)
    - Plan 09-04 (live push + pgTAP run + type regen)
tech_stack:
  added: []
  patterns:
    - SECURITY DEFINER RPC with IDOR guard (mirrors 0016 scout_earnings pattern)
    - Inlined subquery for cross-user count (avoids IDOR self-trap from nested SECURITY DEFINER)
    - pgTAP RED test with set local role authenticated + request.jwt.claim.sub
key_files:
  created:
    - supabase/migrations/0017_phase9_surface_reconnects.sql
    - supabase/tests/0017_phase9_reconnects.test.sql
  modified: []
decisions:
  - "Inline clip_count via count(*) subquery rather than calling scout_earnings_totals — that function has its own IDOR guard that raises when auth.uid() (Seeker) != p_scout_id (Scout), causing a self-trap from within a SECURITY DEFINER context"
  - "No RLS widening in 0017 — profiles_update_own (0005) is row-level (auth.uid()=id), automatically covers new jsonb/text[] columns"
  - "avg_rating computed via ratings JOIN checks subquery in the RPC body — no denormalized column on profiles (avoids drift)"
  - "Null scout guard: if v_scout_id IS NULL after ownership + status gates pass, return empty (0 rows) so delivery.tsx falls back to generic Your Scout label"
metrics:
  duration: "2m"
  completed_date: "2026-06-22"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 9 Plan 01: Migration 0017 — Profiles Columns + IDOR-safe Scout RPC Summary

Migration 0017 adds `notification_prefs jsonb` + `preferred_cities text[]` to `profiles` and creates the `get_check_scout_public(uuid)` SECURITY DEFINER RPC with a three-layer IDOR defence (check ownership + status gate + anon denial via `is distinct from`). Inlined `clip_count` subquery avoids the `scout_earnings_totals` self-trap.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RED pgTAP — IDOR guard + columns + scout identity | 8889218 | supabase/tests/0017_phase9_reconnects.test.sql |
| 2 | Migration 0017 — two profile columns + get_check_scout_public RPC | a2000b2 | supabase/migrations/0017_phase9_surface_reconnects.sql |

## What Was Built

### Migration 0017 (`supabase/migrations/0017_phase9_surface_reconnects.sql`)

Two changes, additive only:

**Profile columns (idempotent `add column if not exists`):**
- `notification_prefs jsonb` — stores the Seeker's notification toggle state keyed by notification ID. `NULL` = use client defaults.
- `preferred_cities text[]` — array of market IDs the Seeker follows for trending notifications. `NULL` = all cities.

No RLS policy changes needed. The existing `profiles_update_own` policy in migration 0005 is row-level (`auth.uid() = id`) and covers all columns, including the new ones.

**SECURITY DEFINER RPC `get_check_scout_public(p_check_id uuid)`:**
- `set search_path = public` (matches all existing SECURITY DEFINER functions in this codebase)
- Returns `(display_name text, avg_rating numeric, clip_count bigint)`
- Three raised-exception guards in order:
  1. `check not found` — if the `p_check_id` does not exist
  2. `caller does not own check` — IDOR gate: `v_seeker_id is distinct from auth.uid()`. Handles the anonymous caller case: `auth.uid()` returns `null` for anon; `null is distinct from` any non-null `seeker_id` is always `true`, so anon is denied without a separate null check.
  3. `check not yet delivered` — status gate: only `'delivered'` or `'rated'` statuses expose a scout
- Null scout guard: if `v_scout_id` is null (orphaned delivered check), `return;` (empty result set — 0 rows)
- `avg_rating`: subquery over `ratings JOIN checks` filtered to the scout's delivered/rated checks, rounded to 1 dp. Returns `null` for a fresh Scout with no ratings (client handles null gracefully).
- `clip_count`: inlined `count(*)` over delivered/rated checks for the scout. **Never calls `scout_earnings_totals`** — that function has its own IDOR guard that raises `'forbidden'` when `auth.uid()` (the Seeker) differs from `p_scout_id` (the Scout), causing a self-trap from within this SECURITY DEFINER context.

### pgTAP Test (`supabase/tests/0017_phase9_reconnects.test.sql`)

RED by design — assertions describe the schema that migration 0017 creates. These tests will fail until 0017 is pushed to the live DB (that is Plan 04's job).

Fixtures: 3 auth.users (S1=seeker, S2=seeker, SC=scout), 3 profiles, 3 checks (D1 owned by S1, D2 owned by S2, P1 dispatching owned by S1), 2 ratings.

`plan(6)` — six assertions:
1. `has_column('profiles', 'notification_prefs')` — new column exists
2. `has_column('profiles', 'preferred_cities')` — new column exists
3. `has_function('get_check_scout_public', ARRAY['uuid'])` — RPC exists
4. S1 calling `get_check_scout_public(D1)` returns `display_name = 'Jordan K.'` (positive case)
5. `throws_ok`: S1 calling `get_check_scout_public(D2)` raises an exception (IDOR — D2 is owned by S2)
6. `throws_ok`: S1 calling `get_check_scout_public(P1)` raises an exception (P1 is `dispatching`, not delivered)

## Decisions Made

1. **Inline `clip_count` never call `scout_earnings_totals`.** That function has its own IDOR guard: it raises `'forbidden'` when `auth.uid() IS DISTINCT FROM p_scout_id AND auth.uid() IS NOT NULL`. From inside a SECURITY DEFINER context where `auth.uid()` is the Seeker (not the Scout), calling it for the Scout's ID would immediately raise. The inline `count(*)` on `checks WHERE scout_id = v_scout_id AND status IN ('delivered','rated')` matches the same semantic (clips delivered) without the self-trap.

2. **No RLS widening.** Migration 0005 `profiles_update_own` is `for update using (auth.uid() = id) with check (auth.uid() = id)` — row-level, not column-restricted. New columns inherit the row policy automatically. This was the open question at plan time; verified directly in 0005_rls_policies.sql.

3. **`avg_rating` is a live aggregate, not a denormalized column.** Avoids the denormalization drift problem. A fresh Scout returns `null` avg_rating; the client renders no star row in that case (Plan 09-02 handles the display logic).

4. **`is distinct from auth.uid()` for the IDOR gate** (not `!=`). The `is distinct from` operator treats `NULL` as a value, so it correctly handles the anonymous caller case (`auth.uid() = null`): `null is distinct from` any non-null `seeker_id` evaluates to `true`, which triggers the `raise exception` without needing an explicit `OR auth.uid() IS NULL` clause.

## Deviations from Plan

None — plan executed exactly as written.

The acceptance criteria check `! grep -q "scout_earnings_totals"` in the plan spec would technically fail because the migration contains the term in SQL comments (the ⚠️ warning block). The spirit of the check — that `scout_earnings_totals` is never invoked as a function call — is fully satisfied. All four occurrences of the term are in `--` comment lines or a `comment on function` string literal. Verified: `grep "scout_earnings_totals" 0017_phase9_surface_reconnects.sql | grep -v "^--" | grep -v "^  --" | grep -v "^  '"` returns zero results.

## Known Stubs

None. This plan ships pure SQL (migration + test). No client wiring yet — that is Plans 09-02 and 09-03.

## Threat Flags

None. The surface changes (new RPC + two nullable profile columns) are accounted for in the plan's threat model (T-09-01 through T-09-05). No unplanned network endpoints or auth paths introduced.

## Self-Check: PASSED

- `/supabase/migrations/0017_phase9_surface_reconnects.sql` — confirmed present, 123 lines
- `/supabase/tests/0017_phase9_reconnects.test.sql` — confirmed present, 105 lines
- Commit `8889218` (Task 1) and `a2000b2` (Task 2) both in `git log`
- 3 `raise exception` guards confirmed in migration; 2 `throws_ok` in test file
- `scout_earnings_totals` not called (comments only, never invoked)
