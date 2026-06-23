// Seeker's Saved Places — persisted in Supabase (saved_places) via lib/api.
//
// The export surface is byte-compatible with the old in-memory store so the
// importing screens (home, saved) need no change: reads stay synchronous off a
// local cache, mutators update the cache optimistically and persist in the
// background through lib/api (RLS keeps each user to their own rows).

import { useEffect, useState } from 'react';
import { addSavedPlace, removeSavedPlace, getSavedPlaces } from '../lib/api';

export type SavedPlace = {
  id: string; // unique — the saved_places.place_key
  name: string;
  address?: string;
  category?: string;
  coord: [number, number];
  marketId: string;
  savedAt: string; // ISO date
};

let _saved: SavedPlace[] = [];
let _listeners: (() => void)[] = [];
let _hydrated = false;

function notify() {
  _listeners.forEach((fn) => fn());
}

/**
 * Extract [lng, lat] from a PostGIS geography value returned by Supabase.
 * The JS client returns geography columns as a GeoJSON-like object:
 *   { type: 'Point', coordinates: [lng, lat] }
 * If the value is missing or malformed, returns null so the caller can skip
 * places with no valid coordinate (they would drop the map pin at null island).
 */
function extractCoord(raw: unknown): [number, number] | null {
  if (!raw || typeof raw !== 'object') return null;
  const geo = raw as { type?: string; coordinates?: unknown };
  if (geo.type === 'Point' && Array.isArray(geo.coordinates) && geo.coordinates.length >= 2) {
    const [lng, lat] = geo.coordinates as number[];
    if (typeof lng === 'number' && typeof lat === 'number' && (lng !== 0 || lat !== 0)) {
      return [lng, lat];
    }
  }
  return null;
}

/** Pull the user's saved places from Supabase into the local cache. */
export async function hydrateSaved(): Promise<void> {
  try {
    const rows = await getSavedPlaces();
    const hydrated: SavedPlace[] = [];
    for (const r of rows) {
      const coord = extractCoord(r.coord);
      // Skip rows with no persisted coordinate — tapping CHECK would drop a pin
      // at [0,0] (null island). They will be re-saved with coords on next toggle.
      if (!coord) continue;
      hydrated.push({
        id: r.place_key,
        name: r.name,
        address: r.address ?? undefined,
        category: r.category ?? undefined,
        coord,
        marketId: r.market_id ?? '',
        savedAt: r.saved_at,
      });
    }
    _saved = hydrated;
    _hydrated = true;
    notify();
  } catch {
    // Signed out / offline / empty table — leave the cache as-is.
  }
}

export function getSaved(): SavedPlace[] {
  return _saved;
}

export function isSaved(id: string): boolean {
  return _saved.some((p) => p.id === id);
}

export function savePlace(place: Omit<SavedPlace, 'savedAt'>): void {
  if (isSaved(place.id)) return;
  // Optimistic local update so the UI flips instantly.
  _saved = [{ ...place, savedAt: new Date().toISOString() }, ..._saved];
  notify();
  // Persist in the background; never block the screen.
  void addSavedPlace({
    placeKey: place.id,
    name: place.name,
    address: place.address,
    category: place.category,
    coord: place.coord,
    marketId: place.marketId,
  }).catch(() => {});
}

export function removeSaved(id: string): void {
  _saved = _saved.filter((p) => p.id !== id);
  notify();
  void removeSavedPlace(id).catch(() => {});
}

export function toggleSaved(place: Omit<SavedPlace, 'savedAt'>): void {
  if (isSaved(place.id)) removeSaved(place.id);
  else savePlace(place);
}

export function useSavedPlaces() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    _listeners.push(fn);
    if (!_hydrated) void hydrateSaved();
    return () => {
      _listeners = _listeners.filter((l) => l !== fn);
    };
  }, []);
  return {
    list: _saved,
    isSaved,
    save: savePlace,
    remove: removeSaved,
    toggle: toggleSaved,
    count: _saved.length,
  };
}
