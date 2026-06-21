// lmc-app/app/lib/fraud-signals.test.ts
//
// RED Wave-0 scaffold; Plan 02 turns this green.
//
// Pins the FRAUD-03 contract for collectFraudSignals (Plan 02 creates fraud-signals.ts).
// These tests FAIL until lmc-app/app/lib/fraud-signals.ts exists.
//
// Interface pinned (Plan 02 must implement exactly this shape):
//
//   export interface FraudSignals {
//     accuracy_is_exact: boolean;     // accuracy != null && accuracy <= 1.0
//     location_accuracy_m: number | null;
//     collection_ts: string;          // ISO timestamp string
//     is_simulated_by_software: null; // not available without native module (Pitfall 6)
//   }
//   export function collectFraudSignals(accuracy: number | null | undefined): FraudSignals;
//
// Style mirrors lmc-app/app/lib/scout-location.test.ts (Vitest, describe/it/expect).

import { describe, it, expect } from 'vitest';
import { collectFraudSignals } from './fraud-signals';

describe('collectFraudSignals', () => {
  // ─── FRAUD-03a: accuracy <= 1.0 is exact ─────────────────────────────────

  it('accuracy=0.5 -> accuracy_is_exact=true, location_accuracy_m=0.5', () => {
    const signals = collectFraudSignals(0.5);
    expect(signals.accuracy_is_exact).toBe(true);
    expect(signals.location_accuracy_m).toBe(0.5);
  });

  // ─── FRAUD-03b: accuracy > 1.0 is not exact ──────────────────────────────

  it('accuracy=8.5 -> accuracy_is_exact=false, location_accuracy_m=8.5', () => {
    const signals = collectFraudSignals(8.5);
    expect(signals.accuracy_is_exact).toBe(false);
    expect(signals.location_accuracy_m).toBe(8.5);
  });

  // ─── FRAUD-03c: null accuracy ────────────────────────────────────────────

  it('accuracy=null -> accuracy_is_exact=false, location_accuracy_m=null, is_simulated_by_software=null', () => {
    const signals = collectFraudSignals(null);
    expect(signals.accuracy_is_exact).toBe(false);
    expect(signals.location_accuracy_m).toBeNull();
    expect(signals.is_simulated_by_software).toBeNull();
  });

  // ─── FRAUD-03d: undefined accuracy (same as null) ────────────────────────

  it('accuracy=undefined -> accuracy_is_exact=false, location_accuracy_m=null', () => {
    const signals = collectFraudSignals(undefined);
    expect(signals.accuracy_is_exact).toBe(false);
    expect(signals.location_accuracy_m).toBeNull();
  });

  // ─── FRAUD-03e: is_simulated_by_software is always null ──────────────────
  // iOS does not expose this without a native module (Pitfall 6 in research).
  // The field is stored as null for provenance — it is a known limitation, not a bug.

  it('is_simulated_by_software is always null (iOS limitation — no native module available)', () => {
    const signals0 = collectFraudSignals(0.5);
    const signals8 = collectFraudSignals(8.5);
    const signalsNull = collectFraudSignals(null);
    expect(signals0.is_simulated_by_software).toBeNull();
    expect(signals8.is_simulated_by_software).toBeNull();
    expect(signalsNull.is_simulated_by_software).toBeNull();
  });

  // ─── FRAUD-03f: collection_ts is a valid ISO string ──────────────────────

  it('collection_ts is a non-empty ISO timestamp string', () => {
    const signals = collectFraudSignals(5.0);
    expect(typeof signals.collection_ts).toBe('string');
    expect(signals.collection_ts.length).toBeGreaterThan(0);
    // ISO format: can be parsed back to a valid Date
    expect(isNaN(Date.parse(signals.collection_ts))).toBe(false);
  });

  // ─── FRAUD-03g: accuracy exactly at boundary (1.0 is exact) ─────────────

  it('accuracy=1.0 -> accuracy_is_exact=true (boundary: <= 1.0 is exact)', () => {
    const signals = collectFraudSignals(1.0);
    expect(signals.accuracy_is_exact).toBe(true);
    expect(signals.location_accuracy_m).toBe(1.0);
  });

  // ─── FRAUD-03h: accuracy just above boundary (1.01 is not exact) ─────────

  it('accuracy=1.01 -> accuracy_is_exact=false (boundary: > 1.0 is not exact)', () => {
    const signals = collectFraudSignals(1.01);
    expect(signals.accuracy_is_exact).toBe(false);
    expect(signals.location_accuracy_m).toBe(1.01);
  });
});
