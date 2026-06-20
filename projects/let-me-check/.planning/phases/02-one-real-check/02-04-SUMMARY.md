---
phase: 02-one-real-check
plan: 04
subsystem: seeker-check-loop
tags: [seeker, realtime, checks, rating, wiring]
requires:
  - app/lib/checks.ts (createCheck, getCheck, getCheckClip, rateCheck, cancelCheck)
  - app/lib/realtime.ts (subscribeToCheck)
provides:
  - Seeker screens wired to real checks end-to-end (payment -> finding -> waiting -> delivery)
  - Live status driven by Postgres Changes; honest terminal routing
  - Persisted star rating on delivery
affects:
  - lmc-app/app/(seeker)/payment.tsx
  - lmc-app/app/(seeker)/finding.tsx
  - lmc-app/app/(seeker)/waiting.tsx
  - lmc-app/app/(seeker)/delivery.tsx
tech-stack:
  added: []
  patterns:
    - "Thin client: all check reads/writes go through app/lib/* wrappers; screens only map status -> route"
    - "getCheck() initial fetch + subscribeToCheck() live + onError re-fetch reconciliation"
    - "AppState 'active' re-fetch on the waiting screen (foreground reconciliation)"
key-files:
  created: []
  modified:
    - lmc-app/app/(seeker)/payment.tsx
    - lmc-app/app/(seeker)/finding.tsx
    - lmc-app/app/(seeker)/waiting.tsx
    - lmc-app/app/(seeker)/delivery.tsx
decisions:
  - "Confirm creates the real check now; the Stripe hold is a documented TODO(phase-4) seam, no money this phase"
  - "All seeker navigation off a check is driven by the real status row only; fake setInterval countdown and prototype skip link deleted"
metrics:
  duration: ~5 min (offline build; on-device checkpoint deferred)
  completed: 2026-06-20
  tasks_completed: 3 of 4 (Task 4 is a blocking human on-device checkpoint)
---

# Phase 2 Plan 4: Seeker Check-Loop Wiring Summary

Wired the four Seeker screens to the real check lifecycle: confirming a request creates a genuine `checks` row (no money), `finding` and `waiting` watch live status over Supabase Realtime with honest terminal routing, and `delivery` shows the real clip metadata and persists a 5-star rating.

## What Changed

- **payment.tsx** — Confirm now calls `createCheck({ tier, locationLabel })` and routes to `finding` carrying the real `checkId`. The fake `setTimeout`-then-navigate was removed. A `TODO(phase-4)` comment documents the Stripe-hold money seam at the confirm site. A create failure surfaces an inline `Alert` and keeps the Seeker on payment.
- **finding.tsx** — Reads `checkId`, does an initial `getCheck()` then `subscribeToCheck()`. The prototype match timer, the status-cycling-as-navigation, and the "Simulate: no Scouts" link are gone. Routing is now driven by the real status: `assigned`/`filming`/`delivered`/`rated` -> waiting; `no_scout`/`expired` -> error.tsx; `cancelled` -> cancelled.tsx. The free Cancel calls the server-owned `cancelCheck()`. Radar animation + status copy remain (cosmetic only).
- **waiting.tsx** — The fake countdown `setInterval` (decrementing `secondsLeft`), its `setTimeout`-to-delivery, and the "Skip ahead · prototype" link are deleted. Live status comes from `getCheck()` + `subscribeToCheck()`, plus an `AppState` 'active' re-fetch for foreground reconciliation. The hero text and progress steps now reflect the real status (`assigned` = on-site, `filming` = recording). `delivered`/`rated` -> delivery; `cancelled` -> cancelled.tsx (via `cancelCheck()`); `no_scout`/`expired` -> error.tsx. The Mapbox scout-jitter cosmetic stays and never drives navigation.
- **delivery.tsx** — Loads the real check (`getCheck`) and clip metadata (`getCheckClip`) by `checkId`. The hard-coded "Filmed 2 min ago" is replaced by the clip's real `filmed_at` (formatted "Filmed N min ago"), and the location line uses the check's `location_label`. A star tap calls `rateCheck(checkId, star)` to persist to the `ratings` table, with a double-submit guard and an error revert. The video player, AI verdict, and crowd tags remain static placeholders (Phase 3 / Phase 6).

