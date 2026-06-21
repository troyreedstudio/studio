# Phase 6: Privacy + Anti-Fraud Hardening — Research

**Researched:** 2026-06-22
**Domain:** Face/plate blur pipeline, iOS GPS-spoof detection, Supabase Edge Functions
**Confidence:** HIGH (server-side path, schema, fraud signals); LOW-MEDIUM (on-device blur — New Arch + v4 frame processor confirmed working in isolation, but multi-package interaction on THIS repo is UNVERIFIED without a device build)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (where blur runs):** Prefer on-device before upload. DEFAULT: design + scaffold on-device path AND build a verifiable server-side blur fallback so privacy is guaranteed even if on-device isn't ready. Research decides which is feasible (see Buildability Map below).
- **D-02 (what gets blurred):** Faces = always. License plates = best-effort.
- **D-03 (blur-failure handling):** Privacy-safe default: if blur cannot be applied/confirmed, the clip is NOT delivered — held + flagged for review. CONFIRM: hold-on-blur-failure vs deliver-and-flag (docs currently say "soft-flag for review").
- **D-04 (detection, not hard-block):** Record a `fraud_signal` on the clip/check and FLAG suspicious ones for review. Do NOT auto-reject on a spoof signal at launch (false-positive risk). Tunable strictness. CONFIRM: flag-only vs auto-reject.
- **D-05 (scope):** This phase adds DETECTION + signals + flagging, layered on the GPS fence (Phase 5). Not a guaranteed anti-spoof. Raises the cost of cheating + surfaces for review.
- **D-06 (signage stays server-side):** On-device signage = deferred. CONFIRM ok.
- **D-07 (privacy posture):** No clip is DELIVERED with unblurred faces, whatever the blur path chosen.

### Claude's Discretion

- Blur radius/strength, detection thresholds, the specific Vision/CoreML model, fraud_signal schema shape, event-log additions. Tunable via market_config (same pattern as Phase 5 radii).

### Deferred Ideas (OUT OF SCOPE)

- Full adversarial anti-spoof / guaranteed mock-GPS prevention (iOS-limited).
- On-device signage AI (server-side works).
- Scene/background blur beyond faces + plates.
- Live feed, B2B API, second city (later waves).
</user_constraints>

---

## Summary

Phase 6 has three distinct work streams with very different delivery risk profiles. Understanding which is which is the most important output of this research.

**Stream 1 — Server-side blur fallback (HIGH confidence, 100% offline-verifiable):** After a clip uploads to Mux and becomes `ready`, a new `face-blur` Edge Function calls Google Vision API (already set up) to detect faces in one or more Mux thumbnail frames, then calls a second service (AWS Rekognition or the same Vision API) to decide whether a blur step is needed. Actual video pixel-level blurring requires a transcode step outside Mux (Mux does not offer blur). Two paths: (a) a Lambda/Step Functions pipeline on AWS that detects faces + rewrites the video with OpenCV blur, OR (b) the simpler approach for v1: use frame-level detections to decide whether the clip "passes" face-count/orientation checks, and hold/reject if unacceptable. The full pixel-blur transcode (path a) is complex infrastructure; the "detect + hold if risky" (path b) is a single Edge Function and is immediately deployable.

**Stream 2 — On-device blur during recording (MEDIUM confidence, device-build-only verifiable):** vision-camera v4.7.x + react-native-worklets-core (which IS a peer dependency for frame processors on v4) together support frame processors on New Architecture — this is confirmed by the v4 docs. The face-detector plugin (`react-native-vision-camera-face-detector` v2.0.1, latest) requires worklets-core and works with MLKit (not CoreML/Vision). A Skia frame processor overlay (`@shopify/react-native-skia` + `react-native-vision-camera-skia`) can draw a blur/pixelate rect over detected face regions at 30–60fps. This stack is technically viable on New Arch but: (1) neither `react-native-worklets-core` nor `react-native-vision-camera-face-detector` nor the Skia integration is currently in the repo, (2) adding three native packages requires a new EAS dev build before anything can be verified on-device, and (3) the Phase 5 experience (createUploadTask + New Arch, google-signin + Old Arch) shows our New Arch compatibility track record has gotchas that only show up on real hardware. **On-device blur cannot be verified overnight.**

**Stream 3 — Fraud signals (HIGH confidence, 100% offline-verifiable):** iOS provides three client-side signals: `CLLocation.sourceInformation.isSimulatedBySoftware` (only catches Xcode simulation, not third-party spoofers), `expo-device`'s `isDevice` (unreliable, has a known bug), and `Location.Accuracy` anomalies. The only reliable multi-context spoof signal is the server-side heuristic: a GPS reading that's within the fence but shows impossibly high accuracy (e.g., exactly 0.0m), or a Scout whose `scout_locations` history shows a teleport (last-known to film-point jump inconsistent with travel time). Recording these as `fraud_signals` in a DB column + event log is pure schema + Edge Function work — fully offline-verifiable, zero native package changes.

**Primary recommendation:** Build Stream 3 (fraud signals) and a Stream 1 "detect + hold" gate in this overnight pass. Scaffold the on-device blur path (Stream 2) as a documented TypeScript interface + a disabled feature flag — the planner must NOT schedule a Wave that builds it without a device build checkpoint.

---

## Standard Stack

