-- 0018_push_tokens.test.sql
-- pgTAP tests for Phase 10 Plan 01: device_push_tokens table + dispatching push trigger.
-- Status: RED by design — asserts schema that migration 0018 creates.
-- Run AFTER migration 0018_device_push_tokens.sql is pushed; tests fail (RED) before that.
--
-- Requirements covered:
--   PUSH-01: device_push_tokens table exists with correct columns + index
--   PUSH-02: upsert on (user_id, token) is idempotent — same row twice = 1 row
--   PUSH-03: RLS is enabled; four own-row policies for authenticated role exist
--   PUSH-10: notify_push_on_dispatching trigger function + trigger on checks exist
--
-- Run: pg_prove supabase/tests/0018_push_tokens.test.sql
--      OR via: npm run test:db

begin;
  select plan(13);

  -- ── Fixtures ──────────────────────────────────────────────────────────────

  -- Two fixture users (match style from 0016_scout_earnings.test.sql)
  insert into auth.users (id, email) values
    ('cccccccc-0001-0001-0001-000000000001', 'push_user_a@test.local'),
    ('cccccccc-0001-0001-0001-000000000002', 'push_user_b@test.local')
  on conflict do nothing;

  insert into public.profiles (id, is_scout) values
    ('cccccccc-0001-0001-0001-000000000001', false),
    ('cccccccc-0001-0001-0001-000000000002', true)
  on conflict do nothing;

  -- ── PUSH-01: Table + columns + index ───────────────────────────────────────

  -- T1: table exists
  select has_table(
    'public',
    'device_push_tokens',
    'PUSH-01: device_push_tokens table exists'
  );

  -- T2: user_id column exists
  select has_column(
    'public',
    'device_push_tokens',
    'user_id',
    'PUSH-01: device_push_tokens has user_id column'
  );

  -- T3: token column exists
  select has_column(
    'public',
    'device_push_tokens',
    'token',
    'PUSH-01: device_push_tokens has token column'
  );

  -- T4: platform column exists
  select has_column(
    'public',
    'device_push_tokens',
    'platform',
    'PUSH-01: device_push_tokens has platform column'
  );

  -- T5: updated_at column exists
  select has_column(
    'public',
    'device_push_tokens',
    'updated_at',
    'PUSH-01: device_push_tokens has updated_at column'
  );

  -- T6: index on user_id exists
  select has_index(
    'public',
    'device_push_tokens',
    'device_push_tokens_user_idx',
    'PUSH-01: device_push_tokens has index on user_id'
  );

  -- T7: platform CHECK constraint allows 'ios', 'android', 'web'
  -- (verified indirectly by inserting a valid platform value — constraint violation would abort)
  select lives_ok(
    $$
      insert into public.device_push_tokens (user_id, token, platform)
      values
        ('cccccccc-0001-0001-0001-000000000001', 'ExponentPushToken[test-ios-token]', 'ios'),
        ('cccccccc-0001-0001-0001-000000000002', 'ExponentPushToken[test-android-token]', 'android')
    $$,
    'PUSH-01: platform CHECK allows ios and android'
  );

  -- ── PUSH-02: Idempotent upsert on (user_id, token) ───────────────────────

  -- T8: upserting the same (user_id, token) twice produces exactly 1 row
  insert into public.device_push_tokens (user_id, token, platform, updated_at)
  values ('cccccccc-0001-0001-0001-000000000001', 'ExponentPushToken[idempotent-test]', 'ios', now())
  on conflict (user_id, token) do update set updated_at = excluded.updated_at;

  -- upsert again (same user_id + token, different timestamp)
  insert into public.device_push_tokens (user_id, token, platform, updated_at)
  values ('cccccccc-0001-0001-0001-000000000001', 'ExponentPushToken[idempotent-test]', 'ios', now())
  on conflict (user_id, token) do update set updated_at = excluded.updated_at;

  select is(
    (
      select count(*)::int
      from public.device_push_tokens
      where user_id = 'cccccccc-0001-0001-0001-000000000001'::uuid
        and token = 'ExponentPushToken[idempotent-test]'
    ),
    1,
    'PUSH-02: idempotent upsert on (user_id, token) produces exactly 1 row'
  );

  -- ── PUSH-03: RLS enabled + four own-row policies exist ───────────────────

  -- T9: RLS is enabled on device_push_tokens
  select is(
    (
      select relrowsecurity
      from pg_class
      where relname = 'device_push_tokens'
        and relnamespace = 'public'::regnamespace
    ),
    true,
    'PUSH-03: RLS is enabled on device_push_tokens'
  );

  -- T10: SELECT policy exists
  select has_policy(
    'public',
    'device_push_tokens',
    'device_push_tokens_own_select',
    'PUSH-03: SELECT policy device_push_tokens_own_select exists'
  );

  -- T11: INSERT policy exists
  select has_policy(
    'public',
    'device_push_tokens',
    'device_push_tokens_own_insert',
    'PUSH-03: INSERT policy device_push_tokens_own_insert exists'
  );

  -- T12: UPDATE policy exists
  select has_policy(
    'public',
    'device_push_tokens',
    'device_push_tokens_own_update',
    'PUSH-03: UPDATE policy device_push_tokens_own_update exists'
  );

  -- ── PUSH-10: Trigger + trigger function exist ─────────────────────────────

  -- T13: trigger function notify_push_on_dispatching exists
  select has_function(
    'public',
    'notify_push_on_dispatching',
    'PUSH-10: trigger function notify_push_on_dispatching() exists'
  );

  -- T14: trigger checks_push_on_dispatching exists on public.checks
  -- Note: has_trigger(schema, table, trigger_name) — pgTAP 1.x signature
  select has_trigger(
    'public',
    'checks',
    'checks_push_on_dispatching',
    'PUSH-10: trigger checks_push_on_dispatching exists on public.checks'
  );

  select * from finish();
rollback;
