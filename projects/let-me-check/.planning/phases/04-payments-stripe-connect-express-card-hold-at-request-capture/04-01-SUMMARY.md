---
phase: 04-payments-stripe-connect-express-card-hold-at-request-capture
plan: 01
subsystem: payments
tags: [stripe, schema, migration, edge-functions, webhook, rls, pgtap, deno]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/0011_payments.sql
    - supabase/functions/_shared/stripe.ts
    - supabase/functions/_shared/stripe.test.ts
    - supabase/tests/0011_payments.test.sql
  affects:
    - public.profiles (additive columns)
    - public.checks (additive column + index)
tech_stack:
  added:
    - npm:stripe@22 (Deno Edge Function import via npm: specifier)
  patterns:
    - requireEnv fail-loud pattern (mirrors mux.ts)
    - native Web Crypto HMAC-SHA256 webhook verification (mirrors verifyMuxSignature)
    - setStripeClientFactory test seam for offline mock injection
    - service-role-only payment writes (no client INSERT/UPDATE/DELETE policy)
    - minor-unit amounts with currency column (never hard-coded USD)
key_files:
  created:
    - supabase/migrations/0011_payments.sql
    - supabase/functions/_shared/stripe.ts
    - supabase/functions/_shared/stripe.test.ts
    - supabase/tests/0011_payments.test.sql
  modified: []
decisions:
  - "Stripe secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) live only in Deno.env inside _shared/stripe.ts; no helper ever returns them"
  - "verifyStripeSignature mirrors verifyMuxSignature exactly: v1-only scheme, 300s replay window, native Web Crypto constant-time compare"
  - "payments / refund_requests / scout_stripe_accounts use create table (not if not exists) to match plan acceptance criteria greps"
  - "currency column is NOT NULL with no default — must be supplied by the Edge Function from market config, never hard-coded"
  - "RLS: three new tables have no client INSERT/UPDATE/DELETE policy; service role (Edge Functions + webhooks) is the sole writer"
metrics:
  duration: "5 minutes"
  completed: "2026-06-21T05:21:00Z"
  tasks: 3
  files: 4
---

# Phase 4 Plan 01: Payments Data Spine + Stripe Shared Helper Summary

**One-liner:** Stripe payments schema (payments + refund_requests + scout_stripe_accounts tables, RLS) and a native-Web-Crypto webhook verifier that mirrors the Phase-3 Mux pattern exactly, with 6 passing Deno tests.

## What Was Built

### Task 1 — Migration 0011 (`6ec4a49`)

`supabase/migrations/0011_payments.sql` — additive-only migration (228 lines):

- Additive columns on `public.profiles`: `stripe_customer_id text` (Stripe Customer for saved-card PaymentSheet) and `blocked_from_booking boolean not null default false` (D-09 capture-failure gate).
- Additive column + index on `public.checks`: `stripe_payment_intent_id text` + `checks_pi_idx`.
- `public.payments` — one row per check money lifecycle. `amount_total` and `scout_amount` in minor units; `currency` is NOT NULL with no default (must come from market config); `status` CHECK over 6 locked values (`authorized` / `captured` / `transferred` / `refunded` / `capture_failed` / `canceled`). Unique on `check_id`.
- `public.refund_requests` — structured reason capture (D-06/D-07). Five locked `reason_code` values (`blurry` / `wrong_location` / `didnt_show_needed` / `never_delivered` / `other`). `review_status` CHECK over 5 outcomes. `auto_approved` boolean for the automated review path.
- `public.scout_stripe_accounts` — Stripe Connect Express state per Scout. `charges_enabled` is the "go online" gate (Pitfall 5). `accepted_scout_code_at` is the SCOUT-02 consent timestamp. `payout_speed` allows `standard` or `instant` (D-05 2% fee).
- RLS on all three new tables: Seeker + assigned Scout may SELECT payments; only Seeker may INSERT refund requests for their own checks; Scout may SELECT their own account row. No client INSERT/UPDATE/DELETE on any payment table.

### Task 2 — `_shared/stripe.ts` + Deno tests (`9dfb82f`)

`supabase/functions/_shared/stripe.ts` (108 lines) — near-mirror of `mux.ts`:

