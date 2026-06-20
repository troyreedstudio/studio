-- 0004_core_entities.sql
-- LMC Phase 1 — core entities (DATA-01, DATA-03) + the check_status state machine
-- enum (DATA-02). Column names mirror the existing client store shapes
-- (state/saved.ts, recents.ts, payment-method.ts, recurring.ts) so Plan 03 can
-- rewire the stores without screen churn.
--
-- RLS lands in 0005; the server-only status writer lands in 0006.

-- The check lifecycle as a typed state machine. checks.status IS the workflow.
-- Only the server (transition_check, 0006) may advance it.
create type check_status as enum (
  'requested',
  'authorized',
  'dispatching',
  'assigned',
  'filming',
  'uploaded',
  'processing',
  'delivered',
  'rated',
  'cancelled',
  'expired'
);

-- checks --------------------------------------------------------------------
create table public.checks (
  id         uuid primary key default gen_random_uuid(),
  seeker_id  uuid not null references auth.users(id),
  scout_id   uuid references auth.users(id),                -- server-assigned only
  venue_id   text references public.venues(id),
  market_id  text references public.markets(id),
  tier       text not null default 'standard' check (tier in ('standard','priority')),
  status     check_status not null default 'requested',     -- server-only writes (RLS + 0006)
  currency   text not null default 'USD',                   -- money carries a currency
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index checks_seeker_idx on public.checks (seeker_id, created_at);
create index checks_scout_idx  on public.checks (scout_id, created_at);

comment on column public.checks.status is
  'State machine (DATA-02). Clients have NO update policy; only transition_check (0006) writes this.';

-- saved_places (mirrors SavedPlace) -----------------------------------------
create table public.saved_places (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id),
  place_key text not null,                                  -- client SavedPlace.id
  name      text not null,
  address   text,
  category  text,
  coord     geography(point, 4326),
  market_id text,
  saved_at  timestamptz not null default now(),
  unique (user_id, place_key)
);

create index saved_places_user_idx on public.saved_places (user_id);

-- recents (mirrors RecentCheck) ---------------------------------------------
create table public.recents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id),
  name       text not null,
  city       text,
  created_at timestamptz not null default now()
);

create index recents_user_idx on public.recents (user_id, created_at);

-- recurring_checks (mirrors RecurringCheck) ---------------------------------
create table public.recurring_checks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id),
  venue_name text not null,
  address    text,
  freq       text not null check (freq in ('daily','weekly','monthly')),
  time       text not null,                                 -- "08:00"
  market_id  text,
  coord      geography(point, 4326),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index recurring_checks_user_idx on public.recurring_checks (user_id);

-- payment_methods placeholder (NO Stripe in Phase 1) ------------------------
-- Stripe customer/token columns land in Phase 4. Phase 1 stores only the
-- display shape (brand + last4) matching the client SavedCard.
create table public.payment_methods (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id),
  brand    text not null check (brand in ('Visa','Mastercard','Amex','ApplePay')),
  last4    text not null,
  saved_at timestamptz not null default now()
);

create index payment_methods_user_idx on public.payment_methods (user_id);

-- ratings -------------------------------------------------------------------
create table public.ratings (
  id         uuid primary key default gen_random_uuid(),
  check_id   uuid not null references public.checks(id),
  seeker_id  uuid not null references auth.users(id),
  stars      int not null check (stars between 1 and 5),
  created_at timestamptz not null default now()
);

create index ratings_check_idx on public.ratings (check_id);
