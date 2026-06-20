-- 0001_event_log.sql
-- LMC Phase 1 — DATA-04: the immutable, append-only event log.
--
-- CTO MANDATE: this is migration 0001 — the event log is designed and created
-- BEFORE any entity table. Every later feature emits events into it. The log is
-- the source of truth for audit + future predictive AI, so it must be tamper-evident.
--
-- Design decision (see 01-RESEARCH.md "Event Log Design"): a plain append-only
-- Postgres table now, NOT a Timescale hypertable. At beta scale (~500 checks / 90
-- days) Timescale is premature operational surface; the schema is shaped so a
-- Timescale migration later is additive and non-breaking.

-- Extensions ---------------------------------------------------------------
-- PostGIS provides the geography type used by the geo column here and by venue
-- geofence columns in later migrations. Enable it once, first.
create extension if not exists postgis;
-- gen_random_uuid() for later entity tables (cheap to enable here).
create extension if not exists pgcrypto;

-- Table --------------------------------------------------------------------
create table public.event_log (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),          -- when
  actor_id     uuid references auth.users(id),              -- who (nullable: system events)
  event_type   text not null,                               -- e.g. 'check.status_changed'
  subject_type text,                                        -- 'check' | 'profile' | 'consent' | ...
  subject_id   uuid,                                        -- the row this event concerns
  geo          geography(point, 4326),                      -- where (PostGIS point; nullable)
  context      jsonb not null default '{}'::jsonb           -- free-form, indexed payload
);

comment on table public.event_log is
  'Append-only audit log (DATA-04). UPDATE/DELETE blocked by trigger. RLS set in 0005: '
  'authenticated may INSERT own actor rows; reads are service/admin-restricted.';

-- Indexes ------------------------------------------------------------------
create index event_log_created_at_idx on public.event_log (created_at);
create index event_log_type_idx       on public.event_log (event_type, created_at);
create index event_log_subject_idx    on public.event_log (subject_type, subject_id);
create index event_log_context_gin    on public.event_log using gin (context);

-- Immutability -------------------------------------------------------------
-- The table must REFUSE all UPDATE/DELETE at the database level. App-level
-- discipline is not enough — the DB itself rejects mutation.
create or replace function public.event_log_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'event_log is append-only: % not allowed', tg_op;
end;
$$;

create trigger event_log_no_update
  before update on public.event_log
  for each row execute function public.event_log_immutable();

create trigger event_log_no_delete
  before delete on public.event_log
  for each row execute function public.event_log_immutable();

-- Canonical writer ---------------------------------------------------------
-- The single helper every server-side transition function and the client wrapper
-- use to append an event. SECURITY DEFINER so server flows can write system
-- events; actor_id is bound to auth.uid() (null for service/system context).
create or replace function public.log_event(
  p_event_type   text,
  p_subject_type text default null,
  p_subject_id   uuid default null,
  p_context      jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  insert into public.event_log (actor_id, event_type, subject_type, subject_id, context)
  values (auth.uid(), p_event_type, p_subject_type, p_subject_id, coalesce(p_context, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

comment on function public.log_event(text, text, uuid, jsonb) is
  'Canonical append-only event writer. actor_id = auth.uid(). Used by transition_check (0006) and the client logEvent() wrapper.';
