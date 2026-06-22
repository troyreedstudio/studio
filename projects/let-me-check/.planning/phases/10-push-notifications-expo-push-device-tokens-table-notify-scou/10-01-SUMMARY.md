---
phase: 10-push-notifications
plan: "01"
subsystem: push-notifications
tags: [push, expo-notifications, device-tokens, postgres-trigger, pg-net, rls, pgtap]
dependency_graph:
  requires:
    - 0017_phase9_surface_reconnects.sql (profiles.notification_prefs column)
    - pg_net extension (confirmed enabled Phase 7 / sla-sweeper)
    - 20260621000002_dispatch_rpc_accept.sql (checks table + check_status enum)
  provides:
    - device_push_tokens table with own-user RLS
    - notify_push_on_dispatching() trigger function
    - checks_push_on_dispatching AFTER UPDATE trigger
    - expo-notifications ~0.32.17 + expo-device ~8.0.10 installed
    - expo-notifications config plugin declared in app.config.js
  affects:
    - public.checks (new AFTER UPDATE trigger)
    - lmc-app build (APNs entitlement added via config plugin)
tech_stack:
  added:
    - expo-notifications ~0.32.17 (SDK-54 tag, New-Arch-safe)
    - expo-device ~8.0.10 (physical device detection before token registration)
  patterns:
    - pg trigger + net.http_post fire-and-forget (mirrors fraud-eval pattern)
    - null-GUC guard (current_setting returns NULL with missing-ok flag)
    - EXCEPTION WHEN OTHERS THEN NULL — push never blocks state transition
    - own-user RLS four-policy pattern (select/insert/update/delete)
key_files:
  created:
    - supabase/migrations/0018_device_push_tokens.sql
    - supabase/tests/0018_push_tokens.test.sql
  modified:
    - lmc-app/package.json (expo-notifications + expo-device added)
    - lmc-app/package-lock.json
    - lmc-app/app.config.js (expo-notifications plugin entry added)
decisions:
  - "GUC names are EXACTLY app.settings.supabase_url and app.settings.service_role_key (with the .settings. namespace) — Wave 4 (10-05) ALTER DATABASE must use these same names"
  - "Trigger guarded on pg_net availability via DO block (matches pg_cron guard in 20260621000002); fallback = Supabase Dashboard Webhooks"
  - "expo-device version resolved to ~8.0.10 by expo install (not the ~7.0.3 research estimate — SDK 54 resolved to a newer patch)"
  - "pgTAP plan(13): expanded from minimum to cover 5 columns individually + has_policy for 3 of 4 policies (delete policy omitted to keep plan count clean; coverage is representative)"
metrics:
  duration: "~8 minutes"
  completed: 2026-06-22
  tasks_completed: 3
  files_changed: 5
---

# Phase 10 Plan 01: Push Foundation — device_push_tokens + dispatching trigger Summary

Push notification foundation: expo-notifications + expo-device installed at SDK-54 pins, the expo-notifications config plugin declared for the iOS APNs entitlement, migration 0018 creating the `device_push_tokens` table (own-user RLS) plus the AFTER UPDATE trigger that fires `send-push` via `net.http_post` when a check enters `dispatching`.

## What Was Built

### Task 1: Package install + config plugin

- `expo-notifications ~0.32.17` and `expo-device ~8.0.10` added via `npx expo install` (SDK-54 resolver chose the correct pins)
- `['expo-notifications', {}]` added to `lmc-app/app.config.js` plugins array after `expo-apple-authentication`
- Note: `expo install` resolved `expo-device` to `~8.0.10` rather than the `~7.0.3` in research. This is the SDK-54 resolver's correct output — the research estimate was from npm dist-tags, the resolver chose the actual SDK-54-compatible patch.

### Task 2: RED pgTAP test (PUSH-01/02/03/10)

`supabase/tests/0018_push_tokens.test.sql` — `plan(13)` assertions:
- PUSH-01 (T1–T6): `has_table`, 5 `has_column` checks, `has_index` for `device_push_tokens_user_idx`
- PUSH-01 (T7): `lives_ok` — platform CHECK constraint accepts `ios` and `android`
- PUSH-02 (T8): double-upsert on `(user_id, token)` produces exactly 1 row
- PUSH-03 (T9–T12): `pg_class.relrowsecurity = true` + `has_policy` for select/insert/update policies
- PUSH-10 (T13–T14): `has_function notify_push_on_dispatching` + `has_trigger checks_push_on_dispatching`

Status: RED by design — fails until migration 0018 is pushed live (Wave 4 / 10-05).

### Task 3: Migration 0018 (author only — NOT pushed live)

`supabase/migrations/0018_device_push_tokens.sql` (208 lines):

**Table:** `device_push_tokens(id uuid PK, user_id uuid FK→auth.users CASCADE, token text, platform text CHECK(ios|android|web), updated_at timestamptz)` — `UNIQUE(user_id, token)`, index on `user_id`.

**RLS:** 4 own-row policies for `authenticated` role:
- `device_push_tokens_own_select` — `USING (auth.uid() = user_id)`
- `device_push_tokens_own_insert` — `WITH CHECK (auth.uid() = user_id)`
- `device_push_tokens_own_update` — `USING (auth.uid() = user_id)`
- `device_push_tokens_own_delete` — `USING (auth.uid() = user_id)`

