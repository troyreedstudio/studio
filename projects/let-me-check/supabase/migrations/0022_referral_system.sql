-- 0022_referral_system.sql
-- LMC Referral System — REF-01 through REF-05
--
-- Introduces four objects:
--   1. profiles.referral_code       — stable, human-shareable per-user code (REF-01)
--   2. referral_config              — config-driven reward amounts, zero by default (REF-02)
--   3. referrals                    — attribution ledger: who referred whom (REF-03)
--   4. referral_credits             — credit ledger with idempotency key (REF-04)
--
-- Security invariants:
--   • A user can only be referred ONCE (unique referred_id on referrals).
--   • No self-referral enforced by the referral-apply edge function (code lookup != caller).
--   • Crediting is idempotent: unique(referral_id, reason) on referral_credits.
--   • Reward amounts are read from referral_config — never hardcoded.
--   • Clients read but NEVER write referrals or referral_credits (RLS — no INSERT policy).
--   • qualify-credit step is a separate operation (hook/edge fn on first paid check).
--
-- All amounts stored in cents (integer) to avoid floating-point currency errors.
-- Currency column defaults to 'usd' and is there for future multi-currency support.

-- =============================================================================
-- 1. profiles.referral_code — stable, unique, human-shareable (REF-01)
-- =============================================================================
-- 7-character base-32 code from the same alphabet used by stableScoutId in the app
-- (ABCDEFGHJKLMNPQRSTUVWXYZ23456789 — no 0/O/1/I to avoid ambiguity).
-- Generated via a BEFORE INSERT trigger so every new profile row gets one
-- automatically. Backfill at the bottom covers existing rows.

alter table public.profiles
  add column if not exists referral_code text unique;

comment on column public.profiles.referral_code is
  'REF-01: stable 7-char base-32 shareable referral code. Unique. Generated on profile creation.';

-- Function that converts a UUID to a 7-char base-32 referral code.
-- Uses the last 7 hex digits of the UUID (same slice as stableScoutId) encoded
-- into the unambiguous base-32 alphabet. This is deterministic per user id.
create or replace function public.uid_to_referral_code(p_uid uuid)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_hex      text;
  v_n        bigint;
  v_out      text := '';
  v_i        int;
begin
  -- Take the last 7 hex chars of the UUID (strip hyphens first).
  v_hex := right(replace(p_uid::text, '-', ''), 7);
  v_n := ('x' || v_hex)::bit(32)::bigint;
  -- Make positive (handle the top bit) — bigint is signed 64-bit, 7 hex = 28-bit value.
  v_n := v_n & x'0fffffff'::bigint;

  -- Encode as 7 base-32 characters (least-significant first, then reverse).
  for v_i in 1..7 loop
    v_out := substring(v_alphabet, (v_n % 32)::int + 1, 1) || v_out;
    v_n := v_n / 32;
  end loop;

  return v_out;
end;
$$;

comment on function public.uid_to_referral_code(uuid) is
  'REF-01: deterministic 7-char base-32 referral code derived from a user UUID. '
  'Same alphabet as stableScoutId (no 0/O/1/I). Immutable — same uid always yields same code.';

-- Trigger function: populate referral_code on new profile rows.
create or replace function public.set_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.referral_code is null then
    new.referral_code := public.uid_to_referral_code(new.id);
  end if;
  return new;
end;
$$;

create trigger trg_set_referral_code
  before insert on public.profiles
  for each row
  execute function public.set_referral_code();

-- Backfill existing profile rows that have no code yet.
update public.profiles
set referral_code = public.uid_to_referral_code(id)
where referral_code is null;

-- =============================================================================
-- 2. referral_config — config-driven reward amounts (REF-02)
-- =============================================================================
-- A single-row config table. Reward amounts are set by an operator, not hardcoded.
-- Default is 0 cents — the infrastructure works immediately; amounts are tunable.
-- qualify_event names the check-lifecycle event that triggers the credit (e.g.
-- 'check.delivered' — wired in a follow-up Edge Function / DB trigger).

