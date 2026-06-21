-- 0012b_dispatch_rpc_accept.sql
-- LMC Phase 5 / Plan 02 — Geo-filtered dispatch RPC + accept_check v3
--
-- Runs AFTER 0012_dispatch_verification_spine.sql. Adds two server-side dispatch
-- primitives that build on the spine tables (market_config, scout_locations,
-- checks.coord) fixed in Plan 01:
--
--   (1) list_open_checks_for_scout(p_scout_lat, p_scout_lng)
--         DISP-01: returns only dispatching+unclaimed checks within the tunable
--         dispatch radius of the Scout's supplied lat/lng. SECURITY DEFINER so it
--         can read across checks (RLS would otherwise limit to open + own-assigned
--         per 0009). No rows on null/NaN coords (V5/T-05-11 guard).
--
--   (2) accept_check v3 (extends 0007 / hardened by 0010)
--         Inserts TWO eligibility guards BEFORE the existing atomic first-wins UPDATE:
--         (a) geo-eligibility (T-05-07): reads the Scout's server-side coord from
--             scout_locations; raises if coord missing OR if the Scout is outside the
--             dispatch radius from the check's coord.
--         (b) one-active-job (T-05-08 / D-03): raises if the Scout already holds a
--             check in any of the active statuses (assigned/filming/uploaded/processing).
--         The existing atomic UPDATE + 'already taken' raise are UNCHANGED — race-safety
--         is preserved from Phase 2 (0007).
--
--   (3) expire_stale_dispatching() — DISP-03 dispatch timeout sweeper
--         Service-role function that transitions any dispatching+unclaimed checks
--         past dispatch_timeout_s (from market_config) to no_scout. Scheduled via
--         pg_cron when available; falls back to a Supabase Edge Function schedule.
--
-- CRITICAL: ST_MakePoint takes (LONGITUDE, LATITUDE) — opposite of GPS {lat,lng}.
-- Every ST_MakePoint call in this file passes lng FIRST (Pitfall 1 in 05-RESEARCH.md).
--
-- DATA-02 STILL HOLDS: no new client UPDATE policy on checks. scout_id remains
-- reachable ONLY through SECURITY DEFINER functions.

-- =============================================================================
-- 1. list_open_checks_for_scout — DISP-01 geo-filtered dispatch RPC
-- =============================================================================
-- SECURITY DEFINER: runs as owner so it can read all dispatching checks (bypassing
-- the narrow Scout SELECT policy from 0009 which is correct for client queries but
-- would prevent this cross-check read). The geo filter is the access control gate.
--
-- p_scout_lat / p_scout_lng: the Scout's current coords as supplied by the client.
-- The client supplies these; the server gates which rows return — client cannot see
-- checks outside the radius regardless of what coords it supplies (T-05-10).
--
-- NaN / null guard (T-05-11): no coords → no jobs returned (pass through on null
-- rather than raising, so offline Scouts get an empty list not an error).
--
-- Phase 5 single-market: reads dispatch_radius_m from the first market_config row.
-- Phase 7 will add per-market lookup keyed to the check's market_id.

create or replace function public.list_open_checks_for_scout(
  p_scout_lat double precision,
  p_scout_lng double precision
) returns setof public.checks
language plpgsql security definer set search_path = public
as $$
declare
  v_radius_m double precision;
  v_scout    geography;
begin
  -- V5/T-05-11: null or NaN coords → return no rows (defensive pass, not an error)
  if p_scout_lat is null or p_scout_lng is null
     or not (p_scout_lat = p_scout_lat) or not (p_scout_lng = p_scout_lng) then
    return;  -- NaN != NaN in IEEE 754; this guard catches NaN input
  end if;

  -- Read tunable dispatch radius from market_config.
  -- Single-market Phase 5 uses limit 1; Phase 7 will join on check.market_id.
  select dispatch_radius_m into v_radius_m from public.market_config limit 1;
  v_radius_m := coalesce(v_radius_m, 1500);  -- safe default if table empty

  -- CRITICAL: ST_MakePoint(LONGITUDE, LATITUDE) — lng first (Pitfall 1)
  v_scout := ST_SetSRID(ST_MakePoint(p_scout_lng, p_scout_lat), 4326)::geography;

  return query
    select c.*
    from public.checks c
    left join public.venues v on v.id = c.venue_id
    where c.status = 'dispatching'
      and c.scout_id is null
      -- DISP-01 geo filter: check coord OR venue coord must be within dispatch radius.
      -- checks.coord is populated at createCheck time (Plan 05) and backfilled by 0012.
      -- Fallback to venues.coord if checks.coord is null (defence in depth).
      and (
        (c.coord is not null and ST_DWithin(c.coord, v_scout, v_radius_m))
        or (c.coord is null and v.coord is not null and ST_DWithin(v.coord, v_scout, v_radius_m))
      )
    order by c.created_at asc;