### Core (already in repo — no new packages required for server path + fraud signals)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| Supabase Edge Functions (Deno) | hosted | `face-blur-check` + `fraud-eval` Edge Functions | [VERIFIED: supabase/functions/] |
| Google Vision API (REST/fetch) | v1 | Face detection on Mux thumbnail (re-use signage-check pattern) | [VERIFIED: signage-check/index.ts uses REST fetch, GOOGLE_VISION_API_KEY already set] |
| Supabase `market_config` | PostgreSQL table | `blur_enabled`, `fraud_strictness` tunable config per market | [VERIFIED: 0012_dispatch_verification_spine.sql] |
| Supabase `event_log` | PostgreSQL table | Immutable record of every blur verdict + fraud signal | [VERIFIED: 0001_event_log.sql] |
| expo-location | ~19.0.8 | `CLLocation.sourceInformation` via `Location.getLastKnownPositionAsync` (iOS 15+) | [VERIFIED: package.json] |

### New Packages Required FOR ON-DEVICE BLUR ONLY (not needed for server path)

| Library | Version | Purpose | New-Arch Status |
|---------|---------|---------|----------------|
| `react-native-worklets-core` | 1.x | Frame processor worklet runtime (peer dep of vision-camera v4 frame processors) | [CITED: visioncamera4.margelo.com — "requires react-native-worklets-core 1.0.0+"] [ASSUMED: New Arch compatible] |
| `react-native-vision-camera-face-detector` | 2.0.1 | MLKit face detection frame processor plugin | [VERIFIED: npm, latest May 2026] [ASSUMED: New Arch compat — no explicit confirmation found] |
| `@shopify/react-native-skia` | 2.6.6 (latest) | Draw pixelate/blur rect over face bounding boxes on camera canvas | [VERIFIED: npm latest] [ASSUMED: works with vision-camera v4 Skia integration] |
| `react-native-vision-camera-skia` | TBD | Bridge between vision-camera v4 `SkiaCamera` component and Skia drawing | [ASSUMED: exists but version pinning against v4.7.x unverified] |

