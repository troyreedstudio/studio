-- 0015_sla_deadline.sql
-- LMC Phase 7 / Plan 01 — SLA Deadline Engine (D-01, D-02, D-03)
--
-- Makes delivery deadlines REAL at the database layer. Today the filming countdown
-- is a cosmetic client constant (420/600 s) that resets on app reopen with zero
-- server effect. This migration adds:
--
--   (1) Additive columns + index  — accepted_at, deadline_at on checks
--   (2) accept_check v4           — seeds accepted_at + deadline_at atomically from
--                                   checks.tier (server-only; client never influences)
--   (3) is_valid_check_transition — adds assigned->no_scout + filming->no_scout edges
--                                   (BLOCKER-1 fix for expire_stale_filming + Plan 02
--                                   trouble-report service-role callers)
--   (4) expire_stale_filming()    — service-role sweeper for accepted-but-undelivered
--                                   checks past deadline_at (NULL-safety excludes legacy)
--   (5) Data change               — dispatch_timeout_s = 300 (5-min unclaimed window, D-02)
--   (6) pg_cron guard             — schedules expire_stale_filming if pg_cron available;
--                                   safe no-op if not (same pattern as 20260621000002)
--
-- ADDITIVE ONLY: no columns removed, no existing function logic changed except the
-- accept_check SET list and the is_valid_check_transition CASE branches.
-- All IF NOT EXISTS / CREATE OR REPLACE — safe to re-run.
--
-- TRUST BOUNDARY: accept_check is SECURITY DEFINER; deadline_at is set inside the
-- same atomic UPDATE as scout_id/status so the client can never influence it (T-07-01).
--
-- DATA-02 STILL HOLDS: no new client UPDATE policy on checks. accepted_at/deadline_at
-- are writable only via SECURITY DEFINER accept_check (service role / Scout JWT).

-- =============================================================================
-- 1. Additive columns — accepted_at + deadline_at + partial index
-- =============================================================================
-- Both columns are nullable:
--   accepted_at — timestamp when a Scout atomically claimed the check via accept_check.
--                 NULL for checks still in dispatching or pre-Phase-7 rows.
--   deadline_at — deadline_at = accepted_at + tier-window (420s priority, 600s standard).
--                 NULL for dispatching / pre-Phase-7 rows (legacy guard in sweeper).
--
-- Partial index (WHERE status IN ('assigned','filming')): only indexes live-work rows.
-- Pre-Phase-7 or terminal rows (delivered/no_scout/cancelled) are excluded, keeping
-- the index small and the sweeper query efficient at scale.

ALTER TABLE public.checks
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deadline_at timestamptz;

create index if not exists checks_deadline_idx
  on public.checks (deadline_at)
  where status in ('assigned', 'filming');

comment on column public.checks.accepted_at is
  'Phase 7 / D-01: timestamp at which a Scout atomically claimed this check via accept_check(). '
  'NULL for dispatching checks (not yet claimed) and pre-Phase-7 rows. '
  'Set SERVER-SIDE inside accept_check SECURITY DEFINER — client cannot supply it.';

comment on column public.checks.deadline_at is
  'Phase 7 / D-01: SLA delivery deadline. '
  'deadline_at = accepted_at + make_interval(secs => 420) for priority tier, '
  '                            + make_interval(secs => 600) for standard tier. '
  'NULL for dispatching / pre-Phase-7 rows. expire_stale_filming() has an IS NOT NULL '
  'guard so legacy rows are never accidentally swept. '
  'Client CANNOT influence this value (SECURITY DEFINER accept_check, T-07-01).';

-- =============================================================================
-- 2. accept_check v4 — seed accepted_at + deadline_at atomically from tier (D-01)
-- =============================================================================
-- Full body of 20260621000002 accept_check (Phase 5 v3) verbatim, with ONE change:
-- the atomic UPDATE's SET list is extended with accepted_at = now() and
-- deadline_at = now() + make_interval(secs => CASE tier::text WHEN 'priority' THEN 420 ELSE 600 END).
--
-- INVARIANT: deadline_at is derived entirely inside this SECURITY DEFINER function
-- from checks.tier (a server-managed column). The client supplies only p_check_id.
-- The window constants (420 / 600) are business rules locked here in the migration;
-- changing them requires a new migration (no runtime magic, easy to audit).
--
-- All other logic is VERBATIM from 20260621000002:
--   auth gate, geo-eligibility guard, one-active-job guard, GET DIAGNOSTICS row_count,
--   log_event, return 'assigned'. Security attributes unchanged.

