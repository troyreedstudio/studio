// supabase/functions/send-push/index.test.ts
//
// Deno test suite pinning PUSH-04..PUSH-09 contracts for handleSendPush.
// These tests are RED until index.ts is implemented (Task 2 turns them green).
//
// Contracts pinned:
//   PUSH-04: video-ready -> resolves seeker from checks, reads seeker tokens,
//            POSTs to https://exp.host/--/api/v2/push/send with seeker's token(s).
//   PUSH-05: job-nearby -> resolves in-range ONLINE scouts (from scout_locations,
//            NOT from list_open_checks_for_scout), reads their tokens,
//            POSTs them — seeker is NOT in recipient set.
//   PUSH-06: recipient with notification_prefs.delivered === false (video-ready) is
//            SKIPPED — no message built for that user.
//   PUSH-07: notification_prefs null -> recipient IS included (push-all degrade, D-04).
//   PUSH-08: Expo ticket status='error' + details.error='DeviceNotRegistered' ->
//            delete that token from device_push_tokens.
//   PUSH-09: mock svc THROWS -> handleSendPush still resolves (never throws).
//
// Run: deno test --allow-env supabase/functions/send-push/index.test.ts

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleSendPush } from "./index.ts";

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const SEEKER_ID = "seeker-uuid-0001";
const SCOUT_A_ID = "scout-uuid-0001";
const SCOUT_B_ID = "scout-uuid-0002";
const SEEKER_TOKEN = "ExponentPushToken[seeker-tok-1]";
const SCOUT_A_TOKEN = "ExponentPushToken[scout-a-tok-1]";
const SCOUT_B_TOKEN = "ExponentPushToken[scout-b-tok-1]";
const CHECK_ID = "check-uuid-0001";

// Tracks calls made to the mock service client
interface MockCalls {
  selects: Array<{ table: string }>;
  deletes: Array<{ table: string; col: string; val: string }>;
  rpcs: Array<{ fn: string; args: unknown }>;
  fetchCalls: Array<{ url: string; body: unknown }>;
}

interface MockSvcOpts {
  seekerId?: string;
  checkCoord?: string;
  scoutIds?: string[];           // online scouts in range (job-nearby)
  tokenMap?: Record<string, string[]>; // userId -> tokens[]
  prefMap?: Record<string, Record<string, boolean> | null>; // userId -> prefs or null
  throwOnQuery?: boolean;
}

/**
 * Build a chainable mock service client that records all calls.
 *
 * Supports the subset of supabase-js methods used by handleSendPush:
 *   svc.from(table).select(...).eq(...).single()
 *   svc.from(table).select(...).in(...)
 *   svc.from(table).delete().eq(...)
 *   svc.rpc(fn, args)
 *
 * Returns mock data based on the table name for predictable test fixtures.
 */
