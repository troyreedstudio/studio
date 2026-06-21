// supabase/functions/face-blur-check/index.test.ts
//
// RED Wave-0 scaffold; Plan 02 turns this green.
//
// Pins the BLUR-01/02/03 contracts for handleFaceBlurCheck (Plan 02 creates index.ts).
// These tests FAIL until supabase/functions/face-blur-check/index.ts exists.
//
// Contracts pinned:
//   BLUR-01: blurEnabled=true + vision returns faces>0 + blur_status!='blurred'
//            -> action='hold', faces_detected>0, clips.blur_status='faces_detected_unblurred'
//   BLUR-02: blurEnabled=true + vision returns faces=0
//            -> action='pass', clips.blur_status='no_faces'
//   BLUR-03: blurEnabled=false -> action='pass' regardless of faces;
//            vision is NOT consulted (or result ignored), NO check transition implied
//   INVARIANT: handleFaceBlurCheck NEVER throws. On missing playback id:
//            -> blur_status='blur_check_failed', action='pass' (fail-open, D-03)
//            (Gate-error pass-through is intentional — D-03 HOLD applies only to
//             confirmed faces, not to infra errors.)
//   D-06 analogue: handleFaceBlurCheck NEVER calls reset_check_for_redispatch or
//            transition_check — only the mux-webhook orchestrates check transitions;
//            this function only writes blur_status and returns { action, faces_detected }.
//
// Run: deno test --allow-env supabase/functions/face-blur-check/index.test.ts

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleFaceBlurCheck } from "./index.ts";

// ─── Mock service client ──────────────────────────────────────────────────────
// Records clips.update calls and all rpc() calls.
// mockSvc mirrors the signage-check/index.test.ts pattern adapted for blur.

