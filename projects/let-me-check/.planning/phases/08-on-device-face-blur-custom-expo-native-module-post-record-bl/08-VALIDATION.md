---
phase: 8
slug: on-device-face-blur-custom-expo-native-module-post-record-bl
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-22
---

# Phase 8 — Validation Strategy

> On-device face blur via a custom native Expo module (post-record). This is the RISKIEST build (native), so verification is INCREMENTAL on device — prove each layer in isolation before stacking the next (the lesson from the worklets-core crash-after-crash). Follow the 6-step plan in 06-RESEARCH-BLUR-V2.md.

## Test Infrastructure
| Property | Value |
|----------|-------|
| Framework | tsc (JS bridge) + native module unit (Swift XCTest where feasible) + DEVICE builds (the real gate) |
| Quick run | `cd lmc-app && npx tsc --noEmit` |
| Device gate | `expo run:ios --configuration Release --device <udid>` Build Succeeded + app BOOTS at EACH incremental step |

## Sampling Rate (INCREMENTAL — the core discipline)
Per 06-RESEARCH-BLUR-V2 6-step plan — each step is its own device build that must compile + boot + pass its specific check BEFORE the next:
1. Empty native module loads (JS can call a no-op native fn; app boots).
2. Module detects faces in a still image (returns face count/rects).
3. Module blurs a still image (output file has blurred region).
4. Module blurs a recorded VIDEO file (output mp4 plays, faces blurred).
5. Wire into the flow (onRecordingFinished → blur → capturedPath = blurred file), flag-gated.
6. End-to-end on device: film a face → uploaded clip is blurred (Troy visual confirm).

## Per-Task Verification Map
*Planner fills — each task maps to a tsc check + a device-build-boots gate. Native steps: pass = build compiles + app boots + the step's specific check.*

## Wave 0 Requirements
- [ ] Custom Expo module scaffold builds + JS can call it (step 1)
- [ ] iOS deployment target already 15.5 (done Phase 8 prep); Vision+CoreImage are first-party (no new pods)
- [ ] Flag gate so an incomplete blur path never blocks the working upload

## Manual-Only (device — Troy, the real proof)
| Behavior | Why | Instruction |
|----------|-----|-------------|
| Faces blurred in delivered clip | needs eyes on real footage | Film a face → watch delivery → face is blurred |
| No crash on filming/submit | native stability | Accept → film → submit, repeatedly, no SIGSEGV |
| Acceptable processing time | UX | Blur step adds only a few seconds after recording |

## Validation Sign-Off
- [ ] Each of the 6 incremental device steps passed before the next
- [ ] Final: film-a-face → delivered clip blurred (Troy confirm)
- [ ] No crash; processing time acceptable
- [ ] nyquist_compliant true once map populated

**Approval:** pending