end;
$$;

comment on function public.list_open_checks_for_scout(double precision, double precision) is
  'DISP-01: geo-filtered dispatch RPC. SECURITY DEFINER. Returns only dispatching+unclaimed '
  'checks within market_config.dispatch_radius_m of the supplied Scout coords. '
  'CRITICAL: ST_MakePoint(p_scout_lng, p_scout_lat) — lng FIRST (Pitfall 1). '
  'Null/NaN coords return empty set (T-05-11). Phase 5 single-market (limit 1 on config).';

-- =============================================================================
-- 2. accept_check v3 — geo-eligibility + one-active-job guards (DISP-02 + D-03)
-- =============================================================================
-- Full body of 0007 accept_check with TWO guards inserted BEFORE the atomic UPDATE.
-- The atomic UPDATE and 'already taken' raise are unchanged — race-safety preserved.
--
-- Guard (a) — geo-eligibility (T-05-07):
--   Reads the Scout's coord from scout_locations (server-side — client cannot forge).
--   Raises if: coord not found (Scout went offline without a location row).
--   Raises if: checks.coord is not null AND Scout is outside dispatch_radius_m.
--   Note: if checks.coord is null (legacy row before backfill), the geo guard is skipped
--   rather than blocking an honest Scout (defensive pass — log the absence).
--
-- Guard (b) — one-active-job (T-05-08 / D-03):
--   Counts the Scout's checks in active statuses: assigned/filming/uploaded/processing.
--   Raises if count > 0. Snapshot read (not row-locked) — acceptable at v1 density
--   per T-05-09 / RESEARCH A2. Full advisory-lock solution deferred.
--
-- The rest of the body (auth.uid() null check, guarded UPDATE, log_event) is verbatim
-- from 0007 / 0010. The function remains SECURITY DEFINER with search_path = public.

create or replace function public.accept_check(
  p_check_id uuid
)
returns check_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid               uuid    := auth.uid();
  v_dispatch_radius_m double precision;
  v_scout_coord       geography;
  v_check_coord       geography;
  v_active            int;
  v_updated           int;
