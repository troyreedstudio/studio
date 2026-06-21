// supabase/functions/signage-check/index.test.ts
//
// D-06 advisory-only invariant: signage NEVER gates delivery.
// RED until signage-check/index.ts lands (Task 2).
//
// These tests pin the complete advisory contract:
//   - confirmed=true  when Vision finds text matching the venue name
//   - confirmed=false when Vision returns text but no name match
//   - confirmed=null  when the API key is absent (graceful degrade, no throw)
//   - transition_check and reset_check_for_redispatch are NEVER called on any path (D-06)
//
// Vision is injected via deps.vision (offline-testable, no real fetch).
// Run: deno test --allow-env supabase/functions/signage-check/index.test.ts
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleSignageCheck } from "./index.ts";

// ─── Mock service client ──────────────────────────────────────────────────────
// Records clips.update and all rpc() calls so D-06 invariant can be asserted.
// Provides a realistic call chain matching the handler's DB reads.
interface MockSvcOpts {
  venueName?: string;
  muxPlaybackId?: string;
}

function mockSvc(opts: MockSvcOpts = {}) {
  const calls = {
    updates: [] as Array<{ table: string; values: Record<string, unknown>; filter: string }>,
    rpcs: [] as Array<{ fn: string; args: unknown }>,
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
                          // Latest clip for the check
                          if (table === "clips") {
                            return Promise.resolve({
                              data: { mux_playback_id: opts.muxPlaybackId ?? "signed_pb_test" },
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
                  // Check row with venue_id -> venue name lookup
                  if (table === "checks") {
                    return Promise.resolve({
                      data: { venue_id: "venue_123", location_label: "Broken Shaker" },
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: null, error: null });
                },
              };
            },
          };
        },
      };
    },
    // venues join: select by id
    // (signage handler joins checks -> venues; we flatten it in the mock via a second from())
    rpc(fn: string, args: unknown) {
      calls.rpcs.push({ fn, args });
      return Promise.resolve({ data: null, error: null });
    },
  };

  // Overwrite 'from' with venue awareness
  const fromOrig = svc.from.bind(svc);
  const fromExtended = (table: string) => {
    if (table === "venues") {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, _val: unknown) {
              return {
                single() {
                  return Promise.resolve({
                    data: { name: opts.venueName ?? "Broken Shaker" },
                    error: null,
                  });
                },
              };
            },
          };
        },
        // satisfy any unused call shape
        update: fromOrig(table).update,
      };
    }
    return fromOrig(table);
  };

  // Replace from with extended version
  (svc as unknown as Record<string, unknown>).from = fromExtended;

  return { svc: svc as unknown, calls };
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

