---
phase: 11-apple-submission-readiness
plan: "01"
subsystem: backend
tags: [account-deletion, edge-function, migration, security, apple-compliance]
dependency_graph:
  requires: []
  provides:
    - delete_my_account RPC (migration 0021)
    - account_deletions audit table (migration 0021)
    - DELETED sentinel row in auth.users + profiles
    - delete-account Edge Function
    - pgTAP RED test (0021_account_deletion.test.sql)
    - deno tests for delete-account Edge Function
  affects:
    - supabase/migrations/ (adds 0021)
    - supabase/functions/delete-account/ (new)
    - supabase/tests/ (adds 0021_account_deletion.test.sql)
tech_stack:
  added:
    - DELETED sentinel UUID (00000000-0000-0000-0000-000000000000) in auth.users
    - account_deletions audit table (user_id NOT FK)
    - delete_my_account() SECURITY DEFINER plpgsql RPC
    - delete-account Deno Edge Function (verify_jwt=TRUE)
  patterns:
    - SET LOCAL session_replication_role = replica to bypass append-only trigger
    - Sentinel re-point instead of SET NULL (checks.seeker_id is NOT NULL)
    - authedClient for RPC (auth.uid() must resolve), serviceClient for admin.deleteUser
    - import.meta.main guard on Deno.serve (testability pattern)
key_files:
  created:
    - supabase/migrations/0021_account_deletion.sql
    - supabase/functions/delete-account/index.ts
    - supabase/functions/delete-account/index.test.ts
    - supabase/tests/0021_account_deletion.test.sql
  modified: []
decisions:
  - "DELETED sentinel (00000000-...) used for checks.seeker_id anonymization because the column is NOT NULL — SET NULL would violate the constraint; sentinel is inserted idempotently"
  - "filming->cancelled uses direct UPDATE checks, NOT transition_check — filming->cancelled is an invalid is_valid_check_transition edge that would raise and roll back the entire deletion"
  - "event_log.actor_id NULLed via SET LOCAL session_replication_role=replica to bypass the event_log_no_update BEFORE-UPDATE trigger; restored to DEFAULT immediately after the single statement"
  - "scout_id NULLed on every check where the deleted user was the Scout so no FK violation remains for auth.admin.deleteUser on checks.scout_id"
  - "uid derived ONLY from authedClient.auth.getUser() — body field user_id is intentionally ignored (IDOR T-11-01)"
  - "RPC called as authedClient (so auth.uid() resolves in plpgsql); admin.deleteUser called as serviceClient (requires service role)"
metrics:
  duration: "5m"
  completed: "2026-06-22"
  tasks_completed: 3
  files_changed: 4
---

# Phase 11 Plan 01: Account Deletion Backend Summary

Cascade-safe in-app account deletion — SECURITY DEFINER RPC + IDOR-safe Edge Function + RED tests. Required for Apple 5.1.1(v): any app that creates accounts must offer in-app account deletion.

## What Was Built

**Migration 0021** (`supabase/migrations/0021_account_deletion.sql`):
- DELETED sentinel (`00000000-0000-0000-0000-000000000000`) inserted idempotently into `auth.users` + `profiles` so anonymized checks have a valid FK target (seeker_id is NOT NULL).
- `account_deletions` audit table: `user_id` is NOT a FK (the user row is deleted after this is written).
- `delete_my_account(p_reason text)` SECURITY DEFINER RPC — resolves every no-cascade FK child in child-before-parent order before `auth.admin.deleteUser` is called by the Edge Function.

**Edge Function** (`supabase/functions/delete-account/index.ts`):
- POST only, 405 on any other method.
- uid from `authedClient.auth.getUser()` only — never from request body (IDOR-safe).
- Calls `delete_my_account` RPC as authed caller, then `auth.admin.deleteUser(uid)` via service client.
- `import.meta.main` guard on `Deno.serve` so tests can import the handler without binding a port.

**Tests**:
- `supabase/tests/0021_account_deletion.test.sql` — 14-assertion pgTAP test covering all 7 deletion invariants. RED until migration 0021 is pushed live (Plan 04).
- `supabase/functions/delete-account/index.test.ts` — 6 deno tests: 405, 401, IDOR body-ignore, happy path order (RPC then deleteUser), RPC-error-skips-deleteUser. All 6 PASS.

## The 3 Critical Fixes Applied

1. **filming -> cancelled via direct UPDATE** (NOT `transition_check`): `filming->cancelled` is not in `is_valid_check_transition` (0007/0012). Calling `transition_check('cancelled')` on a filming check raises `'illegal transition filming -> cancelled'` and rolls back the entire deletion. The SECURITY DEFINER RPC bypasses the client-only transition guard with a direct `UPDATE public.checks SET status='cancelled' WHERE ...`.

2. **event_log.actor_id NULLed via `SET LOCAL session_replication_role = replica`**: `event_log` has a `BEFORE UPDATE` trigger (`event_log_no_update`, 0001) that raises `'event_log is append-only'` on ANY update. A plain `UPDATE event_log SET actor_id=NULL` would abort the transaction. The replication-role toggle disables row-level triggers for the single statement; `DEFAULT` is restored immediately after. Audit rows are preserved — only `actor_id` is cleared.

3. **`scout_id` NULLed on all surviving checks**: For checks where the deleted user was the Scout (but not the Seeker) and no payment row exists, `checks.scout_id` would FK-violate `auth.admin.deleteUser`. A blanket `UPDATE public.checks SET scout_id=NULL WHERE scout_id=v_uid` covers this before `deleteUser` is called.

## Commits

- `e308b19` — `test(11-01): add RED pgTAP test for delete_my_account RPC`
- `905fa5b` — `feat(11-01): migration 0021 — account_deletions + delete_my_account RPC`
- `64f9b5e` — `feat(11-01): delete-account Edge Function + deno tests (IDOR-safe)`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. This plan is server-side only (migration + Edge Function). The client entry point (Settings screen "Delete account" button) is Plan 03.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: irrev_data_loss | supabase/functions/delete-account/index.ts | New irreversible-deletion endpoint — uid from JWT only (T-11-01 mitigated); deploy with verify_jwt=TRUE |

## Self-Check: PASSED

- `/Users/troyreed/studio/projects/let-me-check/supabase/migrations/0021_account_deletion.sql` — EXISTS, contains `create or replace function public.delete_my_account`, `account_deletions`, `session_replication_role = replica`, `scout_id = null`
- `/Users/troyreed/studio/projects/let-me-check/supabase/functions/delete-account/index.ts` — EXISTS, contains `auth.admin.deleteUser`, `import.meta.main`, uid from `getUser()` only
- `/Users/troyreed/studio/projects/let-me-check/supabase/functions/delete-account/index.test.ts` — EXISTS, 6 tests all PASS
- `/Users/troyreed/studio/projects/let-me-check/supabase/tests/0021_account_deletion.test.sql` — EXISTS, RED by design (no migration pushed yet)
- Commits `e308b19`, `905fa5b`, `64f9b5e` — confirmed in `git log`

The 3 critical fixes are in: (1) direct UPDATE for filming->cancelled, (2) session_replication_role toggle for event_log, (3) scout_id NULLed on all surviving checks.
