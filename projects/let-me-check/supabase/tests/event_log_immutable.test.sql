-- event_log_immutable.test.sql — DATA-04 / T-01-03
-- Proves the event_log is append-only: INSERT works, UPDATE and DELETE throw.
-- Run with: supabase test db  (pgTAP).

begin;
select plan(3);

-- Seed one row to mutate (service/system context: actor_id null is allowed).
insert into public.event_log (event_type, subject_type, context)
values ('test.seed', 'test', '{"k":"v"}'::jsonb);

-- 1. INSERT succeeded — exactly one seed row is present.
select is(
  (select count(*)::int from public.event_log where event_type = 'test.seed'),
  1,
  'INSERT into event_log succeeds'
);

-- 2. UPDATE must be refused by the immutability trigger.
select throws_ok(
  $$ update public.event_log set event_type = 'tampered' where event_type = 'test.seed' $$,
  'event_log is append-only: UPDATE not allowed',
  'UPDATE on event_log raises the append-only exception'
);

-- 3. DELETE must be refused by the immutability trigger.
select throws_ok(
  $$ delete from public.event_log where event_type = 'test.seed' $$,
  'event_log is append-only: DELETE not allowed',
  'DELETE on event_log raises the append-only exception'
);

select * from finish();
rollback;