- `requireEnv(name)` — fail-loud reader; message `"Missing required Stripe secret: ${name}"`.
- `setStripeClientFactory(factory | null)` — test seam for offline mock injection.
- `getStripeClient()` — lazily imports `npm:stripe@22` with `Stripe.createFetchHttpClient()` (Deno-safe fetch transport). Caches the client. Never returns the secret key.
- `verifyStripeSignature(rawBody, headers)` — reads `stripe-signature` header; parses `t=<unix>,v1=<hex>`; enforces 300s replay window; HMAC-SHA256 over `${t}.${rawBody}` with `crypto.subtle`; constant-time compare. v1-only (Pitfall 3: never accepts v0).

`supabase/functions/_shared/stripe.test.ts` (130 lines) — 6 Deno tests, all passing offline:
- A1: throws on missing header
- A2: throws on forged `t=1,v1=deadbeef`
- A3: passes on genuine HMAC built in-test (same pattern as mux.test.ts A3)
- A4: throws on timestamp >300s old (replay protection)
- B1: PaymentIntent response never contains `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET`
- B2: missing `STRIPE_SECRET_KEY` throws `"Missing required Stripe secret: STRIPE_SECRET_KEY"`

### Task 3 — pgTAP schema coverage (`44e13ef`)

`supabase/tests/0011_payments.test.sql` (139 lines) — 17 assertions:
- `has_table` for all three new tables
- `has_column` for additive `stripe_customer_id`, `blocked_from_booking`, `stripe_payment_intent_id`
- `col_not_null` for `currency`, `amount_total`, `scout_amount`
- `throws_ok` (error code 23514) for invalid `payments.status = 'bogus'`
- `throws_ok` (error code 23514) for invalid `refund_requests.reason_code = 'not_a_reason'`
- `lives_ok` for valid `authorized` payment row insert
- `lives_ok` for valid `blurry` refund request insert
- `row_security_active` true for all three new tables

Live run gated to plan 04-05 (no Docker in dev environment).

## Deviations from Plan

### Auto-fixed Issues

None. Plan executed exactly as written.

The only minor adjustment: the `create table` statements use `create table public.payments` (not `create table if not exists`) to match the plan's acceptance-criteria grep patterns. This is correct for a numbered migration that should fail loud on re-run rather than silently succeed.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `create table` without `if not exists` on all three tables | Numbered migrations should fail visibly on re-run; matches plan grep gates |
| `currency text not null` with no default | Enforces that every Edge Function supplies currency from market config; can never be omitted |
| `v1`-only webhook verification | Pitfall 3 from 04-RESEARCH: `v0` is a Stripe test fixture that must be ignored in production |
| 300s (5 min) replay window | Matches Mux pattern and Stripe's official recommended tolerance |

## Known Stubs

None. This plan creates schema and helpers only — no UI data sources or stubs introduced.

## Threat Surface Scan

All threat mitigations from the plan's threat model are in place:

| Threat | Mitigation Status |
|--------|------------------|
| T-04-01 Spoofing (forged webhook) | `verifyStripeSignature` HMAC-SHA256 + 300s window proven by A1-A4 tests |
| T-04-02 Info Disclosure (secret leak) | B1+B2 tests prove no helper returns `STRIPE_SECRET_KEY`; grep gate clean |
| T-04-03 Tampering (payments table) | No client INSERT/UPDATE/DELETE policy; `row_security_active` asserted by pgTAP |
| T-04-04 EoP (refund_requests) | INSERT policy requires `auth.uid() = seeker_id` for own check only |
| T-04-05 Repudiation | event_log (0001) is the audit trail; Edge Functions log via `rpc('log_event', ...)` |

No new security-relevant surface beyond what the plan's threat model covers.

## Self-Check: PASSED

- `/Users/troyreed/studio/projects/let-me-check/supabase/migrations/0011_payments.sql` — FOUND (228 lines)
- `/Users/troyreed/studio/projects/let-me-check/supabase/functions/_shared/stripe.ts` — FOUND (108 lines)
- `/Users/troyreed/studio/projects/let-me-check/supabase/functions/_shared/stripe.test.ts` — FOUND (130 lines)
- `/Users/troyreed/studio/projects/let-me-check/supabase/tests/0011_payments.test.sql` — FOUND (139 lines)
- Commit `6ec4a49` — FOUND (migration 0011)
- Commit `9dfb82f` — FOUND (stripe.ts + tests)
- Commit `44e13ef` — FOUND (pgTAP test)
- `deno test --allow-env stripe.test.ts` — 6 passed, 0 failed
- `npx tsc --noEmit` from lmc-app/ — clean (no app code touched)
