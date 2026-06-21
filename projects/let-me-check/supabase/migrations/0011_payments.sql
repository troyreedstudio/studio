-- 0011_payments.sql
-- LMC Phase 4 — Payments: data spine for the Stripe integration.
--
-- Additive-only migration (no DROP on existing tables). Lays down the three
-- new payment tables (payments, refund_requests, scout_stripe_accounts) plus
-- the additive columns on profiles and checks that every Phase-4 Edge Function
-- reads and writes. Stripe secrets NEVER appear here — they live only in
-- Deno.env inside Edge Functions (_shared/stripe.ts).
--
-- What this migration does:
--   (1) Additive columns on public.profiles (stripe_customer_id, blocked_from_booking)
--       and public.checks (stripe_payment_intent_id + lookup index).
--   (2) public.payments — one row per check's money lifecycle (auth → capture
--       → transfer → refund/canceled). Minor-unit amounts; currency carried from
--       the check row (never hard-coded 'USD').
--   (3) public.refund_requests — structured reason capture (D-06/D-07 Uber/Grab
--       model). Reason codes are an exhaustive locked enum; review_status tracks
--       the automated review outcome.
--   (4) public.scout_stripe_accounts — Stripe Connect Express onboarding state
--       per Scout (SCOUT-01/SCOUT-02). Gated: charges_enabled = go-online allowed.
--   (5) RLS on all three new tables (mirrors 0005 style):
--       - payments:              seeker or assigned scout may SELECT; no client writes.
--       - refund_requests:       seeker may INSERT + SELECT their own; no client UPDATE.
--       - scout_stripe_accounts: scout may SELECT their own row; no client writes.
--
-- Payment events (auth, capture, transfer, refund, dispute, payout) are logged
-- from Edge Functions via rpc('log_event', ...) — no trigger here.
-- D-09 (capture-failure → block Seeker): the Edge Function sets blocked_from_booking
-- via service role; client cannot write that column (no UPDATE policy exists for it).

-- 1. Additive columns on public.profiles ------------------------------------

alter table public.profiles
  add column if not exists stripe_customer_id text;
-- One Stripe Customer per user; created on first payment attempt by the
-- stripe-create-payment-intent Edge Function. Used by PaymentSheet for saved cards.

alter table public.profiles
  add column if not exists blocked_from_booking boolean not null default false;
-- D-09: a Seeker whose capture fails is flagged here and barred from new checks
-- until they update their payment method and the flag is cleared server-side.

comment on column public.profiles.stripe_customer_id is
  'Stripe Customer id (cus_…). Created once per user by the stripe-create-payment-intent '
  'Edge Function; enables saved-card one-tap reorders via PaymentSheet.';
comment on column public.profiles.blocked_from_booking is
  'D-09: set true by the stripe-capture Edge Function when a valid hold fails at capture. '
  'The Seeker cannot create new checks until they settle and the flag is cleared server-side.';

-- 2. Additive column + index on public.checks --------------------------------

alter table public.checks
  add column if not exists stripe_payment_intent_id text;
-- PI id (pi_…) written by the stripe-create-payment-intent Edge Function immediately
-- after authorization. Correlates the check to the Stripe money lifecycle.

create index if not exists checks_pi_idx
  on public.checks (stripe_payment_intent_id);

comment on column public.checks.stripe_payment_intent_id is
  'Stripe PaymentIntent id (pi_…) for this check. Written at request-time (auth step). '
  'The stripe-capture Edge Function reads this to capture the hold on delivery.';

-- 3. public.payments — money lifecycle per check ----------------------------
-- One row per check. status tracks the Stripe PaymentIntent lifecycle.
-- amount_total and scout_amount are in minor units (cents). currency is NEVER
-- hard-coded — it comes from the check's market config (e.g. 'usd').

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references public.checks(id),
  stripe_payment_intent_id text,     -- platform-account PI (pi_…)
  stripe_charge_id text,             -- latest_charge after capture (refund target)
  stripe_transfer_id text,           -- Transfer to Scout after capture (D-08: never reversed)
  amount_total int not null check (amount_total > 0),
  -- minor units (e.g. 1650 = $16.50 Standard, 2200 = $22.00 Priority); Seeker total
  scout_amount int not null check (scout_amount >= 0),
  -- minor units (e.g. 800 = $8.00 Standard, 1200 = $12.00 Priority); Scout earnings
  currency text not null,
  -- currency from the market config — NEVER hard-coded 'USD'
  status text not null default 'authorized'
    check (status in (
      'authorized',     -- hold placed; card valid
      'captured',       -- funds taken; transfer pending
      'transferred',    -- Scout paid (separate Transfer after capture, D-08)
      'refunded',       -- Seeker refunded; Scout keeps their Transfer
      'capture_failed', -- D-09: rare; hold failed at capture; Seeker blocked
      'canceled'        -- hold released (no Scout / check cancelled / expired)
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (check_id) -- one money lifecycle row per check
);

create index if not exists payments_pi_idx on public.payments (stripe_payment_intent_id);
create index if not exists payments_check_idx on public.payments (check_id);

comment on table public.payments is
  'One row per check. Tracks the Stripe PaymentIntent (auth → capture → transfer/refund). '
  'D-08: stripe_transfer_id is NEVER reversed on a Seeker refund; LMC absorbs the cost. '
  'Status is advanced by Edge Functions via the service role only (no client writes).';

-- 4. public.refund_requests — structured reason + review (D-06/D-07) --------
-- Seeker submits a reason code from the structured list; automated rules decide
-- review_status; the Edge Function issues the Stripe refund without reversing the
-- Scout's Transfer (D-08 — Scout keeps pay regardless of refund outcome).

create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references public.checks(id),
  seeker_id uuid not null references auth.users(id),
  reason_code text not null
    check (reason_code in (
      'blurry',            -- clip is too blurry to see clearly
      'wrong_location',    -- Scout filmed the wrong place
      'didnt_show_needed', -- clip didn't show what the Seeker asked for
      'never_delivered',   -- no clip arrived within the window
      'other'              -- catch-all; reason_note should be provided
    )),
  reason_note text,         -- optional free-text (encouraged when reason_code = 'other')
  review_status text not null default 'pending'
    check (review_status in (
      'pending',       -- just submitted; awaiting automated review
      'auto_approved', -- passed auto-rules; refund issued immediately
      'approved',      -- manual admin approval
      'rejected',      -- not eligible (repeat abuser, valid clip, etc.)
      'manual_review'  -- flagged for human review (e.g. 2nd refund in 30 days)
    )),
  auto_approved boolean not null default false,
  -- true when the automated rules approved without human touch
  stripe_refund_id text,    -- re_… set after the Stripe refund is issued
  created_at timestamptz not null default now(),
  reviewed_at timestamptz   -- set when review_status leaves 'pending' (auto or manual)
);