interface MockSvcOpts {
  muxPlaybackId?: string | null;
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
                          if (table === "clips") {
                            const playbackId = opts.muxPlaybackId !== undefined
                              ? opts.muxPlaybackId
                              : "signed_pb_test";
                            return Promise.resolve({
                              data: { mux_playback_id: playbackId },
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

// ─── Vision helper ────────────────────────────────────────────────────────────
// Returns a Vision mock that produces { faces: n } — adapted from the
// visionReturning(texts) pattern in signage-check/index.test.ts.

function visionReturning(faces: number) {
  return async (_img: { content?: string; imageUri?: string }) => {
    await Promise.resolve(); // simulate async
    return { faces };
  };
}

// ─── BLUR-01 ─────────────────────────────────────────────────────────────────

Deno.test("BLUR-01: blurEnabled=true, faces>0 -> action='hold', faces_detected>0, blur_status='faces_detected_unblurred'", async () => {
  const { svc, calls } = mockSvc();
  const result = await handleFaceBlurCheck("check_blur01", {
    svc,
    vision: visionReturning(2),
    apiKeyPresent: true,
    blurEnabled: true,
  });

  assertEquals(result.action, "hold", "action must be 'hold' when faces detected and blur enabled");
  assert(result.faces_detected > 0, "faces_detected must be > 0");

  // clips.blur_status written as 'faces_detected_unblurred'
  const blurUpdate = calls.updates.find(
    (u) => u.table === "clips" && u.values.blur_status === "faces_detected_unblurred",
  );
  assert(blurUpdate !== undefined, "clips.blur_status='faces_detected_unblurred' written on BLUR-01");

  // D-06 analogue: transition_check NEVER called from this function
  const transitionRpcs = calls.rpcs.filter((r) => r.fn === "transition_check");
  assertEquals(transitionRpcs.length, 0, "transition_check NEVER called by handleFaceBlurCheck");

  // D-06 analogue: reset_check_for_redispatch NEVER called
  const resetRpcs = calls.rpcs.filter((r) => r.fn === "reset_check_for_redispatch");
  assertEquals(resetRpcs.length, 0, "reset_check_for_redispatch NEVER called by handleFaceBlurCheck");
});

// ─── BLUR-02 ─────────────────────────────────────────────────────────────────

Deno.test("BLUR-02: blurEnabled=true, faces=0 -> action='pass', blur_status='no_faces'", async () => {
  const { svc, calls } = mockSvc();
  const result = await handleFaceBlurCheck("check_blur02", {
    svc,
    vision: visionReturning(0),
    apiKeyPresent: true,
    blurEnabled: true,
  });

  assertEquals(result.action, "pass", "action must be 'pass' when no faces detected");

  // clips.blur_status written as 'no_faces'
  const blurUpdate = calls.updates.find(
    (u) => u.table === "clips" && u.values.blur_status === "no_faces",
  );
  assert(blurUpdate !== undefined, "clips.blur_status='no_faces' written on BLUR-02");

  // D-06 analogue: no transition RPCs
  const transitionRpcs = calls.rpcs.filter((r) => r.fn === "transition_check");
  assertEquals(transitionRpcs.length, 0, "transition_check NEVER called on BLUR-02 path");
});

// ─── BLUR-03 ─────────────────────────────────────────────────────────────────

Deno.test("BLUR-03: blurEnabled=false -> action='pass' regardless of faces; vision not consulted or result ignored; no transition", async () => {
  // Even if vision would return faces=5, blurEnabled=false means pass-through.
  let visionCalled = false;
  const visionSpy = async (_img: { content?: string; imageUri?: string }) => {
    visionCalled = true;
    await Promise.resolve();
    return { faces: 5 };
  };

  const { svc, calls } = mockSvc();
  const result = await handleFaceBlurCheck("check_blur03", {
    svc,
    vision: visionSpy,
    apiKeyPresent: true,
    blurEnabled: false,
  });

  assertEquals(result.action, "pass", "action must be 'pass' when blur gate is disabled (D-07)");

  // Vision should NOT be called, OR its result must be ignored (action still 'pass').
  // Either implementation is acceptable — we assert the observable outcome (action='pass').
  // If the implementation calls vision but ignores it, faces_detected may be >0 but action='pass'.

  // No hold transition on any path
  const holdUpdate = calls.updates.find(
    (u) => u.table === "clips" && u.values.blur_status === "faces_detected_unblurred",
  );
  assert(holdUpdate === undefined, "clips.blur_status must NOT be 'faces_detected_unblurred' when blurEnabled=false");

  // D-06 analogue: no transition or reset RPCs called
  const transitionRpcs = calls.rpcs.filter((r) => r.fn === "transition_check");
  assertEquals(transitionRpcs.length, 0, "transition_check NEVER called when blurEnabled=false");
  const resetRpcs = calls.rpcs.filter((r) => r.fn === "reset_check_for_redispatch");
  assertEquals(resetRpcs.length, 0, "reset_check_for_redispatch NEVER called when blurEnabled=false");

  // Suppress unused-var warning for visionCalled (implementation may or may not call it)
  void visionCalled;
});

// ─── INVARIANT: NEVER throws; fail-open on missing playback id ───────────────

Deno.test("INVARIANT: handleFaceBlurCheck NEVER throws; missing playback id -> blur_status='blur_check_failed', action='pass'", async () => {
  // mux_playback_id = null simulates a clip with no Mux asset yet
  const { svc, calls } = mockSvc({ muxPlaybackId: null });

  let result: { action: "pass" | "hold"; faces_detected: number };
  try {
    result = await handleFaceBlurCheck("check_nopb", {
      svc,
      vision: visionReturning(0), // should not be called, but wired for safety
      apiKeyPresent: true,
      blurEnabled: true,
    });
  } catch (e) {
    throw new Error(`handleFaceBlurCheck must NOT throw on missing playback id. Got: ${e}`);
  }

  assertEquals(result!.action, "pass", "action='pass' on infra error (fail-open, D-03)");

  // blur_status written as 'blur_check_failed' on error path
  const failUpdate = calls.updates.find(
    (u) => u.table === "clips" && u.values.blur_status === "blur_check_failed",
  );
  assert(failUpdate !== undefined, "clips.blur_status='blur_check_failed' written on missing playback id");

  // No hold or transition on error path
  const holdUpdate = calls.updates.find(
    (u) => u.table === "clips" && u.values.blur_status === "faces_detected_unblurred",
  );
  assert(holdUpdate === undefined, "clips.blur_status must NOT be 'faces_detected_unblurred' on error path");
});

// ─── D-06 analogue: NEVER calls transition_check or reset on ANY path ────────

Deno.test("D-06 analogue: handleFaceBlurCheck NEVER calls transition_check or reset_check_for_redispatch on ANY path", async () => {
  const allRpcs: Array<{ fn: string; args: unknown }> = [];

  async function runPath(
    blurEnabled: boolean,
    faces: number,
    playbackId: string | null,
    label: string,
  ) {
    const { svc, calls } = mockSvc({ muxPlaybackId: playbackId });
    try {
      await handleFaceBlurCheck("check_" + label, {
        svc,
        vision: visionReturning(faces),
        apiKeyPresent: true,
        blurEnabled,
      });
    } catch {
      // NEVER throws — but don't fail the invariant test here if it does
    }
    allRpcs.push(...calls.rpcs);
  }

  // Path 1: BLUR-01 (faces, hold)
  await runPath(true, 3, "pb_test", "blur01");
  // Path 2: BLUR-02 (no faces, pass)
  await runPath(true, 0, "pb_test", "blur02");
  // Path 3: BLUR-03 (disabled, pass)
  await runPath(false, 5, "pb_test", "blur03");
  // Path 4: error (missing playback id)
  await runPath(true, 0, null, "nopb");

  const transitionCalls = allRpcs.filter((r) => r.fn === "transition_check");
  assertEquals(
    transitionCalls.length,
    0,
    `INVARIANT VIOLATED: transition_check was called ${transitionCalls.length} time(s) across blur paths`,
  );

  const resetCalls = allRpcs.filter((r) => r.fn === "reset_check_for_redispatch");
  assertEquals(
    resetCalls.length,
    0,
    `INVARIANT VIOLATED: reset_check_for_redispatch was called ${resetCalls.length} time(s) across blur paths`,
  );
});
