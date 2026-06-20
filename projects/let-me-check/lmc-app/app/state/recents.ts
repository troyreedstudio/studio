// Recent checks — most-recent-first, persisted in Supabase (recents) via lib/api.
// Drives the "RECENT" list on the Seeker home (shows the last 2). A check is
// recorded when it's confirmed. The export surface is byte-compatible with the
// old in-memory store: reads stay synchronous off a local cache, addRecent
// persists in the background.

import { useEffect, useState } from 'react';
import { addRecent as apiAddRecent, getRecents as apiGetRecents } from '../lib/api';

export type RecentCheck = { name: string; city: string; ts: number };

let _recents: RecentCheck[] = [];
let _listeners: (() => void)[] = [];
let _hydrated = false;

function notify() {
  _listeners.forEach((fn) => fn());
}

/** Pull the user's recent checks from Supabase into the local cache. */
export async function hydrateRecents(): Promise<void> {
  try {
    const rows = await apiGetRecents();
    _recents = rows.map((r) => ({
      name: r.name,
      city: r.city ?? '',
      ts: new Date(r.created_at).getTime(),
    }));
    _hydrated = true;
    notify();
  } catch {
    // Signed out / offline / empty — leave the cache as-is.
  }
}

/** Record a completed check. Newest first, de-duped by name, capped at 10. */
export function addRecent(entry: { name: string; city: string }): void {
  if (!entry.name) return;
  _recents = [
    { name: entry.name, city: entry.city, ts: Date.now() },
    ..._recents.filter((r) => r.name !== entry.name),
  ].slice(0, 10);
  notify();
  void apiAddRecent({ name: entry.name, city: entry.city }).catch(() => {});
}

export function getRecents(): RecentCheck[] {
  return _recents;
}

export function useRecents(): RecentCheck[] {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    _listeners.push(fn);
    if (!_hydrated) void hydrateRecents();
    return () => {
      _listeners = _listeners.filter((l) => l !== fn);
    };
  }, []);
  return _recents;
}

/** Human "time ago" for a recent check. */
export function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}
