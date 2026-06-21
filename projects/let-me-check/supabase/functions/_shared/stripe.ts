// supabase/functions/_shared/stripe.ts
// LMC Phase 4 — Payments: the SINGLE secret-holding Stripe client for Edge
// Functions. STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are read ONLY from
// Deno.env here and used internally. No exported helper EVER returns a secret
// value to its caller. Mirrors _shared/mux.ts exactly — same requireEnv pattern,
// same test-seam factory, same native Web Crypto webhook verification.
//
// Stripe webhook signature format (identical to Mux):
//   Stripe-Signature: t=<unix>,v1=<hex HMAC_SHA256(`${t}.${rawBody}`, secret)>
// Pitfall 3 (04-RESEARCH): ignore any scheme other than v1; never accept v0.
// See 04-RESEARCH.md "Code Examples → Stripe Webhook Signature Verification".

// deno-lint-ignore no-explicit-any
type StripeClient = any;

let _client: StripeClient | null = null;
let _factory: (() => StripeClient) | null = null;

/** Read a required Edge-Function secret. Fails LOUD if missing — never defaults. */
function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required Stripe secret: ${name}`);
  return v;
}

/** Test seam ONLY: inject a mock Stripe client so helpers run offline. */
export function setStripeClientFactory(
  factory: (() => StripeClient) | null,
): void {
  _factory = factory;
  _client = null;
}

/** Lazily build (and cache) the Stripe client from Edge-Function secrets. */
async function getStripe(): Promise<StripeClient> {
  if (_client) return _client;
  if (_factory) {
    _client = _factory();
    return _client;
  }
  // Fail loud if the secret key is absent — never silently default.
  const secretKey = requireEnv("STRIPE_SECRET_KEY");
  const { default: Stripe } = await import("npm:stripe@22");
  _client = new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
    // Deno-safe fetch transport; avoids Node-only http/https agent.
  });
  return _client;
}

/**
 * Live Stripe client for Edge Function entrypoints. The handlers call
 * client.paymentIntents.create / client.paymentIntents.capture / etc.
 * directly so they stay unit-testable with an injected mock.
 * Never returned to a caller outside the Edge Function — secrets stay inside.
 */
export async function getStripeClient(): Promise<StripeClient> {
  return await getStripe();
}

/**
 * Verify the Stripe webhook signature BEFORE the body is trusted. Throws on a
 * missing / forged `stripe-signature` header or a timestamp outside the 300s
 * replay window. Returns nothing — never a secret.
 *
 * Stripe scheme: `Stripe-Signature: t=<unix>,v1=<hex>`
 * Signed payload: `${t}.${rawBody}` (identical to Mux — see mux.ts).
 * Only `v1` scheme is accepted (Pitfall 3: never accept v0).
 */
export async function verifyStripeSignature(
  rawBody: string,
  headers: Headers,
): Promise<void> {
  const secret = requireEnv("STRIPE_WEBHOOK_SECRET");
  // Accept both canonical and lowercase header names.
  const sigHeader =
    headers.get("stripe-signature") ??
    headers.get("Stripe-Signature") ??
    "";
  // Parse the comma-separated key=value pairs.
  const fields: Record<string, string> = {};
  for (const pair of sigHeader.split(",")) {
    const idx = pair.indexOf("=");
    if (idx > 0) fields[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
  const t = fields["t"];
  const v1 = fields["v1"];
  if (!t || !v1) throw new Error("missing stripe signature");
  // Replay protection: reject signatures whose timestamp is >300s off (5 min).
  const skew = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
  if (!Number.isFinite(skew) || skew > 300) {
    throw new Error("stripe signature timestamp outside tolerance");
  }
  // HMAC-SHA256 over `${t}.${rawBody}` with the webhook secret.
  // Uses native Web Crypto (crypto.subtle) — zero SDK dependency, constant-time.
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const macBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${t}.${rawBody}`),
  );
  const expected = Array.from(
    new Uint8Array(macBuf),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  // Constant-time compare — prevents timing oracle (T-04-01).
  if (expected.length !== v1.length) throw new Error("bad stripe signature");
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  if (diff !== 0) throw new Error("bad stripe signature");
}
