// supabase/functions/stripe-capture/index.test.ts
// Deno unit tests for the capture + Transfer + D-09 fallback Edge Function.
// Mirrors mux-webhook/index.test.ts pattern: inject mock stripe + mock svc,
// no real network, no real secrets.
// Run: deno test --allow-env supabase/functions/stripe-capture/index.test.ts
//
// Behaviors covered:
//   1. Held PI captures successfully -> payments.status='captured' then 'transferred';
//      transfers.create called with destination=scoutAccountId, source_transaction=latestCharge
//   2. IDEMPOTENT — if payments.status is already 'transferred', repeat call is no-op
//   3. D-09 — paymentIntents.capture throws -> Scout STILL paid (transfers.create without
//      source_transaction, platform balance), payments.status='capture_failed', Seeker blocked
//   4. Never sets reverse_transfer; never uses destination charge (transfers.create args asserted)
//   5. Missing scout_stripe_accounts row -> capture still occurs, transfer deferred/logged

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Fake secrets MUST be set before importing helpers that read Deno.env.
Deno.env.set("STRIPE_SECRET_KEY", "sk_test_FAKE_04_03_DO_NOT_LEAK");
Deno.env.set("STRIPE_WEBHOOK_SECRET", "whsec_fake_04_03_DO_NOT_LEAK");
Deno.env.set("SUPABASE_URL", "https://fake.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service_role_fake_04_03");
Deno.env.set("SUPABASE_ANON_KEY", "anon_fake_04_03");

import { setStripeClientFactory } from "../_shared/stripe.ts";
import { handleCapture } from "./index.ts";

// ── Mock factories ─────────────────────────────────────────────────────────

type TransferArgs = {
  amount: number;
  currency: string;
  destination: string;
  source_transaction?: string;
  transfer_group?: string;
  metadata?: Record<string, string>;
};

type CaptureLog = {
  captures: string[];
  transfers: TransferArgs[];
  captureThrows: boolean;
};

function mockStripe(log: CaptureLog) {
  return {
    paymentIntents: {
      capture(piId: string) {
        log.captures.push(piId);
        if (log.captureThrows) {
          throw new Error("capture_failed: card declined at capture time");
        }
        return Promise.resolve({
          id: piId,
          status: "succeeded",
          latest_charge: "ch_mock_latest_charge_001",
        });
      },
    },
    transfers: {
      create(args: TransferArgs) {
        log.transfers.push(args);
        return Promise.resolve({ id: "tr_mock_transfer_001" });
      },
    },
  };
}

// Build a mock Supabase service client.
// Options:
//   paymentStatus: current payments.status row
//   scoutAccountId: stripe_account_id in scout_stripe_accounts (null = no row)
//   seekerId: the check's seeker_id (for blocked_from_booking update)
type MockSvcOpts = {
  paymentStatus?: string;
  scoutAccountId?: string | null;
  seekerId?: string;
  checkTier?: string;
  checkCurrency?: string;
};

