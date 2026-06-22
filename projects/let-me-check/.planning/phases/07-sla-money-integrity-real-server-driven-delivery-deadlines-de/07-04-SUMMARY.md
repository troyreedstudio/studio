---
phase: 07-sla-money-integrity-real-server-driven-delivery-deadlines-de
plan: 04
subsystem: backend-deploy
tags: [sla, payments, pg_cron, edge-functions, migrations, types]
dependency_graph:
  requires: [07-01, 07-02, 07-03]
  provides: [live-sla-chain, cron-sweepers, hold-release]
  affects: [filming-countdown, trouble-report, scout-earnings, stripe-connect-payout]
tech_stack:
  added: [pg_cron, pg_net, sla-sweeper-edge-fn]
  patterns: [service-role-cron-invocation, no-verify-jwt-service-fn, idempotent-hold-cancel]
key_files:
  created:
    - supabase/functions/sla-sweeper/index.ts
  modified:
    - lmc-app/app/lib/database.types.ts
    - lmc-app/app/(scout)/filming.tsx
    - supabase/tests/0016_scout_earnings.test.sql
decisions:
  - "sla-sweeper is the SOLE caller of expire_stale_filming — no separate lmc-expire-filming SQL cron (BLOCKER-3)"
  - "No-time-window hold query: authorized-filter IS the idempotency, avoids orphaned holds from missed runs"
  - "sla-sweeper deployed --no-verify-jwt (pg_net invokes with service-role bearer, not a user JWT)"
  - "pg_cron and pg_net enabled via management API (not migration guard — free tier didn't have them)"
  - "0016 pgTAP test fixed: profiles.role → profiles.is_scout (schema mismatch, Rule 1 auto-fix)"
metrics:
  duration_minutes: 8
  completed_date: "2026-06-22"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 4
  files_created: 1
---

# Phase 7 Plan 04: SLA Sweeper + Live Deploy Summary

**One-liner:** sla-sweeper Edge fn (pg_cron/pg_net, no-verify-jwt) releases uncaptured holds for SLA-missed checks; 0015+0016 pushed live, pg_cron+pg_net enabled, 2 cron jobs scheduled, 4 Edge Functions deployed, types regenerated, tsc clean.

## What Was Built

### Task 1: sla-sweeper Edge Function (`888cf5c`)

`supabase/functions/sla-sweeper/index.ts` — tiny service-role Edge fn that closes the hold-release gap:

1. Calls `expire_stale_filming()` via `svc.rpc` — the SINGLE caller of this function (BLOCKER-3: no `lmc-expire-filming` SQL cron was scheduled; that would double-run the sweep).
2. Queries ALL `checks.status='no_scout'` + `payments.status='authorized'` (NO time window — the `authorized` filter is the idempotency: once cancelled, `payments.status` becomes `canceled` and the row never re-matches. A time window would orphan holds from missed runs).
3. Per row: `paymentIntents.cancel(pi)` → `payments.status='canceled'` → `log_event('payment.hold_released')`.
4. Per-row guard: `if (row.status !== 'authorized') continue` — double-cancel safety (T-07-16).
5. Deployed `--no-verify-jwt`: invoked by pg_net with the service-role bearer; Supabase JWT layer would reject service-role keys (they are not user JWTs).
6. Returns `{ expiredCount, releasedCount, errors }` — errors surface in `cron.job_run_details` as non-200 status.

### Task 2: Live Deploy (`a5d1429`, `51a9114`)

**Migrations:**
- `supabase db push --include-all` applied 0015 + 0016.
- Verified live: `accepted_at`, `deadline_at` columns on `checks`; `expire_stale_filming`, `scout_earnings_weekly`, `scout_earnings_totals` RPCs exist.
- Transition edges confirmed: `is_valid_check_transition(assigned, no_scout) = true`, `is_valid_check_transition(filming, no_scout) = true`.

**pgTAP suites (run as DO blocks via management API):**
- 0015_sla_deadline: D-01a/b/c (priority 420s, standard 600s deadlines), accepted_at NOT NULL — GREEN.
- 0015_expire_stale_filming: D-03a/b/c (past-deadline swept, future untouched, NULL excluded), BLOCKER-1a/b edges — GREEN.
- 0016_scout_earnings: totals, clips count, authorized-not-counted, weekly sum — GREEN.

