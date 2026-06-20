-- clips_mux.test.sql — Phase 3 / VID-03 + CHECK-04 (T-03-01, T-03-02, T-03-03)
-- Proves the 0010 hardening of transition_check + is_valid_check_transition:
--   * a check cannot reach 'delivered' unless a clip row exists with status='ready'
--     (a present-but-not-ready clip is NOT enough — defence-in-depth, T-03-03)
--   * the SYSTEM actor (service role, auth.uid() null) may walk the new finalize edges
--     filming -> uploaded -> processing -> delivered (the Mux-webhook path, T-03-02)
--   * a HUMAN caller (non-null auth.uid()) may NOT drive uploaded/processing
--     ('only the system may drive ...', T-03-02)
-- Run with: supabase test db  (pgTAP). LIVE run gated to 03-04 (no Docker here).
-- NOTE: RED until migration 0010 (Mux edges + system-actor allowance + ready guard) lands.
--
-- Auth-faking mirrors supabase/tests/check_transitions.test.sql exactly:
--   * a HUMAN is simulated by `set local role authenticated` + a request.jwt.claims
--     JSON whose "sub" is the user id (so auth.uid() = that id).
--   * the SYSTEM (service role, auth.uid() null) is simulated by `reset role` back to
--     the superuser/owner with NO jwt claims set — auth.uid() then returns NULL, the
--     exact condition the signature-verified Mux webhook runs under.

begin;
select plan(6);

-- Fixtures: Seeker A (owner), Scout B (assigned) -----------------------------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'seeker-a@test.lmc'),
  ('33333333-3333-3333-3333-333333333333', 'scout-b@test.lmc')
on conflict (id) do nothing;

insert into public.markets (id, name, country) values ('tst', 'Testville', 'US')
  on conflict (id) do nothing;
insert into public.venues (id, market_id, name) values ('tst-v', 'tst', 'Test Venue')
  on conflict (id) do nothing;

-- Check C1: drive it to 'filming' so we can exercise the Mux finalize edges.
insert into public.checks (id, seeker_id, scout_id, venue_id, market_id, status)
values ('cccc1111-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111',
        '33333333-3333-3333-3333-333333333333',
        'tst-v', 'tst', 'filming')
  on conflict (id) do nothing;

-- A clip row exists but is NOT ready yet (status='pending') — the device has
-- requested an upload URL but Mux has not finalized the asset.
insert into public.clips (check_id, status)
values ('cccc1111-0000-0000-0000-000000000001', 'pending')
  on conflict do nothing;

-- ===== 1. DELIVER-NEEDS-READY: a present-but-pending clip is NOT enough =====
-- Run as the SYSTEM (auth.uid() null) so authz is satisfied and we isolate the
-- ready-clip guard (a human would be blocked earlier by scout-gating anyway).
reset role;
select throws_like(
  $$ select public.transition_check('cccc1111-0000-0000-0000-000000000001'::uuid, 'delivered'::check_status) $$,
  '%cannot deliver without a ready clip%',
  'filming -> delivered is rejected while the clip is only pending (not ready)'
);

-- ===== 2/3. SYSTEM actor walks filming -> uploaded -> processing =====
-- The Mux webhook drives these honest-progress edges as the service role.
reset role;
select lives_ok(
  $$ select public.transition_check('cccc1111-0000-0000-0000-000000000001'::uuid, 'uploaded'::check_status) $$,
  'system actor (auth.uid() null) drives filming -> uploaded'
);

reset role;
select lives_ok(
  $$ select public.transition_check('cccc1111-0000-0000-0000-000000000001'::uuid, 'processing'::check_status) $$,
  'system actor (auth.uid() null) drives uploaded -> processing'
);

-- The webhook now finalizes the asset: the clip becomes 'ready'.
update public.clips set status = 'ready', mux_playback_id = 'pb_test', mux_asset_id = 'as_test'
  where check_id = 'cccc1111-0000-0000-0000-000000000001';

-- ===== 4. SYSTEM actor drives processing -> delivered once the clip is ready =====
reset role;
select lives_ok(
  $$ select public.transition_check('cccc1111-0000-0000-0000-000000000001'::uuid, 'delivered'::check_status) $$,
  'system actor drives processing -> delivered once the clip is ready'
);

select is(
  (select status::text from public.checks where id = 'cccc1111-0000-0000-0000-000000000001'),
  'delivered',
  'check C1 reached delivered via the system-driven Mux finalize chain'
);

-- ===== 5. A HUMAN may NOT drive the system-only uploaded/processing edges =====
-- Fresh check C2 in 'filming'; the assigned scout (a human, non-null auth.uid())
-- attempts 'uploaded' — barred by the system-only rule.
insert into public.checks (id, seeker_id, scout_id, venue_id, market_id, status)
values ('cccc2222-0000-0000-0000-000000000002',
        '11111111-1111-1111-1111-111111111111',
        '33333333-3333-3333-3333-333333333333',
        'tst-v', 'tst', 'filming')
  on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

select throws_like(
  $$ select public.transition_check('cccc2222-0000-0000-0000-000000000002'::uuid, 'uploaded'::check_status) $$,
  '%only the system may drive%',
  'an assigned human scout cannot drive filming -> uploaded (system-only)'
);

reset role;

select * from finish();
rollback;
