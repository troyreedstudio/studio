---
phase: 04-payments-stripe-connect-express-card-hold-at-request-capture
plan: 06
subsystem: payments-ui
tags: [stripe, stripe-react-native, payment-sheet, connect-express, onboarding, go-online-gate, payout-speed]
dependency_graph:
  requires:
    - lmc-app/app/lib/payments.ts (createPaymentHold, startConnectOnboarding, getConnectStatus — Plans 02/04)
    - lmc-app/app/lib/checks.ts (createCheck)
    - supabase/functions/stripe-create-payment-intent (Plan 02)
    - supabase/functions/stripe-connect-onboard (Plan 04)
    - supabase/functions/stripe-connect-status (Plan 04)
  provides:
    - lmc-app/app/_layout.tsx (StripeProvider wrapping entire app)
    - lmc-app/app/(seeker)/payment.tsx (real PaymentSheet hold-then-createCheck gate)
    - lmc-app/app/scout/payout.tsx (real Connect onboarding + server go-online gate)
    - lmc-app/app/lib/config.ts (STRIPE_PUBLISHABLE_KEY always-bundled)
  affects:
    - lmc-app/app.config.js (stripe-react-native config plugin added)
    - lmc-app/package.json (@stripe/stripe-react-native 0.50.3, expo-web-browser ~15.0.11)
tech_stack:
  added:
    - "@stripe/stripe-react-native 0.50.3 (expo install pinned, Expo 54 compatible, New Arch OFF)"
    - "expo-web-browser ~15.0.11 (openAuthSessionAsync for Connect hosted onboarding)"
  patterns:
    - "StripeProvider at root with publishable key from always-bundled config.ts (same pattern as SUPABASE/MAPBOX)"
    - "hold-then-createCheck: initPaymentSheet -> presentPaymentSheet -> createCheck (D-01 order)"
    - "payErr.code !== 'Canceled' to distinguish decline from user-cancel on D-02 alert"
    - "WebBrowser.openAuthSessionAsync + server eligibility check (never trust deep-link return — Pitfall 5)"
    - "startConnectOnboarding(speed) as D-05 sole payout-speed write path"
key_files:
  created: []
  modified:
    - lmc-app/package.json
    - lmc-app/app.config.js
    - lmc-app/app/lib/config.ts
    - lmc-app/app/_layout.tsx
    - lmc-app/app/(seeker)/payment.tsx
    - lmc-app/app/scout/payout.tsx
decisions:
  - "STRIPE_PUBLISHABLE_KEY added to config.ts with process.env override + hardcoded pk_test fallback — same release-safe pattern as SUPABASE_URL/MAPBOX_TOKEN"
  - "New Architecture stays OFF: @stripe/stripe-react-native 0.50.3 lacks New Arch support (plan pinned this)"
  - "Payment method row and CTA both call handleConfirm — single entry point to the real PaymentSheet flow"
  - "payErr.code check: Canceled is silent (user dismissed), any other code shows the D-02 alert with Try Again"
  - "Scout payout loading/verifying states shown on the CTA button label so the user sees progress"
metrics:
  duration: "15 minutes"
  completed: "2026-06-21T07:00:00Z"
  tasks: 3
  files: 6
---

# Phase 4 Plan 06: Stripe UI Wiring Summary

**One-liner:** StripeProvider wraps the app using an always-bundled publishable key, the seeker payment screen presents a real PaymentSheet hold before creating any check (D-01/D-02), and the scout payout screen launches real Stripe Connect hosted onboarding via expo-web-browser with a live server eligibility gate before routing forward (SCOUT-01/D-05).

## What Was Built

### Task 1 — SDK install + StripeProvider + config key (`fec96b7`)

- `npx expo install @stripe/stripe-react-native` → pinned to 0.50.3 (Expo 54 compatible)
- `npx expo install expo-web-browser` → ~15.0.11
- `app/lib/config.ts`: `STRIPE_PUBLISHABLE_KEY` exported with `process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? 'pk_test_...'` fallback — same always-bundled pattern as `SUPABASE_URL` and `MAPBOX_TOKEN`, ensures release builds work without `.env` or `expo-constants`
- `app.config.js`: `['@stripe/stripe-react-native', { merchantIdentifier: 'merchant.com.blackmalibuinc.letmecheck', enableGooglePay: true }]` added to plugins; `newArchEnabled` is absent (defaults false — New Arch stays OFF)
- `app/_layout.tsx`: root `Stack` wrapped in `<StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier="merchant.com.blackmalibuinc.letmecheck" urlScheme="lmc">` — does not disturb `SessionProvider`, fonts, or `BootGate`

### Task 2 — Real PaymentSheet hold-then-createCheck gate (`aa1d2cf`)

`app/(seeker)/payment.tsx` rewritten (971 lines → 274 lines):

