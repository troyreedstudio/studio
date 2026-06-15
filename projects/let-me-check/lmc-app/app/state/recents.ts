// Recent checks — most-recent-first. In-memory for the prototype; in production
// this is the user's check history from the backend. Drives the "RECENT" list on
// the Seeker home (shows the last 2). A check is recorded when it's confirmed.

import { useEffect, useState } from 'react';

export type RecentCheck = { name: string; city: string; ts: number };

let _recents: RecentCheck[] = [];
let _listeners: (() => void)[] = [];

function notify() {
  _listeners.forEach((fn) => fn());
}

/** Record a completed check. Newest first, de-duped by name, capped at 10. */
export function addRecent(entry: { name: string; city: string }): void {
  if (!entry.name) return;
  _recents = [
    { name: entry.name, city: entry.city, ts: Date.now() },
    ..._recents.filter((r) => r.name !== entry.name),
  ].slice(0, 10);
  notify();
}

export function getRecents(): RecentCheck[] {
  return _recents;
}

export function useRecents(): RecentCheck[] {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    _listeners.push(fn);
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
