// supabase/functions/verify-clip/index.test.ts
// RED until verify-clip/index.ts lands. Run: deno test --allow-env supabase/functions/verify-clip/index.test.ts
//
// Pins the GPS fence check contract (VER-01, D-04/D-05):
//   - A clip filmed within the film-fence (<= 30 m) passes and the check proceeds to delivered.
//   - A clip filmed beyond 30 m hard max is auto-rejected: NOT delivered, re-dispatched, Seeker not charged.
//   - Missing/NaN GPS is logged as unverifiable, never silently treated as on-site verified.
//   - verify-clip does NOT itself call reset_check_for_redispatch — the mux-webhook orchestrates that.
//     The mock records calls so we can confirm the pass path never touches it.
import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
// RED: handleVerifyClip is implemented in Task 2 (index.ts). This import is the Wave-0 seam.
import { handleVerifyClip } from "./index.ts";

// ─── Mock factory ─────────────────────────────────────────────────────────────
// Builds a fluent Supabase service-client mock that records all DB interactions.
// The chain depth matches what handleVerifyClip issues:
//   clips:        from('clips').select(...).eq(...).order(...).limit(1).single()
//   checks:       from('checks').select('coord').eq(...).single()
//   market_config: from('market_config').select('film_fence_max_m').limit(1).single()
//   rpcs:         rpc('distance_m', ...) | rpc('reset_check_for_redispatch', ...) | rpc('log_event', ...)
//   updates:      from('clips').update(values).eq(...)

interface MockOpts {
  filmedLat?: number | null;
  filmedLng?: number | null;
  filmedAccuracyM?: number | null;
  distanceResult?: number | null;
  fenceMax?: number;
}

