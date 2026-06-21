---
phase: 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in
plan: "05"
subsystem: client-wiring
tags: [expo-location, scout-location, dispatch-rpc, geo-filter, filmed-gps, mux-upload-url, safe-01, no-film-zone, vitest, tdd]
dependency_graph:
  requires: [05-02-dispatch-rpc, 05-03-verify-clip]
  provides: [upsertScoutLocation, setScoutOffline, listOpenChecksForScout, checks.coord, filmed_gps_in_clips]
  affects: [dashboard.tsx, filming.tsx, mux-upload-url, verify-clip-data-path]
tech_stack:
  added: [expo-location watchPositionAsync foreground watch]
  patterns: [WKT POINT(lng lat) upsert, as-any cast for pre-regen types, foreground-only location with cleanup on offline/unmount]
key_files:
  created:
    - lmc-app/app/lib/scout-location.ts
    - lmc-app/app/lib/scout-location.test.ts
    - lmc-app/app/lib/dispatch.ts
    - lmc-app/app/lib/dispatch.test.ts
  modified:
    - lmc-app/app/lib/checks.ts
    - lmc-app/app/lib/clips.ts
    - lmc-app/app/(scout)/dashboard.tsx
    - lmc-app/app/(scout)/filming.tsx
    - supabase/functions/mux-upload-url/index.ts
decisions:
  - "as-any casts on scout_locations.from() and list_open_checks_for_scout.rpc() — Phase 5 tables/RPCs not yet in database.types.ts; regen is Wave-4 live step after supabase db push + gen types"
  - "setScoutOffline upserts is_online=false WITHOUT coord — preserves last known coord in DB; next watchPositionAsync tick refreshes it on re-login"
  - "SAFE-01 guard is client-side (is_in_no_film_zone RPC call in createCheck); authoritative enforcement is server-side PostGIS polygon helper; follow-up can move fully server-side into a createCheck RPC"
  - "WKT fallback documented: if live push rejects POINT(lng lat) on geography column, replace upsert with upsert_scout_location(p_lat, p_lng) RPC that casts internally (one migration, no client type changes)"
  - "ClipUploadGps extended to include accuracyM so filming.tsx Accuracy.Highest reading reaches verify-clip via mux-upload-url"
  - "dashboard refresh() shows [] when no GPS fix yet — watchPositionAsync fires refresh on first fix; no unfiltered listOpenChecks remains"
metrics:
  duration: "7 min"
  completed: "2026-06-21"
  tasks: 3
  files_created: 4
  files_modified: 5
---

# Phase 5 Plan 05: Client Wiring — Scout Location, Geo-Filtered Dispatch, Filmed GPS Summary

**One-liner:** Scout foreground location watch (expo-location) feeding scout_locations upserts + geo-filtered dashboard list via list_open_checks_for_scout; checks.coord populated at createCheck; filmed GPS (lat/lng/accuracy) flowing through mux-upload-url into clips row so verify-clip has real data; SAFE-01 no-film-zone block on createCheck.

## What Was Built

### Task 1 — scout-location.ts + dispatch.ts + vitest call-shape tests (commit: 62dcc92)

**`lmc-app/app/lib/scout-location.ts`** — two exported helpers:

- `upsertScoutLocation(lat, lng, accuracyM?)`: upserts to `scout_locations` with WKT `POINT(${lng} ${lat})` (longitude first, Pitfall 1), `is_online: true`, `onConflict: 'scout_id'`. Optional `accuracyM` field passed for verify-clip analysis. Comment documents WKT fallback-to-RPC if live push rejects the geography string (A1).
- `setScoutOffline()`: upserts `is_online: false` for the current user WITHOUT a `coord` field — preserves last known location in DB (next online tick refreshes it).
- Both use a `db = supabase as any` alias because `scout_locations` is from migration 0012 and not yet in `database.types.ts`.

**`lmc-app/app/lib/dispatch.ts`** — one exported function:

- `listOpenChecksForScout(lat, lng)`: calls `supabase.rpc('list_open_checks_for_scout', { p_scout_lat: lat, p_scout_lng: lng })`. Returns `data ?? []`. Throws on error. Parameter names match the SECURITY DEFINER RPC signature exactly. Uses `(supabase as any).rpc(...)` cast for same types reason.

