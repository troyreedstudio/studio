// supabase/functions/mux-webhook/index.test.ts
// Wave-0 FAILING scaffold (Deno) for the signature-verified, idempotent finalize
// webhook (VID-03 / CHECK-04). RED on purpose: it imports `handleMuxWebhook` from
// ./index.ts and `verifyMuxSignature` from ../_shared/mux.ts — the webhook handler
// is implemented in a later plan (03-04 wires the live finalize), so until then the
// import resolves to a not-yet-complete module and these tests fail.
//
// The contract these scaffolds pin (the symbols downstream turns green):
//   - verifyMuxSignature  : a bad/missing Mux signature is rejected (401), NO DB write
//   - a valid video.asset.ready finalizes the clip (signed playback id, status=ready)
//     and drives the check uploaded -> processing -> delivered as the service role
//   - a DUPLICATE video.asset.ready (clip already ready) is a no-op ('ok (dup)')
// Run: deno test --allow-env supabase/functions/mux-webhook/index.test.ts
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
// RED: the live handler is implemented downstream; this import is the Wave-0 seam.
import { handleMuxWebhook } from "./index.ts";
// The real signature verifier the live entrypoint injects (named so the Wave-0
// grep gate can confirm the signature path is part of the contract).
import { verifyMuxSignature } from "../_shared/mux.ts";

