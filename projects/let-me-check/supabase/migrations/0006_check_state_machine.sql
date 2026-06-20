-- 0006_check_state_machine.sql
-- LMC Phase 1 — DATA-02: the ONLY writer of checks.status.
--
-- The client has no UPDATE policy on checks (see 0005), so it physically cannot
-- advance the workflow or self-assign a scout. Every status change goes through
-- this SECURITY DEFINER function, which also appends a check.status_changed event
-- to the immutable event_log (0001). Phase 1 only needs this writer to exist and
-- log every transition; Phase 2 exercises the full lifecycle with Realtime.

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
  v_from check_status;
begin
  -- Read current status (lock the row against concurrent transitions).
  select status into v_from
  from public.checks
  where id = p_check_id
  for update;

  if not found then
    raise exception 'transition_check: check % not found', p_check_id;
  end if;

  -- Advance the state machine. This is the sole writer of status/updated_at.
  update public.checks
  set status = p_to,
      updated_at = now()
  where id = p_check_id;

  -- Append an immutable audit event for every transition.
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
  'DATA-02: sole server-side writer of checks.status. SECURITY DEFINER. Logs check.status_changed to event_log. '
  'Clients are denied UPDATE on checks in 0005 (no status/scout_id write path).';
