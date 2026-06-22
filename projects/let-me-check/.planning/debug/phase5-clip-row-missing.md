---
status: resolved
trigger: "Phase-5 regression: check stuck in processing, clips table empty, gps_unverifiable event logged"
created: 2026-06-21T00:00:00Z
updated: 2026-06-21T00:00:00Z
---

## Current Focus

hypothesis: mux-upload-url does UPDATE on clips table but NO clip row exists yet — Phase 3/4 expected the Scout to INSERT a stub clip client-side before calling mux-upload-url, but Phase 5 retired that path without adding an INSERT to the edge function. The UPDATE silently no-ops (0 rows matched), so clips table stays empty. The Mux webhook fires, finds no clip row via .single() which errors, verify-clip logs gps_unverifiable and passes, but then mux-webhook tries to .update() the non-existent clip row, drives the check to uploaded/processing/delivered — BUT transition_check's "deliver-needs-READY-clip" guard sees no ready clip row and may throw, or the UPDATE simply no-ops and the check status transitions succeed but the clip is never written. Result: check stuck in processing with 0 clips.

test: confirmed by reading all code paths — NO INSERT of a clips row exists anywhere in the Edge Function chain for Phase 5
expecting: fix by adding an UPSERT (INSERT ... ON CONFLICT DO UPDATE) in mux-upload-url before the mux-webhook can fire
next_action: fix mux-upload-url to INSERT the clip row (upsert) with mux_upload_id + GPS + status=pending, then deploy

## Symptoms

expected: Scout submits clip → clip row created → Mux webhook fires → verify-clip runs with real GPS → check reaches delivered
actual: check stuck in processing, clips table has 0 rows, event_log shows gps_unverifiable then signage_skipped, check never delivers
errors: "gps_unverifiable" (no clip row found by verify-clip), check stuck in `processing`
reproduction: real on-device Scout flow: accept check → film → submit
started: Phase 5 regression (worked in Phase 3/4)

## Eliminated

- hypothesis: filmed GPS not being sent from client (filming.tsx)
  evidence: filming.tsx lines 147-162 stampGps(), capturedGps.current set; clips.ts requestUploadUrl forwards gps arg correctly
  timestamp: 2026-06-21

- hypothesis: mux-webhook failing to call verify-clip
  evidence: event_log shows gps_unverifiable which is only logged by verify-clip — so verify-clip IS being called
  timestamp: 2026-06-21

- hypothesis: verify-clip GPS coordinates missing/NaN
  evidence: verify-clip step 1 uses .single() on clips table — if no clip row, clipErr fires and logs "clip row not found" then returns passed:true. That matches the observed event. The GPS isn't the issue — the clip row itself is missing.
  timestamp: 2026-06-21

## Evidence

- timestamp: 2026-06-21
  checked: mux-upload-url/index.ts line 79-81
  found: does `.from("clips").update({mux_upload_id, status:"pending", ...gpsUpdate}).eq("check_id", checkId)` — UPDATE only, no INSERT
  implication: if no clip row exists, this UPDATE matches 0 rows and silently no-ops; Supabase JS client does not error on 0 rows updated

- timestamp: 2026-06-21
  checked: all Edge Functions for INSERT into clips
  found: stripe-refund is the only function with an INSERT — no Edge Function inserts a clips row
  implication: clip row must come from somewhere else; in Phase 2/3 the Scout client inserted a stub clip directly

- timestamp: 2026-06-21
  checked: 0009_scout_rls_realtime.sql lines 41-51
  found: clips_insert_assigned_scout RLS policy allows Scout to INSERT a clips row while check.status = 'filming'
  implication: Phase 2/3 had the Scout client inserting a stub clip before submitting; that code was removed when the upload was wired

- timestamp: 2026-06-21
  checked: checks.ts — searched for any clips INSERT
  found: getCheckClip() reads clips but no INSERT; the old deliver() wrapper that inserted stubs was retired per CHECK-05/VID-03 comment
  implication: the stub clip INSERT was removed from checks.ts when the real pipeline was built, but mux-upload-url was never updated to INSERT instead of UPDATE

- timestamp: 2026-06-21
  checked: mux-webhook lines 88-94 (idempotent check) and lines 97-103 (finalize update)
  found: mux-webhook reads existing.status via .maybeSingle() (not .single()), so no error if no row. Then does .update() on clips which also no-ops if row absent. Then verify-clip uses .single() — this DOES error on no rows → clipErr fires → logs gps_unverifiable → returns {passed:true}. Back in mux-webhook, verify.data.passed is NOT false, so it falls through to transition_check chain. transition_check('delivered') hits the "deliver-needs-READY-clip" guard — no ready clip → raises exception. The exception propagates back through functions.invoke in mux-webhook at line 109... BUT verify-clip itself handles the no-clip case and returns {passed:true} which mux-webhook treats as pass-through. Then the transition chain runs: uploaded → processing → delivered. The delivered guard fires: no ready clip → exception thrown → mux-webhook's transition calls throw → but catch is only around stripe-capture (step 8), not the transition calls (step 7). The unhandled exception causes the function to return 500, Mux retries, but state is stuck at processing (transitions to uploaded/processing may have landed before delivered threw).
  implication: the chain partially executes: uploaded + processing transitions succeed (no clip guard on those), but delivered fails (clip guard). Check gets stuck in processing.

- timestamp: 2026-06-21
  checked: transition_check in 0012 — deliver guard at line 415-421
  found: `if p_to = 'delivered' and not exists (select 1 from clips where check_id = p_check_id and status = 'ready')` → raises exception
  implication: confirms delivered is blocked when clips table is empty. The uploaded+processing transitions run first (no guard), then delivered throws, leaving check stuck in processing.

## Resolution

root_cause: mux-upload-url does an UPDATE on the clips row to persist mux_upload_id + GPS, but NO clip row is ever created first. In Phase 2/3 the Scout client inserted a stub clips row before calling the upload-url function; that stub insertion was removed when the real upload pipeline replaced it, but mux-upload-url was not updated to INSERT the row itself. The UPDATE silently no-ops (0 matched rows), leaving clips empty. The Mux webhook then fires, partial transitions run (uploaded/processing), but the delivered transition is blocked by the "deliver-needs-READY-clip" guard. Check is permanently stuck in processing.

fix: change mux-upload-url to UPSERT the clips row (INSERT with ON CONFLICT(check_id) DO UPDATE) so the row is created atomically with the GPS stamp and mux_upload_id. The service role already has permission to write clips.

verification: []
files_changed: [supabase/functions/mux-upload-url/index.ts]
