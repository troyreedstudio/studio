---
phase: 04-payments-stripe-connect-express-card-hold-at-request-capture
plan: 03
subsystem: payments
tags: [stripe, edge-functions, deno, tdd, capture, transfer, webhook, d09, d08]
dependency_graph:
  requires:
    - supabase/functions/_shared/stripe.ts
    - supabase/functions/_shared/pricing.ts
    - supabase/migrations/0011_payments.sql
  provides:
    - supabase/functions/stripe-capture/index.ts
    - supabase/functions/stripe-capture/index.test.ts
    - supabase/functions/stripe-webhook/index.ts
    - supabase/functions/stripe-webhook/index.test.ts
  affects:
    - supabase/functions/mux-webhook/index.ts (Plan 04-05 adds the stripe-capture call here)
    - public.payments (status transitions: authorized -> captured -> transferred | capture_failed | canceled)
    - public.profiles (blocked_from_booking set on D-09)
    - public.scout_stripe_accounts (charges_enabled/payouts_enabled synced from account.updated)
tech_stack:
  added: []
  patterns:
    - handleFn(input, deps) decoupled from Deno.serve (mirrors mux-webhook + mux-upload-url)
    - import.meta.main guard on Deno.serve so tests pass with --allow-env only
    - separate charges + transfers (never destination charges) — Pitfall 2 protection
    - D-09 fallback: capture failure still pays Scout from platform balance (no source_transaction)
    - raw-body-first verify before JSON.parse (Pitfall 3 / T-04-11)
    - idempotency on payments.status guard (capture) and Stripe event id (webhook)
key_files:
  created:
    - supabase/functions/stripe-capture/index.ts
    - supabase/functions/stripe-capture/index.test.ts
    - supabase/functions/stripe-webhook/index.ts
    - supabase/functions/stripe-webhook/index.test.ts
  modified: []
decisions:
  - "stripe-capture uses separate charges+transfers (never destination charges); source_transaction links Transfer to Charge on normal path — D-08 Scout protection"
  - "D-09 fallback: capture failure sends Transfer WITHOUT source_transaction (platform balance funds it); Seeker blocked_from_booking=true"
  - "stripe-webhook mirrors mux-webhook exactly: raw body -> verify -> JSON.parse; import.meta.main guard prevents Deno.serve running under test"
  - "disputes never reverse Transfer (no reverse_transfer anywhere in codebase — grep-asserted)"
  - "idempotency in stripe-capture: status=transferred -> 200 ok (dup), no second capture or transfer"
  - "deferred transfer (no scout_stripe_accounts row): capture fires, status stays 'captured', payment.transfer_deferred logged; no throw"
metrics:
  duration: "7 minutes"
  completed: "2026-06-21T05:39:00Z"
  tasks: 2
  files: 4
---

# Phase 4 Plan 03: Capture + Transfer + Webhook Summary

**One-liner:** stripe-capture captures the held PI on delivery and pays the Scout via a separate Transfer (with D-09 fallback from platform balance + Seeker block); stripe-webhook is a signature-verified event handler for disputes, account.updated, PI cancellation, and payouts — mirroring mux-webhook exactly, with 10 passing Deno tests across both functions.

## What Was Built

### Task 1 — `stripe-capture` Edge Function + Deno tests (`2ab6b12`)

`supabase/functions/stripe-capture/index.ts` (212 lines):

- `handleCapture({ checkId }, { stripe, svc })` — same decoupled shape as `mux-webhook/handleMuxWebhook`. Service-role only (T-04-12: client cannot trigger capture).
- **Step 1:** Load `payments` row (PI id, scout_amount, currency, status) and `checks` row (scout_id, seeker_id, tier).
- **Step 2 — Idempotency:** if `status === 'transferred'` → return 200 `'ok (dup)'` immediately. No second capture or transfer ever fires.
- **Step 3 — Capture:** `stripe.paymentIntents.capture(paymentIntentId)` → on success: set `stripe_charge_id = pi.latest_charge`, `status = 'captured'`, log `payment.captured`.
- **D-09 branch (capture throws):** set `status = 'capture_failed'`, set `profiles.blocked_from_booking = true` for the Seeker, log `payment.capture_failed` — then fall through to pay the Scout.
- **Step 4 — Transfer to Scout:** look up `scout_stripe_accounts.stripe_account_id` for `check.scout_id`.
  - If found + capture succeeded: `stripe.transfers.create({ destination, source_transaction: pi.latest_charge, amount: scoutAmount, currency, transfer_group: checkId })` — separate charges+transfers pattern (Pitfall 2 / D-08).
  - If found + capture failed (D-09): same `transfers.create` but **without `source_transaction`** — platform balance funds it. Logs `payment.transferred` with `d9_platform_funded: true`.
  - If no Scout account row: status stays `'captured'`, logs `payment.transfer_deferred`, returns 200. No throw.
