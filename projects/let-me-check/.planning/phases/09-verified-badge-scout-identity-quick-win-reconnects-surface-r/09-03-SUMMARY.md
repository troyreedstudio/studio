---
phase: 09-verified-badge-scout-identity-quick-win-reconnects-surface-r
plan: "03"
subsystem: client
tags: [profile, notifications, preferred-cities, persistence, stats]
dependency_graph:
  requires:
    - 09-01 (migration 0017 adds notification_prefs + preferred_cities columns to profiles)
    - 0005_rls_policies (profiles_update_own row-level covers new columns; ratings_select_own lets Seeker read own ratings)
  provides:
    - notifications.tsx: persisted notification_prefs (load on mount + save on toggle)
    - preferred-cities.tsx: persisted preferred_cities Set (load on mount + save on toggle)
    - profile.tsx: real display name, member-since, check count, spent, avg rating
  affects:
    - Plan 09-04 (live push + type regen — as-any casts can be retired after regen)
tech_stack:
  added: []
  patterns:
    - optimistic local state + background persist (write failures silent, no rollback needed)
    - as-any cast for columns not yet in database.types.ts (same pattern as checks.ts createCheck)
    - Promise.all for parallel profile + checks fetch; separate ratings query gated on uid
key_files:
  created: []
  modified:
    - lmc-app/app/(seeker)/notifications.tsx
    - lmc-app/app/(seeker)/preferred-cities.tsx
    - lmc-app/app/(seeker)/profile.tsx
decisions:
  - "notification_prefs merged over client defaults on load — new setting IDs in future releases fall back to their defaultValue without requiring a DB migration"
  - "preferred_cities initial state is an empty Set (not hardcoded mia/nyc) — real value loads on mount; honest empty state if profile has no saved cities"
  - "avg rating computed client-side from own ratings rows (ratings_select_own RLS) — no RPC, no second round-trip beyond what listMyChecks already costs"
  - "em-dash (—) rendered when avgRating is null (no ratings yet) — never a fabricated number"
  - "count + spent exclude cancelled and no_scout statuses — only delivered/active checks count as real spend"
  - "as-any cast on supabase.from('profiles').update({ notification_prefs/preferred_cities }) — columns not in database.types.ts until Plan 04 regen; harmless to leave after regen"
metrics:
  duration: "4m"
  completed_date: "2026-06-22"
  tasks_completed: 3
  files_created: 0
  files_modified: 3
---

# Phase 9 Plan 03: Notification Prefs + Preferred Cities Persistence + Real Profile Stats Summary

Wired three previously mock-only Seeker screens to the real Supabase backend: notification toggles now load from and persist to `profiles.notification_prefs` (jsonb), preferred-city selections load from and persist to `profiles.preferred_cities` (text[]), and the profile header/stats show the real display name, member-since date, check count, total spent, and avg rating — all with honest empty states and no fabricated numbers.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Persist notification prefs | 6e08133 | lmc-app/app/(seeker)/notifications.tsx |
| 2 | Persist preferred cities | 9b71bbb | lmc-app/app/(seeker)/preferred-cities.tsx |
| 3 | Real profile header + stats | c84669c | lmc-app/app/(seeker)/profile.tsx |

## What Was Built

### notifications.tsx
- Added `useEffect` ([] deps) that calls `getProfile()` on mount; merges `profile.notification_prefs` (jsonb) over the client-default map so new setting IDs always have a fallback.
- Replaced inline `onValueChange` with `handleToggle(id, v)`: optimistically updates local `values` state, then fires an async IIFE to persist the full map via `(supabase as any).from('profiles').update({ notification_prefs: next }).eq('id', uid)`. Write failures are silent — the local toggle reflects the user's intent regardless.

### preferred-cities.tsx
- Initial `selected` state changed from `new Set(['mia', 'nyc'])` to `new Set<string>()` — the real value loads on mount.
- Added `useEffect` that calls `getProfile()` and seeds `selected` from `profile.preferred_cities` (text[] cast to `string[] | null`). Honest empty set if the profile has no saved cities.
- `toggle()` now fires an async IIFE inside the `setSelected` updater that persists `Array.from(next)` to `profiles.preferred_cities`. Write failures are silent.

### profile.tsx
- Added `useState` for `displayName`, `memberSince`, and `stats` (`{ count, spent, avgRating }`). All initialise to null / zero — no fake data renders until the fetch resolves.
- `useEffect` ([] deps) runs a single async block: `Promise.all([getProfile(), listMyChecks()])` in parallel, then a separate `supabase.from('ratings').select('stars').eq('seeker_id', uid)` for the avg rating (gated on uid; uses `ratings_select_own` RLS).
- `toInitials()` helper derives initials from `display_name` (two words → first letters; single word → first two chars; null → "S").
- Avatar shows derived initials; username shows `displayName ?? 'Seeker'`; member-since shows `Member since ${memberSince}` or a non-visible space when null.
- Stats row: count from delivered/active checks only (excludes `cancelled` + `no_scout`); spent = sum of tier price ($15 standard / $20 priority); avg rating = client-side average of `ratings.stars`, rounded to 1 dp, or `—` when no ratings exist.
- Hardcoded strings removed: "TR", "Troy R.", "Member since January 2026", "14", "$245", "4.8★".

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `scouts` count per city in `preferred-cities.tsx` remains hardcoded (142, 318, etc.) — real supply counts deferred per CONTEXT decision. This is intentional and does not prevent the plan goal (city persistence) from being achieved.

## Threat Flags

None. The two write paths both use `.eq('id', uid)` where `uid = auth.getUser()`; `profiles_update_own` RLS (0005) enforces row-scope server-side regardless. The ratings read uses `.eq('seeker_id', uid)` with `ratings_select_own` RLS. No new network endpoints or auth paths introduced.

## Self-Check: PASSED

- `lmc-app/app/(seeker)/notifications.tsx` — confirmed modified, contains `notification_prefs`, `getProfile`, `from('profiles').update`, `useEffect`
- `lmc-app/app/(seeker)/preferred-cities.tsx` — confirmed modified, contains `preferred_cities`, `getProfile`, `Array.from`, no hardcoded `new Set<string>(['mia'`
- `lmc-app/app/(seeker)/profile.tsx` — confirmed modified, contains `getProfile`, `listMyChecks`, `from('ratings')`, no "Troy R.", no "Member since January 2026", contains `useEffect`
- Commits `6e08133` (Task 1), `9b71bbb` (Task 2), `c84669c` (Task 3) all in `git log`
- `npx tsc --noEmit` returned clean (no output)
