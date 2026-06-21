---
phase: 06-privacy-anti-fraud-hardening-on-device-face-plate-blur-befor
plan: "04"
subsystem: live-database + live-edge-runtime + client-types
tags: [live-deploy, migration, edge-functions, types-regen, dormant-gate, SCH-01, BLUR-01, BLUR-02, BLUR-03, BLUR-04, BLUR-05, FRAUD-01, FRAUD-02]
dependency_graph:
  requires: [06-01, 06-02, 06-03]
  provides: [SCH-01-live, BLUR-01-live, BLUR-02-live, BLUR-03-live, BLUR-04-live, BLUR-05-live, FRAUD-01-live, FRAUD-02-live]
  affects: [06-05]
tech_stack:
  added: []
  patterns:
    - DO-block-idempotent-constraint (ADD CONSTRAINT wrapped in DO block checking pg_constraint; avoids ADD CONSTRAINT IF NOT EXISTS which Supabase db push rejects despite PG17)
    - no-verify-jwt-webhook (mux-webhook: --no-verify-jwt + code sig; face-blur-check/fraud-eval: verify_jwt=true service-to-service)
    - dormant-feature-gate (blur_enabled=false across all 102 market rows at deploy; D-07)
key_files:
  created: []
  modified:
    - supabase/migrations/0014_privacy_fraud_signals.sql
    - lmc-app/app/lib/database.types.ts
decisions:
  - ADD CONSTRAINT IF NOT EXISTS replaced with DO block guard on pg_constraint (Supabase db push rejects PG15+ syntax even on PG17 instance)
  - mux-webhook verify_jwt=false confirmed post-redeploy; face-blur-check and fraud-eval verify_jwt=true (service-to-service)
  - Dormant invariant confirmed: 0 markets blur_enabled=true; all 102 markets fraud_strictness='flag' (D-07 / D-04 launch posture)
metrics:
  duration: "12m"
  completed: "2026-06-22"
  tasks: 3
  files: 2
---

# Phase 6 Plan 04: [BLOCKING] Live Deploy — Migration 0014 + Edge Functions + Types Summary

Phase-6 Category-A is now live and dormant: schema pushed, functions deployed with correct auth postures, blur gate confirmed off across all markets, types regenerated and tsc clean.

## What Was Built

**Migration 0014 pushed live (SCH-01):**
- Applied `0014_privacy_fraud_signals.sql` to the live database (cawqasszfbzvbtunamda) via `supabase db push --include-all`.
- Confirmed on live: `clips` has `blur_status` (text default 'pending'), `fraud_signals` (jsonb), `fraud_flag` (boolean default false), `fraud_score` (smallint). `market_config` has `blur_enabled` (boolean NOT NULL default false) and `fraud_strictness` (text NOT NULL default 'flag'). `check_status` enum has `blur_review`. `is_valid_check_transition` allows `filming -> blur_review` and rejects `processing -> blur_review`.

**Schema assertions (pgTAP equivalent — run directly against live DB):**
All 9 live SQL assertions passed: column existence, types, defaults, enum label, and both transition-function edge correctness checks.

**Edge Functions deployed (4 functions):**

| Function | verify_jwt | Why |
|---|---|---|
| face-blur-check | true | Service-to-service: invoked by mux-webhook under service role |
| fraud-eval | true | Service-to-service: fire-and-forget from mux-webhook under service role |
| mux-webhook | false (--no-verify-jwt) | Real webhook from Mux; sig-verified inside function code |
| mux-upload-url | true | User function; requires Supabase JWT from authenticated Scout |

**mux-webhook 401 confirmation:** Unsigned POST to the live mux-webhook URL returns HTTP 401. The gateway passes the request through (verify_jwt=false), and the function's own Mux signature check rejects it. This is the correct posture — Mux's real webhooks carry the `mux-signature` header and pass the sig check.

**Dormant launch posture confirmed (D-07 / D-04):**
- `blur_enabled=true` count across all market_config rows: **0** (gate dormant).
- `fraud_strictness` across all 102 market rows: **'flag'** only (no 'hold' or 'reject').
- No force-update needed — new columns landed with their DEFAULT values.

**Types regenerated (database.types.ts):**
- `clips` type now includes `blur_status`, `fraud_signals`, `fraud_flag`, `fraud_score` in Row/Insert/Update shapes.
- `market_config` type now includes `blur_enabled`, `fraud_strictness`.
- `check_status` enum union now includes `"blur_review"`.
- `tsc --noEmit` on lmc-app: clean (zero errors).

