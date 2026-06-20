// Seeker's Recurring Checks — persisted in Supabase (recurring_checks) via lib/api.
// The export surface is byte-compatible with the old in-memory store so the
// importing screens (payment, recurring-setup, recurring) are unchanged: reads
// stay synchronous off a local cache, mutators persist in the background. The
// cron-scheduled dispatcher that actually fires these is a later phase.

import { useEffect, useState } from 'react';
import {
  getRecurring as apiGetRecurring,
  addRecurring as apiAddRecurring,
  toggleRecurring as apiToggleRecurring,
  removeRecurring as apiRemoveRecurring,
} from '../lib/api';

export type RecurringFreq = 'daily' | 'weekly' | 'monthly';

export type RecurringCheck = {
  id: string;
  venueName: string;
  address?: string;
  freq: RecurringFreq;
  time: string; // "08:00"
  marketId: string;
  coord: [number, number];
  createdAt: string;
  active: boolean;
};

let _list: RecurringCheck[] = [];
let _listeners: (() => void)[] = [];
let _hydrated = false;

function notify() {
  _listeners.forEach((fn) => fn());
}

/** Pull the user's recurring checks from Supabase into the local cache. */
export async function hydrateRecurring(): Promise<void> {
  try {
    const rows = await apiGetRecurring();
    _list = rows.map((r) => ({
      id: r.id,
      venueName: r.venue_name,
      address: r.address ?? undefined,
      freq: (r.freq as RecurringFreq) ?? 'weekly',
      time: r.time,
      marketId: r.market_id ?? '',
      coord: [0, 0],
      createdAt: r.created_at,
      active: r.active,
    }));
    _hydrated = true;
    notify();
  } catch {
    // Signed out / offline / empty — leave the cache as-is.
  }
}

export function getRecurring(): RecurringCheck[] {
  return _list;
}

export function addRecurring(item: Omit<RecurringCheck, 'createdAt' | 'active'>): void {
  // Optimistic local insert; the real row id replaces it on next hydrate.
  _list = [
    {
      ...item,
      createdAt: new Date().toISOString(),
      active: true,
    },
    ..._list,
  ];
  notify();
  void apiAddRecurring({
    venueName: item.venueName,
    address: item.address,
    freq: item.freq,
    time: item.time,
    marketId: item.marketId,
  })
    .then(() => hydrateRecurring())
    .catch(() => {});
}

export function toggleRecurring(id: string): void {
  let nextActive = true;
  _list = _list.map((r) => {
    if (r.id !== id) return r;
    nextActive = !r.active;
    return { ...r, active: nextActive };
  });
  notify();
  void apiToggleRecurring(id, nextActive).catch(() => {});
}

export function removeRecurring(id: string): void {
  _list = _list.filter((r) => r.id !== id);
  notify();
  void apiRemoveRecurring(id).catch(() => {});
}

export function useRecurring() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    _listeners.push(fn);
    if (!_hydrated) void hydrateRecurring();
    return () => {
      _listeners = _listeners.filter((l) => l !== fn);
    };
  }, []);
  return {
    list: _list,
    add: addRecurring,
    toggle: toggleRecurring,
    remove: removeRecurring,
    count: _list.length,
  };
}
