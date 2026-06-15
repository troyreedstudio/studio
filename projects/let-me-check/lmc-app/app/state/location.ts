// Real device location for LMC.
//
// Resolution ladder (best → coarsest), so we always show the user THEIR place,
// never a hard-coded default city:
//   1. GPS      — real iOS permission + exact coordinates ('granted')
//   2. IP       — approximate city from the network connection, no permission ('approx')
//   3. Manual   — the user picks their city ('manual')
//
// Resolved status + coords + city are held in a small in-memory store, mirroring
// the intended-role pattern, so any screen can read them after onboarding.
//
// Prototype only — in production GPS/IP resolution happens server-side and the
// backend returns nearby Scouts/venues. See app/data/markets.ts.

import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export type LocationStatus = 'unknown' | 'granted' | 'approx' | 'denied';
export type LocationSource = 'gps' | 'ip' | 'manual' | null;
export type Coords = [number, number]; // [lon, lat] — matches Mapbox ordering

let _status: LocationStatus = 'unknown';
let _coords: Coords | null = null;
let _city: string | null = null;
let _source: LocationSource = null;
let _listeners: (() => void)[] = [];

function notify() {
  _listeners.forEach((fn) => fn());
}

export function getLocationStatus(): LocationStatus {
  return _status;
}
export function getUserCoords(): Coords | null {
  return _coords;
}
export function getUserCity(): string | null {
  return _city;
}
export function getLocationSource(): LocationSource {
  return _source;
}

/** Best-effort reverse geocode → human city name. Never throws. */
async function cityFromCoords(coords: Coords): Promise<string | null> {
  try {
    const [place] = await Location.reverseGeocodeAsync({
      latitude: coords[1],
      longitude: coords[0],
    });
    return place?.city || place?.subregion || place?.region || null;
  } catch {
    return null;
  }
}

/**
 * Tier 1 — fire the real iOS permission prompt and read exact GPS.
 * Returns granted with coords, or denied with null. Never throws.
 */
export async function requestUserLocation(): Promise<{
  status: LocationStatus;
  coords: Coords | null;
}> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      _status = 'denied';
      notify();
      return { status: _status, coords: null };
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    _coords = [pos.coords.longitude, pos.coords.latitude];
    _status = 'granted';
    _source = 'gps';
    _city = await cityFromCoords(_coords);
    notify();
    return { status: _status, coords: _coords };
  } catch {
    _status = 'denied';
    notify();
    return { status: _status, coords: null };
  }
}

/**
 * Tier 2 — approximate the user's city from their IP, with NO permission prompt.
 * City-level accuracy (a VPN can fool it). Used when GPS is declined so we still
 * personalise to the right city instead of defaulting to a launch market.
 * Never throws — returns null coords on any failure so the caller can fall back
 * to the manual city picker.
 */
export async function detectCityByIP(): Promise<{
  coords: Coords | null;
  city: string | null;
}> {
  try {
    const res = await fetch('https://ipwho.is/');
    const data = await res.json();
    if (data?.success && typeof data.latitude === 'number') {
      _coords = [data.longitude, data.latitude];
      _city = data.city || data.region || null;
      _status = 'approx';
      _source = 'ip';
      notify();
      return { coords: _coords, city: _city };
    }
  } catch {
    // fall through to null
  }
  return { coords: null, city: null };
}

/** Tier 3 — the user explicitly chose a city in the picker. */
export function setManualLocation(coords: Coords, city: string | null): void {
  _coords = coords;
  _city = city;
  _status = 'granted';
  _source = 'manual';
  notify();
}

export function useUserLocation() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    _listeners.push(fn);
    return () => {
      _listeners = _listeners.filter((l) => l !== fn);
    };
  }, []);
  return { status: _status, coords: _coords, city: _city, source: _source };
}