function visionReturning(texts: string[]) {
  return async (_img: { content?: string; imageUri?: string }) => {
    await Promise.resolve(); // simulate async
    return { text: texts };
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

Deno.test("confirmed=true: Vision returns text including venue name -> signage_confirmed=true", async () => {
  const { svc, calls } = mockSvc({ venueName: "Broken Shaker" });
  const result = await handleSignageCheck("check_abc", {
    svc,
    vision: visionReturning(["THE BROKEN SHAKER", "craft cocktails"]),
    apiKeyPresent: true,
  });

  assertEquals(result.confirmed, true);

  // clips.signage_confirmed must be written as true
  const signageUpdate = calls.updates.find(
    (u) => u.table === "clips" && u.values.signage_confirmed === true,
  );
  assert(signageUpdate !== undefined, "clips.signage_confirmed=true written on name match");

  // D-06 invariant: transition_check NEVER called
  const transitionRpcs = calls.rpcs.filter((r) => r.fn === "transition_check");
  assertEquals(transitionRpcs.length, 0, "D-06: transition_check NEVER called (confirmed=true path)");

  // D-06 invariant: reset_check_for_redispatch NEVER called
  const resetRpcs = calls.rpcs.filter((r) => r.fn === "reset_check_for_redispatch");
  assertEquals(resetRpcs.length, 0, "D-06: reset_check_for_redispatch NEVER called (confirmed=true path)");
});

Deno.test("confirmed=false: Vision returns non-matching text -> signage_confirmed=false, no transition, no reset", async () => {
  const { svc, calls } = mockSvc({ venueName: "Broken Shaker" });
  const result = await handleSignageCheck("check_abc", {
    svc,
    vision: visionReturning(["random", "text", "no match here"]),
    apiKeyPresent: true,
  });

  assertEquals(result.confirmed, false);

  // clips.signage_confirmed must be written as false
  const signageUpdate = calls.updates.find(
    (u) => u.table === "clips" && u.values.signage_confirmed === false,
  );
  assert(signageUpdate !== undefined, "clips.signage_confirmed=false written on no match");

  // D-06 invariant: transition_check NEVER called
  const transitionRpcs = calls.rpcs.filter((r) => r.fn === "transition_check");
  assertEquals(transitionRpcs.length, 0, "D-06: transition_check NEVER called (confirmed=false path)");

  // D-06 invariant: reset_check_for_redispatch NEVER called
  const resetRpcs = calls.rpcs.filter((r) => r.fn === "reset_check_for_redispatch");
  assertEquals(resetRpcs.length, 0, "D-06: reset_check_for_redispatch NEVER called (confirmed=false path)");
});

Deno.test("confirmed=null: missing API key -> signage_confirmed=null, no throw, delivery unaffected", async () => {
  const { svc, calls } = mockSvc({ venueName: "Broken Shaker" });

  // Must not throw even with apiKeyPresent:false
  let result: { confirmed: boolean | null };
  try {
    result = await handleSignageCheck("check_abc", {
      svc,
      vision: visionReturning([]), // vision should never be called when key is absent
      apiKeyPresent: false,
    });
  } catch (e) {
    throw new Error(`handleSignageCheck must NOT throw when API key is absent. Got: ${e}`);
  }

  assertEquals(result!.confirmed, null, "confirmed=null when API key is absent");

  // clips.signage_confirmed must be written as null (or no false-positive true written)
  const falsePositiveTrue = calls.updates.find(
    (u) => u.table === "clips" && u.values.signage_confirmed === true,
  );
  assert(falsePositiveTrue === undefined, "signage_confirmed must NOT be true on missing key path");

  // D-06 invariant: transition_check NEVER called
  const transitionRpcs = calls.rpcs.filter((r) => r.fn === "transition_check");
  assertEquals(transitionRpcs.length, 0, "D-06: transition_check NEVER called (missing key path)");

  // D-06 invariant: reset_check_for_redispatch NEVER called
  const resetRpcs = calls.rpcs.filter((r) => r.fn === "reset_check_for_redispatch");
  assertEquals(resetRpcs.length, 0, "D-06: reset_check_for_redispatch NEVER called (missing key path)");
});

Deno.test("advisory-only invariant (D-06): transition_check + reset_check_for_redispatch are NEVER called on ANY path", async () => {
  // Run all three paths and collect ALL rpc calls across every scenario.
  // This is the canonical D-06 assertion: ANY call to either function is a regression.
  const allRpcs: Array<{ fn: string; args: unknown }> = [];

  async function runPath(
    vision: (img: { content?: string; imageUri?: string }) => Promise<{ text: string[] }>,
    apiKeyPresent: boolean,
    label: string,
  ) {
    const { svc, calls } = mockSvc();
    await handleSignageCheck("check_" + label, { svc, vision, apiKeyPresent });
    allRpcs.push(...calls.rpcs);
  }

  // Path 1: confirmed match
  await runPath(visionReturning(["Broken Shaker", "cocktails"]), true, "match");
  // Path 2: no match
  await runPath(visionReturning(["unrelated", "text"]), true, "no_match");
  // Path 3: missing key
  await runPath(visionReturning([]), false, "no_key");

  // The KEY invariant: across ALL paths, transition_check is never called.
  const transitionCalls = allRpcs.filter((r) => r.fn === "transition_check");
  assertEquals(
    transitionCalls.length,
    0,
    `D-06 VIOLATED: transition_check was called ${transitionCalls.length} time(s) across signage paths`,
  );

  // And reset_check_for_redispatch is never called.
  const resetCalls = allRpcs.filter((r) => r.fn === "reset_check_for_redispatch");
  assertEquals(
    resetCalls.length,
    0,
    `D-06 VIOLATED: reset_check_for_redispatch was called ${resetCalls.length} time(s) across signage paths`,
  );
});
