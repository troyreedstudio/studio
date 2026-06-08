// In-memory store for the Scout's session earnings.
// Increments when a clip is accepted by the verification pipeline.
// Read by the Scout dashboard so the "Today's Earnings" stays accurate
// across the full job loop.
//
// Prototype only — in production this is replaced by a backend fetch
// keyed to the Stripe Connect account + today's payout aggregate.

import { useEffect, useState } from 'react';

let _earningsToday = 127.0;
let _clipsDelivered = 12;
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
  _earningsToday = 127.0;
  _clipsDelivered = 12;
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
