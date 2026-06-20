---
phase: 02-one-real-check
plan: 03
subsystem: client-data-layer
tags: [checks, realtime, supabase, lifecycle, tdd, lib]
requires: ["02-01 (migrations 0007-0009: transition_check/accept_check/clips/no_scout)", "02-02 (regenerated database.types.ts)"]
provides:
  - "lib/checks.ts: createCheck, getCheck, listOpenChecks, acceptCheck, markFilming, markDelivered, rateCheck, cancelCheck, getCheckClip + CheckRow/ClipRow/CheckTier types"
  - "lib/realtime.ts: subscribeToCheck(checkId, onStatus, onError) -> teardown"
affects:
  - "Wave 4 (Plan 02-04 seeker screens): waiting.tsx / delivery.tsx consume getCheck + subscribeToCheck + getCheckClip + rateCheck"
  - "Wave 5 (Plan 02-05 scout screens): dashboard.tsx / filming.tsx consume listOpenChecks + acceptCheck + markFilming + markDelivered"
tech-stack:
  added: []
  patterns:
    - "All check state changes route through server RPCs (transition_check / accept_check); client never UPDATEs checks.status or scout_id (DATA-02)"
    - "Postgres Changes (RLS-enforced, single-row id=eq filter) for the Seeker's live watch — not Broadcast"
    - "markDelivered inserts a stub clip BEFORE the delivered transition (deliver-needs-clip server guard backstop)"
    - "TDD: Vitest specs written RED first, mocking ./supabase to assert call shapes not network"
key-files:
  created:
    - lmc-app/app/lib/checks.ts
    - lmc-app/app/lib/realtime.ts
    - lmc-app/app/lib/checks.test.ts
    - lmc-app/app/lib/realtime.test.ts
  modified: []
decisions:
  - "getCheckClip added (plan addendum) so the Wave-4 delivery screen consumes an owned, tested export rather than an unplanned helper later"
  - "rateCheck validates stars 1..5 at the client boundary before any write (Rule 2: input validation at boundary)"
  - "getCheckClip uses .maybeSingle() — this phase inserts exactly one stub clip per check; multi-clip is a Phase-3 concern"
metrics:
  duration: ~4 min
  tasks: 3
  files: 4
  tests: 26 new (47 total green)
  completed: 2026-06-20
---

# Phase 2 Plan 03: Client lib — checks lifecycle + realtime Summary

Typed client lifecycle layer for checks: `lib/checks.ts` (nine wrappers) and `lib/realtime.ts` (`subscribeToCheck` over Supabase Postgres Changes), TDD-built against the regenerated live types. Every state change routes through the server-owned `transition_check` / `accept_check` RPCs — the client holds no business logic and never writes `checks.status` or `scout_id`.

## What was built

- **lib/checks.ts (185 lines):** `createCheck` (INSERT `requested` → `transition_check` to `dispatching`, returns id), `getCheck`, `listOpenChecks` (RLS-scoped `dispatching` SELECT, ordered), `acceptCheck` (`accept_check` RPC, surfaces "already taken"), `markFilming`, `markDelivered` (stub `clips` insert → `delivered` transition), `rateCheck` (`ratings` insert → `rated` transition, stars 1..5 validated), `cancelCheck`, and `getCheckClip` (delivered clip metadata for the delivery screen). Exports `CheckRow`, `ClipRow`, `CheckTier` type aliases.
- **lib/realtime.ts (45 lines):** `subscribeToCheck(checkId, onStatus, onError)` builds a `postgres_changes` UPDATE channel filtered `id=eq.<checkId>` on `checks`, forwards `payload.new` to `onStatus`, calls `onError` on `CHANNEL_ERROR`/`TIMED_OUT` (so the caller re-fetches and reconciles), and returns a teardown that calls `removeChannel`.
- **Tests:** `checks.test.ts` (20 cases) + `realtime.test.ts` (6 cases) against a fully mocked `./supabase`, asserting exact call shapes (`p_to` values, table names, insert-before-transition ordering, filter strings) — not network.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Vitest specs FIRST (RED) | 3477d6d |
| 2 | Implement lib/checks.ts (GREEN) | 62466a8 |
| 3 | Implement lib/realtime.ts (GREEN) | 32ed0a3 |

## Verification

- `npx tsc --noEmit` exits 0 against the regenerated `database.types.ts` (clips, accept_check, transition_check, no_scout all present).
- `npx vitest run` — 47 tests pass across 7 files (26 new this plan).
- `! grep "from('checks').update"` holds — no direct status/scout_id write anywhere in `checks.ts`.
- Threat register T-02-10/11/12 satisfied: all transitions via RPC; `listOpenChecks` is a narrow `dispatching` SELECT (server RLS confines it); `markDelivered` inserts the clip before transitioning.

## Deviations from Plan

### Auto-added (Rule 2/3)

**1. [Rule 2 - Critical functionality] getCheckClip helper + contract**
- **Source:** plan addendum (plan-checker WARNING).
- **Added:** `getCheckClip(checkId)` one-line `clips` select + its Vitest contract, included in the export surface, so the Wave-4 Seeker delivery screen consumes an owned, tested export.
- **Files:** `lmc-app/app/lib/checks.ts`, `lmc-app/app/lib/checks.test.ts`
- **Commits:** 62466a8 (impl), 3477d6d (test)

**2. [Rule 3 - Blocking issue] Reworded a doc comment so the security acceptance grep is a true signal**
- **Issue:** the plan's hard acceptance gate `! grep -q "from('checks').update"` matched my own explanatory comment text (`.from('checks').update(...)`), not a real call, which would falsely fail the gate.
- **Fix:** reworded the comment to "NEVER UPDATE the checks table directly" — no functional change; the gate now reflects actual code only.
- **Files:** `lmc-app/app/lib/checks.ts`
- **Commit:** 62466a8

**3. [Rule 2 - Input validation] rateCheck stars bounds**
- **Added:** validate `stars` is an integer 1..5 before any write (CLAUDE.md: validate input at boundaries).
- **Files:** `lmc-app/app/lib/checks.ts`, `lmc-app/app/lib/checks.test.ts`
- **Commit:** 62466a8

## Wave 4/5 consumption (confirmation)

The screen-wiring waves can consume these directly:
- **Seeker (Wave 4):** `createCheck` (from venue/payment), `getCheck` + `subscribeToCheck` (waiting.tsx live status), `getCheckClip` + `rateCheck` (delivery.tsx).
- **Scout (Wave 5):** `listOpenChecks` + `acceptCheck` (dashboard.tsx), `markFilming` + `markDelivered` (filming.tsx).
All exports are typed (`CheckRow`/`ClipRow`/`CheckTier`) and unit-tested.

## Known Stubs

`markDelivered` inserts a `clips` row with `status: 'stub'` (no `mux_asset_id`/`playback_id`). **Intentional and documented** — this is the explicit Phase-3 seam (real camera + Mux upload). The check flow and `delivery.tsx` read path do not change when Phase 3 swaps the insert for a real upload. Not a blocker for Phase 2's "one real check" goal.

## Self-Check: PASSED
