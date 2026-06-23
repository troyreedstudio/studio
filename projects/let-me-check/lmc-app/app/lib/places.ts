// Google Places REST API integration — provider-isolated so we can swap later.
//
// Two public functions:
//   searchPlaces(query, opts?)  — Places Autocomplete (debounce in the screen)
//   getPlaceCoords(placeId)     — Place Details → { lat, lng, name, address }
//
// Empty key path: both functions return gracefully without throwing.
//   searchPlaces → { results: [], unavailable: true }
//   getPlaceCoords → null
//
// The key is read from config.ts (GOOGLE_PLACES_API_KEY). To activate:
//   add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=<your_key> to lmc-app/.env

import { GOOGLE_PLACES_API_KEY } from './config';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PlaceSuggestion = {
  placeId: string;
  primaryText: string;   // venue / street name
  secondaryText: string; // city, country
};

export type PlaceCoords = {
  lat: number;
  lng: number;
  name: string;
  address: string;
};

export type AutocompleteResult =
  | { results: PlaceSuggestion[]; unavailable: false }
  | { results: []; unavailable: true };

// ── Internal helpers ──────────────────────────────────────────────────────────

const BASE = 'https://maps.googleapis.com/maps/api';

/** Format as [lon, lat] so it matches the [lon, lat] convention used everywhere in LMC. */
function toAppCoord(lat: number, lng: number): [number, number] {
  return [lng, lat];
}

// ── Public API ────────────────────────────────────────────────────────────────

export type SearchPlacesOptions = {
  /** [lon, lat] bias point — usually the user's current location. Optional. */
  locationBias?: [number, number];
  /** Language tag, e.g. "en". Defaults to "en". */
  language?: string;
};

/**
 * Places Autocomplete — returns up to 5 suggestions for the typed query.
 *
 * Returns `{ unavailable: true }` when:
 *   - No API key is configured (graceful empty-key path)
 *   - Network error
 *
 * Returns `{ results: [], unavailable: false }` for a valid call with zero hits.
 */
export async function searchPlaces(
  query: string,
  opts: SearchPlacesOptions = {},
): Promise<AutocompleteResult> {
  const key = GOOGLE_PLACES_API_KEY;

  if (!key) {
    return { results: [], unavailable: true };
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { results: [], unavailable: false };
  }

  try {
    const params = new URLSearchParams({
      input: trimmed,
      key,
      language: opts.language ?? 'en',
    });

    if (opts.locationBias) {
      const [lon, lat] = opts.locationBias;
      // Bias within a 50 km radius of the given point (soft bias, not hard restrict).
      params.set('location', `${lat},${lon}`);
      params.set('radius', '50000');
    }

    const url = `${BASE}/place/autocomplete/json?${params.toString()}`;
    const res = await fetch(url, { method: 'GET' });

    if (!res.ok) {
      return { results: [], unavailable: false };
    }

    const json = (await res.json()) as {
      status: string;
      predictions?: Array<{
        place_id: string;
        structured_formatting: {
          main_text: string;
          secondary_text?: string;
        };
      }>;
    };

    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      // REQUEST_DENIED / INVALID_REQUEST / OVER_QUERY_LIMIT etc.
      // Treat as unavailable so the UI degrades gracefully.
      return { results: [], unavailable: true };
    }

    if (!json.predictions || json.predictions.length === 0) {
      return { results: [], unavailable: false };
    }

    const results: PlaceSuggestion[] = json.predictions.slice(0, 5).map((p) => ({
      placeId: p.place_id,
      primaryText: p.structured_formatting.main_text,
      secondaryText: p.structured_formatting.secondary_text ?? '',
    }));

    return { results, unavailable: false };
  } catch (e) {
    // Network error — degrade gracefully, don't crash.
    return { results: [], unavailable: false };
  }
}

/**
 * Place Details — resolves a `placeId` to real coordinates + formatted name.
 *
 * Returns `null` when:
 *   - No API key configured
 *   - Network error
 *   - No geometry in the response
 */
export async function getPlaceCoords(placeId: string): Promise<PlaceCoords | null> {
  const key = GOOGLE_PLACES_API_KEY;
  if (!key || !placeId) return null;

  try {
    const params = new URLSearchParams({
      place_id: placeId,
      key,
      fields: 'geometry,name,formatted_address',
      language: 'en',
    });

    const url = `${BASE}/place/details/json?${params.toString()}`;
    const res = await fetch(url, { method: 'GET' });

    if (!res.ok) return null;

    const json = (await res.json()) as {
      status: string;
      result?: {
        geometry?: { location?: { lat: number; lng: number } };
        name?: string;
        formatted_address?: string;
      };
    };

    if (json.status !== 'OK' || !json.result?.geometry?.location) return null;

    const { lat, lng } = json.result.geometry.location;
    return {
      lat,
      lng,
      name: json.result.name ?? '',
      address: json.result.formatted_address ?? '',
    };
  } catch {
    return null;
  }
}

/**
 * Convert a PlaceCoords result to the [lon, lat] tuple used throughout LMC.
 * Convenience wrapper so callers don't have to remember the axis order.
 */
export function placeToAppCoord(place: PlaceCoords): [number, number] {
  return toAppCoord(place.lat, place.lng);
}