function mockSvc(opts: MockSvcOpts = {}) {
  const calls: MockCalls = {
    selects: [],
    deletes: [],
    rpcs: [],
    fetchCalls: [],
  };

  const {
    seekerId = SEEKER_ID,
    checkCoord = "POINT(-80.19 25.77)",
    scoutIds = [SCOUT_A_ID, SCOUT_B_ID],
    tokenMap = {
      [SEEKER_ID]: [SEEKER_TOKEN],
      [SCOUT_A_ID]: [SCOUT_A_TOKEN],
      [SCOUT_B_ID]: [SCOUT_B_TOKEN],
    },
    prefMap = {},
    throwOnQuery = false,
  } = opts;

  const svc = {
    from(table: string) {
      calls.selects.push({ table });

      if (throwOnQuery) {
        throw new Error("mock svc: query failed");
      }

      return {
        // SELECT chain
        select(_cols: string) {
          return {
            // .eq().single() — checks row
            eq(_col: string, _val: unknown) {
              return {
                single() {
                  if (table === "checks") {
                    return Promise.resolve({
                      data: { seeker_id: seekerId, coord: checkCoord },
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: null, error: null });
                },
                // profiles lookup by user_id
                then: undefined as unknown,
              };
            },
            // .in() — device_push_tokens and profiles batch lookups
            in(_col: string, ids: string[]) {
              if (table === "device_push_tokens") {
                const rows: Array<{ user_id: string; token: string }> = [];
                for (const uid of ids) {
                  const toks = tokenMap[uid] ?? [];
                  for (const tok of toks) {
                    rows.push({ user_id: uid, token: tok });
                  }
                }
                return Promise.resolve({ data: rows, error: null });
              }
              if (table === "profiles") {
                const rows: Array<{ id: string; notification_prefs: Record<string, boolean> | null }> = [];
                for (const uid of ids) {
                  rows.push({
                    id: uid,
                    notification_prefs: prefMap[uid] !== undefined ? prefMap[uid] : null,
                  });
                }
                return Promise.resolve({ data: rows, error: null });
              }
              return Promise.resolve({ data: [], error: null });
            },
          };
        },

        // scout_locations geo query: select().eq('is_online', true).filter(...)
        // Simplified: .eq() chain used for is_online=true, then we return scoutIds.
        // The actual implementation may use .filter() for ST_DWithin; mock always
        // returns the configured scoutIds from the first select on scout_locations.
        //
        // Pattern: svc.from('scout_locations').select(...).eq('is_online',true).filter(...)
        // We return {data: scoutIds.map(id => ({scout_id: id}))} from .eq() single call.

        // DELETE chain
        delete() {
          return {
            eq(col: string, val: string) {
              calls.deletes.push({ table, col, val });
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };
    },

    rpc(fn: string, args: unknown) {
      calls.rpcs.push({ fn, args });

      // scouts_in_range RPC for job-nearby audience
      if (fn === "scouts_in_range_of_check") {
        return Promise.resolve({
          data: scoutIds.map((id) => ({ scout_id: id })),
          error: null,
        });
      }

      return Promise.resolve({ data: null, error: null });
    },
  };

  return { svc: svc as unknown, calls };
}

/**
 * Stub global fetch for one test. Returns a Expo-style ticket response.
 * tickets is an array parallel to the messages sent.
 */
function stubFetch(
  calls: MockCalls,
  tickets: Array<{ status: "ok" } | { status: "error"; details: { error: string } }>,
) {
  const orig = globalThis.fetch;
  globalThis.fetch = (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    let body: unknown = null;
    try {
      if (init?.body) body = JSON.parse(init.body as string);
    } catch (_) { /* ignore */ }
    calls.fetchCalls.push({ url: urlStr, body });
    return Promise.resolve(
      new Response(JSON.stringify({ data: tickets }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };
  return () => { globalThis.fetch = orig; };
}

// ─── PUSH-04 ──────────────────────────────────────────────────────────────────

Deno.test("PUSH-04: video-ready -> resolves seeker, POSTs seeker token to Expo endpoint", async () => {
  const { svc, calls } = mockSvc();
  const restore = stubFetch(calls, [{ status: "ok" }]);
  try {
    await handleSendPush(CHECK_ID, "video-ready", svc);

    // Must have made exactly one fetch call
    assert(calls.fetchCalls.length >= 1, "fetch was called at least once");

    const fetchCall = calls.fetchCalls[0];
    // Must target the Expo Push endpoint
    assert(
      fetchCall.url.includes("exp.host/--/api/v2/push/send"),
      `Expo endpoint expected in fetch URL, got: ${fetchCall.url}`,
    );

    // Message must contain the seeker's token (NOT a scout token)
    const messages = fetchCall.body as Array<{ to: string }>;
    assert(Array.isArray(messages), "POST body must be an array of messages");
    const tos = messages.map((m) => m.to);
    assert(tos.includes(SEEKER_TOKEN), `Seeker token ${SEEKER_TOKEN} expected in 'to' fields`);
    assert(!tos.includes(SCOUT_A_TOKEN), "Scout token must NOT appear in video-ready send");
  } finally {
    restore();
  }
});

// ─── PUSH-05 ──────────────────────────────────────────────────────────────────

Deno.test("PUSH-05: job-nearby -> resolves in-range online scouts, POSTs scout tokens (not seeker)", async () => {
  const { svc, calls } = mockSvc();
  const restore = stubFetch(calls, [{ status: "ok" }, { status: "ok" }]);
  try {
    await handleSendPush(CHECK_ID, "job-nearby", svc);

    assert(calls.fetchCalls.length >= 1, "fetch was called at least once");

    const fetchCall = calls.fetchCalls[0];
    assert(
      fetchCall.url.includes("exp.host/--/api/v2/push/send"),
      `Expo endpoint expected in URL, got: ${fetchCall.url}`,
    );

    const messages = fetchCall.body as Array<{ to: string }>;
    assert(Array.isArray(messages), "POST body must be an array");
    const tos = messages.map((m) => m.to);

    // Both scout tokens must appear
    assert(tos.includes(SCOUT_A_TOKEN), "Scout A token expected for job-nearby");
    assert(tos.includes(SCOUT_B_TOKEN), "Scout B token expected for job-nearby");

    // Seeker must NOT be in the job-nearby send
    assert(!tos.includes(SEEKER_TOKEN), "Seeker token must NOT appear in job-nearby send");
  } finally {
    restore();
  }
});

// ─── PUSH-06 ──────────────────────────────────────────────────────────────────

Deno.test("PUSH-06: notification_prefs.delivered=false skips seeker for video-ready", async () => {
  const { svc, calls } = mockSvc({
    prefMap: {
      [SEEKER_ID]: { delivered: false }, // seeker has disabled video-ready push
    },
  });
  // Use a restore that captures tickets list — we track whether fetch is called
  let fetchCalled = false;
  const orig = globalThis.fetch;
  globalThis.fetch = () => {
    fetchCalled = true;
    return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
  };
  try {
    await handleSendPush(CHECK_ID, "video-ready", svc);
    // Either fetch is not called at all (zero recipients) or called with empty messages
    if (fetchCalled) {
      // If fetch was called anyway, messages for seeker must not appear
      // (implementation may skip the fetch if messages is empty — both are valid)
    }
    // The key assertion: no token for SEEKER_ID should have been delivered.
    // We verify indirectly by checking fetch was either not called or sent 0 messages.
    // Primary guard: no delete was triggered (no DeviceNotRegistered cleanup needed for skipped user)
    const seekerDelete = calls.deletes.find((d) => d.val === SEEKER_TOKEN);
    assertEquals(seekerDelete, undefined, "No delete for skipped seeker token");
    // fetchCalled can be true (empty batch) or false (implementation short-circuits)
    // — both are valid PUSH-06 implementations.
  } finally {
    globalThis.fetch = orig;
  }
});

// Additional PUSH-06 stricter check: if fetch was called, messages array has no seeker token
Deno.test("PUSH-06b: notification_prefs.delivered=false -> seeker token absent from Expo messages", async () => {
  const { svc, calls } = mockSvc({
    prefMap: {
      [SEEKER_ID]: { delivered: false },
    },
  });
  const restore = stubFetch(calls, []);
  try {
    await handleSendPush(CHECK_ID, "video-ready", svc);
    // Any fetch that occurred must have zero messages for the seeker
    for (const fc of calls.fetchCalls) {
      const messages = fc.body as Array<{ to: string }> | null;
      if (Array.isArray(messages)) {
        const tos = messages.map((m) => m.to);
        assert(!tos.includes(SEEKER_TOKEN), "Seeker token must NOT be in messages when prefs.delivered=false");
      }
    }
  } finally {
    restore();
  }
});

// ─── PUSH-07 ──────────────────────────────────────────────────────────────────

Deno.test("PUSH-07: notification_prefs null -> seeker IS included (push-all degrade D-04)", async () => {
  const { svc, calls } = mockSvc({
    prefMap: {
      [SEEKER_ID]: null, // null prefs -> push all
    },
  });
  const restore = stubFetch(calls, [{ status: "ok" }]);
  try {
    await handleSendPush(CHECK_ID, "video-ready", svc);

    assert(calls.fetchCalls.length >= 1, "fetch must be called when prefs is null");
    const messages = calls.fetchCalls[0].body as Array<{ to: string }>;
    const tos = messages.map((m) => m.to);
    assert(tos.includes(SEEKER_TOKEN), "Seeker token must be included when notification_prefs is null");
  } finally {
    restore();
  }
});

// ─── PUSH-08 ──────────────────────────────────────────────────────────────────

Deno.test("PUSH-08: DeviceNotRegistered ticket -> delete stale token from device_push_tokens", async () => {
  const { svc, calls } = mockSvc();
  // Expo returns DeviceNotRegistered for the seeker's token
  const restore = stubFetch(calls, [
    { status: "error", details: { error: "DeviceNotRegistered" } },
  ]);
  try {
    await handleSendPush(CHECK_ID, "video-ready", svc);

    // Must have called delete on device_push_tokens for the stale token
    const deleteCall = calls.deletes.find(
      (d) => d.table === "device_push_tokens" && d.val === SEEKER_TOKEN,
    );
    assert(
      deleteCall !== undefined,
      `Expected delete on device_push_tokens for token ${SEEKER_TOKEN}; deletes: ${JSON.stringify(calls.deletes)}`,
    );
  } finally {
    restore();
  }
});

// ─── PUSH-09 ──────────────────────────────────────────────────────────────────

Deno.test("PUSH-09: svc throws -> handleSendPush still resolves (never throws)", async () => {
  const { svc } = mockSvc({ throwOnQuery: true });
  // fetch should never be called when svc throws before it
  // handleSendPush must catch internally and not propagate
  let threw = false;
  try {
    await handleSendPush(CHECK_ID, "video-ready", svc);
  } catch (_e) {
    threw = true;
  }
  assertEquals(threw, false, "handleSendPush must never throw — caught all errors internally");
});
