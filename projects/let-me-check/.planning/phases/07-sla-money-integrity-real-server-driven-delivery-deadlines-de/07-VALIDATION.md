---
phase: 7
slug: sla-money-integrity-real-server-driven-delivery-deadlines-de
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-22
---

# Phase 7 — Validation Strategy

> SLA + money integrity. Money-touching, so verification must be tight. Most is OFFLINE-verifiable (pgTAP for deadlines/cron/expiry, deno for the Edge functions, tsc for client). Device checks: the real countdown reads deadline_at; earnings screen shows real numbers.

## Test Infrastructure
| Property | Value |
|----------|-------|
| Framework | pgTAP (deadline_at + accept_check + expire_* + cron schedule) + Deno test (trouble-report, scout-earnings Edge fns) + vitest/tsc (client) |
| Quick run | `deno test --allow-env supabase/functions/_shared/` |
| Full suite | `deno test --allow-env supabase/functions/ && cd lmc-app && npx tsc --noEmit` |
| Device gate | countdown reads real deadline_at (waiting.tsx/filming.tsx); earnings shows real $; Trouble-Here actually refunds+frees the job |

## Sampling Rate
- After each task: that task's `<automated>`.
- After each wave: full deno + tsc + pgTAP.
- Money paths (refund/transfer/payout): a test asserts the Stripe call shape (cancel vs refund; instant payout uses net_available after fee; no destination-charge clawback of Scout pay).
- Before sign-off: full suite green; pg_cron jobs scheduled + visible in cron.job; on-device deadline + earnings check.

## Per-Task Verification Map
*Planner fills — every task → automated check. Special: a pgTAP test MUST assert accept_check sets deadline_at = accepted_at + tier window (420 priority / 600 standard), and that expire_stale_filming only fires past deadline_at.*

## Wave 0 Requirements
- [ ] pg_cron enabled (CREATE EXTENSION) + cron.schedule for expire_stale_dispatching + expire_stale_filming verified in cron.job
- [ ] pgTAP stubs for deadline_at / accept_check / expiry
- [ ] Deno test stubs for trouble-report + scout-earnings

## Manual-Only (device)
| Behavior | Why | Instruction |
|----------|-----|-------------|
| Real countdown | needs device + real check | Accept a job → waiting/filming clock counts from the real deadline_at, survives app reopen |
| Trouble-Here refund | needs real check + Stripe | Tap Trouble-Here → Seeker hold released, Scout gets no-fault pay, job freed |
| Scout earnings | needs delivered checks | Earnings screen shows real totals + payout history; withdraw hits Stripe |

## Validation Sign-Off
- [ ] Category-A tasks have automated verify
- [ ] pg_cron jobs scheduled + asserted
- [ ] Money-path call shapes asserted
- [ ] nyquist_compliant true once map populated

**Approval:** pending (fast-track; Troy confirms 3 SLA defaults at review)
