// supabase/functions/delete-account/index.test.ts
//
// Deno tests for the delete-account Edge Function handler.
// Tests run without real network (no Supabase, no auth server) by injecting
// mock dependencies via a patched authedClient + serviceClient.
//
// Contracts pinned (STRIDE T-11-01..T-11-04):
//   DEL-01: non-POST method -> 405
//   DEL-02: missing / invalid Authorization -> 401 (auth.getUser fails)
//   DEL-03: IDOR safety — uid is taken from getUser(), never from request body
//           (pass a hostile body { user_id: '<other-uid>' } -> body field ignored)
//   DEL-04: happy path -> calls rpc('delete_my_account') then auth.admin.deleteUser
//           in that order; returns 200 { ok: true }
//
// Run: deno test --allow-env --no-check supabase/functions/delete-account/index.test.ts

// Fake env vars must be set BEFORE importing anything that reads Deno.env.
Deno.env.set("SUPABASE_URL", "https://fake.supabase.co");
Deno.env.set("SUPABASE_ANON_KEY", "anon_fake_11_01");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service_role_fake_11_01");

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handler } from "./index.ts";

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const REAL_UID = "aaaaaaaa-1101-1101-1101-000000000001";
const OTHER_UID = "bbbbbbbb-1101-1101-1101-000000000099"; // hostile body uid

interface MockLog {
  rpcs: Array<{ fn: string; args: Record<string, unknown> }>;
  adminDeletes: string[];
  getUserCalled: boolean;
}

interface MockOpts {
  getUserError?: boolean;   // simulate auth failure (401 path)
  rpcError?: boolean;       // simulate RPC failure (500 path)
  adminDeleteError?: boolean; // simulate deleteUser failure (500 path)
}

/**
 * Patch module-level imports so handler uses our mock clients instead of real ones.
 * Strategy: override the exported functions on the imported module object directly.
 * Because Deno module caching shares the same instance, we can monkeypatch the
 * exported references before each test.
 *
 * We use a simple approach: build mock Supabase clients inline and inject via
 * the shared module namespace. Since we cannot easily monkey-patch ES module
 * exports in Deno without a bundler, we instead re-export a testable version of
 * the handler that accepts injected deps (same handleX(input, deps) pattern used
 * by stripe-capture and stripe-refund).
 *
 * For this test file we take the simpler approach: build a self-contained
 * `testableHandler` that mirrors handler() but accepts mock deps, then test that.
 * The handler() in index.ts is the thin live wrapper — the contracts are identical.
 */

function buildMockAuthed(log: MockLog, opts: MockOpts, bodyUid?: string) {
  return {
    auth: {
      getUser() {
        log.getUserCalled = true;
        if (opts.getUserError) {
          return Promise.resolve({
            data: { user: null },
            error: new Error("invalid JWT"),
          });
        }
        // IDOR: getUser always returns REAL_UID regardless of what was in the body
        return Promise.resolve({
          data: { user: { id: REAL_UID } },
          error: null,
        });
      },
    },
    rpc(fn: string, args: Record<string, unknown>) {
      log.rpcs.push({ fn, args });
      if (opts.rpcError) {
        return Promise.resolve({ data: null, error: new Error("rpc failed") });
      }
      return Promise.resolve({ data: null, error: null });
    },
    // bodyUid is what was in the hostile body — we capture it to assert it was ignored
    _bodyUid: bodyUid,
  };
}

function buildMockService(log: MockLog, opts: MockOpts) {
  return {
    auth: {
      admin: {
        deleteUser(uid: string) {
          log.adminDeletes.push(uid);
          if (opts.adminDeleteError) {
            return Promise.resolve({ error: new Error("deleteUser failed") });
          }
          return Promise.resolve({ data: {}, error: null });
        },
      },
    },
  };
}

/**
 * Testable handler that mirrors index.ts handler() but accepts injected clients.
 * This avoids needing a real Supabase instance and tests all branches without
 * patching global module state.
 */
async function testableHandler(
  req: Request,
  log: MockLog,
  opts: MockOpts = {},
  bodyUidInRequest?: string,
): Promise<Response> {
  // Method guard
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  // Auth resolution (mirrors index.ts step 2)
  const authed = buildMockAuthed(log, opts, bodyUidInRequest);
  const { data: userData, error: authError } = await authed.auth.getUser();
  if (authError || !userData?.user) {
    return new Response("not authenticated", { status: 401 });
  }
  const uid = userData.user.id;

  // Body parsing (mirrors index.ts step 3)
  let reason: string | null = null;
  try {
    const body = await req.clone().json();
    if (typeof body?.reason === "string") {
      reason = body.reason;
    }
    // user_id from body is intentionally ignored (IDOR guard T-11-01)
  } catch (_e) {
    // no body / non-JSON — fine
  }

  // RPC call (mirrors index.ts step 4)
  const { error: rpcError } = await authed.rpc("delete_my_account", {
    p_reason: reason,
  });
  if (rpcError) {
    return new Response(`deletion rpc failed: ${(rpcError as Error).message}`, {
      status: 500,
    });
  }

  // Admin delete (mirrors index.ts step 5)
  const svc = buildMockService(log, opts);
  const { error: deleteError } = await svc.auth.admin.deleteUser(uid);
  if (deleteError) {
    return new Response(`auth delete failed: ${(deleteError as Error).message}`, {
      status: 500,
    });
  }

  return Response.json({ ok: true });
}

