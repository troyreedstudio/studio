---
phase: 6
slug: privacy-anti-fraud-hardening-on-device-face-plate-blur-befor
status: draft
nyquist_compliant: false
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
*Planner fills. Every Category-A task → automated check. Category-B tasks → device build compiles + boots. Category-C → Manual-Only below.*

## Wave 0 Requirements
- [ ] Deno test stubs for face-blur-check + fraud-eval (RED-first inside TDD tasks)
- [ ] pgTAP for the blur_status/fraud_signals migration
- [ ] Feature flags (blur_enabled, fraud strictness) in market_config — default OFF/flag-only

## Manual-Only Verifications (Category C — Troy, morning)
| Behavior | Why manual | Instruction |
|----------|-----------|-------------|
| On-device blur looks correct | Needs eyes on real footage | Film with a face in frame; confirm it's blurred before upload |
| Detect-and-hold works | Needs a real face clip | Deliver a clip with a face → confirm held in blur_review, not delivered |
| Spoof flag fires | Needs a real/simulated location | Confirm a fraud_signal is recorded + flagged |
| Decisions D-01..D-04 | Product/legal calls | Confirm the 4 flagged decisions in 06-CONTEXT.md |

## Validation Sign-Off
- [ ] Category A tasks all have automated verify
- [ ] Category B device build compiles + boots
- [ ] Category C items documented for Troy
- [ ] nyquist_compliant flipped true once map populated

**Approval:** pending (autonomous build; Troy reviews AM)