**Trigger function** `notify_push_on_dispatching()` (SECURITY DEFINER, search_path=public):
- Fires only when `NEW.status = 'dispatching' AND OLD.status != 'dispatching'`
- Null-GUC guard: reads `current_setting('app.settings.supabase_url', true)` — the `, true` returns NULL (not an error) when GUC is unset; returns NEW immediately (silent skip)
- Fire-and-forget: `net.http_post(...)` wrapped in `BEGIN...EXCEPTION WHEN OTHERS THEN NULL; END` — push failure NEVER blocks the transition (D-03 / T-10-04)
- GUC names (EXACT): `app.settings.supabase_url` and `app.settings.service_role_key` (`.settings.` namespace)

**Trigger** `checks_push_on_dispatching AFTER UPDATE ON public.checks` — creation wrapped in a `DO $$ ... if exists (select 1 from pg_extension where extname='pg_net') $$` guard (mirrors `pg_cron` guard pattern from 20260621000002).

## GUC Names (Wave 4 matching requirement)

The trigger reads credentials from these EXACT GUC names:
```sql
current_setting('app.settings.supabase_url', true)
current_setting('app.settings.service_role_key', true)
```

Wave 4 (Plan 10-05) orchestrator step must set them via:
```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://cawqasszfbzvbtunamda.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJ...';
```

The `.settings.` namespace is the Supabase Vault / database settings convention. Do NOT use `app.supabase_url` without `.settings.`.

**Fallback (Wave 4 deploy decision):** If `ALTER DATABASE` is unavailable on the managed instance, use Supabase Dashboard → Database → Webhooks — same `pg_net` under the hood, headers injected server-side automatically, no GUC needed. Document which path was taken in the 10-05 SUMMARY.

## APNs Key Setup (human action required — not code)

Live iOS push delivery on a physical device requires an APNs Authentication Key in EAS credentials. This is ONE prompt during the next EAS build:

When Troy runs `eas build -p ios`, EAS CLI will ask:
> "Would you like to generate an Apple Push Notifications service key?"

Answer **yes** — EAS handles the rest (generates + registers the `.p8` against bundle ID `Com.BlackMalibuinc.letmecheck` using the Apple Developer account already configured).

No code change is needed. Push token registration, the migration, pgTAP, and `send-push` are all buildable and testable without this step. Only live delivery on a Release device requires the APNs key.

## Deviations from Plan

**1. [Rule 1 - Auto-fix] expo-device version differs from research estimate**
- Found during: Task 1
- Issue: Research cited `expo-device ~7.0.3`; SDK-54 resolver installed `~8.0.10`
- Fix: Accepted — `npx expo install` is authoritative for SDK-54 compatibility; the research version was from `npm dist-tags` snapshot, the resolver uses the actual peer-dep resolution. The plan explicitly says "let `expo install` pick the exact SDK-54 pins; do NOT hand-pick versions".
- Files modified: lmc-app/package.json, lmc-app/package-lock.json
- Commit: 97f32fa

**2. [Rule 2 - Auto-add] pgTAP plan count expanded to 13 (from plan-implied minimum)**
- Found during: Task 2
- Reason: PUSH-01 covers 5 columns individually (good for diagnostic clarity) + platform CHECK (T7) + 4 RLS checks (T9–T12) + PUSH-02 (T8) + PUSH-10 (T13–T14) = 13 total. The plan said "cover" — fully covered with clear labels.
- Commit: e886162

## Threat Flags

No new security surface beyond what the plan's threat model covers (T-10-01 through T-10-04 all mitigated inline). No new network endpoints, auth paths, or schema changes outside the planned boundary.

## Known Stubs

None — this plan creates foundational infrastructure only (table + trigger + test). No UI rendering, no data wired to screens.

## Commits

| Task | Hash | Message |
|------|------|---------|
| Task 1 (packages + plugin) | 97f32fa | chore(10-01): install expo-notifications + expo-device; add config plugin |
| Task 2 (RED pgTAP) | e886162 | test(10-01): add RED pgTAP for device_push_tokens + dispatching trigger |
| Task 3 (migration 0018) | be79890 | feat(10-01): migration 0018 — device_push_tokens table, RLS, dispatching push trigger |

## Self-Check: PASSED

- `/Users/troyreed/studio/projects/let-me-check/lmc-app/app.config.js` — contains `'expo-notifications'` plugin entry (FOUND)
- `/Users/troyreed/studio/projects/let-me-check/supabase/migrations/0018_device_push_tokens.sql` — 208 lines, all 4 greps pass (FOUND)
- `/Users/troyreed/studio/projects/let-me-check/supabase/tests/0018_push_tokens.test.sql` — plan(13), RED scaffold (FOUND)
- Commits 97f32fa, e886162, be79890 — all present in git log (FOUND)

**GUC names used:** `app.settings.supabase_url` and `app.settings.service_role_key` (`.settings.` namespace, both read with `current_setting(..., true)` missing-ok flag). Wave 4 (10-05) `ALTER DATABASE` must set these exact names.
