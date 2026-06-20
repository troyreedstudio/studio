// supabase/functions/_shared/mux.ts
// LMC Phase 3 — Video Pipeline: the SINGLE secret-holding Mux client for the Edge
// Functions. Mux token id/secret + signing keys + the webhook signing secret are
// read ONLY from Deno.env here and used internally. No exported helper EVER returns
// a secret value to its caller (the app only ever receives a single-use upload URL
// or a 1h playback JWT). See 03-RESEARCH.md Patterns 2/4/5 + Anti-Patterns.

// The real SDK is a Deno `npm:` import; lazily resolved so unit tests can inject a
// mock client (setMuxClientFactory) without any network/registry access.
// deno-lint-ignore no-explicit-any
type MuxClient = any;

let _client: MuxClient | null = null;
let _factory: (() => MuxClient) | null = null;

/** Read a required Edge-Function secret. Fails LOUD if missing — never defaults. */
function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing required Mux secret: ${name}`);
  return v;
}

/** Test seam ONLY: inject a mock Mux client so helpers run offline. */
export function setMuxClientFactory(factory: (() => MuxClient) | null): void {
  _factory = factory;
  _client = null;
}

/** Lazily build (and cache) the Mux client from Edge-Function secrets. */
async function getMux(): Promise<MuxClient> {
  if (_client) return _client;
  if (_factory) {
    _client = _factory();
    return _client;
  }
  // Fail loud if the core token secrets are absent — never silently default.
  const tokenId = requireEnv("MUX_TOKEN_ID");
  const tokenSecret = requireEnv("MUX_TOKEN_SECRET");
  const { default: Mux } = await import("npm:@mux/mux-node@14");
  _client = new Mux({ tokenId, tokenSecret });
  return _client;
}

/**
 * Live Mux client for the entrypoints that pass it into a handler ({ mux }).
 * The handlers call mux.video.uploads.create / mux.jwt.signPlaybackId directly so
 * they stay unit-testable with an injected mock. Never returned to a CALLER —
 * only used inside an Edge Function. Use signingKeyOpts() to supply the JWT key.
 */
export async function getMuxClient(): Promise<MuxClient> {
  return await getMux();
}

/** The signed-playback JWT options (1h), including the signing key from env. */
export function signingKeyOpts(): {
  type: "video";
  expiration: string;
  keyId: string;
  keySecret: string;
} {
  return {
    type: "video",
    expiration: "1h",
    keyId: requireEnv("MUX_SIGNING_KEY_ID"),
    keySecret: requireEnv("MUX_SIGNING_PRIVATE_KEY"),
  };
}

/**
 * Verify the Mux webhook signature BEFORE the body is trusted. Throws on a
 * missing / forged `mux-signature` header. Returns nothing — never a secret.
 */
export async function verifyMuxSignature(
  rawBody: string,
  headers: Headers,
): Promise<void> {
  const secret = requireEnv("MUX_WEBHOOK_SECRET");
  const mux = await getMux();
  // The SDK reads the `mux-signature` header from the Headers object and does a
  // constant-time compare; it throws on a bad/missing signature.
  mux.webhooks.verifySignature(rawBody, headers, secret);
}

/**
 * Mint a 1h signed Mux playback JWT for a SIGNED playback id. The returned string
 * is a short-lived token scoped to one playback id — it is NOT a Mux secret.
 */
export async function signPlaybackToken(playbackId: string): Promise<string> {
  const keyId = requireEnv("MUX_SIGNING_KEY_ID");
  const keySecret = requireEnv("MUX_SIGNING_PRIVATE_KEY");
  const mux = await getMux();
  // mux.jwt.signPlaybackId -> RS256 JWT with sub=playbackId, aud='v', exp=1h.
  return await mux.jwt.signPlaybackId(playbackId, {
    type: "video",
    expiration: "1h",
    keyId,
    keySecret,
  });
}

/**
 * Create a single-use Mux DIRECT-UPLOAD tied to the check via passthrough=checkId,
 * with playback_policy: ['signed'] so the resulting asset is private. Returns the
 * Mux upload object ({ id, url }) — the url is a single-use upload target, not a
 * secret. The check correlation key (passthrough) makes webhook order irrelevant.
 */
export async function createMuxUpload(
  checkId: string,
): Promise<{ id: string; url: string }> {
  const mux = await getMux();
  const upload = await mux.video.uploads.create({
    cors_origin: "*",
    new_asset_settings: {
      playback_policy: ["signed"],
      passthrough: checkId,
    },
  });
  return { id: upload.id, url: upload.url };
}
