# Phase 6 — On-Device Face Blur (V2): Why We Keep Crashing + The Robust Path

**Researched:** 2026-06-22
**Domain:** On-device video face blur (blur-before-upload) for Expo 54 / React Native + New Architecture + Hermes
**Confidence:** HIGH on the crash root-cause and the recommended architecture; MEDIUM on exact native build effort (no off-the-shelf library exists, so effort is a build estimate not a measured one)

> This is the second-pass research after we actually TRIED the live frame-processor path and hit a native crash. It supersedes the on-device (Category B) sections of `06-RESEARCH.md`. The server-side gate, fraud signals, and schema work in `06-RESEARCH.md` are unchanged and still correct.

---

## Plain-English summary (read this first, Troy)

**What we want:** when a Scout films a clip, faces in the *delivered* clip must be blurred automatically. No holding clips for review, no "blur happens on our server later" — the blur should just happen on the phone, before the video is uploaded. (We do NOT need the blur to show up live in the camera while filming — only the final saved clip matters. That distinction makes this much easier.)

**Why we keep crashing (the honest version):** The approach we tried blurs faces *live, frame by frame, while the camera is running*. To do that, three separate native libraries have to run code on a special high-speed "camera thread" and constantly hand data back to the normal app. That hand-off is done through a fragile bridge (called "worklets") that talks directly to the JavaScript engine (Hermes). On the modern React Native engine we're forced to use (the "New Architecture", which Mapbox requires), **that bridge is exactly the part that's known to crash** — and it's the same family of crash we already hit twice in this app (the upload task and Google Sign-In). It's not a bug in our code. It's that this whole live-blur library stack was built for an older engine and is mid-migration to a newer one. We're caught in the gap.

**The fix — stop blurring live; blur the file after recording instead.** Record the clip normally (the camera already works perfectly). Then, the instant recording stops and before we upload, run the saved video file through Apple's own face-blur tools on iPhone (and Google's equivalent on Android). This:

- **Avoids the entire crash class.** It doesn't touch the camera thread or the worklets bridge at all. It's a plain, ordinary native function — the same safe kind of native code Apple and Google ship and Expo fully supports on the New Architecture.
- **Uses first-party Apple/Google frameworks** (Vision + Core Image on iOS; ML Kit on Android), not a community library that breaks every release.
- **Keeps the privacy promise fully:** the raw, unblurred video never leaves the phone — the blur is baked into the file before a single byte uploads.
- **Costs the Scout a few extra seconds.** Blurring a 15-second clip on a modern phone takes roughly 3-10 seconds. We show a "Securing your clip…" spinner. That's it.

**My recommendation:** build a small custom native module (packaged the Expo way, via a config plugin — no manual Xcode edits) that takes the recorded file, blurs faces, and returns a new file. Wire it into the one line in the upload flow where we currently hand the raw file to the uploader. Ship it behind a flag and verify it in small, safe steps so we never repeat the crash-after-crash cycle.

**One correction to flag:** the package.json on this machine shows React Native **0.81.5**, not 0.83.2 (the brief said 0.83.2). This matters for version choices below — I've researched for the version actually installed.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (where blur runs):** Prefer on-device, before upload (raw never leaves the phone). The HARD product requirement (this V2 objective) makes on-device blur-before-upload the target, with NO clip-holding and NO server-side-only path. *This V2 research treats on-device as the committed direction, not an option to weigh against server-side.*
- **D-02:** Faces = always. License plates = best-effort.
- **D-03 (blur-failure handling):** Privacy-safe default — if blur cannot be applied/confirmed, the clip is NOT delivered. *Note: the V2 objective says NO holding clips. Reconcile in the morning: the privacy-safe behaviour when on-device blur genuinely fails on a given device is still "don't deliver an unblurred face." See "Fallback" section — the proposal is the server-side detect gate stays as a dormant safety net ONLY, not the primary path.*
- **D-04:** Record `fraud_signal`, flag for review, don't auto-reject at launch. (Unchanged — not in scope for blur V2.)
- **D-06:** Signage stays server-side. (Unchanged.)
- **D-07:** No clip DELIVERED with unblurred faces.

