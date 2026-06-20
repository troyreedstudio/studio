-- scout_rls.test.sql — Phase 2 / CHECK-03 (T-02-04)
-- Proves the narrow Scout read path (migration 0009):
--   * a Scout SEES open checks (dispatching, scout_id null) and their OWN assigned checks
--   * a Scout does NOT see another seeker's delivered check (no broad read)
-- Run with: supabase test db  (pgTAP).
-- NOTE: RED until migration 0009 (Scout SELECT policies) lands.

begin;
select plan(4);

-- Fixtures: Seeker A owns checks X (open) and Y (delivered). Scout B is assigned check Z.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'seeker-a@test.lmc'),
  ('33333333-3333-3333-3333-333333333333', 'scout-b@test.lmc')
on conflict (id) do nothing;

insert into public.markets (id, name, country) values ('tst', 'Testville', 'US')
  on conflict (id) do nothing;
insert into public.venues (id, market_id, name) values ('tst-v', 'tst', 'Test Venue')
  on conflict (id) do nothing;

-- X: open (dispatching, unclaimed) — a Scout should see it.
insert into public.checks (id, seeker_id, venue_id, market_id, status)
values ('aaaa1111-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111', 'tst-v', 'tst', 'dispatching')
  on conflict (id) do nothing;

-- Y: another seeker's delivered check, NOT assigned to scout B — must stay hidden.
insert into public.checks (id, seeker_id, venue_id, market_id, status)
values ('aaaa2222-0000-0000-0000-000000000002',
        '11111111-1111-1111-1111-111111111111', 'tst-v', 'tst', 'delivered')
  on conflict (id) do nothing;

-- Z: assigned to scout B — the Scout's OWN check, should be visible.
insert into public.checks (id, seeker_id, scout_id, venue_id, market_id, status)
values ('aaaa3333-0000-0000-0000-000000000003',
        '11111111-1111-1111-1111-111111111111',
        '33333333-3333-3333-3333-333333333333', 'tst-v', 'tst', 'assigned')
  on conflict (id) do nothing;

-- ===== Become Scout B (authenticated) =====
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

-- 1. Scout B sees the open check X (dispatching, unclaimed).
select is(
  (select count(*)::int from public.checks
     where id = 'aaaa1111-0000-0000-0000-000000000001'),
  1,
  'scout B sees the open (dispatching) check X'
);

-- 2. Scout B sees their own assigned check Z.
select is(
  (select count(*)::int from public.checks
     where id = 'aaaa3333-0000-0000-0000-000000000003'),
  1,
  'scout B sees their own assigned check Z'
);

-- 3. Scout B does NOT see another seeker's delivered check Y.
select is(
  (select count(*)::int from public.checks
     where id = 'aaaa2222-0000-0000-0000-000000000002'),
  0,
  'scout B cannot see another seeker''s delivered check Y'
);

-- 4. Count of another seeker's delivered checks visible to the Scout is 0.
select is(
  (select count(*)::int from public.checks
     where seeker_id = '11111111-1111-1111-1111-111111111111'
       and status = 'delivered'),
  0,
  'no delivered checks owned by seeker A are visible to scout B'
);

reset role;
select * from finish();
rollback;
