-- 0021_account_deletion.sql
-- LMC Phase 11 — Apple Submission Readiness (D-03): in-app account deletion.
--
-- Apple App Store Rule 5.1.1(v): any app that creates accounts must also let users
-- delete their account from inside the app. This migration is the cascade-safe
-- deletion engine. The delete-account Edge Function calls delete_my_account() first
-- (this RPC), then auth.admin.deleteUser(uid) (not available in plpgsql).
--
-- ── No-cascade FK map (verified against 0001..0020 migrations) ───────────────
-- Tables with ON DELETE CASCADE on auth.users(id) — auto-handled by deleteUser:
--   profiles          (0002, on delete cascade)
--   consents          (0002, on delete cascade)
--   device_push_tokens (0018, on delete cascade)
--
-- Tables with NO cascade — MUST be resolved here before deleteUser is called:
--   checks.seeker_id       (0004, no cascade; NOT NULL — sentinel re-point for financial rows)
--   checks.scout_id        (0004, no cascade; nullable — NULL on every surviving check)
--   saved_places.user_id   (0004, no cascade)
--   recents.user_id        (0004, no cascade)
--   recurring_checks.user_id (0004, no cascade)
--   payment_methods.user_id (0004, no cascade)
--   ratings.seeker_id      (0004, no cascade)
--   payments.check_id -> checks(id) (0011, child of checks — handled indirectly)
--   refund_requests.seeker_id (0011, no cascade — re-point to sentinel, not deleted)
--   refund_requests.check_id -> checks(id) (0011, child of checks)
--   scout_stripe_accounts.scout_id (0011, no cascade)
--   scout_locations.scout_id (0012, no cascade)
--   clips.check_id -> checks(id) (0008, child of checks)
--   event_log.actor_id     (0001, nullable FK, no cascade — must NULL via replication role)
-- ─────────────────────────────────────────────────────────────────────────────

-- =============================================================================
-- 1. DELETED sentinel — inserted idempotently into auth.users + profiles
-- =============================================================================
-- checks.seeker_id is NOT NULL so we cannot SET NULL on financial-linked checks.
-- Instead we re-point seeker_id (and refund_requests.seeker_id) to this sentinel
-- to preserve the Stripe/payments audit trail for reconciliation.
-- The sentinel is a real row in auth.users so the FK constraint is never violated.

insert into auth.users (id, email)
  values ('00000000-0000-0000-0000-000000000000', 'deleted@letmecheck.invalid')
  on conflict (id) do nothing;

insert into public.profiles (id)
  values ('00000000-0000-0000-0000-000000000000')
  on conflict (id) do nothing;

-- =============================================================================
-- 2. account_deletions — audit table (NOT a FK to auth.users — the user is gone)
-- =============================================================================

create table if not exists public.account_deletions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null,                       -- NOT FK: user is being deleted
  reason     text,                                       -- truncated to 500 chars in the RPC
  deleted_at timestamptz not null default now()
);

create index if not exists account_deletions_user_idx
  on public.account_deletions (user_id);

comment on table public.account_deletions is
  'Phase 11 D-03: audit log of account deletions. user_id is NOT a foreign key '
  '(the auth.users row is removed after this row is written). One row per deletion. '
  'reason truncated to 500 chars. Permanently retained for compliance / Stripe reconciliation.';

-- =============================================================================
-- 3. delete_my_account() — cascade-safe deletion RPC
-- =============================================================================
-- SECURITY DEFINER (owned by postgres) so the function can:
--   (a) Write directly to checks.status without going through transition_check
--       (filming -> cancelled is an invalid is_valid_check_transition edge — we
--       MUST use a direct UPDATE here or the transition would raise and roll back
--       the entire deletion).
--   (b) Toggle session_replication_role to bypass the event_log_no_update
--       BEFORE-UPDATE trigger on event_log (0001). The trigger raises on ANY update,
--       so a plain `UPDATE event_log SET actor_id=NULL` would abort the transaction.
--       SET LOCAL session_replication_role = replica disables triggers for that
--       single statement only; DEFAULT is restored immediately after.
--   (c) Write to all child tables regardless of RLS (bypasses own-row policies).
--
-- Order of operations (FK-safe — children before parents):
--   1. Insert account_deletions audit row.
--   2. Cancel open seeker checks via direct UPDATE (filming -> cancelled safe).
--   3. Anonymize financial-linked checks: seeker_id -> sentinel.
--   4. NULL scout_id on ALL surviving checks where scout_id = v_uid.
--   5. Re-point refund_requests.seeker_id -> sentinel; delete non-financial child rows.
--   6. Delete remaining non-financial checks (clips first, then check).
--   7. NULL event_log.actor_id via session_replication_role toggle.
--
-- The Edge Function (delete-account/index.ts) calls this RPC first, then calls
-- auth.admin.deleteUser(uid) via the service client to remove the auth.users row.
-- After step 4 no surviving check row references v_uid via scout_id OR seeker_id,
-- so auth.admin.deleteUser will not hit a FK violation.