begin
  -- Auth gate (unchanged from 0007)
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- -------------------------------------------------------------------------
  -- Guard (a): geo-eligibility — Scout must be within dispatch radius (DISP-02 / T-05-07)
  -- -------------------------------------------------------------------------
  -- Read tunable dispatch radius (single-market Phase 5; Phase 7 adds per-market lookup)
  select dispatch_radius_m into v_dispatch_radius_m
  from public.market_config limit 1;
  v_dispatch_radius_m := coalesce(v_dispatch_radius_m, 1500);

  -- Read Scout's last known server-side location (T-05-07: server coord, not client claim)
  select coord into v_scout_coord
  from public.scout_locations where scout_id = v_uid;

  if v_scout_coord is null then
    raise exception 'accept_check: Scout location unknown; go online to set location';
  end if;

  -- Read the check's coord for distance comparison
  select coord into v_check_coord
  from public.checks where id = p_check_id;

  -- Only apply the geo gate when checks.coord is set (null = legacy/backfill gap; skip)
  if v_check_coord is not null
     and not ST_DWithin(v_scout_coord, v_check_coord, v_dispatch_radius_m) then
    raise exception 'accept_check: Scout is outside the dispatch radius for this check';
  end if;

  -- -------------------------------------------------------------------------
  -- Guard (b): one-active-job — Scout may hold at most one active job (D-03 / T-05-08)
  -- -------------------------------------------------------------------------
  -- Active statuses: assigned (accepted, Scout en route), filming (recording),
  -- uploaded (clip sent, awaiting Mux), processing (Mux transcoding in progress).
  -- 'dispatching' is intentionally excluded (the Scout hasn't accepted yet).
  -- 'delivered'/'rated'/'no_scout'/'cancelled'/'expired' are terminal — excluded.
  select count(*) into v_active
  from public.checks
  where scout_id = v_uid
    and status in ('assigned', 'filming', 'uploaded', 'processing');

  if v_active > 0 then
    raise exception 'accept_check: Scout already has an active job';
  end if;

  -- -------------------------------------------------------------------------
  -- Atomic first-wins UPDATE (UNCHANGED from 0007 — race-safety preserved)
  -- -------------------------------------------------------------------------
  -- WHERE predicate makes double-accept impossible: the losing UPDATE matches 0 rows
  -- and the GET DIAGNOSTICS check below raises. scout_id is set atomically here —
  -- this is the SOLE writer of scout_id (except reset_check_for_redispatch which CLEARS).
  update public.checks
  set scout_id   = v_uid,
      status     = 'assigned',
      updated_at = now()
  where id = p_check_id and status = 'dispatching' and scout_id is null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'check % already taken or not open', p_check_id;
  end if;

  -- Immutable audit event (same positional shape as 0007 / log_event from 0001)
  perform public.log_event(
    'check.accepted',
    'check',
    p_check_id,
    jsonb_build_object('scout_id', v_uid)
  );

  return 'assigned';
end;
$$;

comment on function public.accept_check(uuid) is
  'CHECK-03 atomic first-wins claim — Phase 5 v3 with geo-eligibility + one-active-job guards. '
  'SECURITY DEFINER. Guard (a): Scout coord from scout_locations must be within '
  'market_config.dispatch_radius_m of checks.coord (T-05-07 / DISP-02). '
  'Guard (b): Scout may hold at most ONE active job (D-03 / T-05-08). '
  'Unchanged: atomic UPDATE WHERE status=''dispatching'' AND scout_id IS NULL — '
  'race-safe (0007), ''already taken'' on 0 rows updated. Sole writer of scout_id.';

-- =============================================================================
-- 3. expire_stale_dispatching — DISP-03 server-side dispatch timeout sweeper
-- =============================================================================
-- Transitions any dispatching+unclaimed checks that have been waiting longer than
-- market_config.dispatch_timeout_s (default 600 s / 10 min) to no_scout.
--
-- Replaces the interim seeker-driven expireUnmatchedCheck in checks.ts (which stays
-- as a harmless optimistic no-op fallback; swallows lost races gracefully).
--
-- Uses transition_check() as the service role (auth.uid() IS NULL from 0012):
--   - The no_scout transition is allowed for service role per 0010/0012 actor rules.
--   - transition_check logs check.status_changed to event_log automatically.
--
-- The no_scout path is the same as the existing stripe-webhook/cancel flow — it
-- calls transition_check('no_scout') which releases the Stripe hold via the existing
-- no_scout handler. Seekers are not charged. (Pitfall 4 in 05-RESEARCH.md.)
--
-- A GPS-rejection re-dispatch resets updated_at via reset_check_for_redispatch (0012),
-- which restarts the dispatch window for the re-opened check.
--
-- Scheduling: wrapped in a pg_cron guard — only schedules if pg_cron is installed.
-- If pg_cron is unavailable, the function exists and can be invoked by a Supabase
-- scheduled Edge Function (note which path was used in the Wave-4 SUMMARY).

create or replace function public.expire_stale_dispatching()
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_timeout_s int;
  v_count     int := 0;
  r           record;
begin
  -- Read tunable timeout (single-market Phase 5; Phase 7 adds per-market lookup)
  select dispatch_timeout_s into v_timeout_s from public.market_config limit 1;
  v_timeout_s := coalesce(v_timeout_s, 600);  -- safe default: 10 minutes

  -- Loop over stale dispatching checks and drive them to no_scout
  for r in
    select id from public.checks
    where status = 'dispatching'
      and scout_id is null
      and updated_at < now() - make_interval(secs => v_timeout_s)
  loop
    -- Service role (auth.uid() null) is authorised to drive no_scout (0010/0012 rule).
    -- transition_check logs check.status_changed; the no_scout path releases the hold.
    perform public.transition_check(
      r.id,
      'no_scout',
      jsonb_build_object('reason', 'dispatch_timeout')
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function public.expire_stale_dispatching() is
  'DISP-03: service-role dispatch timeout sweeper. Transitions dispatching+unclaimed checks '
  'past market_config.dispatch_timeout_s (default 600 s) to no_scout via transition_check(). '
  'Service role (auth.uid() null) is authorised by 0012 transition_check dispatching branch. '
  'The no_scout path releases the Stripe hold (Seeker not charged). '
  'Schedule via pg_cron (see guard below) or a Supabase Edge Function cron if pg_cron unavailable.';

-- Schedule expire_stale_dispatching via pg_cron if the extension is installed.
-- The job runs every 60 seconds (pg_cron minimum resolution).
-- If pg_cron is NOT installed, this block is a no-op and the sweeper must be called
-- by a Supabase Edge Function on a schedule (document in Wave-4 deploy notes).
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Remove any previous schedule with this name before (re)creating.
    perform cron.unschedule('lmc-expire-dispatching');
    perform cron.schedule('lmc-expire-dispatching', '* * * * *',
      'select public.expire_stale_dispatching()');
  end if;
exception when others then
  -- Silently swallow if pg_cron schema/functions not available (e.g. Supabase free tier).
  null;
end $$;
