---
phase: 11
slug: apple-submission-readiness-hide-unfinished-growth-screens-pr
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-22
---

# Phase 11 — Validation Strategy

> Apple submission readiness. CODE work is offline/device-verifiable (tsc, grep, pgTAP/deno for delete-account, a device build with no dead buttons). HUMAN checklist (App Store Connect, screenshots, demo account, submit) is verified by Troy doing it — produce a precise checklist doc.

## Test Infrastructure
| Property | Value |
|----------|-------|
| Framework | deno (delete-account) + pgTAP (deletion cascade/anonymize) + tsc/grep (screen hides, dead-button removal, dev-button removal) |
| Quick run | `cd lmc-app && npx tsc --noEmit` |
| Device gate | Release build: NO dead buttons reachable; account-deletion flow works; core flows stable (the test-pass build) |

## Sampling Rate
- After each task: that task's `<automated>`.
- delete-account: a test asserts it removes the auth user + anonymizes/cascades their rows WITHOUT breaking FK (financial records preserved/anonymized).
- grep gates: membership/invite nav entries gone; search button wired; SHOW_BLUR_TEST/dev-blur block gone.

## Per-Task Verification Map
*Planner fills (CODE tasks → automated; HUMAN tasks → checklist).*

## Wave 0 Requirements
- [ ] deno/pgTAP for delete-account (cascade/anonymize + auth user removed)
- [ ] grep gates for: no dead buttons, dev blur button removed
- [ ] confirm market_config.dispatch_timeout_s reset to 300 live (it's 3600 from testing)

## Manual-Only (Troy — the submission)
| Item | Why | Instruction |
|------|-----|-------------|
| App Store Connect record + metadata + screenshots | human | per the H-checklist doc |
| App Privacy nutrition labels (camera/location/push) | human | declare data use |
| Demo reviewer account + review notes | human | seeded Seeker w/ delivered check + Scout login + real-world-service Stripe-exemption note |
| Privacy policy + terms + support URLs | human | host the docs; swap the in-app placeholder URLs |
| APNs key + EAS build + submit | human | eas build -p ios --profile production --auto-submit; accept APNs key |
| Stripe live | human (LLC-gated) | flip when Delaware LLC + EIN land |

## Validation Sign-Off
- [ ] CODE tasks have automated verify
- [ ] delete-account cascade asserted
- [ ] no dead buttons reachable (grep + device)
- [ ] HUMAN checklist doc produced
- [ ] nyquist_compliant true once map populated

**Approval:** pending (CODE autonomous; SUBMISSION is Troy's human steps)