### Claude's Discretion
- Blur radius/strength, the specific Vision/CoreML/ML Kit model, blur vs pixelate, performance/quality tradeoff. Tunable.

### Deferred Ideas (OUT OF SCOPE)
- Live-viewfinder blur (explicitly NOT required by this objective — only the delivered clip).
- Full adversarial anti-spoof, on-device signage, scene blur beyond faces+plates, Live feed/B2B.
</user_constraints>

---

## Part 1 — Root cause: why the live frame-processor stack crashes here

### The crash, precisely

We installed and ran:
`react-native-vision-camera@4.7.3` + `react-native-worklets-core@1.6.3` + `react-native-vision-camera-face-detector@1.10.2` + `@shopify/react-native-skia@2.6.6`, with a Skia `<Canvas>` overlay and a `useRunOnJS` bridge pushing face bounds from the frame-processor worklet to React state. Result: **native SIGSEGV in worklets-core ↔ Hermes on filming-screen mount / frame-processor init.** `[VERIFIED: this session's objective + repo state — _filming-blur-overlay.tsx, blur-config.ts]`

### Why — five interacting causes

**1. The frame processor runs a JS-engine "worklet" on the camera thread, and the hand-off back to JS is the documented crash point on New RN.**
A vision-camera frame processor is a worklet: a chunk of JS compiled to run on a separate native thread, executing against a *second* Hermes runtime. The moment that worklet calls back into your normal JS (via `runOnJS`/`useRunOnJS` — which is exactly what our overlay does to deliver face bounding boxes to React state), it crosses runtimes through worklets-core's JSI glue. **There is an open, confirmed vision-camera issue (#3666): "App crashes when calling a JS function inside frameProcessor on React Native 0.79+" — a hard SIGSEGV in JSI string creation, reproduced in the official example app, with `console.log` alone working but `runOnJS` crashing.** `[VERIFIED: github.com/mrousavy/react-native-vision-camera/issues/3666]` That is our exact symptom and our exact RN range.

