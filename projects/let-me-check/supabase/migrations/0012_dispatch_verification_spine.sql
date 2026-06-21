-- 0012_dispatch_verification_spine.sql
-- LMC Phase 5 — Verification Moat + Dispatch: SQL spine for geofenced dispatch
-- and GPS clip verification.
--
-- This migration lays ALL Phase-5 schema foundations in one place so Plans 02/03/04
-- build against fixed contracts rather than exploring the schema. It adds:
--   (1) market_config         — TWO DISTINCT tunable distances (wide dispatch radius vs
--                               tight film-fence), seeded per existing market row.
--   (2) scout_locations       — queryable lat/lng per online Scout (GiST + RLS).
--   (3) checks.coord          — geography(point,4326) on checks + GiST index + backfill
--                               from requested_lat/lng (lng,lat order!).
--   (4) clips advisory columns— gps_verified, filmed_accuracy_m, signage_confirmed.
--   (5) distance_m()          — server-side meter distance helper (lng,lat order, NaN guard).
--   (6) no_film_zones         — PostGIS polygon table for SAFE-01 + containment helper.
--   (7) is_valid_check_transition() — ADD re-dispatch edges (filming/uploaded/processing
--                               -> dispatching); full 0010 body verbatim + new edges.
--   (8) transition_check()    — ADD system allowance for the dispatching branch only
--                               (allows service-role reset_check_for_redispatch to call it).
--   (9) reset_check_for_redispatch() — service-role-only RPC that nulls scout_id and
--                               re-opens a check to dispatching after GPS rejection.
--
-- ORDERING NOTE: runs AFTER 0011 (payments). Like 0010, it uses CREATE OR REPLACE for
-- function bodies and compares check_status params on ::text (no create-time enum-label
-- resolution, no forward dependency).
--
-- DATA-02 STILL HOLDS: no new client UPDATE policy on checks or clips. status/scout_id
-- remain reachable only through SECURITY DEFINER functions.
--
-- CRITICAL: ST_MakePoint takes (LONGITUDE, LATITUDE) — the OPPOSITE of how GPS APIs
-- return {latitude, longitude}. Every call in this file passes lng FIRST. See Pitfall 1
-- in 05-RESEARCH.md. The pgTAP swap test (0012_geo_spatial.test.sql) proves this.

-- =============================================================================
-- 1. market_config — TWO DISTINCT tunable distances
-- =============================================================================
-- TWO distances are deliberately separate columns:
--   dispatch_radius_m  — WIDE:  ~1.5 km; how far a Scout can be from a check and
--                               still be eligible to accept (D-02). Tunable as Scout
--                               density grows. Do NOT conflate with the film-fence.
--   film_fence_m       — TIGHT: ~25 m target; informational / logging baseline.
--   film_fence_max_m   — HARD MAX: 30 m; any clip GPS farther than this is auto-rejected
--                               by verify-clip (D-04/D-05). Never pass beyond this value.
-- RLS: read-only for authenticated; tuning + zone data are service/admin-managed writes.

create table if not exists public.market_config (
  market_id          text primary key references public.markets(id),
  dispatch_radius_m  double precision not null default 1500,  -- D-02 wide dispatch fence (TUNABLE)
  film_fence_m       double precision not null default 25,    -- D-04 tight film-fence target (informational)
  film_fence_max_m   double precision not null default 30,    -- D-04 HARD MAX — never pass beyond this
  dispatch_timeout_s int              not null default 600,   -- DISP-03 window (10 min; used by cron in later phase)
  signage_min_conf   double precision not null default 0.5    -- D-06 advisory strictness (TUNABLE)
);

comment on table public.market_config is
  'Phase 5: per-market tunable config for dispatch + GPS verification. '
  'dispatch_radius_m and film_fence_max_m are DELIBERATELY SEPARATE — dispatch is wide (~1.5 km), '
  'film-fence is tight (~25 m target, 30 m HARD MAX). Never conflate. Service/admin-managed writes only.';

comment on column public.market_config.dispatch_radius_m is
  'D-02: wide dispatch fence in meters (default 1500). Tunable as Scout density grows. '
  'Never hard-code this in app or Edge Function code — always read from this table.';

