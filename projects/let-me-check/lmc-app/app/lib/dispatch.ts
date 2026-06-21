// Geo-filtered dispatch RPC wrapper (DISP-01 / Phase 5 Plan 05).
//
// `listOpenChecksForScout` replaces the unfiltered `listOpenChecks` call on
// the Scout dashboard. It delegates all geo logic to the server-side
// `list_open_checks_for_scout` SECURITY DEFINER RPC (migration 0012b), which:
//   1. Reads dispatch_radius_m from market_config (never hard-coded).
//   2. Builds a geography point from the Scout's lat/lng (lng first — Pitfall 1).
//   3. Returns only dispatching + unclaimed checks within that radius.
//
// The client never computes distances or filters rows — all geo work is PostGIS.

import { supabase } from './supabase';
import type { CheckRow } from './checks';

/**
 * DISP-01: return the open (dispatching, unclaimed) checks that are within the
 * dispatch radius of the Scout's current position. Delegates to the
 * `list_open_checks_for_scout` SECURITY DEFINER RPC which uses ST_DWithin with
 * the tunable `dispatch_radius_m` from `market_config`.
 *
 * Parameter names MUST match the RPC signature exactly:
 *   p_scout_lat double precision
 *   p_scout_lng double precision
 */
export async function listOpenChecksForScout(
  lat: number,
  lng: number,
): Promise<CheckRow[]> {
  const { data, error } = await supabase.rpc('list_open_checks_for_scout', {
    p_scout_lat: lat,
    p_scout_lng: lng,
  });
  if (error) throw error;
  return (data as CheckRow[]) ?? [];
}
