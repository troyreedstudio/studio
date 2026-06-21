// supabase/functions/mux-upload-url/index.test.ts
// Wave-0 FAILING scaffold (Deno) for the mint-a-Mux-direct-upload-URL function
// (VID-03 / VID-04). RED on purpose: it imports `handleUploadUrl` from ./index.ts,
// which is implemented in a later plan (03-03). Until then the import does not
// resolve and these tests fail — the honest Wave-0 state.
//
// The contract these scaffolds pin (what downstream turns green):
//   - the upload is created with new_asset_settings.playback_policy: ['signed']
//     (VID-04: private playback) and passthrough: checkId (webhook correlation key)
//   - the upload URL is minted ONLY for the assigned scout on that check (authz)
//   - the (pending) clip row records the mux_upload_id so the webhook can find it
// Run: deno test --allow-env supabase/functions/mux-upload-url/index.test.ts
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
// RED: handler implemented downstream (03-03). This import is the Wave-0 seam.
import { handleUploadUrl } from "./index.ts";

// Mock the Mux SDK: record the uploads.create payload so we can assert on it.
function mockMux() {
  const created: Array<Record<string, unknown>> = [];
  const mux = {
    video: {
      uploads: {
        create(payload: Record<string, unknown>) {
          created.push(payload);
          return Promise.resolve({ id: "upload_999", url: "https://mux/up/999" });
        },
      },
    },
  };
  return { mux, created };
}

// Mock the service client: `assignedScout` controls whether the caller is the
// check's assigned scout (the authz gate).
function mockSvc(opts: { assignedScout: string | null } = { assignedScout: "scout-1" }) {
  const inserts: Array<Record<string, unknown>> = [];
  const svc = {
    from(_table: string) {
      return {
        select(_cols: string) {
          return {
            eq() {
              return {
                maybeSingle() {
                  return Promise.resolve({
                    data: { scout_id: opts.assignedScout, status: "filming" },
                    error: null,
                  });
                },
              };
            },
          };
        },
        // Phase 5 fix: mux-upload-url now INSERTs the clip row (was UPDATE).
        // The INSERT creates the row so the Mux webhook can find it via check_id.
        insert(values: Record<string, unknown>) {
          inserts.push(values);
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };
  return { svc, inserts };
}

Deno.test("mints a SIGNED upload with passthrough=checkId for the assigned scout", async () => {
  const { mux, created } = mockMux();
  const { svc, inserts } = mockSvc({ assignedScout: "scout-1" });
  const res = await handleUploadUrl(
    { checkId: "check_abc", callerId: "scout-1" },
    { mux, svc },
  );

  assertEquals(res.status, 200);
  assertEquals(created.length, 1);
  const settings = (created[0].new_asset_settings ?? {}) as Record<string, unknown>;
  // VID-04: signed playback policy
  assertEquals(settings.playback_policy, ["signed"]);
  // webhook correlation key
  assertEquals(settings.passthrough, "check_abc");
  // Phase 5 fix: the clip row is now INSERTed (not updated) so it exists when the webhook fires
  const recorded = inserts.find((u) => u.mux_upload_id === "upload_999");
  assert(recorded, "expected the clip row to be inserted with mux_upload_id");
  assertEquals(recorded?.check_id, "check_abc");
  assertEquals(recorded?.status, "pending");
});

Deno.test("denies a caller who is NOT the assigned scout", async () => {
  const { mux, created } = mockMux();
  const { svc } = mockSvc({ assignedScout: "scout-OTHER" });
  const res = await handleUploadUrl(
    { checkId: "check_abc", callerId: "scout-1" },
    { mux, svc },
  );
  assert(res.status === 401 || res.status === 403, "non-assigned scout is denied");
  assertEquals(created.length, 0); // no upload minted
});
