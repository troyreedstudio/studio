# Phase 3: Video Pipeline - Research

**Researched:** 2026-06-21
**Domain:** Real in-app camera capture (audio-stripped, fresh-capture-only) + a token-handoff Mux direct-upload pipeline (device → signed Mux URL → transcode → CDN), finalized by a signature-verified Mux webhook into the existing Postgres check state machine, played back scoped to the buying Seeker — all wired behind the existing RN/Expo prototype screens.
**Confidence:** HIGH on the pipeline shape and the Phase-2 seam (read the live `clips` table, `transition_check` guard, `markDelivered` stub, and the three screens this session). MEDIUM on exact vision-camera v4 recording-API surface and the precise Edge-Function/Mux SDK call shapes (verified against current Mux + vision-camera docs, but the on-device camera and live Mux account are real-hardware checkpoints, flagged in the Assumptions Log).

## Summary

Phase 2 deliberately left a clean seam: a `clips` table exists, `markDelivered()` inserts a `status:'stub'` clip row then transitions the check to `delivered`, and the server's `transition_check` guard already refuses `delivered` without a clip row. Phase 3's job is to **replace the stub with a real clip** without changing the check state machine's shape. Nothing about the Seeker's live-status watch (Phase 2's Realtime spine) changes — only *what fills the clip row* and *what the delivery screen plays*.

The architecture is locked and correct (`.planning/research/ARCHITECTURE.md` Pattern 3, "token-handoff"): the device never holds a Mux secret. A Supabase **Edge Function** mints a single-use Mux **direct-upload URL** tied to the check via `passthrough=checkId`; the device records a 15-second, **audio-off** clip with `react-native-vision-camera` and `PUT`s the file straight to Mux (the clip never touches our server); Mux transcodes and fires a **`video.asset.ready`** webhook to a second, **signature-verified, idempotent** Edge Function, which finalizes the `clips` row (`mux_asset_id`, `mux_playback_id`, `status='ready'`) and drives the check `filming → uploaded → processing → delivered` via the existing `transition_check`. The Seeker's already-live Realtime subscription flips the screen to delivered automatically, and `delivery.tsx` plays the real HLS stream (`https://stream.mux.com/{playback_id}.m3u8`) through `expo-video` (already installed and already used by `venue.tsx`). Playback is kept private to the buyer with Mux **signed playback** — a short-lived JWT minted per Seeker by a third small Edge Function.

Two non-negotiable legal/quality constraints shape capture: **audio is never recorded** (vision-camera records video-only by default — `audio={false}` — so audio is off *at the API*, never captured; this sidesteps all-party-consent law and is a hard requirement) and **fresh-capture is enforced** (the clip path must come only from the live camera recorder — there is **no `expo-image-picker`/gallery import path in the app at all**, which is the simplest and strongest enforcement). Resilient upload is handled by **`expo-file-system`'s `createUploadTask`** (Mux's own official RN recommendation) with a local-first persist + retry wrapper, and — critically — the check is **only marked delivered by the webhook**, never by the client's optimistic upload-complete, so a dropped network can never produce a "delivered" check with no playable clip.

**Primary recommendation:** Add Mux columns to `clips` (additive migration) + three Edge Functions (`mux-upload-url`, `mux-webhook`, `mux-playback-token`); wire `filming.tsx` to a real vision-camera recorder (audio off, 15s cap, no gallery path) that uploads via `expo-file-system` to the minted URL; let the **webhook** finalize the clip and transition the check; wire `delivery.tsx` to play the real signed Mux HLS through the existing `expo-video`. Keep `markDelivered`'s "insert clip before transition" ordering, but the *real* transition to `delivered` now happens server-side in the webhook, not client-side.

<user_constraints>
## User Constraints

> **No `CONTEXT.md` exists for this phase** (no `/gsd-discuss-phase` was run). The constraints below are the binding scope signals from the orchestrator prompt, `PROJECT.md`, `ROADMAP.md`, `docs/STACK.md`, and the Phase-2 deliverables. They are authoritative — research HOW within these lines, not WHETHER.

### Locked Decisions (from PROJECT.md, ROADMAP.md, additional_context)
- **Capture library = `react-native-vision-camera`** (NOT expo-camera, NOT ffmpeg-kit which is retired). Audio off at the API; 15s cap; config plugin + Info.plist camera usage string. Requires an EAS dev build (not Expo Go) — already the project's reality (Mapbox + Build 9 already need it).
- **Audio is NEVER recorded (VID-02).** Hard legal requirement (all-party-consent states make audio a felony). Audio off at the recording API so it is never captured — not stripped after the fact.
- **Fresh-capture enforced (VID-01).** A Scout films a LIVE clip in-app; camera-roll/gallery import is BLOCKED. The clip the upload sends must originate from the live recorder.
- **Video host = Mux** via **direct (resumable) upload to a signed Mux URL minted server-side** by a Supabase Edge Function. The client NEVER holds Mux secrets (token-handoff pattern). Clip uploads **device-direct; no video ever touches our server.**
- **Finalize via a Mux webhook** (`video.asset.ready`) → an Edge Function sets the clip's playback id and transitions the check to `delivered`. Webhook must be **signature-verified and idempotent**.
- **Playback scoped to the buying Seeker (VID-04).** Use Mux **signed playback** (JWT) or RLS-gated access so only the owning Seeker can watch the clip.
- **Build ON Phase 2, do not rebuild.** The `clips` table, `transition_check`/`accept_check`, `markDelivered` stub flow, the deliver-needs-clip guard, and `lib/checks.ts`/`lib/realtime.ts` already exist and are committed. Extend them. Replace the stub clip with the real upload→Mux→ready flow. Keep `delivered`-requires-a-clip honest.
- **Resilient upload on weak networks (VID-03).** Resumable, retried, persisted locally first; the check is NOT marked delivered until the server (Mux webhook) confirms receipt.
- **Server owns secrets; thin client; no business logic on client** (DATA-02, CLAUDE.md). Mux keys + signing keys live only in Edge Functions.
- **Managed services over custom infra** — no self-hosted transcode, no S3 bucket to manage (Mux is the pipeline).
- **Market-aware / international-ready** — don't hard-code USD or US-only assumptions (carries forward; clips are market-neutral so low impact here).
- **Stay on React Native + Expo, iOS-first. No rewrite.** Wire behind the existing `filming.tsx` / `submitted.tsx` / `delivery.tsx` screens.
- **Files under 500 lines; never save working files/tests/docs to repo root** (CLAUDE.md).