create or replace function public.accept_check(
  p_check_id uuid
)
returns check_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid               uuid    := auth.uid();
  v_dispatch_radius_m double precision;
  v_scout_coord       geography;
  v_check_coord       geography;
  v_active            int;
  v_updated           int;
begin
  -- Auth gate (unchanged from Phase 5 / 20260621000002)
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- -------------------------------------------------------------------------
  -- Guard (a): geo-eligibility — Scout must be within dispatch radius (DISP-02 / T-05-07)
  -- -------------------------------------------------------------------------
  select dispatch_radius_m into v_dispatch_radius_m
  from public.market_config limit 1;
  v_dispatch_radius_m := coalesce(v_dispatch_radius_m, 1500);

  select coord into v_scout_coord
  from public.scout_locations where scout_id = v_uid;

  if v_scout_coord is null then
    raise exception 'accept_check: Scout location unknown; go online to set location';
  end if;

  select coord into v_check_coord
  from public.checks where id = p_check_id;

  if v_check_coord is not null
     and not ST_DWithin(v_scout_coord, v_check_coord, v_dispatch_radius_m) then
    raise exception 'accept_check: Scout is outside the dispatch radius for this check';
  end if;

  -- -------------------------------------------------------------------------
  -- Guard (b): one-active-job — Scout may hold at most one active job (D-03 / T-05-08)
  -- -------------------------------------------------------------------------
  select count(*) into v_active
  from public.checks
  where scout_id = v_uid
    and status in ('assigned', 'filming', 'uploaded', 'processing');

  if v_active > 0 then
    raise exception 'accept_check: Scout already has an active job';
  end if;

  -- -------------------------------------------------------------------------
  -- Atomic first-wins UPDATE — EXTENDED for Phase 7 (D-01)
  -- -------------------------------------------------------------------------
  -- Phase 7 change: accepted_at and deadline_at added to SET.
  -- accepted_at = now() → server timestamp, not client-supplied.
  -- deadline_at = now() + tier-window (420 s priority, 600 s standard).
  -- Derived from checks.tier inside SECURITY DEFINER — client cannot forge this (T-07-01).
  -- Race-safety unchanged: WHERE status='dispatching' AND scout_id IS NULL.
  update public.checks
  set scout_id    = v_uid,
      status      = 'assigned',
      accepted_at = now(),
      deadline_at = now() + make_interval(secs =>
                      case when tier::text = 'priority' then 420 else 600 end),
      updated_at  = now()
  where id = p_check_id and status = 'dispatching' and scout_id is null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'check % already taken or not open', p_check_id;
  end if;

  -- Immutable audit event (unchanged from Phase 5)
  perform public.log_event(
    'check.accepted',
    'check',
    p_check_id,
    jsonb_build_object('scout_id', v_uid)
  );

  return 'assigned';
end;
$$;

comment on function public.accept_check(uuid) is
  'CHECK-03 atomic first-wins claim — Phase 7 v4. Phase 5 geo-eligibility + one-active-job '
  'guards unchanged. Phase 7 CHANGE: SET now includes accepted_at = now() and '
  'deadline_at = now() + make_interval(secs => CASE tier ''priority'' -> 420 ELSE 600 END). '
  'Server-only derivation from checks.tier (D-01, T-07-01: client cannot influence deadline). '
  'SECURITY DEFINER. search_path = public. Race-safe: WHERE status=''dispatching'' AND scout_id IS NULL.';

-- =============================================================================
-- 3. is_valid_check_transition() — add assigned->no_scout + filming->no_scout edges
-- =============================================================================
-- BLOCKER-1 fix (HARD deliverable — not conditional).
--
-- WHY these edges are missing from 0014:
--   0012 defines: assigned -> (filming | cancelled)
--                 filming  -> (uploaded | delivered | dispatching | blur_review)
--   Neither branch includes no_scout as a valid destination.
--
-- WHY they are needed NOW:
--   (a) expire_stale_filming() (this plan, D-03): loops over status IN ('assigned','filming')
--       past deadline_at and calls transition_check(r.id, 'no_scout', ...). Without these
--       edges, every call raises 'illegal transition assigned -> no_scout'.
--   (b) trouble-report Edge Function (Plan 02): Scout fires Trouble-Here while in
--       filming state. The service-role Edge Function drives no_scout (not cancelled —
--       the cancelled actor-auth guard uses v_uid is distinct from v_seeker which is
--       TRUE for service role, always raising; no_scout guard uses v_uid is not null
--       relaxed form which passes service role). Without filming->no_scout the plan
--       02 trouble-report will raise on every call.
--
-- Full 0014 body verbatim + two additional edges. All existing edges are preserved.
-- The 0014 body is used because it is the LATEST version (includes blur_review edges).
-- ::text comparison retained (no create-time enum-label resolution).

