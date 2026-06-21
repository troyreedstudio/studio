-- 0012b_dispatch_accept.test.sql
-- Phase 5 / Plan 02 — Geo dispatch filter + accept_check v3 (geo-eligibility + one-active-job + race)
--
-- RED until 0012b_dispatch_rpc_accept.sql lands. Run: supabase test db
--
-- Covers:
--   DISP-01: list_open_checks_for_scout returns checks within dispatch_radius_m (1500 m) only
--   DISP-02: accept_check by a Scout outside the dispatch radius raises geo-ineligible
--   D-03:    a Scout who already has an active job cannot accept a second (one-active-job)
--   Race:    first-wins claim preserved; second Scout raises 'already taken'; scout_id unchanged
--   DISP-03: expire_stale_dispatching sweeps stale checks to no_scout; leaves fresh checks alone
--
-- Fixtures use the Miami (mia) market created by 0003.sql.
-- Radii come from market_config.dispatch_radius_m seeded by 0012 (default 1500 m).
--
-- Distance math (approx for WGS-84 near Miami 25.7617 N):
--   1 degree latitude  ≈ 111,195 m
--   scout-NEAR: lat +0.01078 → ~1,199 m (inside 1500 m)
--   scout-FAR:  lat +0.01797 → ~1,998 m (outside 1500 m)

begin;
select plan(9);

-- ============================================================================
-- Fixtures: users (seeker + 4 scouts)
-- ============================================================================
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'seeker-z@test.lmc'),
  ('a0000000-0000-0000-0000-000000000002', 'scout-near@test.lmc'),
  ('a0000000-0000-0000-0000-000000000003', 'scout-far@test.lmc'),
  ('a0000000-0000-0000-0000-000000000004', 'scout-race1@test.lmc'),
  ('a0000000-0000-0000-0000-000000000005', 'scout-race2@test.lmc')
on conflict (id) do nothing;

-- Market: mia (seeded by 0003, should already exist — safe no-op)
insert into public.markets (id, name, country) values ('mia', 'Miami', 'US')
  on conflict (id) do nothing;

-- market_config: dispatch_radius_m=1500 (seeded by 0012 from existing markets row)
insert into public.market_config (market_id, dispatch_radius_m) values ('mia', 1500)
  on conflict (market_id) do nothing;

-- Venue at Miami Beach coord (lng=-80.1918, lat=25.7617)
insert into public.venues (id, market_id, name, coord)
values ('tst-v-geo', 'mia', 'Geo Test Venue',
        ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography)
  on conflict (id) do nothing;

-- Primary OPEN check (status=dispatching, scout_id null) at the venue coord
insert into public.checks (id, seeker_id, venue_id, market_id, status, coord)
values ('b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'tst-v-geo', 'mia', 'dispatching',
        ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography)
  on conflict (id) do nothing;

-- scout_locations:
--   NEAR: lat=25.7617+0.01078=25.77248, lng=-80.1918 → ~1,199 m (inside 1500 m radius)
--   FAR:  lat=25.7617+0.01797=25.77967, lng=-80.1918 → ~1,998 m (outside 1500 m radius)
insert into public.scout_locations (scout_id, coord, is_online) values
  ('a0000000-0000-0000-0000-000000000002',
   ST_SetSRID(ST_MakePoint(-80.1918, 25.77248), 4326)::geography, true),
  ('a0000000-0000-0000-0000-000000000003',
   ST_SetSRID(ST_MakePoint(-80.1918, 25.77967), 4326)::geography, true),
  ('a0000000-0000-0000-0000-000000000004',
   ST_SetSRID(ST_MakePoint(-80.1918, 25.77248), 4326)::geography, true),
  ('a0000000-0000-0000-0000-000000000005',
   ST_SetSRID(ST_MakePoint(-80.1918, 25.77248), 4326)::geography, true)
on conflict (scout_id) do update set
  coord = excluded.coord,
  is_online = excluded.is_online;

-- ============================================================================
-- DISP-01 Test 1: scout-NEAR (1,199 m) sees the open check (within 1500 m)
-- ============================================================================
-- jwt sub = scout-NEAR calling list_open_checks_for_scout with their coords
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is(
  (select count(*) from public.list_open_checks_for_scout(25.77248, -80.1918)),
  1::bigint,
  'DISP-01: near scout (1,199 m) sees the open check within 1500 m radius'
);

reset role;

-- ============================================================================
-- DISP-01 Test 2: scout-FAR (1,998 m) sees NO checks (outside 1500 m)
-- ============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

