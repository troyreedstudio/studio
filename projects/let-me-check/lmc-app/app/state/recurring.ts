// In-memory store for the Seeker's Recurring Checks.
// Production: would persist via AsyncStorage + Supabase + cron-scheduled dispatcher.

import { useEffect, useState } from 'react';

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

function notify() {
  _listeners.forEach((fn) => fn());
}

export function getRecurring(): RecurringCheck[] {
  return _list;
}

export function addRecurring(item: Omit<RecurringCheck, 'createdAt' | 'active'>): void {
  _list = [
    {
      ...item,
      createdAt: new Date().toISOString(),
      active: true,
    },
    ..._list,
  ];
  notify();
}

export function toggleRecurring(id: string): void {
  _list = _list.map((r) => (r.id === id ? { ...r, active: !r.active } : r));
  notify();
}

export function removeRecurring(id: string): void {
  _list = _list.filter((r) => r.id !== id);
  notify();
}

export function useRecurring() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    _listeners.push(fn);
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
