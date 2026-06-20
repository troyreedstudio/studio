# Deferred Items — Phase 03 Video Pipeline

## Pre-existing test failures (NOT caused by Plan 03-03)

Discovered during 03-03 execution while running the full `npx vitest run`.
Confirmed pre-existing: they fail identically with all 03-03 changes stashed.
Out of scope for 03-03 (which only touches lib/clips, lib/checks, filming.tsx,
app.config.js, scripts/). Logged for a future maintenance pass.

- `app/lib/auth.test.ts` (6 tests) — fails with `ReferenceError: __DEV__ is not defined`
  under the vitest node environment. The auth module references React Native's
  `__DEV__` global which the test harness does not define.
- `app/lib/supabase.test.ts` (3 tests) — fails with a `RolldownError: Parse failure`
  in the vitest/rolldown transform of the module under test.

Both are vitest-harness/RN-global issues, not product bugs. The 03-03 lib suites
(`checks.test.ts`, `clips.test.ts`) are green.

## Deferred (03-05 execution)

- **Pre-existing vitest failures in `app/lib/auth.test.ts` (6) + `app/lib/supabase.test.ts` (3)** — fail on an `expo-modules-core` / `__DEV__` parse error in the vitest environment, NOT caused by 03-05. Confirmed identical failure with this plan's changes stashed. Out of scope (Rule: only auto-fix issues from the current task's changes). `clips.test.ts` (the file this plan touches) passes 10/10.