**2. `react-native-worklets-core` is the wrong (legacy, sunsetting) worklets runtime for our RN/New-Arch combo.**
The ecosystem has split into two worklets packages:
- `react-native-worklets-core` (Margelo, the one we have) — the original, built for vision-camera v4. `[VERIFIED: npm — latest 1.6.3, peerDeps `react-native: '*'`]`
- `react-native-worklets` (Software Mansion, the Reanimated team's runtime) — the new standard. **Its peerDependency is `react-native: '0.83 - 0.86'`.** `[VERIFIED: npm — react-native-worklets@0.9.2]`

There is an **active, maintainer-acknowledged migration to move vision-camera off `react-native-worklets-core` onto `react-native-worklets`** (vision-camera issue #3669, Nov 2025). `[VERIFIED: github.com/mrousavy/react-native-vision-camera/issues/3669]` We are sitting on the *old* runtime right as it's being abandoned — the worst possible moment for stability.

**3. The whole modern stack jumped to Nitro Modules, and we can't follow without breaking Mapbox/Expo.**
`react-native-vision-camera@5.0.11` (current) now peer-depends on `react-native-nitro-modules` + `react-native-nitro-image`, and `react-native-vision-camera-face-detector@2.0.1` requires **vision-camera ≥ 5.0 + nitro-modules ≥ 0.35**. `[VERIFIED: npm peerDependencies]` So the supported, maintained face-detector only exists for v5/Nitro. But we're pinned to vision-camera v4.7.x because **v5 ships no Expo config plugin** (decision logged in STATE.md / 06-05-SUMMARY). That forced us onto face-detector **v1.10.2** (the last v4-compatible release) on top of the **sunsetting worklets-core** — i.e. the exact stale combination nobody is fixing. The Skia bridge (`react-native-vision-camera-skia`) is **v5-only — no v4 version exists at all** `[VERIFIED: 06-05-SUMMARY confirmed A3 false]`, which is why we fell back to a manual Canvas overlay.

**4. This is the same New-Architecture crash family we've already hit twice.**
- `expo-file-system` `createUploadTask` silently no-oped because its EventEmitter/`NativeEventEmitter` bridge doesn't fire under New-Arch bridgeless mode. `[VERIFIED: lmc-app/app/lib/clips.ts header comment]`
- `@react-native-google-signin/google-signin` no-oped on Old-Arch native bridges until `newArchEnabled: true` was forced. `[VERIFIED: app.config.js comment]`

The pattern: **third-party native modules that bridge through legacy mechanisms (EventEmitter, worklets-core JSI, old TurboModule branches) break under New Arch + Hermes bridgeless.** The live frame-processor is the most bridge-heavy thing in the app, so it fails hardest. `[VERIFIED: repo history + this session]`

**5. New-Arch + Hermes build-linking fragility for this stack specifically.**
Beyond runtime: worklets-core + vision-camera + Hermes has a documented class of *build* failures too — `undefined symbol: RNWorklet::JsiWorkletContext::initialize` (worklets-core #235) and Hermes/`libhermes not found` CMake failures (vision-camera #3693). `[VERIFIED: github.com/margelo/react-native-worklets-core/issues/235, /react-native-vision-camera/issues/3693]` Even when it links, frame-processor `runAsync`/`runOnJS` SIGSEGVs are a recurring class (#2589, #1990). `[VERIFIED: vision-camera issues #2589, #1990]`

### Is the live path fixable with a version matrix? Honest answer: not robustly, not on our stack.

There are only two theoretically-stable live configurations, and **both are blocked for us:**

| Path | Requires | Why it's blocked here | Confidence |
|------|----------|----------------------|-----------|
| **Stay on v4 + worklets-core, find magic versions** | A worklets-core / vision-camera / Skia combo with no JSI crash on RN 0.81 + New Arch | No such known-good combo is documented; #3666 (the runOnJS SIGSEGV) is open on 0.79+, the runtime is being abandoned, Skia v4 bridge doesn't exist. Chasing this is the crash-after-crash trap. | HIGH (that it's a dead end) |
| **Upgrade to v5 + Nitro + react-native-worklets** | vision-camera ≥5, nitro-modules, react-native-worklets, RN 0.83+ | (a) v5 has **no Expo config plugin** (breaks our prebuild model); (b) `react-native-worklets` needs **RN 0.83-0.86** and we're on **0.81.5**; (c) it's a large, risky native upgrade touching the camera that already works. | HIGH |

**Conclusion:** the live-frame-processor approach is *fundamentally fragile on this exact stack*, not one version-pin away from working. And critically — **we don't need it.** The objective says live-viewfinder blur is NOT required. Blurring live is strictly harder than blurring the saved file, and it's the part that crashes. So we delete the requirement that causes the crash.

---

## Part 2 — The four architectures, ranked by robustness on OUR stack

| Rank | Architecture | Robustness on RN 0.81 / New-Arch / Hermes | iOS+Android | Latency (15s clip) | Privacy (raw stays on device) | Build effort | Maintenance risk |
|------|--------------|-------------------------------------------|-------------|--------------------|-------------------------------|--------------|------------------|
| **1 ✅** | **Post-record native processing** (custom Expo module: iOS AVFoundation+Vision+CoreImage; Android MediaCodec/MediaMuxer+ML Kit) | **HIGH** — plain async native module, no worklets, no camera-thread bridge, no JSI worklet glue. Expo Modules API is New-Arch-native + auto back-compatible. | Both | ~3-10s iOS, ~5-15s Android | **Full** — blur baked in before upload | **Medium-High** (custom module, no off-the-shelf lib) | **LOW** — first-party Apple/Google frameworks, stable for years |
| 2 | **Fix the live frame-processor** (worklets-core version matrix) | **LOW** — this is the crash. No known-good combo; sunsetting runtime. | Both (if it worked) | live (0 extra) | Full | High (and likely never stable) | **HIGH** — mid-migration, abandoned runtime |
| 3 | **Off-the-shelf RN video-face-blur library / commercial SDK** | N/A — **does not exist** | — | — | — | — | — |
| 4 | **On-device ML-Kit/Vision selfie-segmentation / face mesh** | Same fragility as #2 if done live; if done post-record it collapses into #1 with a heavier model | Both | slower than #1 | Full | High | Medium |

### Why #1 wins — the detail

**It side-steps the entire crash class by construction.** A post-record blur module is invoked once, on demand, from JS: `blurFaces(inputPath) -> outputPath`. It is an ordinary asynchronous native function (a JSI promise call — the *same* safe pattern that fixed our upload: we replaced the EventEmitter `createUploadTask` with the plain promise-based `uploadAsync`, and that worked under New Arch `[VERIFIED: clips.ts header]`). **No worklet. No second Hermes runtime. No camera thread. No `runOnJS`.** None of the five root causes above can fire.

**Expo Modules API is explicitly New-Architecture-native and auto-backwards-compatible.** `[VERIFIED: docs.expo.dev/modules/overview — "Expo Modules all support the New Architecture and are automatically backwards compatible"]` This is the correct packaging (see Part 4), and it's the opposite risk profile of the worklets stack.

**It's first-party frameworks, not community libraries.**
- **iOS:** `AVMutableVideoComposition(asset:applyingCIFiltersWithHandler:)` applies a Core Image filter to every frame during export; face detection via `Vision` (`VNDetectFaceRectanglesRequest`) or `CIDetector`; blur via `CIGaussianBlur` (or `CIPixellate`), masked to face rects; export via `AVAssetExportSession`. All Apple, all stable. `[CITED: developer.apple.com/documentation/avfoundation/avmutablevideocomposition/videocomposition(with:applyingcifilterswithhandler:)]`
- **Android:** decode with `MediaCodec`/`MediaExtractor`, detect per-frame faces with **ML Kit Face Detection** (`PERFORMANCE_MODE_FAST` + tracking), blur the face region on each frame, re-encode with `MediaCodec` + `MediaMuxer`. `[CITED: developers.google.com/ml-kit/vision/face-detection/android]`

### Why NOT the others

- **#2 (fix live):** documented dead end on our stack (Part 1). Building on it is the crash-after-crash trap the objective explicitly wants to avoid.
- **#3 (off-the-shelf):** I searched specifically for a maintained RN library that blurs faces *in a recorded video file* and re-encodes. **None exists.** The RN "blur" libraries (`@react-native-community/blur`, `react-native-skia` Blur, Margelo `react-native-blur`) blur *UI views*, not video files. `[VERIFIED: WebSearch — github.com/margelo/react-native-blur, shopify.github.io/react-native-skia/docs/image-filters/blur]` The ML-Kit RN packages (`@react-native-ml-kit/face-detection`, `react-native-vision-camera-mlkit`) *detect* faces but don't blur+re-encode video. No credible commercial RN SDK for this surfaced. So "use a library" is not on the table — it's build-it or live-frame-processor, and the latter crashes.
- **#4 (segmentation/face-mesh):** heavier model, more battery/time, no robustness gain. Plain face-rectangle blur is sufficient for the privacy promise. Done live it has the same crash exposure; done post-record it's just a slower #1.

---

## Part 3 — Recommended path + implementation sketch

### Primary path: post-record native face-blur Expo module (`lmc-blur`)

**The seam — where it hooks in (and it's tiny):**

The recording → upload flow already isolates the file path perfectly. In `filming.tsx`, `onRecordingFinished` sets `capturedPath`, and `handleSubmit` calls `clipUpload.submit(checkId, capturedPath, …)`, which calls `uploadWithRetry(localPath, …)` in `clips.ts`. `[VERIFIED: filming.tsx lines 196-198, 280-290; clips.ts submit() lines 310-333]`

**The blur step inserts at exactly one point — between "have the file" and "upload the file":**

```
onRecordingFinished -> capturedPath          (raw clip, unchanged)
handleSubmit:
   blurredPath = await LmcBlur.blurFaces(capturedPath, { radius })   // NEW — the only new line of flow
   clipUpload.submit(checkId, blurredPath, …)                        // upload the BLURRED file
```

Cleanest placement: do the blur inside `clipUpload.submit` (or a thin wrapper) so the UI's existing `status` state machine (`'uploading' | 'processing'`) gains one prior state `'securing'`. The Scout sees "Securing your clip…" then the normal upload progress. `capturedPath` (raw) is deleted after a successful blur so the raw never lingers.

**Native module surface (JS-facing):**

```ts
// lmc-blur — Expo module
export type BlurResult = {
  outputPath: string;     // file:// path to the blurred, re-encoded clip
  facesBlurred: number;   // count for the event log / telemetry
  status: 'blurred' | 'no_faces' | 'failed';
};
export function blurFaces(
  inputPath: string,
  opts?: { radius?: number; mode?: 'gaussian' | 'pixelate' }
): Promise<BlurResult>;
```

- `status: 'no_faces'` → returns the original file untouched (nothing to blur — still safe to deliver).
- `status: 'failed'` → see Fallback below. Never returns the raw file as if it were blurred.

**iOS native (Swift, inside the Expo module):**
1. `AVURLAsset` from `inputPath`.
2. `AVMutableVideoComposition(asset:applyingCIFiltersWithHandler:)` — in the handler, per frame: run `VNDetectFaceRectanglesRequest` (or cache detections at a lower sample rate and interpolate for speed), build a blurred copy (`CIGaussianBlur`), and composite the blurred pixels only inside each face rect (expanded ~20%) over the original via a mask. `[CITED: Apple AVFoundation + Vision + Core Image docs]`
3. `AVAssetExportSession` (preset matching capture, no audio — VID-02 already mic-disabled) → write to a new temp path.
4. Resolve `{ outputPath, facesBlurred, status }`.
5. Performance: use Metal-backed `CIContext`; consider MPS Gaussian blur if CIGaussianBlur is too slow. Detect at ≤15fps sampling, not every frame. `[CITED: Apple — MPSImageGaussianBlur]`

**Android native (Kotlin, inside the Expo module):**
1. `MediaExtractor` → `MediaCodec` decoder to frames (Surface/Bitmap).
2. **ML Kit Face Detection**, `PERFORMANCE_MODE_FAST` + `enableTracking()` for temporal smoothness. `[CITED: developers.google.com/ml-kit/vision/face-detection/android]`
3. Blur each detected face rect on the Bitmap (RenderEffect/RenderScript-replacement or a fast box/stack blur).
4. Re-encode via `MediaCodec` encoder + `MediaMuxer` → new file.
5. Resolve the same result shape.

**Tunables (Claude's discretion, store in `blur-config.ts` + optionally `market_config`):** `radius` (start ~18-25px equivalent at 1080p), `mode` (gaussian default; pixelate is cheaper if CI blur is slow), detection sample rate, face-rect padding.

### Incremental on-device verification plan (so we DON'T repeat crash-after-crash)

The whole point: prove each layer in isolation before stacking the next. Each step is a separate, individually-verifiable checkpoint with a clear pass/fail.

| Step | What we verify | How (on device) | Pass criteria | If it fails |
|------|----------------|-----------------|---------------|-------------|
| 0 | The empty module loads under New Arch | Add `lmc-blur` Expo module with a no-op `blurFaces` returning the input path; EAS dev build; boot the app; open filming. | App boots, filming opens, no crash. | Stop. The packaging is wrong — fix before any native CV code. |
| 1 | Native frameworks link & run | `blurFaces` opens the asset and **copies it through AVAssetExportSession / MediaMuxer with NO blur**, returns the new path. | Returns a playable re-encoded file; no crash. | Export/codec config issue — isolated from CV, easy to debug. |
| 2 | Face detection works | Add Vision/ML Kit detection; log `facesBlurred` count but still don't blur. | Count is plausible (1 face in a selfie test, 0 in a wall shot). | Detection model/threshold issue only. |
| 3 | Blur composites correctly | Apply blur to detected rects; return blurred file. | Troy films himself → faces visibly blurred in the SAVED clip on playback. | Masking/compositing issue only. |
| 4 | End-to-end + perf | Wire into `submit`; measure time on a real mid-tier device. | 15s clip blurred + uploaded; "securing" step ≤ ~10s iOS / ~15s Android; delivered clip has blurred faces. | Tune sample rate / switch to pixelate / MPS. |
| 5 | Failure handling | Force a blur failure (corrupt input). | `status:'failed'` triggers the Fallback path, NOT an unblurred upload. | Privacy bug — block release. |

Keep it behind a flag (`BLUR_NATIVE_ENABLED`, already exists `[VERIFIED: blur-config.ts]`) so steps 0-2 can ship dormant. Only flip on after step 3 visual confirmation.

**Also: remove the live-blur scaffold once #1 is proven.** The current `_filming-blur-overlay.tsx` + worklets-core + face-detector(v1) + the `react-native-worklets-core/plugin` babel entry are the crashing code; they should be deleted, not left dormant, to avoid build-linking fragility (Part 1, cause 5) and confusion. `[VERIFIED: _filming-blur-overlay.tsx, babel.config.js, package.json]`

### Fallback (privacy-safe, NOT a hold-everything regression)

If `blurFaces` returns `status:'failed'` on a given clip/device, the privacy promise (D-07) still must hold. Options, in order of preference:
1. **Retry once** (transient codec/memory failure is common; a retry often succeeds).
2. **Pixelate fallback mode** (cheaper, more robust than Gaussian on weak devices) before giving up.
3. **Only if both fail:** route that single clip to the **already-built, currently-dormant** server-side "detect-and-hold" gate (`face-blur-check` from `06-RESEARCH.md`). This is NOT the primary path and NOT the default — it's a last-resort net for the rare device where on-device blur genuinely can't run, so we never deliver an unblurred face. This honours D-07 while keeping on-device as the real mechanism. Reconcile with the V2 objective's "no holding clips" in the morning: the intent is *clips don't get held in the normal flow* — this is the <1% failure escape hatch.

---

## Part 4 — Expo packaging (critical: no manual ios/ edits)

This app uses **prebuild**: `ios/` is gitignored; `app.config.js` + config plugins are the source of truth `[VERIFIED: app.config.js, CLAUDE.md]`. A native module MUST therefore be added the Expo way:

- **Build it as a local Expo module** via the Expo Modules API (`npx create-expo-module --local lmc-blur`, lives in `lmc-app/modules/lmc-blur/`). Expo prebuild auto-links local modules; no manual Podfile/Xcode edits, and it survives a clean prebuild. `[CITED: docs.expo.dev/modules/overview, /modules/get-started]`
- **Expo Modules API is New-Arch-native and auto back-compatible** `[VERIFIED: docs.expo.dev/modules/overview]` — the opposite risk profile of the worklets stack. SDK 56 even removed the Obj-C++ middle layer (Swift↔C++ interop direct to JSI), so the path is getting *more* stable, not less. `[CITED: expo.dev/changelog/sdk-56-beta]` (We're on SDK 54, which already fully supports it.)
- **Do NOT** add a Nitro module or a vision-camera v5 upgrade just for this — that reintroduces the config-plugin/Expo-prebuild problems that pinned us to v4.
- ML Kit on Android pulls a Gradle dependency; the local module's `build.gradle` declares it — handled inside the module, no app-level config-plugin gymnastics.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Face detection | A custom CV/ML model | iOS `Vision` `VNDetectFaceRectanglesRequest` / Android **ML Kit Face Detection** | First-party, on-device, free, stable for years `[CITED: Apple Vision; ML Kit docs]` |
| Per-frame video filter pipeline | A hand-rolled frame loop + manual H.264 muxing from scratch | iOS `AVMutableVideoComposition(applyingCIFiltersWithHandler:)` + `AVAssetExportSession`; Android `MediaCodec`+`MediaMuxer` | Apple/Google handle timing, color, codec, audio passthrough `[CITED: Apple AVFoundation docs]` |
| The blur itself | A custom Metal/GL shader | `CIGaussianBlur`/`CIPixellate` (iOS), RenderEffect/box-blur (Android), MPS if perf-bound | Built-in, optimized `[CITED: Apple Core Image; MPS]` |
| Live frame-processor blur | The worklets-core + face-detector(v1) + Skia overlay stack | Post-record module (above) | That stack is the crash (Part 1); objective doesn't require live blur |
| Native packaging | Manual `ios/` Podfile/Xcode edits | Local **Expo module** (Expo Modules API) | `ios/` is gitignored/prebuilt; manual edits get wiped + aren't New-Arch-safe |

---

## Common Pitfalls

1. **Calling `runOnJS`/`useRunOnJS` from a frame processor on RN 0.79+** → SIGSEGV (#3666). The post-record module avoids it entirely. `[VERIFIED]`
2. **Leaving the dormant worklets-core stack installed** → build-linking fragility (`undefined symbol RNWorklet`, Hermes CMake) persists even unused. Delete it. `[VERIFIED: #235, #3693]`
3. **Detecting faces on every single frame** → slow + battery. Sample at ≤15fps and track/interpolate (ML Kit `enableTracking`; cache Vision detections). `[CITED: ML Kit perf guidance]`
4. **Forgetting audio** — clips are video-only (VID-02, mic disabled). Don't accidentally re-add audio during re-encode; pass through video track only. `[VERIFIED: app.config.js]`
5. **Returning the raw file as "blurred" on detection failure** → privacy breach. `status:'no_faces'` (safe to deliver) and `status:'failed'` (Fallback) must be distinct from `'blurred'`. 
6. **Not deleting the raw clip after blur** → unblurred copy lingers in tmp. Delete `capturedPath` on success.
7. **Upgrading vision-camera to v5 to "fix" blur** → reintroduces the no-Expo-config-plugin problem + a large camera-path risk. Not needed.

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| EAS Build | the new native module | Yes (Expo `troyreed26`) | SDK 54 profile | — |
| Expo Modules API | local `lmc-blur` module | Yes (Expo 54.0.35) | bundled | — |
| iOS AVFoundation/Vision/CoreImage | iOS blur | Yes (system) | iOS 15.5 min (already set) | — |
| Android ML Kit Face Detection | Android blur | Yes (Gradle dep) | latest | — |
| `react-native-worklets-core`/face-detector(v1)/`react-native-vision-camera-skia` | live path (NOT recommended) | installed (worklets-core, face-detector); skia-bridge has no v4 ver | 1.6.3 / 1.10.2 / n/a | **Remove** — replaced by post-record module |

**Note on RN version:** package.json on this machine = **react-native 0.81.5**, expo 54.0.35, vision-camera 4.7.3 `[VERIFIED: node_modules/*/package.json]`. The objective stated 0.83.2 — the post-record path doesn't care about the RN version (no worklets), but it's why `react-native-worklets` (needs 0.83+) isn't an option for a live fix anyway.

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | iOS `AVMutableVideoComposition(applyingCIFiltersWithHandler:)` + Vision + CIGaussianBlur blurs a 15s clip in ~3-10s on a modern iPhone | Part 3 | If much slower, switch to MPS / pixelate / lower sample rate — quality/perf tunable, not a blocker |
| A2 | Android MediaCodec+ML Kit re-encode of a 15s clip completes in ~5-15s on a mid device | Part 3 | Same mitigation; Android is the slower side — set expectations there |
| A3 | A local Expo module with this native code links cleanly under New Arch on EAS without manual ios/ edits | Part 4 | Verified incrementally at Step 0 before any CV code is written — low residual risk |
| A4 | No maintained off-the-shelf RN library blurs faces in a recorded video file | Part 2 | Searched specifically; if one surfaces, evaluate — but build effort is the only downside of #1 |
| A5 | The repo is RN 0.81.5 (not 0.83.2 as briefed) | throughout | Doesn't change the recommendation; noted for accuracy |

---

## Sources

### Primary (HIGH)
- `lmc-app/app/lib/clips.ts` — upload seam + the New-Arch EventEmitter root-cause (the precedent for "plain async native call works, bridged event API doesn't").
- `lmc-app/app/(scout)/filming.tsx` — recording→submit flow; exact insertion point.
- `lmc-app/app.config.js`, `babel.config.js`, `blur-config.ts`, `_filming-blur-overlay.tsx` — the current crashing scaffold + prebuild/config-plugin model.
- [github.com/mrousavy/react-native-vision-camera #3666](https://github.com/mrousavy/react-native-vision-camera/issues/3666) — `runOnJS`-in-frameProcessor SIGSEGV on RN 0.79+ (our exact crash).
- [vision-camera #3669](https://github.com/mrousavy/react-native-vision-camera/issues/3669) — active migration off `react-native-worklets-core`.
- [worklets-core #235](https://github.com/margelo/react-native-worklets-core/issues/235), [vision-camera #3693](https://github.com/mrousavy/react-native-vision-camera/issues/3693) — build-linking fragility.
- npm peerDependencies (verified this session): `react-native-worklets@0.9.2` (RN 0.83-0.86), `react-native-vision-camera@5.0.11` (nitro), `react-native-vision-camera-face-detector@2.0.1` (vision-camera ≥5 + nitro), `@shopify/react-native-skia@2.6.6`.
- [docs.expo.dev/modules/overview](https://docs.expo.dev/modules/overview/) — Expo Modules API is New-Arch-native + auto back-compatible.

### Secondary (MEDIUM)
- [Apple — AVMutableVideoComposition applyingCIFilters](https://developer.apple.com/documentation/avfoundation/avmutablevideocomposition/videocomposition(with:applyingcifilterswithhandler:)) — per-frame CIFilter export.
- [Apple Developer Forums — Apply CIFilter to a video](https://developer.apple.com/forums/thread/117019).
- [ML Kit Face Detection (Android)](https://developers.google.com/ml-kit/vision/face-detection/android) — fast mode + tracking.
- [expo.dev/changelog/sdk-56-beta](https://expo.dev/changelog/sdk-56-beta) — Expo Modules Swift↔C++ interop (stability trend).
- [vision-camera #2589, #1990, #3693](https://github.com/mrousavy/react-native-vision-camera/issues) — frame-processor SIGSEGV/build crash class.

### Tertiary (LOW / unverified)
- Specific blur latency numbers for a 15s clip (A1/A2) — engineering estimates, verify on device at Step 4.

---

## Metadata

**Confidence breakdown:**
- Crash root-cause: HIGH — multiple confirmed upstream issues match our exact symptom + RN range; consistent with two prior New-Arch bites in this repo.
- Recommended architecture (post-record native module): HIGH — avoids every root cause by construction; first-party frameworks; Expo Modules API is New-Arch-native.
- Build effort/latency: MEDIUM — no off-the-shelf library, so it's a custom-module estimate; latency verified at Step 4 on device.

**Research date:** 2026-06-22
**Valid until:** 2026-08-22 (Apple/Google native APIs are very stable; the vision-camera v4→v5/Nitro migration is the only fast-moving piece and it only reinforces "don't use the live path").

---

## RESEARCH COMPLETE

**Recommendation:** Stop blurring live. Build a small post-record **Expo native module** (`lmc-blur`) that runs Apple Vision+CoreImage (iOS) / ML Kit+MediaCodec (Android) over the recorded file and returns a face-blurred clip, inserted at the single `submit()` seam between record and upload — this avoids the worklets-core↔Hermes SIGSEGV class entirely, keeps raw footage on-device, and is verified in 6 isolated on-device steps so we never repeat the crash-after-crash cycle.
