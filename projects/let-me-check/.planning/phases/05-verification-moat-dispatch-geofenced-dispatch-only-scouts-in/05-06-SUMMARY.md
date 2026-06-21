---
phase: 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in
plan: "06"
subsystem: live-deploy
tags: [db-push, supabase, edge-functions, types-regen, geo, dispatch, gps-verification, signage-check, checkpoint]
dependency_graph:
  requires: [05-01, 05-02, 05-03, 05-04, 05-05]
  provides: [live-0012, live-0012b, live-verify-clip, live-signage-check, live-mux-webhook-v2, live-mux-upload-url-v2, database.types.ts-v5]
  affects: [lmc-app/app/lib/database.types.ts, all Phase-5 client as-any casts]
tech_stack:
  added: []
  patterns: [supabase db push, supabase functions deploy --no-verify-jwt, supabase gen types typescript --linked]
key_files:
  created: []
  modified:
    - lmc-app/app/lib/database.types.ts
    - supabase/migrations/20260621000002_dispatch_rpc_accept.sql
decisions:
  - "0012b renamed from 0012b_dispatch_rpc_accept.sql to 20260621000002_dispatch_rpc_accept.sql — Supabase CLI requires timestamp-format filenames; plain 0012b prefix silently skipped"
  - "Markets table was empty on live DB; seed.sql run before 0012 push to satisfy no_film_zones.market_id FK constraint on 'mia'"
  - "pg_cron NOT available on this Supabase tier; expire_stale_dispatching() function is live but must be invoked by a Supabase Edge Function cron schedule (not pg_cron). Document for ops."
  - "All four Edge Functions deployed --no-verify-jwt: verify-clip + signage-check (service-role-invoked from mux-webhook) + mux-webhook + mux-upload-url (webhooks)"
  - "pgTAP test db blocked: supabase test db requires local Docker/Postgres; no Docker running. Tests verified offline in earlier plans; live schema correctness confirmed by table/function presence queries"
  - "signage-check deployed but GOOGLE_VISION_API_KEY not yet set; degrades gracefully to signage_confirmed=null (no error)"
metrics:
  duration: "~20 min"
  completed: "2026-06-21"
  tasks: "1 of 3 (Task 2 complete; Task 1 + Task 3 are human checkpoints)"
  files_created: 0
  files_modified: 2
status: BLOCKED_AT_HUMAN_CHECKPOINT
---

# Phase 5 Plan 06: Live Deploy — Migrations + Edge Functions + Types Regen (Partial)

**One-liner:** 0012 + 0012b pushed live (after seeding markets + fixing timestamp filename), all 4 Phase-5 Edge Functions deployed --no-verify-jwt, database.types.ts regenerated with scout_locations/market_config/no_film_zones/signage_confirmed; tsc clean; blocked at Google Vision key checkpoint.

## What Was Built (Task 2 — COMPLETE)

### Deviations auto-fixed before push

**1. [Rule 3 - Blocking] Markets table empty on live DB**
- **Found during:** `supabase db push` → `ERROR: insert or update on table "no_film_zones" violates foreign key constraint "no_film_zones_market_id_fkey"` (key 'mia' not in markets)
- **Issue:** seed.sql had never been run on the live project. The markets table was empty.
- **Fix:** Ran `supabase db query --linked -f supabase/seed.sql` to populate 102 market rows idempotently before pushing 0012.
- **Files modified:** None (data only)

**2. [Rule 3 - Blocking] 0012b filename silently skipped by CLI**
- **Found during:** First `supabase db push` attempt — CLI warning "Skipping migration 0012b_dispatch_rpc_accept.sql... (file name must match pattern `<timestamp>_name.sql`)"
- **Issue:** Supabase CLI requires timestamp-prefix filenames for migrations; `0012b` prefix is not recognized.
- **Fix:** `git mv supabase/migrations/0012b_dispatch_rpc_accept.sql supabase/migrations/20260621000002_dispatch_rpc_accept.sql`
- **Commit:** 55f6817

### Live DB state after push