// A tiny mock of the supabase-js fluent service client recording every call.
// Phase 5 (05-03): added `verifyClipPassed` option so the GPS gate is configurable.
//   - default: undefined (passed:true via null data fallback -> gate is a no-op for existing tests)
//   - true: verify-clip returns { data: { passed: true } } -> falls through to deliver
//   - false: verify-clip returns { data: { passed: false } } -> gps_rejected, no deliver
// Phase 6 (06-03): added `blurAction` option so the blur gate is configurable.
//   - default: undefined -> face-blur-check returns { data: null } (gate pass-through, BLUR-05 fail-open)
//   - 'pass' -> face-blur-check returns { data: { action: 'pass' } } -> fall through to deliver
//   - 'hold' -> face-blur-check returns { data: { action: 'hold' } } -> blur_held (BLUR-04)
// Phase 6 (06-03): added `blurCheckThrows` option to test error fail-open (BLUR-05).
//   - true -> face-blur-check invoke rejects -> treated as unverifiable (fail-open, deliver proceeds)
function mockSvc(opts: { clipStatus?: string | null; verifyClipPassed?: boolean; blurAction?: 'pass' | 'hold'; blurCheckThrows?: boolean } = {}) {
  const calls = {
    updates: [] as Array<Record<string, unknown>>,
    rpcs: [] as Array<{ fn: string; args: unknown }>,
    invokes: [] as Array<{ fn: string; opts: unknown }>,
  };
  const svc = {
    from(_table: string) {
      return {
        update(values: Record<string, unknown>) {
          calls.updates.push(values);
          return {
            eq() {
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
        select(_cols: string) {
          return {
            eq() {
              return {
                maybeSingle() {
                  return Promise.resolve({
                    data: opts.clipStatus === undefined
                      ? { status: "pending" }
                      : opts.clipStatus === null
                      ? null
                      : { status: opts.clipStatus },
                    error: null,
                  });
                },
              };
            },
          };
        },
      };
    },
    rpc(fn: string, args: unknown) {
      calls.rpcs.push({ fn, args });
      return Promise.resolve({ data: "ok", error: null });
    },
    functions: {
      invoke(fn: string, invokeOpts: unknown) {
        calls.invokes.push({ fn, opts: invokeOpts });
        // Phase 5 GPS gate: if fn is 'verify-clip', return the configured passed value.
        // When verifyClipPassed is undefined (existing tests), return null data so
        // verify?.data?.passed === false is falsy -> gate passes through unchanged.
        if (fn === "verify-clip") {
          const passed = opts.verifyClipPassed;
          // undefined -> { data: null } (gate is a no-op; existing tests unaffected)
          // true      -> { data: { passed: true } }
          // false     -> { data: { passed: false } } (triggers re-dispatch path)
          const data = passed === undefined ? null : { passed };
          return Promise.resolve({ data, error: null });
        }
        // Phase 6 blur gate: if fn is 'face-blur-check', return the configured action.
        // When blurAction is undefined (existing tests + verifyClipPassed tests), return
        // null data so blur?.data?.action === 'hold' is falsy -> gate passes through.
        // blurCheckThrows simulates an invoke error for the BLUR-05 fail-open test.
        if (fn === "face-blur-check") {
          if (opts.blurCheckThrows) {
            return Promise.reject(new Error("face-blur-check network error"));
          }
          const action = opts.blurAction;
          // undefined -> { data: null } (gate is a no-op; existing tests unaffected)
          // 'pass'    -> { data: { action: 'pass' } }
          // 'hold'    -> { data: { action: 'hold' } } (triggers blur_review path, BLUR-04)
          const data = action === undefined ? null : { action };
          return Promise.resolve({ data, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
    },
  };
  return { svc, calls };
}

// upload_id is included so the webhook targets the specific clip row via
// mux_upload_id (re-dispatch safety — avoids the fallback .order().limit() path
// which would require a more complex mock chain). Mux includes upload_id in all
// real video.asset.ready events when the asset came from a direct upload.
const READY_EVENT = JSON.stringify({
  type: "video.asset.ready",
  data: {
    id: "asset_123",
    upload_id: "upload_999",
    passthrough: "check_abc",
    duration: 15.0,
    playback_ids: [
      { id: "pub_should_not_be_used", policy: "public" },
      { id: "signed_pb_456", policy: "signed" },
    ],
  },
});

function req(body: string, sigHeader?: string): Request {
  const headers = new Headers();
  if (sigHeader !== undefined) headers.set("mux-signature", sigHeader);
  return new Request("https://fn.local/mux-webhook", {
    method: "POST",
    body,
    headers,
  });
}

// In the live function the injected verifier IS verifyMuxSignature; here we stub the
// pass/fail outcomes so the handler logic is exercised offline without a real secret.
const goodVerify = () => Promise.resolve();
const badVerify = () => {
  throw new Error("Mux signature verification failed");
};

Deno.test("verifyMuxSignature path: bad signature -> 401 and NO db write", async () => {
  // Reference the real verifier symbol so the Wave-0 contract names it.
  assert(typeof verifyMuxSignature === "function", "verifyMuxSignature exported");
  const { svc, calls } = mockSvc();
  const res = await handleMuxWebhook(req(READY_EVENT, "forged"), {
    verify: badVerify,
    svc,
  });
  assertEquals(res.status, 401);
  assertEquals(calls.updates.length, 0);
  assertEquals(calls.rpcs.length, 0);
});

Deno.test("valid video.asset.ready -> finalize clip (signed pb) + drive to delivered", async () => {
  const { svc, calls } = mockSvc({ clipStatus: "pending" });
  const res = await handleMuxWebhook(req(READY_EVENT, "valid"), {
    verify: goodVerify,
    svc,
  });
  assertEquals(res.status, 200);
  // clip finalized with the SIGNED playback id + status ready
  const finalize = calls.updates.find((u) => u.status === "ready");
  assert(finalize, "expected a clip update to status=ready");
  assertEquals(finalize!.mux_playback_id, "signed_pb_456");
  assertEquals(finalize!.mux_asset_id, "asset_123");
  assertEquals(finalize!.mux_playback_policy, "signed");
  // drove uploaded -> processing -> delivered, in order
  const tos = calls.rpcs
    .filter((r) => r.fn === "transition_check")
    // deno-lint-ignore no-explicit-any
    .map((r) => (r.args as any).p_to);
  assertEquals(tos, ["uploaded", "processing", "delivered"]);
});

Deno.test("duplicate video.asset.ready (already ready) -> ok (dup), no second drive", async () => {
  const { svc, calls } = mockSvc({ clipStatus: "ready" });
  const res = await handleMuxWebhook(req(READY_EVENT, "valid"), {
    verify: goodVerify,
    svc,
  });
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "ok (dup)");
  assertEquals(calls.updates.length, 0); // no finalize
  assertEquals(calls.rpcs.length, 0); // no transitions
});

// Plan 04-05: capture trigger added after delivered transition.
Deno.test("valid delivery triggers stripe-capture AFTER delivered transition (D-03)", async () => {
  const { svc, calls } = mockSvc({ clipStatus: "pending" });
  const res = await handleMuxWebhook(req(READY_EVENT, "valid"), {
    verify: goodVerify,
    svc,
  });
  assertEquals(res.status, 200);
  // stripe-capture must have been invoked (invokes may also include verify-clip + signage-check)
  const captureInvoke = calls.invokes.find((i) => i.fn === "stripe-capture");
  assert(captureInvoke !== undefined, "stripe-capture invoked");
  // deno-lint-ignore no-explicit-any
  assertEquals((captureInvoke!.opts as any).body.checkId, "check_abc");
  // stripe-capture must fire AFTER the delivered transition: delivered is the last rpc
  const deliveredIdx = calls.rpcs.findLastIndex(
    // deno-lint-ignore no-explicit-any
    (r) => r.fn === "transition_check" && (r.args as any).p_to === "delivered",
  );
  assert(deliveredIdx >= 0, "delivered transition must be present");
  // All invokes happen after all transition_check rpcs (invokes list is append-only)
  assert(calls.invokes.length > 0, "stripe-capture was invoked after delivered");
});

// ─── Phase 5 GPS gate tests (05-03) ──────────────────────────────────────────

Deno.test("GPS pass -> still delivers + captures (verify-clip passed:true, existing behaviour preserved)", async () => {
  const { svc, calls } = mockSvc({ clipStatus: "pending", verifyClipPassed: true });
  const res = await handleMuxWebhook(req(READY_EVENT, "valid"), {
    verify: goodVerify,
    svc,
  });
  assertEquals(res.status, 200);
  // verify-clip must have been invoked exactly once
  const verifyInvoke = calls.invokes.find((i) => i.fn === "verify-clip");
  assert(verifyInvoke !== undefined, "verify-clip was invoked");
  // deno-lint-ignore no-explicit-any
  assertEquals((verifyInvoke!.opts as any).body.checkId, "check_abc");
  // GPS passed -> transitions must still include delivered
  const tos = calls.rpcs
    .filter((r) => r.fn === "transition_check")
    // deno-lint-ignore no-explicit-any
    .map((r) => (r.args as any).p_to);
  assertEquals(tos, ["uploaded", "processing", "delivered"], "full transition order preserved on GPS pass");
  // stripe-capture must still fire after delivered
  const captureInvoke = calls.invokes.find((i) => i.fn === "stripe-capture");
  assert(captureInvoke !== undefined, "stripe-capture invoked after GPS pass");
  // reset_check_for_redispatch must NOT have been called on the pass path
  const resetRpc = calls.rpcs.find((r) => r.fn === "reset_check_for_redispatch");
  assert(resetRpc === undefined, "reset_check_for_redispatch NOT called on GPS pass");
});

Deno.test("GPS reject -> re-dispatch, NO deliver, NO capture (verify-clip passed:false)", async () => {
  const { svc, calls } = mockSvc({ clipStatus: "pending", verifyClipPassed: false });
  const res = await handleMuxWebhook(req(READY_EVENT, "valid"), {
    verify: goodVerify,
    svc,
  });
  // Response body must be 'gps_rejected' — not 'ok'
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "gps_rejected", "response body is gps_rejected on GPS fail");
  // reset_check_for_redispatch must have been called once
  const resetRpc = calls.rpcs.find((r) => r.fn === "reset_check_for_redispatch");
  assert(resetRpc !== undefined, "reset_check_for_redispatch was rpc'd on GPS reject");
  // deno-lint-ignore no-explicit-any
  assertEquals((resetRpc!.args as any).p_check_id, "check_abc", "correct checkId passed to reset rpc");
  // NO transition_check with p_to='delivered' must have occurred
  const deliveredTransition = calls.rpcs.find(
    // deno-lint-ignore no-explicit-any
    (r) => r.fn === "transition_check" && (r.args as any).p_to === "delivered",
  );
  assert(deliveredTransition === undefined, "NO delivered transition on GPS reject");
  // stripe-capture must NEVER have been invoked (Seeker not charged)
  const captureInvoke = calls.invokes.find((i) => i.fn === "stripe-capture");
  assert(captureInvoke === undefined, "stripe-capture NEVER invoked on GPS reject (Seeker not charged)");
});

// ─── Original fault-tolerant capture test (unchanged) ────────────────────────

Deno.test("capture invoke failure does NOT prevent 200 response (fault-tolerant D-03)", async () => {
  const calls = {
    updates: [] as Array<Record<string, unknown>>,
    rpcs: [] as Array<{ fn: string; args: unknown }>,
    invokes: [] as Array<string>,
  };
  // Svc with a throwing functions.invoke to simulate a capture hiccup.
  const svc = {
    from(_table: string) {
      return {
        update(values: Record<string, unknown>) {
          calls.updates.push(values);
          return { eq() { return Promise.resolve({ data: null, error: null }); } };
        },
        select(_cols: string) {
          return {
            eq() {
              return {
                maybeSingle() {
                  return Promise.resolve({ data: { status: "pending" }, error: null });
                },
              };
            },
          };
        },
      };
    },
    rpc(fn: string, args: unknown) {
      calls.rpcs.push({ fn, args });
      return Promise.resolve({ data: "ok", error: null });
    },
    functions: {
      invoke(fn: string) {
        calls.invokes.push(fn);
        // Simulate a network/capture error — must NOT bubble up
        return Promise.reject(new Error("stripe-capture network timeout"));
      },
    },
  };

  const res = await handleMuxWebhook(req(READY_EVENT, "valid"), {
    verify: goodVerify,
    svc,
  });
  // Delivered transition must still succeed despite capture error
  assertEquals(res.status, 200);
  // Phase 5: verify-clip is now invoked first (step 6b) then stripe-capture (step 8).
  // Both reject in this mock; both are caught. Assert stripe-capture was attempted.
  assert(calls.invokes.includes("stripe-capture"), "stripe-capture was invoked");
  const tos = calls.rpcs
    .filter((r) => r.fn === "transition_check")
    // deno-lint-ignore no-explicit-any
    .map((r) => (r.args as any).p_to);
  assertEquals(tos, ["uploaded", "processing", "delivered"]);
});

// ─── Phase 6 blur gate tests (06-03) ─────────────────────────────────────────

// BLUR-04: when face-blur-check returns action='hold', the check transitions to
// blur_review and is NOT delivered and stripe-capture is NOT invoked.
// The privacy invariant: no clip with detected faces is delivered when blur_enabled.
// D-03/D-07: blur gate fires BEFORE uploaded/processing/delivered (step 6c).
Deno.test("BLUR-04: blur hold -> blur_review transition; NO delivered; stripe-capture NOT invoked", async () => {
  const { svc, calls } = mockSvc({ clipStatus: "pending", blurAction: "hold" });
  const res = await handleMuxWebhook(req(READY_EVENT, "valid"), {
    verify: goodVerify,
    svc,
  });
  // Response body must be 'blur_held' — not 'ok'
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "blur_held", "response body is blur_held on face hold");
  // transition_check(blur_review) must have been called exactly once
  const blurReviewRpc = calls.rpcs.find(
    // deno-lint-ignore no-explicit-any
    (r) => r.fn === "transition_check" && (r.args as any).p_to === "blur_review",
  );
  assert(blurReviewRpc !== undefined, "transition_check(blur_review) was called");
  // deno-lint-ignore no-explicit-any
  assertEquals((blurReviewRpc!.args as any).p_check_id, "check_abc", "correct checkId to blur_review");
  // NO delivered transition must have occurred (D-03: no unblurred clip delivered)
  const deliveredTransition = calls.rpcs.find(
    // deno-lint-ignore no-explicit-any
    (r) => r.fn === "transition_check" && (r.args as any).p_to === "delivered",
  );
  assert(deliveredTransition === undefined, "NO delivered transition on blur hold");
  // stripe-capture must NEVER have been invoked (Seeker not charged for held clip)
  const captureInvoke = calls.invokes.find((i) => i.fn === "stripe-capture");
  assert(captureInvoke === undefined, "stripe-capture NEVER invoked on blur hold (Seeker not charged)");
});

// BLUR-05: when face-blur-check THROWS (network error, cold-start, etc.),
// delivery proceeds as normal (fail-open). Consistent with verify-clip/signage
// "can't reject what we can't verify" policy. blur_enabled=false at launch
// makes face-blur-check return 'pass' so this is a structural safety net.
Deno.test("BLUR-05: face-blur-check throws -> fail-open, delivery proceeds + stripe-capture invoked", async () => {
  const { svc, calls } = mockSvc({ clipStatus: "pending", blurCheckThrows: true });
  const res = await handleMuxWebhook(req(READY_EVENT, "valid"), {
    verify: goodVerify,
    svc,
  });
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "ok", "response body is ok (fail-open) when blur-check throws");
  // Full delivered transition must still have occurred
  const tos = calls.rpcs
    .filter((r) => r.fn === "transition_check")
    // deno-lint-ignore no-explicit-any
    .map((r) => (r.args as any).p_to);
  assertEquals(tos, ["uploaded", "processing", "delivered"], "full transition order on blur-check error (fail-open)");
  // stripe-capture must still fire
  const captureInvoke = calls.invokes.find((i) => i.fn === "stripe-capture");
  assert(captureInvoke !== undefined, "stripe-capture invoked on blur-check error (fail-open)");
  // NO blur_review transition must have occurred
  const blurReviewRpc = calls.rpcs.find(
    // deno-lint-ignore no-explicit-any
    (r) => r.fn === "transition_check" && (r.args as any).p_to === "blur_review",
  );
  assert(blurReviewRpc === undefined, "NO blur_review on blur-check error (fail-open, BLUR-05)");
});

// Phase 6: fraud-eval is invoked fire-and-forget AFTER delivered on the pass path.
// A fraud-eval failure must NOT prevent a 200/delivered (D-04 flag-only, advisory only).
Deno.test("fraud-eval is invoked after delivered; its failure does NOT prevent 200/delivered (D-04 fire-and-forget)", async () => {
  const { svc, calls } = mockSvc({ clipStatus: "pending" });
  const res = await handleMuxWebhook(req(READY_EVENT, "valid"), {
    verify: goodVerify,
    svc,
  });
  assertEquals(res.status, 200);
  // fraud-eval must have been invoked (advisory, fire-and-forget)
  const fraudInvoke = calls.invokes.find((i) => i.fn === "fraud-eval");
  assert(fraudInvoke !== undefined, "fraud-eval was invoked on the delivered path");
  // deno-lint-ignore no-explicit-any
  assertEquals((fraudInvoke!.opts as any).body.checkId, "check_abc", "correct checkId to fraud-eval");
  // The delivered transition must still be present (fraud-eval never blocks)
  const deliveredRpc = calls.rpcs.find(
    // deno-lint-ignore no-explicit-any
    (r) => r.fn === "transition_check" && (r.args as any).p_to === "delivered",
  );
  assert(deliveredRpc !== undefined, "delivered transition present despite fraud-eval (advisory only)");
});
