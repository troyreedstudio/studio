---
phase: 04-payments-stripe-connect-express-card-hold-at-request-capture
plan: 02
subsystem: payments
tags: [stripe, edge-functions, deno, tdd, payments, client-contract, pricing]
dependency_graph:
  requires:
    - supabase/functions/_shared/stripe.ts
    - supabase/migrations/0011_payments.sql
  provides:
    - supabase/functions/_shared/pricing.ts
    - supabase/functions/stripe-create-payment-intent/index.ts
    - supabase/functions/stripe-create-payment-intent/index.test.ts
    - lmc-app/app/lib/payments.ts
  affects:
    - lmc-app/app/(seeker)/payment.tsx (Plan 06 consumes createPaymentHold)
    - lmc-app/app/scout/payout.tsx (Plan 04 consumes startConnectOnboarding/getConnectStatus)
    - lmc-app/app/(seeker)/delivery.tsx (Plan 07 consumes requestRefund)
    - supabase/functions/stripe-capture (Plan 03 consumes TIER_PRICING for scoutAmount)
tech_stack:
  added: []
  patterns:
    - handleFn(input, deps) decoupled from Deno.serve (mirrors mux-upload-url)
    - import.meta.main guard on Deno.serve so tests run without --allow-net
    - setStripeClientFactory test seam for offline mock injection (Plan 01 pattern)
    - interface-first client contracts (payments.ts) delivered before UI plans
    - priceForTier validation at Edge Function boundary (throws -> 400)
key_files:
  created:
    - supabase/functions/_shared/pricing.ts
    - supabase/functions/stripe-create-payment-intent/index.ts
    - supabase/functions/stripe-create-payment-intent/index.test.ts
    - lmc-app/app/lib/payments.ts
  modified: []
decisions:
  - "pricing.ts is the sole source of tier amounts; no hard-coded cent values anywhere else"
  - "transfer_group is NOT set on the PI at creation (no check id yet); the capture edge sets it after createCheck"
  - "Deno.serve guarded by import.meta.main so tests pass with --allow-env only (no --allow-net)"
  - "payments.ts is interface-first: requestRefund/startConnectOnboarding/getConnectStatus ship as typed stubs that Plans 04/07 implement behind"
metrics:
  duration: "4 minutes"
  completed: "2026-06-21T05:28:46Z"
  tasks: 3
  files: 4
---

# Phase 4 Plan 02: Auth-and-Hold Front Gate Summary

**One-liner:** Manual-capture PaymentIntent Edge Function with server-authoritative tier pricing, per-user Stripe Customer creation, ephemeral key minting, 5 passing Deno tests, and a typed client contract covering all four payment operations Plans 04/06/07 will consume.

## What Was Built

### Task 1 — `_shared/pricing.ts` (`96c2720`)

`supabase/functions/_shared/pricing.ts` (47 lines) — the single source of tier money:

- `export type Tier = 'standard' | 'priority'`
- `export const TIER_PRICING`: standard `{seekerTotal:1650, scoutAmount:800, currency:'usd'}`, priority `{seekerTotal:2200, scoutAmount:1200, currency:'usd'}`. Minor units throughout; currency is per-tier (market-aware seam).
- `export function priceForTier(tier: string)`: validates against `TIER_PRICING` keys, throws `"unknown tier: <value>"` for anything else so callers can map to 400. No hard-coded USD or cent amounts ever appear at a call site — T-04-06 mitigation.

### Task 2 — `stripe-create-payment-intent` Edge Function + Deno tests (`5d846f1`, `a4be2e3`)

RED commit `5d846f1`: 5 failing Deno tests (module not found — correct RED).

GREEN commit `a4be2e3`: `supabase/functions/stripe-create-payment-intent/index.ts` (157 lines):

- `handleCreatePaymentIntent(input, deps)` decoupled from `Deno.serve` — same pattern as `mux-upload-url/index.ts`. `deps.stripe` and `deps.svc` are injectable for offline tests.
- Auth gate (T-04-07): `callerId` resolved from bearer via `authedClient(req).auth.getUser()`; null → 401.
- Tier validation (T-04-06): `priceForTier(tier)` — unknown tier throws, mapped to 400.
- Customer creation: reads `profiles.stripe_customer_id` (service client); if absent creates `stripe.customers.create({ metadata: { user_id: callerId } })` and persists the id — one-tap reorder support.
- Ephemeral key: `stripe.ephemeralKeys.create({ customer }, { apiVersion })` per session; never stored (T-04-09).
- PaymentIntent: `capture_method:'manual'`, `amount: pricing.seekerTotal`, `currency: pricing.currency`, `setup_future_usage:'off_session'`, `payment_method_types:['card']`. `transfer_group` is deferred to the capture edge (check id not known yet at PI creation time).
- Audit log: `rpc('log_event', { p_event_type:'payment.authorized', ... })` — T-04-10 repudiation mitigation.
- Returns `{ clientSecret, customerId, ephemeralKey, paymentIntentId }` only — T-04-08 no-secret-leak.
- `import.meta.main` guard on `Deno.serve` — tests pass with `--allow-env` only (no `--allow-net`).