**WARNING on on-device package stack:** None of these four packages are currently installed. Each requires a new native EAS build. The v4 frame processor + worklets + face-detector + Skia composition has been demonstrated in blog articles but this exact combination on Expo 54 / RN 0.83.2 / New Arch has NOT been verified in this codebase or found confirmed in official docs. Risk rating: MEDIUM (it's plausible and documented to work) but CANNOT be verified without a device build.

**No additional AWS / transcode infrastructure needed for v1** if we take the "detect + hold" approach (detect via Vision API frames; hold clip in `blur_pending` rather than full pixel-level blur). Full pixel transcode is deferred to a future phase or ops flow.

### Version verification

```bash
npm view react-native-vision-camera version    # 5.0.11 (latest) — we're pinned at ^4.7.3 [VERIFIED]
npm view @shopify/react-native-skia version    # 2.6.6 [VERIFIED]
npm view react-native-worklets-core version    # 1.6.3 [VERIFIED]
npm view react-native-vision-camera-face-detector version  # 2.0.1 [VERIFIED]
```

---

## Architecture Patterns

### Recommended File Layout (new files only)

```
supabase/
  migrations/
    0014_privacy_fraud_signals.sql    # fraud_signals column on clips; blur_status enum;
                                      # market_config: blur_enabled, fraud_strictness cols
  functions/
    face-blur-check/
      index.ts                        # calls Vision API on Mux thumbnail; sets blur_status;
                                      # invoked by mux-webhook AFTER GPS gate passes
    fraud-eval/
      index.ts                        # evaluates fraud_signals JSON from the clip row;
                                      # sets fraud_flag on clips; logs event

lmc-app/app/(scout)/
  filming.tsx                         # add: capture sourceInformation.isSimulatedBySoftware
                                      # + accuracy anomaly; forward in mux-upload-url payload

lmc-app/app/lib/
  fraud-signals.ts                    # helper: collect iOS fraud signals at film time
```

### Pattern 1: Blur Gate in mux-webhook (server-side "detect + hold")

The existing `mux-webhook` already has a GPS gate before `delivered`. The blur gate slots in immediately after the GPS gate passes, using the SAME pattern as `signage-check` — but unlike signage-check (which is advisory/fire-and-forget), the blur gate CAN block delivery if `blur_status = 'faces_detected_unblurred'`.

```typescript
// In mux-webhook/index.ts — after GPS gate passes (line ~143)
// Step 6c: BLUR CHECK (Phase 6, D-03, D-07). If enabled for this market,
//   check whether the clip thumbnail contains faces. If it does and on-device
//   blur is not confirmed (blur_status != 'blurred'), hold the clip.
//   blur_status: 'pending' | 'no_faces' | 'blurred' | 'faces_detected_unblurred' | 'blur_check_failed'
//   D-03 default: hold (set check to blur_review) rather than deliver unblurred.
//   When blur_enabled = false in market_config, gate is a no-op (pass through).
try {
  const blurResult = await deps.svc.functions.invoke('face-blur-check', { body: { checkId } });
  if (blurResult?.data?.action === 'hold') {
    // Clip has faces detected and blur is NOT confirmed. Hold it for review.
    await deps.svc.rpc('transition_check', { p_check_id: checkId, p_to: 'blur_review' });
    return new Response('blur_held', { status: 200 });
  }
} catch (_blurErr) {
  // blur gate error -> treat as pass-through (same as GPS unverifiable policy).
  // Log but do not block delivery on a tool error.
}
// Fall through to normal delivered + stripe-capture path.
```

**Source:** Pattern derived from existing `verify-clip` gate in `mux-webhook/index.ts` [VERIFIED: lines 126-142].

### Pattern 2: face-blur-check Edge Function

Re-uses the Google Vision REST fetch pattern from `signage-check/index.ts`.

```typescript
// supabase/functions/face-blur-check/index.ts
// 1. Fetch a Mux thumbnail for the checkId's clip (same as signage-check pattern)
// 2. Call Vision API FACE_DETECTION instead of TEXT_DETECTION
// 3. Read blur_enabled + face_threshold from market_config
// 4. If faces > 0 AND blur_status != 'blurred': set blur_status = 'faces_detected_unblurred'; action = 'hold'
// 5. If no faces: set blur_status = 'no_faces'; action = 'pass'
// 6. Log event: check.face_blur_checked { faces_detected, blur_status, action }
// Returns: { action: 'pass' | 'hold', faces_detected: number }
```

**Source:** Google Vision FACE_DETECTION is the same API key + REST endpoint as TEXT_DETECTION already in use [VERIFIED: signage-check/index.ts]. Pricing: ~$1.50/1000 images (same order as signage). [CITED: cloud.google.com/vision/pricing]

### Pattern 3: Fraud Signals at Film Time (filming.tsx + mux-upload-url)

```typescript
// lmc-app/app/lib/fraud-signals.ts
// Collect at record time, alongside capturedGps.
export interface FraudSignals {
  is_simulated_by_software: boolean | null;  // CLLocation.sourceInformation (iOS 15+)
  location_accuracy_m: number | null;        // suspiciously exact = red flag
  accuracy_is_exact: boolean;               // accuracy <= 1.0m = suspicious
  last_known_to_filmed_jump_m: number | null; // from scout_locations last row
  collection_ts: string;                    // ISO timestamp at capture
}
// Collected in stampGps(), forwarded to mux-upload-url payload, stored on clips row.
```

**Note:** `CLLocation.sourceInformation.isSimulatedBySoftware` is accessed via `expo-location`'s `LocationObject.coords` — the raw iOS `CLLocation` sourceInformation is NOT directly exposed by expo-location v19. It CAN be read if the app calls the native CLLocation API directly or via a custom Expo module. **For v1: approximate via accuracy anomaly detection only.** Direct `isSimulatedBySoftware` access would require a custom native module (deferred). [ASSUMED — expo-location v19 API surface for sourceInformation not verified against official changelog]

### Pattern 4: fraud_signals Schema Extension

```sql
-- In 0014_privacy_fraud_signals.sql
-- Additive columns on clips (same approach as gps_verified in 0012):
ALTER TABLE public.clips
  ADD COLUMN IF NOT EXISTS blur_status TEXT DEFAULT 'pending',  -- see enum above
  ADD COLUMN IF NOT EXISTS fraud_signals JSONB,                 -- raw signal bag
  ADD COLUMN IF NOT EXISTS fraud_flag BOOLEAN DEFAULT FALSE,    -- review queue entry
  ADD COLUMN IF NOT EXISTS fraud_score SMALLINT;               -- 0-100 computed

-- Additive columns on market_config:
ALTER TABLE public.market_config
  ADD COLUMN IF NOT EXISTS blur_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS fraud_strictness TEXT NOT NULL DEFAULT 'flag';
  -- fraud_strictness: 'off' | 'flag' | 'hold' | 'reject' (D-04 tunable)

-- New check status enum value for blur review queue:
-- ALTER TYPE check_status ADD VALUE IF NOT EXISTS 'blur_review';
```

### Anti-Patterns to Avoid

- **Calling npm:@google-cloud/vision in Deno:** Times out (same Pitfall as signage-check). Always use `fetch()` against the REST endpoint. [VERIFIED: STATE.md decision log Phase 05-04]
- **Blocking delivery on a tool error:** Both verify-clip and signage-check use pass-through on invoke failure. face-blur-check should follow the same policy for the gate error case (though the HOLD case itself is intentional). [VERIFIED: mux-webhook.ts line 134-137]
- **Hard-coding `blur_enabled = true` in code:** Must read from `market_config` so ops can toggle per market. [VERIFIED: same principle as film_fence_max_m]
- **Client writing blur_status or fraud_flag:** Both are service-role-only writes (DATA-02). No new client UPDATE policies.
- **Assuming expo-location exposes `isSimulatedBySoftware` directly:** It does NOT. Only the accuracy-based heuristic is available without native code. [ASSUMED — needs verification against expo-location v19 changelog if native signal is required]

---

## Overnight Buildability Map (A/B/C)

This is the most important section for the planner.

### Category A: Buildable + Offline-Verifiable Overnight

These can be built, tested with Vitest/Deno test (no device), and committed tonight:

| Item | What Gets Built | How to Verify |
|------|----------------|---------------|
| **0014_privacy_fraud_signals.sql** | `clips.blur_status`, `clips.fraud_signals`, `clips.fraud_flag`, `clips.fraud_score`; `market_config.blur_enabled`, `market_config.fraud_strictness`; `blur_review` check status enum value | `supabase db push` (or migration SQL test) |
| **face-blur-check Edge Function** | Calls Google Vision FACE_DETECTION on Mux thumbnail; returns `{action, faces_detected}`; sets `blur_status`; logs event | `deno test` with mocked svc + mocked fetch (same pattern as signage-check tests) |
| **fraud-eval Edge Function** | Reads `fraud_signals` JSONB from clips row; computes `fraud_score`; sets `fraud_flag`; logs `check.fraud_flagged` event | `deno test` with mocked svc |
| **mux-webhook blur gate** | Slot `face-blur-check` invoke between GPS gate and `delivered` transition; handle `action=hold` → `transition_check(blur_review)` | Extend existing `mux-webhook/index.test.ts` — add `blurAction` mock option |
| **fraud-signals.ts** (client lib) | Accuracy-anomaly signal collection at film time; forwarded in `mux-upload-url` payload | TypeScript compile only — logic is pure JS |
| **filming.tsx signal capture** | Capture `accuracyM` already exists (`capturedGps.current.accuracyM`); add `accuracy_is_exact` flag; forward to payload | TypeScript compile; no device needed |
| **mux-upload-url** clips row update | Accept `fraud_signals` JSON in body; persist to `clips.fraud_signals` | Extend existing mux-upload-url test |
| **market_config seed update** | Set `blur_enabled = false` for launch (feature-flagged off until on-device blur is confirmed) | Migration SQL |

**Test commands for Category A:**

```bash
# Edge Function Deno tests (all offline, no device):
deno test --allow-env supabase/functions/face-blur-check/index.test.ts
deno test --allow-env supabase/functions/fraud-eval/index.test.ts
deno test --allow-env supabase/functions/mux-webhook/index.test.ts

# TypeScript compile check (RN client):
cd lmc-app && npx tsc --noEmit
```

### Category B: Buildable but ONLY Device-Build/Boot-Verifiable

Can be scaffolded and compiled overnight, but cannot be confirmed working without a new EAS dev build:

| Item | Risk | What Device Build Verifies |
|------|------|---------------------------|
| **Install react-native-worklets-core + face-detector + Skia packages** | New-Arch compat unknown for this exact combo; prior Phase 5 experience shows native packages bite on New Arch | Does the app compile and launch after pod install with these three new natives? |
| **SkiaCamera overlay in filming.tsx** | Can't confirm 60fps, face bounding box accuracy, or that Skia + face-detector + worklets all load without crash | Live camera shows face rect overlays; app doesn't crash on start |
| **On-device face blur rendering** (pixel-level) | Skia blur shader applied to face bounding box regions — visually correct | Troy manually confirms faces are blurred in the camera viewfinder during recording |
| **isSimulatedBySoftware native access** (if custom module built) | Custom Expo module build + New Arch bridge | Xcode simulator shows `isSimulatedBySoftware = true` in logs |

**Planner must NOT schedule Category B work without including a device-build checkpoint task.** The scaffold (installing packages, writing the TypeScript) can be one task; "EAS dev build + visual check" must be a separate, human-verified task.

### Category C: Needs Troy's Manual On-Device Test OR a Decision

| Item | What's Needed |
|------|--------------|
| **Visual blur quality check** | Troy films himself in the viewfinder and confirms faces are blurred acceptably before the clip is submitted |
| **D-03 confirm: hold vs soft-flag** | Troy needs to decide: current docs say "soft-flag"; CONTEXT.md default says "hold." Research recommendation: **hold** (privacy-by-default) but with `blur_enabled = false` at launch, so the hold path is not active until confirmed |
| **D-04 confirm: flag-only vs auto-reject** | Troy needs to decide. Research recommendation: flag-only at launch (low false-positive risk; tunable via `fraud_strictness`) |
| **D-01 confirm: launch with server-side "detect + hold" OR wait for on-device** | If `blur_enabled = false` at launch, no blur pipeline is active yet — functionally deferred. Troy to decide when to flip `blur_enabled = true` (after on-device build + visual check passes) |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Face detection in video | Custom CV model in Deno | Google Vision FACE_DETECTION REST call (re-use signage-check key) | Already set up; ~$1.50/1000 calls; no infra |
| Face blur pixel rewrite of Mux video | Custom transcode pipeline + ffmpeg | AWS Rekognition + Step Functions + OpenCV Lambda (future) or the "detect + hold" v1 approach | Full pixel transcode is valid but is complex AWS infra; v1 = detect + hold is simpler and correct |
| GPS spoof detection | Attempting to block on iOS | Record + flag + human review | iOS non-jailbroken spoof detection is fundamentally limited; raising cost + flagging is the right posture |
| Frame processor native plugin | Custom Swift Nitro Module from scratch | `react-native-vision-camera-face-detector` + `react-native-worklets-core` | Community plugin already exists with MLKit |
| Video blur overlay | Custom Metal/OpenGL shader | `@shopify/react-native-skia` `BlurMaskFilter` or pixelate RuntimeShader | Skia provides both blur and pixelate patterns; no shader code needed |

---

## Common Pitfalls

### Pitfall 1: Mux Does Not Blur

**What goes wrong:** Assuming Mux will blur faces as part of its transcode pipeline. It does not. [VERIFIED: mux.com/features — no face detection or blur listed]

**How to avoid:** All face blur must happen either on-device (before upload) OR via a post-processing step triggered by `face-blur-check` after Mux delivers the `video.asset.ready` event. For v1, the "detect + hold" approach (detect faces; hold clip for human review rather than auto-blur) is feasible without a transcode pipeline.

**If full pixel blur is required in a future phase:** AWS Rekognition Video + Step Functions + OpenCV Lambda is the documented path. Cost is ~$0.10/min for stored video analysis + Lambda execution. For a 15-second clip: ~$0.025 + Lambda cost.

### Pitfall 2: `isSimulatedBySoftware` Only Catches Xcode Simulation

**What goes wrong:** Building logic that auto-rejects GPS-fenced submissions based on `isSimulatedBySoftware`, then finding it never flags any real cheaters (only Xcode's built-in GPS simulation is flagged). [VERIFIED: Apple Developer Forums thread, multiple confirmations]

**How to avoid:** Use `isSimulatedBySoftware` as ONE signal in a multi-factor `fraud_signals` bag (not as the sole gate). Combine with: accuracy anomaly (exact 0.0m accuracy is physically impossible), velocity heuristic server-side (last-known scout_location to film-point distance divided by time since last update — if Scout "teleports" faster than a vehicle could travel, that's a flag), and the Phase 5 GPS hard fence (the 30m fence is still the authoritative gate; fraud detection is ADVISORY on top of it).

**Warning signs:** If you see `fraud_score = 100` but `gps_verified = true`, the Scout is inside the fence but signals are anomalous. Queue for human review.

### Pitfall 3: Adding Three New Native Packages Without a Build

**What goes wrong:** `react-native-worklets-core`, `react-native-vision-camera-face-detector`, and `@shopify/react-native-skia` all require native builds. Installing them via `npm install` and writing TypeScript against them COMPILES, but the app will fail to launch on a physical device until `eas build` produces a new binary with the native modules compiled.

**How to avoid:** Keep all three packages behind a `BLUR_NATIVE_ENABLED` feature flag (env var or `market_config` column). The flag defaults to `false`. The TypeScript scaffold can be committed; only enabling it in a dev build will reveal any New Arch incompatibility. Planner must schedule a "EAS dev build + launch check" task before any Category B work is marked done.

### Pitfall 4: check_status Enum Migration

**What goes wrong:** Adding `'blur_review'` as a new `check_status` enum value requires careful migration ordering. If the `is_valid_check_transition` function is re-replaced but the enum add races with the function update, it can break on Postgres < 14 or fail silently.

**How to avoid:** Mirror the 0007/0012 pattern: add the enum value FIRST (`ALTER TYPE check_status ADD VALUE IF NOT EXISTS 'blur_review'`), then CREATE OR REPLACE the transition function. Both in one migration file, enum add before function replace. [VERIFIED: STATE.md decision: "is_valid_check_transition compares enum on ::text so 0008's no_scout enum-add is safe"]

### Pitfall 5: Calling `face-blur-check` on Every Clip — Costs and Latency

**What goes wrong:** Vision API FACE_DETECTION on a thumbnail is called for every single clip delivery, even clips filmed in empty car parks. This adds ~200-500ms to every delivery and ~$1.50/1000 clips in API cost.

**How to avoid:** Feature-flag via `market_config.blur_enabled` (default `false` at launch). When enabled, keep the single-thumbnail approach (not per-frame). At launch scale (hundreds of clips/month), cost is negligible. Cost scales to ~$15/month at 10,000 clips/month — still acceptable. If performance is a concern, run `face-blur-check` asynchronously (fire-and-forget like `signage-check`) with `blur_status = 'pending'` and deliver with pending status when `blur_enabled = false` or when the check passes other gates.

### Pitfall 6: `expo-location` Does Not Expose `sourceInformation`

**What goes wrong:** Writing code that accesses `position.coords.sourceInformation.isSimulatedBySoftware` in TypeScript expecting it to work — the expo-location v19 TypeScript types do not include this iOS 15+ property, so the code either type-errors or returns undefined silently.

**How to avoid:** For v1, only use `position.coords.accuracy` for the anomaly signal (`accuracy_is_exact` flag). If `isSimulatedBySoftware` is needed, it requires either a custom native Expo module or a separate native call — deferred. Document the gap in the `FraudSignals` type as `is_simulated_by_software: null | boolean` with a comment that `null` means "not available without native module." [ASSUMED — expo-location v19 API for sourceInformation not verified]

---

## Code Examples

### Face Detection via Vision API (re-uses signage-check pattern)

```typescript
// Source: derived from supabase/functions/signage-check/index.ts [VERIFIED]
const VISION_KEY = Deno.env.get("GOOGLE_VISION_API_KEY") ?? "";

async function detectFaces(imageBase64: string): Promise<number> {
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${VISION_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: "FACE_DETECTION", maxResults: 20 }],
        }],
      }),
    },
  );
  const data = await res.json();
  return (data?.responses?.[0]?.faceAnnotations ?? []).length;
}
// Detection confidence: joyLikelihood / angerLikelihood not needed for this use case;
// just face count is sufficient to gate.
```

### Fraud Signal Collection at Film Time

```typescript
// Source: filming.tsx pattern for stampGps() [VERIFIED]
// lmc-app/app/lib/fraud-signals.ts
export interface FraudSignals {
  accuracy_is_exact: boolean;   // accuracy <= 1.0m is physically impossible on GPS
  location_accuracy_m: number | null;
  collection_ts: string;
  // Note: isSimulatedBySoftware requires a native module; left null in v1.
  is_simulated_by_software: null;
}

export function collectFraudSignals(
  accuracy: number | null | undefined
): FraudSignals {
  return {
    accuracy_is_exact: accuracy != null && accuracy <= 1.0,
    location_accuracy_m: accuracy ?? null,
    collection_ts: new Date().toISOString(),
    is_simulated_by_software: null,
  };
}
```

### Server-Side Velocity Heuristic (in fraud-eval Edge Function)

```typescript
// Source: [ASSUMED] — pattern derived from GPS heuristics research
// A Scout's scout_locations row has `updated_at` + lat/lng from when they last
// reported being online. Compare to filmed_lat/lng + filmed_at on the clip.
// If distance > max_vehicle_speed * time_elapsed, flag as teleport.
const MAX_VEHICLE_M_PER_SEC = 55.5; // ~200 km/h absolute upper bound (car/motorbike)
const distM = haversineMeters(lastLat, lastLng, filmedLat, filmedLng);
const elapsedSec = (filmedAt - lastKnownAt) / 1000;
const impliedSpeedMPS = elapsedSec > 0 ? distM / elapsedSec : Infinity;
const is_teleport = impliedSpeedMPS > MAX_VEHICLE_M_PER_SEC;
```

### Schema: fraud_signals JSONB Shape

```json
{
  "accuracy_is_exact": false,
  "location_accuracy_m": 8.5,
  "collection_ts": "2026-06-22T03:14:00.000Z",
  "is_simulated_by_software": null,
  "server_velocity_mps": 12.3,
  "is_teleport": false
}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| GPS-only fence (Phase 5) | GPS fence + fraud_signal bag (Phase 6) | Raises cheating cost; GPS is still the hard gate |
| Manual review of all clips | Detect + hold on face detection; fraud flag surfaces in review queue | Ops only reviews flagged clips |
| No privacy guarantee | "detect + hold" server gate = no unblurred clip ever delivered | With `blur_enabled = true`; off by default at launch |
| Full pixel blur transcode | Deferred — "detect + hold" is the v1 privacy gate | Simpler, no AWS infra; acceptable for launch |
| `isSimulatedBySoftware` as hard block | One signal in a multi-factor score | iOS limitation: only Xcode sim is caught; third-party spoofers are not |

---

## iOS GPS Spoof Detection: Honest Assessment

What iOS ACTUALLY lets you detect on a non-jailbroken device:

| Signal | Reliability | Source |
|--------|-------------|--------|
| `CLLocation.sourceInformation.isSimulatedBySoftware` | LOW — catches only Xcode GPS simulation; third-party spoof apps bypass it entirely | [VERIFIED: Apple Developer Forums thread, multiple devs confirm] |
| `expo-device.isDevice` | LOW — known bug: returns `true` even on iOS simulator | [CITED: github.com/expo/expo/issues/19869] |
| `CLLocation.accuracy` anomaly (<1.0m) | MEDIUM — physically impossible GPS accuracy is a strong signal; easy to spoof by setting accuracy=10.0 | [ASSUMED — heuristic, not documented standard] |
| Velocity/teleport heuristic (server) | MEDIUM — catches lazy spoofers; dedicated spoofers use waypoint routes at realistic speeds | [CITED: industry anti-fraud blog] |
| GPS inside Phase-5 30m fence | HIGH (it's the hard gate) — spoofing requires being within 30m OR knowing the exact coordinates | [VERIFIED: verify-clip/index.ts] |

**Conclusion:** Phase 6 anti-fraud is correctly scoped as "raise the cost + surface for review." A Scout who wants to cheat badly enough on a non-jailbroken iOS device CAN do so. The Phase-5 GPS fence is already the primary defence. Fraud signals add a review queue that surfaces patterns over time.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `react-native-worklets-core` v1.x is New Architecture compatible on RN 0.83.2 | Standard Stack | On-device blur (Category B) fails to compile or crashes on launch |
| A2 | `react-native-vision-camera-face-detector` v2.0.1 works with vision-camera v4.7.x (not just v5) | Standard Stack | Face-detector plugin incompatible; need to implement a custom Nitro module or skip |
| A3 | `react-native-vision-camera-skia` integration package exists and is compatible with vision-camera v4.7.x + `@shopify/react-native-skia` v2.6.6 | Standard Stack | Skia camera overlay not available for v4; would need v5 upgrade (no Expo config plugin) |
| A4 | `expo-location` v19 does NOT expose `CLLocation.sourceInformation.isSimulatedBySoftware` | Code Examples, Pitfall 6 | If it does expose it, we get a stronger fraud signal for free |
| A5 | AWS Rekognition Video pricing for face detection falls under Label Detection (~$0.10/min) | Don't Hand-Roll | Cost of full pixel-blur transcode path is higher than estimated |
| A6 | `transition_check('blur_review')` requires a new enum value AND a new edge in `is_valid_check_transition` | Architecture, Pitfall 4 | Migration fails if the transition guard is not updated to permit this new state |

---

## Open Questions

1. **D-03: hold-on-failure vs soft-flag**
   - What we know: Current docs (`FILMING-POLICY.md` + `SCOUT-CONDUCT.md`) say "blur applied before upload; if blur fails, soft-flag for review." CONTEXT.md default is stricter: hold the clip.
   - What's unclear: Which does Troy want for launch?
   - Recommendation: Start with `blur_enabled = false` (feature-flagged off). When enabled, use **hold** (D-03 default). This is the privacy-safe choice and avoids any legal exposure from delivering unblurred faces. Document it as Troy's decision to confirm.

2. **On-device blur: when to turn on?**
   - What we know: Category B work (packages + EAS build) can be scaffolded overnight but cannot be verified.
   - What's unclear: Does Troy want to attempt Category B now or defer on-device blur to a separate phase?
   - Recommendation: Scaffold Category B (install packages, write the TypeScript interface, wrap in `BLUR_NATIVE_ENABLED = false`) in this phase. Schedule a separate "EAS dev build + visual check" human task. Do NOT mark Phase 6 complete until that human task is done.

3. **`blur_review` state in the check state machine**
   - What we know: `check_status` enum has specific valid values. Adding `blur_review` requires a migration + updating `is_valid_check_transition`.
   - What's unclear: What transitions are valid to/from `blur_review`? Likely: `uploaded/processing -> blur_review -> delivered` (ops manual approve) AND `blur_review -> rejected` (ops manual reject).
   - Recommendation: Planner decides the full transition graph; research confirms it's safe to add the enum value + new edges additively.

---

## Validation Architecture

**Framework:** Deno test (Edge Functions) + Vitest (client lib) + SQL pgTAP (schema)
**Config:** `supabase/functions/*/index.test.ts` + `vitest.config.ts` (repo root) + `supabase/tests/*.test.sql`

### Phase Requirements to Test Map

| ID | Behaviour | Test Type | Command | File |
|----|-----------|-----------|---------|------|
| BLUR-01 | `face-blur-check` detects faces and returns `action=hold` | Unit (Deno) | `deno test --allow-env supabase/functions/face-blur-check/index.test.ts` | Wave 0 gap |
| BLUR-02 | `face-blur-check` with no faces returns `action=pass` | Unit (Deno) | same | Wave 0 gap |
| BLUR-03 | `face-blur-check` with `blur_enabled=false` in market_config is a no-op | Unit (Deno) | same | Wave 0 gap |
| BLUR-04 | mux-webhook: when face-blur-check returns `hold`, check transitions to `blur_review` | Unit (Deno) | `deno test --allow-env supabase/functions/mux-webhook/index.test.ts` | Extend existing test |
| BLUR-05 | mux-webhook: when face-blur-check throws (network error), delivery proceeds (pass-through) | Unit (Deno) | same | Extend existing test |
| FRAUD-01 | `fraud-eval` computes `is_teleport=true` when velocity exceeds threshold | Unit (Deno) | `deno test --allow-env supabase/functions/fraud-eval/index.test.ts` | Wave 0 gap |
| FRAUD-02 | `fraud-eval` sets `fraud_flag=true` and logs event on anomaly | Unit (Deno) | same | Wave 0 gap |
| FRAUD-03 | `collectFraudSignals()` sets `accuracy_is_exact=true` when accuracy <= 1.0m | Unit (Vitest) | `cd lmc-app && npx vitest run --reporter=verbose` | Wave 0 gap |
| SCH-01 | `clips.blur_status` defaults to `'pending'`; `clips.fraud_flag` defaults to `false` | pgTAP | `supabase test db` | Wave 0 gap |

### Sampling Rate

- Per task commit: `deno test --allow-env supabase/functions/<changed-function>/index.test.ts`
- Per wave merge: all Edge Function tests + pgTAP schema tests
- Phase gate: Full suite green + on-device build launches (Category B) + Troy visual check (Category C)

### Wave 0 Gaps

- [ ] `supabase/functions/face-blur-check/index.test.ts` — covers BLUR-01/02/03
- [ ] `supabase/functions/fraud-eval/index.test.ts` — covers FRAUD-01/02
- [ ] `supabase/tests/0014_privacy_fraud_signals.test.sql` — covers SCH-01
- [ ] Extend `supabase/functions/mux-webhook/index.test.ts` with `blurAction` mock option — covers BLUR-04/05
- [ ] `lmc-app/app/lib/fraud-signals.test.ts` (Vitest) — covers FRAUD-03

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | n/a |
| V3 Session Management | No | n/a |
| V4 Access Control | Yes | RLS: `blur_status`, `fraud_flag` are service-role-only writes (DATA-02); same pattern as `gps_verified` |
| V5 Input Validation | Yes | `fraud_signals` JSONB input from client validated server-side in `mux-upload-url` before persisting; no raw client-supplied JSON trusted |
| V6 Cryptography | No | n/a |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client forges `blur_status = 'blurred'` to bypass gate | Tampering | `blur_status` is written ONLY by `face-blur-check` via service role; RLS blocks any client UPDATE on clips.blur_status |
| Client forges `fraud_signals` JSON with `is_teleport = false` | Tampering | `fraud_signals` is RECORDED client-supplied data (provenance trail), but the `fraud_score` and `fraud_flag` are computed server-side in `fraud-eval`; client cannot influence the verdict |
| Scout uses third-party spoof app to pass GPS fence | Spoofing | Phase-5 GPS fence (30m hard max) is still the gate; fraud signals surface for review; cost-raising, not fraud-proof |
| Vision API key exposed via client | Information Disclosure | `GOOGLE_VISION_API_KEY` lives in `Deno.env` (Edge Function secret only); same pattern as existing signage-check. Never in RN bundle. |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Google Vision API (REST) | face-blur-check | Yes (key already set) | v1 | None needed |
| Supabase Edge Functions | face-blur-check, fraud-eval | Yes (deployed) | hosted | — |
| EAS Build | Category B (on-device blur) | Yes (Expo account troyreed26) | SDK 54 profile | Not needed for server path |
| `react-native-worklets-core` | Category B only | NOT installed | 1.6.3 (latest) | Skip Category B if New Arch compat fails |
| `react-native-vision-camera-face-detector` | Category B only | NOT installed | 2.0.1 (latest) | Skip Category B |
| `@shopify/react-native-skia` | Category B only | NOT installed | 2.6.6 (latest) | Skip Category B |

**Missing with no fallback:** None for the server path (Category A).

**Missing with fallback (Category B):** All three native packages — fallback is "skip Category B, keep blur_enabled=false, defer on-device blur."

---

## Sources

### Primary (HIGH confidence)
- `supabase/functions/verify-clip/index.ts` — GPS gate pattern reused for blur gate
- `supabase/functions/mux-webhook/index.ts` — slot location for blur gate
- `supabase/functions/signage-check/index.ts` — Google Vision REST fetch pattern (exact reuse)
- `supabase/migrations/0012_dispatch_verification_spine.sql` — market_config extension pattern
- `lmc-app/app/(scout)/filming.tsx` — GPS stamp pattern (capturedGps) extended for fraud signals
- `.planning/STATE.md` — Phase 5 decisions log (Deno Node-compat, REST-not-npm pattern)

### Secondary (MEDIUM confidence)
- [visioncamera4.margelo.com](https://visioncamera4.margelo.com/docs/guides/frame-processors) — v4 frame processor requires react-native-worklets-core
- [github.com/luicfrr/react-native-vision-camera-face-detector](https://github.com/luicfrr/react-native-vision-camera-face-detector) — v2.0.1, MLKit, requires worklets-core
- [docs.swmansion.com/react-native-worklets](https://docs.swmansion.com/react-native-worklets/docs/guides/compatibility/) — RN 0.83 supported; New Arch required
- [Apple Developer Forums — isSimulatedBySoftware](https://developer.apple.com/forums/thread/803179) — only catches Xcode sim, not third-party spoofers
- [aws.amazon.com — Rekognition video blur](https://aws.amazon.com/blogs/machine-learning/blur-faces-in-videos-automatically-with-amazon-rekognition-video/) — Step Functions + OpenCV pattern for full pixel blur
- [react-native-vision-camera Skia Frame Processors](https://visioncamera.margelo.com/docs/guides/skia-frame-processors) — SkiaCamera + Skia integration

### Tertiary (LOW confidence / ASSUMED)
- `react-native-vision-camera-face-detector` v2.0.1 compatibility with vision-camera v4.7.x specifically — not explicitly confirmed, only implied
- `react-native-vision-camera-skia` package version compatibility with v4.7.x — not verified
- `expo-location` v19 does NOT expose `sourceInformation.isSimulatedBySoftware` — assumed from TypeScript types review, not confirmed against changelog
- Server velocity heuristic thresholds — reasonable values from training knowledge, not from a spec

---

## Metadata

**Confidence breakdown:**
- Server path (face-blur-check, fraud-eval, schema): HIGH — direct extension of verified Phase-5 patterns
- On-device blur (Category B): LOW-MEDIUM — packages confirmed to exist and be broadly New Arch compatible, but this exact combo on Expo 54 + RN 0.83.2 is UNVERIFIED
- iOS spoof detection signals: MEDIUM (accuracy anomaly) / LOW (isSimulatedBySoftware) — iOS fundamentally limits what's detectable
- Fraud-signal schema + server heuristics: HIGH — pure server logic, offline-verifiable

**Research date:** 2026-06-22
**Valid until:** 2026-07-22 (stable domain; v4 frame processor compatibility claim is the most time-sensitive — check if vision-camera upgrades to v5 with Expo config plugin before building Category B)

---

## RESEARCH COMPLETE

**Phase:** 06 — Privacy + Anti-Fraud Hardening
**Confidence:** HIGH (server path) / LOW-MEDIUM (on-device blur)

### Key Findings

- **Mux does NOT blur.** Server-side blur requires a post-process step. For v1, "detect faces + hold clip if faces found" (using Google Vision API, already set up) is the correct and deployable approach — NOT a full pixel transcode.
- **On-device frame processor blur is plausible but CANNOT be verified overnight.** The package stack (worklets-core + face-detector + Skia) is theoretically New-Arch compatible on RN 0.83, but none are installed and prior Phase-5 experience shows native packages have New-Arch surprises. Must be behind a feature flag with a mandatory EAS build + visual check task.
- **iOS GPS spoof detection is fundamentally limited.** `isSimulatedBySoftware` only catches Xcode. The right posture (D-04, D-05) is: record signals, flag for review, never hard-block at launch. The Phase-5 GPS fence is the authoritative gate.
- **Everything important for v1 privacy IS buildable tonight:** schema migration, face-blur-check Edge Function (detect + hold), fraud-eval Edge Function, fraud-signal collection in filming.tsx, mux-webhook blur gate, Deno tests for all of the above.
- **Launch safely with `blur_enabled = false`** in market_config. The privacy gate is scaffolded and tested but not active until Troy confirms the on-device path (Category B) or until the "detect + hold" server path is explicitly turned on after ops review.

### File Created
`.planning/phases/06-privacy-anti-fraud-hardening-on-device-face-plate-blur-befor/06-RESEARCH.md`

### Overnight Buildability Map Summary
- **Category A (offline-verifiable):** 0014 migration, face-blur-check, fraud-eval, mux-webhook blur gate, fraud-signals.ts, filming.tsx signal capture, Deno tests
- **Category B (device-build only):** worklets-core + face-detector + Skia install, SkiaCamera overlay in filming.tsx, on-device blur rendering
- **Category C (Troy's manual check or decision):** D-01/D-03/D-04 confirms, visual blur quality check

### Ready for Planning
Research complete. Planner can create PLAN.md files prioritising Category A and scaffolding Category B behind a feature flag.