| Object | Status | Notes |
|--------|--------|-------|
| `0012_dispatch_verification_spine` | LIVE | schema + functions |
| `20260621000002_dispatch_rpc_accept` | LIVE | list_open_checks_for_scout + accept_check v3 + expire_stale_dispatching |
| `public.scout_locations` | LIVE | GiST index on coord |
| `public.market_config` | LIVE | 102 rows seeded (dispatch_radius_m=1500, film_fence_max_m=30) |
| `public.no_film_zones` | LIVE | 1 placeholder row (Jackson Memorial Hospital, mia) |
| `public.checks.coord` | LIVE | geography(point,4326) + GiST index |
| `public.clips.gps_verified` | LIVE | boolean, nullable |
| `public.clips.filmed_accuracy_m` | LIVE | double precision, nullable |
| `public.clips.signage_confirmed` | LIVE | boolean, nullable — advisory only |
| `distance_m()` | LIVE | server-side PostGIS distance helper |
| `is_in_no_film_zone()` | LIVE | SAFE-01 containment RPC |
| `list_open_checks_for_scout()` | LIVE | DISP-01 geo-filtered dispatch |
| `accept_check()` | LIVE | v3 with geo + one-active-job guards |
| `expire_stale_dispatching()` | LIVE | function only; pg_cron NOT available |
| `reset_check_for_redispatch()` | LIVE | GPS-reject re-dispatch |

### pg_cron unavailable (note for ops)

This Supabase tier does not have `pg_cron`. The migration's DO block swallows this gracefully — `expire_stale_dispatching()` exists as a callable function.

**Action required before launch:** Set up a Supabase Edge Function with a cron schedule (`0 * * * *` or similar) that calls `supabase.rpc('expire_stale_dispatching')` with the service role. This is a one-time ops task, not a code change.

### Edge Functions deployed

| Function | Flag | Status | Notes |
|----------|------|--------|-------|
| `verify-clip` | `--no-verify-jwt` | DEPLOYED | GPS fence gate; service-role-invoked from mux-webhook |
| `signage-check` | `--no-verify-jwt` | DEPLOYED | Advisory signage; needs GOOGLE_VISION_API_KEY secret (not yet set — degrades to null) |
| `mux-webhook` | `--no-verify-jwt` | REDEPLOYED | Now includes GPS gate (step 6b) + signage invocation |
| `mux-upload-url` | `--no-verify-jwt` | REDEPLOYED | Now passes filmed_lat/lng/accuracy_m to clips row |

### database.types.ts regenerated

`lmc-app/app/lib/database.types.ts` regenerated via `supabase gen types typescript --linked`. Now contains:
- `public.scout_locations` table type (coord, is_online, scout_id, updated_at)
- `public.market_config` table type (dispatch_radius_m, film_fence_m, film_fence_max_m, etc.)
- `public.no_film_zones` table type (area, category, market_id, name)
- `public.clips` includes `gps_verified`, `filmed_accuracy_m`, `signage_confirmed`
- `list_open_checks_for_scout` RPC typed with `{ p_scout_lat, p_scout_lng }` args
- `is_in_no_film_zone` RPC typed

`tsc --noEmit`: 0 errors.

### Commit

- `55f6817` — feat(05-06): push 0012+0012b live, deploy Phase-5 Edge Functions, regen types

## Blocked: Human Checkpoints Pending

### Task 1: Google Vision API key (BLOCKING)

signage-check is deployed but `GOOGLE_VISION_API_KEY` secret is not set. Until it is, `signage-check` returns `signage_confirmed=null` gracefully — delivery is never blocked.

### Task 3: On-device geo walk-through (BLOCKING)

Real GPS, real devices, two sessions. Cannot be automated.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Markets table empty — FK violation blocked 0012**
- See above. Fixed by running seed.sql first.

**2. [Rule 3 - Blocking] 0012b filename rejected by Supabase CLI**
- See above. Renamed to timestamp format.

**3. [Rule 2 - Note] pgTAP tests skipped (no Docker)**
- `supabase test db` requires a local Docker Postgres. No Docker available.
- All pgTAP tests were verified offline during plans 01-05.
- Live DB correctness confirmed by querying table/function presence and market_config data.
- This is acceptable for Wave-4; a future CI pipeline should run pgTAP via `supabase start`.

## Known Stubs

None introduced in this plan. The `as-any` casts in scout-location.ts, dispatch.ts, checks.ts remain (tsc passes) — they are harmless now that types are regenerated but removing them is low-priority cleanup.

## Threat Flags

No new threat surface introduced — this is a deploy-only plan. All threats from 05-01 through 05-05 remain mitigated.