**Test suites — 14 tests, all GREEN:**

- `scout-location.test.ts` (9 tests): WKT longitude-first order asserted by regex parsing POINT(x y); `onConflict: 'scout_id'` option; `accuracyM` key when provided; error propagation; auth failure path.
- `dispatch.test.ts` (5 tests): RPC name `list_open_checks_for_scout`; exact param names `p_scout_lat`/`p_scout_lng`; null data returns `[]`; error propagation.

### Task 2 — createCheck coord + SAFE-01 + filmed GPS seam (commit: 2db1828)

**`lmc-app/app/lib/checks.ts` createCheck:**

- **SAFE-01**: before the insert, when `lat` + `lng` are present, calls `(supabase as any).rpc('is_in_no_film_zone', { p_lat, p_lng })`. If `blocked === true`, throws `'This location is a no-film zone and cannot be checked.'` (hospitals/schools/courts/police/residences). Client-side guard; server-side PostGIS polygon helper is the authoritative gate.
- **coord**: inserts `coord: POINT(${lng} ${lat})` (lng first) alongside `requested_lat`/`requested_lng` when coordinates are present. Powers `list_open_checks_for_scout` (DISP-01) and `verify-clip` (VER-01) with a PostGIS spatial index. Insert payload cast to `any` (coord column not yet in generated types).

**`lmc-app/app/lib/clips.ts`:**

- `ClipUploadGps` type extended: `{ lat, lng, accuracyM?: number } | null`.
- `requestUploadUrl(checkId, gps?)`: extended signature; sends `{ checkId, filmed_lat, filmed_lng, filmed_accuracy_m }` in the Edge Function body (previously only `{ checkId }`).
- `useClipUpload.submit`: was ignoring `_gps`; now forwards `{ lat, lng, accuracyM }` to `requestUploadUrl`.

**`supabase/functions/mux-upload-url/index.ts`:**

- `handleUploadUrl` input extended with `filmed_lat`, `filmed_lng`, `filmed_accuracy_m`.
- Server-side finite-number validation (T-05-24): `isFiniteNum` guard; only finite values are written to the `gpsUpdate` object (NaN/Infinity/null silently dropped).
- Single DB update merges `mux_upload_id + status='pending' + {filmed_lat, filmed_lng, filmed_accuracy_m}` in one round-trip.
- `Deno.serve` entrypoint reads the three GPS fields from the JSON body alongside `checkId`.

### Task 3 — dashboard foreground watch + geo-filtered list; filming GPS accuracy (commit: 551db76)

**`lmc-app/app/(scout)/dashboard.tsx`:**

- New imports: `* as Location from 'expo-location'`, `upsertScoutLocation`, `setScoutOffline`, `listOpenChecksForScout`. Removed `listOpenChecks` import.
- New state: `locationDenied` boolean for permission-denied UI.
- New refs: `lastCoord` (holds latest `{ lat, lng }` from watch), `locationSub` (holds the subscription for cleanup).
- `refresh()` rewritten: uses `listOpenChecksForScout(lastCoord.current.lat, lng)` when coord known; returns `[]` when no fix yet. The unfiltered `listOpenChecks` is no longer called.
- `useEffect([online])`: when going online — requests foreground permission (shows `locationDenied` amber UI if denied); starts `watchPositionAsync({ accuracy: Accuracy.High, timeInterval: 30000, distanceInterval: 20 })`; each tick upserts location + calls `refresh()`. When going offline — removes subscription, clears list, calls `setScoutOffline()`. Cleanup on unmount calls `setScoutOffline()` if was online.
- Permission-denied empty state: amber location icon + "Allow location access in Settings" copy.

**`lmc-app/app/(scout)/filming.tsx`:**