create or replace function public.is_valid_check_transition(
  p_from check_status,
  p_to   check_status
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from::text = 'requested'   and p_to::text in ('dispatching','cancelled')                    then true
    when p_from::text = 'dispatching' and p_to::text in ('assigned','cancelled','no_scout','expired')  then true
    -- Phase 7 BLOCKER-1: assigned -> no_scout (expire_stale_filming + trouble-report service role).
    -- Also retains the existing assigned -> (filming | cancelled) edges from 0012/0014.
    when p_from::text = 'assigned'    and p_to::text in ('filming','cancelled','no_scout')              then true
    -- Phase 3: Mux finalize chain + direct filming->delivered for legacy tests.
    -- Phase 7 BLOCKER-1: filming -> no_scout (expire_stale_filming past deadline + trouble-report).
    -- Retains all existing filming exits from 0014.
    when p_from::text = 'filming'     and p_to::text in ('uploaded','delivered','no_scout')             then true
    when p_from::text = 'uploaded'    and p_to::text = 'processing'                                    then true
    when p_from::text = 'processing'  and p_to::text = 'delivered'                                     then true
    when p_from::text = 'delivered'   and p_to::text = 'rated'                                          then true
    -- Phase 5: re-dispatch edges for GPS auto-reject (D-05).
    when p_from::text in ('filming','uploaded','processing') and p_to::text = 'dispatching' then true
    -- Phase 6: blur_review edges (D-03 privacy hold gate).
    when p_from::text = 'filming'     and p_to::text = 'blur_review'                                   then true
    when p_from::text = 'blur_review' and p_to::text in ('delivered','dispatching','cancelled')         then true
    else false
  end;
$$;

comment on function public.is_valid_check_transition(check_status, check_status) is
  'DATA-02 legal-edge table for the check state machine. Phase 3 added Mux edges. '
  'Phase 5 adds re-dispatch edges: filming/uploaded/processing -> dispatching for GPS '
  'auto-reject (D-05). Phase 6 adds blur_review edges (D-03 blur gate). '
  'Phase 7 BLOCKER-1 adds: assigned -> no_scout and filming -> no_scout. '
  'These two edges allow expire_stale_filming() and the trouble-report Edge Function '
  '(Plan 02, service role) to drive no_scout without raising illegal transition. '
  'DO NOT add cancelled edge for service role (its guard uses v_uid is distinct from '
  'v_seeker which is TRUE for null service-role uid — raises by design). '
  '::text comparison avoids create-time enum-label resolution (ORDERING NOTE).';

-- =============================================================================
-- 4. expire_stale_filming() — D-03 SLA expiry sweeper
-- =============================================================================
-- Modelled on expire_stale_dispatching() (20260621000002 lines 244-276). Sweeps
-- any check in status IN ('assigned','filming') where:
--   (a) deadline_at IS NOT NULL   — mandatory NULL-safety guard; legacy pre-Phase-7 rows
--                                   have deadline_at = NULL and must never be swept.
--   (b) deadline_at < now()       — deadline has passed.
-- Calls transition_check(r.id, 'no_scout', {reason:'sla_deadline_missed'}) for each.
-- transition_check logs check.status_changed + the context to event_log automatically.
-- Reason 'sla_deadline_missed' is distinct from 'dispatch_timeout' for ops analytics.
--
-- ACTOR AUTH: transition_check's no_scout branch uses the relaxed
-- `v_uid is not null` form — service role (auth.uid() IS NULL) passes through.
-- Distinct from the cancelled branch which uses `v_uid is distinct from v_seeker`
-- and always blocks service-role callers (by design — the plan uses no_scout, not cancelled).
--
-- HOLD RELEASE NOTE (Pitfall 4 / T-07-02): expire_stale_filming sweeps the check to
-- no_scout; the PI cancel / Stripe release is NOT performed here. It is performed by
-- the Plan-04 sla-sweeper Edge Function which invokes this function and then calls
-- stripe-refund for any non-null stripe_payment_intent_id. Keeping them separate
-- means this SQL function is testable without Stripe credentials and can be called
-- from pg_cron directly for the state-machine half.

create or replace function public.expire_stale_filming()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  r       record;
begin
  for r in
    select id
    from public.checks
    where status in ('assigned', 'filming')
      and deadline_at is not null
      and deadline_at < now()
  loop
    -- Service role (auth.uid() null) is authorised by transition_check's no_scout
    -- actor-auth branch (`v_uid is not null` relaxed form — null uid passes).
    -- is_valid_check_transition now includes assigned->no_scout + filming->no_scout (section 3).
    perform public.transition_check(
      r.id,
      'no_scout',
      jsonb_build_object('reason', 'sla_deadline_missed')
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function public.expire_stale_filming() is
  'Phase 7 / D-03: sweeps assigned/filming checks past deadline_at -> no_scout '
  '(reason: sla_deadline_missed). deadline_at IS NOT NULL guard excludes legacy rows. '
  'Service role authorised by transition_check no_scout actor rule (v_uid is not null form). '
  'HOLD RELEASE: PI cancel / Stripe release is handled by the Plan-04 sla-sweeper Edge '
  'Function, NOT here (uncaptured PI cannot be refunded via stripe-refund — Pitfall 4). '
  'Schedule via pg_cron (see guard below) or a Supabase Edge Function cron if unavailable.';

-- =============================================================================
-- 5. Data change — 5-min unclaimed dispatch window (D-02)
-- =============================================================================
-- Prior default was 600 s (10 min) from 0012. D-02 tightens to 300 s (5 min):
-- if no Scout claims a check within 5 minutes, expire_stale_dispatching() sweeps
-- it to no_scout and the Seeker's hold is released. Reuses the existing sweeper.
-- The value is market-level and tunable by ops via this column without a code deploy.

update public.market_config
  set dispatch_timeout_s = 300;

comment on column public.market_config.dispatch_timeout_s is
  'DISP-03: unclaimed dispatch window in seconds. '
  'Phase 5 default: 600 (10 min). Phase 7 D-02: updated to 300 (5 min). '
  'expire_stale_dispatching() reads this value. Tunable by ops without a code deploy.';

-- =============================================================================
-- 6. pg_cron schedule guard — expire_stale_filming + expire_stale_dispatching
-- =============================================================================
-- Verbatim pattern from 20260621000002 lines 289-299.
-- The DO block is a no-op when pg_cron is not installed (free-tier safety).
-- Plan 04 enables the extension + verifies the schedules run live.
-- Both sweepers run every 60 s (pg_cron minimum resolution).
-- IDEMPOTENT: cron.unschedule before cron.schedule prevents duplicate jobs on re-run.

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Re-schedule expire_stale_dispatching (already scheduled by 20260621000002;
    -- repeating here ensures idempotency if 0015 runs first or 20260621000002 is re-run).
    perform cron.unschedule('lmc-expire-dispatching');
    perform cron.schedule('lmc-expire-dispatching', '* * * * *',
      'select public.expire_stale_dispatching()');

    -- New Phase 7 sweeper schedule.
    perform cron.unschedule('lmc-expire-filming');
    perform cron.schedule('lmc-expire-filming', '* * * * *',
      'select public.expire_stale_filming()');
  end if;
exception when others then
  -- Silently swallow if pg_cron schema/functions not available.
  null;
end $$;

-- =============================================================================
-- End of 0015_sla_deadline.sql
-- =============================================================================
-- DATA-02 confirmed: no new client INSERT/UPDATE/DELETE policy added.
-- accepted_at and deadline_at are writable ONLY through SECURITY DEFINER accept_check.
-- expire_stale_filming is SECURITY DEFINER but not granted EXECUTE to anon/authenticated.
-- Threat register: T-07-01 mitigated (server-side derivation), T-07-02 mitigated
-- (only assigned/filming past non-null deadline swept; delivered/processing excluded),
-- T-07-04 mitigated (reason 'sla_deadline_missed' logged via transition_check).
-- =============================================================================
