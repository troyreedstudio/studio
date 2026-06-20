---
phase: 03-video-pipeline
plan: 01
subsystem: video-pipeline
tags: [sql, state-machine, mux, pgtap, wave-0, edge-functions]
requires:
  - 0007_check_transitions.sql (transition_check + is_valid_check_transition)
  - 0008_clips_location.sql (clips table + status CHECK)
  - 0004_core_entities.sql (check_status enum: filming/uploaded/processing/delivered)
provides:
  - 0010_clips_mux.sql (Mux columns, widened status, new edges, system-actor allowance, delivered-needs-ready guard)
  - clips_mux.test.sql (pgTAP: ready-gate + system-actor edge rules)
  - four Wave-0 failing test scaffolds (clips lib + 3 Edge Functions)
affects:
  - supabase/migrations
  - supabase/tests
  - supabase/functions
  - lmc-app/app/lib
tech-stack:
  added: []
  patterns:
    - "create-or-replace over 0007 functions (additive, no drop)"
    - "::text enum comparison to avoid create-time label resolution"
    - "service-role system actor = auth.uid() IS NULL"
    - "webhook-owns-delivered; client never drives the delivered transition"
key-files:
  created:
    - supabase/migrations/0010_clips_mux.sql
    - supabase/tests/clips_mux.test.sql
    - supabase/functions/mux-upload-url/index.test.ts
    - supabase/functions/mux-playback-token/index.test.ts
  modified: []
decisions:
  - "delivered guard requires a clip with status='ready', not merely present (defence-in-depth T-03-03)"
  - "system (service role, auth.uid() null) drives uploaded/processing/delivered; humans barred from uploaded/processing"
  - "kept the existing filming->delivered edge so the deliver guard stays the real gate"
metrics:
  duration: "~1h (across an API-529 pause)"
  completed: "2026-06-21"
  tasks: 3
  files: 4
---

# Phase 3 Plan 01: SQL Spine + pgTAP + Wave-0 Test Scaffolds Summary

Additive migration 0010 fills the Phase-2 clips seam for real Mux assets and tightens the check state machine — webhook-owns-delivered, delivered-needs-a-`ready`-clip, a service-role system-actor allowance, and the `filming -> uploaded -> processing -> delivered` edges — plus the pgTAP that proves those guards and the four failing Wave-0 test scaffolds for the phase. Authored and verified OFFLINE; the live `db push` is deferred to the Wave-2 deploy checkpoint.

## What Was Built

### Task 1 — Migration `0010_clips_mux.sql` (commit `9efb230`)
- **Mux columns on clips** (all nullable, additive): `mux_upload_id`, `mux_asset_id`, `mux_playback_id`, `mux_playback_policy`, `duration_secs` + lookup indexes on asset/upload id.
- **Widened `clips.status` CHECK** to `('stub','pending','uploading','uploaded','processing','ready','errored','rejected')` — kept `stub` so Phase-2 test rows remain valid.
- **`is_valid_check_transition`** (create-or-replace, full 0007 body verbatim) with the new edges `filming -> uploaded`, `uploaded -> processing`, `processing -> delivered`; kept the existing `filming -> delivered` edge so the deliver guard remains the real gate. Still compares on `::text`.
- **`transition_check`** (create-or-replace, full 0007 body verbatim) with TWO changes: (a) actor-authz — the system (service role, `auth.uid() IS NULL`) may drive `uploaded`/`processing`/`delivered`; a human is barred from `uploaded`/`processing` (`only the system may drive %`) and still scout-gated on `filming`/`delivered`; (b) deliver guard now requires a clip with `status='ready'` (`cannot deliver without a ready clip`). The `for update` lock, the `log_event` positional shape, and the `security definer` / `set search_path = public` preamble are unchanged.
- No enum migration needed — `check_status` (0004) already carries `uploaded`/`processing`.

### Task 2 — pgTAP `clips_mux.test.sql` (commit `60521a0`)
`plan(6)`, mirrors the `check_transitions.test.sql` auth-faking harness exactly. Asserts: a present-but-`pending` clip is rejected at `delivered`; the system actor (`auth.uid()` null) walks `filming -> uploaded -> processing -> delivered`; a human scout cannot drive `uploaded` (`only the system may drive`). Runs live under `supabase test db` after 0010 is applied (gated to the Wave-2 deploy).