- `capturedGps` ref type: `{ lat, lng, accuracyM?: number } | null`.
- `stampGps`: now uses `Location.Accuracy.Highest` (Pitfall 3 — maximize fix quality for 30 m film-fence) and captures `accuracyM: pos.coords.accuracy ?? undefined`. Comment explains why Highest matters for the 30 m fence.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Curly-quote characters in JSX string literals**
- **Found during:** Task 3 tsc run
- **Issue:** The `locationDenied` strings inserted into `dashboard.tsx` contained Unicode curly apostrophes (‘/’) that tsc rejects as invalid characters in JSX.
- **Fix:** Replaced all affected string literals with straight double-quote strings.
- **Files modified:** `lmc-app/app/(scout)/dashboard.tsx`
- **Commit:** 551db76

**2. [Rule 2 - Missing critical functionality] as-any casts for Phase-5 tables/RPCs not in generated types**
- **Found during:** Task 1 + Task 2 tsc runs
- **Issue:** `scout_locations` table and `list_open_checks_for_scout`/`is_in_no_film_zone` RPCs exist in migrations 0012/0012b but `database.types.ts` was generated before those migrations ran live. tsc errors on the unknown table/function names.
- **Fix:** `db = supabase as any` alias in `scout-location.ts`; `(supabase as any).rpc(...)` in `dispatch.ts` and `checks.ts`; `insert({...} as any)` in `checks.ts` for the `coord` column. All casts carry an eslint-disable comment + explanation that types regen is Wave-4.
- **Files modified:** `lmc-app/app/lib/scout-location.ts`, `lmc-app/app/lib/dispatch.ts`, `lmc-app/app/lib/checks.ts`
- **Commits:** 62dcc92, 2db1828

## Known Stubs

None. All data paths are wired end-to-end:
- Scout location upsert → scout_locations → list_open_checks_for_scout RPC → dashboard list
- checks.coord WKT → dispatch RPC + verify-clip fence centre
- filmed GPS (lat/lng/accuracyM) → mux-upload-url → clips.filmed_lat/lng/accuracy_m → verify-clip

The only pending items are Wave-4 live steps (db push + type regen + on-device walk-through), not stubs.

## Follow-up Notes (for SUMMARY / deferred-items)

1. **WKT on geography upsert (A1):** If `supabase db push` rejects `POINT(lng lat)` string inserts into a `geography(point,4326)` column via the JS client, the fix is a single `upsert_scout_location(p_lat, p_lng)` SECURITY DEFINER RPC that casts internally. No client type changes needed — just swap the call in `scout-location.ts`.
2. **createCheck SAFE-01 server-side move:** The no-film-zone check is currently client-side (RPC call in createCheck). A follow-up can add a `create_check` server-side RPC that enforces SAFE-01 at the DB layer for defense in depth.
3. **database.types.ts regen:** After `supabase db push` in Wave 4, run `supabase gen types typescript --linked > lmc-app/app/lib/database.types.ts` to remove all `as any` casts and get full type safety on Phase-5 tables + RPCs.

## Threat Flags

All threats from the plan's threat model are addressed:

| Flag | File | Description |
|------|------|-------------|
| T-05-22 addressed | dashboard.tsx | Scout seeing far jobs is harmless; accept_check re-checks geo server-side (Plan 02) |
| T-05-23 addressed | scout-location.ts | Client writes only own row (RLS); cross-row dispatch is SECURITY DEFINER RPC |
| T-05-24 addressed | mux-upload-url/index.ts | isFiniteNum guard; non-finite filmed GPS silently dropped, not written |
| T-05-25 accepted | dashboard.tsx | Foreground-only watch; setScoutOffline + sub.remove() on toggle/unmount; documented |

## Self-Check: PASSED

- `lmc-app/app/lib/scout-location.ts` exists
- `lmc-app/app/lib/scout-location.test.ts` exists (9 tests, all green)
- `lmc-app/app/lib/dispatch.ts` exists
- `lmc-app/app/lib/dispatch.test.ts` exists (5 tests, all green)
- Task 1 commit 62dcc92 in git log
- Task 2 commit 2db1828 in git log
- Task 3 commit 551db76 in git log
- All plan grep gates pass: watchPositionAsync + listOpenChecksForScout + setScoutOffline in dashboard; Accuracy.Highest in filming; filmed_lat in clips.ts + mux-upload-url; coord in checks.ts
- `npx tsc --noEmit` clean (0 errors)
- `npx vitest run` scout-location + dispatch: 14/14 pass
- No new untracked generated files
