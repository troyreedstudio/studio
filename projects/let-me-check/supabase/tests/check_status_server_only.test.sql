-- check_status_server_only.test.sql — DATA-02 / T-01-01
-- Proves a client (authenticated role) CANNOT advance checks.status directly,
-- while the server-side transition_check() can and logs the transition.
-- Run with: supabase test db  (pgTAP).

begin;
select plan(5);

-- Two test users in auth.users (seeker + a stand-in).
insert into auth.users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'seeker@test.lmc')
on conflict (id) do nothing;

-- A market + venue + check owned by the seeker (created as superuser/setup).
insert into public.markets (id, name, country) values ('tst', 'Testville', 'US')
  on conflict (id) do nothing;
insert into public.venues (id, market_id, name) values ('tst-v', 'tst', 'Test Venue')
  on conflict (id) do nothing;
insert into public.checks (id, seeker_id, venue_id, market_id, status)
values ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111', 'tst-v', 'tst', 'requested')
  on conflict (id) do nothing;

-- 0. Sanity: the check starts in 'requested'.
select is(
  (select status::text from public.checks where id = '22222222-2222-2222-2222-222222222222'),
  'requested',
  'check starts in requested'
);

-- Simulate an authenticated client: switch to the authenticated role and bind
-- the JWT uid to the seeker. Under RLS there is NO update policy on checks, so a
-- direct UPDATE affects 0 rows (the row is invisible to UPDATE / not permitted).
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

-- 1. Direct client UPDATE of status must NOT change the row (no update policy).
update public.checks set status = 'delivered'
where id = '22222222-2222-2222-2222-222222222222';

reset role;
select is(
  (select status::text from public.checks where id = '22222222-2222-2222-2222-222222222222'),
  'requested',
  'client UPDATE cannot advance checks.status (still requested)'
);

-- 2. The server-only transition function DOES advance status.
select lives_ok(
  $$ select public.transition_check('22222222-2222-2222-2222-222222222222'::uuid, 'authorized'::check_status) $$,
  'transition_check advances status server-side'
);

select is(
  (select status::text from public.checks where id = '22222222-2222-2222-2222-222222222222'),
  'authorized',
  'transition_check moved status requested -> authorized'
);

-- 3. The transition wrote a check.status_changed event into the immutable log.
select is(
  (select count(*)::int from public.event_log
     where event_type = 'check.status_changed'
       and subject_id = '22222222-2222-2222-2222-222222222222'
       and context->>'from' = 'requested'
       and context->>'to' = 'authorized'),
  1,
  'transition_check logged check.status_changed (from=requested,to=authorized) to event_log'
);

select * from finish();
rollback;