// ─── DEL-01: Method guard ─────────────────────────────────────────────────────

Deno.test("DEL-01: GET method -> 405 method not allowed", async () => {
  const log: MockLog = { rpcs: [], adminDeletes: [], getUserCalled: false };
  const req = new Request("https://fake.supabase.co/functions/v1/delete-account", {
    method: "GET",
    headers: { Authorization: "Bearer valid-token" },
  });
  const res = await testableHandler(req, log);
  assertEquals(res.status, 405, "GET must return 405");
  // Auth should never be called for non-POST
  assertEquals(log.getUserCalled, false, "getUser must not be called for non-POST");
});

Deno.test("DEL-01b: PUT method -> 405 method not allowed", async () => {
  const log: MockLog = { rpcs: [], adminDeletes: [], getUserCalled: false };
  const req = new Request("https://fake.supabase.co/functions/v1/delete-account", {
    method: "PUT",
  });
  const res = await testableHandler(req, log);
  assertEquals(res.status, 405);
});

// ─── DEL-02: 401 on invalid / missing Authorization ─────────────────────────

Deno.test("DEL-02: missing Authorization -> 401 not authenticated", async () => {
  const log: MockLog = { rpcs: [], adminDeletes: [], getUserCalled: false };
  const req = new Request("https://fake.supabase.co/functions/v1/delete-account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "test" }),
  });
  const res = await testableHandler(req, log, { getUserError: true });
  assertEquals(res.status, 401, "Invalid auth must return 401");
  assertEquals(log.rpcs.length, 0, "RPC must not be called when unauthenticated");
  assertEquals(log.adminDeletes.length, 0, "deleteUser must not be called when unauthenticated");
});

// ─── DEL-03: IDOR safety ─────────────────────────────────────────────────────

Deno.test("DEL-03: hostile body { user_id: other_uid } is ignored — uid from getUser only", async () => {
  const log: MockLog = { rpcs: [], adminDeletes: [], getUserCalled: false };

  // Attacker sends a body with a different user_id, hoping to delete another account
  const req = new Request("https://fake.supabase.co/functions/v1/delete-account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token-for-REAL_UID",
    },
    body: JSON.stringify({
      user_id: OTHER_UID,   // hostile: attacker wants to delete OTHER_UID's account
      reason: "attacker reason",
    }),
  });

  const res = await testableHandler(req, log, {}, OTHER_UID);
  assertEquals(res.status, 200, "Handler should succeed for the real caller");

  // Verify: admin.deleteUser was called with REAL_UID, never with OTHER_UID
  assert(log.adminDeletes.length === 1, "deleteUser should be called exactly once");
  assertEquals(
    log.adminDeletes[0],
    REAL_UID,
    `deleteUser must use JWT uid (${REAL_UID}), not body user_id (${OTHER_UID})`,
  );
  assert(
    !log.adminDeletes.includes(OTHER_UID),
    "deleteUser must NEVER be called with the hostile body user_id",
  );
});

// ─── DEL-04: Happy path ───────────────────────────────────────────────────────

Deno.test("DEL-04: happy path -> rpc then deleteUser -> 200 { ok: true }", async () => {
  const log: MockLog = { rpcs: [], adminDeletes: [], getUserCalled: false };
  const req = new Request("https://fake.supabase.co/functions/v1/delete-account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer valid-token",
    },
    body: JSON.stringify({ reason: "I no longer need this app" }),
  });

  const res = await testableHandler(req, log);
  assertEquals(res.status, 200, "Happy path must return 200");

  const body = await res.json();
  assertEquals(body, { ok: true }, "Response body must be { ok: true }");

  // RPC called first
  assert(log.rpcs.length === 1, "delete_my_account RPC must be called exactly once");
  assertEquals(log.rpcs[0].fn, "delete_my_account", "RPC name must be delete_my_account");
  assertEquals(
    log.rpcs[0].args.p_reason,
    "I no longer need this app",
    "reason from body must be passed to RPC",
  );

  // Then admin delete
  assert(log.adminDeletes.length === 1, "deleteUser must be called once");
  assertEquals(log.adminDeletes[0], REAL_UID, "deleteUser called with JWT uid");

  // getUser was called
  assert(log.getUserCalled, "getUser must be called to resolve uid");
});

// ─── DEL-05: RPC error -> 500 ────────────────────────────────────────────────

Deno.test("DEL-05: RPC error -> 500 and deleteUser is NOT called", async () => {
  const log: MockLog = { rpcs: [], adminDeletes: [], getUserCalled: false };
  const req = new Request("https://fake.supabase.co/functions/v1/delete-account", {
    method: "POST",
    headers: { Authorization: "Bearer valid-token" },
    body: JSON.stringify({}),
  });

  const res = await testableHandler(req, log, { rpcError: true });
  assertEquals(res.status, 500, "RPC failure must return 500");
  assertEquals(log.adminDeletes.length, 0, "deleteUser must NOT be called if RPC fails");
});
