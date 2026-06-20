// In-memory store for the Scout's session earnings.
// Increments when a clip is accepted by the verification pipeline; read by the
// Scout dashboard so "Today's Earnings" stays accurate across the job loop.
//
// Phase 1 starts at zero — the real payout aggregate (keyed to the Stripe Connect
// account + today's deliveries) is computed server-side in Phase 4. This store is
// a session-local placeholder until then, so it intentionally does NOT seed fake
// totals.

import { useEffect, useState } from 'react';

let _earningsToday = 0;
let _clipsDelivered = 0;
let _listeners: (() => void)[] = [];

function notify() {
  _listeners.forEach((fn) => fn());
}

export function getScoutEarnings() {
  return { earningsToday: _earningsToday, clipsDelivered: _clipsDelivered };
}

export function addClipEarning(amount: number): void {
  _earningsToday = Number((_earningsToday + amount).toFixed(2));
  _clipsDelivered += 1;
  notify();
}

export function resetScoutEarnings(): void {
  _earningsToday = 0;
  _clipsDelivered = 0;
  notify();
}

export function useScoutEarnings() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    _listeners.push(fn);
    return () => {
      _listeners = _listeners.filter((l) => l !== fn);
    };
  }, []);
  return {
    earningsToday: _earningsToday,
    clipsDelivered: _clipsDelivered,
    addClipEarning,
    resetScoutEarnings,
  };
}
