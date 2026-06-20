---
phase: 03-video-pipeline
plan: 02
subsystem: video-pipeline-edge-functions
tags: [mux, edge-functions, webhook, signed-playback, deno, security]
requires:
  - "Phase 2 transition_check / clips table (called as the post-0010 contract)"
  - "03-01 Wave-0 Deno scaffolds (mux-webhook / mux-upload-url / mux-playback-token index.test.ts)"
provides:
  - "supabase/functions/_shared/mux.ts (secret-holding Mux client + verifyMuxSignature + signPlaybackToken + createMuxUpload + getMuxClient + signingKeyOpts)"
  - "supabase/functions/_shared/supabase.ts (serviceClient + authedClient factories)"
  - "mux-upload-url (assigned-scout-only signed direct-upload mint)"
  - "mux-webhook (signature-verified, idempotent finalize + sole delivered driver)"
  - "mux-playback-token (owning-Seeker-only 1h signed playback JWT)"
affects:
  - "03-03 (RN client wiring of upload-url + playback-token)"
  - "03-04 (Wave-2 deploy + Mux secrets + webhook registration)"
tech-stack:
  added:
    - "@mux/mux-node@14 (Deno npm: import, Edge-Function only — never bundled in the app)"
    - "@supabase/supabase-js@2 (Edge-Function service + authed clients)"
    - "Deno test runtime (installed locally at ~/.deno for offline unit tests)"
  patterns:
    - "token-handoff: client never holds a Mux secret, only a single-use upload URL + a 1h playback JWT"
    - "verify-before-trust webhook + idempotent-on-clip-status finalize"
    - "injectable deps (mux/svc/verify) so handlers unit-test offline with mocks"
key-files:
  created:
    - "supabase/functions/_shared/mux.ts"
    - "supabase/functions/_shared/supabase.ts"
    - "supabase/functions/_shared/mux.test.ts"
    - "supabase/functions/mux-webhook/index.ts"
    - "supabase/functions/mux-upload-url/index.ts"
    - "supabase/functions/mux-playback-token/index.ts"
  modified: []
decisions:
  - "Mux secrets read ONLY via Deno.env inside _shared/mux.ts; no exported helper returns a secret (asserted by a direct Deno test)."
  - "The webhook is the SOLE driver of `delivered`, via transition_check as the service role — a dropped client network can never fake delivery."
  - "Conformed the two mint handlers to the 03-01 Wave-0 scaffold signature ({checkId, callerId}, {mux, svc}) rather than the plan's authedClient(req) sketch, so the authoritative scaffolds turn green."
metrics:
  duration_min: 16
  tasks: 3
  files: 6
  tests: 13
  completed: 2026-06-21
---

# Phase 3 Plan 02: Mux Edge Functions (Wave 1) Summary

Authored the three net-new Supabase Edge Functions that are the entire server side of the video pipeline — a signed Mux upload-URL mint, a signature-verified idempotent finalize webhook, and a per-Seeker signed playback-token mint — plus the secret-holding `_shared/mux.ts` and the `_shared/supabase.ts` client factories, all unit-tested OFFLINE with mocked Mux + Supabase (13 Deno tests green). No live deploy (that is the Wave-2 03-04 checkpoint).

## What was built

