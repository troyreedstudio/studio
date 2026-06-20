---
phase: 3
slug: video-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-21
---

# Phase 3 — Validation Strategy

> Per-phase validation contract. Derived from the "Validation Architecture" section of 03-RESEARCH.md.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (lib/clips + upload retry + Edge Function logic) · Supabase pgTAP (clip/RLS/state-machine guards) · Deno test for Edge Functions |
| **Config file** | `lmc-app/vitest.config.ts` (from Phase 1) |
| **Quick run command** | `cd lmc-app && npm run test` |
| **Full suite command** | `cd lmc-app && npm run test:all` |
| **Estimated runtime** | ~60–120 seconds |

---

## Sampling Rate

- **After every task commit:** quick command
- **After every plan wave:** full suite
- **Before `/gsd-verify-work`:** full suite green
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

*Populated by the planner. Each Phase-3 requirement (VID-01..04, CHECK-04) maps to at least one automated or manual verification.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | — | — | — | — | — | — | — | ❌ W0 | ⬜ pending |

---

## Wave 0 Requirements

- [ ] Vitest stubs for `lib/clips.ts` (resumable upload + retry + server-confirm)
- [ ] Deno/pgTAP stubs for the upload-url + webhook Edge Functions (signature verify, idempotency, webhook-owns-delivered)
- [ ] pgTAP for: clip `ready` required before `delivered`; playback scoped to buying Seeker; no client `delivered` transition

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scout films a live 15s video-only clip (no mic, no gallery import) | VID-01, VID-02 | Real camera — no simulator camera | On a dev build/device: record a check; confirm 15s cap, no audio track on the asset, and that there is NO path to pick from the camera roll |
| Upload survives a weak/dropped network | VID-03 | Needs real device + network conditioning | Record, toggle airplane mode mid-upload, confirm resume + that the check only flips to delivered after Mux confirms |
| Seeker watches the transcoded clip from CDN; another user cannot | VID-04, CHECK-04 | End-to-end across Mux + two accounts | Buying Seeker plays it smoothly; a second account is denied the playback |
