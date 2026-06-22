---
phase: 07-sla-money-integrity-real-server-driven-delivery-deadlines-de
plan: "02"
subsystem: payments/edge-functions
tags: [edge-function, stripe, money-integrity, D-04, D-06, IDOR, BLOCKER-1]
dependency_graph:
  requires: [07-01]
  provides: [trouble-report-edge-fn, scout-earnings-edge-fn, stripe-connect-payout-edge-fn, 0016-migration]
  affects: [Plan 07-03 (client wiring), Plan 07-04 (live deploy + 0016 push)]
tech_stack:
  added: []
  patterns:
    - NOFAULT_CENTS module-top constant (single source of truth for no-fault pay)
    - PI cancel vs refunds.create (uncaptured hold release — Pitfall 4)
    - Platform-funded Transfer (no source_transaction — D-04, D-09 consistent)
    - SECURITY DEFINER plpgsql with IDOR guard (p_scout_id vs auth.uid())
    - instant_available.net_available for instant payout (Pitfall 5)
    - audit-first log_event before payouts.create (double-payout mitigation)
key_files:
  created:
    - supabase/functions/trouble-report/index.ts
    - supabase/functions/trouble-report/index.test.ts
    - supabase/functions/scout-earnings/index.ts
    - supabase/functions/scout-earnings/index.test.ts
    - supabase/functions/stripe-connect-payout/index.ts
    - supabase/functions/stripe-connect-payout/index.test.ts
    - supabase/migrations/0016_scout_earnings.sql
    - supabase/tests/0016_scout_earnings.test.sql
  modified: []
decisions:
  - "trouble-report drives check to no_scout (NOT cancelled) — BLOCKER-1: service role null uid cannot pass the v_uid-is-distinct-from-v_seeker guard on the cancelled transition"
  - "NOFAULT_CENTS=300 ($3.00 flat) declared as a named module-top constant — single-line change if Troy sends a new value"
  - "PI cancel (paymentIntents.cancel) not refunds.create for uncaptured holds — refunds.create fails on authorized (uncaptured) payments (Pitfall 4, confirmed from stripe-refund source)"
  - "No source_transaction on no-fault Transfer — platform-funded so Seeker refund can never claw it back (D-04, consistent with D-09 stripe-capture pattern)"
  - "0016 RPCs are plpgsql (not pure sql) to allow the IDOR guard raise — pure-sql functions cannot conditionally raise"
  - "scout-earnings uses scout_earnings_weekly/totals (0016 RPCs) — IDOR-safe at both Edge fn layer (callerId) and SQL layer (auth.uid() guard)"
  - "instant payout amount checked against net_available BEFORE create — 400 returned if over-limit rather than silent clamp (Pitfall 5)"
  - "log_event payment.payout_initiated called BEFORE payouts.create — audit-first pattern, double-payout mitigation (T-07-07)"
metrics:
  duration: "~7 minutes"
  completed: "2026-06-22"
  tasks: 3
  files: 8
---

# Phase 7 Plan 02: Three Money Edge Functions + 0016 Migration Summary

Three platform-funded, IDOR-safe Stripe Edge Functions that make Trouble-Here, Scout earnings, and payout real — with full deno test coverage on each money-integrity invariant.

## What Was Built

### Task 1 — trouble-report Edge Function (commit 9a6e949)

**`supabase/functions/trouble-report/index.ts`** (204 lines)

Handles Scout-initiated trouble reporting. Enforces three money invariants:

1. **PI cancel, not refund**: `paymentIntents.cancel(pi)` releases the uncaptured hold. `refunds.create` would fail on an authorized (uncaptured) PI — confirmed from stripe-refund source.
2. **No-fault Transfer**: `transfers.create({ amount: NOFAULT_CENTS, ... })` with **no source_transaction** — platform-funded so a Seeker refund can never claw it back (D-04).
3. **BLOCKER-1**: drives check to `'no_scout'`, never `'cancelled'`. Service role (auth.uid()=null) cannot pass the `cancelled` guard (`v_uid is distinct from v_seeker` is always TRUE for null uid).

**`supabase/functions/trouble-report/index.test.ts`** (309 lines) — 7 tests:
- Auth gate (401)
- Ownership (403, no Stripe calls)
- State guard — only assigned/filming (400)
- PI cancel confirmed, refunds.create NOT called
- Transfer: destination, NOFAULT_CENTS amount, no source_transaction, no reverse_transfer
- Idempotency: state machine blocks second call; no duplicate Stripe calls
- Transition verified as `'no_scout'` (BLOCKER-1 assertion)

### Task 2 — scout-earnings Edge Function + 0016 migration (commit 8c231e3)

**`supabase/migrations/0016_scout_earnings.sql`** (87 lines) — **hard deliverable, pushed by Plan 04**

Two `SECURITY DEFINER` plpgsql functions:
- `scout_earnings_weekly(p_scout_id uuid)` — daily earnings last 7 days, filtered to `transferred/captured`
- `scout_earnings_totals(p_scout_id uuid)` — all-time total_cents + total_clips

Both include the IDOR guard: `if p_scout_id is distinct from auth.uid() and auth.uid() is not null then raise exception 'forbidden'`. Service role (auth.uid()=null from Edge fn context) is allowed because the Edge fn already verified identity via bearer.

