# Deferred Items — Phase 02 (one-real-check)

## Out-of-scope discoveries (do NOT fix in this plan)

### tsc errors in app/(seeker)/waiting.tsx (logged by Plan 02-05 executor)
- **When:** During Plan 02-05 (Scout screen wiring) overall verification.
- **What:** `npx tsc --noEmit` reports 4 errors in `app/(seeker)/waiting.tsx:378` — `Cannot find name 'pad'`, `'mins'`, `'secs'`. These reference undefined locals (likely a half-applied edit to the countdown formatter).
- **Why deferred:** `(seeker)/` files are owned by the parallel Wave-4 agent (Plan 02-04). Plan 02-05 is constrained to `(scout)/` files only. The file was already in the working tree as a modified-uncommitted change at session start. Not caused by, and not in scope for, this plan.
- **Owner:** Plan 02-04 (Seeker screen wiring) executor.
- **Note:** All three `(scout)/` files in this plan pass `tsc` cleanly; the project-wide `tsc` is only red because of this seeker file.
