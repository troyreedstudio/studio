---
phase: 07-sla-money-integrity-real-server-driven-delivery-deadlines-de
plan: 03
subsystem: client-wiring
tags: [payments, filming, earnings, withdraw, deadline, trouble-report, scout-earnings]
dependency_graph:
  requires: [07-01, 07-02]
  provides: [real-deadline-countdown, wired-trouble-here, real-earnings-screen, real-withdraw-flow]
  affects: [filming.tsx, earnings.tsx, withdraw.tsx, payments.ts]
tech_stack:
  added: []
  patterns:
    - invokeEdgeFunction fetch helper (30s timeout, Hermes-safe) for all three new helpers
    - deadline_at seeded via (c as any) cast — column not yet in database.types.ts (same pattern as Phase 5 geo columns)
    - troubleBusy guard prevents double-tap during inflight reportTrouble call
    - Earnings loading/error/retry state pattern for async Edge Function fetch
    - route params (available, payoutSpeed) carry real balance from earnings to withdraw
key_files:
  created: []
  modified:
    - lmc-app/app/lib/payments.ts
    - lmc-app/app/(scout)/filming.tsx
    - lmc-app/app/(scout)/earnings.tsx
    - lmc-app/app/(scout)/withdraw.tsx
decisions:
  - "waiting.tsx left untouched — already 100% status-driven (comment: 'no faked countdown' line 199); no fixed Seeker timer exists"
  - "Trouble-Here REPORTED copy uses commas not em-dashes per copy rule; routes Scout to dashboard after 2s"
  - "earnings.tsx ALL TIME label replaces THIS MONTH (server returns allTimeCents not monthly total; honest label)"
  - "withdraw.tsx success copy is speed-aware (instant: '~30 min', standard: '1 to 2 business days')"
metrics:
  duration_minutes: 3
  completed_date: "2026-06-22"
  tasks_completed: 2
  files_modified: 4
---

# Phase 7 Plan 03: Client Wiring Summary

Real deadline countdown, real Trouble-Here server call, real earnings and withdraw flows — four cosmetic fakes replaced with wired API calls.

## What Was Built

### Task 1: payments.ts helpers + filming.tsx wiring (commit 234a5ef)

**payments.ts** — three new typed exports following the existing `requestRefund` style:

- `reportTrouble(checkId, reason)` calls `trouble-report` Edge fn; throws if status != 'reported'; only caller confirms after server round-trip (T-07-12)
- `getScoutEarnings()` calls `scout-earnings`; returns `ScoutEarnings` interface (weeklyByDay, allTimeCents, availableCents, instantNetCents, payoutSpeed, payouts)
- `requestPayout(amountCents, speed?)` calls `stripe-connect-payout`; server bounds amount to available (T-07-13); no scoutId in body (T-07-14)

**filming.tsx** changes:

- Import `reportTrouble` from payments.ts
- Existing `getCheck(checkId).then(...)` on mount extended to read `deadline_at` via `(c as any)` cast (column not in database.types.ts yet); computes `Math.max(0, Math.round((new Date(deadline_at).getTime() - Date.now()) / 1000))` and calls `setSecondsLeft(remaining)` — countdown now resumes correctly after app reopen
- Added `troubleBusy` state to disable reason rows during inflight call
- Trouble-Here `onPress` now: sets busy, awaits `reportTrouble`, on success sets confirmed state + routes to dashboard after 2s, on error shows `Alert.alert` and does NOT show REPORTED state
- REPORTED copy changed from "REPORTED · SEEKER REFUNDED" to "REPORTED, SEEKER REFUNDED, YOU'RE COVERED" (commas, no em-dashes)

### Task 2: earnings.tsx + withdraw.tsx real data (commit 205ae3e)

**earnings.tsx** — full rewrite of data layer:

- `useState<ScoutEarnings | null>(null)` + `useEffect` fetches `getScoutEarnings()` on mount
- Loading spinner + error message with retry button
- `monthTotal` from `data.allTimeCents / 100` (label changed to ALL TIME — honest)
- Bar chart from `data.weeklyByDay` — normalises day names to 3-char uppercase, scales bars to week max, highlights last non-zero bar as "today"
- Payouts list from `data.payouts` (id / amountCents / status / arrivalDate / method)
- Available balance from `data.availableCents / 100`
- WITHDRAW button routes `router.push('/(scout)/withdraw', { available, payoutSpeed })` with real values; disabled when balance is zero

**withdraw.tsx** — replaced fake with real payout:

- `AVAILABLE` from `availableParam` route param (no hardcoded 137.0 constant)
- `speed` from `payoutSpeed` route param (defaults to 'standard')
- Quick-amount presets use dynamic available balance in the "All ($X)" label
- `handleWithdraw` calls `await requestPayout(Math.round(numAmount * 100), speed)` — success only on server resolve; `Alert.alert` on error
- `paidAmount` state carries the amount to the success screen; no setTimeout fake
- Success copy is speed-aware (instant vs standard language)

**waiting.tsx** — no changes. Screen is entirely status-driven (`check.status` from realtime subscription); no fixed countdown exists (comment on line 199 confirms: "no faked countdown"). D-01 requirement for the Seeker screen is already satisfied.

## Deviations from Plan

None — plan executed exactly as written. `waiting.tsx` confirmed untouched (plan explicitly allows this: "if no copy change is needed, this file may end up untouched").

## Known Stubs

- Bank destination in withdraw.tsx remains cosmetic ("Chase Checking · 6193 · Troy R.") — real bank detail wiring is a later phase (noted in plan: "keep the bank-destination display as-is for now")

## Threat Flags

None. All three new Edge Function call patterns send no scoutId in body (T-07-14 satisfied); reportTrouble only confirms after server success (T-07-12 satisfied); requestPayout amount is a request only, server enforces available ceiling (T-07-13 satisfied).

## Self-Check: PASSED

- `lmc-app/app/lib/payments.ts` — exists, contains `reportTrouble`, `getScoutEarnings`, `requestPayout`
- `lmc-app/app/(scout)/filming.tsx` — exists, contains `deadline_at`, `reportTrouble`
- `lmc-app/app/(scout)/earnings.tsx` — exists, contains `getScoutEarnings`, no `220` or `BAR_DATA` constants driving display numbers
- `lmc-app/app/(scout)/withdraw.tsx` — exists, contains `requestPayout`, no `const AVAILABLE = 137`
- Commits 234a5ef and 205ae3e present in git log
- `npx tsc --noEmit` clean (zero errors)
