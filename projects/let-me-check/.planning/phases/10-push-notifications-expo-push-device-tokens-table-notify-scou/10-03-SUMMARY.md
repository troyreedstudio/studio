---
phase: 10-push-notifications
plan: "03"
subsystem: push-notifications
tags: [push, expo-notifications, expo-device, auth, device-tokens, notifications-ui, vitest]
dependency_graph:
  requires:
    - lmc-app/app/lib/push.ts (new — this plan)
    - lmc-app/app/lib/config.ts (EAS_PROJECT_ID added — this plan)
    - device_push_tokens table (migration 0018, Plan 10-01)
    - expo-notifications + expo-device (installed Plan 10-01)
    - signInWithApple / signInWithGoogle in auth.ts (Plan 01-01)
    - notification_prefs column on profiles (migration 0017, Phase 09)
  provides:
    - registerPushToken() — permission + ExpoPushToken, simulator-safe
    - upsertPushToken() — idempotent upsert into device_push_tokens
    - deletePushToken() — best-effort cleanup on sign-out
    - Fire-and-forget token registration after Apple + Google sign-in
    - Best-effort token deletion on sign-out
    - job-nearby Scout toggle in notifications.tsx (Open-Q1 resolved)
    - EAS_PROJECT_ID exported from config.ts (Release-build safe)
  affects:
    - lmc-app/app/lib/auth.ts (sign-in + sign-out wired)
    - lmc-app/app/(seeker)/notifications.tsx (job-nearby added)
tech_stack:
  added: []
  patterns:
    - EAS_PROJECT_ID bundled in config.ts (same Release-safe pattern as SUPABASE_URL)
    - fire-and-forget .then/.catch on sign-in (push never blocks auth)
    - try/catch swallow on sign-out (cleanup never blocks auth)
    - as-any cast for device_push_tokens (not in database.types.ts until Wave-4 regen)
key_files:
  created:
    - lmc-app/app/lib/push.ts
    - lmc-app/app/lib/push.test.ts
  modified:
    - lmc-app/app/lib/config.ts (EAS_PROJECT_ID added)
    - lmc-app/app/lib/auth.ts (fire-and-forget registration + sign-out cleanup)
    - lmc-app/app/(seeker)/notifications.tsx (job-nearby toggle added)
decisions:
  - "EAS_PROJECT_ID bundled in config.ts NOT via Constants.expoConfig.extra — same Release crash class that hit SUPABASE_URL (Constants.expoConfig is null in Release builds)"
  - "registerPushToken() re-used in signOut() to fetch the current token before deletion (avoids storing token in module-level state; permission already granted so no re-prompt)"
  - "null user type cast uses 'as unknown as { id: string }' in tests — consistent with vitest mock typing for nullable auth state"
metrics:
  duration: "~4 minutes"
  completed: 2026-06-22
  tasks_completed: 3
  files_changed: 5
---

# Phase 10 Plan 03: Client Push Registration Summary

Client-side push notification wiring: `push.ts` registers the device (permission + ExpoPushToken via the bundled EAS projectId), upserts/deletes the token in `device_push_tokens`, fires fire-and-forget after every Apple and Google sign-in, cleans up on sign-out, and adds the Scout `job-nearby` preference toggle to the notifications screen.

## What Was Built

### Task 1: RED vitest scaffold (push.test.ts)

`lmc-app/app/lib/push.test.ts` — 9 tests covering PUSH-12 and PUSH-13:

- **PUSH-12**: `registerPushToken()` returns null on simulator (`Device.isDevice === false`) without calling `getExpoPushTokenAsync`
- **PUSH-12**: returns null when permission is denied (both `getPermissionsAsync` denied and `requestPermissionsAsync` denied)
- **PUSH-12b**: returns the token string on a physical device with granted permission; calls `getExpoPushTokenAsync({ projectId: '59bc5e82-...' })`
- **PUSH-12**: skips `requestPermissionsAsync` when existing permission is already `granted`
- **PUSH-13**: `upsertPushToken()` calls `supabase.from('device_push_tokens').upsert` with correct payload shape `{ user_id, token, platform, updated_at }` and `{ onConflict: 'user_id,token' }`
- **PUSH-13**: returns early without calling upsert when no authenticated user
- `deletePushToken()`: calls supabase delete chain when user present; returns early when no user

Mocking conventions mirror `auth.test.ts`: objects declared before `vi.mock()` calls, `beforeEach` resets state.

Status: RED at commit, GREEN after Task 2.

### Task 2: push.ts implementation + EAS_PROJECT_ID in config.ts

**`lmc-app/app/lib/config.ts`** — `EAS_PROJECT_ID = '59bc5e82-de99-4541-b883-82e09005acfc'` added with explicit comment explaining why Constants.expoConfig is NOT used (null in Release builds — same crash class as SUPABASE_URL).

**`lmc-app/app/lib/push.ts`** (~90 lines):

- `registerPushToken(): Promise<string | null>` — `Device.isDevice` guard → Android channel setup → `getPermissionsAsync` / `requestPermissionsAsync` → `getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID })`. Returns null on simulator or denied permission. Imports `EAS_PROJECT_ID` from `./config`.
- `upsertPushToken(token, platform): Promise<void>` — `getUser()` early-return if no user; `(supabase as any).from('device_push_tokens').upsert({ user_id, token, platform, updated_at }, { onConflict: 'user_id,token' })`.
- `deletePushToken(token): Promise<void>` — `getUser()` early-return; `.delete().eq('user_id', uid).eq('token', token)`; wrapped in try/catch (best-effort cleanup).

