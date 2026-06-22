-- 0021_account_deletion.test.sql
-- pgTAP tests for Phase 11 Plan 01: account deletion RPC + audit table.
-- Status: RED by design — asserts schema/behavior that migration 0021 creates.
-- Run AFTER migration 0021_account_deletion.sql is pushed; tests fail (RED) before that.
--
-- Requirements covered:
--   ACCT-01: account_deletions audit table exists
--   ACCT-02: delete_my_account RPC exists + removes PII rows for the caller
--   ACCT-03: financial-linked checks are anonymized (sentinel seeker_id), not deleted
--   ACCT-04: filming-status checks are cancelled via direct UPDATE (not transition_check)
--   ACCT-05: scout_id is NULLed on checks where the deleted user was the Scout
--   ACCT-06: event_log.actor_id is NULLed via session_replication_role bypass (audit rows remain)
--   ACCT-07: no check row references the deleted uid after the RPC runs
--
-- Run: pg_prove supabase/tests/0021_account_deletion.test.sql
--      OR via: npm run test:db

begin;
  select plan(14);

  -- ── Constants ─────────────────────────────────────────────────────────────
  -- Fixture uuid prefix: dddddddd-0021-... to avoid collision with other test files.
  -- The deleting user: dddddddd-0021-0021-0021-000000000001
  -- A second fixture user (seeker on the scout-only check): dddddddd-0021-0021-0021-000000000002
  -- DELETED sentinel: 00000000-0000-0000-0000-000000000000

  -- ── Fixtures ──────────────────────────────────────────────────────────────

  -- Insert the DELETED sentinel idempotently into auth.users + profiles
  -- (mirrors the migration's own sentinel-insert; safe to run twice)
  insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-000000000000', 'deleted@letmecheck.invalid')
  on conflict do nothing;

  insert into public.profiles (id) values
    ('00000000-0000-0000-0000-000000000000')
  on conflict do nothing;

  -- The user who will be deleted
  insert into auth.users (id, email) values
    ('dddddddd-0021-0021-0021-000000000001', 'del_user@test.local')
  on conflict do nothing;

  insert into public.profiles (id, is_seeker, is_scout) values
    ('dddddddd-0021-0021-0021-000000000001', true, true)
  on conflict do nothing;

  -- A second user (the seeker on the scout-only check — must survive untouched)
  insert into auth.users (id, email) values
    ('dddddddd-0021-0021-0021-000000000002', 'other_user@test.local')
  on conflict do nothing;

  insert into public.profiles (id, is_seeker, is_scout) values
    ('dddddddd-0021-0021-0021-000000000002', true, false)
  on conflict do nothing;

  -- A market row for the fixture checks (required by FK)
  insert into public.markets (id, name, city, country, currency) values
    ('tst', 'Test Market', 'Testville', 'US', 'usd')
  on conflict do nothing;

  -- Fixture check A: DELIVERED check with a payments row (financial-anonymize path)
  -- seeker = deleting user; scout = other user (irrelevant for this path)
  insert into public.checks (id, seeker_id, scout_id, market_id, tier, status, currency) values
    (
      'aaaaaaaa-0021-0021-0021-000000000001',
      'dddddddd-0021-0021-0021-000000000001',
      'dddddddd-0021-0021-0021-000000000002',
      'tst',
      'standard',
      'delivered',
      'usd'
    )
  on conflict do nothing;

  insert into public.payments (id, check_id, amount_total, scout_amount, currency, status) values
    (
      'bbbbbbbb-0021-0021-0021-000000000001',
      'aaaaaaaa-0021-0021-0021-000000000001',
      1650,
      800,
      'usd',
      'transferred'
    )
  on conflict do nothing;

  -- Fixture check B: DISPATCHING open check (open-cancel path)
  insert into public.checks (id, seeker_id, market_id, tier, status, currency) values
    (
      'aaaaaaaa-0021-0021-0021-000000000002',
      'dddddddd-0021-0021-0021-000000000001',
      'tst',
      'standard',
      'dispatching',
      'usd'
    )
  on conflict do nothing;

  -- Fixture check C: FILMING check (proves direct-UPDATE path; filming->cancelled is invalid in transition_check)
  insert into public.checks (id, seeker_id, market_id, tier, status, currency) values
    (
      'aaaaaaaa-0021-0021-0021-000000000003',
      'dddddddd-0021-0021-0021-000000000001',
      'tst',
      'priority',
      'filming',
      'usd'
    )
  on conflict do nothing;

  -- Fixture check D: SCOUT-ONLY check — seeker = other user, scout = deleting user, NO payment row
  -- Proves: scout_id is NULLed so the deleting user can be removed without FK violation on checks.scout_id
  insert into public.checks (id, seeker_id, scout_id, market_id, tier, status, currency) values
    (
      'aaaaaaaa-0021-0021-0021-000000000004',
      'dddddddd-0021-0021-0021-000000000002',
      'dddddddd-0021-0021-0021-000000000001',
      'tst',
      'standard',
      'assigned',
      'usd'
    )
  on conflict do nothing;

  -- PII rows for the deleting user
  insert into public.saved_places (id, user_id, place_key, name) values
    ('cccccccc-0021-0021-0021-000000000001', 'dddddddd-0021-0021-0021-000000000001', 'sp_001', 'Home')
  on conflict do nothing;

  insert into public.recents (id, user_id, name) values
    ('cccccccc-0021-0021-0021-000000000002', 'dddddddd-0021-0021-0021-000000000001', 'Coffee Shop')
  on conflict do nothing;

  insert into public.ratings (id, check_id, seeker_id, stars) values
    (
      'cccccccc-0021-0021-0021-000000000003',
      'aaaaaaaa-0021-0021-0021-000000000001',
      'dddddddd-0021-0021-0021-000000000001',
      5
    )
  on conflict do nothing;

  insert into public.scout_locations (scout_id, coord) values
    (
      'dddddddd-0021-0021-0021-000000000001',
      ST_SetSRID(ST_MakePoint(-80.19, 25.77), 4326)::geography
    )
  on conflict do nothing;

  -- event_log row with actor_id = deleting user (proves trigger-safe NULL path)
  insert into public.event_log (actor_id, event_type, subject_type) values
    ('dddddddd-0021-0021-0021-000000000001', 'test.placeholder', 'check');

  -- ── T1: account_deletions table exists ─────────────────────────────────────
  select has_table(
    'public',
    'account_deletions',
    'ACCT-01: account_deletions table exists'
  );

  -- ── T2: delete_my_account function exists ──────────────────────────────────
  select has_function(
    'public',
    'delete_my_account',
    'ACCT-01: delete_my_account() RPC exists'
  );

  -- ── T3-T10: Call the RPC as the deleting user ──────────────────────────────
  -- Switch to the deleting user context for the SECURITY DEFINER call.
  -- (Mirror pattern from 0016_scout_earnings.test.sql / 0017_phase9_reconnects.test.sql)
  set local role authenticated;
  set local "request.jwt.claims" to '{"sub":"dddddddd-0021-0021-0021-000000000001","role":"authenticated"}';

  -- Call the RPC. If migration 0021 is not applied this will fail (RED) with:
  -- ERROR: function public.delete_my_account() does not exist
  select lives_ok(
    $$select public.delete_my_account('test run')$$,
    'ACCT-02: delete_my_account() runs without raising'
  );

  -- Reset role so we can query freely
  reset role;

  -- ── T4: PII rows removed ───────────────────────────────────────────────────
  select is(
    (
      select count(*)::int
      from public.saved_places
      where user_id = 'dddddddd-0021-0021-0021-000000000001'::uuid
    ),
    0,
    'ACCT-02: saved_places rows for deleted user removed'
  );

  select is(
    (
      select count(*)::int
      from public.recents
      where user_id = 'dddddddd-0021-0021-0021-000000000001'::uuid
    ),
    0,
    'ACCT-02: recents rows for deleted user removed'
  );

  select is(
    (
      select count(*)::int
      from public.ratings
      where seeker_id = 'dddddddd-0021-0021-0021-000000000001'::uuid
    ),
    0,
    'ACCT-02: ratings rows for deleted user removed'
  );

  select is(
    (
      select count(*)::int
      from public.scout_locations
      where scout_id = 'dddddddd-0021-0021-0021-000000000001'::uuid
    ),
    0,
    'ACCT-02: scout_locations row for deleted user removed'
  );

  -- ── T8: Financial-linked check anonymized (seeker_id = sentinel) ────────────
  select is(
    (
      select seeker_id
      from public.checks
      where id = 'aaaaaaaa-0021-0021-0021-000000000001'::uuid
    ),
    '00000000-0000-0000-0000-000000000000'::uuid,
    'ACCT-03: financial-linked check.seeker_id set to DELETED sentinel'
  );

  -- payments row must still exist (financial reconciliation preserved)
  select is(
    (
      select count(*)::int
      from public.payments
      where check_id = 'aaaaaaaa-0021-0021-0021-000000000001'::uuid
    ),
    1,
    'ACCT-03: payments row preserved after anonymization'
  );

  -- ── T9: filming-status check is now cancelled (direct UPDATE path) ──────────
  select is(
    (
      select status::text
      from public.checks
      where id = 'aaaaaaaa-0021-0021-0021-000000000003'::uuid
    ),
    'cancelled',
    'ACCT-04: filming-status check set to cancelled via direct UPDATE (not transition_check)'
  );

  -- ── T10: Scout-only check has scout_id = NULL ──────────────────────────────
  select is(
    (
      select scout_id
      from public.checks
      where id = 'aaaaaaaa-0021-0021-0021-000000000004'::uuid
    ),
    null::uuid,
    'ACCT-05: scout_id NULLed on check where deleted user was Scout'
  );

  -- ── T11: No check still references deleted uid via seeker_id or scout_id ───
  select is(
    (
      select count(*)::int
      from public.checks
      where seeker_id = 'dddddddd-0021-0021-0021-000000000001'::uuid
         or scout_id  = 'dddddddd-0021-0021-0021-000000000001'::uuid
    ),
    0,
    'ACCT-07: no check references deleted user after RPC (FK safe for auth.admin.deleteUser)'
  );

  -- ── T12: event_log rows remain but actor_id is NULLed ──────────────────────
  select is(
    (
      select count(*)::int
      from public.event_log
      where event_type = 'test.placeholder'
    ),
    1,
    'ACCT-06: event_log audit rows remain after deletion (not deleted)'
  );

  select is(
    (
      select count(*)::int
      from public.event_log
      where event_type = 'test.placeholder'
        and actor_id = 'dddddddd-0021-0021-0021-000000000001'::uuid
    ),
    0,
    'ACCT-06: event_log.actor_id is NULLed (trigger-safe replication_role toggle)'
  );

  -- ── T14: account_deletions audit row inserted ─────────────────────────────
  select is(
    (
      select count(*)::int
      from public.account_deletions
      where user_id = 'dddddddd-0021-0021-0021-000000000001'::uuid
    ),
    1,
    'ACCT-01: exactly 1 account_deletions audit row inserted for the deleted user'
  );

  select * from finish();
rollback;
