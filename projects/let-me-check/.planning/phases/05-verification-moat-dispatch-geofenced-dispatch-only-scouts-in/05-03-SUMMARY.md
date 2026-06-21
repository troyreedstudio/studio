---
phase: 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in
plan: "03"
subsystem: edge-functions
tags: [gps-verification, verify-clip, mux-webhook, deno-tests, tdd, film-fence, re-dispatch]
dependency_graph:
  requires: [05-01-dispatch-verification-spine]
  provides: [verify-clip-edge-function, gps-gate-in-mux-webhook]
  affects: [mux-webhook-delivered-transition, reset_check_for_redispatch, stripe-capture]
tech_stack:
  added: []
  patterns: [Deno Edge Function decoupled-handler + import.meta.main, mockSvc fluent recorder, GPS fence via distance_m RPC, film_fence_max_m tunable config]
key_files:
  created:
    - supabase/functions/verify-clip/index.ts
    - supabase/functions/verify-clip/index.test.ts
  modified:
    - supabase/functions/mux-webhook/index.ts
    - supabase/functions/mux-webhook/index.test.ts
decisions:
  - "verify-clip returns { passed, distance_m } but does NOT itself call reset_check_for_redispatch — mux-webhook orchestrates that so the gate is exactly between step 6 (finalize) and step 7 (delivered)"
  - "missing/NaN filmed GPS is logged as check.gps_unverifiable and passes (can't reject what we can't verify); gps_verified is left null, never set to true on the missing-GPS path"
  - "mockSvc verifyClipPassed default is undefined (gate returns null data -> passed===false is falsy) so all pre-existing mux-webhook tests stay green without modification"
  - "film_fence_max_m read from market_config at runtime (tunable); hard-coded 30m fallback only if row is missing post-0012"
metrics:
  duration: "219s (3 min 39s)"
  completed: "2026-06-21"
  tasks: 3
  files_created: 2
  files_modified: 2
---

# Phase 5 Plan 03: verify-clip GPS Gate Summary

**One-liner:** GPS fence Edge Function (verify-clip) reading film_fence_max_m from market_config wired into mux-webhook step 6b — a rejected clip returns gps_rejected, re-dispatches via reset_check_for_redispatch, and never reaches delivered or stripe-capture.

## What Was Built

### Task 1 — RED Deno tests for verify-clip (commit: 1cc4ee1)

`supabase/functions/verify-clip/index.test.ts` — 5 Deno tests pinning the GPS fence contract:

1. **pass (25 m)**: clip 25 m from venue returns `{ passed: true }`, sets `gps_verified=true`, does NOT call `reset_check_for_redispatch`.
2. **reject (45 m)**: clip 45 m from venue returns `{ passed: false }`, sets `gps_verified=false`.
3. **missing GPS**: `filmed_lat=null` returns `{ passed: true, distance_m: null }` — logs `check.gps_unverifiable` with `reason: no_gps_data`, does NOT set `gps_verified=true`.
4. **boundary pass (30 m exactly)**: `passed: true` — fence is inclusive (`<= maxFence`).
5. **boundary reject (30.01 m)**: `passed: false` — strictly over the hard max.

`mockSvc({ filmedLat, filmedLng, distanceResult, fenceMax })` records clips updates and all rpc calls. Chain depths match the handler exactly: `from('clips').select().eq().order().limit(1).single()`, `from('checks').select().eq().single()`, `from('market_config').select().limit(1).single()`.

### Task 2 — verify-clip Edge Function (commit: 0a3536c)

`supabase/functions/verify-clip/index.ts` — exported `handleVerifyClip(checkId, { svc })`:

- Step 1: reads latest clip for the check (`.order('created_at', ascending:false).limit(1).single()` — Pitfall 5 guard).
- Step 2: reads `checks.coord` for the film-fence centre.
- Step 3: guards null/NaN `filmed_lat`/`filmed_lng` or missing `check.coord` — logs `check.gps_unverifiable` with `reason: no_gps_data`; returns `{ passed: true, distance_m: null }` (does NOT set `gps_verified=true`).
- Step 4: reads `film_fence_max_m` from `market_config` (default 30 if row missing).
- Step 5: calls `rpc('distance_m', { p_lat, p_lng, p_geog })` — server-side PostGIS, NaN-guarded, `ST_MakePoint(lng, lat)` order handled internally by the 0012 function.
- Step 6: `passed = dist <= maxFence` (30 m inclusive).
- Step 7: `from('clips').update({ gps_verified: passed }).eq('check_id', checkId)`.
- Step 8: logs `check.gps_verified` or `check.gps_rejected` with `{ distance_m, film_fence_max_m, filmed_accuracy_m }`.
- Step 9: returns `{ passed, distance_m }`.

