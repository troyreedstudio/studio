---
phase: 11-apple-submission-readiness
plan: "04"
subsystem: backend
tags: [account-deletion, live-deploy, migration, edge-function, pgtap, dispatch-timeout, types]
dependency_graph:
  requires:
    - 11-01 (0021_account_deletion.sql authored + delete-account Edge Function coded)
    - 11-03 (client-side deleteMyAccount() helper ready to call the deployed function)
  provides:
    - Migration 0021 live in production DB
    - delete-account Edge Function live (verify_jwt=TRUE)
    - dispatch_timeout_s reset to 300 across all 102 market rows
    - database.types.ts including account_deletions table + delete_my_account RPC
  affects:
    - supabase/migrations/0021_account_deletion.sql (pushed live)
    - supabase/functions/delete-account/index.ts (deployed)
    - supabase/tests/0021_account_deletion.test.sql (fixed + GREEN)
    - lmc-app/app/lib/database.types.ts (regenerated)
tech_stack:
  added:
    - account_deletions table (live, public schema, user_id not FK — auth row will be gone)
    - delete_my_account(text) SECURITY DEFINER RPC (live, owned by postgres)
    - delete-account Edge Function (live, verify_jwt=TRUE)
  patterns:
    - pgTAP via supabase db query --linked --file (Docker-free path, matches 0017 precedent)
    - supabase db push --include-all (needed for out-of-order history, matches 0017 lesson)
    - User-initiated function deployed without --no-verify-jwt (stripe-refund pattern)
    - dispatch_timeout reset via direct UPDATE public.market_config
key_files:
  created:
    - (none — plan is deploy-only)
  modified:
    - lmc-app/app/lib/database.types.ts
    - supabase/tests/0021_account_deletion.test.sql
decisions:
  - "supabase db push --include-all required (0021 was inserted before latest remote migration in history); safe because 0021 is additive + idempotent"
  - "filming-status check is cancelled then deleted (no payments row), so the ACCT-04 test assertion was correctly updated from status='cancelled' to count=0; the key invariant (no FK violation, lives_ok passes) is proven by T3"
  - "plan(14) corrected to plan(15) — 15 assertions were written but the plan count was off by one"
  - "markets fixture in test used non-existent 'city' column (live table has no city column per 0015 schema); fixed to (id, name, country, currency)"
metrics:
  duration: "25m"
  completed: "2026-06-22"
  tasks_completed: 3
  files_changed: 2
---

# Phase 11 Plan 04: Live Deploy — 0021 + delete-account Edge Function + dispatch_timeout Reset + Types

Migration 0021 pushed live with SECURITY DEFINER `delete_my_account` RPC + `account_deletions` audit table; all 15 pgTAP assertions GREEN; `delete-account` deployed verify_jwt=TRUE with 401-on-unauth confirmed; all 102 market rows reset to `dispatch_timeout_s=300`; types regenerated; tsc clean.

## What Was Done

### Task 1: Push migration 0021 + pgTAP GREEN

`supabase db push --include-all` applied `0021_account_deletion.sql` to the live database. The `--include-all` flag was required (same pattern as 0017 — 0021 was inserted before the latest remote migration in history). The migration is idempotent (CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION, ON CONFLICT DO NOTHING sentinel inserts), so a re-push is safe.

Verification query confirmed both objects live:
```
account_deletions table: EXISTS
delete_my_account(text) RPC:  EXISTS
```

pgTAP test file `supabase/tests/0021_account_deletion.test.sql` run via `supabase db query --linked --file` (Docker-free path). All 15 assertions GREEN:

- ACCT-01: account_deletions table exists
- ACCT-01: delete_my_account() RPC exists
- ACCT-02: delete_my_account() runs without raising (lives_ok)
- ACCT-02: saved_places rows removed
- ACCT-02: recents rows removed
- ACCT-02: ratings rows removed
- ACCT-02: scout_locations row removed
- ACCT-03: financial-linked check.seeker_id set to DELETED sentinel
- ACCT-03: payments row preserved after anonymization
- ACCT-04: filming-status check fully removed after cancel+delete
- ACCT-05: scout_id NULLed on check where deleted user was Scout
- ACCT-07: no check references deleted user after RPC (FK safe for auth.admin.deleteUser)
- ACCT-06: event_log audit rows remain after deletion (not deleted)
- ACCT-06: event_log.actor_id is NULLed (trigger-safe replication_role toggle)
- ACCT-01: exactly 1 account_deletions audit row inserted for the deleted user

### Task 2: Deploy delete-account + smoke test

