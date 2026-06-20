-- 0008_clips_location.sql
-- LMC Phase 2 — One Real Check: the clips placeholder table (DATA-03), the check
-- location columns (CHECK-01), and a no_scout terminal state.
--
-- This migration is SCHEMA ONLY. Migration 0007 hardens transition_check (and uses
-- the clips table for the deliver-needs-clip guard); 0009 opens the narrow Scout
-- read path + clips RLS + the Realtime publication.
--
-- ENUM-IN-SAME-TRANSACTION NOTE: Postgres will not let a value added by
-- `alter type ... add value` be USED in the same transaction it is added. We add
-- 'no_scout' here and never reference it in this file; later migrations and runtime
-- (transition_check, the seeker error screen) use it safely.

-- 1. Additive terminal state: an honest "no Scout accepted" outcome, distinct from
--    seeker-cancel (cancelled) and the future auth-hold/timeout expiry (expired).
alter type public.check_status add value if not exists 'no_scout';

-- 2. Location columns on checks (CHECK-01). The seam Google Places fills later —
--    for now the catalog/free-text path populates lat/lng + a human label.
alter table public.checks
  add column if not exists requested_lat   double precision,
  add column if not exists requested_lng   double precision,
  add column if not exists location_label  text;

comment on column public.checks.location_label is
  'CHECK-01: human-readable place label (catalog or free-text now; Google Places later). '
  'requested_lat/lng are the seam the Places follow-on fills; no schema change needed then.';

-- 3. clips placeholder table (DATA-03). A first-class entity, FK to checks.
--    Phase 2 inserts a stub row (status=''stub'') so a check can reach ''delivered''.
--    Phase 3 ADDS the real Mux asset + playback columns additively (do NOT add now).
create table public.clips (
  id          uuid primary key default gen_random_uuid(),
  check_id    uuid not null references public.checks(id),
  status      text not null default 'stub'
                check (status in ('stub','uploaded','ready','rejected')),
  filmed_at   timestamptz,
  filmed_lat  double precision,
  filmed_lng  double precision,
  created_at  timestamptz not null default now()
);

create index clips_check_idx on public.clips (check_id);

comment on table public.clips is
  'DATA-03 clip artifact, FK to checks. Phase 2 uses a stub row to satisfy the '
  'deliver-needs-clip guard (0007). Phase-3 seam: the real Mux asset + playback columns '
  'are added additively when upload/playback lands — no migration of this table needed.';
