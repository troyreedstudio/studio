// Scout location upsert helpers (SCOUT-03 / Phase 5 Plan 05).
//
// These functions keep the Scout's online/offline state and GPS coords fresh in
// the `scout_locations` table so the server-side dispatch RPC
// (list_open_checks_for_scout) can geo-filter checks by proximity.
//
// RLS: each Scout writes only their own row (scout_id = auth.uid()).
// The `dispatch_radius_m` query runs server-side (SECURITY DEFINER RPC) —
// clients never read other Scouts' raw locations.
//
// IMPLEMENTATION NOTE (migration 0013 / A1 fallback):
// The original client-side WKT upsert ('POINT(lng lat)' via .from().upsert())
// failed silently on the live Supabase project — PostgREST has no assignment cast
// from text → geography(point,4326), so scout_locations stayed EMPTY and
// geofenced dispatch had nothing to match. The error was swallowed by the
// dashboard.tsx `.catch(()=>{})`.
//
// Fix: SECURITY DEFINER RPCs that receive plain lat/lng doubles and cast
// internally via ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326). supabase.rpc()
// works correctly on Hermes — only supabase.functions.invoke had the hang on
// device (Research A1). See migration 0013 for the full SQL + comments.
//
// LONGITUDE FIRST in ST_MakePoint (Pitfall 1) is now enforced server-side.
// The client still passes (lat, lng) in the natural expo-location order; the
// RPC handles the flip.
//
// This module has NO business logic: it writes scout_locations only. State
// transitions (dispatching, accept, etc.) stay in checks.ts / the server RPCs.

import { supabase } from './supabase';

/**
 * SCOUT-03: upsert the Scout's current location into `scout_locations` while
 * online. Call this on every watchPositionAsync tick (every ~30 s or 20 m move).
 *
 * Delegates to the `upsert_scout_location` SECURITY DEFINER RPC (migration 0013)
 * which casts the plain doubles to geography(point,4326) server-side — avoiding
 * the PostgREST text→geography cast failure that the original WKT client upsert hit.
 *
 * The RPC enforces: auth.uid() == scout_id, LONGITUDE first in ST_MakePoint,
 * NaN/out-of-range coord rejection. No client-supplied scout_id is accepted.
 *
 * Optional `accuracyM` (from pos.coords.accuracy) is stored alongside the coord
 * so `verify-clip` can distinguish a genuine on-site fix from a low-quality
 * reading (Research Pitfall 3).
 */
export async function upsertScoutLocation(
  lat: number,
  lng: number,
  accuracyM?: number,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('upsert_scout_location', {
    p_lat: lat,
    p_lng: lng,
    p_accuracy: accuracyM ?? null,
  });
  if (error) throw error;
}

/**
 * SCOUT-03: flip the Scout offline. Calls the `set_scout_offline` SECURITY
 * DEFINER RPC which sets is_online=false WITHOUT updating coord — the last known
 * position is preserved so that a quick come-back-online cycle doesn't need to
 * wait for a new GPS fix before the dispatch RPC can see the Scout.
 *
 * Also called on screen unmount so background location watching stops cleanly.
 */
export async function setScoutOffline(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('set_scout_offline', {});
  if (error) throw error;
}
