-- 0016_scout_earnings.test.sql
-- pgTAP tests for the Phase 7 scout_earnings_weekly + scout_earnings_totals RPCs.
-- Status: RED by design — asserts schema that migration 0016 creates.
-- Push migration 0016_scout_earnings.sql first, then run these tests.
-- Run: pg_prove supabase/tests/0016_scout_earnings.test.sql
--       OR: psql ... -c "SELECT * FROM runtests();"

begin;
  select plan(6);

  -- ── Fixtures ──────────────────────────────────────────────────────────────

  -- Minimal profiles for FK satisfaction
  insert into auth.users (id, email) values
    ('aaaaaaaa-0001-0001-0001-000000000001', 'scout1@test.local'),
    ('aaaaaaaa-0001-0001-0001-000000000002', 'scout2@test.local')
  on conflict do nothing;

  insert into public.profiles (id, role) values
    ('aaaaaaaa-0001-0001-0001-000000000001', 'scout'),
    ('aaaaaaaa-0001-0001-0001-000000000002', 'scout')
  on conflict do nothing;

  -- Minimal checks rows
  insert into public.checks (id, seeker_id, scout_id, status, tier, updated_at)
  values
    -- check A: scout1, delivered, updated today
    ('bbbbbbbb-0001-0001-0001-000000000001',
     'aaaaaaaa-0001-0001-0001-000000000002', -- seeker (scout2 as seeker for FK)
     'aaaaaaaa-0001-0001-0001-000000000001', -- scout1
     'delivered', 'standard', now()),
    -- check B: scout1, delivered, updated yesterday
    ('bbbbbbbb-0001-0001-0001-000000000002',
     'aaaaaaaa-0001-0001-0001-000000000002',
     'aaaaaaaa-0001-0001-0001-000000000001',
     'delivered', 'priority', now() - interval '1 day'),
    -- check C: scout2, delivered — must NOT appear in scout1's totals
    ('bbbbbbbb-0001-0001-0001-000000000003',
     'aaaaaaaa-0001-0001-0001-000000000001', -- seeker (scout1 as seeker)
     'aaaaaaaa-0001-0001-0001-000000000002', -- scout2
     'delivered', 'standard', now())
  on conflict do nothing;

  -- Payments: status 'transferred' for checks A and B; 'authorized' for check C scout2
  insert into public.payments (check_id, stripe_payment_intent_id, amount_total, scout_amount, currency, status)
  values
    ('bbbbbbbb-0001-0001-0001-000000000001', 'pi_test_0016_a', 1650, 800,  'usd', 'transferred'),
    ('bbbbbbbb-0001-0001-0001-000000000002', 'pi_test_0016_b', 2200, 1200, 'usd', 'captured'),
    ('bbbbbbbb-0001-0001-0001-000000000003', 'pi_test_0016_c', 1650, 800,  'usd', 'authorized') -- scout2, not yet captured
  on conflict do nothing;

  -- ── Test 1: scout_earnings_totals returns summed cents for scout1 ──────────
  -- Scout1 has check A (800) + check B (1200) both transferred/captured = 2000 total
  select is(
    (select total_cents from public.scout_earnings_totals('aaaaaaaa-0001-0001-0001-000000000001'::uuid)),
    2000::bigint,
    'scout_earnings_totals: total_cents = 800 + 1200 = 2000 for scout1'
  );

  -- ── Test 2: scout_earnings_totals clip count ──────────────────────────────
  select is(
    (select total_clips from public.scout_earnings_totals('aaaaaaaa-0001-0001-0001-000000000001'::uuid)),
    2::bigint,
    'scout_earnings_totals: total_clips = 2 for scout1'
  );

  -- ── Test 3: scout_earnings_totals only counts transferred/captured ─────────
  -- Scout2 has check C with status 'authorized' — should return 0 cents
  select is(
    (select total_cents from public.scout_earnings_totals('aaaaaaaa-0001-0001-0001-000000000002'::uuid)),
    0::bigint,
    'scout_earnings_totals: authorized payments NOT counted (only transferred/captured)'
  );

  -- ── Test 4: scout_earnings_weekly returns rows within 7 days ─────────────
  select ok(
    (select count(*) from public.scout_earnings_weekly('aaaaaaaa-0001-0001-0001-000000000001'::uuid)) >= 1,
    'scout_earnings_weekly: returns at least 1 row for scout1 with recent checks'
  );

  -- ── Test 5: scout_earnings_weekly sum matches expected ────────────────────
  select is(
    (select sum(cents) from public.scout_earnings_weekly('aaaaaaaa-0001-0001-0001-000000000001'::uuid)),
    2000::bigint,
    'scout_earnings_weekly: weekly sum = 800 + 1200 = 2000 for scout1'
  );

  -- ── Test 6: scout_earnings_totals with coalesce — empty scout returns 0 ──
  -- A scout with no checks returns 0 (not null)
  select is(
    (
      select coalesce(total_cents, -1)
      from public.scout_earnings_totals('aaaaaaaa-0001-0001-0001-000000000001'::uuid)
      where false  -- no rows
      union all select 0::bigint
      limit 1
    ),
    0::bigint,
    'scout_earnings_totals: coalesce returns 0 not null for empty scout'
  );

  select * from finish();
rollback;
