-- accept_check_atomic.test.sql — Phase 2 / CHECK-03 (T-02-01)
-- Proves accept_check() is an atomic first-wins claim: two scouts racing on the
-- same open ('dispatching') check leave EXACTLY ONE assigned; the loser raises
-- 'already taken' and does NOT overwrite the winner's scout_id.
-- Run with: supabase test db  (pgTAP).
-- NOTE: RED until migration 0007 (accept_check) lands.

begin;
select plan(4);

-- Fixtures: one open check + two competing scouts (B wins, C loses) -----------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'seeker-a@test.lmc'),
  ('33333333-3333-3333-3333-333333333333', 'scout-b@test.lmc'),
  ('44444444-4444-4444-4444-444444444444', 'scout-c@test.lmc')
on conflict (id) do nothing;

insert into public.markets (id, name, country) values ('tst', 'Testville', 'US')
  on conflict (id) do nothing;
insert into public.venues (id, market_id, name) values ('tst-v', 'tst', 'Test Venue')
  on conflict (id) do nothing;

-- An OPEN check: dispatching, scout_id null.
insert into public.checks (id, seeker_id, venue_id, market_id, status)
values ('55555555-5555-5555-5555-555555555555',
        '11111111-1111-1111-1111-111111111111', 'tst-v', 'tst', 'dispatching')
  on conflict (id) do nothing;

-- ===== Scout B accepts first: succeeds =====
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

select lives_ok(
  $$ select public.accept_check('55555555-5555-5555-5555-555555555555'::uuid) $$,
  'scout B accept_check on an open check succeeds'
);

reset role;

select is(
  (select status::text from public.checks where id = '55555555-5555-5555-5555-555555555555'),
  'assigned',
  'the check is now assigned after scout B accepted'
);

-- ===== Scout C accepts the now-claimed check: loses =====
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);

select throws_like(
  $$ select public.accept_check('55555555-5555-5555-5555-555555555555'::uuid) $$,
  '%already taken%',
  'scout C accept_check on a claimed check raises already taken'
);

reset role;

-- The losing accept did NOT change the winner: scout_id is still scout B.
select is(
  (select scout_id::text from public.checks where id = '55555555-5555-5555-5555-555555555555'),
  '33333333-3333-3333-3333-333333333333',
  'scout_id is unchanged (still scout B) after the losing accept'
);

select * from finish();
rollback;