create table if not exists public.referral_config (
  id                      uuid primary key default gen_random_uuid(),
  referrer_reward_cents   int  not null default 0 check (referrer_reward_cents >= 0),
  referee_reward_cents    int  not null default 0 check (referee_reward_cents >= 0),
  currency                text not null default 'usd',
  qualify_event           text not null default 'check.delivered',
  updated_at              timestamptz not null default now()
);

comment on table public.referral_config is
  'REF-02: single-row config for referral reward amounts. Amounts are set by operators, not hardcoded. '
  'Default 0 — system works immediately; update referrer_reward_cents / referee_reward_cents to activate rewards. '
  'qualify_event = the event type on event_log that triggers credit (default: check.delivered).';

-- Ensure exactly one config row exists (insert-and-skip-on-conflict).
insert into public.referral_config (id, referrer_reward_cents, referee_reward_cents, currency, qualify_event)
values (gen_random_uuid(), 0, 0, 'usd', 'check.delivered')
on conflict do nothing;

-- =============================================================================
-- 3. referrals — attribution ledger (REF-03)
-- =============================================================================
-- One row per referred user. referred_id is UNIQUE — a user can only be referred once.
-- code_used stores the code at attribution time (defensive snapshot).
-- status: pending = attributed but not yet qualified; qualified = first paid check done.

create table if not exists public.referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references public.profiles(id) on delete restrict,
  referred_id   uuid not null unique references public.profiles(id) on delete restrict,
  code_used     text not null,
  status        text not null default 'pending' check (status in ('pending', 'qualified')),
  created_at    timestamptz not null default now(),
  qualified_at  timestamptz
);

create index referrals_referrer_idx on public.referrals (referrer_id);
create index referrals_status_idx   on public.referrals (status);

comment on table public.referrals is
  'REF-03: referral attribution. One row per referred user (referred_id UNIQUE — referred once only). '
  'status: pending=attributed, qualified=first paid check completed (triggers credits). '
  'INSERT via referral-apply edge fn only. Clients read rows where they are the referrer.';

-- =============================================================================
-- 4. referral_credits — idempotent credit ledger (REF-04)
-- =============================================================================
-- Append-only ledger. Every credit event writes one row.
-- Idempotency: UNIQUE(referral_id, reason) — crediting a reason twice for the same
-- referral raises a constraint violation (the edge fn catches and swallows it).
-- reason examples: 'referrer_qualify_reward', 'referee_welcome_bonus'.

create table if not exists public.referral_credits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete restrict,
  amount_cents int  not null default 0 check (amount_cents >= 0),
  currency     text not null default 'usd',
  reason       text not null,
  referral_id  uuid not null references public.referrals(id) on delete restrict,
  created_at   timestamptz not null default now(),
  -- Idempotency: one credit per (referral, reason) pair — prevents double-crediting.
  unique (referral_id, reason)
);

create index referral_credits_user_idx on public.referral_credits (user_id);

comment on table public.referral_credits is
  'REF-04: idempotent credit ledger. UNIQUE(referral_id, reason) prevents double-crediting. '
  'amount_cents is always 0 until referral_config is updated by an operator. '
  'reason values: referrer_qualify_reward, referee_welcome_bonus. '
  'Clients read own rows only.';

-- =============================================================================
-- 5. RLS policies (REF-05)
-- =============================================================================
-- referral_config: readable by all authenticated users (amounts are not secret).
-- referrals: users read rows where they are the referrer (not where they were referred).
-- referral_credits: users read their own credit rows only.
-- No INSERT/UPDATE/DELETE from clients — all writes go through Edge Functions.

alter table public.referral_config    enable row level security;
alter table public.referrals          enable row level security;
alter table public.referral_credits   enable row level security;

-- referral_config: authenticated read-only
create policy "referral_config_select_authed"
  on public.referral_config
  for select
  using (auth.uid() is not null);

-- referrals: referrer reads their own outbound referrals
create policy "referrals_select_own"
  on public.referrals
  for select
  using (auth.uid() = referrer_id);

-- referral_credits: user reads own credit rows
create policy "referral_credits_select_own"
  on public.referral_credits
  for select
  using (auth.uid() = user_id);

