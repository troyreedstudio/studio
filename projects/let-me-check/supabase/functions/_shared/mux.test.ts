// supabase/functions/_shared/mux.test.ts
// Direct Deno unit coverage for the secret-holding Mux helpers (the webhook's own
// coverage is one level removed, so these helpers are tested directly here):
//   A) verifyMuxSignature THROWS on a missing / forged `mux-signature` header.
//   B) createMuxUpload + signPlaybackToken NEVER return a value containing a Mux
//      secret (MUX_TOKEN_SECRET / MUX_SIGNING_PRIVATE_KEY).
// The real @mux/mux-node SDK is replaced by an injected mock (setMuxClientFactory)
// so this runs fully offline. Run: deno test --allow-env mux.test.ts
import {
  assert,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// Fake secrets MUST be set before the helpers read them via Deno.env.
const FAKE_TOKEN_SECRET = "fake-token-secret-DO-NOT-LEAK";
const FAKE_PRIVATE_KEY = "fake-private-key-DO-NOT-LEAK";
Deno.env.set("MUX_TOKEN_ID", "fake-token-id");
Deno.env.set("MUX_TOKEN_SECRET", FAKE_TOKEN_SECRET);
Deno.env.set("MUX_WEBHOOK_SECRET", "fake-webhook-secret");
Deno.env.set("MUX_SIGNING_KEY_ID", "fake-signing-key-id");
Deno.env.set("MUX_SIGNING_PRIVATE_KEY", FAKE_PRIVATE_KEY);

import {
  createMuxUpload,
  setMuxClientFactory,
  signPlaybackToken,
  verifyMuxSignature,
} from "./mux.ts";

// Mock Mux client: verifySignature rejects unless a VALID signature header is set;
// uploads.create + jwt.signPlaybackId return ONLY non-secret values.
function installMockMux() {
  setMuxClientFactory(() => ({
    webhooks: {
      verifySignature(_body: string, headers: Headers, _secret: string) {
        const sig = headers.get("mux-signature");
        if (!sig || sig !== "valid-signature") {
          throw new Error("Mux signature verification failed");
        }
        // valid -> returns nothing (matches SDK behavior)
      },
    },
    video: {
      uploads: {
        // Returns ONLY an id + upload url — never echoes any secret.
        create(_opts: unknown) {
          return Promise.resolve({
            id: "upload_abc123",
            url: "https://storage.googleapis.com/mux-uploads/upload_abc123",
          });
        },
      },
    },
    jwt: {
      // Returns ONLY a short-lived token string — never the signing private key.
      signPlaybackId(_id: string, _opts: unknown) {
        return Promise.resolve("eyJ.fake.playback.jwt");
      },
    },
  }));
}

Deno.test("A1: verifyMuxSignature throws when the mux-signature header is missing", async () => {
  installMockMux();
  await assertRejects(
    () => verifyMuxSignature("{}", new Headers()),
    Error,
  );
});

Deno.test("A2: verifyMuxSignature throws on a forged mux-signature header", async () => {
  installMockMux();
  const forged = new Headers({ "mux-signature": "t=1,v1=deadbeef-forged" });
  await assertRejects(
    () => verifyMuxSignature("{}", forged),
    Error,
  );
});

Deno.test("A3: verifyMuxSignature does NOT throw on a correctly-signed body", async () => {
  installMockMux();
  const good = new Headers({ "mux-signature": "valid-signature" });
  await verifyMuxSignature('{"type":"video.asset.ready"}', good); // must not throw
  assert(true);
});

Deno.test("B1: createMuxUpload return value never contains a Mux secret", async () => {
  installMockMux();
  const upload = await createMuxUpload("check-123");
  const serialized = JSON.stringify(upload);
  assert(
    !serialized.includes(FAKE_TOKEN_SECRET),
    "createMuxUpload leaked MUX_TOKEN_SECRET",
  );
  assert(
    !serialized.includes(FAKE_PRIVATE_KEY),
    "createMuxUpload leaked MUX_SIGNING_PRIVATE_KEY",
  );
  // It DOES carry the (non-secret) upload id + url the client needs.
  assertStringIncludes(serialized, "upload_abc123");
});

Deno.test("B2: signPlaybackToken return value never contains a signing secret", async () => {
  installMockMux();
  const token = await signPlaybackToken("playback_xyz");
  assert(
    !token.includes(FAKE_TOKEN_SECRET),
    "signPlaybackToken leaked MUX_TOKEN_SECRET",
  );
  assert(
    !token.includes(FAKE_PRIVATE_KEY),
    "signPlaybackToken leaked MUX_SIGNING_PRIVATE_KEY",
  );
});

Deno.test("B3: a missing MUX_TOKEN_SECRET fails loud (no silent default)", async () => {
  // No mock factory -> real getMux() path runs requireEnv first.
  setMuxClientFactory(null);
  const saved = Deno.env.get("MUX_TOKEN_SECRET")!;
  Deno.env.delete("MUX_TOKEN_SECRET");
  try {
    await assertRejects(
      () => createMuxUpload("check-123"),
      Error,
      "Missing required Mux secret: MUX_TOKEN_SECRET",
    );
  } finally {
    Deno.env.set("MUX_TOKEN_SECRET", saved);
  }
});
