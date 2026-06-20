-- 0007_check_transitions.sql
-- LMC Phase 2 — One Real Check: harden the state machine.
--
-- Phase 1 (0006) shipped a transition_check() that blindly accepted ANY p_to and
-- did NO actor authorization. This migration replaces it with:
--   (1) is_valid_check_transition() — a fixed, testable legal-edge table
--   (2) transition_check()          — valid-transition guard + actor authz +
--                                     deliver-needs-clip guard (keeps log_event shape)
--   (3) accept_check()              — the atomic first-wins claim (sole writer of scout_id)
--
-- DATA-02 holds: clients still have NO UPDATE policy on checks (0005). status and
-- scout_id are reachable only through these SECURITY DEFINER functions, which run
-- as owner and therefore MUST self-authorize against auth.uid().
--
-- Depends on 0008 (clips table) for the deliver-needs-clip guard and on the
-- no_scout enum value added in 0008.

-- 1. Legal-edge table -------------------------------------------------------
-- ONLY this phase's edges are legal. Money states (authorized) and video states
-- (uploaded/processing) are Phase 3/4 — omitted here, added additively later.
create or replace function public.is_valid_check_transition(
  p_from check_status,
  p_to   check_status
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from = 'requested'   and p_to in ('dispatching','cancelled')                    then true
    when p_from = 'dispatching' and p_to in ('assigned','cancelled','no_scout','expired')  then true
    when p_from = 'assigned'    and p_to in ('filming','cancelled')                        then true
    when p_from = 'filming'     and p_to = 'delivered'                                     then true
    when p_from = 'delivered'   and p_to = 'rated'                                         then true
    else false
  end;
$$;

comment on function public.is_valid_check_transition(check_status, check_status) is
  'DATA-02 legal-edge table for the check state machine (Phase 2 subset). '
  'Phase 3/4 extend this additively (authorized / uploaded / processing edges).';

-- 2. Hardened transition_check ---------------------------------------------
-- Replaces 0006. Same log_event positional call shape; adds guard + actor authz.
create or replace function public.transition_check(
  p_check_id uuid,
  p_to       check_status,
  p_context  jsonb default '{}'::jsonb
)
returns check_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from   check_status;
  v_seeker uuid;
  v_scout  uuid;
  v_uid    uuid := auth.uid();
begin
  -- Read + lock the row against concurrent transitions.
  select status, seeker_id, scout_id
    into v_from, v_seeker, v_scout
  from public.checks
  where id = p_check_id
  for update;

  if not found then
    raise exception 'transition_check: check % not found', p_check_id;
  end if;

  -- (a) valid-transition guard: reject illegal jumps.
  if not public.is_valid_check_transition(v_from, p_to) then
    raise exception 'illegal transition % -> %', v_from, p_to;
  end if;

  -- (b) actor authorization (definer fn must self-authorize; RLS does not cover this).
  if p_to = 'rated' and v_uid is distinct from v_seeker then
    raise exception 'only the seeker may rate';
  elsif p_to in ('filming','delivered') and v_uid is distinct from v_scout then
    raise exception 'only the assigned scout may drive %', p_to;
  elsif p_to = 'cancelled' and v_uid is distinct from v_seeker then
    raise exception 'only the seeker may cancel';
  elsif p_to = 'dispatching' and v_uid is distinct from v_seeker then
    -- The owning seeker makes their own check discoverable (manual dispatch this phase).
    raise exception 'only the seeker may dispatch';
  end if;
  -- Terminal system transitions (no_scout / expired): the owning seeker (test-trigger
  -- this phase) or the service role (auth.uid() is null) may drive them.
  if p_to in ('no_scout','expired')
     and v_uid is not null and v_uid is distinct from v_seeker then
    raise exception 'only the seeker or system may end the check as %', p_to;
  end if;

  -- (c) deliver-needs-clip guard: no empty/fake delivery, even with a stub clip.
  if p_to = 'delivered'
     and not exists (select 1 from public.clips where check_id = p_check_id) then
    raise exception 'cannot deliver without a clip';
  end if;

  -- Advance the state machine (sole writer of status/updated_at).
  update public.checks
  set status = p_to,
      updated_at = now()
  where id = p_check_id;

  -- Append the immutable audit event (identical signature to 0006).
  perform public.log_event(
    'check.status_changed',
    'check',
    p_check_id,
    jsonb_build_object('from', v_from, 'to', p_to) || coalesce(p_context, '{}'::jsonb)
  );

  return p_to;
end;
$$;

comment on function public.transition_check(uuid, check_status, jsonb) is
  'DATA-02: sole server-side writer of checks.status. SECURITY DEFINER. Enforces '
  'is_valid_check_transition + actor authorization + deliver-needs-clip. Logs '
  'check.status_changed to event_log. Clients have no UPDATE policy on checks (0005).';

-- 3. Atomic first-wins accept ----------------------------------------------
-- The ONLY place scout_id is set. The WHERE predicate makes a double-accept race
-- impossible: the losing UPDATE matches 0 rows and raises.
create or replace function public.accept_check(
  p_check_id uuid
)
returns check_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_updated int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  update public.checks
  set scout_id   = v_uid,
      status     = 'assigned',
      updated_at = now()
  where id = p_check_id and status = 'dispatching' and scout_id is null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'check % already taken or not open', p_check_id;
  end if;

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
  'CHECK-03 atomic first-wins claim. SECURITY DEFINER. Sole writer of scout_id. '
  'Guarded UPDATE WHERE status=''dispatching'' AND scout_id IS NULL: the losing race '
  'matches 0 rows and raises ''already taken''. Phase-5 dispatch adds eligibility BEFORE this call.';
