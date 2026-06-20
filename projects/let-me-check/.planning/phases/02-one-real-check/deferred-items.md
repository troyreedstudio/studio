# Deferred Items — Phase 02 (one-real-check)

## Out-of-scope discoveries (do NOT fix in this plan)

### tsc errors in app/(seeker)/waiting.tsx (logged by Plan 02-05 executor)
- **When:** During Plan 02-05 (Scout screen wiring) overall verification.
- **What:** `npx tsc --noEmit` reports 4 errors in `app/(seeker)/waiting.tsx:378` — `Cannot find name 'pad'`, `'mins'`, `'secs'`. These reference undefined locals (likely a half-applied edit to the countdown formatter).
- **Why deferred:** `(seeker)/` files are owned by the parallel Wave-4 agent (Plan 02-04). Plan 02-05 is constrained to `(scout)/` files only. The file was already in the working tree as a modified-uncommitted change at session start. Not caused by, and not in scope for, this plan.
- **Owner:** Plan 02-04 (Seeker screen wiring) executor.
- **Note:** All three `(scout)/` files in this plan pass `tsc` cleanly; the project-wide `tsc` is only red because of this seeker file.
- **RESOLVED by Plan 02-04:** The waiting.tsx countdown formatter (`pad`/`mins`/`secs`) was deleted when the screen was rewired to live status. `(seeker)/waiting.tsx` now passes `tsc` cleanly.

### tsc errors in app/(scout)/dashboard.tsx (logged by Plan 02-04 executor)
- **When:** During Plan 02-04 (Seeker screen wiring) verification.
- **What:** `npx tsc --noEmit` reports ~7 errors in `app/(scout)/dashboard.tsx` (lines ~193-244) — properties `venue`, `distanceMi`, `area`, `payout`, `deliveryMin`, `clipSec` do not exist on `CheckRow`. The dashboard reads mock-shaped fields off the real check row.
- **Why deferred:** `(scout)/` files are owned by the parallel Wave-5 agent (Plan 02-05). Plan 02-04 is constrained to `(seeker)/` files only. Not caused by, and not in scope for, this plan.
- **Owner:** Plan 02-05 (Scout screen wiring) executor.
- **Note:** All four `(seeker)/` files in this plan pass `tsc` cleanly; the project-wide `tsc` red is now confined to this in-flight scout file.
