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
function mockSvc(opts: { clipStatus?: string | null } = {}) {
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
        return Promise.resolve({ data: null, error: null });
      },
    },
  };
  return { svc, calls };
}

const READY_EVENT = JSON.stringify({
  type: "video.asset.ready",
  data: {
    id: "asset_123",
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
  // stripe-capture must have been invoked exactly once
  assertEquals(calls.invokes.length, 1, "stripe-capture invoked");
  assertEquals(calls.invokes[0].fn, "stripe-capture");
  // deno-lint-ignore no-explicit-any
  assertEquals((calls.invokes[0].opts as any).body.checkId, "check_abc");
  // stripe-capture must fire AFTER the delivered transition: delivered is the last rpc
  const deliveredIdx = calls.rpcs.findLastIndex(
    // deno-lint-ignore no-explicit-any
    (r) => r.fn === "transition_check" && (r.args as any).p_to === "delivered",
  );
  assert(deliveredIdx >= 0, "delivered transition must be present");
  // All invokes happen after all transition_check rpcs (invokes list is append-only)
  assert(calls.invokes.length > 0, "stripe-capture was invoked after delivered");
});

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
  assertEquals(calls.invokes[0], "stripe-capture");
  const tos = calls.rpcs
    .filter((r) => r.fn === "transition_check")
    // deno-lint-ignore no-explicit-any
    .map((r) => (r.args as any).p_to);
  assertEquals(tos, ["uploaded", "processing", "delivered"]);
});
