// lmc-app/app/lib/fraud-signals.ts
//
// LMC Phase 6 (FRAUD-03) — client-side fraud signal collection at film time.
//
// Purpose: capture the GPS accuracy anomaly signal from expo-location at the
// moment the Scout presses Record. This bag is stored in clips.fraud_signals
// (jsonb) and read by fraud-eval (Edge Function) to compute the server-side
// fraud verdict. The client supplies the raw provenance; the server decides.
//
// Pitfall 6 (iOS limitation — documented): expo-location v19 does NOT expose
// CLLocation.sourceInformation.isSimulatedBySoftware. There is no JavaScript API
// to determine whether the GPS reading is from a real sensor or a mock location
// provider on a non-jailbroken iOS device. The field is stored as null for
// provenance — it is a known limitation, NOT a bug. A future custom native module
// (TurboModule, New-Arch compatible) could surface this via the private
// CLLocationSourceInformation API if/when App Store policy permits its use.
//
// New Architecture safe: this is a pure TypeScript function with no native calls.

/** Signal bag collected at film time and stored in clips.fraud_signals. */
export interface FraudSignals {
  /**
   * True when accuracy != null && accuracy <= 1.0 metres.
   * Real GPS hardware seldom reports < 1m — exact values are a mock GPS indicator.
   */
  accuracy_is_exact: boolean;

  /**
   * Raw GPS accuracy in metres from expo-location pos.coords.accuracy.
   * Null when accuracy is not available (location permission denied, no fix, etc.).
   */
  location_accuracy_m: number | null;

  /** ISO 8601 timestamp of signal collection (device clock at Record press). */
  collection_ts: string;

  /**
   * Whether the location was produced by a software simulator.
   * ALWAYS null on iOS without a custom native module (Pitfall 6).
   * Reserved for future native module integration — do not remove this field;
   * its presence in the schema ensures fraud-eval can score it when available.
   */
  is_simulated_by_software: null;
}

/**
 * Collect a fraud signal bag from the GPS accuracy reading at film time.
 *
 * Call this in filming.tsx immediately before starting the 15-second recording,
 * passing pos.coords.accuracy from expo-location's watchPositionAsync callback.
 *
 * @param accuracy - GPS accuracy in metres (pos.coords.accuracy), or null/undefined
 *                   if the reading is not available.
 * @returns FraudSignals bag ready to be stored in clips.fraud_signals.
 *
 * @example
 *   const signals = collectFraudSignals(pos.coords.accuracy);
 *   // Store in clips row when submitting:
 *   await supabase.from('clips').update({ fraud_signals: signals }).eq('check_id', checkId);
 */
export function collectFraudSignals(
  accuracy: number | null | undefined,
): FraudSignals {
  // Normalise null/undefined to null so the jsonb schema is consistent.
  const accuracyM: number | null = accuracy != null ? accuracy : null;

  // accuracy_is_exact: real GPS accuracy is typically 3–15m outdoors;
  // values <= 1.0m are a strong indicator of a mock GPS provider.
  // Boundary: <= 1.0 is exact (not >, not <). accuracy=1.0 IS exact.
  const accuracyIsExact: boolean =
    accuracyM != null && accuracyM <= 1.0;

  return {
    accuracy_is_exact: accuracyIsExact,
    location_accuracy_m: accuracyM,
    collection_ts: new Date().toISOString(),
    // is_simulated_by_software is ALWAYS null (iOS limitation — Pitfall 6).
    // See module header for full explanation.
    is_simulated_by_software: null,
  };
}