**Extensions + Cron:**
- `pg_cron` + `pg_net` enabled via management API.
- `lmc-expire-dispatching` scheduled `* * * * *` (pure SQL cron, existing behaviour).
- `lmc-sla-sweeper` scheduled `* * * * *` via `net.http_post` → sla-sweeper Edge fn (service-role bearer in Authorization header).
- `lmc-cron-cleanup` scheduled `17 3 * * *` (delete `job_run_details` older than 7 days, Pitfall 6).
- `lmc-expire-filming` NOT scheduled (BLOCKER-3 — sweeper owns filming sweep; SQL cron would double-run).

**Edge Functions deployed:**
| Function | verify_jwt | Notes |
|---|---|---|
| trouble-report | true | user-callable |
| scout-earnings | true | user-callable |
| stripe-connect-payout | true | user-callable |
| sla-sweeper | false | pg_net/service-role |
| mux-webhook | false | unchanged — standing lesson |
| stripe-webhook | false | unchanged — standing lesson |

**Types + cleanup:**
- `database.types.ts` regenerated: `deadline_at`, `accepted_at` typed on `checks`; `scout_earnings_weekly`, `scout_earnings_totals`, `expire_stale_filming` RPCs typed.
- `filming.tsx`: removed `(c as any)?.deadline_at` cast — `deadline_at` now properly typed.
- `tsc --noEmit` clean.

### Task 3: Device walk-through — DEFERRED

Task 3 (`type="checkpoint:human-verify"`) is intentionally deferred to Troy. This is the on-device SLA + money proof:
1. Filming countdown reads real `deadline_at` and resumes from server time after app reopen.
2. Trouble-Here releases hold + pays Scout no-fault (verify in Stripe test dashboard).
3. Past-deadline check → within 1 minute flips to `no_scout` and hold released (cron + sweeper).
4. Scout earnings screen shows real totals; withdraw initiates real payout.

Troy also confirms the three SLA defaults at this review: clock-start at Scout-accept, auto-refund on missed deadline, $3.00 no-fault amount.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 0016 pgTAP test had stale `profiles.role` column reference**
- Found during: Task 2 pgTAP verification
- Issue: `INSERT INTO public.profiles (id, role)` failed — profiles table uses `is_scout` boolean, not a `role` text column
- Fix: Changed to `INSERT INTO public.profiles (id, is_scout) VALUES (..., true)`
- Files modified: `supabase/tests/0016_scout_earnings.test.sql`
- Commit: `a5d1429`

**2. [Rule 1 - Bug] `supabase db push --linked` required `--include-all`**
- Found during: Task 2 migration push
- Issue: CLI detected 0015 + 0016 were inserted before the last remote migration and refused to push without the flag
- Fix: Added `--include-all` flag; both migrations applied cleanly
- No code change — operational

**3. [Rule 2 - Cleanup] filming.tsx stale `as any` cast removed**
- Found during: Task 2 type regen
- Issue: `(c as any)?.deadline_at` was added in Plan 03 as a workaround for missing types; now unnecessary
- Fix: `c?.deadline_at` (properly typed); updated stale comment
- Files modified: `lmc-app/app/(scout)/filming.tsx`
- Commit: `51a9114`

## Known Stubs

None — all functionality wired to real Edge Functions and live schema. Task 3 is a human-verify checkpoint, not a stub.

## Threat Flags

No new threat surface introduced. sla-sweeper is service-to-service only (pg_net + service-role key); no new public endpoints added.

## Self-Check: PASSED

- `supabase/functions/sla-sweeper/index.ts` — EXISTS
- Commits present: `888cf5c` (sla-sweeper), `a5d1429` (live deploy), `51a9114` (filming.tsx fix)
- Deployed functions: trouble-report (verify_jwt=true), scout-earnings (verify_jwt=true), stripe-connect-payout (verify_jwt=true), sla-sweeper (verify_jwt=false)
- cron.job: `lmc-expire-dispatching` (active), `lmc-sla-sweeper` (active), `lmc-cron-cleanup` (active) — NO `lmc-expire-filming`
- `deadline_at` in `database.types.ts`: PRESENT
- `tsc --noEmit`: CLEAN
- Task 3 correctly noted as deferred to Troy (on-device human-verify checkpoint)