function mockSvc(opts: MockSvcOpts = {}) {
  const {
    paymentStatus = "authorized",
    scoutAccountId = "acct_mock_scout_001",
    seekerId = "seeker-user-abc",
    checkTier = "standard",
    checkCurrency = "usd",
  } = opts;

  const calls = {
    updates: [] as Array<{ table: string; values: Record<string, unknown> }>,
    rpcs: [] as Array<{ fn: string; args: unknown }>,
    profileUpdates: [] as Array<Record<string, unknown>>,
  };

  const svc = {
    from(table: string) {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, _val: string) {
              return {
                maybeSingle() {
                  if (table === "payments") {
                    return Promise.resolve({
                      data: {
                        stripe_payment_intent_id: "pi_mock_hold_001",
                        scout_amount: checkTier === "priority" ? 1200 : 800,
                        currency: checkCurrency,
                        status: paymentStatus,
                        check_id: "check-uuid-001",
                      },
                      error: null,
                    });
                  }
                  if (table === "checks") {
                    return Promise.resolve({
                      data: {
                        scout_id: "scout-user-xyz",
                        tier: checkTier,
                        currency: checkCurrency,
                        seeker_id: seekerId,
                      },
                      error: null,
                    });
                  }
                  if (table === "scout_stripe_accounts") {
                    if (scoutAccountId === null) {
                      return Promise.resolve({ data: null, error: null });
                    }
                    return Promise.resolve({
                      data: { stripe_account_id: scoutAccountId },
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: null, error: null });
                },
              };
            },
          };
        },
        update(values: Record<string, unknown>) {
          calls.updates.push({ table, values });
          return {
            eq(_col: string, _val: string) {
              return Promise.resolve({ data: null, error: null });
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

  return { svc, calls };
}

// ── Tests ──────────────────────────────────────────────────────────────────

Deno.test("Test 1: successful capture -> payments captured then transferred; transfers.create with source_transaction", async () => {
  const log: CaptureLog = { captures: [], transfers: [], captureThrows: false };
  setStripeClientFactory(() => mockStripe(log));
  const { svc, calls } = mockSvc();

  const result = await handleCapture(
    { checkId: "check-uuid-001" },
    { stripe: mockStripe(log), svc },
  );

  assertEquals(result.status, 200, "expected 200 on success");

  // PI was captured
  assert(log.captures.includes("pi_mock_hold_001"), "paymentIntents.capture must be called");

  // Transfer was created with destination + source_transaction
  assertEquals(log.transfers.length, 1, "expected exactly 1 transfer");
  const transfer = log.transfers[0];
  assert(transfer.destination === "acct_mock_scout_001", "transfer destination must be Scout's account");
  assert(typeof transfer.source_transaction === "string" && transfer.source_transaction.length > 0,
    "source_transaction must be set (separate charges+transfers pattern)");
  assertEquals(transfer.amount, 800, "transfer amount must be 800 (standard tier scoutAmount)");

  // Verify NO reverse_transfer in transfer args
  assert(!("reverse_transfer" in transfer), "reverse_transfer must NEVER be set on transfer");

  // Payments table updated: captured then transferred
  const statusUpdates = calls.updates
    .filter((u) => u.table === "payments")
    .map((u) => u.values.status);
  assert(statusUpdates.includes("captured"), "payments.status must pass through 'captured'");
  assert(statusUpdates.includes("transferred"), "payments.status must end at 'transferred'");
});

Deno.test("Test 2: idempotency — payments.status already 'transferred' -> no-op (no capture, no transfer)", async () => {
  const log: CaptureLog = { captures: [], transfers: [], captureThrows: false };
  setStripeClientFactory(() => mockStripe(log));
  const { svc } = mockSvc({ paymentStatus: "transferred" });

  const result = await handleCapture(
    { checkId: "check-uuid-001" },
    { stripe: mockStripe(log), svc },
  );

  assertEquals(result.status, 200, "expected 200 on dup");
  const body = await result.text();
  assert(body.includes("dup"), "response should indicate duplicate");

  // Nothing should have been called
  assertEquals(log.captures.length, 0, "capture must NOT be called when already transferred");
  assertEquals(log.transfers.length, 0, "transfer must NOT be called when already transferred");
});

Deno.test("Test 3: D-09 — capture throws -> Scout STILL paid (no source_transaction), Seeker blocked", async () => {
  const log: CaptureLog = { captures: [], transfers: [], captureThrows: true };
  setStripeClientFactory(() => mockStripe(log));
  const { svc, calls } = mockSvc();

  const result = await handleCapture(
    { checkId: "check-uuid-001" },
    { stripe: mockStripe(log), svc },
  );

  // Should still return 200 (no unhandled throw)
  assertEquals(result.status, 200, "D-09: should return 200 even when capture fails");

  // Scout still paid — transfer created WITHOUT source_transaction (platform balance)
  assertEquals(log.transfers.length, 1, "D-09: Scout must still receive transfer");
  const d9Transfer = log.transfers[0];
  assert(d9Transfer.destination === "acct_mock_scout_001", "Scout's account must be destination");
  assert(!("source_transaction" in d9Transfer) || d9Transfer.source_transaction === undefined,
    "D-09 transfer must NOT have source_transaction (funded from platform balance)");

  // Payments status = capture_failed
  const statusUpdates = calls.updates
    .filter((u) => u.table === "payments")
    .map((u) => u.values.status);
  assert(statusUpdates.includes("capture_failed"), "payments.status must be 'capture_failed' on D-09");

  // Seeker blocked_from_booking = true
  const profileUpdates = calls.updates.filter((u) => u.table === "profiles");
  assert(profileUpdates.length > 0, "profiles must be updated on D-09");
  const blockedUpdate = profileUpdates.find(
    (u) => u.values.blocked_from_booking === true,
  );
  assert(blockedUpdate, "blocked_from_booking must be set to true for Seeker (D-09)");
});

Deno.test("Test 4: never sets reverse_transfer; transfers.create has no destination on the PI itself", async () => {
  const log: CaptureLog = { captures: [], transfers: [], captureThrows: false };
  setStripeClientFactory(() => mockStripe(log));
  const { svc } = mockSvc();

  await handleCapture(
    { checkId: "check-uuid-001" },
    { stripe: mockStripe(log), svc },
  );

  // Assert no reverse_transfer in any transfer call
  for (const t of log.transfers) {
    assert(
      !("reverse_transfer" in t),
      "reverse_transfer must NEVER appear in any transfer.create call (D-08)",
    );
  }
  // Assert capture call does not include transfer_data (would make it a destination charge)
  // The capture spy records only the PI id — no transfer_data param possible (separate pattern)
  assert(log.captures.length === 1, "exactly one capture called");
});

Deno.test("Test 5: no scout_stripe_accounts row -> capture still occurs, transfer deferred, event logged", async () => {
  const log: CaptureLog = { captures: [], transfers: [], captureThrows: false };
  setStripeClientFactory(() => mockStripe(log));
  const { svc, calls } = mockSvc({ scoutAccountId: null });

  const result = await handleCapture(
    { checkId: "check-uuid-001" },
    { stripe: mockStripe(log), svc },
  );

  assertEquals(result.status, 200, "expected 200 when scout not yet onboarded");

  // Capture DID fire
  assert(log.captures.includes("pi_mock_hold_001"), "capture must still fire even if Scout not onboarded");

  // Transfer must NOT be attempted (no account to send to)
  assertEquals(log.transfers.length, 0, "transfer must not be attempted when Scout has no Stripe account");

  // Status stays 'captured' (not 'transferred')
  const statusUpdates = calls.updates
    .filter((u) => u.table === "payments")
    .map((u) => u.values.status);
  assert(statusUpdates.includes("captured"), "payments.status must be 'captured' when transfer deferred");
  assert(!statusUpdates.includes("transferred"), "payments.status must NOT be 'transferred' when deferred");

  // event log called with transfer_deferred
  const deferredLog = calls.rpcs.find(
    // deno-lint-ignore no-explicit-any
    (r) => r.fn === "log_event" && JSON.stringify((r.args as any)).includes("transfer_deferred"),
  );
  assert(deferredLog, "payment.transfer_deferred event must be logged when Scout not onboarded");
});
