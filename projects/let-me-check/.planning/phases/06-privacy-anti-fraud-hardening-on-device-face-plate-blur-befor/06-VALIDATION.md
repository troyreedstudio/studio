---
phase: 6
slug: privacy-anti-fraud-hardening-on-device-face-plate-blur-befor
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-22
---

# Phase 6 — Validation Strategy

> Per-phase validation contract. Detailed architecture in 06-RESEARCH.md.
> AUTONOMOUS overnight build: Category A (backend/edge/schema/fraud-signals) must be OFFLINE-verifiable (deno test / pgTAP / tsc / grep). Category B (on-device blur) is verified only by a DEVICE BUILD compiling + the app booting (no manual visual test overnight). Category C (visual blur correctness + the 4 flagged decisions) is deferred to Troy's morning review.

## Test Infrastructure
| Property | Value |
|----------|-------|
| Framework | Deno test (Edge Functions) + pgTAP (migration) + vitest/tsc (app/lib) |
| Quick run | `deno test --allow-env supabase/functions/_shared/` |
| Full suite | `deno test --allow-env supabase/functions/ && cd lmc-app && npx tsc --noEmit` |
| Device gate | `expo run:ios --configuration Release --device <udid>` must Build Succeeded + app boots (Category B) |

## Sampling Rate
- After each task: that task's `<automated>` command.
- After each wave: full deno + tsc suite.
- Native (Category B) changes: a device build must compile + the app must launch (boot-verify), since manual blur check needs Troy.
- Before sign-off: full suite green; device build boots; Category C items listed for Troy.

## Per-Task Verification Map

Every task's `<automated>` command, by plan/wave. Category-A = offline-verifiable; Category-B = device build compiles + boots; Category-C = Manual-Only (below).

| Plan (Wave) | Task | Category | Verifies | `<automated>` |
|-------------|------|----------|----------|----------------|
| 06-01 (W1) | T1 migration 0014 | A | SCH-01, blur_review entry edge | `grep` 0014: blur_review + `filming.*blur_review` present + NO `processing->blur_review` + blur_enabled default false + fraud_strictness + enum-add |
| 06-01 (W1) | T2 pgTAP | A | SCH-01 | `grep` 0014 test: blur_status + blur_enabled + blur_review + fraud_strictness |
| 06-01 (W1) | T3 RED scaffolds | A | BLUR-01/02/03, FRAUD-01/02/03 (RED) | `test -f` 3 test files + `grep` handleFaceBlurCheck/handleFraudEval/collectFraudSignals |
| 06-02 (W2) | T1 face-blur-check | A | BLUR-01/02/03 | `deno test face-blur-check/index.test.ts` + grep FACE_DETECTION + NO transition_check/reset_check_for_redispatch |
| 06-02 (W2) | T2 fraud-eval | A | FRAUD-01/02 | `deno test fraud-eval/index.test.ts` |
| 06-02 (W2) | T3 fraud-signals.ts | A | FRAUD-03 | `vitest run app/lib/fraud-signals.test.ts` + `tsc --noEmit` |
| 06-03 (W3) | T1 mux-webhook gate | A | BLUR-04, BLUR-05 | `deno test mux-webhook/index.test.ts` + grep blur_review/face-blur-check/fraud-eval in index.ts |
| 06-03 (W3) | T2 mux-upload-url persist | A | (fraud_signals provenance) | `grep fraud_signals` + `deno check` mux-upload-url |
| 06-03 (W3) | T3 filming/clips wiring | A | FRAUD-03 wiring | `grep collectFraudSignals` filming.tsx + `grep fraud_signals` clips.ts + `tsc` + `vitest clips.test.ts` |
| 06-04 (W4) | T1 db push + live pgTAP | A | SCH-01 (live) | `supabase migration list \| grep 0014` + `supabase test db` green |
| 06-04 (W4) | T2 deploy functions | A | deploy | `supabase functions list \| grep face-blur-check && grep fraud-eval` |
| 06-04 (W4) | T3 dormant + types | A | D-07 dormant invariant | `supabase db execute "select count(*) ... where blur_enabled=true"` == 0 + grep blur_status/fraud_strictness in types + `tsc` |
| 06-05 (W5) | T1 install native stack | B | scaffold compiles | `grep` 3 packages in package.json + BLUR_NATIVE_ENABLED=false + `tsc` |
| 06-05 (W5) | T2 SkiaCamera overlay | B | scaffold compiles (flag off) | `grep BLUR_NATIVE_ENABLED` filming.tsx + `grep` face detector in overlay + `tsc` |
| 06-05 (W5) | T3 EAS dev build | B | compiles + boots (New-Arch) | `eas build -p ios --profile development` reports Build Succeeded (orchestrator-run; failure → defer, do not block) |

## Wave 0 Requirements
- [x] Deno test stubs for face-blur-check + fraud-eval (Plan 01 Task 3, RED-first)
- [x] pgTAP for the blur_status/fraud_signals migration (Plan 01 Task 2)
- [x] Feature flags (blur_enabled, fraud strictness) in market_config — default OFF/flag-only (Plan 01 Task 1)

## Manual-Only Verifications (Category C — Troy, morning)
| Behavior | Why manual | Instruction |
|----------|-----------|-------------|
| On-device blur looks correct | Needs eyes on real footage | Film with a face in frame; confirm it's blurred before upload |
| Detect-and-hold works | Needs a real face clip | Deliver a clip with a face → confirm held in blur_review, not delivered |
| Spoof flag fires | Needs a real/simulated location | Confirm a fraud_signal is recorded + flagged |
| Decisions D-01..D-04 | Product/legal calls | Confirm the 4 flagged decisions in 06-CONTEXT.md |

## Validation Sign-Off
- [x] Category A tasks all have automated verify (see Per-Task Verification Map)
- [ ] Category B device build compiles + boots
- [ ] Category C items documented for Troy
- [x] nyquist_compliant flipped true once map populated

**Approval:** pending (autonomous build; Troy reviews AM)
