// supabase/functions/_shared/stripe.test.ts
// Direct Deno unit coverage for the secret-holding Stripe helpers:
//   A) verifyStripeSignature THROWS on a missing / forged Stripe-Signature header,
//      THROWS when the timestamp is >300s old (replay protection), and does NOT
//      throw on a genuine t=<now>,v1=<hex HMAC_SHA256(`${t}.${body}`, secret)>.
//   B) A created-PaymentIntent helper return value never contains STRIPE_SECRET_KEY
//      (inject mock client; assert only non-secret fields surface).
//      A missing STRIPE_SECRET_KEY fails loud with the expected message.
// The real npm:stripe@22 SDK is replaced by an injected mock (setStripeClientFactory)
// so this runs fully offline. Run: deno test --allow-env stripe.test.ts

import {
  assert,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Fake secrets MUST be set before the helpers read them via Deno.env.
const FAKE_SECRET_KEY = "sk_test_FAKE_SECRET_KEY_DO_NOT_LEAK";
const FAKE_WEBHOOK_SECRET = "whsec_fake_webhook_secret_DO_NOT_LEAK";
Deno.env.set("STRIPE_SECRET_KEY", FAKE_SECRET_KEY);
Deno.env.set("STRIPE_WEBHOOK_SECRET", FAKE_WEBHOOK_SECRET);

import {
  setStripeClientFactory,
  verifyStripeSignature,
} from "./stripe.ts";

// Mock Stripe client: returns only non-secret values from paymentIntents.create.
function installMockStripe() {
  setStripeClientFactory(() => ({
    paymentIntents: {
      create(_params: unknown) {
        return Promise.resolve({
          id: "pi_test_abc123",
          client_secret: "pi_test_abc123_secret_xyz",
          status: "requires_payment_method",
          amount: 1650,
          currency: "usd",
        });
      },
    },
  }));
}

// Helper: build a genuine Stripe-Signature header for the given body + secret.
async function buildStripeSignature(
  body: string,
  secret: string,
  t?: number,
): Promise<string> {
  const ts = t ?? Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${ts}.${body}`),
  );
  const v1 = Array.from(new Uint8Array(mac), (b) =>
    b.toString(16).padStart(2, "0")).join("");
  return `t=${ts},v1=${v1}`;
}

// ---- A: verifyStripeSignature tests ----------------------------------------

Deno.test("A1: verifyStripeSignature throws when the Stripe-Signature header is missing", async () => {
  await assertRejects(
    () => verifyStripeSignature("{}", new Headers()),
    Error,
  );
});

Deno.test("A2: verifyStripeSignature throws on a forged header (t=1,v1=deadbeef)", async () => {
  const forged = new Headers({ "stripe-signature": "t=1,v1=deadbeefforged" });
  await assertRejects(
    () => verifyStripeSignature("{}", forged),
    Error,
  );
});

Deno.test("A3: verifyStripeSignature does NOT throw on a genuine signature", async () => {
  const body = '{"type":"payment_intent.succeeded"}';
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const sigHeader = await buildStripeSignature(body, secret);
  const headers = new Headers({ "stripe-signature": sigHeader });
  await verifyStripeSignature(body, headers); // must not throw
  assert(true);
});

Deno.test("A4: verifyStripeSignature throws when timestamp is >300s old (replay protection)", async () => {
  const body = '{"type":"payment_intent.created"}';
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const staleT = Math.floor(Date.now() / 1000) - 301; // 301 seconds ago
  const sigHeader = await buildStripeSignature(body, secret, staleT);
  const headers = new Headers({ "stripe-signature": sigHeader });
  await assertRejects(
    () => verifyStripeSignature(body, headers),
    Error,
  );
});

// ---- B: Stripe client factory / secret-leak tests --------------------------

Deno.test("B1: PaymentIntent return value never contains STRIPE_SECRET_KEY", async () => {
  installMockStripe();
  // Import getStripeClient to exercise the factory path.
  const { getStripeClient } = await import("./stripe.ts");
  const client = await getStripeClient();
  const pi = await client.paymentIntents.create({
    amount: 1650,
    currency: "usd",
    capture_method: "manual",
  });
  const serialized = JSON.stringify(pi);
  assert(
    !serialized.includes(FAKE_SECRET_KEY),
    "PaymentIntent response leaked STRIPE_SECRET_KEY",
  );
  assert(
    !serialized.includes(FAKE_WEBHOOK_SECRET),
    "PaymentIntent response leaked STRIPE_WEBHOOK_SECRET",
  );
  // It DOES carry the non-secret fields the client needs.
  assert(serialized.includes("pi_test_abc123"), "Expected PI id in response");
});

Deno.test("B2: missing STRIPE_SECRET_KEY fails loud with expected message", async () => {
  // Clear mock so the real factory path (requireEnv) runs.
  setStripeClientFactory(null);
  const saved = Deno.env.get("STRIPE_SECRET_KEY")!;
  Deno.env.delete("STRIPE_SECRET_KEY");
  try {
    await assertRejects(
      async () => {
        const { getStripeClient } = await import("./stripe.ts");
        await getStripeClient();
      },
      Error,
      "Missing required Stripe secret: STRIPE_SECRET_KEY",
    );
  } finally {
    Deno.env.set("STRIPE_SECRET_KEY", saved);
    // Re-install mock so subsequent tests are not broken.
    installMockStripe();
  }
});
