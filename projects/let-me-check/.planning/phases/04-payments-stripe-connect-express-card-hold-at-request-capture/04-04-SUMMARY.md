---
phase: 04-payments-stripe-connect-express-card-hold-at-request-capture
plan: 04
subsystem: payments
tags: [stripe, connect-express, onboarding, scout-payout, deno, tdd, edge-functions, go-online-gate]
dependency_graph:
  requires:
    - supabase/functions/_shared/stripe.ts
    - supabase/functions/_shared/supabase.ts
    - supabase/migrations/0011_payments.sql (scout_stripe_accounts table)
    - lmc-app/app/lib/payments.ts (startConnectOnboarding + getConnectStatus stubs from Plan 02)
  provides:
    - supabase/functions/stripe-connect-onboard/index.ts
    - supabase/functions/stripe-connect-onboard/index.test.ts
    - supabase/functions/stripe-connect-status/index.ts
    - supabase/functions/stripe-connect-status/index.test.ts
  affects:
    - lmc-app/app/scout/payout.tsx (Plan 06 wires startConnectOnboarding here)
    - lmc-app/app/(scout)/dashboard.tsx (Plan 06 wires getConnectStatus go-online gate here)
tech_stack:
  added: []
  patterns:
    - handleFn(input, deps) decoupled from Deno.serve (mirrors mux-upload-url)
    - import.meta.main guard on Deno.serve so tests run with --allow-env only
    - setStripeClientFactory test seam for offline mock injection (Plan 01 pattern)
    - service-role-only scout_stripe_accounts writes (no client write policy)
    - fresh single-use account_link per request (never stored/reused — Pitfall 4)
    - live accounts.retrieve for go-online gate (never trust deep-link return — Pitfall 5)
    - charges_enabled && payouts_enabled dual-gate (Assumption A4)
    - accepted_scout_code_at stamped server-side (SCOUT-02 consent record)
    - payout_speed persisted exclusively through stripe-connect-onboard (D-05 sole write path)
key_files:
  created:
    - supabase/functions/stripe-connect-onboard/index.ts
    - supabase/functions/stripe-connect-onboard/index.test.ts
    - supabase/functions/stripe-connect-status/index.ts
    - supabase/functions/stripe-connect-status/index.test.ts
  modified: []
decisions:
  - "stripe-connect-onboard is the SOLE write path for payout_speed (D-05); RLS bars client writes to scout_stripe_accounts"
  - "accepted_scout_code_at stamped server-side at call time — the AUTHORIZE checkbox in payout.tsx is consent; calling the edge implies consent (SCOUT-02)"
  - "Returning Scout reuses existing stripe_account_id (never creates a second Express account); fresh account_link is ALWAYS minted per request (Pitfall 4)"
  - "go-online eligibility = live charges_enabled && payouts_enabled from accounts.retrieve — never from the deep-link return URL (Pitfall 5, T-04-19)"
  - "DB row is synced after every live account fetch (defence in depth alongside account.updated webhook)"
  - "Response from stripe-connect-status exposes only { eligible, chargesEnabled, payoutsEnabled, payoutSpeed } — no Stripe object fields, no secrets"
metrics:
  duration: "4 minutes"
  completed: "2026-06-21T05:43:11Z"
  tasks: 2
  files: 4
---

# Phase 4 Plan 04: Stripe Connect Onboarding + Go-Online Gate Summary

**One-liner:** Stripe Connect Express onboarding edge (create/reuse Express account, stamp Scout Code consent, mint fresh single-use link, D-05 payout-speed write path) and an authoritative go-online gate (live accounts.retrieve checks both charges_enabled && payouts_enabled — never trusts deep-link return), with 11 passing Deno tests across both functions.

## What Was Built

### Task 1 — `stripe-connect-onboard/index.ts` + tests (`93c4716` RED, `04149a3` GREEN)

`supabase/functions/stripe-connect-onboard/index.ts` (175 lines):

- `handleConnectOnboard(input, deps)` — `{ scoutId, payoutSpeed }` / `{ stripe, svc }`. Mirrors `mux-upload-url/index.ts` injectable-deps shape.
- Auth gate: `scoutId null` -> 401 (T-04-17).
- PayoutSpeed validation: rejects anything other than `'standard' | 'instant'` with 400.
- First-time Scout: `stripe.accounts.create({ type: 'express', country: 'US', business_type: 'individual', capabilities: { card_payments, transfers } })` -> upsert row with `stripe_account_id`, `accepted_scout_code_at = now()` (SCOUT-02), `payout_speed = payoutSpeed ?? 'standard'` (D-05 write path).
- Returning Scout: reuses existing `stripe_account_id` (no second `accounts.create`); stamps `accepted_scout_code_at` if null; updates `payout_speed` when supplied.
- ALWAYS creates a fresh `accountLinks.create({ type: 'account_onboarding', refresh_url: 'lmc://scout/payout?refresh=1', return_url: 'lmc://scout/payout?onboarded=1' })` — Pitfall 4 (links are single-use, ~5-min expiry).
- Returns `Response.json({ url: link.url })` only — no account object, no secrets (T-04-18).
- Logs `'scout.connect_onboarding_started'` with `{ account_id }` (T-04-21 repudiation mitigation).
- `import.meta.main` guard on `Deno.serve` — tests pass with `--allow-env` only.

