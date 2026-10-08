-- 0024_account_deletions_rls.sql
-- SECURITY FIX — Supabase linter: rls_disabled_in_public on public.account_deletions.
--
-- account_deletions (0021) is an internal AUDIT LOG. It is written ONLY by
-- delete_my_account() — a SECURITY DEFINER function owned by postgres, which
-- bypasses RLS — and is read only via the service role (backend/dashboard).
-- No client role (anon / authenticated) should ever read or write it.
--
-- Fix: enable Row-Level Security with NO policies = default-deny for every client
-- role. The owner (postgres, via the RPC) and service_role bypass RLS, so the
-- deletion flow and backend are completely unaffected. This only closes the table
-- to the public — no app behaviour changes.

alter table public.account_deletions enable row level security;

-- Defense-in-depth: strip any default table grants from the client roles too.
-- (With RLS + no policies they are already denied; this makes intent explicit.)
revoke all on public.account_deletions from anon, authenticated;
