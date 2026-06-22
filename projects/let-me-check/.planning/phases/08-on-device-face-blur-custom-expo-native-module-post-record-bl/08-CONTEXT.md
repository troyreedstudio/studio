# Phase 8: On-device Face Blur - Context

**Gathered:** 2026-06-22 (Troy: on-device blur is NON-NEGOTIABLE for beta. Research already done — see 06-RESEARCH-BLUR-V2.md. This context locks the approach for planning.)
**Status:** Ready for planning

<domain>
## Phase Boundary
Blur faces in the recorded clip ON-DEVICE, automatically, BEFORE upload — frictionless (NO holding clips, NO server-only). The DELIVERED clip must have faces blurred; live-viewfinder blur is NOT required. iOS first (beta), Android right after.

Out of scope: live viewfinder blur (the worklets-core path that crashes — abandoned), license-plate blur (best-effort later), the server-side gate beyond keeping it dormant.
</domain>

<decisions>
## Decisions (locked by research + Troy)
- **D-01 approach (LOCKED):** Post-record native blur via a **custom local Expo module**. Record normally (camera already works) → on `onRecordingFinished`, the native module blurs faces in the saved file → then `clipUpload.submit()` uploads the BLURRED file. iOS: AVFoundation (AVMutableVideoComposition) + Vision (VNDetectFaceRectangles) + Core Image (CIGaussianBlur/CIPixellate). Android (fast-follow): MediaCodec + ML Kit Face Detection. NO worklets-core, NO frame processor, NO JSI camera-thread bridge — this is what avoids the crash class (vision-camera #3666 / worklets-core↔Hermes SIGSEGV).
- **D-02 why not the live path:** confirmed fragile + half-abandoned on our stack (RN/New-Arch/Hermes). Already crashed on device. Do not revisit for beta.
- **D-03 packaging:** local Expo module (config-plugin / expo-module), NOT manual ios/ edits (ios/ is gitignored, prebuild-regenerated). Must survive prebuild.
- **D-04 failure handling:** if on-device blur fails on a clip, fall back to the existing (dormant) server-side detect-and-hold as a last-resort net — never deliver an unblurred face. Privacy-by-default preserved (raw never leaves device on the happy path).
- **D-05 incremental verification (LOCKED):** follow the research's 6-step on-device verification plan — prove each layer in isolation (module loads → detects faces → blurs a still → blurs a video file → wires into the flow → end-to-end) so we DO NOT repeat the crash-after-crash cycle. Each step = a device build that boots + the specific check.
- **Claude discretion:** blur strength/style (gaussian vs pixelate), detection confidence threshold, re-encode settings (keep 1080p/quality), processing-progress UX (a few seconds after recording).
</decisions>

<canonical_refs>
- .planning/phases/06-*/06-RESEARCH-BLUR-V2.md (THE research — approach, ranked options, root-cause of crashes, implementation sketch, 6-step verification). Authoritative.
- .planning/phases/06-*/ — the reverted/dormant worklets-core scaffold (BLUR_NATIVE_ENABLED flag, _filming-blur-overlay.tsx) + server-side detect-and-hold (face-blur-check, mux-webhook gate) to keep as the net.
- lib/clips.ts (uploadClip / requestUploadUrl — the blur step inserts between onRecordingFinished's capturedPath and clipUpload.submit()).
- app/(scout)/filming.tsx (onRecordingFinished sets capturedPath; the blur call hooks here).
- app.config.js (expo config plugins; iOS deploymentTarget already 15.5; Vision/CoreImage are first-party, no extra pods).
- ./CLAUDE.md, lmc-app/CLAUDE.md (New-Arch-safe, files <500 lines).
</canonical_refs>

<deferred>
- Live viewfinder blur (worklets-core) — abandoned.
- Android blur — fast-follow after iOS beta (iOS-first).
- License-plate blur — later.
</deferred>

## Note
Net-new is a NATIVE module — the riskiest build. Plan must front-load the 6-step incremental device verification so a failure is caught at the smallest layer, not after stacking everything (the lesson from the worklets-core attempt).

---
*Phase 08 — context authored 2026-06-22, 7-day Apple-submission push*
