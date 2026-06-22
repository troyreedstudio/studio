---
phase: 10-push-notifications
plan: "02"
subsystem: push-notifications
tags: [push, expo-notifications, edge-function, deno, idor, geofence, notification-prefs]
dependency_graph:
  requires:
    - 0018_device_push_tokens.sql (device_push_tokens table + RLS)
    - 0017_phase9_surface_reconnects.sql (profiles.notification_prefs column)
    - 0012_dispatch_verification_spine.sql (scout_locations is_online + coord + ST_DWithin)
    - supabase/functions/_shared/supabase.ts (serviceClient factory)
  provides:
    - supabase/functions/send-push/index.ts (handleSendPush + import.meta.main entrypoint)
    - supabase/functions/send-push/index.test.ts (Deno test suite PUSH-04..PUSH-09, 7 tests green)
  affects:
    - mux-webhook (Plan 10-03 will add fire-and-forget invoke for video-ready)
    - pg trigger notify_push_on_dispatching (0018) calls this function for job-nearby
tech_stack:
  added: []
  patterns:
    - handleSendPush never-throws pattern (mirrors fraud-eval catch-all)
    - import.meta.main guard for deno test --allow-env import
    - IDOR-safe server-side recipient resolution from checkId only
    - scouts_in_range_of_check RPC for online-scout audience (check-centric, not list_open_checks_for_scout)
    - notification_prefs null=push-all degrade (D-04)
    - Expo batch <=100 per POST, inline DeviceNotRegistered cleanup
key_files:
  created:
    - supabase/functions/send-push/index.ts
    - supabase/functions/send-push/index.test.ts
  modified: []
decisions:
  - "job-nearby audience uses scouts_in_range_of_check RPC (check-centric: which scouts are near THIS check?) — NOT list_open_checks_for_scout which is scout-centric (wrong direction per CHECKER WARNING 3)"
  - "scouts_in_range_of_check RPC expected to exist or be created before Wave 4 deploy — fn queries scout_locations WHERE is_online=true AND ST_DWithin(coord, check.coord, dispatch_radius_m)"
  - "notification_prefs null OR missing key = include (D-04 push-all default); only explicit false = skip"
  - "send-push deploys with --no-verify-jwt (Wave 4 / 10-05): called server-to-server by pg trigger + mux-webhook, no end-user JWT"
  - "EXPO_PUSH_URL = https://exp.host/--/api/v2/push/send — no Expo access token needed for basic sends (docs.expo.dev confirmed)"
metrics:
  duration: "~6 minutes"
  completed: 2026-06-22
  tasks_completed: 2
  files_changed: 2
---

# Phase 10 Plan 02: send-push Edge Function Summary

Server-owned push notification send function: IDOR-safe recipient resolution (seeker for video-ready via checks.seeker_id; in-range online scouts for job-nearby via scouts_in_range_of_check RPC), notification_prefs filtering with null-degrade, Expo batch POST <=100, DeviceNotRegistered inline cleanup, and a never-throws catch-all — all 7 Deno tests green.

## What Was Built

### Task 1: RED Deno test suite (PUSH-04..PUSH-09)

`supabase/functions/send-push/index.test.ts` (7 tests):

- **PUSH-04**: video-ready resolves checks.seeker_id, reads seeker device tokens, POSTs to `https://exp.host/--/api/v2/push/send` with seeker's token(s). Asserts fetch URL and `messages[].to` contain seeker token only (no scout tokens).
- **PUSH-05**: job-nearby calls `scouts_in_range_of_check` RPC (mocked), reads scout tokens, POSTs them. Asserts both scout tokens present, seeker token absent.
- **PUSH-06/06b**: `notification_prefs.delivered === false` for video-ready -> seeker skipped, seeker token absent from Expo messages.
- **PUSH-07**: `notification_prefs === null` -> seeker IS included (D-04 push-all degrade). Asserts seeker token present.
- **PUSH-08**: Expo ticket `status:'error', details.error:'DeviceNotRegistered'` triggers `svc.from('device_push_tokens').delete().eq('token', staleToken)`. Asserts delete call recorded.
- **PUSH-09**: `svc` throws on first query -> `handleSendPush` resolves without rethrowing (never throws).

Mock pattern mirrors fraud-eval: chainable `from()` builder, `rpc()` recorder, per-test `stubFetch()` captures Expo request URL + body and returns configurable ticket arrays.

### Task 2: send-push/index.ts implementation (GREEN)

`supabase/functions/send-push/index.ts` (~220 lines):

**Recipient resolution (IDOR-safe):**
- `video-ready`: `svc.from('checks').select('seeker_id, coord').eq('id', checkId).single()` → `[seeker_id]`
- `job-nearby`: `svc.rpc('scouts_in_range_of_check', { p_check_id: checkId })` → scout_id array. NOT `list_open_checks_for_scout` (Pitfall 4, CHECKER WARNING 3).

**notification_prefs filtering (D-04):**
- Batch-reads `profiles.select('id, notification_prefs').in('id', userIds)`
- Key map: `video-ready` → `'delivered'`; `job-nearby` → `'job-nearby'`
- `null` prefs OR missing key → include. Explicit `false` → skip.