`supabase/functions/stripe-create-payment-intent/index.test.ts` (216 lines) — 5 Deno tests, all green:
- Test 1: `callerId null` → 401
- Test 2: `standard` tier → PI `capture_method='manual'`, `amount=1650`, `200 OK`, four client-safe fields returned
- Test 3: response text never contains `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` (no-leak)
- Test 4: unknown tier `'deluxe'` → 400, no PI created
- Test 5: existing `stripe_customer_id` → `customers.create` NOT called, PI still created

### Task 3 — `lmc-app/app/lib/payments.ts` (`b87a8f1`)

`lmc-app/app/lib/payments.ts` (164 lines) — interface-first client contract (mirrors `clips.ts`):

- `createPaymentHold(tier: Tier): Promise<PaymentHold>` — invokes `stripe-create-payment-intent`, returns typed `{ clientSecret, customerId, ephemeralKey, paymentIntentId }`. Throws on error → blocks booking (D-02).
- `requestRefund(checkId, reasonCode: RefundReason, note?)` — five reason codes: `blurry | wrong_location | didnt_show_needed | never_delivered | other` (D-07). Returns `{ status: 'refunded' | 'under_review' }`. Edge ships in Plan 07.
- `startConnectOnboarding(payoutSpeed?: PayoutSpeed)` — account_link URL for hosted Stripe Connect onboarding (D-05 sole payout-speed write path). Edge ships in Plan 04.
- `getConnectStatus()` — `{ eligible, chargesEnabled, payoutsEnabled, payoutSpeed }` for the "go online" gate (Pitfall 5: both `charges_enabled && payouts_enabled` required). Edge ships in Plan 04.
- `tsc --noEmit` clean (no errors touching `payments.ts`).

## Deviations from Plan

None. Plan executed exactly as written.

The only minor adjustment: `transfer_group` is intentionally absent from the PaymentIntent create call. The plan notes "(transfer_group is set later by the capture edge using the real check id; here we only authorize the hold)" — this matches the implementation. No deviation.

## Threat Surface Scan

All five threats from the plan's `<threat_model>` are mitigated:

| Threat | Mitigation Status |
|--------|------------------|
| T-04-06 Tampering (amount/price) | `priceForTier` in `_shared/pricing.ts` — no client-supplied amount ever reaches the PI create call |
| T-04-07 Spoofing (caller identity) | `callerId` from `authedClient.auth.getUser()` — Test 1 proves null → 401 |
| T-04-08 Info Disclosure (PI response) | Returns only 4 client-safe fields; Test 3 proves no secret key in response text |
| T-04-09 Info Disclosure (ephemeral key) | Generated per request, never stored; ephemeral key comment in code |
| T-04-10 Repudiation (hold creation) | `log_event('payment.authorized', ...)` written for every PI — `payment.authorized` grep passes |

No new security-relevant surface beyond what the plan's threat model covers.

## Known Stubs

- `requestRefund`, `startConnectOnboarding`, `getConnectStatus` in `payments.ts` are typed invoke-wrappers whose Edge Functions ship in Plans 03/04/07. These are intentional interface-first stubs — the plan explicitly marks them "contract only" and specifies which future plan implements the Edge Function behind each.

## Self-Check: PASSED

- `supabase/functions/_shared/pricing.ts` — FOUND
- `supabase/functions/stripe-create-payment-intent/index.ts` — FOUND
- `supabase/functions/stripe-create-payment-intent/index.test.ts` — FOUND
- `lmc-app/app/lib/payments.ts` — FOUND
- Commit `96c2720` — FOUND (pricing.ts)
- Commit `5d846f1` — FOUND (RED tests)
- Commit `a4be2e3` — FOUND (GREEN implementation)
- Commit `b87a8f1` — FOUND (payments.ts client contract)
- `deno test --allow-env index.test.ts` — 5 passed, 0 failed
- `npx tsc --noEmit` from lmc-app/ — clean (no errors referencing payments.ts)