-- =============================================================================
-- 6. Helper RPC: get_my_referral_stats — returns the caller's code + aggregate stats
-- =============================================================================
-- Called by lib/referrals.ts getMyReferral(). Returns a single JSON object so the
-- client makes one round-trip. SECURITY DEFINER so it can count referrals freely;
-- the WHERE clause restricts to auth.uid() — IDOR-safe.

create or replace function public.get_my_referral_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_code       text;
  v_invited    int  := 0;
  v_joined     int  := 0;
  v_credits    int  := 0;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- Referral code from profiles (always set post-0022 backfill).
  select referral_code into v_code from public.profiles where id = v_uid;

  -- Count rows in referrals where the caller is the referrer.
  select count(*) into v_invited
  from public.referrals where referrer_id = v_uid;

  -- Count qualified referrals (referred_id exists in profiles = they completed signup).
  select count(*) into v_joined
  from public.referrals where referrer_id = v_uid and status = 'qualified';

  -- Sum of credits this user has accumulated (may be 0 until config is set).
  select coalesce(sum(amount_cents), 0) into v_credits
  from public.referral_credits where user_id = v_uid;

  return jsonb_build_object(
    'code',         v_code,
    'invited',      v_invited,
    'joined',       v_joined,
    'creditsCents', v_credits
  );
end;
$$;

comment on function public.get_my_referral_stats() is
  'REF stats RPC. Returns { code, invited, joined, creditsCents } for auth.uid(). '
  'SECURITY DEFINER, IDOR-safe (always uses auth.uid()). One round-trip for invite.tsx.';

-- =============================================================================
-- 7. qualify_referral — mark a referral as qualified and credit both parties
-- =============================================================================
-- Called by the qualify-credit edge function (or a DB trigger on check.delivered
-- event_log insert). Idempotent: the UNIQUE(referral_id, reason) constraint on
-- referral_credits absorbs duplicate calls silently.
--
-- This function is the HOOK for the qualify step. Wire it from:
--   - An edge function listening on event_log for p_event_type = 'check.delivered'
--     (the qualify_event from referral_config) for the referred user's first check.
--   - OR a pg_cron / realtime trigger (Phase 8+).
-- Until then, this function exists and is tested; the trigger is the TODO.

create or replace function public.qualify_referral(p_referral_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref           record;
  v_cfg           record;
begin
  -- Load the referral row (must exist and be pending).
  select * into v_ref from public.referrals where id = p_referral_id;
  if not found then
    raise exception 'qualify_referral: referral % not found', p_referral_id;
  end if;
  if v_ref.status = 'qualified' then
    -- Already qualified — idempotent return (same as double-credit guard).
    return;
  end if;

  -- Load reward config.
  select * into v_cfg from public.referral_config limit 1;
  if not found then
    raise exception 'qualify_referral: no referral_config row found';
  end if;

  -- Mark the referral as qualified.
  update public.referrals
  set status = 'qualified', qualified_at = now()
  where id = p_referral_id;

  -- Credit the referrer (idempotent — unique(referral_id, reason) absorbs duplicates).
  if v_cfg.referrer_reward_cents > 0 then
    insert into public.referral_credits
      (user_id, amount_cents, currency, reason, referral_id)
    values
      (v_ref.referrer_id, v_cfg.referrer_reward_cents, v_cfg.currency,
       'referrer_qualify_reward', p_referral_id)
    on conflict (referral_id, reason) do nothing;
  end if;

  -- Credit the referee (idempotent).
  if v_cfg.referee_reward_cents > 0 then
    insert into public.referral_credits
      (user_id, amount_cents, currency, reason, referral_id)
    values
      (v_ref.referred_id, v_cfg.referee_reward_cents, v_cfg.currency,
       'referee_welcome_bonus', p_referral_id)
    on conflict (referral_id, reason) do nothing;
  end if;
end;
$$;

comment on function public.qualify_referral(uuid) is
  'REF qualify step. Marks a referral as qualified and credits both parties from referral_config. '
  'Idempotent: double-calls are absorbed by UNIQUE(referral_id,reason). '
  'No-ops when referral_config amounts are 0 (safe until operator sets rewards). '
  'Wire this from: a qualify-credit edge function on check.delivered events for the referred user.';