select is(
  (select count(*) from public.list_open_checks_for_scout(25.77967, -80.1918)),
  0::bigint,
  'DISP-01: far scout (1,998 m) sees nothing (outside 1500 m radius)'
);

reset role;

-- ============================================================================
-- DISP-02 Test 3: scout-FAR accept_check raises geo-ineligible ("outside")
-- ============================================================================
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

select throws_like(
  $$ select public.accept_check('b0000000-0000-0000-0000-000000000001'::uuid) $$,
  '%outside%',
  'DISP-02: scout outside dispatch radius raises geo-ineligible error'
);

reset role;

-- ============================================================================
-- D-03 Test 4: one-active-job — scout-NEAR with an existing 'assigned' check
--              cannot accept a second open check
-- ============================================================================
-- Insert a SECOND open check for the one-active-job test
insert into public.checks (id, seeker_id, venue_id, market_id, status, coord)
values ('b0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'tst-v-geo', 'mia', 'dispatching',
        ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography)
  on conflict (id) do nothing;

-- Directly insert an 'assigned' check for scout-NEAR (simulating their active job).
-- This bypasses accept_check so it doesn't consume the dispatch check we want to test.
insert into public.checks (id, seeker_id, venue_id, market_id, status, scout_id, coord)
values ('b0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000001',
        'tst-v-geo', 'mia', 'assigned',
        'a0000000-0000-0000-0000-000000000002',
        ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography)
  on conflict (id) do nothing;

-- Now scout-NEAR tries to accept the second open check (b0000000-...-0002)
-- while they already hold an 'assigned' check
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select throws_like(
  $$ select public.accept_check('b0000000-0000-0000-0000-000000000002'::uuid) $$,
  '%active job%',
  'D-03: scout with an existing assigned check cannot accept a second job'
);

reset role;

-- ============================================================================
-- Race Tests 5/6/7: scout-RACE1 accepts the primary open check → assigned;
--                   scout-RACE2 accepts same now-claimed check → "already taken";
--                   scout_id stays the winner (RACE1)
-- ============================================================================
-- scout-RACE1 accepts the primary open check
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000004","role":"authenticated"}', true);

select is(
  (select public.accept_check('b0000000-0000-0000-0000-000000000001'::uuid)),
  'assigned'::check_status,
  'Race: first eligible Scout (RACE1) successfully accepts the open check → assigned'
);

reset role;

-- scout-RACE2 tries to accept the now-claimed check → loses the race
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);

select throws_like(
  $$ select public.accept_check('b0000000-0000-0000-0000-000000000001'::uuid) $$,
  '%already taken%',
  'Race: second Scout (RACE2) accepting the claimed check raises already taken'
);

reset role;

-- The check is still owned by RACE1 (scout_id unchanged)
select is(
  (select scout_id::text from public.checks
   where id = 'b0000000-0000-0000-0000-000000000001'),
  'a0000000-0000-0000-0000-000000000004',
  'Race: scout_id remains RACE1 (the winner) after the losing accept'
);

-- ============================================================================
-- DISP-03 Test 8: expire_stale_dispatching sweeps a stale check to no_scout
-- ============================================================================
-- Insert a dispatching check with updated_at = 20 minutes ago (past the 600 s timeout)
insert into public.checks (id, seeker_id, venue_id, market_id, status, coord, updated_at)
values ('c0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'tst-v-geo', 'mia', 'dispatching',
        ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography,
        now() - interval '20 minutes')
  on conflict (id) do nothing;

-- Invoke sweeper as service role (auth.uid() is null — matches the system actor gate)
reset role;
perform public.expire_stale_dispatching();

select is(
  (select status::text from public.checks where id = 'c0000000-0000-0000-0000-000000000001'),
  'no_scout',
  'DISP-03: expire_stale_dispatching transitions a stale (20 min old) dispatching check to no_scout'
);

-- ============================================================================
-- DISP-03 Test 9: expire_stale_dispatching leaves a fresh dispatching check untouched
-- ============================================================================
-- Insert a fresh dispatching check (updated_at = now, well within the 600 s timeout)
insert into public.checks (id, seeker_id, venue_id, market_id, status, coord)
values ('c0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'tst-v-geo', 'mia', 'dispatching',
        ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography)
  on conflict (id) do nothing;

-- Run sweeper again — should leave the fresh check alone
perform public.expire_stale_dispatching();

select is(
  (select status::text from public.checks where id = 'c0000000-0000-0000-0000-000000000002'),
  'dispatching',
  'DISP-03: expire_stale_dispatching leaves a fresh dispatching check untouched'
);

select * from finish();
rollback;