- **Never sets `reverse_transfer`** — grep-asserted. **Never uses destination charges** — `transfers.create` is the only path; no `transfer_data` on `paymentIntents.capture`.

`supabase/functions/stripe-capture/index.test.ts` (308 lines) — 5 Deno tests, all green:
- Test 1: successful path — PI captured, Transfer with `source_transaction`, `status` passes through `'captured'` then `'transferred'`
- Test 2: idempotency — `status=transferred` → no capture, no transfer, 200 `'ok (dup)'`
- Test 3: D-09 — capture throws → Transfer still created (no `source_transaction`), `status='capture_failed'`, `blocked_from_booking=true`
- Test 4: no `reverse_transfer` in any `transfers.create` call
- Test 5: no `scout_stripe_accounts` row → capture fires, transfer deferred, `payment.transfer_deferred` logged

### Task 2 — `stripe-webhook` Edge Function + Deno tests (`21e5528`)

`supabase/functions/stripe-webhook/index.ts` (216 lines) — mirrors `mux-webhook/index.ts` exactly in structure:

- **`handleStripeWebhook(req, { verify, svc })`** — injectable verify + svc for offline testing.
- **Step 1:** `const rawBody = await req.text()` — raw body read FIRST (T-04-11, Pitfall 3).
- **Step 2:** `await deps.verify(rawBody, req.headers)` — signature verified before any action. Bad sig → 401.
- **Step 3:** `JSON.parse(rawBody)` — only after verification (grep-assertable ordering confirmed: lines 40/44/52).
- **Step 4 — Idempotency:** query `event_log` for existing `stripe_event_id`; if found → 200 `'ok (dup)'`.
- **Event routing:**
  - `charge.dispute.created/closed` → log `payment.dispute_created/closed`. **No `reverse_transfer`** (D-08: platform absorbs; Scout never clawed back).
  - `account.updated` → upsert `scout_stripe_accounts` (`charges_enabled`, `payouts_enabled`); log `scout.connect_updated` (SCOUT-01 / Pitfall 5).
  - `payment_intent.canceled` → `payments.status = 'canceled'`; log `payment.hold_released` (PAY-02 hold release).
  - `payment_intent.payment_failed` → log `payment.auth_failed` (D-02 server record).
  - `payout.paid/failed` → log `scout.payout_paid/scout.payout_failed`.
  - default → 200 `'ignored'` (mirrors mux-webhook).
- **`import.meta.main` guard** on `Deno.serve` — tests pass with `--allow-env` only; no `--allow-net` needed (same pattern as `stripe-create-payment-intent`).

`supabase/functions/stripe-webhook/index.test.ts` (252 lines) — 5 Deno tests, all green:
- Test 1: bad signature → 401, zero DB writes/RPCs
- Test 2: `charge.dispute.created` → `payment.dispute_created` logged, no `reverse_transfer`
- Test 3: `account.updated` → `scout_stripe_accounts` upserted (both flags true), `scout.connect_updated` logged
- Test 4: `payment_intent.canceled` → `payments.status='canceled'`, `payment.hold_released` logged
- Test 5: unknown event → 200 `'ignored'`, no side effects

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `import.meta.main` guard missing from stripe-webhook**
- **Found during:** Task 2 GREEN — `Deno.serve` at module top-level caused `NotCapable: Requires net access` during `deno test --allow-env`
- **Issue:** `stripe-capture/index.ts` used `if (import.meta.main)` correctly; `stripe-webhook/index.ts` initially did not — the plan didn't specify it explicitly but the pattern is established in `stripe-create-payment-intent/index.ts`
- **Fix:** Wrapped `Deno.serve` in `if (import.meta.main)` — identical to the established pattern
- **Files modified:** `supabase/functions/stripe-webhook/index.ts`

