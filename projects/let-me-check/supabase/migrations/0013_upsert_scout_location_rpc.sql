-- 0013_upsert_scout_location_rpc.sql
-- Phase 5 / SCOUT-03 fix: RPC fallback for WKT upsert incompatibility.
--
-- PROBLEM: supabase-js PostgREST client cannot cast a parameterized WKT text
-- value ('POINT(lng lat)') into a geography(point,4326) column — there is no
-- assignment cast from text → geography in the default PostgREST pipeline.
-- A raw SQL upsert of the same WKT works (verified via management API), but the
-- JS client path fails silently (the dashboard.tsx catch(()=>{}) swallowed it),
-- leaving scout_locations EMPTY so geofenced dispatch has nothing to match.
--
-- FIX: SECURITY DEFINER RPC that receives (p_lat, p_lng, p_accuracy) as plain
-- doubles and casts internally via ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326).
-- supabase.rpc('upsert_scout_location', {...}) works on Hermes — only
-- supabase.functions.invoke had the hang on device (Phase-5 Research A1).
--
-- LONGITUDE FIRST in ST_MakePoint (Pitfall 1 — the silent-bug trap).
-- auth.uid() supplies scout_id — no client-supplied scout_id accepted.
-- Raises if caller is not authenticated (auth.uid() IS NULL).
--
-- Also adds set_scout_offline() RPC for consistency; the current client-side
-- setScoutOffline() uses a plain .upsert with no geography column so it actually
-- works — but moving it to an RPC removes the last direct table write from the
-- client and gives us a cleaner interface.
--
-- Both RPCs are readable as SECURITY DEFINER + search_path=public. RLS on
-- scout_locations (own-row-only) is still correct and complements these RPCs
-- because the RPCs themselves enforce caller == auth.uid().

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. upsert_scout_location — the primary fix
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.upsert_scout_location(
  p_lat      double precision,
  p_lng      double precision,
  p_accuracy double precision default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Reject unauthenticated callers immediately (mirrors requireUserId() on client).
  if v_uid is null then
    raise exception 'upsert_scout_location: caller is not authenticated';
  end if;

  -- Input sanity: non-finite or out-of-range coords are rejected so a bad GPS
  -- reading never silently pollutes the table.
  if p_lat is null or p_lng is null
     or not (p_lat = p_lat) or not (p_lng = p_lng)   -- NaN guard
     or p_lat < -90  or p_lat > 90
     or p_lng < -180 or p_lng > 180
  then
    raise exception 'upsert_scout_location: invalid coords (lat=%, lng=%)', p_lat, p_lng;
  end if;

  insert into public.scout_locations (
    scout_id,
    coord,
    is_online,
    accuracy_m,
    updated_at
  )
  values (
    v_uid,
    -- LONGITUDE FIRST in ST_MakePoint (Pitfall 1 / 05-RESEARCH.md).
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    true,
    p_accuracy,
    now()
  )
  on conflict (scout_id) do update
    set coord      = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        is_online  = true,
        accuracy_m = p_accuracy,
        updated_at = now();
end;
$$;

comment on function public.upsert_scout_location(double precision, double precision, double precision) is
  'Phase 5 / SCOUT-03: SECURITY DEFINER RPC that upserts the caller''s row in scout_locations. '
  'Replaces client-side WKT upsert which fails (no text→geography assignment cast via PostgREST). '
  'CRITICAL: ST_MakePoint(p_lng, p_lat) — LONGITUDE FIRST (Pitfall 1). '
  'Raises if auth.uid() is null (unauthenticated) or coords are invalid/NaN. '
  'Called via supabase.rpc(''upsert_scout_location'', { p_lat, p_lng, p_accuracy }).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. set_scout_offline — companion RPC (replaces client-side upsert)
-- ─────────────────────────────────────────────────────────────────────────────
-- The existing setScoutOffline() client code does a plain upsert of
-- { scout_id, is_online: false, updated_at } with NO coord column, which works
-- today (no geography cast needed). This RPC mirrors that behaviour but removes
-- the last direct client table write and gives parity with upsert_scout_location.
-- The last coord is left untouched (same as the current client implementation).

create or replace function public.set_scout_offline()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'set_scout_offline: caller is not authenticated';
  end if;

  insert into public.scout_locations (
    scout_id,
    -- coord defaults to null on first-ever insert (Scout never got a GPS fix).
    -- We allow null coord here because an offline row with null coord is still
    -- useful for presence tracking and avoids a NOT NULL violation.
    is_online,
    updated_at
  )
  values (
    v_uid,
    false,
    now()
  )
  on conflict (scout_id) do update
    set is_online  = false,
        updated_at = now();
  -- coord is deliberately NOT updated (preserve last known position).
end;
$$;

comment on function public.set_scout_offline() is
  'Phase 5 / SCOUT-03: SECURITY DEFINER RPC that flips the caller''s scout_locations '
  'row to is_online=false without touching coord (last known position preserved). '
  'Raises if auth.uid() is null. '
  'Called via supabase.rpc(''set_scout_offline'', {}).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add accuracy_m column to scout_locations if not already present
-- ─────────────────────────────────────────────────────────────────────────────
-- 0012 defines scout_locations without accuracy_m; add it now so the RPC can
-- store the device's GPS accuracy (pos.coords.accuracy) alongside the coord.
-- Nullable: legacy rows are unaffected; the RPC passes NULL when the client
-- omits p_accuracy.

alter table public.scout_locations
  add column if not exists accuracy_m double precision;

comment on column public.scout_locations.accuracy_m is
  'Phase 5: device GPS accuracy in meters (pos.coords.accuracy from expo-location). '
  'Nullable — null means the accuracy was unavailable or the row predates 0013. '
  'Stored alongside coord so verify-clip can distinguish a high-quality fix from a '
  'low-quality reading when applying the film-fence check (Research Pitfall 3).';