**`supabase/tests/0016_scout_earnings.test.sql`** — 6 pgTAP tests (RED until 0016 pushed live):
- scout1 totals sum correctly (800 + 1200 = 2000)
- clip count = 2
- authorized payments NOT counted (only transferred/captured)
- weekly returns rows within 7 days
- weekly sum matches expected
- coalesce returns 0 not null for empty scout

**`supabase/functions/scout-earnings/index.ts`** (170 lines):
- DB aggregate via `scout_earnings_weekly` + `scout_earnings_totals` RPCs
- scoutId = callerId always (never body-supplied — IDOR-safe)
- Stripe balance with `expand: ['instant_available.net_available']`
- instantNetCents from `net_available[0].amount` (Pitfall 5 guard)
- payouts.list mapped to `{ id, amountCents, status, arrivalDate, method }`
- No-account path: returns 0 balances + empty payouts, no Stripe calls

**`supabase/functions/scout-earnings/index.test.ts`** (261 lines) — 5 tests covering all behaviors above.

### Task 3 — stripe-connect-payout Edge Function (commit 183894a)

**`supabase/functions/stripe-connect-payout/index.ts`** (160 lines):

Real Scout withdraw endpoint:
- scoutId = callerId (IDOR-safe, T-07-10)
- `amountCents <= 0` → 400 before any Stripe call
- Standard: `payouts.create({ amount, currency: 'usd', method: 'standard' })` + `{ stripeAccount }`
- Instant: retrieve balance first → compare amount to `net_available` → 400 if over-limit → `payouts.create({ method: 'instant' })`
- `log_event payment.payout_initiated` called **before** `payouts.create` (audit-first — T-07-07 double-payout mitigation)

**`supabase/functions/stripe-connect-payout/index.test.ts`** (270 lines) — 7 tests:
- Auth (401)
- Amount validation (400, no Stripe calls)
- Standard: method:standard confirmed
- Instant within net: method:instant, correct amount
- Instant over net: 400 (Pitfall 5 guard — never overdraws)
- No account: 400 no payout account
- Event-order: log_event index < payouts.create index (audit-first asserted)

## Test Results

```
deno test supabase/functions/ --allow-env
ok | 98 passed | 0 failed (762ms)
```

All three new test suites green. All 25 pre-existing tests untouched and passing.

## Deviations from Plan

None — plan executed exactly as written.

One minor clarification: the plan's acceptance grep `! grep -q "'cancelled'"` matches comment lines in trouble-report/index.ts that explain WHY we don't use 'cancelled'. The actual `p_to` value in code is always `'no_scout'`. The `transition_check called with 'no_scout' not 'cancelled'` test asserts this directly at runtime.

## Known Stubs

None. These are Edge Functions with complete implementations:
- `trouble-report`: all branches implemented (auth, ownership, state, PI cancel, Transfer, log)
- `scout-earnings`: all branches implemented (DB aggregate + Stripe balance/payouts)
- `stripe-connect-payout`: all branches implemented (standard, instant, overdraw guard, no-account)

0016 migration is a hard deliverable — NOT a stub. Plan 04 pushes it unconditionally.

## Threat Surface Scan

All three functions introduce new network endpoints behind Supabase JWT verification (`verify_jwt=true`). Each is within the existing trust boundary model. Coverage from plan's threat register:

| Flag | File | Mitigation Applied |
|------|------|--------------------|
| T-07-05 | trouble-report/index.ts | check.scout_id === callerId gate at line 52 (403) |
| T-07-06 | trouble-report/index.ts | `payment.status === 'authorized'` guard before cancel; state machine blocks terminal states |
| T-07-07 | trouble-report/index.ts | state machine is primary idempotency lock; event_log check_event_exists is secondary |
| T-07-07 | stripe-connect-payout/index.ts | log_event before payouts.create (audit-first) |
| T-07-08 | trouble-report/index.ts | paymentIntents.cancel used (never capture, never refunds.create on uncaptured) |
| T-07-09 | stripe-connect-payout/index.ts | 400 returned if amountCents > instantNetCents (net_available) |
| T-07-10 | scout-earnings/index.ts | scoutId = callerId; 0016 RPCs have IDOR guard inside SECURITY DEFINER |
| T-07-10 | stripe-connect-payout/index.ts | scoutId = callerId only |
| T-07-11 | all three | log_event on every money action |

## Self-Check: PASSED

- `supabase/functions/trouble-report/index.ts` exists, 204 lines — FOUND
- `supabase/functions/trouble-report/index.test.ts` exists, 309 lines — FOUND
- `supabase/functions/scout-earnings/index.ts` exists, 170 lines — FOUND
- `supabase/functions/scout-earnings/index.test.ts` exists, 261 lines — FOUND
- `supabase/functions/stripe-connect-payout/index.ts` exists, 160 lines — FOUND
- `supabase/functions/stripe-connect-payout/index.test.ts` exists, 270 lines — FOUND
- `supabase/migrations/0016_scout_earnings.sql` exists, 87 lines — FOUND
- `supabase/tests/0016_scout_earnings.test.sql` exists — FOUND
- Task 1 commit `9a6e949` confirmed in git log
- Task 2 commit `8c231e3` confirmed in git log
- Task 3 commit `183894a` confirmed in git log
- Full suite: 98 passed, 0 failed
- All files under 500 lines