No other deviations. Plan executed as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `import.meta.main` guard on both `Deno.serve` calls | Established pattern from Plan 02 (`stripe-create-payment-intent`); tests must pass `--allow-env` only |
| `source_transaction` on Transfer only when capture succeeded | D-09 path funds from platform balance — no charge to link to; correct Stripe behavior |
| `scout_stripe_accounts` upserted (not updated) in stripe-webhook | `account.updated` may fire before the row is created; upsert handles both create and update |
| Idempotency via `event_log` query in stripe-webhook | Stripe recommends event id deduplication; `event_log` is the established audit table |

## Known Stubs

None. This plan creates server-only Edge Functions with no UI data sources.

## Threat Surface Scan

All six threats from the plan's `<threat_model>` are mitigated:

| Threat | Mitigation Status |
|--------|------------------|
| T-04-11 Spoofing (stripe-webhook) | `verifyStripeSignature` before `JSON.parse`; 401 on bad sig; line-ordering grep-asserted (40/44/52) |
| T-04-12 Tampering (client-triggered capture) | `handleCapture` is service-role only; no client-callable wrapper in `payments.ts` |
| T-04-13 Tampering (Scout pay clawback) | No `reverse_transfer` anywhere; `stripe-webhook` dispute handler has no transfer reversal; grep-clean |
| T-04-14 Repudiation (money movement) | `payment.captured`, `payment.transferred`, `payment.capture_failed`, `payment.transfer_deferred`, `payment.dispute_created`, `payment.hold_released` — all written via `rpc('log_event')` |
| T-04-15 Tampering (replayed webhook) | Idempotency on Stripe event id (`event_log` check) + `payments.status === 'transferred'` guard |
| T-04-16 DoS (capture failure stalls Scout) | D-09 fallback: capture failure still pays Scout from platform balance; never blocked on capture success |

No new security-relevant surface beyond what the plan's threat model covers.

## Self-Check: PASSED

Files verified:
- `/Users/troyreed/studio/projects/let-me-check/supabase/functions/stripe-capture/index.ts` — FOUND
- `/Users/troyreed/studio/projects/let-me-check/supabase/functions/stripe-capture/index.test.ts` — FOUND
- `/Users/troyreed/studio/projects/let-me-check/supabase/functions/stripe-webhook/index.ts` — FOUND
- `/Users/troyreed/studio/projects/let-me-check/supabase/functions/stripe-webhook/index.test.ts` — FOUND

Commits verified:
- `3c3c55f` — RED test (stripe-capture)
- `2ab6b12` — GREEN stripe-capture implementation
- `0374913` — RED test (stripe-webhook)
- `21e5528` — GREEN stripe-webhook implementation

Test results: `deno test --allow-env` stripe-capture (5/5) + stripe-webhook (5/5) = **10/10 passed, 0 failed**

Grep gates:
- `paymentIntents.capture` in stripe-capture/index.ts — PASS
- `transfers.create` in stripe-capture/index.ts — PASS
- `source_transaction` in stripe-capture/index.ts — PASS
- `blocked_from_booking` in stripe-capture/index.ts — PASS
- `reverse_transfer` in stripe-capture/index.ts — comment-only (code: none) — PASS
- `payment.captured|payment.transferred|payment.capture_failed` in stripe-capture/index.ts — PASS
- `verifyStripeSignature` in stripe-webhook/index.ts — PASS
- `req.text()` before `deps.verify` before `JSON.parse` (lines 40/44/52) — PASS
- `charge.dispute.created|account.updated|payment_intent.canceled` in stripe-webhook/index.ts — PASS
- `reverse_transfer` in stripe-webhook/index.ts — comment-only (code: none) — PASS
- `Deno.serve` in stripe-webhook/index.ts — PASS (guarded by import.meta.main)