- **Removed:** hand-rolled `PaymentSheet` modal component, `formatCardNumber`, `formatExpiry`, `detectBrand` helpers, all mock card entry state (`cardNumber`, `expiry`, `cvc`, `zip`), and the `Modal`/`TextInput`/`KeyboardAvoidingView`/`Animated`/`Easing`/`ScrollView` imports that were only used by the mock sheet
- **Added:** `useStripe()` hook providing `initPaymentSheet` + `presentPaymentSheet`; `createPaymentHold` import from `payments.ts`
- **Flow (D-01 order, grep-asserted):**
  1. `createPaymentHold(tier)` — server creates a manual-capture PaymentIntent and returns `{ clientSecret, customerId, ephemeralKey, paymentIntentId }`
  2. `initPaymentSheet({ merchantDisplayName, paymentIntentClientSecret, customerId, customerEphemeralKeySecret, applePay, googlePay, allowsDelayedPaymentMethods: false })`
  3. `presentPaymentSheet()` — real Stripe UI (Apple Pay / Google Pay / card)
  4. `payErr` guard (D-02): declined/invalid card shows "Card couldn't be authorized" Alert and returns — `createCheck` is never called
  5. `createCheck(...)` — only runs after a successful hold (line 83 vs line 99 in the file)
- **T-04-26 mitigated:** `formatCardNumber` grep gate passes; no raw PAN ever enters our code
- Order summary, recurring toggle, delivery card, and payment method display row all preserved

### Task 3 — Real Connect onboarding + go-online gate (`228b208`)

`app/scout/payout.tsx` updated:

- **Removed:** `Alert.alert('Open Stripe Connect', ...)` stub that bypassed real onboarding
- **Added:** `expo-web-browser` import, `startConnectOnboarding`/`getConnectStatus` imports from `payments.ts`, `loading` + `verifying` state for button label feedback
- **Flow (SCOUT-01/D-05):**
  1. `startConnectOnboarding(speed)` — passes chosen payout speed to the `stripe-connect-onboard` edge (D-05 sole write path; RLS bars any direct client write to `scout_stripe_accounts`)
  2. `WebBrowser.openAuthSessionAsync(url, 'lmc://')` — opens Stripe hosted onboarding in-app
  3. `getConnectStatus()` — live server read of `accounts.retrieve`; never trusts the deep-link return (Pitfall 5 / T-04-28)
  4. `status.eligible` (both `charges_enabled && payouts_enabled`) → `router.push('/scout/rules')`; not eligible → Alert with retry or later
- **SCOUT-02 preserved:** AUTHORIZE checkbox is the Scout Code consent UI; `accepted_scout_code_at` is stamped server-side by the `stripe-connect-onboard` edge when called
- No direct `scout_stripe_accounts` writes from client (grep gate passes)
- All existing copy preserved: earnings grid, tax compliance, trust bullets, progress dots, WF badge

## Deviations from Plan

None. Plan executed exactly as written.

Minor implementation detail: the "payment method" display row in `payment.tsx` now also calls `handleConfirm` directly (same as the CTA button) — tapping "Change" opens the real PaymentSheet rather than a separate card-entry modal. This is simpler and correct: the PaymentSheet itself lets the user pick/change their payment method.

## Known Stubs

None for this plan. The PaymentSheet is real (Stripe-hosted); Connect onboarding is real (Stripe-hosted). The only remaining stub in the broader flow is the capture-on-delivery trigger (wired in Plan 05 via `mux-webhook`).

## Threat Surface Scan

All five threat mitigations from the plan's `<threat_model>` are in place:

| Threat | Mitigation Status |
|--------|------------------|
| T-04-26 Info Disclosure (card PAN) | Mock card entry removed; `formatCardNumber` grep gate passes; PaymentSheet is Stripe-hosted |
| T-04-27 Tampering (book without hold) | `createCheck` only runs after `presentPaymentSheet` succeeds — `payErr` guard returns before line 99 |
| T-04-28 EoP (go online without KYC) | `getConnectStatus()` live server read gates `router.push`; deep-link return alone is never trusted |
| T-04-29 Spoofing (forge onboarding) | `eligible` is a live `accounts.retrieve` result from the server; client cannot self-assert it |
| T-04-30 Info Disclosure (publishable vs secret) | `STRIPE_PUBLISHABLE_KEY` is public by design; secret key stays in Edge Functions (Deno.env) |

No new security-relevant surface introduced.

## Checkpoint: On-Device Verification Required

This plan stops here. The three auto tasks are committed and tsc-clean. The real PaymentSheet, Apple Pay sheet, Google Pay, and Stripe Connect hosted onboarding can only be verified on an EAS dev build — none of these work in Expo Go.

See the checkpoint block below for the exact device test steps.

## Self-Check: PASSED

- `lmc-app/app/lib/config.ts` — FOUND, contains STRIPE_PUBLISHABLE_KEY
- `lmc-app/app/_layout.tsx` — FOUND, contains StripeProvider
- `lmc-app/app.config.js` — FOUND, contains merchant.com.blackmalibuinc.letmecheck, newArchEnabled absent
- `lmc-app/app/(seeker)/payment.tsx` — FOUND, createPaymentHold line 83, createCheck line 99, formatCardNumber absent
- `lmc-app/app/scout/payout.tsx` — FOUND, startConnectOnboarding(speed), openAuthSessionAsync, eligible gate
- Commit `fec96b7` — FOUND (Task 1: SDK + StripeProvider)
- Commit `aa1d2cf` — FOUND (Task 2: payment.tsx real gate)
- Commit `228b208` — FOUND (Task 3: payout.tsx real onboarding)
- `npx tsc --noEmit` — exit 0 (clean)
- All 15 grep acceptance criteria — PASS
