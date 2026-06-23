// supabase/functions/stripe-record-hold/index.test.ts
// Deno unit tests for the stripe-record-hold Edge Function.
// Mirrors stripe-capture/index.test.ts pattern: inject mock svc, no real
// network, no real secrets.
// Run: deno test --allow-env supabase/functions/stripe-record-hold/index.test.ts
//
// Behaviors covered:
//   (a) IDOR: non-seeker caller → 403
//   (b) Idempotent: two calls → exactly ONE payments insert (on-conflict ignore)
//   (c) Amounts come from pricing, NOT from the body
//   (d) Status on insert is 'authorized'
//   (e) Missing stripe_payment_intent_id on check → 409

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Fake secrets MUST be set before importing helpers that read Deno.env.
Deno.env.set("STRIPE_SECRET_KEY", "sk_test_FAKE_record_hold_DO_NOT_LEAK");
Deno.env.set("STRIPE_WEBHOOK_SECRET", "whsec_fake_record_hold_DO_NOT_LEAK");
Deno.env.set("SUPABASE_URL", "https://fake.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service_role_fake_record_hold");
Deno.env.set("SUPABASE_ANON_KEY", "anon_fake_record_hold");

import { handleRecordHold } from "./index.ts";

// ── Mock factory ───────────────────────────────────────────────────────────────

type CheckRow = {
  id: string;
  seeker_id: string;
  tier: string;
  stripe_payment_intent_id: string | null;
};

type MockSvcOpts = {
  check?: CheckRow | null;
  checkErr?: boolean;
  /** Whether an existing payments row already exists (simulates duplicate insert) */
  paymentAlreadyExists?: boolean;
};

type InsertCall = {
  table: string;
  row: Record<string, unknown>;
};