comment on column public.market_config.film_fence_max_m is
  'D-04: HARD MAX for GPS clip rejection. Any clip GPS > this meters from the venue is '
  'auto-rejected by verify-clip (D-05). Must be read server-side; never trust the client.';

-- Seed idempotently: one row per existing market (all defaults — ops tunes per market later).
insert into public.market_config (market_id)
  select id from public.markets
  on conflict (market_id) do nothing;

-- RLS on market_config: authenticated users may read (powers client-side radius hints
-- and dispatch badge); no client can write (T-05-06: radii/zones are non-sensitive).
alter table public.market_config enable row level security;

create policy market_config_select_authenticated on public.market_config
  for select to authenticated using (true);

-- =============================================================================
-- 2. scout_locations — queryable lat/lng per online Scout
-- =============================================================================
-- One row per Scout while online (upserted by the client every ~30 s).
-- The dispatch RPC (Plan 02) queries this table server-side to find eligible Scouts.
-- Geography column + GiST index means ST_DWithin runs index-assisted at scale.
-- RLS: a Scout may insert/update/select ONLY their own row (T-05-01).
-- NO policy lets one authenticated user read another Scout's raw location.
-- Only the dispatch RPC (SECURITY DEFINER, Plan 02) reads across rows.

create table if not exists public.scout_locations (
  scout_id   uuid primary key references auth.users(id),
  coord      geography(point, 4326) not null,  -- ALWAYS ST_MakePoint(lng, lat)
  is_online  boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists scout_locations_coord_gix
  on public.scout_locations using gist (coord);

comment on table public.scout_locations is
  'Phase 5: one queryable row per online Scout. coord = geography(point,4326) lon/lat. '
  'GiST-indexed for ST_DWithin dispatch radius queries. '
  'RLS: Scout writes own row only; raw locations never exposed to other authenticated users.';

comment on column public.scout_locations.coord is
  'CRITICAL: ST_MakePoint(longitude, latitude). Device sends {latitude,longitude}; '
  'WKT upsert must be POINT(lng lat). Pitfall 1 in 05-RESEARCH.md.';

alter table public.scout_locations enable row level security;

create policy scout_locations_own_select on public.scout_locations
  for select to authenticated using (auth.uid() = scout_id);

create policy scout_locations_own_insert on public.scout_locations
  for insert to authenticated with check (auth.uid() = scout_id);

create policy scout_locations_own_update on public.scout_locations
  for update to authenticated using (auth.uid() = scout_id);

-- =============================================================================
-- 3. checks.coord — geography column + GiST index + backfill
-- =============================================================================
-- 0008 added requested_lat/requested_lng as plain double-precision columns.
-- Phase 5 adds coord geography(point,4326) so the dispatch RPC can use ST_DWithin
-- index-assisted (Pitfall 6 in 05-RESEARCH.md). Backfill any existing rows.
-- createCheck (Plan 05) will populate coord at INSERT time going forward.

alter table public.checks
  add column if not exists coord geography(point, 4326);

create index if not exists checks_coord_gix
  on public.checks using gist (coord);

comment on column public.checks.coord is
  'Phase 5: geography(point,4326) for dispatch ST_DWithin queries. '
  'Populated at createCheck time (Plan 05) from venue.coord or requested_lat/lng. '
  'Backfilled here for any existing rows. ALWAYS ST_MakePoint(lng, lat).';

-- Backfill from requested_lat/lng for existing rows (lng,lat order — CRITICAL).
update public.checks
  set coord = ST_SetSRID(ST_MakePoint(requested_lng, requested_lat), 4326)::geography
  where coord is null
    and requested_lat is not null
    and requested_lng is not null;

-- =============================================================================
-- 4. clips advisory columns (additive, nullable — do not affect existing rows)
-- =============================================================================
-- gps_verified:      set by verify-clip after GPS fence check
--   true  = clip GPS is within film_fence_max_m of the venue → delivery allowed
--   false = clip GPS outside fence → auto-rejected; check re-dispatched
--   null  = verify-clip has not run yet (pending)
-- filmed_accuracy_m: device coords.accuracy (meters, 68% CI); stored for tuning (A6)
-- signage_confirmed: D-06 advisory signal from Google Vision
--   true  = venue sign detected; false = could not confirm sign; null = not yet run

alter table public.clips
  add column if not exists gps_verified       boolean,
  add column if not exists filmed_accuracy_m  double precision,
  add column if not exists signage_confirmed  boolean;

comment on column public.clips.gps_verified is
  'Phase 5: true = GPS fence passed (distance_m <= film_fence_max_m); '
  'false = auto-rejected (distance > cap); null = verify-clip not yet run.';

comment on column public.clips.signage_confirmed is
  'Phase 5: D-06 advisory only — Google Vision TEXT_DETECTION result. '
  'NEVER gates delivery. true/false/null(not run or could not read sign).';

-- =============================================================================
-- 5. distance_m() helper — server-side meter distance with NaN guard (V5)
-- =============================================================================
-- Used by verify-clip (Plan 03) and the pgTAP spatial test.
-- Signature: distance_m(p_lat, p_lng, p_geog) — lat/lng first for readability in
-- callers; internally passes lng FIRST to ST_MakePoint (the correct PostGIS order).
-- V5 input validation: null or NaN inputs return null rather than silently passing.

create or replace function public.distance_m(
  p_lat  double precision,
  p_lng  double precision,
  p_geog geography
)
returns double precision
language sql
immutable
as $$
  select case
    when p_lat  is null or p_lng  is null or p_geog is null then null
    when not (p_lat = p_lat) or not (p_lng = p_lng)         then null   -- NaN guard (NaN != NaN)
    else ST_Distance(
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,  -- LONGITUDE FIRST
      p_geog
    )
  end;
$$;

comment on function public.distance_m(double precision, double precision, geography) is
  'Phase 5: server-side distance in meters between a lat/lng point and a geography. '
  'CRITICAL: ST_MakePoint takes (LONGITUDE, LATITUDE) — this function receives (p_lat, p_lng) '
  'for readable call sites but internally passes p_lng FIRST. '
  'V5: null or NaN inputs return null (never silently pass the fence). '
  'Used by verify-clip Edge Function and pgTAP 0012_geo_spatial.test.sql.';

-- =============================================================================
-- 6. no_film_zones — PostGIS polygon table for SAFE-01 + containment helper
-- =============================================================================
-- Hospitals, schools, courts, police stations, and private residences that must
-- block createCheck server-side (SAFE-01). Polygon data source for Phase 5 MVP:
-- manually-seeded placeholder rows per launch market. Full OSM ingestion is Phase 6.
-- RLS: readable by authenticated (powers client-side warning); writes are service/admin only.

create table if not exists public.no_film_zones (
  id        uuid primary key default gen_random_uuid(),
  market_id text references public.markets(id),
  name      text not null,
  category  text not null check (category in ('hospital','school','court','police','residence')),
  area      geography(polygon, 4326) not null
);

create index if not exists no_film_zones_area_gix
  on public.no_film_zones using gist (area);

comment on table public.no_film_zones is
  'Phase 5 / SAFE-01: no-film zones (hospitals, schools, courts, police, residences). '
  'GiST-indexed polygon geography for server-side ST_Covers containment check at createCheck. '
  'Phase 5 MVP: manually-seeded placeholders; full OSM ingestion deferred to Phase 6.';

alter table public.no_film_zones enable row level security;

create policy no_film_zones_select_authenticated on public.no_film_zones
  for select to authenticated using (true);

-- Seed a placeholder no-film zone for 'mia' (Jackson Memorial Hospital area)
-- so the pgTAP SAFE-01 test and the containment helper have real data.
-- This is a rough polygon around the hospital block — replace with accurate OSM data in Phase 6.
-- Center ~25.7902, -80.2107 (Jackson Memorial Hospital, Miami)
insert into public.no_film_zones (market_id, name, category, area)
  select
    'mia',
    'Jackson Memorial Hospital (placeholder)',
    'hospital',
    ST_SetSRID(
      ST_GeomFromText(
        'POLYGON((-80.2150 25.7880, -80.2060 25.7880, -80.2060 25.7920, -80.2150 25.7920, -80.2150 25.7880))'
      ),
      4326
    )::geography
  where not exists (
    select 1 from public.no_film_zones
    where market_id = 'mia' and name = 'Jackson Memorial Hospital (placeholder)'
  );

-- Containment helper: returns true if a lat/lng point is inside ANY no_film_zone.
-- Used by createCheck (Plan 05) to block requests at court-protected zones (SAFE-01).
-- SECURITY DEFINER + search_path=public: runs with schema privileges so it can
-- always query no_film_zones even when the caller's role has restricted search path.

create or replace function public.is_in_no_film_zone(
  p_lat double precision,
  p_lng double precision
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_lat is null or p_lng is null          then false
    when not (p_lat = p_lat) or not (p_lng = p_lng) then false  -- NaN guard
    else exists (
      select 1
      from public.no_film_zones
      where ST_Covers(
        area,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography  -- LONGITUDE FIRST
      )
    )
  end;
$$;

comment on function public.is_in_no_film_zone(double precision, double precision) is
  'Phase 5 / SAFE-01: returns true if (p_lat, p_lng) falls inside any no_film_zones polygon. '
  'Called by createCheck to block filming at hospitals, schools, courts, etc. '
  'SECURITY DEFINER so it can read no_film_zones regardless of caller role. '
  'V5: null/NaN coords return false (defensive, does not block honest attempts).';

-- =============================================================================
-- 7. is_valid_check_transition() — ADD re-dispatch edges (Phase 5)
-- =============================================================================
-- Phase 5 requires that a GPS-rejected clip can re-open its check back to
-- 'dispatching' from any of the mid-flight states:
--   filming    -> dispatching  (GPS rejected before the Mux upload completes)
--   uploaded   -> dispatching  (GPS rejected after raw upload, before processing)
--   processing -> dispatching  (GPS rejected after Mux processing but before delivered)
--
-- This is a CREATE OR REPLACE of the 0010 body (verbatim) with the three new
-- re-dispatch edges ADDED. All existing edges are preserved exactly.
-- ::text comparison is kept (no create-time enum-label resolution).

create or replace function public.is_valid_check_transition(
  p_from check_status,
  p_to   check_status
)
returns boolean
language sql
immutable
as $$
  select case
    when p_from::text = 'requested'   and p_to::text in ('dispatching','cancelled')                    then true
    when p_from::text = 'dispatching' and p_to::text in ('assigned','cancelled','no_scout','expired')  then true
    when p_from::text = 'assigned'    and p_to::text in ('filming','cancelled')                        then true
    -- Phase 3: Mux finalize chain + direct filming->delivered for legacy tests.
    when p_from::text = 'filming'     and p_to::text in ('uploaded','delivered')                       then true
    when p_from::text = 'uploaded'    and p_to::text = 'processing'                                    then true
    when p_from::text = 'processing'  and p_to::text = 'delivered'                                     then true
    when p_from::text = 'delivered'   and p_to::text = 'rated'                                          then true
    -- Phase 5: re-dispatch edges for GPS auto-reject (D-05).
    -- When verify-clip rejects a clip's GPS, the check returns to dispatching so a new
    -- Scout can accept. reset_check_for_redispatch() is the only caller of these edges
    -- (service role, auth.uid() IS NULL).
    when p_from::text in ('filming','uploaded','processing') and p_to::text = 'dispatching' then true
    else false
  end;
$$;

comment on function public.is_valid_check_transition(check_status, check_status) is
  'DATA-02 legal-edge table for the check state machine. Phase 3 added Mux edges. '
  'Phase 5 adds re-dispatch edges: filming/uploaded/processing -> dispatching for GPS '
  'auto-reject (D-05). reset_check_for_redispatch() is the only service-role caller. '
  '::text comparison avoids create-time enum-label resolution (ORDERING NOTE).';

-- =============================================================================
-- 8. transition_check() — relax dispatching branch for service-role re-dispatch
-- =============================================================================
-- Phase 3 (0010) allows the system (auth.uid() IS NULL) to drive uploaded/processing/
-- delivered. Phase 5 additionally needs the system to call transition_check with
-- p_to='dispatching' when reset_check_for_redispatch nulls scout_id and re-opens the
-- check. The only change vs 0010 is in the dispatching branch:
--
--   BEFORE (0010):
--     elsif p_to = 'dispatching' and v_uid is distinct from v_seeker then raise ...
--
--   AFTER (0012):
--     elsif p_to = 'dispatching' and v_uid is not null and v_uid is distinct from v_seeker then raise ...
--
-- Adding `v_uid is not null` means: a non-null uid that is NOT the seeker is blocked
-- (unchanged for human callers), but a null uid (service role) is allowed through.
-- The seeker can still dispatch their own check (as before); only the "wrong human"
-- error path is narrowed.
--
-- All other logic is verbatim from 0010. The `for update` lock, log_event shape,
-- and all other actor-authz branches are unchanged.

create or replace function public.transition_check(
  p_check_id uuid,
  p_to       check_status,
  p_context  jsonb default '{}'::jsonb
)
returns check_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from   check_status;
  v_seeker uuid;
  v_scout  uuid;
  v_uid    uuid := auth.uid();
begin
  -- Read + lock the row against concurrent transitions.
  select status, seeker_id, scout_id
    into v_from, v_seeker, v_scout
  from public.checks
  where id = p_check_id
  for update;

  if not found then
    raise exception 'transition_check: check % not found', p_check_id;
  end if;

  -- (a) valid-transition guard: reject illegal jumps.
  if not public.is_valid_check_transition(v_from, p_to) then
    raise exception 'illegal transition % -> %', v_from, p_to;
  end if;

  -- (b) actor authorization (definer fn must self-authorize; RLS does not cover this).
  if p_to = 'rated' and v_uid is distinct from v_seeker then
    raise exception 'only the seeker may rate';
  elsif p_to in ('uploaded','processing') and v_uid is not null then
    -- Only the system (service role, auth.uid() null) drives upload/processing finalize.
    -- A human caller may never drive them (T-03-02 / T-05-03).
    raise exception 'only the system may drive %', p_to;
  elsif p_to in ('filming','delivered') and v_uid is not null and v_uid is distinct from v_scout then
    -- A human is scout-gated on filming/delivered; the system (uid null) passes through.
    raise exception 'only the assigned scout may drive %', p_to;
  elsif p_to = 'cancelled' and v_uid is distinct from v_seeker then
    raise exception 'only the seeker may cancel';
  elsif p_to = 'dispatching' and v_uid is not null and v_uid is distinct from v_seeker then
    -- PHASE 5 CHANGE vs 0010: added `v_uid is not null` so the system (auth.uid() null)
    -- can call transition_check('dispatching') from reset_check_for_redispatch (T-05-03).
    -- Human callers: only the owning seeker may dispatch their own check.
    raise exception 'only the seeker may dispatch';
  end if;

  -- Terminal system transitions (no_scout / expired):
  -- the owning seeker or the service role (auth.uid() null) may drive them.
  if p_to in ('no_scout','expired')
     and v_uid is not null and v_uid is distinct from v_seeker then
    raise exception 'only the seeker or system may end the check as %', p_to;
  end if;

  -- (c) deliver-needs-READY-clip guard (0010): the clip must be Mux-ready.
  -- A GPS-rejected clip has status='rejected', so it does NOT satisfy this guard —
  -- the re-dispatch path exits before reaching 'delivered', which is correct.
  if p_to = 'delivered'
     and not exists (
       select 1 from public.clips
       where check_id = p_check_id and status = 'ready'
     ) then
    raise exception 'cannot deliver without a ready clip';
  end if;

  -- Advance the state machine (sole writer of status/updated_at).
  update public.checks
  set status = p_to,
      updated_at = now()
  where id = p_check_id;

  -- Append the immutable audit event.
  perform public.log_event(
    'check.status_changed',
    'check',
    p_check_id,
    jsonb_build_object('from', v_from, 'to', p_to) || coalesce(p_context, '{}'::jsonb)
  );

  return p_to;
end;
$$;

comment on function public.transition_check(uuid, check_status, jsonb) is
  'DATA-02: sole server-side writer of checks.status. SECURITY DEFINER. Enforces '
  'is_valid_check_transition + actor authorization + deliver-needs-READY-clip. '
  'Phase 3: system (service role, auth.uid() null) drives uploaded/processing/delivered. '
  'Phase 5: system also allowed to drive dispatching for GPS-reject re-dispatch (T-05-03). '
  'Only change vs 0010: dispatching branch adds `v_uid is not null` guard. '
  'Clients have no UPDATE policy on checks (DATA-02).';

-- =============================================================================
-- 9. reset_check_for_redispatch() — service-role-only re-dispatch RPC
-- =============================================================================
-- Called by verify-clip (Plan 03) when GPS fence check fails (D-05).
-- Steps:
--   1. Confirm system-only caller (auth.uid() IS NULL) — T-05-02.
--   2. Lock + read the current check status.
--   3. Mark the latest clip row 'rejected' (avoids two live clips — Pitfall 5).
--   4. Null out scout_id (re-opens check for new Scouts).
--   5. Call transition_check(p_check_id, 'dispatching') to advance via the legal edge.
--   6. Log check.redispatched event.
--
-- The nulling of scout_id directly here (step 4) is the sole exception to the
-- "accept_check is the sole writer of scout_id" invariant — it is intentional and
-- documented. accept_check SETS scout_id; this function CLEARS it on verified rejection.

create or replace function public.reset_check_for_redispatch(
  p_check_id uuid
)
returns check_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_from check_status;
begin
  -- T-05-02: system only — auth.uid() must be null (service role).
  -- A non-null uid means a human (or forged-service client) is calling: block it.
  if v_uid is not null then
    raise exception 'reset_check_for_redispatch: system only (auth.uid() must be null)';
  end if;

  -- Lock + read current status.
  select status
    into v_from
  from public.checks
  where id = p_check_id
  for update;

  if not found then
    raise exception 'reset_check_for_redispatch: check % not found', p_check_id;
  end if;

  -- Mark the most-recent clip rejected (Pitfall 5: prevent two live clips on re-dispatch).
  -- Only the latest clip is affected; earlier rejected clips are left alone.
  update public.clips
    set status = 'rejected'
  where check_id = p_check_id
    and id = (
      select id
      from public.clips
      where check_id = p_check_id
      order by created_at desc
      limit 1
    );

  -- Clear scout_id so the check is re-claimable (sole deliberate exception to
  -- "accept_check is the sole scout_id writer" — this function CLEARS, accept SETS).
  update public.checks
    set scout_id = null
  where id = p_check_id;

  -- Drive back to dispatching via the legal Phase-5 edge (already unlocked; transition_check
  -- will re-acquire the lock and write status + audit event).
  perform public.transition_check(
    p_check_id,
    'dispatching'::check_status,
    jsonb_build_object('reason', 'gps_rejected', 'from', v_from)
  );

  -- Dedicated audit event for observability (separate from the generic status_changed).
  perform public.log_event(
    'check.redispatched',
    'check',
    p_check_id,
    jsonb_build_object('reason', 'gps_rejected', 'from', v_from::text)
  );

  return 'dispatching'::check_status;
end;
$$;

comment on function public.reset_check_for_redispatch(uuid) is
  'Phase 5 / D-05: service-role-only RPC called by verify-clip when GPS auto-reject fires. '
  'T-05-02: raises unless auth.uid() IS NULL (system/service role). '
  'Marks latest clip rejected (Pitfall 5), nulls scout_id, transitions check to dispatching '
  'via the Phase-5 re-dispatch edge. Logs check.redispatched to event_log. '
  'DATA-02 still holds: no client can reach this path (service role only).';

-- =============================================================================
-- End of 0012_dispatch_verification_spine.sql
-- DATA-02 confirmed: no new client INSERT/UPDATE/DELETE policy on checks or clips.
-- All new tables (scout_locations, no_film_zones, market_config) are either read-only
-- for authenticated (market_config, no_film_zones) or own-row-only (scout_locations).
-- =============================================================================
