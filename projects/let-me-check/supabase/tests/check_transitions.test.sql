-- check_transitions.test.sql — Phase 2 / DISP-04 + authz (T-02-02, T-02-03, T-02-05)
-- Proves the hardened transition_check():
--   * rejects illegal jumps (valid-transition table)
--   * enforces actor authorization (only seeker rates/cancels, only assigned scout films/delivers)
--   * refuses 'delivered' without a clips row
-- and that a legal transition still logs check.status_changed to the immutable event_log.
-- Run with: supabase test db  (pgTAP).
-- NOTE: RED until migrations 0007 (guarded transition_check) + 0008 (clips table) land.

begin;
select plan(11);

-- Fixtures: Seeker A (owner), Scout B (assigned), Scout C (stranger) ----------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'seeker-a@test.lmc'),
  ('33333333-3333-3333-3333-333333333333', 'scout-b@test.lmc'),
  ('44444444-4444-4444-4444-444444444444', 'scout-c@test.lmc')
on conflict (id) do nothing;

insert into public.markets (id, name, country) values ('tst', 'Testville', 'US')
  on conflict (id) do nothing;
insert into public.venues (id, market_id, name) values ('tst-v', 'tst', 'Test Venue')
  on conflict (id) do nothing;

-- Check used for the happy-path lifecycle (seeker A owns it, scout B assigned).
insert into public.checks (id, seeker_id, scout_id, venue_id, market_id, status)
values ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        '33333333-3333-3333-3333-333333333333',
        'tst-v', 'tst', 'requested')
  on conflict (id) do nothing;

-- A second check that stays in 'requested' to test the illegal-jump negative.
insert into public.checks (id, seeker_id, venue_id, market_id, status)
values ('2a2a2a2a-2a2a-2a2a-2a2a-2a2a2a2a2a2a',
        '11111111-1111-1111-1111-111111111111', 'tst-v', 'tst', 'requested')
  on conflict (id) do nothing;

-- 0. Sanity: a fresh check is 'requested'.
select is(
  (select status::text from public.checks where id = '22222222-2222-2222-2222-222222222222'),
  'requested',
  'a fresh check starts in requested'
);

-- ILLEGAL JUMP (run as superuser so we isolate the valid-transition guard, not authz):
-- requested -> delivered must be rejected by is_valid_check_transition.
select throws_like(
  $$ select public.transition_check('2a2a2a2a-2a2a-2a2a-2a2a-2a2a2a2a2a2a'::uuid, 'delivered'::check_status) $$,
  '%illegal transition%',
  'illegal jump requested -> delivered is rejected'
);

-- ===== LEGAL PATH as the owning seeker: requested -> dispatching =====
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select lives_ok(
  $$ select public.transition_check('22222222-2222-2222-2222-222222222222'::uuid, 'dispatching'::check_status) $$,
  'owning seeker drives requested -> dispatching'
);

reset role;

-- The legal transition logged check.status_changed to the immutable event_log.
select is(
  (select count(*)::int from public.event_log
     where event_type = 'check.status_changed'
       and subject_id = '22222222-2222-2222-2222-222222222222'
       and context->>'from' = 'requested'
       and context->>'to' = 'dispatching'),
  1,
  'requested -> dispatching logged check.status_changed to event_log'
);

-- Move dispatching -> assigned via superuser (accept_check is covered elsewhere;
-- here we just need the row in 'assigned' so scout B can drive it).
update public.checks set status = 'assigned'
  where id = '22222222-2222-2222-2222-222222222222';

-- ===== WRONG ACTOR: scout C (not assigned) cannot drive 'filming' =====
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);

select throws_like(
  $$ select public.transition_check('22222222-2222-2222-2222-222222222222'::uuid, 'filming'::check_status) $$,
  '%only the assigned scout%',
  'a non-assigned scout cannot drive assigned -> filming'
);

reset role;

-- ===== LEGAL: assigned scout B drives assigned -> filming =====
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

select lives_ok(
  $$ select public.transition_check('22222222-2222-2222-2222-222222222222'::uuid, 'filming'::check_status) $$,
  'assigned scout drives assigned -> filming'
);

-- DELIVER-WITHOUT-CLIP: scout B tries filming -> delivered with NO clips row.
select throws_like(
  $$ select public.transition_check('22222222-2222-2222-2222-222222222222'::uuid, 'delivered'::check_status) $$,
  '%without a clip%',
  'filming -> delivered is rejected without a clips row'
);

reset role;

-- Insert a stub clip (the seam Plan 04/05 fills; here we make the deliver path valid).
insert into public.clips (check_id, status, filmed_at)
values ('22222222-2222-2222-2222-222222222222', 'stub', now());

-- ===== LEGAL: assigned scout B drives filming -> delivered (clip now present) =====
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

select lives_ok(
  $$ select public.transition_check('22222222-2222-2222-2222-222222222222'::uuid, 'delivered'::check_status) $$,
  'assigned scout drives filming -> delivered with a clip present'
);

reset role;

-- ===== WRONG ACTOR: scout C cannot rate someone else's delivered check =====
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);

select throws_like(
  $$ select public.transition_check('22222222-2222-2222-2222-222222222222'::uuid, 'rated'::check_status) $$,
  '%only the seeker%',
  'a non-owner cannot rate the check'
);

reset role;

-- ===== LEGAL: owning seeker A drives delivered -> rated =====
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select lives_ok(
  $$ select public.transition_check('22222222-2222-2222-2222-222222222222'::uuid, 'rated'::check_status) $$,
  'owning seeker drives delivered -> rated'
);

reset role;

select is(
  (select status::text from public.checks where id = '22222222-2222-2222-2222-222222222222'),
  'rated',
  'check finished the lifecycle in rated'
);

select * from finish();
rollback;
