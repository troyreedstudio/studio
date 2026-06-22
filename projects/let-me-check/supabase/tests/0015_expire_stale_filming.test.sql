-- 0015_expire_stale_filming.test.sql
-- Phase 7 / Plan 01 — D-03: expire_stale_filming() + transition-edge validity
--
-- RED until 0015_sla_deadline.sql lands (adds expire_stale_filming() function and
-- the assigned->no_scout + filming->no_scout edges in is_valid_check_transition).
-- Run: supabase test db
--
-- Covers:
--   D-03a: expire_stale_filming() sweeps a past-deadline 'assigned' check to no_scout
--   D-03b: expire_stale_filming() does NOT sweep a future-deadline 'filming' check
--   D-03c: expire_stale_filming() does NOT touch rows where deadline_at IS NULL (legacy safety)
--   BLOCKER-1a: is_valid_check_transition('assigned','no_scout') IS TRUE (new edge)
--   BLOCKER-1b: is_valid_check_transition('filming','no_scout') IS TRUE (new edge)
--
-- These two transition edges are required by BOTH expire_stale_filming (D-03, this plan)
-- AND by the trouble-report Edge Function (Plan 02, service role) to drive no_scout
-- from mid-flight states without raising 'illegal transition'.
--
-- Fixtures use the Miami (mia) market. Checks are inserted directly into the
-- checks table in the required statuses, as service-role sweeper tests do not need
-- to go through accept_check (the fixture pre-sets the end state).

begin;
select plan(7);

-- ============================================================================
-- Fixtures
-- ============================================================================
insert into auth.users (id, email) values
  ('e0000000-0000-0000-0001-000000000001', 'seeker-exp@test.lmc'),
  ('e0000000-0000-0000-0001-000000000002', 'scout-exp@test.lmc')
on conflict (id) do nothing;

-- Market (seeded by 0003; safe no-op)
insert into public.markets (id, name, country) values ('mia', 'Miami', 'US')
  on conflict (id) do nothing;

-- market_config (no-op if already seeded by 0012)
insert into public.market_config (market_id, dispatch_radius_m)
  values ('mia', 1500)
  on conflict (market_id) do nothing;

-- Venue
insert into public.venues (id, market_id, name, coord)
  values ('tst-v-exp', 'mia', 'Expiry Test Venue',
          ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography)
  on conflict (id) do nothing;

-- ============================================================================
-- D-03a: assigned check with deadline_at in the past → swept to no_scout
-- ============================================================================
-- Insert directly with status='assigned', deadline_at = 1 minute ago.
-- Bypasses accept_check — fixture sets the state we want to test expiry on.
insert into public.checks
  (id, seeker_id, venue_id, market_id, status, scout_id, tier,
   coord, accepted_at, deadline_at)
  values (
    'e1000000-0000-0000-0001-000000000001',
    'e0000000-0000-0000-0001-000000000001',
    'tst-v-exp', 'mia', 'assigned',
    'e0000000-0000-0000-0001-000000000002',
    'priority',
    ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography,
    now() - interval '8 minutes',
    now() - interval '1 minute'   -- deadline already passed
  )
  on conflict (id) do nothing;

-- Invoke sweeper as service role (auth.uid() null — matches system actor gate)
reset role;
perform public.expire_stale_filming();

select is(
  (select status::text from public.checks
   where id = 'e1000000-0000-0000-0001-000000000001'),
  'no_scout',
  'D-03a: expire_stale_filming() sweeps assigned+past-deadline check to no_scout'
);

-- ============================================================================
-- D-03b: filming check with deadline_at in the future → NOT swept
-- ============================================================================
insert into public.checks
  (id, seeker_id, venue_id, market_id, status, scout_id, tier,
   coord, accepted_at, deadline_at)
  values (
    'e1000000-0000-0000-0001-000000000002',
    'e0000000-0000-0000-0001-000000000001',
    'tst-v-exp', 'mia', 'filming',
    'e0000000-0000-0000-0001-000000000002',
    'standard',
    ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography,
    now() - interval '2 minutes',
    now() + interval '5 minutes'  -- deadline is in the future
  )
  on conflict (id) do nothing;

-- Re-run sweeper — future-deadline check must be untouched
perform public.expire_stale_filming();

select is(
  (select status::text from public.checks
   where id = 'e1000000-0000-0000-0001-000000000002'),
  'filming',
  'D-03b: expire_stale_filming() leaves a filming check with future deadline_at untouched'
);

-- ============================================================================
-- D-03c: assigned check with deadline_at IS NULL (legacy) → NOT swept
-- ============================================================================
-- This is the NULL-safety guard (Pitfall 3): legacy rows pre-dating Phase 7
-- must never be expired by the sweeper (deadline_at IS NOT NULL guard in the WHERE clause).
insert into public.checks
  (id, seeker_id, venue_id, market_id, status, scout_id, tier,
   coord, accepted_at, deadline_at)
  values (
    'e1000000-0000-0000-0001-000000000003',
    'e0000000-0000-0000-0001-000000000001',
    'tst-v-exp', 'mia', 'assigned',
    'e0000000-0000-0000-0001-000000000002',
    'standard',
    ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography,
    now() - interval '20 minutes',
    NULL   -- no deadline_at (legacy pre-Phase-7 row)
  )
  on conflict (id) do nothing;

-- Re-run sweeper — NULL deadline_at must be excluded by the IS NOT NULL guard
perform public.expire_stale_filming();

select is(
  (select status::text from public.checks
   where id = 'e1000000-0000-0000-0001-000000000003'),
  'assigned',
  'D-03c: expire_stale_filming() does NOT touch rows where deadline_at IS NULL (legacy safety)'
);

-- ============================================================================
-- expire_stale_filming() return count sanity: at least 1 expired row above
-- ============================================================================
-- Re-insert the past-deadline assigned check and verify return >= 1.
-- (The e1000000-...-0001 check is already no_scout from D-03a above; insert a fresh one.)
insert into public.checks
  (id, seeker_id, venue_id, market_id, status, scout_id, tier,
   coord, accepted_at, deadline_at)
  values (
    'e1000000-0000-0000-0001-000000000004',
    'e0000000-0000-0000-0001-000000000001',
    'tst-v-exp', 'mia', 'assigned',
    'e0000000-0000-0000-0001-000000000002',
    'priority',
    ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography,
    now() - interval '10 minutes',
    now() - interval '3 minutes'   -- also past deadline
  )
  on conflict (id) do nothing;

select ok(
  (select public.expire_stale_filming() >= 1),
  'D-03: expire_stale_filming() returns >= 1 when at least one check is past deadline'
);

-- ============================================================================
-- BLOCKER-1a: is_valid_check_transition('assigned','no_scout') IS TRUE
-- ============================================================================
-- Required by expire_stale_filming() and trouble-report (Plan 02 service role).
-- Without this edge, every service-role sweep raises 'illegal transition assigned -> no_scout'.
select ok(
  public.is_valid_check_transition('assigned'::check_status, 'no_scout'::check_status),
  'BLOCKER-1a: is_valid_check_transition(assigned -> no_scout) IS TRUE'
);

-- ============================================================================
-- BLOCKER-1b: is_valid_check_transition('filming','no_scout') IS TRUE
-- ============================================================================
-- Required by expire_stale_filming() (a check in filming status past deadline_at
-- must be sweepable) and trouble-report (Scout in filming presses Trouble-Here).
select ok(
  public.is_valid_check_transition('filming'::check_status, 'no_scout'::check_status),
  'BLOCKER-1b: is_valid_check_transition(filming -> no_scout) IS TRUE'
);

select * from finish();
rollback;
