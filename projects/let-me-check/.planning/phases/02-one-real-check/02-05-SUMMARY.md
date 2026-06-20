---
phase: 02-one-real-check
plan: 05
subsystem: scout-screens
tags: [scout, dispatch, check-lifecycle, atomic-accept, stub-clip]
requires:
  - "lib/checks.ts (listOpenChecks, acceptCheck, markFilming, markDelivered) — Plan 02-03"
provides:
  - "Scout dashboard wired to real open checks + atomic accept (CHECK-02 manual, CHECK-03)"
  - "filming.tsx: assigned->filming on capture, ->delivered with stub clip on submit"
  - "submitted.tsx: real delivered confirmation, NO fake earnings credit"
affects:
  - "Seeker live transitions (Plan 02-04) — the Scout side drives filming/delivered the Seeker watches"
tech-stack:
  added: []
  patterns:
    - "All check state changes routed through lib/checks server RPCs (no client UPDATE)"
    - "Atomic accept via acceptCheck(); lost race surfaces 'taken' + list refresh"
    - "Stub-clip delivery (Phase-3 Mux seam) — markDelivered inserts stub then transitions"
key-files:
  created: []
  modified:
    - "lmc-app/app/(scout)/dashboard.tsx"
    - "lmc-app/app/(scout)/filming.tsx"
    - "lmc-app/app/(scout)/submitted.tsx"
decisions:
  - "Display payout derived from tier (standard $8 / priority $12) as a label only — no money write this phase"
  - "markFilming fires once on first capture start (filmingMarked ref guard) to satisfy RLS 0009 before the clip insert"
  - "Kept useScoutEarnings in submitted.tsx for read-only balance display; removed the addClipEarning mutation"
metrics:
  duration: "~3 min"
  completed: "2026-06-20"
  tasks: 3
  files: 3
---

# Phase 2 Plan 5: Scout Screen Wiring Summary

Wired the three Scout screens onto the live check lifecycle: the dashboard lists real open checks and claims one atomically, `filming.tsx` moves the check `assigned -> filming -> delivered` (with a stub clip) through the server RPCs, and `submitted.tsx` reflects the real delivered state with no fake earnings credit.

## What Was Built

**Task 1 — dashboard.tsx (`83478af`)**
- Removed the `REQUEST_POOL` mock array and its auto-queue timer.
- `listOpenChecks()` now feeds the incoming-request card (`status='dispatching'`, RLS-scoped). Fetches on mount, when the Scout goes online, and on screen focus; clears when offline.
- Accept routes through `acceptCheck(check.id)` (atomic `accept_check`). On a lost race the catch path shows an inline "Another Scout grabbed that one" note and refreshes the list — proving the double-booking guard end to end.
- On success, routes to filming with the real `checkId`. Card maps `location_label` + `tier`; payout shown as a tier-derived display label only.

**Task 2 — filming.tsx (`f4b21af`)**
- Reads `checkId` from params.
- `markFilming(checkId)` fires once on the first capture start (guarded by a `filmingMarked` ref) so the check is in `filming` before the stub-clip insert (RLS 0009 precondition) and so the Seeker sees the "filming" step.
- SUBMIT calls `markDelivered(checkId, filmedAt)` — inserts the stub clip then transitions to `delivered`. The existing upload animation is now just the visual delay; routes to submitted with the real `checkId` + `tier`. A delivery failure drops out of the upload UI for retry.
- `TODO(phase-3)` seam documents the real Mux capture/upload swap. No camera/Mux added.

**Task 3 — submitted.tsx (`be1bf81`)**
- Removed `earnings.addClipEarning()` and the one-time-credit guard. No money moves on delivery (Phase 4 owns payouts).
- `useScoutEarnings` kept read-only for the running-balance toast display.
- Accepts the `checkId` param; `TODO(phase-4)` money seam marks where the payout credit will live.

## Deviations from Plan

None — plan executed as written. The display-payout mapping, the `markFilming` ref guard, and the read-only earnings retention were all explicitly permitted by the plan's actions.

## Deferred Issues (out of scope)

- `app/(seeker)/waiting.tsx:378` has 4 pre-existing `tsc` errors (`pad`/`mins`/`secs` undefined) from the parallel Seeker-wiring agent (Plan 02-04). That file is in the `(seeker)/` domain this plan must not touch; it was already a modified-uncommitted working-tree change at session start. Logged to `deferred-items.md`. All three `(scout)/` files in this plan pass `tsc` cleanly.

## Verification

- Per-task `npx tsc --noEmit`: clean for each of the three `(scout)` files at commit time.
- `npx vitest run`: 47 passed (7 files).
- Greps: `listOpenChecks` + `acceptCheck` in dashboard (REQUEST_POOL gone, `checkId` present); `markFilming` + `markDelivered` + `TODO(phase-3)` in filming; `addClipEarning` gone + `TODO(phase-4)` present in submitted.

## BLOCKED — on-device checkpoint

End-to-end live behavior (real open check appears -> atomic accept -> film -> delivered with stub clip, and the lost-race "taken" path with two Scout sessions) is **BLOCKED: human on-device verification**. No device/simulator available in this environment. This walk-through is owned by Plan 02-04 Task 4 (two-session on-device verification), per the plan's `<verification>` note.

## Known Stubs

- **Stub clip on delivery** (`filming.tsx` -> `markDelivered`): intentional. `markDelivered` inserts a `status='stub'` clip row; real Mux capture/upload is Phase 3 (`TODO(phase-3)` seam in place). Documented and gated by design.
- **No earnings credit** (`submitted.tsx`): intentional. Money is Phase 4 (`TODO(phase-4)` seam in place).

## Self-Check: PASSED