create index if not exists refund_requests_seeker_idx
  on public.refund_requests (seeker_id, created_at);
create index if not exists refund_requests_check_idx
  on public.refund_requests (check_id);

comment on table public.refund_requests is
  'D-06/D-07: every Seeker refund request records a structured reason code. '
  'review_status tracks automated review outcome. Seeker may INSERT their own request '
  'for their own check; review/UPDATE is service-role only (Edge Function decision engine). '
  'D-08: issuing a refund does NOT reverse the Scout Transfer — LMC absorbs.';

-- 5. public.scout_stripe_accounts — Connect Express onboarding (SCOUT-01/02) -
-- One row per Scout. charges_enabled gates "go online" (Pitfall 5: do not rely on
-- the return_url deep link alone — wait for account.updated webhook confirmation).
-- accepted_scout_code_at records SCOUT-02 consent timestamp before the account_link
-- redirect is issued.

create table public.scout_stripe_accounts (
  scout_id uuid primary key references auth.users(id),
  stripe_account_id text not null,  -- acct_… Connect Express account id
  charges_enabled boolean not null default false,
  -- true once Stripe KYC + bank account verified; gates "go online"
  payouts_enabled boolean not null default false,
  -- true once payout rail is set up; both must be true to receive earnings
  accepted_scout_code_at timestamptz, -- SCOUT-02 consent timestamp; null until accepted
  payout_speed text not null default 'standard'
    check (payout_speed in ('standard', 'instant')),
  -- 'instant' = 2% Scout-facing fee (D-05); 'standard' = free ~24h ACH
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.scout_stripe_accounts is
  'SCOUT-01: one row per Scout for Stripe Connect Express state. charges_enabled is the '
  'go-online gate (04-RESEARCH Pitfall 5). SCOUT-02: accepted_scout_code_at must be set '
  'before the account_link redirect fires. payout_speed is the Scout choice '
  '(instant = 2% fee per D-05). Written only by service role (onboarding Edge Function '
  '+ account.updated webhook); Scout may SELECT their own row.';

-- 6. Enable RLS on all three new tables -------------------------------------

alter table public.payments              enable row level security;
alter table public.refund_requests       enable row level security;
alter table public.scout_stripe_accounts enable row level security;

-- 6a. payments: Seeker (via check ownership) or the assigned Scout may SELECT.
--     NO client INSERT/UPDATE/DELETE — service role only (mirrors checks.status model).
create policy payments_select_seeker on public.payments
  for select to authenticated
  using (
    exists (
      select 1 from public.checks c
      where c.id = check_id
        and c.seeker_id = auth.uid()
    )
  );

create policy payments_select_scout on public.payments
  for select to authenticated
  using (
    exists (
      select 1 from public.checks c
      where c.id = check_id
        and c.scout_id = auth.uid()
    )
  );
-- (intentionally NO insert/update/delete policy for authenticated on public.payments)

-- 6b. refund_requests: Seeker may INSERT for their own check + SELECT own rows.
--     NO client UPDATE (review is server-owned by the Edge Function decision engine).
create policy refund_requests_select_own on public.refund_requests
  for select to authenticated
  using (auth.uid() = seeker_id);

create policy refund_requests_insert_own on public.refund_requests
  for insert to authenticated
  with check (
    auth.uid() = seeker_id
    and exists (
      select 1 from public.checks c
      where c.id = check_id
        and c.seeker_id = auth.uid()
    )
  );
-- (intentionally NO update/delete policy for authenticated on public.refund_requests)

-- 6c. scout_stripe_accounts: Scout may SELECT their own row.
--     NO client INSERT/UPDATE — written by the service role via the onboarding
--     Edge Function + account.updated webhook.
create policy scout_accounts_select_own on public.scout_stripe_accounts
  for select to authenticated
  using (auth.uid() = scout_id);
-- (intentionally NO insert/update/delete policy for authenticated on public.scout_stripe_accounts)
