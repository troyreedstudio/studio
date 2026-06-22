-- 0017_phase9_reconnects.test.sql
-- pgTAP tests for Phase 9: get_check_scout_public IDOR guard + new profiles columns.
-- Status: RED by design — push migration 0017_phase9_surface_reconnects.sql first, then run.
-- Run: pg_prove supabase/tests/0017_phase9_reconnects.test.sql
--       OR: supabase test db

begin;
  select plan(6);

  -- ── Fixtures ──────────────────────────────────────────────────────────────
  -- Users: Seeker S1, Seeker S2 (IDOR target owner), Scout SC

  insert into auth.users (id, email) values
    ('cccccccc-0017-0001-0001-000000000001', 'seeker1@test.local'),   -- S1 (our caller)
    ('cccccccc-0017-0001-0001-000000000002', 'seeker2@test.local'),   -- S2 (other seeker)
    ('cccccccc-0017-0001-0001-000000000003', 'scout1@test.local')     -- SC (the scout)
  on conflict do nothing;

  insert into public.profiles (id, is_seeker, is_scout, display_name) values
    ('cccccccc-0017-0001-0001-000000000001', true,  false, 'Alice S.'),
    ('cccccccc-0017-0001-0001-000000000002', true,  false, 'Bob S.'),
    ('cccccccc-0017-0001-0001-000000000003', false, true,  'Jordan K.')
  on conflict do nothing;

  -- Checks:
  --   D1: S1 owns it, SC filmed it, status=delivered  — S1 CAN read
  --   D2: S2 owns it, SC filmed it, status=delivered  — IDOR target: S1 CANNOT read
  --   P1: S1 owns it, SC filmed it, status=dispatching — not-yet-delivered gate target

  insert into public.checks (id, seeker_id, scout_id, status, tier) values
    ('dddddddd-0017-0001-0001-000000000001',
     'cccccccc-0017-0001-0001-000000000001',  -- S1 seeker
     'cccccccc-0017-0001-0001-000000000003',  -- SC scout
     'delivered', 'standard'),
    ('dddddddd-0017-0001-0001-000000000002',
     'cccccccc-0017-0001-0001-000000000002',  -- S2 seeker (IDOR target)
     'cccccccc-0017-0001-0001-000000000003',  -- SC scout
     'delivered', 'priority'),
    ('dddddddd-0017-0001-0001-000000000003',
     'cccccccc-0017-0001-0001-000000000001',  -- S1 seeker
     'cccccccc-0017-0001-0001-000000000003',  -- SC scout
     'dispatching', 'standard')
  on conflict do nothing;

  -- Ratings: S1 rates SC's D1 check with 5 stars, S2 rates SC's D2 check with 4 stars
  -- This lets avg_rating be computable (should be 4.5 across both delivered checks)
  insert into public.ratings (id, check_id, seeker_id, stars) values
    ('eeeeeeee-0017-0001-0001-000000000001',
     'dddddddd-0017-0001-0001-000000000001',  -- D1
     'cccccccc-0017-0001-0001-000000000001',  -- S1 rated it
     5),
    ('eeeeeeee-0017-0001-0001-000000000002',
     'dddddddd-0017-0001-0001-000000000002',  -- D2
     'cccccccc-0017-0001-0001-000000000002',  -- S2 rated it
     4)
  on conflict do nothing;

  -- ── Auth context: simulate S1 as the authenticated caller ─────────────────
  set local role authenticated;
  set local "request.jwt.claim.sub" = 'cccccccc-0017-0001-0001-000000000001';

  -- ── Test 1: notification_prefs column exists on profiles ──────────────────
  select has_column(
    'public', 'profiles', 'notification_prefs',
    'profiles.notification_prefs column exists (added by migration 0017)'
  );

  -- ── Test 2: preferred_cities column exists on profiles ────────────────────
  select has_column(
    'public', 'profiles', 'preferred_cities',
    'profiles.preferred_cities column exists (added by migration 0017)'
  );

  -- ── Test 3: get_check_scout_public function exists ────────────────────────
  select has_function(
    'public', 'get_check_scout_public', ARRAY['uuid'],
    'function public.get_check_scout_public(uuid) exists'
  );

  -- ── Test 4: S1 can read SC's name from their OWN delivered check (D1) ─────
  select is(
    (select display_name
       from public.get_check_scout_public('dddddddd-0017-0001-0001-000000000001'::uuid)),
    'Jordan K.',
    'get_check_scout_public(D1): returns Jordan K. for S1 (the owner)'
  );

  -- ── Test 5: IDOR — S1 CANNOT read the scout of D2 (owned by S2) ──────────
  select throws_ok(
    $q$select * from public.get_check_scout_public('dddddddd-0017-0001-0001-000000000002'::uuid)$q$,
    null,  -- any SQLSTATE
    null,  -- message: any
    'get_check_scout_public(D2): raises exception when caller is not the owner (IDOR guard)'
  );

  -- ── Test 6: not-delivered gate — S1 CANNOT read a dispatching check (P1) ──
  select throws_ok(
    $q$select * from public.get_check_scout_public('dddddddd-0017-0001-0001-000000000003'::uuid)$q$,
    null,  -- any SQLSTATE
    null,  -- message: any
    'get_check_scout_public(P1): raises exception when check is not yet delivered'
  );

  select * from finish();
rollback;