`supabase functions deploy delete-account` deployed the function with the default `verify_jwt=TRUE` (no `--no-verify-jwt` flag — this is user-initiated, not a server-to-server webhook).

Smoke test confirmed the auth gate:
```
curl -X POST https://cawqasszfbzvbtunamda.supabase.co/functions/v1/delete-account
→ 401
```

No webhook (mux-webhook / stripe-webhook / send-push) was touched.

### Task 3: Reset dispatch_timeout_s + regen types + tsc

Pre-reset query showed all 102 market_config rows at `dispatch_timeout_s=3600` (the testing value bumped during Phase 7/8).

```sql
UPDATE public.market_config SET dispatch_timeout_s = 300;
```

Post-reset GROUP BY confirmed: `dispatch_timeout_s=300, n=102` — all 102 rows correct (D-04 satisfied).

`supabase gen types typescript --linked` regenerated `lmc-app/app/lib/database.types.ts`. Both new objects confirmed in the output:
- `account_deletions` table type at line 42
- `delete_my_account: { Args: { p_reason?: string }; Returns: undefined }` at line 1080

`cd lmc-app && npx tsc --noEmit` — zero errors, zero warnings.

## Commits

- `5f1f35f` — `feat(11-04): push 0021 live, deploy delete-account (verify_jwt=true), reset dispatch_timeout=300, regen types`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test fixture used non-existent `city` column on `markets` table**
- **Found during:** Task 1 pgTAP run
- **Issue:** `INSERT INTO public.markets (id, name, city, country, currency)` — the live `markets` table (per 0015 schema) has no `city` column. First pgTAP run failed with `ERROR: 42703: column "city" of relation "markets" does not exist`.
- **Fix:** Removed `city` from fixture insert: `(id, name, country, currency)` only.
- **Files modified:** `supabase/tests/0021_account_deletion.test.sql`
- **Commit:** `5f1f35f`

**2. [Rule 1 - Bug] ACCT-04 assertion checked status of a row that gets deleted**
- **Found during:** Task 1 pgTAP run — `# Looks like you failed 1 test of 15`
- **Issue:** The `filming` check (check C) is first cancelled (step 2 of RPC), then deleted in step 5 (no payments row, seeker_id still = v_uid). The test asserted `status = 'cancelled'` on a row that no longer exists — the SELECT returned NULL, not 'cancelled'.
- **Fix:** Updated assertion to `count(*) = 0` — confirms the row is gone (no FK violation, no orphan). The key ACCT-04 invariant (filming->cancelled via direct UPDATE rather than transition_check, which would have raised) is already proven by `lives_ok` (T3) not raising.
- **Files modified:** `supabase/tests/0021_account_deletion.test.sql`
- **Commit:** `5f1f35f`

**3. [Rule 1 - Bug] `select plan(14)` but 15 assertions in file**
- **Found during:** Task 1 pgTAP run — `# Looks like you planned 14 tests but ran 15`
- **Fix:** `select plan(14)` → `select plan(15)`.
- **Files modified:** `supabase/tests/0021_account_deletion.test.sql`
- **Commit:** `5f1f35f`

## Known Stubs

None — this is a deploy-only plan. All stubs carried forward from prior plans are documented in their respective SUMMARYs.

## Threat Flags

None — no new network endpoints introduced. The `delete-account` function was already in the threat register (T-11-14 through T-11-16) from Plan 01. T-11-14 (elevation of privilege via wrong JWT mode) is now mitigated — 401-on-unauth confirmed. T-11-15 (webhook redeploy) is mitigated — no webhook was touched. T-11-16 (dispatch_timeout tamper) is mitigated — all 102 rows confirmed at 300.

## Self-Check: PASSED

Migration live: `to_regclass('public.account_deletions') IS NOT NULL = true`, `to_regprocedure('public.delete_my_account(text)') IS NOT NULL = true` — confirmed against live DB.

pgTAP result: all 15 assertions passed, `NO FAILURES FOUND` (grep on finish output).

delete-account 401-on-unauth: `curl -X POST https://cawqasszfbzvbtunamda.supabase.co/functions/v1/delete-account` returned `401` — verify_jwt=TRUE confirmed.

dispatch_timeout: `SELECT dispatch_timeout_s, count(*) FROM public.market_config GROUP BY dispatch_timeout_s` returned `dispatch_timeout_s=300, n=102` — all 102 rows at 300.

Types: `account_deletions` at line 42 and `delete_my_account` at line 1080 in `database.types.ts`.

tsc: `npx tsc --noEmit` produced no output — zero errors.

Commit `5f1f35f` confirmed in git log.
