---
phase: 10-push-notifications
plan: "04"
subsystem: push-notifications
tags: [push, mux-webhook, fire-and-forget, deno, advisory]
dependency_graph:
  requires:
    - supabase/functions/send-push/index.ts (Plan 10-02 — the callee)
    - supabase/functions/mux-webhook/index.ts (the caller, step 7 delivered transition)
  provides:
    - supabase/functions/mux-webhook/index.ts (step 8c — fire-and-forget seeker video-ready push)
  affects:
    - Seeker receives push notification when their check reaches delivered
tech_stack:
  added: []
  patterns:
    - fire-and-forget single-line try/catch (mirrors step 8b fraud-eval pattern)
    - advisory invoke: push failure NEVER blocks or undoes a completed delivery
key_files:
  created: []
  modified:
    - supabase/functions/mux-webhook/index.ts
decisions:
  - "Inserted as step 8c AFTER signage (step 9) — adjacent to the existing advisory block; both fire after capture; ordering among advisory steps is irrelevant"
  - "Single-line try/catch mirrors fraud-eval (8b) exactly — no extra wrapping, no logging at this layer (send-push logs internally)"
  - "Wave 4 / 10-05 must redeploy mux-webhook KEEPING --no-verify-jwt (standing lesson — dropping it 401'd Mux on first deploy)"
metrics:
  duration: "~4 minutes"
  completed: 2026-06-22
  tasks_completed: 1
  files_changed: 1
---

# Phase 10 Plan 04: mux-webhook step 8c (Seeker video-ready push) Summary

Fire-and-forget `send-push {event:'video-ready'}` invoke added to mux-webhook on the `delivered` path, mirroring the existing fraud-eval advisory pattern — a push failure can never block or undo a completed delivery.

## What Was Built

### Task 1: Add step 8c — fire-and-forget video-ready push after delivered

`supabase/functions/mux-webhook/index.ts` — 6 lines added (comment block + single advisory invoke):

```ts
// 8c. Seeker delivery push (Phase 10, D-03/PUSH). Fire-and-forget AFTER delivered.
//     send-push resolves the seeker server-side from checkId (IDOR-safe, T-10-15) and
//     respects notification_prefs. A push failure NEVER undoes a completed delivery
//     (mirrors 8b — advisory only, T-10-14).
try { await deps.svc.functions.invoke('send-push', { body: { checkId, event: 'video-ready' } }); } catch (_e) { /* advisory only — D-03, push never blocks delivery */ }
```

Placement: after step 9 (signage advisory), before the final `return new Response("ok", ...)`. Ordering among the advisory steps (8b, 9, 8c) is irrelevant — all run after the delivered transition and stripe-capture.

**Threat mitigations inline:**
- T-10-14 (DoS via push blocking delivery): try/catch swallows ALL errors; runs after delivered + capture already complete.
- T-10-15 (IDOR — wrong user pushed): mux-webhook passes only `checkId`; send-push resolves the seeker server-side (Plan 10-02 T-10-05 mitigated there).

## Deno Test Results

```
10 passed | 0 failed (11ms)
All pre-existing tests green. No new tests required — the advisory pattern
is already covered by the fraud-eval fire-and-forget test (same mock svc,
same swallow-all-errors contract). send-push behaviour is tested in 10-02.
```

## Deviations from Plan

None — plan executed exactly as written. The single-line try/catch mirrors fraud-eval (8b) exactly as specified.

## Threat Flags

No new security surface beyond the plan's threat model. Both T-10-14 and T-10-15 mitigated inline.

## Known Stubs

None — this is a backend-only change with no UI rendering path.

## Commits

| Task | Hash | Message |
|------|------|---------|
| Task 1 | 1581556 | feat(10-04): add step 8c — fire-and-forget seeker video-ready push in mux-webhook |

## Wave 4 Reminder

mux-webhook MUST be redeployed in Plan 10-05 KEEPING `--no-verify-jwt`:

```bash
supabase functions deploy mux-webhook --no-verify-jwt
```

Dropping `--no-verify-jwt` 401'd Mux on first deploy (standing lesson from Phase 3).

## Self-Check: PASSED

- `supabase/functions/mux-webhook/index.ts` — FOUND, modified
- `grep invoke('send-push'` — FOUND
- `grep video-ready` — FOUND
- try/catch on same line as invoke — CONFIRMED
- Commit 1581556 — present in git log
- 10 Deno tests: all PASSED (0 failed)
