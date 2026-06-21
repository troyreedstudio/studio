---
phase: 4
slug: payments-stripe-connect-express-card-hold-at-request-capture
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-21
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Detailed validation architecture lives in 04-RESEARCH.md; this is the execution contract.

> **Wave 0 note:** there is no separate Wave 0 plan. Each TDD task (tdd="true") in Plans 01–04 and 07
> writes its own failing test FIRST inside the same task (RED→GREEN), so the test stubs are created
> within the plans, not by a standalone scaffold plan. Stripe TEST-mode secrets are provisioned in
> Plan 05 (the [BLOCKING] deploy plan). This satisfies the Wave-0 requirements below.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Deno test (Edge Functions + shared helpers) + vitest/tsc (app/lib) |
| **Config file** | supabase/functions (deno); lmc-app (vitest/tsc) |
| **Quick run command** | `deno test --allow-env supabase/functions/_shared/` |
| **Full suite command** | `deno test --allow-env supabase/functions/ && cd lmc-app && npx tsc --noEmit` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** run that task's `<automated>` command (≤30s).
- **After every plan wave:** `deno test --allow-env supabase/functions/` + `cd lmc-app && npx tsc --noEmit`.
- **Before `/gsd-verify-work`:** full suite green + Stripe test-mode on-device smoke (hold, decline gate, capture, Connect onboarding, refund) — Plans 05 + 06 checkpoints.
- **Max feedback latency:** 30 seconds.

---

## Per-Task Verification Map

*Every auto task maps to an automated check. Checkpoint tasks (Plan 05 ×2, Plan 06 ×1) are manual gates, listed under Manual-Only Verifications.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | PAY-01..05/SCOUT-01/02 | T-04-03/04/05 | payments/refund/connect tables + RLS | grep | `grep -c "create table public.payments\|create table public.refund_requests\|create table public.scout_stripe_accounts" supabase/migrations/0011_payments.sql` (==3) | ❌ task creates | ⬜ pending |
| 4-01-02 | 01 | 1 | PAY-01..05 | T-04-01/02 | verifyStripeSignature + no-secret-leak | unit | `deno test --allow-env supabase/functions/_shared/stripe.test.ts` | ❌ task creates | ⬜ pending |
| 4-01-03 | 01 | 1 | DATA-03 | T-04-03 | schema/RLS pgTAP | unit | `grep -q "select plan(" supabase/tests/0011_payments.test.sql && grep -q "payments" supabase/tests/0011_payments.test.sql` | ❌ task creates | ⬜ pending |
| 4-02-01 | 02 | 2 | PAY-01 | T-04-06 | server-authoritative tier pricing | grep | `grep -q "export const TIER_PRICING" supabase/functions/_shared/pricing.ts && grep -q "seekerTotal: 1650" supabase/functions/_shared/pricing.ts` | ❌ task creates | ⬜ pending |
| 4-02-02 | 02 | 2 | PAY-01 | T-04-06/07/08/10 | manual-capture hold, no secret leak | unit | `deno test --allow-env supabase/functions/stripe-create-payment-intent/index.test.ts` | ❌ task creates | ⬜ pending |
| 4-02-03 | 02 | 2 | PAY-01/04/05 | — | client invoke contract | type | `cd lmc-app && npx tsc --noEmit` (no error in payments.ts) | ❌ task creates | ⬜ pending |
| 4-03-01 | 03 | 2 | PAY-02/03 | T-04-12/13/15/16 | capture + separate Transfer + D-09 | unit | `deno test --allow-env supabase/functions/stripe-capture/index.test.ts` | ❌ task creates | ⬜ pending |
| 4-03-02 | 03 | 2 | PAY-05 | T-04-11/13/14/15 | sig-verified disputes/account.updated | unit | `deno test --allow-env supabase/functions/stripe-webhook/index.test.ts` | ❌ task creates | ⬜ pending |
| 4-04-01 | 04 | 2 | SCOUT-01/02/PAY-03 | T-04-17/18/21 | Express account + account_link + consent + payout_speed | unit | `deno test --allow-env supabase/functions/stripe-connect-onboard/index.test.ts` | ❌ task creates | ⬜ pending |
| 4-04-02 | 04 | 2 | SCOUT-01/PAY-03 | T-04-19/20 | live charges_enabled go-online gate | unit | `deno test --allow-env supabase/functions/stripe-connect-status/index.test.ts` | ❌ task creates | ⬜ pending |
| 4-05-01 | 05 | 3 | PAY-02/03 | T-04-12 | capture trigger wired into mux-webhook | unit | `deno test --allow-env supabase/functions/mux-webhook/` | ✅ exists (edit) | ⬜ pending |
| 4-05-02 | 05 | 3 | PAY-01..05 | T-04-25 | live migration + regen types | grep | `grep -q "payments" lmc-app/app/lib/database.types.ts && grep -q "scout_stripe_accounts" lmc-app/app/lib/database.types.ts && grep -q "refund_requests" lmc-app/app/lib/database.types.ts` | regen | ⬜ pending |
| 4-05-03 | 05 | 3 | PAY-01..05 | T-04-22/23 | deploy 6 functions + test secrets | cli | `supabase functions list 2>/dev/null \| grep -Ec "stripe-create-payment-intent\|stripe-capture\|stripe-webhook\|stripe-connect-onboard\|stripe-connect-status\|stripe-refund"` (==6) | live | ⬜ pending |
| 4-06-01 | 06 | 4 | PAY-01 | T-04-26 | StripeProvider, New Arch off | type | `grep -q "@stripe/stripe-react-native" lmc-app/package.json && grep -q "StripeProvider" lmc-app/app/_layout.tsx` + `tsc --noEmit` | ❌ task creates | ⬜ pending |
| 4-06-02 | 06 | 4 | PAY-01/02 | T-04-26/27 | real PaymentSheet hold-then-createCheck | type | `grep -q "createPaymentHold" "lmc-app/app/(seeker)/payment.tsx" && grep -q "presentPaymentSheet" "lmc-app/app/(seeker)/payment.tsx"` + `tsc --noEmit` | ❌ task edits | ⬜ pending |
| 4-06-03 | 06 | 4 | SCOUT-01/PAY-03 | T-04-28/29 | real onboarding + eligible gate + payout speed | type | `grep -q "startConnectOnboarding" lmc-app/app/scout/payout.tsx && grep -q "eligible" lmc-app/app/scout/payout.tsx` + `tsc --noEmit` | ❌ task edits | ⬜ pending |
| 4-07-01 | 07 | 4 | PAY-04/05 | T-04-32 | pure evaluateRefund auto/review rule | unit | `deno test --allow-env supabase/functions/_shared/refund-rules.test.ts` (all 4 pass) | ❌ task creates | ⬜ pending |
| 4-07-02 | 07 | 4 | PAY-04/05 | T-04-31/33/34/35/36 | refund without reverse_transfer + ownership | unit | `deno test --allow-env supabase/functions/stripe-refund/index.test.ts` | ❌ task creates | ⬜ pending |
| 4-07-03 | 07 | 4 | PAY-05 | T-04-31 | reason picker -> requestRefund outcome | type | `grep -q "requestRefund" "lmc-app/app/(seeker)/delivery.tsx" && grep -Eq "blurry\|wrong_location\|never_delivered" "lmc-app/app/(seeker)/delivery.tsx"` + `tsc --noEmit` | ❌ task edits | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Sampling continuity:** every row above has an automated verify — no run of 3 consecutive tasks lacks one.