- **`_shared/mux.ts`** — the single secret holder. Reads `MUX_TOKEN_ID/SECRET`, `MUX_WEBHOOK_SECRET`, `MUX_SIGNING_KEY_ID/PRIVATE_KEY` only via `Deno.env`, fails loud if any required secret is missing. Exports `verifyMuxSignature` (throws on bad/missing signature), `signPlaybackToken` (1h signed JWT), `createMuxUpload` (`playback_policy: ['signed']`, `passthrough=checkId`), plus `getMuxClient()` + `signingKeyOpts()` for the live entrypoints. A test seam (`setMuxClientFactory`) injects a mock so the helpers run with no network.
- **`_shared/supabase.ts`** — `serviceClient()` (service role, bypasses RLS, used by the webhook as the system actor) and `authedClient(req)` (carries the caller's bearer so RLS + `auth.uid()` apply).
- **`mux-webhook/index.ts`** — reads the raw body, `verifyMuxSignature` BEFORE trusting anything (bad sig -> 401, no DB write), idempotent (duplicate `video.asset.ready` on a `ready` clip -> 200 `ok (dup)`), picks the SIGNED playback id, finalizes the clip (`mux_asset_id`, `mux_playback_id`, `mux_playback_policy='signed'`, `duration_secs`, `status='ready'`), then drives `transition_check` uploaded -> processing -> delivered as the service role. `video.asset.errored` -> clip `errored`, never delivered; other event types ignored.
- **`mux-upload-url/index.ts`** — assigned-scout-only (and only while the check is `assigned`/`filming`); mints a signed Mux direct-upload (`passthrough=checkId`), sets the clip `mux_upload_id` + `status='pending'`, returns `{ uploadUrl, uploadId }`. Non-assigned caller -> 403; unauthenticated -> 401.
- **`mux-playback-token/index.ts`** — owning-Seeker-only (`seeker_id === callerId`, NOT the scout); mints a 1h signed playback JWT for the clip's `mux_playback_id`, returns `{ token }`. Non-owner -> 403; clip not ready -> 409.

## Test coverage (offline, mocked)

| File | Tests | Proves |
|------|-------|--------|
| `_shared/mux.test.ts` | 6 | forged/missing signature throws; valid signature passes; `createMuxUpload`/`signPlaybackToken` return values never contain a secret; missing `MUX_TOKEN_SECRET` fails loud |
| `mux-webhook/index.test.ts` | 3 | bad sig -> 401 + no DB write; valid ready -> signed-pb finalize + uploaded->processing->delivered; duplicate -> `ok (dup)` no re-drive |
| `mux-upload-url/index.test.ts` | 2 | assigned scout -> signed upload (passthrough) + clip pending; non-assigned -> 403, no upload |
| `mux-playback-token/index.test.ts` | 2 | token minted only for owning seeker; non-owner -> 403, no token |

`deno test --allow-env --allow-net supabase/functions/` -> **13 passed | 0 failed.**

## Deviations from Plan

### Auto-fixed / blocking issues (Rule 3)

**1. [Rule 3 - Blocking] Deno was not installed**
- **Found during:** Task 1 (pre-flight).
- **Issue:** `deno` was not on the machine, so the plan's `deno test` acceptance commands could not run.
- **Fix:** Installed Deno 2.8.3 to `~/.deno` (user-local, no system changes). All offline tests run via `PATH="$HOME/.deno/bin:$PATH"`.
- **Files modified:** none (tooling only).

**2. [Rule 3 - Blocking] Wave-0 scaffolds (03-01) were authored mid-execution and the webhook implementation was reverted once**
- **Found during:** Task 2 / Task 3.
- **Issue:** The 03-01 Wave-0 Deno scaffolds (`index.test.ts` for the three functions) landed during this session. The reconcile that introduced them also reverted my `mux-webhook/index.ts` to the not-yet-implemented (RED) state at one point.
- **Fix:** Restored `mux-webhook/index.ts` from its commit (`37dc09c`); re-ran tests green.

### Contract adjustment (Rule 1 — correctness against the authoritative interface)

**3. [Rule 1 - Interface] Conformed the two mint handlers to the Wave-0 scaffold signature**
- **Found during:** Task 3.
- **Issue:** The plan body sketched `handleUploadUrl(req, { authed, svc, createUpload })`, but the authoritative 03-01 Wave-0 scaffold pins `handleUploadUrl({ checkId, callerId }, { mux, svc })` (and likewise `handlePlaybackToken`). The scaffold asserts directly on the `mux.video.uploads.create` payload and on `mux.jwt.signPlaybackId`.
- **Fix:** Rewrote both handlers to the scaffold signature — the core logic takes a resolved `callerId` and a `{ mux, svc }` deps bag; the `Deno.serve` entrypoint resolves the caller from the bearer (`authedClient` + `auth.getUser()`) and supplies the live Mux client (`getMuxClient`) + signing-key opts. Net effect is identical security (scout/seeker ownership enforced before any Mux call) and the scaffolds turn green.
- **Files modified:** `mux-upload-url/index.ts`, `mux-playback-token/index.ts`, `_shared/mux.ts` (added `getMuxClient` + `signingKeyOpts`).

## Threat model coverage

| Threat ID | Mitigation delivered |
|-----------|----------------------|
| T-03-04 (forged webhook) | `verifyMuxSignature` rejects before any DB write; direct test (forged/missing -> throws) + webhook test (bad sig -> 401, no write). |
| T-03-05 (non-owner watches) | `mux-playback-token` mints only for `seeker_id === callerId`; asset is signed-policy so the stream needs the JWT; non-owner -> 403. |
| T-03-06 (wrong uploader) | `mux-upload-url` requires `scout_id === callerId` + status assigned/filming; non-assigned -> 403. |
| T-03-07 (secret leaks to client) | Secrets only via `Deno.env` in `_shared`; functions return only an upload URL / 1h JWT; `mux.test.ts` asserts no helper return value contains a secret; grep gates confirm no secret literal in `supabase/functions` and none in `lmc-app/`. |
| T-03-08 (duplicate double-deliver) | Idempotent on clip `status='ready'`; `passthrough=checkId` makes order irrelevant. |

## Ready for Wave 2 (03-04)

These functions are authored and offline-green but NOT deployed. The Wave-2 deploy checkpoint (03-04) must:
1. Create the Mux account + API token, webhook signing secret, and a signing key for signed playback.
2. `supabase secrets set` the five `MUX_*` secrets (never `EXPO_PUBLIC_`, never committed).
3. `supabase functions deploy` the three functions.
4. Register the `mux-webhook` URL in the Mux dashboard, subscribing to `video.asset.ready` + `video.asset.errored`.

These functions also assume migration `0010_clips_mux.sql` (03-01) has added the Mux clip columns + the service-actor allowance in `transition_check` for `uploaded/processing/delivered`. The webhook's three `transition_check` calls are written to that post-0010 contract.

## Self-Check: PASSED

- Files: all 6 implementation files FOUND.
- Commits: `f9c82ea` (shared helpers), `37dc09c` (webhook), `e3f7093` (mint endpoints) all FOUND.
- Tests: 13 Deno tests pass (`deno test --allow-env --allow-net supabase/functions/`).
- Security: no Mux secret literal in `supabase/functions`; no Mux secret / `EXPO_PUBLIC_MUX` anywhere in `lmc-app/`.