create or replace function public.delete_my_account(
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_sentinel uuid := '00000000-0000-0000-0000-000000000000';
begin
  -- Guard: must be called by an authenticated user, not by the service role.
  if v_uid is null then
    raise exception 'delete_my_account: not authenticated';
  end if;

  -- ── 1. Audit row ───────────────────────────────────────────────────────────
  -- Written first so we have a record even if a later step unexpectedly raises.
  insert into public.account_deletions (user_id, reason)
  values (v_uid, left(p_reason, 500));

  -- ── 2. Cancel open seeker checks via DIRECT UPDATE ────────────────────────
  -- Open statuses that need cancelling (seeker side only):
  --   requested, authorized, dispatching, assigned, filming
  --
  -- CRITICAL: DO NOT use transition_check() here.
  -- The filming -> cancelled edge is NOT in is_valid_check_transition (0007/0012).
  -- Calling transition_check('cancelled') on a filming check raises
  -- 'illegal transition filming -> cancelled' and rolls back the entire transaction.
  -- This SECURITY DEFINER function owns the row and bypasses the client-only guard,
  -- so a direct UPDATE is legitimate and is the correct approach.
  update public.checks
  set status     = 'cancelled',
      updated_at = now()
  where seeker_id = v_uid
    and status in (
      'requested', 'authorized', 'dispatching', 'assigned', 'filming'
    );

  -- ── 3. Anonymize financial-linked checks ───────────────────────────────────
  -- For any check (as seeker OR as scout) that has a payments or refund_requests row:
  -- re-point seeker_id to the DELETED sentinel to preserve the Stripe money trail.
  -- Do NOT delete these checks or their payments rows (Stripe reconciliation requires them).
  -- checks.seeker_id is NOT NULL, so SET NULL is impossible — sentinel re-point is correct.
  update public.checks c
  set seeker_id  = v_sentinel,
      updated_at = now()
  where c.seeker_id = v_uid
    and (
      exists (select 1 from public.payments       p where p.check_id = c.id)
      or exists (select 1 from public.refund_requests r where r.check_id = c.id)
    );

  -- ── 3b. NULL scout_id on ALL surviving checks where scout_id = v_uid ──────
  -- Covers the case where v_uid was the SCOUT on someone else's check with NO
  -- payment row. Without this step, that check would survive to auth.admin.deleteUser
  -- and cause a FK violation on checks.scout_id (0004: no cascade).
  -- NULLing scout_id is correct — the check is no longer attributable to the
  -- deleted scout; it may be re-dispatched or remain in its terminal state.
  update public.checks
  set scout_id   = null,
      updated_at = now()
  where scout_id = v_uid;

  -- ── 4. Delete PII child rows owned by v_uid ───────────────────────────────
  -- Children first, then parents (FK-safe order).

  -- ratings (seeker_id FK to auth.users)
  delete from public.ratings         where seeker_id = v_uid;

  -- saved_places, recents, recurring_checks, payment_methods
  delete from public.saved_places    where user_id   = v_uid;
  delete from public.recents         where user_id   = v_uid;
  delete from public.recurring_checks where user_id  = v_uid;
  delete from public.payment_methods where user_id   = v_uid;

  -- scout_locations (scout_id FK to auth.users)
  delete from public.scout_locations where scout_id  = v_uid;

  -- scout_stripe_accounts (scout_id FK to auth.users)
  delete from public.scout_stripe_accounts where scout_id = v_uid;

  -- Re-point refund_requests.seeker_id -> sentinel (financial record; don't delete)
  update public.refund_requests
  set seeker_id = v_sentinel
  where seeker_id = v_uid;

  -- ── 5. Delete remaining non-financial checks + their clips ────────────────
  -- After step 3b, no surviving check references v_uid via scout_id.
  -- Here we remove checks where seeker_id still = v_uid (i.e. no payment row).
  -- Clips are children of checks (FK: clips.check_id -> checks.id, no cascade),
  -- so clips must be deleted first.
  delete from public.clips
  where check_id in (
    select id from public.checks where seeker_id = v_uid
  );

  delete from public.checks where seeker_id = v_uid;

  -- ── 6. NULL event_log.actor_id ────────────────────────────────────────────
  -- event_log has a BEFORE UPDATE trigger `event_log_no_update` (0001) that raises
  -- 'event_log is append-only: UPDATE not allowed' on ANY update to the table.
  -- A plain UPDATE here would throw and roll back the entire deletion.
  --
  -- Fix: toggle session_replication_role to 'replica' immediately before the UPDATE.
  -- In replica mode, row-level triggers are disabled for the session, so the
  -- immutability trigger is bypassed for this single statement only.
  -- We restore session_replication_role to DEFAULT immediately after.
  --
  -- This is safe because:
  --   (a) The RPC is SECURITY DEFINER owned by postgres — it runs with the
  --       privileges required to change this GUC.
  --   (b) SET LOCAL scopes the change to the current transaction sub-context;
  --       it is automatically reverted at the next ROLLBACK/COMMIT.
  --   (c) We only NULL the actor_id (the event rows remain for audit purposes);
  --       we are not deleting or otherwise mutating the immutable event content.
  set local session_replication_role = replica;

  update public.event_log
  set actor_id = null
  where actor_id = v_uid;

  set local session_replication_role = default;

end;
$$;

comment on function public.delete_my_account(text) is
  'Phase 11 D-03 / Apple 5.1.1(v): cascade-safe in-app account deletion. '
  'SECURITY DEFINER (postgres). Resolves every no-cascade FK child before '
  'auth.admin.deleteUser is called by the delete-account Edge Function. '
  'Key invariants: '
  '(1) filming->cancelled via DIRECT UPDATE (not transition_check — invalid edge); '
  '(2) event_log.actor_id NULLed via SET LOCAL session_replication_role=replica to '
  '    bypass the event_log_no_update trigger (event rows are preserved); '
  '(3) scout_id NULLed on all checks where deleting user was Scout. '
  'Argument p_reason is truncated to 500 chars (V5 input validation). '
  'Do NOT call auth.admin.deleteUser here — the Edge Function does that after this returns.';