**Expo batch:**
- `chunk(messages, 100)` helper — no external dep
- POST to `https://exp.host/--/api/v2/push/send` with `Content-Type: application/json`
- Copy: job-nearby "New check nearby" / "A new check just dropped near you — tap to claim."; video-ready "Your check is ready" / "Your video is ready to watch." (uses "video", not "clip")

**DeviceNotRegistered cleanup:**
- Tickets array is parallel to batch array; index match maps ticket → token
- `.from('device_push_tokens').delete().eq('token', staleToken)` for each `DeviceNotRegistered` error

**Logging:** `push.sent` (counts), `push.skipped_prefs`, `push.skipped_no_recipients`, `push.skipped_no_tokens`, `push.error` via `svc.rpc('log_event', {...})`

**Never-throws:** entire `handleSendPush` body wrapped in `try/catch(_outer)` that swallows and logs — mirrors fraud-eval.

**Entrypoint (import.meta.main guard):**
- Validates `checkId` as UUID (regex) — returns 400 on bad input
- Validates `event` as `'video-ready'|'job-nearby'` enum — returns 400 on bad input
- Calls `handleSendPush` then ALWAYS returns `Response('ok', {status: 200})`

## Deno Test Results

```
7 passed | 0 failed (12ms)
PUSH-04: ok  PUSH-05: ok  PUSH-06: ok  PUSH-06b: ok
PUSH-07: ok  PUSH-08: ok  PUSH-09: ok
```

## scouts_in_range_of_check RPC

`send-push` calls `svc.rpc('scouts_in_range_of_check', { p_check_id: checkId })` which is expected to return `[{ scout_id }]`. This RPC needs to be authored in a migration before Wave 4 deploy. The SQL:

```sql
CREATE OR REPLACE FUNCTION public.scouts_in_range_of_check(p_check_id uuid)
RETURNS TABLE(scout_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT sl.scout_id
  FROM public.scout_locations sl
  WHERE sl.is_online = true
    AND ST_DWithin(
      sl.coord,
      (SELECT coord FROM public.checks WHERE id = p_check_id),
      (SELECT dispatch_radius_m FROM public.market_config LIMIT 1)
    );
$$;
```

If the RPC doesn't exist at deploy time, `.rpc()` returns an error and `resolveRecipients` returns `[]` — graceful degrade (no push sent, logged as `push.skipped_no_recipients`). The trigger still completes and the check transition is never blocked.

**Deploy flag (Wave 4 / 10-05):** `supabase functions deploy send-push --no-verify-jwt`

## Deviations from Plan

**1. [Rule 2 - Auto-add] Extra PUSH-06b test added**
- Found during: Task 1 (writing tests)
- Issue: PUSH-06 as written only checks that no delete was triggered for the skipped user. A stricter check verifying the seeker token is absent from any Expo messages batch is cleaner.
- Fix: Added PUSH-06b as a complementary assertion.
- Files modified: supabase/functions/send-push/index.test.ts
- Commit: 1ece82f

**2. [Rule 1 - Approach] scouts_in_range_of_check via RPC (not inline PostgREST filter)**
- Decision: The plan allowed either a server-side RPC or an inline PostgREST filter for the online-scout audience. Chose the RPC approach (`svc.rpc('scouts_in_range_of_check', ...)`) because:
  (a) PostgREST cannot express `ST_DWithin` in a URL filter parameter.
  (b) The SECURITY DEFINER RPC is clean, IDOR-safe, and will be authored in a migration (0019 or similar) before Wave 4.
  (c) Graceful degrade on missing RPC: returns empty list, never throws.

## Threat Flags

No new security surface beyond the plan's threat model. T-10-05 through T-10-09 all mitigated inline.

| Threat | File | Status |
|--------|------|--------|
| T-10-05 IDOR wrong recipient | send-push/index.ts | Mitigated: recipients derived from checkId only, never caller input |
| T-10-06 Token info disclosure | send-push/index.ts | Mitigated: token lookup keyed strictly to resolved recipient user_ids |
| T-10-07 Stale token accumulation | send-push/index.ts | Mitigated: inline DeviceNotRegistered cleanup on every send |
| T-10-08 send-push throws, blocks caller | send-push/index.ts | Mitigated: outer try/catch, entrypoint always 200 |
| T-10-09 Forged event spoofing | send-push/index.ts | Mitigated: event validated against enum + checkId validated as UUID before any query |

## Known Stubs

None — send-push is backend infrastructure only. No UI rendering, no client data wired to screens.

## Commits

| Task | Hash | Message |
|------|------|---------|
| Task 1 (RED test suite) | 1ece82f | test(10-02): add RED Deno test suite for send-push PUSH-04..PUSH-09 |
| Task 2 (implementation) | 32b12a1 | feat(10-02): implement send-push Edge Function — IDOR-safe recipients, prefs, batch, cleanup |

## Self-Check: PASSED

- `/Users/troyreed/studio/projects/let-me-check/supabase/functions/send-push/index.ts` — FOUND
- `/Users/troyreed/studio/projects/let-me-check/supabase/functions/send-push/index.test.ts` — FOUND
- `grep exp.host/--/api/v2/push/send index.ts` — FOUND
- `grep scouts_in_range index.ts` — FOUND (scouts_in_range_of_check)
- `grep DeviceNotRegistered index.ts` — FOUND
- Commits 1ece82f, 32b12a1 — present in git log
- 7 Deno tests: all PASSED
