-- 0015_sla_deadline.test.sql
-- Phase 7 / Plan 01 — D-01: accept_check stamps accepted_at + deadline_at server-side
--
-- RED until 0015_sla_deadline.sql lands (adds accepted_at + deadline_at columns and
-- rewrites accept_check to seed them from checks.tier atomically).
-- Run: supabase test db
--
-- Covers:
--   D-01a: accept_check sets accepted_at IS NOT NULL
--   D-01b: priority tier → deadline_at = accepted_at + interval '420 seconds' (7 min)
--   D-01c: standard tier → deadline_at = accepted_at + interval '600 seconds' (10 min)
--   D-01d: deadline_at is set server-side (never supplied by the client — enforced by
--          accept_check being SECURITY DEFINER with the SET clause)
--
-- Fixtures mirror the 0012b_dispatch_accept.test.sql pattern (Miami market, venue at
-- 25.7617 N, Scout NEAR at 25.77248 N — inside the 1500 m dispatch radius).
--
-- IMPORTANT: This file is intentionally RED before 0015_sla_deadline.sql is applied.
-- accept_check will succeed (columns exist after 0015) but the tier-window assertions
-- would fail with the pre-0015 accept_check that does not set deadline_at.

begin;
select plan(5);

-- ============================================================================
-- Fixtures
-- ============================================================================
insert into auth.users (id, email) values
  ('d0000000-0000-0000-0001-000000000001', 'seeker-sla@test.lmc'),
  ('d0000000-0000-0000-0001-000000000002', 'scout-priority@test.lmc'),
  ('d0000000-0000-0000-0001-000000000003', 'scout-standard@test.lmc')
on conflict (id) do nothing;

-- Market (seeded by 0003; safe no-op)
insert into public.markets (id, name, country) values ('mia', 'Miami', 'US')
  on conflict (id) do nothing;

-- market_config with dispatch_timeout_s=300 (D-02 target; pre-0015 value is 600 — migration changes it)
insert into public.market_config (market_id, dispatch_radius_m, dispatch_timeout_s)
  values ('mia', 1500, 300)
  on conflict (market_id) do update set
    dispatch_radius_m  = excluded.dispatch_radius_m,
    dispatch_timeout_s = excluded.dispatch_timeout_s;

-- Venue at Miami Beach (lng=-80.1918, lat=25.7617)
insert into public.venues (id, market_id, name, coord)
  values ('tst-v-sla', 'mia', 'SLA Test Venue',
          ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography)
  on conflict (id) do nothing;

-- Scout NEAR location: lat=25.77248 (≈1,199 m from venue, inside 1500 m radius)
insert into public.scout_locations (scout_id, coord, is_online)
  values
    ('d0000000-0000-0000-0001-000000000002',
     ST_SetSRID(ST_MakePoint(-80.1918, 25.77248), 4326)::geography, true),
    ('d0000000-0000-0000-0001-000000000003',
     ST_SetSRID(ST_MakePoint(-80.1918, 25.77248), 4326)::geography, true)
  on conflict (scout_id) do update set coord = excluded.coord, is_online = excluded.is_online;

-- Check A: tier='priority', status='dispatching', scout_id=null
insert into public.checks (id, seeker_id, venue_id, market_id, status, tier, coord)
  values ('d1000000-0000-0000-0001-000000000001',
          'd0000000-0000-0000-0001-000000000001',
          'tst-v-sla', 'mia', 'dispatching', 'priority',
          ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography)
  on conflict (id) do nothing;

-- Check B: tier='standard', status='dispatching', scout_id=null
insert into public.checks (id, seeker_id, venue_id, market_id, status, tier, coord)
  values ('d1000000-0000-0000-0001-000000000002',
          'd0000000-0000-0000-0001-000000000001',
          'tst-v-sla', 'mia', 'dispatching', 'standard',
          ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography)
  on conflict (id) do nothing;

-- ============================================================================
-- D-01a: accept_check (priority tier) sets accepted_at IS NOT NULL
-- ============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"d0000000-0000-0000-0001-000000000002","role":"authenticated"}', true);

-- Accept the priority check
select is(
  (select public.accept_check('d1000000-0000-0000-0001-000000000001'::uuid)),
  'assigned'::check_status,
  'D-01a: accept_check(priority) returns assigned'
);

reset role;

-- ============================================================================
-- D-01b: priority tier → deadline_at = accepted_at + 420 seconds (7 min)
-- ============================================================================
-- After the accept above, both accepted_at and deadline_at must be set.
-- We assert deadline_at - accepted_at = exactly 420 seconds.
select ok(
  (select deadline_at - accepted_at = interval '420 seconds'
   from public.checks
   where id = 'd1000000-0000-0000-0001-000000000001'),
  'D-01b: priority deadline_at = accepted_at + 420 seconds (7 min)'
);

select ok(
  (select accepted_at is not null
   from public.checks
   where id = 'd1000000-0000-0000-0001-000000000001'),
  'D-01a+: accepted_at IS NOT NULL after priority accept'
);

-- ============================================================================
-- D-01c: standard tier → deadline_at = accepted_at + 600 seconds (10 min)
-- ============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"d0000000-0000-0000-0001-000000000003","role":"authenticated"}', true);

select is(
  (select public.accept_check('d1000000-0000-0000-0001-000000000002'::uuid)),
  'assigned'::check_status,
  'D-01c: accept_check(standard) returns assigned'
);

reset role;

select ok(
  (select deadline_at - accepted_at = interval '600 seconds'
   from public.checks
   where id = 'd1000000-0000-0000-0001-000000000002'),
  'D-01c: standard deadline_at = accepted_at + 600 seconds (10 min)'
);

select * from finish();
rollback;