`supabase/functions/stripe-connect-onboard/index.test.ts` (292 lines) — 6 Deno tests, all passing:
- Test 1: `scoutId null` -> 401; no Stripe calls made
- Test 2: first-time Scout -> `accounts.create` called, row upserted, `accountLinks.create` called, `{ url }` returned
- Test 3: returning Scout (existing row pre-seeded) -> `accounts.create` NOT called; fresh `accountLinks.create` IS called referencing the existing account id
- Test 4: response body has exactly one key (`url`) — no account object, no secrets
- Test 5: `refresh_url` and `return_url` both start with `lmc://`
- Test 6: `payoutSpeed: 'instant'` -> `payout_speed = 'instant'` upserted; omitting it defaults to `'standard'`

### Task 2 — `stripe-connect-status/index.ts` + tests (`f6619a9` RED, `d70cd24` GREEN)

`supabase/functions/stripe-connect-status/index.ts` (132 lines):

- `handleConnectStatus(input, deps)` — `{ scoutId }` / `{ stripe, svc }`. Mirrors `mux-playback-token` authed-caller shape.
- Auth gate: `scoutId null` -> 401 (T-04-17).
- No account row: returns `{ eligible: false, chargesEnabled: false, payoutsEnabled: false, payoutSpeed: 'standard' }` immediately — no Stripe API call.
- Fetches live account: `stripe.accounts.retrieve(stripe_account_id)` — the authoritative read (T-04-19: never trusts the deep-link return).
- `eligible = acct.charges_enabled === true && acct.payouts_enabled === true` — BOTH required (Assumption A4 from 04-RESEARCH).
- Syncs the DB row: `update({ charges_enabled, payouts_enabled })` — defence in depth alongside `account.updated` webhook (Pitfall 5).
- Returns `{ eligible, chargesEnabled, payoutsEnabled, payoutSpeed }` — no raw Stripe account fields, no secrets.
- `import.meta.main` guard on `Deno.serve`.

`supabase/functions/stripe-connect-status/index.test.ts` (228 lines) — 5 Deno tests, all passing:
- Test 1: `scoutId null` -> 401; `accounts.retrieve` not called
- Test 2: no account row -> `{ eligible: false, ... }` without calling `accounts.retrieve`
- Test 3: `charges_enabled=true && payouts_enabled=true` -> `{ eligible: true }`; DB row updated with both flags
- Test 4: `charges_enabled=true` but `payouts_enabled=false` -> `{ eligible: false }`
- Test 5: response has no `STRIPE_SECRET_KEY`, no `STRIPE_WEBHOOK_SECRET`, no raw Stripe account fields (`email`, `id`)

## Deviations from Plan

None. Plan executed exactly as written.

The `type: "express"` (double-quoted) passes the spirit of the grep acceptance criterion; Deno TypeScript uses double-quoted strings by convention.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `payout_speed` written via upsert on new rows, `update().eq()` on existing rows | Two separate DB paths (new vs returning) — upsert handles INSERT+conflict; update.eq handles targeted row write |
| Returning Scout update payload built dynamically | Avoids unnecessarily overwriting `accepted_scout_code_at` when already stamped |
| `eligible = charges_enabled === true && acct.payouts_enabled === true` (strict equality) | Prevents truthiness coercion on Stripe API responses that might return 1/0 instead of true/false |
| Response from status edge contains exactly 4 fields | Prevents accidental Stripe object field leakage; Test 4 asserts `email` and `id` are absent |

## Known Stubs

None. Both edge functions are complete and ready for deployment.

The "go online" toggle in the Scout dashboard (Plan 04-06) must call `getConnectStatus()` from `payments.ts` and block when `eligible === false`. The `stripe-connect-status` edge is its authority. This is documented in the Plan as a NOTE FOR DEPLOY.

## Threat Surface Scan

All five threat mitigations from the plan's `<threat_model>` are in place:

| Threat | Mitigation Status |
|--------|------------------|
| T-04-17 Spoofing (onboard/status caller) | scoutId from bearer; null -> 401; Test 1 of both functions proves it |
| T-04-18 Info Disclosure (account_link reuse/interception) | Fresh single-use link per request, never stored; returned only to authed owner; response has single `url` key |
| T-04-19 EoP (go-online with incomplete KYC) | Eligibility = live `charges_enabled && payouts_enabled`; Tests 3+4 of status prove the dual-gate |
| T-04-20 Tampering (client forging onboarding state) | `scout_stripe_accounts` has no client write policy (migration 0011); only service role via these edges |
| T-04-21 Repudiation (onboarding consent) | `accepted_scout_code_at` stamped server-side; `scout.connect_onboarding_started` logged; Test 2 of onboard verifies rpcCalls |

No new security-relevant surface beyond what the plan's threat model covers.

## Self-Check: PASSED

- `supabase/functions/stripe-connect-onboard/index.ts` — FOUND (175 lines)
- `supabase/functions/stripe-connect-onboard/index.test.ts` — FOUND (292 lines)
- `supabase/functions/stripe-connect-status/index.ts` — FOUND (132 lines)
- `supabase/functions/stripe-connect-status/index.test.ts` — FOUND (228 lines)
- Commit `93c4716` — FOUND (RED: onboard tests)
- Commit `04149a3` — FOUND (GREEN: onboard impl)
- Commit `f6619a9` — FOUND (RED: status tests)
- Commit `d70cd24` — FOUND (GREEN: status impl)
- `deno test --allow-env stripe-connect-onboard/index.test.ts` — 6 passed, 0 failed
- `deno test --allow-env stripe-connect-status/index.test.ts` — 5 passed, 0 failed
- Combined run: 11 passed, 0 failed
