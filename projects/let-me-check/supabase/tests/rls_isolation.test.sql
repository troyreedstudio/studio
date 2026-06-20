-- rls_isolation.test.sql — DATA-01 / T-01-02
-- Proves cross-user isolation: as user A, you can read ONLY your own rows.
-- Run with: supabase test db  (pgTAP).

begin;
select plan(2);

-- Two users, each with one saved_place (created during setup as superuser).
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@test.lmc'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@test.lmc')
on conflict (id) do nothing;

insert into public.saved_places (user_id, place_key, name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a-place', 'A Place'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b-place', 'B Place')
on conflict (user_id, place_key) do nothing;

-- Become authenticated user A.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);

-- 1. A sees exactly one saved_place (their own) — not B's.
select is(
  (select count(*)::int from public.saved_places),
  1,
  'user A reads only their own saved_places (RLS isolation)'
);

-- 2. A cannot see B's specific row by name.
select is(
  (select count(*)::int from public.saved_places where name = 'B Place'),
  0,
  'user A cannot read user B rows'
);

reset role;
select * from finish();
rollback;