---

## Wave 0 Requirements

- [x] Edge-function test stubs created inside each TDD task (Plans 01–04, 07) — RED-first within the task.
- [x] `supabase/functions/_shared/stripe.test.ts` — covered by task 4-01-02.
- [x] `supabase/functions/_shared/refund-rules.test.ts` — covered by task 4-07-01 (mandatory).
- [x] Stripe TEST-mode keys (Edge secrets) — provisioned in Plan 05 (the [BLOCKING] deploy plan).
- [x] Deno test harness mirrors the Phase-3 Mux function tests (same setX-ClientFactory + no-leak pattern).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Provide Stripe TEST credentials | deploy gate | Needs Troy's keys | Plan 05 checkpoint 1: supply sk_test/pk_test + Supabase token |
| Register Stripe webhook + signing secret | PAY-05 | Stripe Dashboard | Plan 05 checkpoint 2: register endpoint, set STRIPE_WEBHOOK_SECRET, test event returns 200 / forged returns 401 |
| Apple Pay / Google Pay sheet | How-Seekers-pay | Needs device + EAS build | Plan 06 checkpoint: open payment, confirm Apple/Google Pay row, pay with a Stripe test card |
| Decline-card gate (Uber-style) | D-02 | End-to-end UI + Stripe | Plan 06 checkpoint: decline card 4000 0000 0000 0002, booking blocked + re-prompt |
| Capture on delivery | D-03 | Mux test asset + Stripe | Plan 06 checkpoint: drive to delivered, PI moves to succeeded + Transfer appears |
| Connect Express onboarding + go-online | D-04/D-05/SCOUT-01 | Hosted Stripe flow | Plan 06 checkpoint: complete test onboarding, go-online unlocks only when eligible |

---

## Validation Sign-Off

- [x] All auto tasks have an automated verify (19/19 mapped above)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covered (test stubs inside TDD tasks; secrets in Plan 05)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (revised per gsd-plan-checker, 2026-06-21)
