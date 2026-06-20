-- 0010_clips_mux.sql
-- LMC Phase 3 — Video Pipeline: fill the clips Mux seam Phase 2 left open.
--
-- Phase 2 (0007/0008) shipped a clips table with a `stub` status, a transition_check()
-- that gates `delivered` to the assigned scout, and a deliver-needs-A-CLIP guard. This
-- migration EXTENDS those additively to carry a real Mux asset and to let the
-- signature-verified Mux webhook (a service-role caller, auth.uid() IS NULL) drive the
-- new state-machine edges. It changes the existing 0007 functions via CREATE OR REPLACE
-- (full body re-stated with the new edges/guards) — it does NOT drop them, and it does
-- NOT drop or recreate the clips table.
--
-- What this migration does:
--   (1) Mux columns on clips (all nullable, additive): mux_upload_id / mux_asset_id /
--       mux_playback_id / mux_playback_policy / duration_secs (+ lookup indexes).
--   (2) Widen the clips.status CHECK to the real lifecycle (keep 'stub' so Phase-2 test
--       rows stay valid): pending -> uploading -> uploaded -> processing -> ready / errored.
--   (3) is_valid_check_transition(): add the new edges filming -> uploaded -> processing
--       -> delivered (keep the existing filming -> delivered edge — the deliver guard is
--       the real gate; the webhook drives uploaded/processing for honest progress).
--   (4) transition_check(): allow the system (service role, auth.uid() IS NULL) to drive
--       the new server-finalize edges; tighten the deliver guard to require a clip whose
--       status = 'ready' (defence-in-depth: a dropped network can never produce a
--       delivered-but-unplayable check).
--
-- DATA-02 still holds: clients have NO UPDATE policy on checks. status/scout_id remain
-- reachable only through these SECURITY DEFINER functions. The check_status enum
-- (0004) already carries 'uploaded' and 'processing' labels, so NO enum migration is
-- needed — only the EDGES in is_valid_check_transition.
--
-- ORDERING NOTE: this migration is numbered 0010 and runs AFTER 0009 (Scout RLS +
-- Realtime). It references public.clips and the existing check_status labels at
-- EXECUTION time only; like 0007 it compares the enum params on ::text, so there is no
-- create-time enum-label resolution and no forward dependency.

-- 1. Mux columns on clips (additive, all nullable) --------------------------
alter table public.clips
  add column if not exists mux_upload_id       text,
  add column if not exists mux_asset_id        text,
  add column if not exists mux_playback_id     text,
  add column if not exists mux_playback_policy text,
  add column if not exists duration_secs       double precision;

create index if not exists clips_mux_asset_idx  on public.clips (mux_asset_id);
create index if not exists clips_mux_upload_idx on public.clips (mux_upload_id);

comment on column public.clips.mux_upload_id is
  'Mux direct-upload id, set by mux-upload-url before the device PUTs the clip; the '
  'webhook correlates the asset back to the check via passthrough=check_id.';
comment on column public.clips.mux_playback_id is
  'Mux SIGNED playback id (VID-04). delivery.tsx streams stream.mux.com/{id}.m3u8 with '
  'a short-lived per-Seeker JWT minted by mux-playback-token; never a public id.';

-- 2. Widen the clips.status lifecycle --------------------------------------
-- Drop the Phase-2 CHECK and replace it with the real lifecycle. Keep 'stub' so legacy
-- Phase-2 stub rows (test data) remain valid; add the real states the pipeline drives.
alter table public.clips drop constraint if exists clips_status_check;
alter table public.clips add constraint clips_status_check
  check (status in ('stub','pending','uploading','uploaded','processing','ready','errored','rejected'));

-- 3. is_valid_check_transition() — ADD the Mux edges (create or replace) -----
-- Verbatim copy of the 0007 body with three new edges inserted around the existing
-- filming -> delivered edge. Still compares on ::text (no create-time label resolution).
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
    when p_from::text = 'assigned'    and p_to::text in ('filming','cancelled')                        then true
    -- Phase 3: the webhook walks filming -> uploaded -> processing -> delivered for honest
    -- progress. The direct filming -> delivered edge is kept so the deliver guard remains
    -- the real gate (the webhook can also short-circuit straight to delivered).
    when p_from::text = 'filming'     and p_to::text in ('uploaded','delivered')                       then true
    when p_from::text = 'uploaded'    and p_to::text = 'processing'                                    then true
    when p_from::text = 'processing'  and p_to::text = 'delivered'                                     then true
    when p_from::text = 'delivered'   and p_to::text = 'rated'                                          then true
    else false
  end;
$$;

comment on function public.is_valid_check_transition(check_status, check_status) is
  'DATA-02 legal-edge table for the check state machine. Phase 3 adds the Mux edges '
  'filming -> uploaded -> processing -> delivered (additive over the Phase-2 subset).';

-- 4. transition_check() — system-actor allowance + deliver-needs-READY guard --
-- Verbatim copy of the 0007 body with TWO changes:
--   (a) actor-authz: the system (service role, auth.uid() IS NULL) may drive the
--       upload/processing/delivered finalize edges; a HUMAN caller is still scout-gated
--       on filming/delivered and is barred from driving uploaded/processing at all.
--   (b) deliver guard: require a clip whose status = 'ready', not merely a present row.
-- The `for update` lock, the log_event positional call shape, and the
-- `set search_path = public` / `security definer` preamble are unchanged.
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
  elsif p_to in ('uploaded','processing') and v_uid is not null then
    -- Only the system (the signature-verified Mux webhook, auth.uid() null) drives the
    -- upload/processing finalize steps. A human caller may never drive them (T-03-02).
    raise exception 'only the system may drive %', p_to;
  elsif p_to in ('filming','delivered') and v_uid is not null and v_uid is distinct from v_scout then
    -- A human is still held to scout-only on filming/delivered; the system (uid null)
    -- is allowed through to drive the webhook-owned delivered transition.
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

  -- (c) deliver-needs-READY-clip guard: no empty/fake delivery, AND no
  -- delivered-but-unplayable delivery — the clip must be Mux-ready (status='ready'),
  -- which only the signature-verified webhook can set (T-03-01 / T-03-03).
  if p_to = 'delivered'
     and not exists (
       select 1 from public.clips
       where check_id = p_check_id and status = 'ready'
     ) then
    raise exception 'cannot deliver without a ready clip';
  end if;

  -- Advance the state machine (sole writer of status/updated_at).
  update public.checks
  set status = p_to,
      updated_at = now()
  where id = p_check_id;

  -- Append the immutable audit event (identical signature to 0006/0007).
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
  'is_valid_check_transition + actor authorization + deliver-needs-READY-clip. Phase 3: '
  'the system (service role, auth.uid() null) drives uploaded/processing/delivered for '
  'the Mux webhook; a human is still scout-gated and cannot produce a ready clip. Clients '
  'have no UPDATE policy on checks (0005).';
