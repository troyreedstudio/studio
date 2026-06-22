-- 0020_trigger_vault_credentials.sql
-- LMC Phase 10 / Plan 05 — Update notify_push_on_dispatching() to read from Vault
--
-- Context: the original 0018 trigger reads credentials from database-level GUCs
-- (current_setting('app.settings.supabase_url', true)) set by ALTER DATABASE.
-- On Supabase managed instances, ALTER DATABASE is denied for the postgres role
-- (superuser only). The ALTER DATABASE GUC path is therefore blocked on this tier.
--
-- Resolution (Wave 4 / Plan 05-05 fallback path):
-- Use Supabase Vault (supabase_vault extension, confirmed available) instead of GUCs.
-- The credentials are stored in vault.secrets (encrypted at rest) by the Wave-4
-- deploy step and are readable by SECURITY DEFINER functions owned by postgres.
--
-- Vault secret names (set out-of-band by orchestrator, not in this migration):
--   lmc_supabase_url      — 'https://cawqasszfbzvbtunamda.supabase.co'
--   lmc_service_role_key  — the service role JWT (eyJ...)
--
-- The function retains the null-GUC guard as a fallback path (before migrating to
-- Vault). Vault read returns NULL if the secret doesn't exist — same safe degrade.
-- The fire-and-forget EXCEPTION WHEN OTHERS THEN NULL wrapping is unchanged.
--
-- SECURITY: vault.decrypted_secrets is readable by postgres (SECURITY DEFINER owner).
-- The decrypted key never leaves the database process — it goes directly into the
-- Authorization header of the net.http_post call. Never logged, never committed.
--
-- No schema changes to device_push_tokens, checks, or RLS policies.
-- Replaces only the credential-read section of notify_push_on_dispatching().

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

  -- Read credentials from Supabase Vault (supabase_vault extension).
  -- Fallback: if vault secrets are not yet seeded, decrypted_secret is NULL — same
  -- safe degrade as the original GUC null-guard (RETURN NEW silently, D-03/T-10-04).
  --
  -- We also keep the old GUC path as a secondary fallback for local dev / CI:
  -- if the vault returns null but the GUC is set, we use the GUC.
  select decrypted_secret into v_url
    from vault.decrypted_secrets
    where name = 'lmc_supabase_url'
    limit 1;

  -- GUC fallback for local dev / CI (missing-ok: returns null, not an error)
  if v_url is null then
    v_url := current_setting('app.settings.supabase_url', true);
  end if;

  select decrypted_secret into v_key
    from vault.decrypted_secrets
    where name = 'lmc_service_role_key'
    limit 1;

  if v_key is null then
    v_key := current_setting('app.settings.service_role_key', true);
  end if;

  -- Null guard: skip silently if credentials are not configured.
  -- The transition still completes — push is advisory, never a blocker (T-10-04).
  if v_url is null or v_key is null then
    return NEW;
  end if;

  -- Fire-and-forget: wrap in EXCEPTION WHEN OTHERS THEN NULL so any pg_net /
  -- network / Edge Function failure NEVER blocks the dispatching transition.
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
    null;
  end;

  return NEW;
end;
$$;

comment on function public.notify_push_on_dispatching() is
  'Phase 10 D-03 (0020 update): reads credentials from vault.decrypted_secrets '
  '(lmc_supabase_url + lmc_service_role_key) with GUC fallback for local dev. '
  'AFTER UPDATE trigger on public.checks — fires net.http_post to /functions/v1/send-push '
  'with {checkId, event:''job-nearby''} on dispatching transition. '
  'FIRE-AND-FORGET: EXCEPTION WHEN OTHERS THEN NULL. SECURITY DEFINER. search_path=public.';
