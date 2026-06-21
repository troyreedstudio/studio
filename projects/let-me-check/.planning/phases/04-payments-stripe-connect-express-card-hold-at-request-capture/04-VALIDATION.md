---
phase: 4
slug: payments-stripe-connect-express-card-hold-at-request-capture
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-21
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Detailed validation architecture lives in 04-RESEARCH.md; this is the execution contract. The planner fills the Per-Task Verification Map.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (app/lib unit tests, as used in Phase 3 e.g. clips.test.ts) + Deno test (Edge Functions) |
| **Config file** | lmc-app (vitest); supabase/functions (deno) |
| **Quick run command** | `cd lmc-app && npx vitest run app/lib/payments.test.ts` |
| **Full suite command** | `cd lmc-app && npx vitest run && npx tsc --noEmit` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick command for the touched lib
- **After every plan wave:** Run the full suite + `bash scripts/check-video-invariants.sh` (and a new payments-invariants gate if added)
- **Before `/gsd-verify-work`:** Full suite green + Stripe test-mode end-to-end (test card auth→capture, decline-card gate, refund, Connect payout via test clock)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

*Filled by the planner — every task maps to an automated check (vitest/deno/tsc/grep) or a Stripe test-mode manual verification below.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | D-01..D-03 | T-04-xx | hold authorizes; decline blocks booking | unit | `npx vitest run app/lib/payments.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lmc-app/app/lib/payments.test.ts` — stubs for hold/capture/refund client helpers
- [ ] Stripe TEST mode keys configured (Edge secrets) — fake cards, no entity needed
- [ ] Deno test harness for the Stripe Edge Functions (mirror Phase 3 Mux function tests)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Apple Pay / Google Pay sheet | How-Seekers-pay | Needs a real device + EAS build | On-device: open payment, confirm Apple/Google Pay appears, pay with a Stripe test card |
| Decline-card gate (Uber-style) | D-02 | End-to-end across UI + Stripe | Use Stripe decline test card → confirm booking is blocked and re-prompts to fix card |
| Connect Express onboarding | D-04/D-05 | Hosted Stripe flow | Complete test-mode Connect onboarding → confirm "go online" unlocks |
| Instant vs standard payout | D-05 | Stripe test clocks/payouts | Trigger a test payout each way; confirm fee handling |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
