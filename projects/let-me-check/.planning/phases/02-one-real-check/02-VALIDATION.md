---
phase: 2
slug: one-real-check-no-money-no-dispatch
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract. Derived from the "Validation Architecture" section of 02-RESEARCH.md.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (logic/state) + Supabase pgTAP for state-machine/RLS guards |
| **Config file** | `lmc-app/vitest.config.ts` (from Phase 1) |
| **Quick run command** | `cd lmc-app && npm run test` |
| **Full suite command** | `cd lmc-app && npm run test:all` |
| **Estimated runtime** | ~45–90 seconds |

---

## Sampling Rate

- **After every task commit:** quick command
- **After every plan wave:** full suite
- **Before `/gsd-verify-work`:** full suite green
- **Max feedback latency:** ~90 seconds

---

## Per-Task Verification Map

*Populated by the planner. Each Phase-2 requirement (CHECK-01, CHECK-02, CHECK-03, CHECK-05, CHECK-06, DISP-04) maps to at least one automated or manual verification.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | — | — | — | — | — | — | — | ❌ W0 | ⬜ pending |

---

## Wave 0 Requirements

- [ ] pgTAP test stubs for the hardened `transition_check()` + `accept_check()` (valid-transition + actor auth)
- [ ] Test stubs for Scout open-check read RLS (open + own only, never others' delivered)
- [ ] Vitest stubs for CHECK-01/03/05/06 + DISP-04 client flows

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Seeker watches status update LIVE as a Scout acts | DISP-04 | Needs two real sessions + Realtime over the network | On a device/build: request a check; from a Scout session, accept it; confirm the Seeker's screen moves finding→accepted without refresh |
| Full request→accept→deliver→rate on a device | CHECK-01/03/05/06 | End-to-end across two roles on real infra | Walk the loop on a dev build; confirm the rating row + event_log entries in Supabase |
