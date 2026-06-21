-- 0012_geo_spatial.test.sql — Phase 5 / DISP-01, DISP-02, VER-01, SAFE-01
-- Proves the spatial spine that migration 0012_dispatch_verification_spine.sql lays:
--   * market_config has the TWO tunable radii seeded for 'mia' with correct defaults
--   * ST_MakePoint(longitude, latitude) order — correct order gives sensible distances;
--     a deliberate (latitude, longitude) swap lands far away (proves the swap is a real bug)
--   * distance_m() helper: a clip 25 m from venue passes the 30 m film-fence;
--     a clip 40 m away is hard-rejected
--   * dispatch radius: a scout 1.2 km away is within 1500 m; one 2 km away is not
--   * no_film_zone (SAFE-01): a point inside the seeded Miami zone is detected;
--     a point outside is not
-- Run with: supabase test db  (pgTAP)
-- RED until 0012_dispatch_verification_spine.sql lands.

begin;
select plan(8);

-- ============================================================
-- Coordinate fixtures (Miami area — tied to the live 'mia' market)
-- Reference: seed.sql seeds 'mia' center as ST_MakePoint(-80.1918, 25.7617)
-- 1 degree latitude ≈ 111320 m
-- ============================================================
-- Venue point: -80.1918 lon, 25.7617 lat (Miami Beach area)
-- ~25 m north:  lat + 25.0/111320.0 = lat + 0.0002245
-- ~40 m north:  lat + 40.0/111320.0 = lat + 0.0003593
-- ~100 m north: lat + 100.0/111320.0 = lat + 0.0008979
-- ~1200 m north: lat + 1200.0/111320.0 = lat + 0.010780
-- ~2000 m north: lat + 2000.0/111320.0 = lat + 0.017970

-- ===== 1. market_config: dispatch_radius_m default is 1500 for 'mia' =====
select is(
  (select dispatch_radius_m from public.market_config where market_id = 'mia'),
  1500::double precision,
  'mia dispatch radius default 1500'
);

-- ===== 2. market_config: film_fence_max_m (hard max) is 30 for 'mia' =====
select is(
  (select film_fence_max_m from public.market_config where market_id = 'mia'),
  30::double precision,
  'mia film-fence hard max 30'
);

-- ===== 3a. LNG/LAT ORDER — correct order: a point 100 m north is within 150 m =====
-- Venue: ST_MakePoint(lng=-80.1918, lat=25.7617)
-- Point 100 m north: ST_MakePoint(lng=-80.1918, lat=25.7617+0.0008979)
select ok(
  ST_DWithin(
    ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-80.1918, 25.7617 + 0.0008979), 4326)::geography,
    150
  ),
  'correct lng,lat order: 100m point is within 150m'
);

-- ===== 3b. LNG/LAT ORDER — correct order: the same 100 m point is NOT within 50 m =====
select ok(
  NOT ST_DWithin(
    ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-80.1918, 25.7617 + 0.0008979), 4326)::geography,
    50
  ),
  '100m point NOT within 50m (correct order sanity check)'
);

-- ===== 4. SWAP IS A BUG — build the same numeric values SWAPPED as (lat, lng) =====
-- Correct venue: ST_MakePoint(-80.1918, 25.7617)    → a point near Miami
-- Swapped point: ST_MakePoint(25.7617, -80.1918)    → a point in the Southern Ocean
-- These two points are on opposite sides of the planet — NOT within 150 m of each other.
select ok(
  NOT ST_DWithin(
    ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography,
    ST_SetSRID(ST_MakePoint(25.7617, -80.1918), 4326)::geography,
    150
  ),
  'lat/lng swap lands far away (proves the swap bug — swapped point is ~10000 km off)'
);

-- ===== 5a. FILM-FENCE BOUNDARY — 25 m clip PASSES the 30 m hard fence =====
-- distance_m(p_lat, p_lng, p_geog) — lat+0.0002245 puts us ~25 m north
select ok(
  public.distance_m(
    25.7617 + 0.0002245,
    -80.1918,
    ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography
  ) <= 30,
  '25m clip passes 30m film-fence (distance_m returns <= 30)'
);

-- ===== 5b. FILM-FENCE BOUNDARY — 40 m clip is HARD-REJECTED =====
-- lat+0.0003593 puts us ~40 m north, exceeding the 30 m cap
select ok(
  public.distance_m(
    25.7617 + 0.0003593,
    -80.1918,
    ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography
  ) > 30,
  '40m clip exceeds 30m film-fence (distance_m returns > 30)'
);

-- ===== 6a. DISPATCH RADIUS — scout 1.2 km north IS within 1500 m =====
select ok(
  ST_DWithin(
    ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-80.1918, 25.7617 + 0.010780), 4326)::geography,
    1500
  ),
  'scout 1200m north IS within dispatch radius of 1500m'
);

-- ===== 6b. DISPATCH RADIUS — scout 2 km north is NOT within 1500 m =====
select ok(
  NOT ST_DWithin(
    ST_SetSRID(ST_MakePoint(-80.1918, 25.7617), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-80.1918, 25.7617 + 0.017970), 4326)::geography,
    1500
  ),
  'scout 2000m north is NOT within dispatch radius of 1500m'
);

-- NOTE: no_film_zone SAFE-01 tests are covered in supabase/tests/safe01_no_film_zones.test.sql
-- (Wave-0 gap per RESEARCH.md). The is_in_no_film_zone function and zone seed data
-- are authored in 0012_dispatch_verification_spine.sql and will be tested there.

select * from finish();
rollback;