## Tasks

| Task | Name | Status | Commit |
| ---- | ---- | ------ | ------ |
| 1 | payment confirm -> createCheck() | done | 84c91e4 |
| 2 | finding + waiting -> live status via subscribeToCheck | done | c779707 |
| 3 | delivery -> real check + clip metadata + rateCheck() | done | 7399ef3 |
| 4 | On-device live-status walk-through | **BLOCKED (human checkpoint)** | — |

## Verification

- `npx tsc --noEmit` — clean for all four `(seeker)/` plan files (`NO_SEEKER_PLAN_ERRORS`).
- `npx vitest run` — 47 tests passed (7 files), no regressions.
- Greps: `createCheck` in payment; `subscribeToCheck` in finding + waiting; `rateCheck` + `getCheck`/`getCheckClip` in delivery; "Skip ahead" and "Filmed 2 min ago" both removed; `cancelCheck` in finding + waiting.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing waiting.tsx tsc errors resolved**
- **Found during:** Task 2.
- **Issue:** `deferred-items.md` recorded that `waiting.tsx` had undefined-local errors (`pad`/`mins`/`secs`) from a half-applied countdown edit, blocking a clean project tsc.
- **Fix:** The Task-2 rewrite deletes the entire countdown formatter, so these locals no longer exist. `(seeker)/waiting.tsx` now passes tsc cleanly. Marked RESOLVED in `deferred-items.md`.
- **Files modified:** lmc-app/app/(seeker)/waiting.tsx
- **Commit:** c779707

Otherwise the plan executed as written.

## Out-of-Scope (logged, not fixed)

- `app/(scout)/dashboard.tsx` has ~7 tsc errors (mock-shaped fields read off `CheckRow`). These files are owned by the parallel Wave-5 agent (Plan 02-05); not in scope here. Logged to `deferred-items.md`. All four seeker plan files are clean; the project-wide tsc red is confined to that in-flight scout file.

## Blocked — On-Device Checkpoint (Task 4)

Task 4 is a `checkpoint:human-verify` gated as blocking. It **cannot** run in this environment: it needs a dev build (Realtime + Mapbox don't run in Expo Go), a live linked Supabase, two sessions (Seeker + Scout), and the Scout side from Plan 05 to drive the transitions the Seeker watches. Run it after both Plan 04 and Plan 05 land.

**Walk-through to verify (Troy, on a dev build):**
1. As a Seeker, browse a venue, pick a tier, confirm. A real `checks` row should appear in Supabase with status `dispatching` and your seeker_id.
2. From a Scout session on another device, accept the check (Plan 05). The Seeker screen should move finding -> waiting WITHOUT a manual refresh (that is live status, DISP-04).
3. Let the Scout film -> submit. The Seeker screen should advance to delivery automatically.
4. On delivery: confirm "when/where filmed" reflects the real clip's `filmed_at` + your `location_label` (not "Filmed 2 min ago"). Tap a star; confirm a row appears in `ratings` and the check is `rated`.
5. Failure path: a second check transitioned to `no_scout` should land the Seeker on error.tsx; a Seeker cancel should land on cancelled.tsx.

Reply "verified" once status moves live and the rating persists, or describe what stuck.

## Known Stubs

- delivery.tsx video player is the existing placeholder (real Mux playback is Phase 3, by design).
- delivery.tsx "AI VERDICT" line and crowd tags are static placeholder copy (Phase 6, by design).
- delivery.tsx scout card ("Jake C.") remains placeholder — scout profile join is out of scope for this plan.

These are intentional and called out in the plan; none block the Seeker check loop or the rating persistence.

## Self-Check: PASSED

- All four modified files exist on disk.
- 02-04-SUMMARY.md exists.
- Per-task commits 84c91e4, c779707, 7399ef3 all present in git history.