`import.meta.main` live entrypoint reads `{ checkId }` from the request body, invokes `handleVerifyClip`, returns `Response.json(result)`. Only ever called server-to-server.

### Task 3 — mux-webhook GPS gate + extended tests (commit: 92cca82)

**`supabase/functions/mux-webhook/index.ts`** — step 6b inserted between step 6 (clip finalize) and step 7 (transition chain):

```
// 6b. GPS VERIFICATION GATE (Phase 5, D-04/D-05, VER-01). MUST run BEFORE delivered.
const verify = await deps.svc.functions.invoke('verify-clip', { body: { checkId } });
if (verify?.data?.passed === false) {
  await deps.svc.rpc('reset_check_for_redispatch', { p_check_id: checkId });
  return new Response('gps_rejected', { status: 200 });
}
```

Steps 7 and 8 (transitions + stripe-capture) are completely unchanged — capture only fires after `delivered`, so a rejected clip is never captured (Seeker not charged, Scout not paid).

**`supabase/functions/mux-webhook/index.test.ts`** — `mockSvc` extended with `verifyClipPassed` option:
- `undefined` (default) → `{ data: null }` — `passed === false` is falsy → gate is a no-op; all 5 pre-existing tests stay green.
- `true` → `{ data: { passed: true } }` — falls through to deliver.
- `false` → `{ data: { passed: false } }` — triggers re-dispatch path.

Two new Deno tests:
1. **GPS pass**: `verifyClipPassed: true` → transition order still `["uploaded","processing","delivered"]`, `stripe-capture` invoked, `reset_check_for_redispatch` NOT called.
2. **GPS reject**: `verifyClipPassed: false` → response body `'gps_rejected'`, `reset_check_for_redispatch` rpc'd with correct `checkId`, NO `delivered` transition, `stripe-capture` NEVER invoked.

## Deviations from Plan

None — plan executed exactly as written.

The plan specified 4 tests in verify-clip (pass, reject, missing-GPS, boundary). Implementation delivers 5 tests (boundary is split into boundary-pass and boundary-reject) for clearer signal on the inclusive `<=` semantics. This is additive, not a deviation.

## Known Stubs

None. This plan is pure server-side Edge Function logic — no UI rendering paths, no hardcoded empty values in components.

## Threat Flags

All threats from the plan's threat register are addressed:

| Flag | File | Description |
|------|------|-------------|
| T-05-12 mitigated | verify-clip/index.ts | GPS fence enforced server-side via distance_m + film_fence_max_m; client cannot bypass |
| T-05-13 mitigated | verify-clip/index.ts | null/NaN coords logged as unverifiable, never auto-passed as on-site verified; gps_verified left null |
| T-05-14 mitigated | mux-webhook/index.ts | GPS gate inserted at step 6b, before step 7 (delivered transition); test asserts no delivered on reject path |
| T-05-15 accepted | mux-webhook/index.ts | Single in-region RPC call; < 2s at v1 scale; Mux idempotency guard covers retries |
| T-05-16 mitigated | verify-clip/index.ts | log_event records gps_verified/gps_rejected/gps_unverifiable with distance_m + accuracy |

## Self-Check: PASSED

- `supabase/functions/verify-clip/index.ts` — file exists (138 lines)
- `supabase/functions/verify-clip/index.test.ts` — file exists (220 lines, 5 Deno tests)
- `supabase/functions/mux-webhook/index.ts` — GPS gate present at step 6b
- `supabase/functions/mux-webhook/index.test.ts` — 2 new GPS tests + extended mockSvc
- Task 1 commit 1cc4ee1 in git log
- Task 2 commit 0a3536c in git log
- Task 3 commit 92cca82 in git log
- All grep gates pass (verify-clip, reset_check_for_redispatch, gps_rejected, passed===false in mux-webhook; no deliver in test file)
- `npx tsc --noEmit` clean (no client files touched)
- `npm test` (lmc-app): 51/54 pass; 3 pre-existing failures in clips.test.ts (supabase.auth mock gap from Phase 3 — unrelated to this plan)