### Task 3 — Four Wave-0 test scaffolds (commits `4cb3229` + pre-existing)
- `lmc-app/app/lib/clips.test.ts` — Vitest scaffold naming `uploadWithRetry`, `requestUploadUrl`, `getPlaybackToken` + a no-client-`delivered` invariant.
- `supabase/functions/mux-webhook/index.test.ts` — Deno scaffold naming `verifyMuxSignature`; bad-sig rejected, valid-ready drives delivered, duplicate is a no-op.
- `supabase/functions/mux-upload-url/index.test.ts` — Deno scaffold asserting `playback_policy: ['signed']` + `passthrough: checkId`, assigned-scout only.
- `supabase/functions/mux-playback-token/index.test.ts` — Deno scaffold asserting a token mints only for the owning seeker; a non-owner is denied.

## Offline Checks (no Docker / no db push — Wave-2 deferred)
- 0010 grep ACs: Mux columns (≥4), `status = 'ready'` guard, new edges, `only the system may drive`, `create or replace ... transition_check`, widened status CHECK, no `drop table` — all PASS.
- 0010 structural sanity: 2 balanced `$$` pairs, 2 functions, balanced begin/end.
- pgTAP grep ACs: ready-guard text, system-only text, `plan(6)`/`finish()`, uploaded/processing references — all PASS; `plan(6)` matches 6 assertions.
- Four scaffolds present; symbol greps (`uploadWithRetry`, `verifyMuxSignature`, `playback_policy`+`passthrough`, owner/seeker) — all PASS.

## Deviations from Plan

### Concurrency note — a separate run executed downstream plans ahead of this one
**Found during:** Task 3, on resume after the API-529 pause.
**Issue:** The repo already contained committed work for plans **03-02** (`feat(03-02)` shared Mux/Supabase Edge helpers + mux-webhook handler+test) and **03-03** (`feat(03-03)` `lib/clips.ts` implementation + `b18876b` clips test). These were committed by another process, not this executor. They sit *after* this plan in scope but landed *before* this plan finished.
**Impact on this plan's deliverables:**
- The `clips.test.ts` scaffold and the `mux-webhook/index.test.ts` scaffold (with `verifyMuxSignature`) were already present/committed and satisfy this plan's Task-3 symbol ACs, so they were not re-created.
- The two genuinely-missing scaffolds (`mux-upload-url`, `mux-playback-token`) were authored and committed here (`4cb3229`).
- I did **not** revert or alter the other plans' committed files (out of scope; reverting committed downstream history would corrupt it).

### [Deviation — Wave-0 RED contract superseded]
**Found during:** Task 3.
**Issue:** The plan's final AC expects `npx vitest run app/lib/clips.test.ts` to exit non-zero (RED), because `./clips` should not exist yet at the moment 03-01 lands. In the current tree `clips.ts` is already committed (by the 03-03 run above), so the scaffold is GREEN (10/10 pass).
**Resolution:** Left as-is. The scaffold itself is correct and names every required symbol; its RED-ness was a point-in-time expectation that committed downstream work has legitimately satisfied. Forcing RED would require deleting another plan's committed implementation — out of scope and destructive. The three Deno scaffolds' handlers (`mux-upload-url`/`mux-playback-token` `index.ts`) do not exist, so those scaffolds remain honestly RED. (Deno is not installed locally, so the Deno suites were verified by import-seam + grep, not execution.)

## Known Stubs
None introduced by this plan. (0010's columns are nullable seams the webhook fills; the pgTAP/scaffolds are intentional Wave-0 test artifacts, not product stubs.)

## Ready for Wave-2 Live Deploy
Yes. `0010_clips_mux.sql` is additive over the live 0007/0008/0009 schema and matches the exact existing `transition_check` / `is_valid_check_transition` / `log_event` signatures and column names. The remaining live steps (NOT done here, no Docker): `supabase db push` (applies 0010), `supabase test db` (runs `clips_mux.test.sql`), and `supabase gen types typescript` to regen `database.types.ts` with the new Mux columns — all part of the Wave-2 [BLOCKING] deploy plan (03-04).

## Self-Check: PASSED
- Created files verified present: 0010_clips_mux.sql, clips_mux.test.sql, mux-upload-url/index.test.ts, mux-playback-token/index.test.ts, 03-01-SUMMARY.md.
- Commits verified in history: 9efb230 (migration), 60521a0 (pgTAP), 4cb3229 (Deno scaffolds).
