// supabase/functions/fraud-eval/index.test.ts
//
// RED Wave-0 scaffold; Plan 02 turns this green.
//
// Pins the FRAUD-01/FRAUD-02 contracts for handleFraudEval (Plan 02 creates index.ts).
// These tests FAIL until supabase/functions/fraud-eval/index.ts exists.
//
// Contracts pinned:
//   FRAUD-01: a fraud_signals row whose server-computed velocity exceeds the
//             teleport threshold -> is_teleport=true
//   FRAUD-02: with strictness='flag' and an anomaly present ->
//             fraud_flag=true, fraud_score>0, and a 'check.fraud_flagged' event
//             logged via svc.rpc('log_event', ...)
//             with strictness='off' -> fraud_flag=false even on anomaly
//
// Run: deno test --allow-env supabase/functions/fraud-eval/index.test.ts

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleFraudEval } from "./index.ts";

// ─── Mock service client ──────────────────────────────────────────────────────
// Records from().update calls and rpc() calls.
// fraud-eval reads fraud_signals from the clip row and reads market_config for
// strictness (injected via deps.strictness, so the mock only needs to support
// clips.update and rpc('log_event', ...) calls).

interface FraudSignalsRow {
  // Minimal shape fraud-eval reads from clips.fraud_signals (jsonb)
  accuracy_is_exact: boolean;
  location_accuracy_m: number | null;
  collection_ts: string;
  is_simulated_by_software: null;
  // Velocity fields set by server after comparing consecutive scout_locations
  // (server-computed so client cannot spoof them):
  velocity_mps?: number;  // meters per second between last two locations
}

interface MockSvcOpts {
  fraudSignals?: FraudSignalsRow;
}

function mockSvc(opts: MockSvcOpts = {}) {
  const calls = {
    updates: [] as Array<{ table: string; values: Record<string, unknown>; filter: string }>,
    rpcs: [] as Array<{ fn: string; args: unknown }>,
  };

  const defaultSignals: FraudSignalsRow = {
    accuracy_is_exact: false,
    location_accuracy_m: 5.0,
    collection_ts: new Date().toISOString(),
    is_simulated_by_software: null,
    velocity_mps: 0,
  };

  const svc = {
    from(table: string) {
      return {
        update(values: Record<string, unknown>) {
          return {
            eq(col: string, val: unknown) {
              calls.updates.push({ table, values, filter: `${col}=${val}` });
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
        select(_cols: string) {
          return {
            eq(_col: string, _val: unknown) {
              return {
                order(_col2: string, _opts?: unknown) {
                  return {
                    limit(_n: number) {
                      return {
                        single() {
                          if (table === "clips") {
                            return Promise.resolve({
                              data: {
                                fraud_signals: opts.fraudSignals ?? defaultSignals,
                                check_id: "check_fraud_test",
                              },
                              error: null,
                            });
                          }
                          return Promise.resolve({ data: null, error: null });
                        },
                      };
                    },
                  };
                },
                single() {
                  return Promise.resolve({ data: null, error: null });
                },
              };
            },
          };
        },
      };
    },
    rpc(fn: string, args: unknown) {
      calls.rpcs.push({ fn, args });
      return Promise.resolve({ data: null, error: null });
    },
  };

  return { svc: svc as unknown, calls };
}

// Teleport threshold: a velocity far exceeding what a human can move
// (e.g. > 50 m/s = 180 km/h — physically impossible on foot)
const TELEPORT_VELOCITY_MPS = 100; // 360 km/h — clearly impossible

// ─── FRAUD-01 ─────────────────────────────────────────────────────────────────

Deno.test("FRAUD-01: velocity exceeds teleport threshold -> is_teleport=true", async () => {
  const { svc } = mockSvc({
    fraudSignals: {
      accuracy_is_exact: false,
      location_accuracy_m: 3.0,
      collection_ts: new Date().toISOString(),
      is_simulated_by_software: null,
      velocity_mps: TELEPORT_VELOCITY_MPS,
    },
  });

  const result = await handleFraudEval("check_fraud01", {
    svc,
    strictness: "flag",
  });

  assertEquals(result.is_teleport, true, "is_teleport=true when velocity exceeds teleport threshold");
});

// ─── FRAUD-02a: strictness='flag' + anomaly -> fraud_flag=true, score>0, log event ──

Deno.test("FRAUD-02a: strictness='flag', anomaly present -> fraud_flag=true, fraud_score>0, check.fraud_flagged logged", async () => {
  const { svc, calls } = mockSvc({
    fraudSignals: {
      accuracy_is_exact: true, // exact = suspicious (possible mock GPS)
      location_accuracy_m: 0.0,
      collection_ts: new Date().toISOString(),
      is_simulated_by_software: null,
      velocity_mps: TELEPORT_VELOCITY_MPS,
    },
  });

  const result = await handleFraudEval("check_fraud02a", {
    svc,
    strictness: "flag",
  });

  assertEquals(result.fraud_flag, true, "fraud_flag=true with strictness='flag' + anomaly");
  assert(result.fraud_score > 0, "fraud_score > 0 when anomaly detected");

  // clips.fraud_flag and fraud_score must be written
  const flagUpdate = calls.updates.find(
    (u) => u.table === "clips" && u.values.fraud_flag === true,
  );
  assert(flagUpdate !== undefined, "clips.fraud_flag=true written on fraud detection");

  // 'check.fraud_flagged' event must be logged via rpc('log_event', ...)
  const fraudLogRpc = calls.rpcs.find(
    (r) => r.fn === "log_event" && JSON.stringify(r.args).includes("fraud_flagged"),
  );
  assert(fraudLogRpc !== undefined, "check.fraud_flagged event logged via svc.rpc('log_event', ...) on FRAUD-02a");
});

// ─── FRAUD-02b: strictness='off' -> fraud_flag=false even on anomaly ──────────

Deno.test("FRAUD-02b: strictness='off' -> fraud_flag=false even on anomaly (detection disabled)", async () => {
  const { svc, calls } = mockSvc({
    fraudSignals: {
      accuracy_is_exact: true,
      location_accuracy_m: 0.0,
      collection_ts: new Date().toISOString(),
      is_simulated_by_software: null,
      velocity_mps: TELEPORT_VELOCITY_MPS,
    },
  });

  const result = await handleFraudEval("check_fraud02b", {
    svc,
    strictness: "off",
  });

  assertEquals(result.fraud_flag, false, "fraud_flag=false when strictness='off'");

  // No fraud_flag=true write on clips
  const flagTrueUpdate = calls.updates.find(
    (u) => u.table === "clips" && u.values.fraud_flag === true,
  );
  assert(flagTrueUpdate === undefined, "clips.fraud_flag must NOT be written as true when strictness='off'");
});