All three functions are New-Arch-safe (standard push only, no silent/content-available).

9/9 vitest GREEN, tsc clean.

### Task 3: auth.ts wiring + notifications.tsx job-nearby toggle

**`lmc-app/app/lib/auth.ts`**:

At the end of both `signInWithApple` and `signInWithGoogle` (after `logEvent('auth.signed_in', ...)`):
```ts
registerPushToken()
  .then((token) => { if (token) void upsertPushToken(token, Platform.OS); })
  .catch(() => { /* push registration never blocks sign-in */ });
```

In `signOut()`, before `supabase.auth.signOut()` (session still alive so `getUser()` works):
```ts
try {
  const t = await registerPushToken();
  if (t) await deletePushToken(t);
} catch { /* best-effort token cleanup */ }
```

**`lmc-app/app/(seeker)/notifications.tsx`** — `job-nearby` toggle added after `scout-assigned` in the SETTINGS array:
```ts
{ id: 'job-nearby', label: 'Job Alerts', sub: 'New checks near you (Scout)', defaultValue: true },
```

This is the exact key `send-push` reads from `notification_prefs` (Open-Q1 resolved). Default on per D-04.

## Deviations from Plan

### Auto-fixed: type errors in push.test.ts

**Found during:** Task 3 (tsc clean check)
**Issue:** Three tsc errors in push.test.ts — `upsert.mock.calls[0][0]` typed as tuple length 0; `{ user: null }` not assignable to `{ id: string }` in two tests.
**Fix:** Cast `mock.calls` via `as unknown as Array<[Record<string, string>, unknown]>` for payload access; cast `null` via `as unknown as { id: string }` for the two null-user tests. These are test-file-only casts and do not affect production code.
**Files modified:** `lmc-app/app/lib/push.test.ts`
**Commit:** 0bbcc0c

### Note on projectId source (CRITICAL directive applied)

The PLAN's `<interfaces>` section suggested `Constants.expoConfig?.extra?.eas?.projectId` as the projectId source. The `<critical>` directive takes precedence: `EAS_PROJECT_ID` is exported from `config.ts` and imported into `push.ts` directly. This avoids the same Release-build crash class that previously hit `SUPABASE_URL` (Constants.expoConfig is null when the native ExponentConstants module isn't linked in a Release build).

## Known Stubs

None — all three exported functions are fully wired. Live push delivery on a physical device still requires:
1. An EAS dev build or TestFlight (Expo Go cannot get a real APNs token on SDK 54+)
2. The APNs Authentication Key configured in EAS credentials (human action during next `eas build -p ios` — documented in Plan 10-01 SUMMARY)

These are operational requirements, not code stubs.

## Threat Flags

No new security surface beyond the plan's threat model. T-10-10 through T-10-13 all mitigated:
- T-10-10 (IDOR): upsert payload sets `user_id` from `getUser()`; RLS `WITH CHECK (auth.uid()=user_id)` (Plan 10-01) rejects any mismatch
- T-10-12 (DoS): All registration/cleanup calls are fire-and-forget with .catch/try-swallow
- T-10-13 (simulator junk rows): `Device.isDevice` guard returns null on simulators; no upsert occurs

## Commits

| Task | Hash | Message |
|------|------|---------|
| Task 1 (RED vitest) | 95152eb | test(10-03): add RED vitest for registerPushToken / upsertPushToken / deletePushToken |
| Task 2 (push.ts + config) | 0c4f2d7 | feat(10-03): implement push.ts + EAS_PROJECT_ID in config |
| Task 3 (auth wiring + toggle) | 0bbcc0c | feat(10-03): wire push registration into auth.ts + add job-nearby toggle to notifications |

## Self-Check: PASSED

- `/Users/troyreed/studio/projects/let-me-check/lmc-app/app/lib/push.ts` — FOUND (registerPushToken/upsertPushToken/deletePushToken exported)
- `/Users/troyreed/studio/projects/let-me-check/lmc-app/app/lib/push.test.ts` — FOUND (9 tests, all GREEN)
- `/Users/troyreed/studio/projects/let-me-check/lmc-app/app/lib/config.ts` — FOUND (EAS_PROJECT_ID exported)
- `grep registerPushToken lmc-app/app/lib/auth.ts` — FOUND (both sign-in functions wired)
- `grep deletePushToken lmc-app/app/lib/auth.ts` — FOUND (signOut cleanup wired)
- `grep job-nearby lmc-app/app/(seeker)/notifications.tsx` — FOUND (Scout toggle, defaultValue true)
- Commits 95152eb, 0c4f2d7, 0bbcc0c — all present in git log
- `npm run typecheck` — exits 0, tsc clean
- `npx vitest run app/lib/push.test.ts` — 9/9 passed

Push registration wired correctly: sign-in is fire-and-forget (never blocked), sign-out has best-effort cleanup, simulator always returns null, job-nearby key matches what send-push reads.
