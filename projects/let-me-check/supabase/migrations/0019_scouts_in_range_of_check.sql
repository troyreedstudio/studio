-- 0019_scouts_in_range_of_check.sql
-- LMC Phase 10 / Plan 05 — scouts_in_range_of_check SECURITY DEFINER RPC
--
-- Creates the check-centric geospatial RPC that send-push calls for the
-- 'job-nearby' event audience: "which online Scouts are near THIS check?"
--
-- This is the OPPOSITE direction from list_open_checks_for_scout (scout-centric).
-- send-push MUST NOT use list_open_checks_for_scout — that returns checks for a
-- given scout coord, not scouts for a given check (CHECKER WARNING 3 / Pitfall 4).
--
-- Returns TABLE(scout_id uuid) — all online scouts whose coord is within the
-- dispatch_radius_m of the check's coord. Graceful degrade: if the check has no
-- coord, or if market_config is empty, returns 0 rows (never raises).
--
-- SECURITY DEFINER: runs as owner so it can read scout_locations across all scouts
-- (the authenticated-user RLS on scout_locations is scoped to own row only).
-- search_path = public prevents search-path injection.
--
-- CRITICAL: ST_DWithin on geography uses metres. ST_MakePoint takes (lng, lat).
-- (Pitfall 1: lng FIRST — same pattern as list_open_checks_for_scout.)
--
-- Called by: supabase/functions/send-push/index.ts — svc.rpc('scouts_in_range_of_check', { p_check_id })
-- If this RPC is absent, send-push gracefully degrades (rpc() returns error -> empty
-- recipients -> push.skipped_no_recipients logged, check transition never blocked).
--
-- STRIDE:
--   T-10-05 (IDOR): recipients derived server-side from checkId only; the client
--            never supplies scout IDs directly. SECURITY DEFINER + search_path guard.
--   T-10-04 (DoS): if this RPC errors, send-push swallows and returns [] — graceful.

create or replace function public.scouts_in_range_of_check(p_check_id uuid)
returns table(scout_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select sl.scout_id
  from public.scout_locations sl
  where sl.is_online = true
    and sl.coord is not null
    and exists (
      select 1 from public.checks c
      where c.id = p_check_id
        and c.coord is not null
        and ST_DWithin(
          sl.coord::geography,
          c.coord::geography,
          coalesce(
            (select mc.dispatch_radius_m from public.market_config mc limit 1),
            1500
          )
        )
    );
$$;

comment on function public.scouts_in_range_of_check(uuid) is
  'Phase 10 D-02: check-centric dispatch audience — returns scout_ids of all online '
  'Scouts whose coord is within dispatch_radius_m of the given check. '
  'Used by send-push for job-nearby event. SECURITY DEFINER, search_path=public. '
  'Graceful: coord-null check or empty market_config → 0 rows, never raises.';
