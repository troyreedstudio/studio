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
// WKT note: PostGIS `geography(point,4326)` upserts via the Supabase JS client
// accept WKT strings. LONGITUDE comes FIRST in POINT(lng lat) — the opposite of
// how expo-location returns { latitude, longitude } (RESEARCH Pitfall 1 / A1).
//
// Fallback note (A1): if the live Supabase project rejects WKT upserts on a
// geography column, replace this with a SECURITY DEFINER RPC
// `upsert_scout_location(p_lat, p_lng)` that casts internally. That is a cheap
// one-function migration — no client type changes needed.
//
// This module has NO business logic: it writes scout_locations only. State
// transitions (dispatching, accept, etc.) stay in checks.ts / the server RPCs.

import { supabase } from './supabase';

// `scout_locations` was added in migration 0012 (Phase 5). The generated
// database.types.ts predates that migration (types regen is a Wave-4 live step).
// Cast the client to `any` at the table boundary to unblock tsc until types are
// regenerated after `supabase db push` + `supabase gen types typescript --linked`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** Resolve the current authed user id, or throw if signed out (mirrors checks.ts). */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user.id;
}

/**
 * SCOUT-03: upsert the Scout's current location into `scout_locations` while
 * online. Call this on every watchPositionAsync tick (every ~30 s or 20 m move).
 *
 * WKT puts LONGITUDE first: `POINT(${lng} ${lat})` — not lat/lng (Pitfall 1).
 * Optional `accuracyM` (from pos.coords.accuracy) is stored alongside the coord
 * so `verify-clip` can distinguish a genuine on-site fix from a low-quality
 * reading (Research Pitfall 3).
 */
export async function upsertScoutLocation(
  lat: number,
  lng: number,
  accuracyM?: number,
): Promise<void> {
  const uid = await requireUserId();
  const payload: Record<string, unknown> = {
    scout_id: uid,
    // LONGITUDE first in WKT (Pitfall 1 — matches ST_MakePoint(lng, lat) on the DB).
    coord: `POINT(${lng} ${lat})`,
    is_online: true,
    updated_at: new Date().toISOString(),
  };
  if (accuracyM !== undefined) {
    payload.accuracy_m = accuracyM;
  }
  const { error } = await db
    .from('scout_locations')
    .upsert(payload, { onConflict: 'scout_id' });
  if (error) throw error;
}

/**
 * SCOUT-03: flip the Scout offline. Upserts `is_online: false` for the current
 * user WITHOUT updating `coord` — we keep the last known coord intact in the DB
 * so that if the Scout quickly comes back online their location is still known
 * (next watchPositionAsync tick will refresh it anyway).
 *
 * Also called on screen unmount so background location watching stops cleanly.
 */
export async function setScoutOffline(): Promise<void> {
  const uid = await requireUserId();
  const { error } = await db
    .from('scout_locations')
    .upsert(
      { scout_id: uid, is_online: false, updated_at: new Date().toISOString() },
      { onConflict: 'scout_id' },
    );
  if (error) throw error;
}