**GOOGLE_VISION_API_KEY:** Confirmed present in live secrets (set in Phase 5). No new key checkpoint needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `ADD CONSTRAINT IF NOT EXISTS` rejected by Supabase db push**
- **Found during:** Task 1 (`supabase db push --include-all`)
- **Issue:** The migration used `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS` which is valid PostgreSQL 15+ syntax. The live DB is PostgreSQL 17. However, Supabase's `db push` path sends the SQL through an API endpoint that rejects this syntax with `syntax error at or near "not"` (statement 6). Confirmed by running the same statement via `supabase db query --linked` which produced the identical error.
- **Fix:** Replaced the `ADD CONSTRAINT IF NOT EXISTS` with a DO block that checks `pg_constraint` for the constraint name before adding it — the same idempotent pattern used in the Phase-5 `pg_cron` migration. The CHECK constraint semantics are identical; only the idempotency mechanism changed.
- **Files modified:** `supabase/migrations/0014_privacy_fraud_signals.sql`
- **Commit:** b33fc76

## Secrets Inventory

| Secret | Status | Source |
|---|---|---|
| GOOGLE_VISION_API_KEY | Present | Set in Phase 5 (Plan 05-05) |
| MUX_SIGNING_KEY_ID | Present | Phase 3 |
| MUX_SIGNING_PRIVATE_KEY | Present | Phase 3 |
| MUX_WEBHOOK_SECRET | Present | Phase 3 |
| STRIPE_SECRET_KEY | Present | Phase 4 |
| STRIPE_WEBHOOK_SECRET | Present | Phase 4 |

## Known Stubs

None. `blur_enabled=false` is the intentional launch dormant posture (D-07), not a stub. `fraud_strictness='flag'` is the intentional flag-only launch posture (D-04), not a stub. All function logic is fully wired; the gates are present but dormant by design.

## Threat Surface Scan

No new network endpoints or auth paths introduced in this plan. The deployment makes existing code live without changing any function logic. Threat register items from the plan:

- T-06-17 (mux-webhook with JWT verify): Mitigated — deployed with `--no-verify-jwt` confirmed (`verify_jwt: false` in functions list). Unsigned POST returns 401 from function sig-check, not gateway.
- T-06-18 (blur_enabled=true at launch): Mitigated — `blur_enabled=true` count confirmed 0 across all 102 market_config rows.
- T-06-19 (Vision key exposure): Accepted — key reused from Phase 5; confirmed present in secrets; never logged or returned to client.

## Commits

| Task | Commit | Description |
|---|---|---|
| Task 1: 0014 migration fix + push | b33fc76 | fix(06-04): make 0014 migration idempotent (DO block for CHECK constraint) |
| Task 2: deploy 4 Edge Functions | 03a9440 | chore(06-04): deploy Phase-6 Edge Functions to live |
| Task 3: dormant posture + types | 50c1b98 | chore(06-04): regen database.types.ts with blur/fraud Phase-6 columns |

## Self-Check: PASSED

**Files on disk:**
- `supabase/migrations/0014_privacy_fraud_signals.sql` — present (modified with DO block fix)
- `lmc-app/app/lib/database.types.ts` — present (blur_status/fraud_strictness/blur_review confirmed via grep)

**Commits in git log:**
- b33fc76 — FOUND
- 03a9440 — FOUND
- 50c1b98 — FOUND

**Live assertions:**
- Migration 0014 in remote migration list: CONFIRMED
- blur_status default 'pending', fraud_flag default false, blur_enabled default false, fraud_strictness default 'flag': ALL CONFIRMED
- blur_review enum label: CONFIRMED
- filming->blur_review transition: ALLOWED; processing->blur_review: REJECTED
- blur_enabled=true count: 0 (dormant invariant PASSED)
- fraud_strictness distribution: 102 rows 'flag', 0 rows 'hold'/'reject' (PASSED)
- mux-webhook unsigned POST: 401 (CONFIRMED)
- tsc --noEmit: CLEAN

**Deployed function list:** face-blur-check (verify_jwt=true), fraud-eval (verify_jwt=true), mux-webhook (verify_jwt=false, --no-verify-jwt), mux-upload-url (verify_jwt=true). mux-webhook unsigned POST returns 401 — gateway passes through, function sig-check rejects.
