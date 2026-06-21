-- 0011_payments.test.sql — Phase 4 / PAY-01..PAY-05, SCOUT-01, SCOUT-02
-- Proves the 0011_payments.sql migration:
--   * The three new tables (payments, refund_requests, scout_stripe_accounts) exist
--   * The additive columns on profiles + checks exist
--   * Key NOT NULL / currency / amount constraints are enforced
--   * Illegal status and reason_code values are rejected by CHECK constraints
--   * Row-Level Security is enabled on all three new tables
-- Run with: supabase test db  (pgTAP). LIVE run gated to 04-05.
-- Authored offline; deterministic (no network, no secrets, no Edge Functions).

begin;
select plan(17);

-- ===== 1. Tables exist =======================================================

select has_table('public', 'payments',
  'public.payments table exists (migration 0011)');

select has_table('public', 'refund_requests',
  'public.refund_requests table exists (migration 0011)');

select has_table('public', 'scout_stripe_accounts',
  'public.scout_stripe_accounts table exists (migration 0011)');

-- ===== 2. Additive columns on profiles + checks ==============================

select has_column('public', 'profiles', 'stripe_customer_id',
  'profiles.stripe_customer_id column exists');

select has_column('public', 'profiles', 'blocked_from_booking',
  'profiles.blocked_from_booking column exists');

select has_column('public', 'checks', 'stripe_payment_intent_id',
  'checks.stripe_payment_intent_id column exists');

-- ===== 3. NOT NULL constraints on payments ==================================

select col_not_null('public', 'payments', 'currency',
  'payments.currency is NOT NULL (never hard-coded; must be supplied)');

select col_not_null('public', 'payments', 'amount_total',
  'payments.amount_total is NOT NULL');

select col_not_null('public', 'payments', 'scout_amount',
  'payments.scout_amount is NOT NULL');

-- ===== 4. CHECK constraint: payments.status rejects bogus value ==============
-- Fixtures required: a user + market + venue + check to satisfy the FK.

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'pay-seeker@test.lmc')
on conflict (id) do nothing;

insert into public.markets (id, name, country) values ('pay', 'PayTest', 'US')
on conflict (id) do nothing;

insert into public.venues (id, market_id, name) values ('pay-v', 'pay', 'Pay Venue')
on conflict (id) do nothing;

insert into public.checks (id, seeker_id, venue_id, market_id, status)
values ('bbbbbbbb-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001',
        'pay-v', 'pay', 'requested')
on conflict (id) do nothing;

select throws_ok(
  $$
    insert into public.payments
      (check_id, amount_total, scout_amount, currency, status)
    values
      ('bbbbbbbb-0000-0000-0000-000000000001', 1650, 800, 'usd', 'bogus')
  $$,
  '23514',
  null,
  'payments.status CHECK rejects invalid value ''bogus'''
);

-- ===== 5. CHECK constraint: refund_requests.reason_code rejects bad value ====

select throws_ok(
  $$
    insert into public.refund_requests
      (check_id, seeker_id, reason_code)
    values
      ('bbbbbbbb-0000-0000-0000-000000000001',
       'aaaaaaaa-0000-0000-0000-000000000001',
       'not_a_reason')
  $$,
  '23514',
  null,
  'refund_requests.reason_code CHECK rejects ''not_a_reason'''
);

-- ===== 6. Valid insert into payments succeeds ================================
select lives_ok(
  $$
    insert into public.payments
      (check_id, amount_total, scout_amount, currency, status)
    values
      ('bbbbbbbb-0000-0000-0000-000000000001', 1650, 800, 'usd', 'authorized')
  $$,
  'valid payment row (authorized) inserts successfully'
);

-- ===== 7. Valid insert into refund_requests succeeds =========================
select lives_ok(
  $$
    insert into public.refund_requests
      (check_id, seeker_id, reason_code)
    values
      ('bbbbbbbb-0000-0000-0000-000000000001',
       'aaaaaaaa-0000-0000-0000-000000000001',
       'blurry')
  $$,
  'valid refund_request row (blurry) inserts successfully'
);

-- ===== 8. RLS is active on all three new tables ==============================

select is(
  row_security_active('public.payments'),
  true,
  'RLS is active on public.payments'
);

select is(
  row_security_active('public.refund_requests'),
  true,
  'RLS is active on public.refund_requests'
);

select is(
  row_security_active('public.scout_stripe_accounts'),
  true,
  'RLS is active on public.scout_stripe_accounts'
);

select * from finish();
rollback;
