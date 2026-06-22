-- 0018_device_push_tokens.sql
-- LMC Phase 10 / Plan 01 — Push notification foundation
--
-- Creates the device_push_tokens table (own-user RLS) and the AFTER UPDATE
-- trigger on public.checks that fires the job-nearby push to send-push via
-- net.http_post when a check enters the 'dispatching' status.
--
-- ── Open-Q2 resolution (from 10-RESEARCH.md) ─────────────────────────────────
-- The trigger reads auth credentials from database GUCs set out-of-band by the
-- orchestrator (Wave 4 / 10-05 deploy step) via:
--
--   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://...supabase.co';
--   ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJ...';
--
-- GUC NAMES (exact — must match across all waves):
--   current_setting('app.settings.supabase_url',  true)
--   current_setting('app.settings.service_role_key', true)
--
-- The `.settings.` namespace is intentional — this is the Supabase Vault /
-- database settings convention. Wave 4 (10-05) sets these same GUC names;
-- do NOT use 'app.supabase_url' or any other namespace.
--
-- FALLBACK (Wave 4 deploy decision): if GUCs cannot be set via ALTER DATABASE
-- (e.g. permission denied on the managed instance), use Supabase Dashboard →
-- Database → Webhooks to create the trigger via UI — same pg_net under the
-- hood, headers injected server-side automatically, no GUC needed.
-- Document which path was taken in the 10-05 SUMMARY.
--
-- STRIDE NOTES:
--   T-10-01 (Tampering / INSERT another user's token): mitigated by
--           RLS WITH CHECK (auth.uid() = user_id) on INSERT.
--   T-10-02 (Info Disclosure / cross-user token read): mitigated by
--           RLS USING (auth.uid() = user_id) on SELECT.
--   T-10-03 (EoP / trigger leaking service-role key): mitigated — key is
--           read from a database GUC set out-of-band (never hardcoded here);
--           the trigger is SECURITY DEFINER + server-only.
--   T-10-04 (DoS / push failure blocks dispatching transition): mitigated —
--           net.http_post is wrapped in EXCEPTION WHEN OTHERS THEN NULL and
--           a null-GUC guard; RETURN NEW is always reached (D-03).
--
-- Wave 4 (10-05) pushes this migration live and sets the GUCs.
-- Do NOT push in Plan 01.

-- =============================================================================
-- 1. device_push_tokens — one row per (user, device); RLS own-user only
-- =============================================================================

create table if not exists public.device_push_tokens (
  id          uuid         primary key default gen_random_uuid(),
  user_id     uuid         not null references auth.users(id) on delete cascade,
  token       text         not null,
  -- 'ios' | 'android' | 'web' — matches Expo Platform values
  platform    text         not null check (platform in ('ios', 'android', 'web')),
  updated_at  timestamptz  not null default now(),
  -- One row per (user, device token); token can migrate between users on shared
  -- devices — upsert on conflict (user_id, token) do update set updated_at.
  unique (user_id, token)
);

comment on table public.device_push_tokens is
  'Phase 10 D-02: one push token row per (user, device). Upserted on every sign-in '
  'after permission is granted. RLS: authenticated users manage only their own rows. '
  'UNIQUE (user_id, token) — idempotent upsert via ON CONFLICT DO UPDATE (PUSH-02). '
  'ON DELETE CASCADE — all tokens removed when auth.users row is deleted.';

-- Index on user_id for token lookups by recipient (send-push join)
create index if not exists device_push_tokens_user_idx
  on public.device_push_tokens (user_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.device_push_tokens enable row level security;

-- SELECT: a user reads only their own tokens (T-10-02)
create policy device_push_tokens_own_select
  on public.device_push_tokens
  for select to authenticated
  using (auth.uid() = user_id);

-- INSERT: a user can only insert rows under their own user_id (T-10-01)
create policy device_push_tokens_own_insert
  on public.device_push_tokens
  for insert to authenticated
  with check (auth.uid() = user_id);

-- UPDATE: a user can only update their own rows (covers updated_at upsert path)
create policy device_push_tokens_own_update
  on public.device_push_tokens
  for update to authenticated
  using (auth.uid() = user_id);

-- DELETE: a user can delete (sign-out / token rotation) only their own rows
create policy device_push_tokens_own_delete
  on public.device_push_tokens
  for delete to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 2. notify_push_on_dispatching() — AFTER UPDATE trigger function
--    Fires net.http_post to send-push with { checkId, event:'job-nearby' }
--    whenever checks.status transitions TO 'dispatching'.
--
--    FIRE-AND-FORGET (D-03 / T-10-04):
--    The entire net.http_post call is wrapped in BEGIN...EXCEPTION WHEN OTHERS
--    THEN NULL so a push dispatch failure (network, config, Edge Fn error)
--    NEVER blocks the 'dispatching' transition. RETURN NEW is always reached.
--
--    NULL-GUC GUARD:
--    current_setting(..., true) returns NULL (not an error) when the GUC is
--    unset (the `, true` second argument enables missing-ok mode). If the URL
--    GUC is unset, the function returns NEW immediately — silent no-op until
--    Wave 4 sets the GUCs.
--
--    SECURITY DEFINER: runs as the migration owner so the GUC read is
--    server-side only; the client never touches this function.
--    search_path = public prevents search-path injection.
-- =============================================================================

create or replace function public.notify_push_on_dispatching()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url      text;
  v_key      text;
begin
  -- Only fire when status transitions TO 'dispatching' (idempotent guard)
  if NEW.status::text <> 'dispatching' or OLD.status::text = 'dispatching' then
    return NEW;
  end if;

  -- Read GUCs set out-of-band by the orchestrator (Wave 4 / 10-05 deploy).
  -- GUC names: app.settings.supabase_url + app.settings.service_role_key
  -- (the `.settings.` namespace is intentional — matches Supabase Vault convention).
  -- The `, true` arg makes current_setting return NULL instead of raising when unset.
  v_url := current_setting('app.settings.supabase_url', true);
  v_key := current_setting('app.settings.service_role_key', true);

  -- Null-GUC guard: skip silently if unconfigured (pre-Wave-4 local dev / CI).
  -- The transition still completes — push is advisory, never a blocker (T-10-04).
  if v_url is null or v_key is null then
    return NEW;
  end if;

  -- Fire-and-forget: wrap in EXCEPTION WHEN OTHERS THEN NULL so any pg_net /
  -- network / Edge Function failure NEVER blocks the dispatching transition.
  -- IDOR note: the push recipient is resolved server-side in send-push from
  -- checkId via list_open_checks_for_scout (in-range online Scouts only) —
  -- the client never supplies the recipient directly (T-10-01 safe).
  begin
    perform net.http_post(
      url     := v_url || '/functions/v1/send-push',
      body    := jsonb_build_object(
                   'checkId', NEW.id,
                   'event',   'job-nearby'
                 ),
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', 'Bearer ' || v_key
                 )
    );
  exception when others then
    -- Swallow silently — push is fire-and-forget advisory (D-03 / T-10-04).
    -- The transition is never blocked by a push failure.
    null;
  end;

  return NEW;
end;
$$;

comment on function public.notify_push_on_dispatching() is
  'Phase 10 D-03: AFTER UPDATE trigger on public.checks. Fires net.http_post to '
  '/functions/v1/send-push with {checkId, event:''job-nearby''} whenever '
  'checks.status transitions TO ''dispatching'' from any other status. '
  'FIRE-AND-FORGET: wrapped in EXCEPTION WHEN OTHERS THEN NULL — a push failure '
  'NEVER blocks the dispatching transition (T-10-04). '
  'NULL-GUC GUARD: skips silently if app.settings.supabase_url is unset (pre-Wave-4). '
  'GUC NAMES (exact): app.settings.supabase_url + app.settings.service_role_key. '
  'SECURITY DEFINER. search_path=public (injection-safe).';

-- =============================================================================
-- 3. checks_push_on_dispatching trigger — AFTER UPDATE on public.checks
--    Guarded for pg_net availability (mirrors pg_cron guard in 20260621000002).
--    The table + RLS above are unconditional.
-- =============================================================================

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_net') then
    -- Drop-and-recreate is idempotent; CREATE OR REPLACE is not valid for triggers.
    drop trigger if exists checks_push_on_dispatching on public.checks;

    create trigger checks_push_on_dispatching
      after update on public.checks
      for each row
      execute function public.notify_push_on_dispatching();

    raise notice '0018: checks_push_on_dispatching trigger created (pg_net available)';
  else
    raise notice
      '0018: pg_net extension not found — checks_push_on_dispatching trigger skipped. '
      'Use Supabase Dashboard → Database → Webhooks as the fallback (same pg_net '
      'under the hood, headers injected server-side). Document in Wave-4 (10-05) SUMMARY.';
  end if;
end $$;
