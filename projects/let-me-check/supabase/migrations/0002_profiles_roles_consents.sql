-- 0002_profiles_roles_consents.sql
-- LMC Phase 1 — DATA-03 (profiles) + AUTH-03 (dual role) + SAFE-02 (consents).
--
-- One account holds BOTH roles (Uber-style). is_seeker / is_scout are capability
-- flags; current_role is the active hub the app renders. Consent acceptance gets
-- a durable, versioned, auditable home (not booleans on profiles).
--
-- RLS is NOT set here — it lands in 0005 for every table at once.

-- Profiles -----------------------------------------------------------------
-- NOTE: the column is intentionally named current_role to match the dual-role
-- model in the app. It is a Postgres reserved word, so it is always referenced
-- as profiles.current_role and quoted where needed.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  is_seeker boolean not null default false,
  is_scout boolean not null default false,
  current_role text not null default 'seeker' check (current_role in ('seeker','scout')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user. Dual-role: is_seeker/is_scout are capabilities; current_role is the active hub (AUTH-03).';

-- Auto-provision a profile when a new auth user is created -------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Consents (SAFE-02) -------------------------------------------------------
-- Versioned, append-style record of every acceptance. jurisdiction captures the
-- market/country at acceptance so the table is international-ready from day one.
-- scout_code is included now (shape covers Phase-4 SCOUT-02) though it is unused
-- until the Scout flow ships.
create table public.consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (
    consent_type in ('age_18plus','terms','privacy','aup','scout_code')
  ),
  doc_version  text not null,
  accepted_at  timestamptz not null default now(),
  jurisdiction text
);

create index consents_user_idx on public.consents (user_id, consent_type);

comment on table public.consents is
  'SAFE-02: versioned 18+/Terms/Privacy/AUP/scout_code acceptance. Insert-only (RLS in 0005); also emitted to event_log by the client.';
