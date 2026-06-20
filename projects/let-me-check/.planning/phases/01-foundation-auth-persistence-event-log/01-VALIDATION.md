---
phase: 1
slug: foundation-auth-persistence-event-log
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-20
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from the "Validation Architecture" section of 01-RESEARCH.md.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (logic/unit/integration) + Supabase local (`supabase start`) for RLS/auth/state-machine tests |
| **Config file** | none — Wave 0 installs (`vitest.config.ts`) |
| **Quick run command** | `npm run test` (Vitest, changed files) |
| **Full suite command** | `npm run test:all` (Vitest + Supabase-backed integration) |
| **Estimated runtime** | ~30–60 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

*Populated by the planner from PLAN.md tasks. Each Phase-1 requirement (AUTH-01..04, DATA-01..04, SAFE-02) maps to at least one automated or manual verification.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T0 | 01 | 1 | (harness) | — | Test runner stands up | setup | `cd lmc-app && npx vitest run` | ❌ W0 | ⬜ pending |
| 01-01-T1 | 01 | 1 | DATA-04 | T-01-03 | event_log append-only (UPDATE/DELETE throw) | SQL | `supabase test db` | ❌ W0 | ⬜ pending |
| 01-01-T2 | 01 | 1 | SAFE-02, DATA-03 | T-01-05 | versioned consents + dual-role profile | schema | `supabase db reset` | ❌ W0 | ⬜ pending |
| 01-01-T3 | 01 | 1 | DATA-02, DATA-03 | T-01-01 | check_status enum + server-only transition fn | schema | `supabase db reset` | ❌ W0 | ⬜ pending |
| 01-01-T4 | 01 | 1 | DATA-01, DATA-02 | T-01-02, T-01-06 | RLS on all 11 tables; status unreachable | SQL | `supabase test db` | ❌ W0 | ⬜ pending |
| 01-01-T5 | 01 | 1 | DATA-02, DATA-04 | T-01-01, T-01-02, T-01-03 | negative RLS + immutability tests | SQL | `supabase test db` | ❌ W0 | ⬜ pending |
| 01-01-T6 | 01 | 1 | DATA-01..04 | — | schema pushed live; types generated | CLI | `supabase migration list --linked` | ❌ W0 | ⬜ pending |
| 01-02-T1 | 02 | 2 | AUTH-02, DATA-01/02 | T-01-07 | SecureStore session; typed api layer | unit | `cd lmc-app && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 01-02-T2 | 02 | 2 | AUTH-01/03/04 | T-01-08, T-01-09, T-01-10 | Apple/Google/OTP via Supabase; no Twilio | unit | `grep -riq twilio lmc-app/app/lib/` (empty) | ❌ W0 | ⬜ pending |
| 01-02-T3 | 02 | 2 | AUTH-01, AUTH-02 | T-01-11 | boot gate + real auth on entry screens | unit | `cd lmc-app && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 01-03-T1 | 03 | 3 | DATA-01, DATA-03, AUTH-03 | T-01-15 | 6 stores persist; surface preserved | integration | `cd lmc-app && npm run test` | ❌ W0 | ⬜ pending |
| 01-03-T2 | 03 | 3 | SAFE-02, AUTH-03/04 | T-01-12 | consent recorded; role switch + sign-out | integration | `cd lmc-app && npm run test` | ❌ W0 | ⬜ pending |
| 01-03-T3 | 03 | 3 | (env) | T-01-13, T-01-14 | EAS env vars set; no secrets committed | config | `grep EXPO_PUBLIC_SUPABASE_URL lmc-app/.env.example` | ❌ W0 | ⬜ pending |
| 01-03-T4 | 03 | 3 | AUTH-01/02, DATA-01/03 | — | on-device: real auth + restart persistence | manual+suite | `cd lmc-app && npm run test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Install + configure Vitest (`vitest.config.ts`)
- [ ] Supabase local test harness (`supabase start` + seed/fixtures)
- [ ] Test stubs for AUTH-01..04, DATA-01..04, SAFE-02

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sign in with Apple / Google on a real device | AUTH-01 | Native OAuth + real Apple/Google accounts need a device + EAS dev build | Run dev build on device, complete Apple + Google sign-in, confirm session persists across an app restart |
| Phone OTP via Twilio delivers a real SMS | AUTH-01 | Real SMS delivery depends on Twilio + A2P 10DLC approval | Enter a real phone number, receive the code, verify sign-in |
