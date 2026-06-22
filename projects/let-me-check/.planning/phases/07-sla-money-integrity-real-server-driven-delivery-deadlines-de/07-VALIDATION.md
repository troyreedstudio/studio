---
phase: 7
slug: sla-money-integrity-real-server-driven-delivery-deadlines-de
status: planned
nyquist_compliant: true
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
*Every Category-A task maps to an automated `<automated>` command (Warning 5 resolved). Special-case asserted: accept_check sets deadline_at = accepted_at + tier window (420 priority / 600 standard); expire_stale_filming only fires past a non-null deadline_at; is_valid_check_transition allows assigned/filming -> no_scout; trouble-report drives no_scout (not cancelled) + cancels the uncaptured PI (not refund); instant payout uses net_available not gross.*

| Plan | Task | Automated check |
|------|------|-----------------|
| 07-01 | T1 RED pgTAP scaffolds | `test -f supabase/tests/0015_sla_deadline.test.sql && test -f supabase/tests/0015_expire_stale_filming.test.sql && grep -q "is_valid_check_transition" supabase/tests/0015_expire_stale_filming.test.sql && grep -q "make_interval\|interval '420\|interval '600" supabase/tests/0015_sla_deadline.test.sql` |
| 07-01 | T2 migration 0015 | `grep -q "ADD COLUMN IF NOT EXISTS deadline_at" ... && grep -q "is_valid_check_transition" ... && grep -q "expire_stale_filming" ... && grep -q "deadline_at is not null" ... && grep -q "dispatch_timeout_s = 300" supabase/migrations/0015_sla_deadline.sql` (behavioural gate = the two pgTAP suites run live in 07-04) |
| 07-02 | T1 trouble-report | `deno test supabase/functions/trouble-report/ --allow-env && grep -q "NOFAULT_CENTS" ... && grep -q "no_scout" ... && ! grep -q "'cancelled'" supabase/functions/trouble-report/index.ts` |
| 07-02 | T2 scout-earnings + 0016 | `deno test supabase/functions/scout-earnings/ --allow-env && test -f supabase/migrations/0016_scout_earnings.sql && grep -q "scout_earnings_weekly" ... && grep -q "scout_earnings_totals" supabase/migrations/0016_scout_earnings.sql` |
| 07-02 | T3 stripe-connect-payout | `deno test supabase/functions/stripe-connect-payout/ --allow-env` |
| 07-03 | T1 payments helpers + filming | `cd lmc-app && npx tsc --noEmit && grep -q "reportTrouble" app/lib/payments.ts && grep -q "deadline_at" "app/(scout)/filming.tsx" && grep -q "reportTrouble" "app/(scout)/filming.tsx"` |
| 07-03 | T2 earnings + withdraw | `cd lmc-app && npx tsc --noEmit && grep -q "getScoutEarnings" "app/(scout)/earnings.tsx" && grep -q "requestPayout" "app/(scout)/withdraw.tsx" && ! grep -q "const AVAILABLE = 137" "app/(scout)/withdraw.tsx"` |
| 07-04 | T1 sla-sweeper | `test -f supabase/functions/sla-sweeper/index.ts && grep -q "paymentIntents.cancel" ... && grep -q "authorized" supabase/functions/sla-sweeper/index.ts` |
| 07-04 | T2 [BLOCKING] live deploy | `cd lmc-app && npx tsc --noEmit && grep -q "deadline_at" app/lib/database.types.ts` + live: 0015/0016 pgTAP GREEN, cron.job rows (lmc-expire-dispatching, lmc-sla-sweeper), 3 user fns 401 forged |
| 07-04 | T3 [DEVICE] walk-through | Manual human-verify (real countdown resumes, Trouble-Here releases hold + pays Scout, SLA miss auto-expires, earnings/withdraw real) |

## Wave 0 Requirements
- [x] pg_cron enable + cron.schedule planned in 07-04 T2 (lmc-expire-dispatching SQL cron + lmc-sla-sweeper Edge cron; filming sweep owned by the sweeper, BLOCKER 3)
- [x] pgTAP scaffolds for deadline_at / accept_check / expiry + transition-edge validity planned in 07-01 T1 (RED)
- [x] Deno test stubs for trouble-report + scout-earnings + stripe-connect-payout planned in 07-02 (RED)
- [x] 0016_scout_earnings.sql + pgTAP planned as a hard deliverable in 07-02 T2 (BLOCKER 2)

## Manual-Only (device)
| Behavior | Why | Instruction |
|----------|-----|-------------|
| Real countdown | needs device + real check | Accept a job → waiting/filming clock counts from the real deadline_at, survives app reopen |
| Trouble-Here refund | needs real check + Stripe | Tap Trouble-Here → Seeker hold released, Scout gets no-fault pay, job freed |
| Scout earnings | needs delivered checks | Earnings screen shows real totals + payout history; withdraw hits Stripe |

## Validation Sign-Off
- [x] Category-A tasks have automated verify (per-task map populated)
- [x] pg_cron jobs scheduled + asserted (07-04 T2 verify step 7)
- [x] Money-path call shapes asserted (cancel-not-refund, no source_transaction/no reverse_transfer, instant net not gross — 07-02 tests)
- [x] nyquist_compliant true (map populated)

**Approval:** pending (fast-track; Troy confirms 3 SLA defaults at review)