### Claude's Discretion (recommend in this research)
- Resumable-upload mechanism on the device: `expo-file-system` `createUploadTask` (Mux's official RN guide) vs `@mux/upchunk` vs a TUS client (recommended below: **`expo-file-system` `createUploadTask`** — UpChunk relies on browser `Blob.slice`/`File` which RN lacks; Mux explicitly documents `createUploadTask` for RN).
- Signed playback (per-Seeker JWT) vs public playback + RLS gating (recommended: **signed playback** — RLS protects the *row*, not the Mux CDN URL; only a JWT keeps the actual stream private).
- Exact `clips` columns to add (recommended below: `mux_upload_id`, `mux_asset_id`, `mux_playback_id`, `mux_playback_policy`, `duration_secs`, `status` lifecycle values).
- Whether intermediate states `uploaded`/`processing` are driven (they already exist in the enum) or the check goes `filming → delivered` directly (recommended: **drive `uploaded` and `processing`** so the Seeker sees honest progress and the event log is complete — the enum and `is_valid_check_transition` already anticipate them).
- vision-camera recording API surface (the simple `<Camera video audio={false}>` + `startRecording`/`onRecordingFinished` v4 stable API vs the newer outputs/recorder API) — recommend the **stable `video`/`audio` prop + `startRecording` API** for SDK 54 + RN 0.81.
- Whether to keep `filming.tsx`'s simulated `CameraViewfinder` modal as the visual chrome (overlaying the real camera preview) or replace it (recommended: keep the chrome, swap the dark placeholder for a real `<Camera>` preview underneath).

### Deferred Ideas (OUT OF SCOPE for Phase 3)
- **Payments / earnings credit** — Phase 4. `submitted.tsx` must NOT credit earnings; keep the Phase-2 `// TODO(phase-4)` discipline. No Stripe.
- **Real-time geo-dispatch, geofence, atomic-claim-at-scale** — Phase 5. A Scout still reaches `filming` via the Phase-2 manual accept.
- **GPS-stamp *verification* / spoof rejection / signage AI / AI Verdict / reference-photo confirm** — Phases 5/6. This phase may *capture* a GPS stamp onto the clip row (`filmed_lat/lng` already exist) but does NOT verify it falls in a fence or run any AI. The `delivery.tsx` "AI VERDICT" line + crowd tags stay STATIC placeholder UI.
- **Push notifications** ("your clip is ready") — Phase 7. The Seeker learns of delivery via the existing in-app Realtime subscription, not APNs/FCM.
- **Durable job runner (Inngest/Trigger.dev)** — first load-bearing in Phase 4. Do NOT build a job runner here; the Mux webhook is event-driven (Mux retries on its own), so no timer is needed for the happy path. An upload-never-completes timeout is a Phase-5 concern.
- **Multi-take server retention / clip library / re-encode** — not now. One delivered clip per check (`getCheckClip` uses `.maybeSingle()`).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support (how this phase satisfies it) |
|----|-------------|------------------------------------------------|
| **VID-01** | A Scout films a **live** 15s clip in-app; **gallery/camera-roll import is blocked** (fresh-capture) | `react-native-vision-camera` `<Camera video audio={false}>` + `startRecording`; auto-stop at 15s. Fresh-capture enforced by **never adding any gallery/`expo-image-picker` path** — the upload's source path comes only from `onRecordingFinished`'s `path`. The recorder writes to an app-private temp file, not the camera roll. |
| **VID-02** | Clips are **video-only — audio is stripped/never recorded** | vision-camera records **video-only by default**; pass `audio={false}` explicitly and set the config plugin `enableMicrophonePermission:false`. No mic stream is opened, so audio is never captured (stronger than post-hoc stripping). Remove the now-false `NSMicrophoneUsageDescription` from `app.config.js`. |
| **VID-03** | Upload is resilient on weak mobile networks (resumable/retried) | `expo-file-system` `createUploadTask` (Mux's official RN method) PUTs to the resumable Mux upload URL; a local-first persist (keep the temp file until confirmed) + bounded retry wrapper. **The check is marked delivered only by the Mux webhook**, never by the client — a dropped network cannot fake delivery. |
| **VID-04** | Clips are transcoded and streamed via CDN (Mux); Seeker playback is smooth + scoped to the buyer | Mux direct-upload → transcode → HLS CDN. `delivery.tsx` plays `https://stream.mux.com/{playback_id}.m3u8?token={jwt}` via the installed `expo-video`. **Signed playback** (per-Seeker JWT minted by an Edge Function) keeps the clip private to its buyer. |
| **CHECK-04** (end-to-end) | A filmed clip is uploaded, processed, and delivered to the Seeker | The whole pipeline above closes CHECK-04: the *real* clip arrives. Phase 2 proved the state flow with a stub; Phase 3 makes the clip genuine. The webhook driving `filming → uploaded → processing → delivered` is the through-line. |
</phase_requirements>

## Standard Stack

This phase adds the **camera + upload client libs** and a **server-side Mux SDK** (Edge Functions only). The realtime/playback transports already exist.

### Core (verify versions at install)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native-vision-camera` | **^4.7.x** (latest 4.x at install — `[VERIFIED: visioncamera.margelo.com docs current; npm page 403 in Phase-2, confirm exact patch at install]`) | Live in-app capture; `audio={false}` video-only; 15s cap; frame-processor-ready for Phase-6 on-device AI | The forward choice over expo-camera (which lacks frame processors). First-class Expo config plugin; needs an EAS dev build (already the project's reality). `[CITED: .planning/research/STACK.md]` |
| `expo-file-system` | **~56.0.8** `[VERIFIED: npm registry 2026-06-21]` | `createUploadTask` resumable PUT to the Mux upload URL — Mux's official RN upload method | Already an Expo SDK-54 module; handles background-capable uploads + progress; avoids UpChunk's browser-`Blob` dependency. `[CITED: mux.com/docs/frameworks/react-native-uploading-videos]` |
| `expo-video` | **~3.0.16** (already installed; `venue.tsx` already uses `useVideoPlayer`) `[VERIFIED: lmc-app/package.json]` | Plays the real Mux HLS clip in `delivery.tsx` | Already in the app; Mux delivers HLS natively supported on iOS/Android. The Mux signed HLS URL slots straight into `useVideoPlayer`. `[CITED: mux.com/docs/frameworks/react-native-video-playback]` |
| `@mux/mux-node` | **^14.1.1** `[VERIFIED: npm registry 2026-06-21]` | **Server-side only** (Edge Functions): mint direct-upload URL, sign playback JWTs, verify webhook signatures | Mux's official server SDK. NEVER bundled into the RN app — Edge-Function only (secret holder). `[CITED: ARCHITECTURE.md token-handoff]` |
| `@supabase/supabase-js` | **^2.108.2** (already installed) | The webhook Edge Function calls `transition_check` via the service-role client; the app calls the upload-url + playback-token functions | Already wired; functions reuse it server-side. |

### Supporting (server-side SQL + Edge Functions — net-new, no app-bundle npm)
| Artifact | Purpose | When to Use |
|----------|---------|-------------|
| Migration `0010_clips_mux.sql` | Add `mux_upload_id`, `mux_asset_id`, `mux_playback_id`, `mux_playback_policy`, `duration_secs` to `clips`; widen `clips.status` lifecycle (`pending`→`uploaded`→`ready`/`errored`, replacing `stub`); index on `mux_asset_id` + `mux_upload_id` (webhook lookup) | The schema seam Phase 3 fills additively |
| Edge Function `mux-upload-url` | Authenticated Seeker-or-Scout call → mints a Mux direct upload with `passthrough=checkId`, `new_asset_settings.playback_policy=['signed']`; inserts/updates the `clips` row to `status='pending'` with `mux_upload_id`; returns the upload URL | Scout taps "submit clip" |
| Edge Function `mux-webhook` | Mux POSTs `video.asset.ready` (+ `video.upload.asset_created`, `video.asset.errored`); **verify Mux signature**; idempotent (dedupe on event id / asset id); set `clips.mux_asset_id/playback_id/status='ready'`; drive the check `filming→uploaded→processing→delivered` via `transition_check` (service role) | Mux finalizes the asset |
| Edge Function `mux-playback-token` | Authenticated owning Seeker → verify they own the check (RLS/explicit check) → sign a short-lived Mux playback JWT (`sub=playback_id`, `aud=v`, `exp`) | `delivery.tsx` loads to fetch a token before playing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| **`expo-file-system` `createUploadTask`** | **`@mux/upchunk`** | UpChunk is browser-first: it chunks via `Blob.slice`/`File`, which **React Native does not implement**. Mux's own RN guide uses `createUploadTask` with a PUT. `createUploadTask` also gives upload progress + survives app backgrounding better. **Recommend `createUploadTask`.** `[CITED: github.com/muxinc/upchunk README — browser File/Blob; mux.com/docs/frameworks/react-native-uploading-videos]` |
| **`expo-file-system` `createUploadTask`** | **`tus-js-client`** (4.3.1) | Mux direct upload uses `Content-Range`-based resumability, **not the TUS protocol** — so a TUS client doesn't match Mux's endpoint. **Reject TUS for Mux.** `[CITED: mux.com/docs/guides/upload-files-directly — "Mux does not use the tus protocol"]` |
| **Signed playback (per-Seeker JWT)** | **Public playback + RLS on the clip row** | RLS protects who can read the `clips` *row* (the playback id), but once a client has the id, a **public** Mux URL is watchable by anyone. Signed playback makes the *stream itself* require a JWT only your server mints for the owning Seeker. **Recommend signed playback for VID-04's "scoped to the buyer".** `[CITED: mux.com/docs/guides/secure-video-playback]` |
| **vision-camera** | **expo-camera** | expo-camera can record video and is simpler, but lacks frame processors needed for Phase-6 on-device signage/blur AI; the stack is already locked to vision-camera. **Keep vision-camera.** `[CITED: .planning/research/STACK.md "What NOT to Use"]` |
| **Webhook drives `delivered`** | **Client marks delivered on upload-complete** (Phase-2 `markDelivered`) | Client-driven delivery means a dropped network *after* upload but *before* Mux finishes = a `delivered` check with no playable clip, or a never-delivered clip that did upload. The webhook is the only honest "Mux has it and it's ready" signal. **Move the `delivered` transition into the webhook.** `[CITED: ARCHITECTURE.md "status=processing→delivered" via webhook-mux]` |
| **Drive `uploaded`/`processing` states** | **Jump `filming → delivered`** | The enum + `is_valid_check_transition` already include `uploaded` and `processing`; driving them gives the Seeker honest live progress ("uploading… processing…") and a complete event log. Trivial extra transitions. **Recommend driving them.** |

**Installation:**
```bash
# App bundle (needs EAS dev build — NOT Expo Go)
npx expo install react-native-vision-camera expo-file-system
# expo-video already installed (~3.0.16)
# Server (Edge Functions ONLY — never the app bundle):
#   import Mux from 'npm:@mux/mux-node@14'   (Deno-style import inside the function)
```

**Version verification done:** `@mux/mux-node` 14.1.1, `expo-file-system` 56.0.8 `[VERIFIED: npm registry 2026-06-21]`. `expo-video` ~3.0.16 and `@supabase/supabase-js` ^2.108.2 `[VERIFIED: lmc-app/package.json]`. `react-native-vision-camera` latest 4.x — confirm exact patch with `npx expo install` (it pins the SDK-54-compatible version).

## What Phase 2 Already Built (the seam to fill — do NOT rebuild)

> Read live this session. Phase 3 must EXTEND these.

| Asset | Where | Phase-3 relevance |
|-------|-------|-------------------|
| `clips` table | `0008_clips_location.sql`; types in `database.types.ts` | Columns today: `id, check_id, status (text), filmed_at, filmed_lat, filmed_lng, created_at`. **Phase 3 adds** `mux_upload_id, mux_asset_id, mux_playback_id, mux_playback_policy, duration_secs` and widens `status`. **No Mux columns leaked into 0008** (verified in 02-01 SUMMARY) — this is the intentional seam. |
| `markDelivered(checkId, filmedAt, loc?)` | `lib/checks.ts` | Today: inserts a `status:'stub'` clip then `transition_check(..., 'delivered')` **client-side**. Phase 3: the **insert** becomes "create the clip row as `pending` via the `mux-upload-url` function" and the **`delivered` transition moves into the webhook**. The function signature can stay; its body changes. |
| `transition_check` + `is_valid_check_transition` | `0007_check_transitions.sql` | The deliver-needs-clip guard + valid-transition table already exist; `uploaded`/`processing`/`delivered` are valid enum values. The webhook calls `transition_check` as the **service role** (system actor). Confirm the actor-authz branch permits a system/service-role transition for `uploaded/processing/delivered` (Phase 2 gated `filming/delivered` to the assigned scout — the webhook is neither scout nor seeker, so this likely needs a service-role allowance; see Pitfall 5). |
| `check_status` enum (12 values incl. `uploaded`, `processing`) | `database.types.ts` | Phase 3 uses `filming → uploaded → processing → delivered`. All already exist; no enum migration needed. |
| `getCheckClip(checkId)` | `lib/checks.ts` | Already returns the clip row via `.maybeSingle()`; `delivery.tsx` already calls it. Phase 3: it now returns real `mux_playback_id` + `duration_secs`; the screen reads those. |
| `delivery.tsx` clip read + `formatFilmedAgo` | `(seeker)/delivery.tsx` | Already loads `getCheck` + `getCheckClip` and shows a **placeholder** play button + static "AI VERDICT". Phase 3: swap the placeholder `<View>` for a real `expo-video` player fed the signed HLS URL. Keep AI Verdict + crowd tags STATIC (Phase 6). |
| `filming.tsx` simulated capture | `(scout)/filming.tsx` | Has a full simulated `CameraViewfinder` modal + a fake upload progress animation + `markFilming`/`markDelivered` calls. Phase 3: the `markFilming` call (assigned→filming) **stays**; the simulated viewfinder + fake `setInterval` upload animation get replaced by a real `<Camera>` + real `createUploadTask` progress. |
| `submitted.tsx` | `(scout)/submitted.tsx` | Already de-moneyed (no earnings credit; `// TODO(phase-4)` in place). Phase 3 leaves money alone; it can reflect real upload/processing status if wired, but earnings stay deferred. |
| `lib/realtime.ts` `subscribeToCheck` | `lib/realtime.ts` | **Unchanged.** The Seeker's live watch already flips on `checks` UPDATE; when the webhook transitions to `delivered`, the existing subscription routes `waiting.tsx → delivery.tsx`. Phase 3 adds NO new realtime plumbing. |
| `app.config.js` iOS infoPlist | already has `NSCameraUsageDescription` | **Already present** (good). `NSMicrophoneUsageDescription` is present too but should be **removed** (we never use the mic — VID-02). `NSPhotoLibraryUsageDescription` present for "save past videos" — for fresh-capture we do NOT need read access; leave or remove per Pitfall 2. |

## Architecture Patterns

### Recommended file structure (net-new vs wired)
```
supabase/migrations/
└── 0010_clips_mux.sql            # NET-NEW: Mux columns on clips + status lifecycle + indexes
supabase/functions/               # NET-NEW directory (no Edge Functions exist yet — see Env Availability)
├── _shared/
│   └── mux.ts                    # NET-NEW: Mux client init from env secrets, helpers
├── mux-upload-url/index.ts       # NET-NEW: mint signed upload URL, passthrough=checkId, clip row -> pending
├── mux-webhook/index.ts          # NET-NEW: verify sig + idempotent + finalize clip + transition_check
└── mux-playback-token/index.ts   # NET-NEW: owning-Seeker -> short-lived signed playback JWT
supabase/tests/
├── clips_mux.test.sql            # NET-NEW pgTAP: Mux columns, status lifecycle, deliver-needs-ready-clip
lmc-app/app/lib/
├── clips.ts                      # NET-NEW (or extend checks.ts): requestUploadUrl, uploadClip (createUploadTask + retry), getPlaybackToken
├── clips.test.ts                 # NET-NEW: unit (mocked) — call shapes, retry on failure, no-deliver-on-client
lmc-app/app/(scout)/
├── filming.tsx                   # WIRE: real <Camera audio={false}>, 15s cap, NO gallery path; markFilming stays; submit -> requestUploadUrl + uploadClip
└── submitted.tsx                 # WIRE (light): reflect real upload/processing; NO earnings (Phase 4)
lmc-app/app/(seeker)/
└── delivery.tsx                  # WIRE: real expo-video player on signed Mux HLS; placeholder play button removed
lmc-app/
└── app.config.js                 # WIRE: add vision-camera config plugin (enableMicrophonePermission:false); remove NSMicrophoneUsageDescription
```

### Pattern 1: Capture — live, audio-off, 15s, fresh-only (VID-01/02)
**What:** A real `<Camera>` records video-only; recording auto-stops at 15s; the only source of the upload file is the recorder's `onRecordingFinished` path. There is **no gallery import code anywhere** — that's the enforcement.
**When to use:** The Scout's filming screen.
```tsx
// (scout)/filming.tsx — illustrative (Source: visioncamera.margelo.com/docs/guides/recording-videos)
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
const device = useCameraDevice('back');
const { hasPermission, requestPermission } = useCameraPermission();
const cam = useRef<Camera>(null);

// video-only: audio={false}. Audio is never opened, so it is never recorded (VID-02).
<Camera ref={cam} device={device} isActive video={true} audio={false} style={StyleSheet.absoluteFill} />

const startRecording = () => {
  cam.current?.startRecording({
    // NO `path` override needed — recorder writes to an app-private temp file (not the camera roll).
    onRecordingFinished: (video) => {
      // video.path is the ONLY clip source. Fresh-capture guaranteed (VID-01).
      handleCapturedClip(video.path, video.duration);
    },
    onRecordingError: (e) => { /* surface, allow retake */ },
  });
  // enforce the 15s cap: auto-stop (the existing 15s timer drives this)
  setTimeout(() => cam.current?.stopRecording().catch(() => {}), 15_000);
};
```
> **Fresh-capture is enforced by absence:** do NOT add `expo-image-picker` / `launchImageLibrary` anywhere. The clip path is only ever `video.path` from the live recorder. There is no code path that can attach a gallery file. `[CITED: visioncamera docs — audio disabled by default; video-only]`

### Pattern 2: Token-handoff direct upload (VID-03 — secrets stay server-side)
**What:** The device asks our Edge Function for a Mux upload URL (tied to the check via `passthrough`), then `PUT`s the file straight to Mux. Our server never sees the bytes.
```ts
// supabase/functions/mux-upload-url/index.ts (Source: ARCHITECTURE.md Pattern 3 + mux.com/docs/guides/upload-files-directly)
import Mux from 'npm:@mux/mux-node@14';
const mux = new Mux({ tokenId: Deno.env.get('MUX_TOKEN_ID')!, tokenSecret: Deno.env.get('MUX_TOKEN_SECRET')! });
// ... auth the caller, confirm they're the assigned scout on this check ...
const upload = await mux.video.uploads.create({
  cors_origin: '*',
  new_asset_settings: {
    playback_policy: ['signed'],     // VID-04: private playback
    passthrough: checkId,            // correlation key — webhook order never matters
  },
});
// record the upload id on the (pending) clip row so the webhook can find the check
await supabaseService.from('clips').update({ mux_upload_id: upload.id, status: 'pending' }).eq('check_id', checkId);
return Response.json({ uploadUrl: upload.url, uploadId: upload.id });
```
```ts
// lib/clips.ts — device upload (Source: mux.com/docs/frameworks/react-native-uploading-videos)
import * as FileSystem from 'expo-file-system';
export async function uploadClip(localPath: string, uploadUrl: string, onProgress?: (f: number) => void) {
  const task = FileSystem.createUploadTask(uploadUrl, localPath, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  }, (p) => onProgress?.(p.totalBytesSent / p.totalBytesExpectedToSend));
  const res = await task.uploadAsync();          // wrap in bounded retry (see Pattern 3)
  if (!res || res.status >= 300) throw new Error(`upload failed: ${res?.status}`);
  // DO NOT mark delivered here — the webhook owns that (VID-03).
}
```

### Pattern 3: Local-first persist + bounded retry on weak networks (VID-03)
**What:** Keep the recorded temp file until the upload is confirmed; retry the `PUT` with backoff; the Scout can leave and resume. Never delete the local file or claim "done" until Mux's endpoint returns success.
```ts
// lib/clips.ts — illustrative
export async function uploadWithRetry(localPath: string, uploadUrl: string, max = 4) {
  let attempt = 0, delay = 1000;
  while (true) {
    try { return await uploadClip(localPath, uploadUrl); }
    catch (e) {
      if (++attempt >= max) throw e;
      await new Promise(r => setTimeout(r, delay)); delay *= 2;   // 1s,2s,4s,8s
    }
  }
}
```
> The Mux upload URL is itself resumable (`Content-Range`); `createUploadTask` re-PUTs from the start on a clean retry, which is acceptable for a ~15s clip (a few MB). True byte-resume mid-PUT is a later optimization; the bounded retry + local-first persist satisfies VID-03 at this clip size. `[CITED: mux.com/docs/guides/upload-files-directly — resumable Content-Range endpoint]`

### Pattern 4: Idempotent, signature-verified webhook finalizes the clip (VID-04 / CHECK-04)
**What:** Mux POSTs `video.asset.ready`; verify the signature; dedupe; set the playback id; transition the check. Ordering-proof via `passthrough=checkId`.
```ts
// supabase/functions/mux-webhook/index.ts (Source: ARCHITECTURE.md Anti-Pattern 4 + mux secure docs)
const body = await req.text();
// 1. VERIFY SIGNATURE (reject if invalid) — Mux SDK verifies the Mux-Signature header
mux.webhooks.verifySignature(body, req.headers, Deno.env.get('MUX_WEBHOOK_SECRET')!);
const evt = JSON.parse(body);
if (evt.type !== 'video.asset.ready') return new Response('ignored', { status: 200 });
const checkId = evt.data.passthrough;                 // correlation key
const assetId = evt.data.id;
const playbackId = evt.data.playback_ids?.find((p) => p.policy === 'signed')?.id;
// 2. IDEMPOTENT: if this clip is already 'ready', no-op (Mux retries / duplicates are normal)
const { data: clip } = await svc.from('clips').select('status').eq('check_id', checkId).maybeSingle();
if (clip?.status === 'ready') return new Response('ok (dup)', { status: 200 });
// 3. finalize clip + 4. drive the check forward (service role)
await svc.from('clips').update({ mux_asset_id: assetId, mux_playback_id: playbackId,
  duration_secs: evt.data.duration, status: 'ready' }).eq('check_id', checkId);
await svc.rpc('transition_check', { p_check_id: checkId, p_to: 'uploaded' });
await svc.rpc('transition_check', { p_check_id: checkId, p_to: 'processing' });
await svc.rpc('transition_check', { p_check_id: checkId, p_to: 'delivered' });
return new Response('ok', { status: 200 });
```
> The Seeker's **existing** `subscribeToCheck` fires on the `delivered` UPDATE and routes `waiting.tsx → delivery.tsx`. No push needed (Phase 7). `[CITED: mux.com/docs/guides/upload-files-directly — passthrough; ARCHITECTURE.md — verify signature, idempotent]`

### Pattern 5: Signed playback scoped to the buyer (VID-04)
**What:** `delivery.tsx` asks an Edge Function for a short-lived JWT; only the owning Seeker gets one; the token goes in the HLS URL.
```ts
// supabase/functions/mux-playback-token/index.ts
// ... auth caller; confirm caller is the check's seeker_id (RLS read or explicit check) ...
const token = await mux.jwt.signPlaybackId(playbackId, { type: 'video', expiration: '1h' }); // sub=playbackId, aud='v', exp
return Response.json({ token });
```
```tsx
// (seeker)/delivery.tsx — real player (Source: mux.com/docs/frameworks/react-native-video-playback)
import { useVideoPlayer, VideoView } from 'expo-video';
const src = `https://stream.mux.com/${clip.mux_playback_id}.m3u8?token=${token}`;
const player = useVideoPlayer(src, (p) => { p.loop = false; });
<VideoView player={player} style={styles.videoBox} allowsFullscreen contentFit="cover" />
```

### Anti-Patterns to Avoid
- **Putting a Mux secret in the app / `EXPO_PUBLIC_`.** Mux tokens + signing keys live ONLY in Edge Functions. The app only ever holds a single-use upload URL and a 1-hour playback JWT.
- **Marking the check delivered from the client on "upload complete".** A weak network makes this lie. Delivery is a server (webhook) fact. (Pattern 4.)
- **Adding any gallery/`expo-image-picker` import path.** That's the hole that defeats fresh-capture. Don't create it. (Pattern 1.)
- **Recording with the mic open then stripping audio.** Audio off at the API; never opened. (VID-02.)
- **Trusting the webhook without signature verification or idempotency.** Mux retries + can deliver duplicates/out-of-order; verify + dedupe. (ARCHITECTURE.md Anti-Pattern 4.)
- **Public Mux playback.** Anyone with the playback id could watch. Use signed playback. (Pattern 5.)
- **Running a timer inside an Edge Function** to wait for the asset. Mux fires the webhook; no timer. (ARCHITECTURE.md Anti-Pattern 5.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Video transcode / multiple renditions / HLS packaging | An ffmpeg pipeline (ffmpeg-kit is retired) | Mux (managed) | Transcode/ABR/CDN as a service; clip never touches our infra. `[CITED: STACK.md — ffmpeg-kit dead]` |
| Resumable chunked upload | A custom chunker + Content-Range loop | `expo-file-system` `createUploadTask` PUT | Mux's official RN method; progress + backgrounding handled. |
| Video-only capture / mic gating | A custom AVCaptureSession audio-strip | vision-camera `audio={false}` | Audio never opened — legally safer + simpler than stripping. |
| Webhook signature check | A hand-rolled HMAC compare | `mux.webhooks.verifySignature` | Constant-time, spec-correct; reduces a security bug class. |
| Signed playback JWT | Hand-rolled RS256 signing | `mux.jwt.signPlaybackId` | Correct claims (`sub/aud/exp/kid`) + key handling. |
| HLS player | A custom AVPlayer bridge | `expo-video` `useVideoPlayer`/`VideoView` | Already installed + used; native HLS on iOS/Android. |
| "When/where filmed" provenance | Client-computed timestamp | `clips.filmed_at/lat/lng` + `event_log` | Immutable log + clip row; client clocks lie (carries from Phase 2). |

**Key insight:** Phase 3 is a **token-handoff + webhook wiring** phase. Every hard part (transcode, CDN, resumable transport, JWT signing, HLS playback) is a managed primitive. The risk is in the *seams*: audio-truly-off, no-gallery-path, webhook-owns-delivery (not client), signature + idempotency, and the service-role actor allowance in `transition_check`.

## Runtime State Inventory

> Phase 3 is brownfield (rewire 3 screens) + net-new (Mux columns + 3 Edge Functions + Mux account). A grep finds the screens; it does not find Mux's runtime state. Inventory:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | The `clips` table exists; any Phase-2 stub clips have `status:'stub'` and no Mux columns. No real clips exist yet. | Migration 0010 adds Mux columns (nullable) + a wider `status`. **Decide stub handling:** either migrate existing `stub` rows to `pending`/leave them (they'll never get a playback id) or treat them as test data. No production data, so no real backfill — note it for the planner. |
| **Live service config** | **A Mux account + API token + a webhook endpoint registered in the Mux dashboard + a signing key (for signed playback)** — all live in Mux's dashboard, NOT in git. The webhook URL must point at the deployed `mux-webhook` function. CORS origin on uploads. | Troy creates the Mux account; the Mux **API token, webhook signing secret, and playback signing key** are set as **Supabase Edge Function secrets** (`supabase secrets set`). Register the webhook URL in Mux after the function deploys. **External gate** (ROADMAP: "Mux account"). |
| **OS-registered state** | None (no scheduled tasks; the webhook is event-driven, no cron/timer). | None. |
| **Secrets / env vars** | `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET`, `MUX_SIGNING_KEY_ID` + `MUX_SIGNING_PRIVATE_KEY` — **Edge-Function secrets only**, never `EXPO_PUBLIC_`, never committed. The app holds NO Mux secret. `NSMicrophoneUsageDescription` should be **removed** from `app.config.js` (we never use the mic). | Set Edge-Function secrets via `supabase secrets set`. Edit `app.config.js` (add vision-camera plugin, drop mic usage string). |
| **Build artifacts / installed packages** | Adding `react-native-vision-camera` is a **native** dependency → the current EAS dev build does NOT include it. The existing Build 9 cannot test the camera. `database.types.ts` is generated and must be **regenerated** after 0010 or `lib/clips.ts` won't type-check against the new Mux columns. | **A NEW EAS dev build is required** before any on-device camera test (the camera is native — same constraint Mapbox already imposes). Regenerate `database.types.ts` after 0010 pushes. |

**The canonical question — after every file is updated, what runtime state remains?** Four things, all explicit checkpoints (none the agent can self-verify offline): (1) a **Mux account + dashboard-registered webhook + signing key**; (2) **Edge-Function secrets** set in Supabase; (3) a **fresh EAS dev build** containing the native camera lib; (4) **regenerated `database.types.ts`** after 0010. Mirrors the Phase-1/2 "author offline, verify on a human checkpoint" pattern.

## Common Pitfalls

### Pitfall 1: Client marks the check delivered, so a weak network produces a phantom delivery
**What goes wrong:** Carrying Phase-2's client-side `transition_check(..., 'delivered')` forward means: upload succeeds but the app crashes/loses signal before Mux finishes → either a `delivered` check with an unplayable (not-yet-ready) clip, or an uploaded clip whose check never advances.
**Why it happens:** The Phase-2 stub flow had no real asset, so client-driven delivery was harmless. With a real asset, "ready" is a Mux fact.
**How to avoid:** Move the `delivered` transition into the **webhook** (Pattern 4). The client's job ends at "upload PUT returned success"; the screen shows "processing", and the existing Realtime subscription flips it to delivered when the webhook lands. (VID-03 success criterion is explicit: "not marked done until the server confirms receipt.")
**Warning signs:** `lib/clips.ts` or `filming.tsx` calls `transition_check(..., 'delivered')`. It must not.

### Pitfall 2: Audio sneaks in / a gallery import path exists
**What goes wrong:** Either `audio={true}` (or omitting the prop on a version where it defaults on) records audio → felony exposure (VID-02); or someone adds an `expo-image-picker` "choose from library" affordance → fresh-capture defeated (VID-01).
**Why it happens:** Copy-paste camera tutorials enable audio; "let them pick a file" feels helpful.
**How to avoid:** Explicit `audio={false}`; config plugin `enableMicrophonePermission:false`; **remove `NSMicrophoneUsageDescription`** from `app.config.js`; and **never add any gallery/image-picker dependency**. Add a test/grep gate: `! grep -r "image-picker\|launchImageLibrary\|audio={true}\|enableAudio: true" app/`.
**Warning signs:** `expo-image-picker` in `package.json`; mic permission prompt appears on first record.

### Pitfall 3: The webhook can't authorize its `transition_check` call (service-role actor)
**What goes wrong:** Phase-2's `transition_check` gates `filming`/`delivered` to the **assigned scout** (`auth.uid() = scout_id`). The webhook runs as the **service role** with no `auth.uid()` (or a service identity) → the actor-authz branch rejects the transition, and the clip is finalized but the check never reaches `delivered`.
**Why it happens:** Phase 2 authored actor-authz for human callers; the webhook is a system actor that didn't exist yet.
**How to avoid:** In 0010 (or a small `0011`), allow a **service-role / system** caller to drive `uploaded`/`processing`/`delivered` (e.g. `auth.uid() IS NULL` service path, matching how Phase 2 already allows system transitions for `no_scout`/`expired` per the 02-01 SUMMARY key-decision). Add a pgTAP test: the system actor can drive `filming→uploaded→processing→delivered`; a human scout still cannot skip to `delivered` without a ready clip.
**Warning signs:** Webhook logs "illegal transition" or "only the assigned scout may drive delivered".

### Pitfall 4: Webhook duplicates / out-of-order double-deliver
**What goes wrong:** Mux retries the webhook or delivers `video.upload.asset_created` and `video.asset.ready` out of order; a non-idempotent handler runs the delivery transition twice (or errors on the second run).
**Why it happens:** Webhooks are at-least-once and unordered.
**How to avoid:** Dedupe on clip `status='ready'` (no-op if already ready) and/or event id; correlate via `passthrough=checkId` so order doesn't matter. Verify the signature first. (Pattern 4.)
**Warning signs:** Duplicate `check.status_changed` events to `delivered` in `event_log`.

### Pitfall 5: Testing the camera on a simulator (it can't)
**What goes wrong:** iOS Simulator / Android emulator have **no camera** — `useCameraDevice` returns nothing; recording can't be tested there.
**Why it happens:** The dev loop defaults to the simulator.
**How to avoid:** Plan the camera capture as a **manual on-device checkpoint** (Troy, via a fresh TestFlight/dev build). Everything *around* the camera (Edge Function logic, upload retry against a mock URL, webhook handling, state transitions, signed-token minting) is automatable and should carry the test weight. (See Validation Architecture.)
**Warning signs:** "device is null" on the simulator; trying to assert capture in CI.

### Pitfall 6: Signed playback misconfig (asset public, or token wrong)
**What goes wrong:** The asset was created with `playback_policy:['public']` (so the JWT is meaningless / not required), or the token's `aud`/`sub`/`exp` are wrong, so playback 403s or is unintentionally public.
**Why it happens:** Default Mux playback is public; signing has specific claims.
**How to avoid:** Create the upload with `new_asset_settings.playback_policy:['signed']` (Pattern 2); sign with `mux.jwt.signPlaybackId(playbackId, { type:'video', expiration:'1h' })` (Pattern 5); store the **signed** playback id. Test: a missing/expired token yields no playback; a fresh token plays.
**Warning signs:** The clip plays with no token (it's public); or always 403s (claims/policy mismatch).

## Code Examples

(See Patterns 1–5 above for the load-bearing snippets: capture, upload-url mint, device upload + retry, webhook finalize, signed-playback player. All cite their source docs.)

## State of the Art

| Old Approach (prototype / Phase 2) | Current Approach (this phase) | Impact |
|------------------------------------|-------------------------------|--------|
| `filming.tsx` simulated `CameraViewfinder` modal + fake `setInterval` upload % | Real `<Camera audio={false}>` 15s capture + `createUploadTask` PUT to Mux | Genuine, audio-free clip (VID-01/02) |
| `markDelivered` inserts a `status:'stub'` clip + client `delivered` transition | `mux-upload-url` creates a `pending` clip; **webhook** finalizes + transitions | Honest delivery only on server confirmation (VID-03) |
| `delivery.tsx` placeholder play button + static badge | `expo-video` player on signed Mux HLS | Real transcoded CDN playback, scoped to buyer (VID-04) |
| (no server endpoints existed) | 3 Supabase Edge Functions (upload-url, webhook, playback-token) | The "server" the architecture always called for arrives |
| ffmpeg-kit (in old stack notes) | Mux managed transcode | No retired dependency; nothing self-hosted |

**Deprecated/outdated for this phase:** ffmpeg-kit (retired); UpChunk for RN (browser-only Blob/File); TUS for Mux (Mux isn't TUS); the simulated viewfinder + fake upload animation in `filming.tsx`; the client-side `delivered` transition in `markDelivered`; `NSMicrophoneUsageDescription` in `app.config.js`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | vision-camera v4 records **video-only by default** and `audio={false}` (or omitting audio) guarantees the mic is never opened on iOS+Android | Pattern 1 / Pitfall 2 | LOW–MED — verified against current visioncamera docs ("audio disabled by default"); confirm on-device that no mic-permission prompt appears. Hard legal requirement, so test explicitly. |
| A2 | `expo-file-system` `createUploadTask` (PUT) is the right RN upload path (not UpChunk/TUS) | Standard Stack / Pattern 2 | LOW — Mux's official RN guide uses exactly this; UpChunk needs browser Blob, Mux isn't TUS. |
| A3 | The Phase-2 `transition_check` needs a **service-role/system actor allowance** for `uploaded/processing/delivered` so the webhook can drive them | Pitfall 3 | MED — depends on the exact 0007 actor-authz body. 02-01 SUMMARY says system transitions (no_scout/expired) are already allowed for `auth.uid() null`; if `delivered` is scout-gated, a small migration is needed. **Planner must read 0007 and confirm.** |
| A4 | Mux signed playback (per-Seeker JWT) is the chosen privacy control (vs public+RLS) | Pattern 5 | LOW — matches VID-04 "scoped to the buyer"; the only mechanism that protects the actual stream URL. |
| A5 | Driving `uploaded`→`processing`→`delivered` (vs jumping to delivered) is wanted for honest progress | Standard Stack / Pattern 4 | LOW — both reach delivered; extra states are cosmetic + log completeness. Confirm with planner. |
| A6 | Existing Phase-2 stub clips are test data (no real backfill of Mux columns needed) | Runtime State Inventory | LOW — no production clips exist; confirm none must be preserved. |
| A7 | A fresh EAS dev build is acceptable as the gate for on-device camera testing (native lib) | Env Availability / Pitfall 5 | LOW — same constraint Mapbox already imposes; Troy already builds via EAS. |
| A8 | One clip per check (`getCheckClip` `.maybeSingle()`); multi-take is not retained server-side | scope | LOW — matches Phase-2 design; retakes happen pre-upload on-device. |

## Open Questions

1. **Does `transition_check` already permit a service-role/system actor to reach `delivered`?**
   - Known: 02-01 SUMMARY says `no_scout`/`expired` system transitions are allowed when `auth.uid()` is null; `filming`/`delivered` were scout-gated.
   - Unclear: whether `delivered` specifically accepts the service-role caller the webhook uses.
   - Recommendation: planner reads `0007_check_transitions.sql`; if needed, add a tiny migration allowing the system/service path to drive `uploaded/processing/delivered` (keep the deliver-needs-ready-clip guard). Add the pgTAP test.

2. **Does the `delivered` guard require a clip that's `ready` (not just present)?**
   - Known: Phase-2 guard requires *a clip row to exist*. With real Mux, a `pending` clip exists before the asset is ready.
   - Recommendation: tighten the guard (or rely on flow) so `delivered` is only reachable once `clips.status='ready'` — the webhook sets `ready` *then* transitions, so ordering already protects it; consider asserting it in the guard for defence-in-depth.

3. **Keep `filming.tsx`'s visual chrome over the real preview, or simplify the screen?**
   - Recommendation: keep the existing chrome (REC pill, GPS pill, 15s ring, steps) layered over a real `<Camera>` preview — minimal screen churn, preserves the designed UX. Replace only the simulated feed + fake upload animation. (`filming.tsx` is ~1290 lines — watch the <500-line rule; extract the recorder + upload logic into `lib/clips.ts` and a small hook rather than growing the screen.)

4. **Should the GPS stamp be captured onto the clip now (it's a column), even though verification is Phase 5?**
   - Recommendation: capture `filmed_lat/lng` from `expo-location` at record time (columns already exist; cheap, builds the provenance trail) but do **not** verify/reject on it (Phase 5). Confirm with planner.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| **Mux account + API token** | upload-url, webhook, playback-token | ✗ (must be created) | — | none — **external gate** (Troy creates it); ROADMAP names it |
| **Mux webhook registered + signing key** | webhook finalize + signed playback | ✗ | — | none — set in Mux dashboard after function deploy |
| **Supabase Edge Functions deployed** | the whole server side of this phase | ✗ — **no `supabase/functions/` directory exists yet** (verified: only migrations/tests today) | — | none — first Edge Functions for the project land here; `supabase functions deploy` is a live checkpoint |
| **Edge-Function secrets** (`MUX_*`) set | functions run | ✗ | — | none — `supabase secrets set` |
| `react-native-vision-camera` (native) | capture | ✗ (not installed; native) | ^4.x | none — `npx expo install` + **new EAS dev build** |
| **Fresh EAS dev build** (incl. camera lib) | on-device capture test | ✗ (Build 9 predates the lib) | — | none — camera can't run on simulator or old build |
| `expo-file-system` | resumable upload | likely present (SDK-54 module) — confirm | ~56.0.8 | none |
| `expo-video` | playback | ✓ (installed, used by `venue.tsx`) | ~3.0.16 | — |
| Real iOS device | camera capture QA | ✓ (Troy's device via TestFlight/dev build) | — | none — simulator has no camera |
| Live Supabase project (Phase-1/2 migrations pushed) | clip rows, transitions | ⚠ pending the Phase-2 live-push checkpoint (02-02) | — | author offline; live verify on the same human checkpoint |
| `supabase gen types typescript` after 0010 | client type-check of Mux columns | ✗ until 0010 applied | — | none — required before `lib/clips.ts` compiles |

**Missing dependencies with no fallback (external gates / checkpoints):** Mux account + dashboard config; Edge Functions deployed + secrets set; a fresh EAS dev build with the native camera; types regen after 0010. All are human/Troy checkpoints, consistent with Phases 1–2.
**Missing with fallback:** none material — every server piece can be *authored* and unit-tested offline (mocked Mux + Supabase); only the *live* run needs the gates above.

## Validation Architecture

> `nyquist_validation` is enabled (`config.json`) — this section is required so a VALIDATION.md can be derived.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **Vitest** (client unit, configured in Phase 1: `lmc-app/vitest.config.ts`) + **pgTAP** SQL tests (`supabase/tests/*.test.sql`, `supabase test db`). **Edge Functions**: Deno test (`deno test`) for handler logic with mocked Mux + Supabase clients — net-new for this phase. |
| Config file | `lmc-app/vitest.config.ts` (exists); `supabase/tests/` (exists); `supabase/functions/` (NET-NEW) |
| Quick run command | `cd lmc-app && npm test` (Vitest) + `npx tsc --noEmit` |
| Full suite command | `npm test` + `supabase db reset` (applies 0001–0010 + seed) + `supabase test db` (pgTAP) + `deno test supabase/functions/` (Edge logic) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VID-01 | No gallery/image-picker import path exists anywhere | grep gate | `! grep -rE "image-picker\|launchImageLibrary" lmc-app/app` | ❌ Wave 0 |
| VID-02 | Audio never enabled (`audio={false}`, no `enableAudio:true`, no mic plist) | grep gate + manual | `! grep -rE "audio=\{true\}\|enableAudio: ?true" lmc-app/app`; on-device: no mic prompt | ❌ Wave 0 |
| VID-03 | `uploadWithRetry` retries on failure, throws after max; client NEVER calls `transition_check(...,'delivered')` | unit (mocked) + grep | `npm test -- clips`; `! grep -rn "p_to: 'delivered'" lmc-app/app/lib` | ❌ Wave 0 |
| VID-03/CHECK-04 | Webhook: bad signature rejected; valid `video.asset.ready` sets clip `ready` + drives delivered; **duplicate is a no-op** | Deno unit (mocked Mux+svc) | `deno test supabase/functions/mux-webhook` | ❌ Wave 0 |
| CHECK-04 | A check cannot reach `delivered` without a **ready** clip; system actor may drive uploaded→processing→delivered | pgTAP | `supabase test db` (clips_mux.test.sql) | ❌ Wave 0 |
| VID-04 | `mux-upload-url` sets `playback_policy:['signed']` + `passthrough=checkId`; `mux-playback-token` only mints for the owning Seeker | Deno unit | `deno test supabase/functions/` | ❌ Wave 0 |
| VID-04 | `delivery.tsx` builds `stream.mux.com/{id}.m3u8?token=` and feeds `useVideoPlayer` | unit (render/logic) + manual playback | `npm test -- delivery`; on-device playback | ❌ Wave 0 |
| VID-01/02 | **Live 15s audio-free capture from the real camera** | **manual on-device** | TestFlight/dev-build checkpoint (no simulator camera) | n/a (manual) |

### Sampling Rate
- **Per task commit:** `npm test` (Vitest) + `npx tsc --noEmit` + the VID-01/02/03 grep gates.
- **Per wave merge:** full suite incl. `supabase db reset` + `supabase test db` (pgTAP) + `deno test supabase/functions/`.
- **Phase gate:** full automated suite green **and** an on-device walk-through: Scout films a real 15s audio-free clip → upload survives a throttled/airplane-toggle network → webhook finalizes → Seeker's screen flips to delivered via Realtime → plays the real Mux clip → playback fails without a token (signed-playback proof) — before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `lmc-app/app/lib/clips.test.ts` — requestUploadUrl/uploadClip/uploadWithRetry call shapes + retry + "client never marks delivered" (VID-03)
- [ ] `supabase/functions/mux-webhook/*.test.ts` (Deno) — signature reject, finalize-on-ready, idempotent duplicate no-op (CHECK-04)
- [ ] `supabase/functions/mux-upload-url/*.test.ts` (Deno) — signed policy + passthrough + caller is assigned scout (VID-04)
- [ ] `supabase/functions/mux-playback-token/*.test.ts` (Deno) — only owning Seeker gets a token (VID-04)
- [ ] `supabase/tests/clips_mux.test.sql` — Mux columns, status lifecycle, deliver-needs-**ready**-clip, system-actor transition (CHECK-04)
- [ ] grep gates wired into CI/test script (VID-01/02/03)
- [ ] Deno test runner stood up for `supabase/functions/` (net-new; framework install/config)
- [ ] (Vitest + pgTAP already configured from Phase 1.)

## Security Domain

> `security_enforcement` not disabled → included.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | **yes** | Token-handoff: secrets only in Edge Functions; client holds a single-use upload URL + 1h playback JWT; server (webhook) owns the `delivered` transition |
| V4 Access Control | **yes** | `mux-upload-url` confirms caller is the **assigned scout**; `mux-playback-token` confirms caller is the **owning Seeker**; clips RLS (Phase-2 0009) confines reads to participants; signed playback gates the stream itself |
| V5 Input Validation | **yes** | Webhook payload parsed only after **signature verification**; `passthrough` treated as an untrusted correlation key (validated against an existing clip row, not blindly trusted) |
| V6 Cryptography | **yes** | Mux signing key (RS256) + webhook HMAC handled by `@mux/mux-node` — never hand-rolled; private key is an Edge-Function secret |
| V7 Logging | **yes** | `event_log` records `filming/uploaded/processing/delivered` transitions (immutable, Phase-1 trigger); provenance for "when/where filmed" |
| V12 Files & Resources | **yes** | Clip uploads device-direct to Mux (never our infra); fresh-capture (no gallery path); audio never captured (legal control) |

### Known Threat Patterns for this phase
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Spoofed webhook POST flips a check to delivered | Spoofing / Tampering | `mux.webhooks.verifySignature` before trusting any payload; reject invalid |
| Duplicate/replayed webhook double-delivers or double-pays (later) | Tampering | Idempotent handler (no-op if clip already `ready`); correlate via `passthrough` |
| Mux secret leaks into the app bundle | Information Disclosure / Elevation | Secrets only in Edge-Function env; app gets single-use URL + short-lived JWT; grep gate `! grep EXPO_PUBLIC.*MUX` |
| A non-buyer watches someone's clip | Information Disclosure | Signed playback (per-Seeker JWT, 1h exp); token minted only for the check's `seeker_id`; assets created `playback_policy:['signed']` |
| Scout uploads a pre-recorded/gallery clip | Tampering (fresh-capture bypass) | No gallery/image-picker path in the app; upload source is only the live recorder's `path`; (GPS-stamp + signage AI in Phase 5/6 harden further) |
| Audio captured → all-party-consent violation | Compliance / legal | `audio={false}`; mic permission disabled in the config plugin; no `NSMicrophoneUsageDescription` |
| Client fakes delivery on a dropped network | Tampering | Webhook (not client) owns the `delivered` transition; client never calls `transition_check(...,'delivered')` |

## Project Constraints (from CLAUDE.md)

From `projects/let-me-check/CLAUDE.md`, `lmc-app/CLAUDE.md`, `studio/CLAUDE.md`, global `~/CLAUDE.md` — the planner must honor these:
- **Server owns secrets; thin client; no business logic on the client** — Mux keys/signing key only in Edge Functions; client holds a single-use upload URL + short-lived JWT; the `delivered` transition is server-side.
- **Managed services over custom infra** — Mux for the whole pipeline; no self-hosted transcode/S3; the Edge Functions are the only "server".
- **Files under 500 lines** — `filming.tsx` is ~1290 lines (already over). Do NOT grow it: extract the recorder + upload + retry into `lib/clips.ts` and a small hook; the screen wires to those. `delivery.tsx` (~430) gains a player — keep it lean.
- **Validate input at boundaries** — verify webhook signatures before parsing; treat `passthrough` as untrusted; zod the function request bodies.
- **File org** — SQL in `supabase/migrations/`, functions in `supabase/functions/`, client lib in `app/lib/`, tests alongside; never save working files/tests/docs to repo root.
- **Don't commit secrets / .env** — `MUX_*` are `supabase secrets set` only, never `EXPO_PUBLIC_`, never committed.
- **Sibling studio projects are READ-ONLY** — touch only `projects/let-me-check/`.
- **Don't auto-push; propose commit messages for approval** (Troy's git preference).
- **iOS-first, RN + Expo, no rewrite** — wire behind `filming.tsx`/`submitted.tsx`/`delivery.tsx`; new files are `lib/clips.ts` + Edge Functions + one migration.
- **Market-aware** — clips are market-neutral; nothing to hard-code here, but keep currency/market untouched.
- **No earnings/money this phase** — Phase 4 owns it; keep the `submitted.tsx` `// TODO(phase-4)` discipline.

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/0007_check_transitions.sql`, `0008_clips_location.sql`, `0009_scout_rls_realtime.sql` (live, committed) — the `clips` table, transition guard, deliver-needs-clip, system-actor allowance — project canon, read this session
- `lmc-app/app/lib/checks.ts`, `lib/database.types.ts` (live) — `markDelivered` stub flow, `getCheckClip`, `clips` typed shape, `check_status` enum incl. `uploaded`/`processing` — read this session
- `lmc-app/app/(scout)/filming.tsx`, `submitted.tsx`, `(seeker)/delivery.tsx`, `app.config.js` (live) — exact screens to wire + current Info.plist + plugins — read this session
- `.planning/phases/02-one-real-check/02-RESEARCH.md`, `02-01-SUMMARY.md`, `02-03-SUMMARY.md` — what Phase 2 built + the stub seam + the system-actor decision — read this session
- `.planning/research/ARCHITECTURE.md` — token-handoff (Pattern 3), webhook-mux finalize, signature+idempotency (Anti-Pattern 4), no-timer-in-functions (Anti-Pattern 5), passthrough correlation — project canon
- `.planning/research/STACK.md` — vision-camera over expo-camera, Mux confirmed, ffmpeg-kit retired, EAS-dev-build coupling — project canon
- `mux.com/docs/guides/upload-files-directly` — direct upload, `passthrough`, resumable Content-Range (NOT TUS), webhook events (`video.upload.asset_created`, `video.asset.ready`) `[CITED, fetched 2026-06-21]`
- `mux.com/docs/frameworks/react-native-uploading-videos` — **`expo-file-system` `createUploadTask` PUT** is Mux's official RN upload method (not UpChunk) `[CITED, fetched 2026-06-21]`
- `mux.com/docs/guides/secure-video-playback` — signed playback policy + JWT claims (`sub/aud/exp/kid`), `playback_policies:['signed']`, token-in-URL `[CITED, fetched 2026-06-21]`
- `visioncamera.margelo.com/docs/guides/recording-videos` — vision-camera records **video-only by default**; audio opt-in only `[CITED, fetched 2026-06-21]`
- npm registry, 2026-06-21 — `@mux/mux-node` 14.1.1, `expo-file-system` 56.0.8; `lmc-app/package.json` — `expo-video` ~3.0.16, `@supabase/supabase-js` ^2.108.2, RN 0.81.5, Expo ~54.0.34 `[VERIFIED]`

### Secondary (MEDIUM confidence)
- `mux.com/docs/frameworks/react-native-video-playback` — `expo-video` `useVideoPlayer`/`VideoView` on `stream.mux.com/{id}.m3u8`, native HLS on iOS/Android `[CITED]`
- `github.com/muxinc/upchunk` README — UpChunk is browser-first (Blob/File slicing) → why it's rejected for RN `[CITED]`
- vision-camera v4 `<Camera video audio={false}>` + `startRecording`/`onRecordingFinished({path,duration})` stable API — ecosystem + issue threads (exact prop surface confirm at install) `[MEDIUM]`

### Tertiary (LOW confidence)
- Exact `react-native-vision-camera` patch version (npm page 403'd in Phase 2) — pin via `npx expo install` at build time
- Exact `@mux/mux-node` Deno-import ergonomics inside Supabase Edge Functions + `verifySignature`/`signPlaybackId` method names — confirm against the installed SDK version at build time
- Exact `expo-file-system` `createUploadTask` API surface in SDK 54 (the module had a known API revision) — confirm at install

## Metadata

**Confidence breakdown:**
- Pipeline shape (token-handoff, webhook-finalize, signed playback): HIGH — verified against Mux official docs + ARCHITECTURE.md; matches the Phase-2 seam exactly
- Phase-2 seam (clips table, stub flow, deliver-needs-clip, screens): HIGH — read the live artifacts this session
- vision-camera recording API surface (audio-off default, 15s cap, path): MEDIUM — current docs confirm video-only default; exact prop/method names confirm at install on a real device
- Edge-Function/Mux SDK call shapes (Deno import, verifySignature, signPlaybackId): MEDIUM — documented behavior is clear; exact method signatures verify against the pinned SDK
- Service-role actor allowance in `transition_check`: MEDIUM — depends on the exact 0007 body; flagged as Open Q1 for the planner to confirm against the file
- Testing reality (camera = manual on-device; everything else automatable): HIGH — simulator has no camera; the server/upload/webhook logic is fully unit-testable

**Research date:** 2026-06-21
**Valid until:** ~2026-07-21 (30 days; re-verify vision-camera + `@mux/mux-node` + `expo-file-system` versions and the Mux SDK method names at build time)
