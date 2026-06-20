// supabase/functions/mux-playback-token/index.test.ts
// Wave-0 FAILING scaffold (Deno) for the signed-playback-token function (VID-04).
// RED on purpose: it imports `handlePlaybackToken` from ./index.ts, implemented in a
// later plan (03-03). Until then the import does not resolve and these tests fail.
//
// The contract these scaffolds pin (what downstream turns green):
//   - a short-lived signed Mux playback JWT is minted ONLY for the OWNING seeker of
//     the check (the buyer) — playback is scoped to who paid (VID-04)
//   - a non-owner (a different seeker, or the scout) is DENIED a token
// Run: deno test --allow-env supabase/functions/mux-playback-token/index.test.ts
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
// RED: handler implemented downstream (03-03). This import is the Wave-0 seam.
import { handlePlaybackToken } from "./index.ts";

// Mock the Mux SDK JWT signer.
function mockMux() {
  const signed: Array<{ playbackId: string; opts: unknown }> = [];
  const mux = {
    jwt: {
      signPlaybackId(playbackId: string, opts: unknown) {
        signed.push({ playbackId, opts });
        return Promise.resolve("signed.jwt.token");
      },
    },
  };
  return { mux, signed };
}

// Mock the service client: returns the check's owning seeker + clip playback id.
function mockSvc(opts: { seekerId: string; playbackId?: string }) {
  const svc = {
    from(table: string) {
      return {
        select(_cols: string) {
          return {
            eq() {
              return {
                maybeSingle() {
                  return Promise.resolve({
                    data: table === "clips"
                      ? { mux_playback_id: opts.playbackId ?? "signed_pb_456", status: "ready" }
                      : { seeker_id: opts.seekerId },
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
  return { svc };
}

Deno.test("mints a token ONLY for the owning seeker of the check", async () => {
  const { mux, signed } = mockMux();
  const { svc } = mockSvc({ seekerId: "seeker-OWNER" });
  const res = await handlePlaybackToken(
    { checkId: "check_abc", callerId: "seeker-OWNER" },
    { mux, svc },
  );
  assertEquals(res.status, 200);
  assertEquals(signed.length, 1);
  assertEquals(signed[0].playbackId, "signed_pb_456");
  assertEquals(await res.text(), JSON.stringify({ token: "signed.jwt.token" }));
});

Deno.test("denies a non-owner (a different seeker is not the buyer)", async () => {
  const { mux, signed } = mockMux();
  const { svc } = mockSvc({ seekerId: "seeker-OWNER" });
  const res = await handlePlaybackToken(
    { checkId: "check_abc", callerId: "seeker-INTRUDER" },
    { mux, svc },
  );
  assert(res.status === 401 || res.status === 403, "a non-owner is denied a playback token");
  assertEquals(signed.length, 0); // no token minted for a non-owner
});