function mockSvc(opts: MockOpts = {}) {
  const calls = {
    updates: [] as Array<{ table: string; values: Record<string, unknown> }>,
    rpcs: [] as Array<{ fn: string; args: unknown }>,
  };

  // Build table-specific query chains.
  const fromTable = (table: string) => {
    if (table === "clips") {
      return {
        // select chain: .select().eq().order().limit().single() -> clip row
        select(_cols: string) {
          return {
            eq(_col: string, _val: unknown) {
              return {
                order(_col: string, _opts: unknown) {
                  return {
                    limit(_n: number) {
                      return {
                        single() {
                          return Promise.resolve({
                            data: {
                              filmed_lat: opts.filmedLat ?? 25.7617,
                              filmed_lng: opts.filmedLng ?? -80.1918,
                              filmed_accuracy_m: opts.filmedAccuracyM ?? 5,
                            },
                            error: null,
                          });
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
        // update chain: .update(values).eq(...)
        update(values: Record<string, unknown>) {
          calls.updates.push({ table, values });
          return {
            eq(_col: string, _val: unknown) {
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };
    }

    if (table === "checks") {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, _val: unknown) {
              return {
                single() {
                  return Promise.resolve({
                    data: {
                      coord: "SRID=4326;POINT(-80.1918 25.7617)", // WKT placeholder
                    },
                    error: null,
                  });
                },
              };
            },
          };
        },
      };
    }

    if (table === "market_config") {
      return {
        select(_cols: string) {
          return {
            limit(_n: number) {
              return {
                single() {
                  return Promise.resolve({
                    data: { film_fence_max_m: opts.fenceMax ?? 30 },
                    error: null,
                  });
                },
              };
            },
          };
        },
      };
    }

    // Fallback for any unexpected table access.
    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
  };

  const svc = {
    from(table: string) {
      return fromTable(table);
    },
    rpc(fn: string, args: unknown) {
      calls.rpcs.push({ fn, args });
      if (fn === "distance_m") {
        return Promise.resolve({ data: opts.distanceResult ?? 25, error: null });
      }
      // reset_check_for_redispatch + log_event return ok.
      return Promise.resolve({ data: "ok", error: null });
    },
  };

  return { svc, calls };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

Deno.test("pass: clip 25 m from venue returns { passed: true } and sets gps_verified=true", async () => {
  const { svc, calls } = mockSvc({ distanceResult: 25, fenceMax: 30 });
  const result = await handleVerifyClip("check_pass", { svc });

  assertEquals(result.passed, true, "within fence -> passed:true");
  assertEquals(result.distance_m, 25, "distance_m echoed");

  // gps_verified must have been set to true on the clips row.
  const update = calls.updates.find((u) => u.table === "clips");
  assertExists(update, "clips update was issued");
  assertEquals(update!.values.gps_verified, true, "gps_verified=true on pass");

  // verify-clip must NOT call reset_check_for_redispatch on the pass path.
  const resetCall = calls.rpcs.find((r) => r.fn === "reset_check_for_redispatch");
  assert(resetCall === undefined, "reset_check_for_redispatch NOT called on pass path");
});

Deno.test("reject: clip 45 m from venue returns { passed: false } and sets gps_verified=false", async () => {
  const { svc, calls } = mockSvc({ distanceResult: 45, fenceMax: 30 });
  const result = await handleVerifyClip("check_reject", { svc });

  assertEquals(result.passed, false, "beyond fence -> passed:false");
  assertEquals(result.distance_m, 45, "distance_m echoed");

  // gps_verified must have been set to false on the clips row.
  const update = calls.updates.find((u) => u.table === "clips");
  assertExists(update, "clips update was issued");
  assertEquals(update!.values.gps_verified, false, "gps_verified=false on reject");
});

Deno.test("missing GPS: filmed_lat=null -> { passed: true, distance_m: null }, gps_verified NOT set to true, log_event records gps_unverifiable", async () => {
  const { svc, calls } = mockSvc({
    filmedLat: null,
    filmedLng: null,
    distanceResult: null,
  });
  const result = await handleVerifyClip("check_no_gps", { svc });

  // Policy: can't reject what we can't verify. Pass through with a warning.
  assertEquals(result.passed, true, "unverifiable -> passed:true (honest-Scout-friendly)");
  assertEquals(result.distance_m, null, "distance_m is null when no GPS");

  // CRITICAL: gps_verified must NOT be set to true on the missing-GPS path.
  const trueUpdate = calls.updates.find(
    (u) => u.table === "clips" && u.values.gps_verified === true,
  );
  assert(trueUpdate === undefined, "gps_verified must NOT be set to true for missing GPS");

  // A log_event call with a gps_unverifiable/no-gps context MUST be recorded.
  const logCall = calls.rpcs.find((r) => r.fn === "log_event");
  assertExists(logCall, "log_event called for missing GPS");
  // The event type or context must signal gps_unverifiable / no_gps_data.
  const args = logCall!.args as Record<string, unknown>;
  const eventType = (args.p_event_type ?? "") as string;
  const context = (args.p_context ?? {}) as Record<string, unknown>;
  assert(
    eventType.includes("gps_unverifiable") ||
      eventType.includes("unverifiable") ||
      (context.reason === "no_gps_data"),
    `log_event must signal unverifiable GPS; got event_type="${eventType}" context=${JSON.stringify(context)}`,
  );
});

Deno.test("boundary: exactly 30 m -> passed:true (<= max)", async () => {
  const { svc } = mockSvc({ distanceResult: 30, fenceMax: 30 });
  const result = await handleVerifyClip("check_boundary_pass", { svc });
  assertEquals(result.passed, true, "30 m == fence max -> passed (inclusive)");
});

Deno.test("boundary: 30.01 m -> passed:false (> max)", async () => {
  const { svc } = mockSvc({ distanceResult: 30.01, fenceMax: 30 });
  const result = await handleVerifyClip("check_boundary_reject", { svc });
  assertEquals(result.passed, false, "30.01 m > fence max -> rejected");
});
