---
phase: 04-payments-stripe-connect-express-card-hold-at-request-capture
plan: 05
subsystem: payments
tags: [stripe, supabase-edge-functions, webhooks, deploy, mux-webhook, capture-on-delivery, deno, migration]

# Dependency graph
requires:
  - phase: 04-01
    provides: _shared/stripe.ts, verifyStripeSignature, migration 0011_payments.sql
  - phase: 04-02
    provides: payments.ts typed contracts (requestRefund/startConnectOnboarding/getConnectStatus)
  - phase: 04-03
    provides: stripe-create-payment-intent, stripe-capture, stripe-webhook edges
  - phase: 04-04
    provides: stripe-connect-onboard, stripe-connect-status edges
  - phase: 03
    provides: mux-webhook (the delivered driver) + Edge Function deploy recipe
provides:
  - Migration 0011 applied live to project cawqasszfbzvbtunamda
  - Regenerated lmc-app/app/lib/database.types.ts (payments, refund_requests, scout_stripe_accounts)
  - All six payment-related Edge Functions deployed ACTIVE in Stripe TEST mode
  - mux-webhook now triggers stripe-capture after the delivered transition (capture-on-delivery live)
  - Registered Stripe webhook endpoint with live signing secret + 401-on-forged proof
affects: [04-06, 04-07, phase-05, phase-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "import.meta.main guard on every Edge Function Deno.serve (so deno test --allow-env can import)"
    - "Webhooks deployed with --no-verify-jwt (own signature verify); user/service functions keep JWT"
    - "Service-role functions.invoke for internal triggers (mux-webhook -> stripe-capture)"
    - "Secrets via supabase secrets set ONLY; publishable key in gitignored .env; nothing secret committed"

key-files:
  created:
    - .planning/phases/04-payments-stripe-connect-express-card-hold-at-request-capture/04-05-SUMMARY.md
  modified:
    - supabase/functions/mux-webhook/index.ts
    - supabase/functions/mux-webhook/index.test.ts
    - lmc-app/app/lib/database.types.ts

key-decisions:
  - "Capture-on-delivery wired as a fault-tolerant service-role functions.invoke inside mux-webhook (D-03); a capture hiccup never undoes the delivered transition"
  - "Webhooks (mux-webhook, stripe-webhook) deployed --no-verify-jwt; the other four functions keep Supabase JWT verification"
  - "stripe-capture keeps verify_jwt: true — it is invoked by mux-webhook's service-role client (valid JWT), barring anonymous callers"
  - "stripe-refund NOT deployed this plan — its code is a Plan 07 deliverable; Plan 07 must create AND deploy it"

patterns-established:
  - "Pattern: import.meta.main guard added to Phase 3 mux-webhook so its Deno tests run without binding a port"
  - "Pattern: deploy webhooks separately with --no-verify-jwt from authed functions"

requirements-completed: [PAY-01, PAY-02, PAY-03, PAY-05, SCOUT-01]

# Metrics
duration: ~35min (across two checkpoint pauses for Troy's credentials)
completed: 2026-06-21
---

# Phase 4 Plan 05: Payments Go-Live (Stripe TEST mode) Summary

**Migration 0011 applied live, DB types regenerated, all six payment Edge Functions deployed ACTIVE in Stripe TEST mode, Stripe webhook registered with live signing secret, and capture-on-delivery wired into the Mux delivery webhook — the money flow now runs end-to-end against Stripe's test environment.**

## Performance

- **Duration:** ~35 min (wall time spanned two human-action checkpoints for Stripe credentials)
- **Completed:** 2026-06-21
- **Tasks:** 4 (3 auto + the final webhook-registration human-verify)
- **Files modified:** 3 (+ this SUMMARY)

## Accomplishments

- **Capture-on-delivery is live** — `mux-webhook` now invokes `stripe-capture` (service-role, fault-tolerant) immediately after driving the check to `delivered`.
- **Migration 0011 applied** to the linked project `cawqasszfbzvbtunamda`; `database.types.ts` regenerated and now carries `payments`, `refund_requests`, `scout_stripe_accounts`.
- **Six Edge Functions deployed ACTIVE** in Stripe TEST mode.
- **Stripe webhook registered** with its live `whsec_` signing secret set as an Edge secret; signature verification proven live (forged event → 401).
- **No secrets committed** — Stripe keys live only in Supabase Edge secrets / gitignored `.env`.

## Deployed Functions (project `cawqasszfbzvbtunamda`)

| Function | verify_jwt | Role |
|----------|-----------|------|
| `mux-webhook` (v6, capture trigger added) | false | Mux calls it; own signature verify; now triggers stripe-capture |
| `stripe-webhook` | false | Stripe calls it; own signature verify (whsec live) |
| `stripe-create-payment-intent` | true | Seeker-called (card hold at request) |
| `stripe-capture` | true | Service-role invoked by mux-webhook on delivery |
| `stripe-connect-onboard` | true | Scout-called (Connect Express onboarding) |
| `stripe-connect-status` | true | Scout-called (go-online eligibility gate) |

**NOT deployed:** `stripe-refund` — its code is a **Plan 07 deliverable** and does not yet exist in the repo. Plan 07 must create AND deploy it. Until then, `delivery.tsx`'s refund call will 404 (expected this wave).

## Live URLs

- **stripe-webhook (registered endpoint):** `https://cawqasszfbzvbtunamda.supabase.co/functions/v1/stripe-webhook`
- All functions are reachable at `https://cawqasszfbzvbtunamda.supabase.co/functions/v1/<name>`.

## Webhook Verification

- `STRIPE_WEBHOOK_SECRET` (whsec_...) is **set** in Supabase Edge secrets; `stripe-webhook` redeployed so the secret is live.
- **Forged/unsigned POST → HTTP 401 "bad signature"** (verified via curl) — proves signature verification is active (T-04-23 spoofing mitigation live).
- **Human-verify remaining (optional, Troy can do anytime):** click "Send test webhook" (`account.updated`) in the Stripe Dashboard and confirm it returns **200**. A real signed event passes verification; a forged one returns 401.

## Task Commits

1. **Task 1: Wire capture trigger into mux-webhook** — `a8f4009` (feat)
2. **Task 2: Push migration 0011 + regenerate DB types** — `7b50b8e` (feat)
3. **Task 3: Set Stripe secret + deploy functions** — deploy/secrets action (no source change; secret in Supabase, pk_test in gitignored .env)
4. **Webhook registration + whsec live** — secret-set + redeploy action (no source change)

**Plan metadata:** (this commit — docs)

## Files Created/Modified

- `supabase/functions/mux-webhook/index.ts` — added fault-tolerant `functions.invoke('stripe-capture', { body: { checkId } })` after the delivered transition; added `import.meta.main` guard on Deno.serve.
- `supabase/functions/mux-webhook/index.test.ts` — extended mockSvc with `functions.invoke` stub; added 2 tests (D-03 trigger fires + capture failure is fault-tolerant). 5/5 pass.
- `lmc-app/app/lib/database.types.ts` — regenerated from the linked project; now includes the three payments tables.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Capture trigger is a service-role `functions.invoke`, wrapped in try/catch | D-03: capture on delivery; a capture hiccup must NOT undo the delivered transition (clip already delivered; stripe-capture's D-09 still pays the Scout) |
| Webhooks deployed `--no-verify-jwt`; the four user/service functions keep JWT | Stripe/Mux are not authed Supabase users — they carry their own signature; the other functions need Supabase auth |
| `stripe-capture` keeps `verify_jwt: true` | It is invoked by mux-webhook's service-role client (a valid JWT); keeping JWT on bars anonymous direct callers |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] stripe-refund could not be deployed (code does not exist yet)**
- **Found during:** Task 3 (function deploy)
- **Issue:** The plan listed `stripe-refund` as the 6th function to deploy, but its source is a **Plan 07 deliverable** not yet in the repo (`supabase/functions/stripe-refund/` does not exist).
- **Fix:** Deployed the six functions that exist (5 stripe-* + mux-webhook) and deferred stripe-refund to Plan 07, which must create AND deploy it.
- **Files modified:** none (deploy-time decision)
- **Verification:** `supabase functions list` shows the six live functions; stripe-refund absent.
- **Impact:** `delivery.tsx`'s refund call will 404 until Plan 07 ships — expected this wave.

**2. [Rule 1 - Bug] mux-webhook lacked an import.meta.main guard**
- **Found during:** Task 1 (running the Deno tests)
- **Issue:** The original Phase 3 `mux-webhook` called `Deno.serve` at module top level; importing it in tests tried to bind a port → all tests failed with NotCapable net-access error.
- **Fix:** Wrapped `Deno.serve` in `if (import.meta.main)` (the same guard every Phase 4 function uses).
- **Files modified:** `supabase/functions/mux-webhook/index.ts`
- **Verification:** `deno test --allow-env supabase/functions/mux-webhook/` → 5 passed, 0 failed.
- **Committed in:** `a8f4009` (Task 1 commit)

---

**Total deviations:** 2 (1 blocking dependency deferral, 1 bug auto-fix)
**Impact on plan:** No scope creep. stripe-refund deferral is a genuine cross-plan dependency (Plan 07 owns it); the import.meta.main fix was required to run the tests.

## Issues Encountered

- **Docker not running** warnings during `db push` and `functions deploy` — cosmetic. Docker is only needed for the local migration-catalog cache; the remote push/deploy completed successfully without it.
- **Duplicate "thin" webhook destination in Stripe** — Troy reported a second, thin-payload webhook destination exists alongside the registered snapshot one. It is cosmetic (the active endpoint points at the correct stripe-webhook URL); the thin duplicate should be deleted in the Stripe Dashboard to avoid confusion. Not blocking.

## User Setup Required

Complete for this phase (Troy provided credentials via the orchestrator):
- `STRIPE_SECRET_KEY` (sk_test) — set in Supabase Edge secrets.
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test) — in gitignored `lmc-app/.env` (04-06 wires it into the app's Stripe PaymentSheet).
- `STRIPE_WEBHOOK_SECRET` (whsec) — set in Supabase Edge secrets; stripe-webhook redeployed.

**Optional Troy follow-ups:**
- Click "Send test webhook" (account.updated) in the Stripe Dashboard to see a 200 (human-verify).
- Delete the duplicate thin webhook destination (cosmetic).

## Next Phase Readiness

- **04-06 (app wiring):** can now consume `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` and call the live stripe-create-payment-intent / connect-onboard / connect-status functions.
- **04-07 (refunds):** must create `supabase/functions/stripe-refund/` AND deploy it (this plan deployed everything else).
- **DEFERRED LAUNCH GATE:** switching to live Stripe keys requires the US entity + EIN + a verified live Stripe platform account (per OUTSTANDING.md). Test mode only this phase — no real money can move.

## Self-Check: PASSED

- `04-05-SUMMARY.md` — FOUND
- `supabase/functions/mux-webhook/index.ts` — FOUND (capture trigger + import.meta.main guard)
- `lmc-app/app/lib/database.types.ts` — FOUND (payments/refund_requests/scout_stripe_accounts)
- Commit `a8f4009` (Task 1 capture trigger) — FOUND
- Commit `7b50b8e` (Task 2 types) — FOUND
- `deno test --allow-env supabase/functions/mux-webhook/` — 5 passed, 0 failed
- 6 Edge Functions ACTIVE; forged stripe-webhook POST → 401

---
*Phase: 04-payments-stripe-connect-express-card-hold-at-request-capture*
*Completed: 2026-06-21*
