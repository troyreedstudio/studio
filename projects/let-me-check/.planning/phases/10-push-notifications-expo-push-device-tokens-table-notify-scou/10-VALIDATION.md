---
phase: 10
slug: push-notifications-expo-push-device-tokens-table-notify-scou
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-22
---

# Phase 10 — Validation Strategy

> Push notifications. Offline-verifiable: pgTAP (device_push_tokens RLS, the dispatching trigger), deno (send-push: token lookup, prefs respect, Expo batch shape, DeviceNotRegistered cleanup), tsc (client token registration). Device: real push receipt (needs EAS build + APNs key).

## Test Infrastructure
| Property | Value |
|----------|-------|
| Framework | pgTAP (tokens table + RLS + trigger) + Deno (send-push) + tsc (client) |
| Quick run | `deno test --allow-env supabase/functions/send-push/` |
| Full | `deno test --allow-env supabase/functions/ && cd lmc-app && npx tsc --noEmit` + live pgTAP at deploy |

## Sampling Rate
- After each task: that task's `<automated>`.
- send-push: a deno test asserts it (a) only pushes recipients' own tokens, (b) skips a category disabled in notification_prefs, (c) batches ≤100/req, (d) deletes a DeviceNotRegistered token.
- Fire-and-forget: a test/assert that a push failure never blocks the transition.

## Per-Task Verification Map
*Planner fills.*

## Wave 0 Requirements
- [ ] `npx expo install expo-notifications expo-device`
- [ ] device_push_tokens migration + pgTAP (RLS own-tokens + dispatching trigger)
- [ ] send-push deno test stubs (prefs + batch + cleanup)

## Manual-Only (device — needs EAS build + APNs key)
| Behavior | Why | Instruction |
|----------|-----|-------------|
| Scout job-nearby push | needs 2 devices + APNs | online Scout in range gets a push when a check dispatches |
| Seeker video-ready push | needs device + APNs | Seeker gets a push when their check is delivered |
| Prefs respected | device | a disabled category does not push |
| APNs credential | human | run `eas build -p ios`, accept APNs key generation |

## Validation Sign-Off
- [ ] Category-A tasks have automated verify
- [ ] send-push IDOR/prefs/batch/cleanup asserted
- [ ] nyquist_compliant true once map populated

**Approval:** pending (fast-track; APNs is a human EAS step)