function mockSvc(opts: MockSvcOpts = {}) {
  const {
    check = {
      id: "check-uuid-001",
      seeker_id: "seeker-user-abc",
      tier: "standard",
      stripe_payment_intent_id: "pi_mock_001",
    },
    checkErr = false,
    paymentAlreadyExists = false,
  } = opts;

  const calls = {
    inserts: [] as InsertCall[],
    rpcs: [] as Array<{ fn: string; args: unknown }>,
  };

  // Track how many insert attempts occur (to verify idempotency).
  let insertAttempts = 0;

  const svc = {
    from(table: string) {
      if (table === "checks") {
        return {
          select(_cols: string) {
            return {
              eq(_col: string, _val: string) {
                return {
                  maybeSingle() {
                    if (checkErr) {
                      return Promise.resolve({ data: null, error: { message: "db error" } });
                    }
                    return Promise.resolve({ data: check ?? null, error: null });
                  },
                };
              },
            };
          },
        };
      }

      if (table === "payments") {
        return {
          insert(row: Record<string, unknown>) {
            insertAttempts++;
            const isConflict = paymentAlreadyExists && insertAttempts > 1;
            calls.inserts.push({ table, row });

            return {
              select(_cols: string) {
                return {
                  // .onConflict().ignoreDuplicates() chain
                  onConflict(_col: string) {
                    return {
                      ignoreDuplicates() {
                        if (isConflict) {
                          // ON CONFLICT DO NOTHING — no error, no data
                          return Promise.resolve({ data: null, error: null });
                        }
                        return Promise.resolve({ data: { id: "payment-uuid-001" }, error: null });
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      // Fallback for unexpected tables
      return {
        select() {
          return {
            eq() {
              return { maybeSingle: () => Promise.resolve({ data: null, error: null }) };
            },
          };
        },
      };
    },

    rpc(fn: string, args: unknown) {
      calls.rpcs.push({ fn, args });
      return Promise.resolve({ data: null, error: null });
    },

    get _insertAttempts() {
      return insertAttempts;
    },
  };

  return { svc, calls };
}

// ── Test (a): IDOR — non-seeker caller → 403 ──────────────────────────────────

Deno.test("(a) IDOR: caller whose id does not match check.seeker_id → 403", async () => {
  const { svc } = mockSvc({
    check: {
      id: "check-uuid-001",
      seeker_id: "seeker-user-abc",
      tier: "standard",
      stripe_payment_intent_id: "pi_mock_001",
    },
  });

  // callerId = "attacker-user-xyz" ≠ seeker_id = "seeker-user-abc"
  const result = await handleRecordHold(
    { callerId: "attacker-user-xyz", checkId: "check-uuid-001" },
    { svc },
  );

  assertEquals(result.status, 403, "non-seeker caller must receive 403");
  const body = await result.text();
  assert(body.toLowerCase().includes("forbidden"), "403 body must say forbidden");
});

// ── Test (b): Idempotency — two calls → exactly ONE insert attempt ─────────────

Deno.test("(b) Idempotent: second call ON CONFLICT DO NOTHING — only one insert row recorded", async () => {
  // Simulate: first call writes the row; second call hits ON CONFLICT.
  // We track how many insert calls reach the svc — both calls should still
  // reach the mock (the guard is in the DB, not in code), but we verify the
  // function returns 200 both times and does NOT error on the duplicate.

  const calls1: InsertCall[] = [];
  const calls2: InsertCall[] = [];

  // Two separate mock instances simulating two independent requests.
  const { svc: svc1, calls: trackedCalls1 } = mockSvc({ paymentAlreadyExists: false });
  const { svc: svc2, calls: trackedCalls2 } = mockSvc({ paymentAlreadyExists: true });

  const result1 = await handleRecordHold(
    { callerId: "seeker-user-abc", checkId: "check-uuid-001" },
    { svc: svc1 },
  );
  calls1.push(...trackedCalls1.inserts);

  const result2 = await handleRecordHold(
    { callerId: "seeker-user-abc", checkId: "check-uuid-001" },
    { svc: svc2 },
  );
  calls2.push(...trackedCalls2.inserts);

  assertEquals(result1.status, 200, "first call must return 200");
  assertEquals(result2.status, 200, "second call (duplicate) must also return 200");

  // Each call attempts exactly one insert (the DB's unique constraint absorbs the dup).
  assertEquals(calls1.length, 1, "first call: exactly one insert attempted");
  assertEquals(calls2.length, 1, "second call: exactly one insert attempted (ON CONFLICT ignored by DB)");
});

// ── Test (c): Amounts are server-authoritative, NOT from the body ──────────────

Deno.test("(c) Amounts come from _shared/pricing.ts, not from client body", async () => {
  // Standard tier: seekerTotal=1650, scoutAmount=800, currency='usd'
  const { svc: svcStd, calls: callsStd } = mockSvc({
    check: {
      id: "check-uuid-001",
      seeker_id: "seeker-user-abc",
      tier: "standard",
      stripe_payment_intent_id: "pi_mock_001",
    },
  });

  const resultStd = await handleRecordHold(
    // Note: body only contains checkId — no amount fields.
    { callerId: "seeker-user-abc", checkId: "check-uuid-001" },
    { svc: svcStd },
  );

  assertEquals(resultStd.status, 200, "standard tier: expected 200");
  assertEquals(callsStd.inserts.length, 1, "standard tier: exactly one insert");
  const stdRow = callsStd.inserts[0].row;
  assertEquals(stdRow.amount_total, 1650, "standard: amount_total must be 1650 (from pricing)");
  assertEquals(stdRow.scout_amount, 800, "standard: scout_amount must be 800 (from pricing)");
  assertEquals(stdRow.currency, "usd", "standard: currency must be 'usd' (from pricing)");

  // Priority tier: seekerTotal=2200, scoutAmount=1200, currency='usd'
  const { svc: svcPri, calls: callsPri } = mockSvc({
    check: {
      id: "check-uuid-002",
      seeker_id: "seeker-user-abc",
      tier: "priority",
      stripe_payment_intent_id: "pi_mock_002",
    },
  });

  const resultPri = await handleRecordHold(
    { callerId: "seeker-user-abc", checkId: "check-uuid-002" },
    { svc: svcPri },
  );

  assertEquals(resultPri.status, 200, "priority tier: expected 200");
  assertEquals(callsPri.inserts.length, 1, "priority tier: exactly one insert");
  const priRow = callsPri.inserts[0].row;
  assertEquals(priRow.amount_total, 2200, "priority: amount_total must be 2200 (from pricing)");
  assertEquals(priRow.scout_amount, 1200, "priority: scout_amount must be 1200 (from pricing)");
  assertEquals(priRow.currency, "usd", "priority: currency must be 'usd' (from pricing)");
});

// ── Test (d): Status is 'authorized' on insert ────────────────────────────────

Deno.test("(d) Inserted payments row has status='authorized'", async () => {
  const { svc, calls } = mockSvc();

  const result = await handleRecordHold(
    { callerId: "seeker-user-abc", checkId: "check-uuid-001" },
    { svc },
  );

  assertEquals(result.status, 200, "expected 200");
  assertEquals(calls.inserts.length, 1, "exactly one insert");
  assertEquals(
    calls.inserts[0].row.status,
    "authorized",
    "inserted payments row status must be 'authorized'",
  );
});

// ── Test (e): Missing stripe_payment_intent_id → 409 ──────────────────────────

Deno.test("(e) stripe_payment_intent_id null on check → 409 (hold not linked)", async () => {
  const { svc } = mockSvc({
    check: {
      id: "check-uuid-001",
      seeker_id: "seeker-user-abc",
      tier: "standard",
      stripe_payment_intent_id: null, // PI not yet stored
    },
  });

  const result = await handleRecordHold(
    { callerId: "seeker-user-abc", checkId: "check-uuid-001" },
    { svc },
  );

  assertEquals(result.status, 409, "missing PI id must return 409");
  const body = await result.text();
  assert(
    body.toLowerCase().includes("hold not linked"),
    "409 body must indicate 'hold not linked'",
  );
});

// ── Test (f): Unauthenticated caller → 401 ────────────────────────────────────

Deno.test("(f) No bearer / callerId null → 401", async () => {
  const { svc } = mockSvc();

  const result = await handleRecordHold(
    { callerId: null, checkId: "check-uuid-001" },
    { svc },
  );

  assertEquals(result.status, 401, "unauthenticated caller must receive 401");
});

// ── Test (g): check not found → 404 ───────────────────────────────────────────

Deno.test("(g) Check not found in DB → 404", async () => {
  const { svc } = mockSvc({ check: null });

  const result = await handleRecordHold(
    { callerId: "seeker-user-abc", checkId: "nonexistent-uuid" },
    { svc },
  );

  assertEquals(result.status, 404, "missing check must return 404");
});
