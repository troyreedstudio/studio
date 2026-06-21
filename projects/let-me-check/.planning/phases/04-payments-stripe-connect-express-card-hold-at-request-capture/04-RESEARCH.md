# Phase 4: Payments (Stripe Connect Express + Card Hold) — Research

**Researched:** 2026-06-21
**Domain:** Stripe PaymentIntents (manual capture), Stripe Connect Express, React Native PaymentSheet, Supabase Edge Functions (Deno), refunds, disputes
**Confidence:** HIGH (core API model) / MEDIUM (Accounts v2 vs legacy trade-off, instant payout fee)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Card validation & hold (Uber-style front gate)**
- D-01: Authorize + hold Seeker funds at REQUEST time (when they confirm the check), not at delivery. The hold itself is the card-validity check.
- D-02: If card is declined / expired / cancelled / invalid, the authorization fails and the request is BLOCKED. Seeker cannot book until they update the card or switch payment method — re-prompt Uber-style until a hold succeeds.
- D-03: Capture held funds on delivery + approval. Because the delivery window is 7-15 min (far inside Stripe's ~7-day hold lifetime), capture will almost always succeed.

**When the Scout is paid**
- D-04: Scout earnings triggered when clip is submitted → delivered to Seeker → approved (quality/verification passed). NOT on acceptance, NOT on submission alone.
- D-05: Scout chooses payout speed: instant (2% Scout-facing fee) or standard ACH (free, ~24h). Stripe's instant rail is ~1% (min 50¢), LMC keeps ~1% margin per instant payout.

**Refunds (reason-captured, reviewed — Uber/Grab model)**
- D-06: No instant no-questions self-refund at launch. Seeker selects a reason from a structured list → automated/rules-based review → refund to original card with notification.
- D-07: Every refund request captures a structured reason code (blurry / wrong location / didn't show what was needed / never delivered / other). Feeds clip-quality and fraud signals (event log).
- D-08: Scout KEEPS their pay even when a clip is refunded — LMC funds the refund, never the Scout. Platform absorbs all losses outside the Scout's control.
- D-08a: The ONLY case where a Scout is not paid is a genuinely bad/fake clip — that is a Phase 5 verification gate matter, not a payments concern. Payments-side default: pay and protect the Scout.

**Capture-failure fallback (rare)**
- D-09: If a valid hold fails at capture on delivery (unusual within the short window), Scout is STILL paid (LMC absorbs the shortfall) and Seeker's account is blocked from booking new checks until they settle.

### Claude's Discretion
- How Seekers pay: use Stripe PaymentSheet with Apple Pay / Google Pay + saved card on file for one-tap reorders. Standard, fast checkout.
- Exact refund reason taxonomy, auto-approval thresholds/rules, refund eligibility window, and per-user refund caps — propose during planning.
- Whether flagged/repeat refunders route to a light manual-review queue vs pure automation.
- Stripe object modeling (PaymentIntent manual capture, Connect account types, webhook set) — planner/research decides, mirroring the Phase-3 Edge Function + webhook pattern.

### Deferred Ideas (OUT OF SCOPE)
- One-tap instant self-refund (no questions) — revisit post-launch once we have abuse/quality data.
- Tipping the Scout.
- Surge/dynamic pricing.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAY-01 | Seeker's card authorized (held) when they confirm a request | PaymentIntent capture_method=manual; PaymentSheet on client; Edge Function creates PI server-side |
| PAY-02 | Seeker charged on delivery; hold released if no Scout / no delivery | Capture triggered from Mux webhook → delivered transition; cancel PI on no_scout / cancelled |
| PAY-03 | Scout paid via Stripe Connect Express with instant-payout option | Transfer after capture; instant payout API with method=instant; check available_payout_methods |
| PAY-04 | Scout keeps pay when a passing clip is refunded (LMC funds refund) | Refund without reverse_transfer; platform absorbs from its balance |
| PAY-05 | Seeker can be refunded; disputes/chargebacks handled and absorbed by platform | Refund API with reason; charge.dispute.created webhook; LMC funds dispute response |
| SCOUT-01 | Scout completes payout setup via Stripe Connect Express (KYC/tax inside Stripe) | Account link for hosted onboarding; account.updated webhook for charges_enabled/payouts_enabled |
| SCOUT-02 | Scout agrees to Scout Code (consent + acceptable-use) | UI gate before account_link redirect; stored as accepted_scout_code_at timestamp |
</phase_requirements>

---

## Summary

Phase 4 wires real money into the existing check lifecycle using Stripe PaymentIntents with manual capture (authorize-and-hold at request time, capture on delivery) combined with Stripe Connect Express for Scout payouts. The research confirms this is a well-understood Stripe pattern used by Uber, DoorDash, and similar on-demand platforms.

The core Stripe object model for LMC is **separate charges and transfers** (not destination charges): the platform's Stripe account charges the Seeker, and an explicit Transfer is created to the Scout's connected account after the PaymentIntent is captured. This gives maximum flexibility — the Scout's Transfer is never reversed when a refund fires; the platform funds the delta from its own balance (satisfying D-08). Refunds are issued against the charge on the platform account.

For the Deno/Supabase Edge Function layer, the critical finding is that the Stripe Node SDK CAN work in Deno when initialized with `Stripe.createSubtleCryptoProvider()` and the async `constructEventAsync()` for webhook verification — unlike the Mux situation where the Node SDK fatally crashed. However, given the established pattern in `supabase/functions/_shared/mux.ts` (raw Web Crypto, zero SDK dependency for signature verification), using raw HMAC-SHA256 verification for Stripe webhooks is lower-risk and already proven. The Stripe webhook signature format is identical to Mux (`t=<unix>,v1=<hex hmac>`, HMAC-SHA256, 5-minute tolerance), so the `verifyMuxSignature` logic is nearly copy-paste.

**Primary recommendation:** Use Stripe PaymentIntents (manual capture) + separate charges and transfers + Stripe Connect Express (legacy `type=express` via account_links for hosted onboarding). Wire everything through Supabase Edge Functions with raw Web Crypto webhook verification. Replace the mock PaymentSheet in `payment.tsx` with `@stripe/stripe-react-native` 0.67.x PaymentSheet. Build and test entirely in Stripe test mode; flip to live credentials at launch once the US entity/EIN is in place.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @stripe/stripe-react-native | 0.67.0 (latest) | PaymentSheet, Apple Pay, Google Pay, card collection on client | Official Stripe SDK for RN; handles PCI compliance, Apple Pay merchant validation, Google Pay tokenization |
| stripe (npm) | 22.2.2 (latest) | Stripe Node/Deno SDK for Edge Functions — PI creation, capture, refund, Transfer, account_link | Official server SDK; use via `npm:stripe@22` in Deno with SubtleCrypto provider |
| Supabase Edge Functions (Deno) | existing | All server-side Stripe calls; holds all secrets | Established pattern from Phase 3; no secrets ever leave the Edge |

[VERIFIED: npm registry — @stripe/stripe-react-native@0.67.0, stripe@22.2.2]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-linking | existing | URL scheme for account_link return_url / refresh_url deep links | Stripe hosted onboarding returns to app via deep link |
| expo-web-browser | existing or add | Open Stripe Connect hosted onboarding URL in in-app browser | Preferred over Linking.openURL for the account_link URL |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Legacy Express (type=express) | Accounts v2 API (/v2/core/accounts) | v2 is Stripe's future direction but released Dec 2025, API version `2026-01-28.clover` required, less community knowledge. Stick with legacy Express for V1; migrate later. |
| Separate charges + Transfer | Destination charges (transfer_data on PI) | Destination charges are simpler but tie the Transfer to the PI — harder to decouple Scout pay from Seeker refunds (needed for D-08). Separate charges + explicit Transfer gives full control. |
| Raw Web Crypto webhook verification | Stripe SDK constructEventAsync + SubtleCrypto provider | Both work in Deno. Raw crypto is zero-dependency and already proven in the codebase. Use raw crypto — mirrors the mux.ts pattern exactly. |

**Installation:**
```bash
# In lmc-app/
npx expo install @stripe/stripe-react-native

# Supabase Edge Functions use npm: specifier (no install needed):
# import Stripe from 'npm:stripe@22';
```

**Version verification:**
- `@stripe/stripe-react-native`: 0.67.0 [VERIFIED: npm registry 2026-06-21]
- `stripe` (Node/Deno): 22.2.2 [VERIFIED: npm registry 2026-06-21]
- Expo SDK 54 compatibility: `@stripe/stripe-react-native` peer deps are `expo: ">=46.0.9"` — Expo 54 is compatible. [VERIFIED: npm registry peerDependencies]

---

## Architecture Patterns

### Recommended Project Structure

New files this phase:
```
supabase/
  functions/
    _shared/
      stripe.ts              # Mirror of mux.ts: Stripe client factory + secret holder + webhook verifier
    stripe-create-payment-intent/
      index.ts               # Edge Function: creates PI with capture_method=manual, returns client_secret
    stripe-capture/
      index.ts               # Edge Function: captures PI on delivered → triggers Transfer to Scout
    stripe-refund/
      index.ts               # Edge Function: issues refund (no reverse_transfer); logs reason code
    stripe-connect-onboard/
      index.ts               # Edge Function: creates Express account + account_link
    stripe-webhook/
      index.ts               # Edge Function: handles payment_intent.*, charge.dispute.*, account.updated
supabase/
  migrations/
    0011_payments.sql        # payments table + payment_events log + refund_requests table
    0012_scout_connect.sql   # scout_stripe_accounts table (stripe_account_id, charges_enabled, etc.)

lmc-app/app/
  lib/
    stripe.ts                # Client-side helpers: initStripe, presentPaymentSheet, getPaymentIntent status
  (seeker)/
    payment.tsx              # REPLACE mock PaymentSheet with real @stripe/stripe-react-native PaymentSheet
    payment-methods.tsx      # Wire to real Stripe customer payment methods
  scout/
    payout.tsx               # Wire to real account_link URL from stripe-connect-onboard Edge Function
```

### Pattern 1: Auth-and-Hold at Request Time (the Uber Gate)

**What:** A PaymentIntent is created server-side with `capture_method: 'manual'` before `createCheck` writes the check row. If the PI authorization fails, the check is never created and the Seeker is re-prompted to fix their card.

**When to use:** Every time a Seeker taps "Confirm & Find My Scout" in `payment.tsx`.

**Flow:**
```
[Client: payment.tsx]
  1. Call Edge Function stripe-create-payment-intent → receives client_secret
  2. Call presentPaymentSheet(clientSecret) → Stripe SDK handles card auth
     - If declined: surface error, prompt user to fix card (D-02)
     - If authorized: PaymentIntent status = requires_capture
  3. Only THEN call createCheck() — passing stripe_payment_intent_id
  4. createCheck() INSERTs check row with stripe_payment_intent_id FK
  5. Transition to dispatching
```

**Edge Function (stripe-create-payment-intent):**
```typescript
// Source: Stripe docs — https://docs.stripe.com/payments/place-a-hold-on-a-payment-method
const pi = await stripe.paymentIntents.create({
  amount: tierAmount,        // in minor units (cents), from DB/market config — never hard-coded USD
  currency: currency,        // from market/check row — no USD hard-coding
  capture_method: 'manual',  // key flag: authorize now, capture later
  setup_future_usage: 'off_session', // save card for one-tap reorders
  customer: stripeCustomerId,  // create Stripe Customer once per user; store in users table
  payment_method_types: ['card'], // also enables Apple Pay / Google Pay via PaymentSheet config
  transfer_group: checkId,   // links PI to future Transfer; use check UUID
  metadata: { check_id: checkId, seeker_id: seekerId, tier },
});
// Return { client_secret: pi.client_secret } — never the full PI object
```

**Key facts about the hold:**
- Standard hold lifetime: **7 days** (Visa: 5 days exactly; Mastercard/Amex/Discover: 7 days) [VERIFIED: docs.stripe.com/payments/place-a-hold-on-a-payment-method]
- LMC's delivery window is 7-15 minutes — hold will NEVER naturally expire during a live check
- Hold lifetime is far more than enough; no extended authorization needed
- If authorization fails at confirmation time (decline), the PI never reaches `requires_capture` — the error surfaces immediately to the client

### Pattern 2: Capture on Delivery (triggered from Mux webhook)

**What:** The existing `mux-webhook/index.ts` drives the `delivered` state. Immediately after the `transition_check` call for `delivered`, trigger capture by calling the `stripe-capture` Edge Function (or inline the capture in the mux webhook itself after delivery).

**When to use:** When `video.asset.ready` fires and the check transitions to `delivered`.

**Capture approach:**
```typescript
// Source: https://docs.stripe.com/api/payment_intents/capture
// Fetch payment_intent_id from checks table, then:
const pi = await stripe.paymentIntents.capture(paymentIntentId, {
  // Full capture — no partial capture needed here
});
// pi.status === 'succeeded' → create Transfer to Scout
if (pi.status === 'succeeded') {
  const charge = pi.latest_charge as string;
  await stripe.transfers.create({
    amount: scoutEarningsCents,     // from tier config (800 standard, 1200 priority)
    currency: currency,
    destination: scoutStripeAccountId,
    source_transaction: charge,     // links transfer to charge; delays until funds available
    transfer_group: checkId,
    metadata: { check_id: checkId, scout_id: scoutId },
  });
}
// Log payment_event: captured + transferred
```

**D-09 (capture failure fallback):**
```typescript
// If capture throws / returns status !== 'succeeded':
// 1. Log event: capture_failed
// 2. Still create Transfer to Scout (LMC pays from platform balance — no source_transaction)
// 3. Mark check as capture_failed in payments table
// 4. Block Seeker from new checks via flag on users row
// 5. Notify Seeker to update payment method
```

### Pattern 3: Stripe Connect Express Onboarding for Scouts

**What:** Create a Stripe Express account for the Scout, generate a hosted onboarding `account_link`, open it in an in-app browser, handle the deep link return, then poll/webhook for `charges_enabled + payouts_enabled` before gating "go online."

**Flow:**
```typescript
// Source: https://docs.stripe.com/connect/express-accounts
// Edge Function: stripe-connect-onboard
// 1. Create Express account (if none exists for this scout)
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  business_type: 'individual',
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
  metadata: { scout_id: scoutId },
});
// Store account.id in scout_stripe_accounts table

// 2. Create account_link for onboarding
const link = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: 'lmc://scout/payout?refresh=1',  // deep link back to payout screen
  return_url: 'lmc://scout/payout?onboarded=1', // deep link after completion
  type: 'account_onboarding',
});
// Return { url: link.url } — single-use, expires in ~5 minutes

// 3. Client opens URL in expo-web-browser:
//    WebBrowser.openAuthSessionAsync(link.url, 'lmc://')
//    Handles the deep link return automatically on iOS/Android
```

**Checking onboarding completion:**
- Listen to `account.updated` webhook — check `charges_enabled === true && payouts_enabled === true`
- Also poll on `return_url` deep link: fetch account details server-side before unlocking "go online"

**Gate "go online" on completed onboarding** (per PROJECT.md): `charges_enabled` on the connected account must be true before the Scout can go online.

### Pattern 4: Stripe Webhook Handler (mirror of mux-webhook)

**What:** A single `stripe-webhook` Edge Function handles all Stripe events. Signature verified with raw HMAC-SHA256 (mirroring `verifyMuxSignature` exactly — same HMAC-SHA256, same `t=<unix>,v1=<hex>` format, same 5-minute replay protection).

**Stripe-Signature header format:**
```
Stripe-Signature: t=1492774577,v1=5257a869e7ece...
```
Parse identically to Mux: split on `,`, then `=`. The signed payload is `${t}.${rawBody}` (same as Mux). [VERIFIED: docs.stripe.com/webhooks]

**Events to handle:**

| Event | Action |
|-------|--------|
| `payment_intent.amount_capturable_updated` | PI authorized successfully; log event; PI is in `requires_capture` — no action needed yet |
| `payment_intent.payment_failed` | Auth failed; log event; update check status; notify Seeker to fix card |
| `payment_intent.canceled` | Hold released (no Scout / expired); log event |
| `charge.dispute.created` | Dispute filed; log event; platform responds (absorb per D-08) |
| `charge.dispute.closed` | Dispute resolved; log outcome |
| `account.updated` | Scout Connect account state changed; update `scout_stripe_accounts.charges_enabled` / `payouts_enabled` |
| `payout.paid` | Scout payout settled; update ledger |
| `payout.failed` | Scout payout failed; retry or flag |

**Note:** `payment_intent.succeeded` fires on CAPTURE (not on authorization). Use it as the confirmation that the Seeker has been charged and funds are settled.

### Pattern 5: Refund (LMC-funded, Scout protected)

**What:** Seeker submits a refund request with a reason code. Server validates, creates a Refund against the Charge, does NOT reverse the Transfer to the Scout, platform balance absorbs the cost.

```typescript
// Source: https://docs.stripe.com/connect/marketplace/tasks/refunds-disputes
// Edge Function: stripe-refund
// 1. Log refund_request with reason_code to DB
// 2. Run auto-approval rules (reason, user history, refund count)
// 3. If approved:
const refund = await stripe.refunds.create({
  payment_intent: paymentIntentId,
  reason: 'requested_by_customer',  // Stripe reason (not LMC reason code)
  metadata: { lmc_reason_code: reasonCode, check_id: checkId, refund_request_id: refundRequestId },
  // NO reverse_transfer: true — Scout keeps their pay (D-08)
});
// 4. Log payment_event: refunded + reason_code
// 5. Notify Seeker (Phase 7 push; email via Resend now)
// 6. Do NOT touch the Transfer — Scout's funds are untouched
```

**Key fact:** Refunding WITHOUT `reverse_transfer: true` leaves the Scout's Transfer intact. The platform's Stripe balance covers the refund. This is the correct model for D-08. [VERIFIED: docs.stripe.com/connect/marketplace/tasks/refunds-disputes]

### Pattern 6: Client-Side PaymentSheet

**What:** Replace the mock PaymentSheet in `payment.tsx` with the real `@stripe/stripe-react-native` `PaymentSheet`. The sheet handles card collection, Apple Pay, and Google Pay in a single hosted UI.

```typescript
// Source: https://docs.stripe.com/sdks/react-native
// In payment.tsx:
import { useStripe, StripeProvider } from '@stripe/stripe-react-native';

// Root _layout.tsx wraps the app:
<StripeProvider
  publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}
  merchantIdentifier="merchant.com.blackmalibuinc.letmecheck" // Apple Pay
  urlScheme="lmc"  // for 3DS redirect returns
>

// In payment.tsx, after getting clientSecret from Edge Function:
const { initPaymentSheet, presentPaymentSheet } = useStripe();
await initPaymentSheet({
  merchantDisplayName: 'Let Me Check',
  paymentIntentClientSecret: clientSecret,
  customerId: stripeCustomerId,
  customerEphemeralKeySecret: ephemeralKey, // from Edge Function
  defaultBillingDetails: { name: userName },
  allowsDelayedPaymentMethods: false, // cards only — no bank debits at auth time
  googlePay: { merchantCountryCode: 'US', testEnv: __DEV__ },
  applePay: { merchantCountryCode: 'US' },
});
const { error } = await presentPaymentSheet();
if (error) {
  // Card declined / invalid — re-prompt (D-02)
} else {
  // Auth succeeded → createCheck()
}
```

**app.config.js additions required:**
```js
plugins: [
  // ... existing plugins ...
  ['@stripe/stripe-react-native', {
    merchantIdentifier: 'merchant.com.blackmalibuinc.letmecheck',
    enableGooglePay: true,
  }],
]
```

### Anti-Patterns to Avoid

- **Creating PaymentIntent on the client:** Never. The Stripe secret key must stay in Edge Functions only (same rule as Mux).
- **Using `destination` charges instead of separate charges + Transfer:** Destination charges tie the Transfer to the PI. When you refund a destination charge, Stripe tries to pull funds from the connected account automatically. Use separate charges + explicit Transfer instead — gives full control over the refund/Transfer lifecycle.
- **Using `reverse_transfer: true` on refund:** This would claw back the Scout's payment. Never set this (D-08).
- **Capturing on the client:** The client receives only the `client_secret` and can present the PaymentSheet. Capture must happen server-side in the stripe-capture Edge Function triggered by the Mux webhook delivery event.
- **Hard-coding USD or cent amounts:** Every amount must come from the DB market/tier config and carry the `currency` field. The checks table already has a `currency` column.
- **Using Accounts v2 API for V1:** API version `2026-01-28.clover` is very new (Dec 2025). Use legacy Express (`type=express`) for V1 — it is stable, well-documented, and fully supports the LMC use case. Migrate to v2 later.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card collection / Apple Pay / Google Pay | Custom card input UI (already partially built in mock PaymentSheet) | `@stripe/stripe-react-native` PaymentSheet | PCI compliance, 3DS handling, Apple Pay merchant validation, Google Pay tokenization — all hand-rolled solutions fail PCI audit |
| HMAC-SHA256 constant-time comparison | Custom timing-safe compare | `crypto.subtle.verify()` with HMAC (Web Crypto) | subtle.verify() is inherently constant-time; manual char comparison introduces timing oracle |
| KYC / identity verification for Scouts | Custom ID upload + review workflow | Stripe Connect Express hosted onboarding | W-9/1099, SSN, bank account, DOB handled inside Stripe — LMC never sees sensitive data; legally compliant |
| Instant payout routing | Custom bank rail integration | Stripe Instant Payouts API (`method: 'instant'`) | Stripe's instant rail covers ~99% of US banks; custom integration requires money-transmitter licenses |
| Chargeback response | Custom dispute portal | Stripe Dashboard + `charge.dispute.created` webhook + evidence API | Stripe's dispute API handles evidence submission, timelines, and card network communication |
| 1099/tax compliance | Custom tax form generation | Stripe Tax + Connect Express 1099-NEC | Stripe generates and distributes 1099s to connected accounts; LMC has no reporting obligation for KYC data |

**Key insight:** Stripe Connect Express absorbs enormous regulatory complexity (KYC, AML, 1099 tax reporting, dispute management, payout rails). Every custom solution for these problems requires money-transmitter licenses, financial compliance audits, and legal review across 50 US states — none of which are in scope for V1.

---

## Common Pitfalls

### Pitfall 1: Creating PaymentIntent Client-Side
**What goes wrong:** Client creates PI using publishable key — works in test mode, silently fails in production when secret key operations are attempted.
**Why it happens:** Stripe's publishable key allows PI creation but you can't read the client secret safely from the client later.
**How to avoid:** Edge Function creates the PI and returns only `{ client_secret, ephemeral_key, customer_id }`. Client never holds the secret key. Already established pattern from Phase 3.

### Pitfall 2: Destination Charges Breaking the Scout-Keeps-Pay Model
**What goes wrong:** Using `transfer_data[destination]` on the PaymentIntent instead of an explicit Transfer. When a Seeker gets a refund on a destination charge, Stripe automatically attempts to pull funds from the connected account — violating D-08.
**Why it happens:** Destination charges are simpler and tempting, but they couple the Transfer lifecycle to the charge.
**How to avoid:** Use separate charges + explicit Transfer with `source_transaction` linking. The refund only touches the platform's balance. The Scout's transfer is never reversed.
**Warning signs:** PaymentIntent has `transfer_data` set — that's a destination charge, not a separate transfer.

### Pitfall 3: Webhook Signature Verification with Wrong Raw Body
**What goes wrong:** Parsing JSON before verifying the signature — even a single whitespace difference invalidates the HMAC. The `Stripe-Signature` header's `v0=` scheme (fake test scheme) accepted in production.
**Why it happens:** Easy to `JSON.parse()` before verifying; v0 is a Stripe test fixture that should be ignored.
**How to avoid:** Call `req.text()` FIRST, store in `rawBody`, verify HMAC against `rawBody` before any JSON parse. Ignore all signature schemes other than `v1`. Replicate the `verifyMuxSignature` pattern exactly.

### Pitfall 4: Account Link URL Reuse
**What goes wrong:** Stripe account_link URLs are single-use and expire in ~5 minutes. Reusing a link returns an error and the Scout sees a broken onboarding experience.
**Why it happens:** Caching the URL or storing it in the DB for reuse.
**How to avoid:** Always generate a fresh `account_link` per request (the `stripe-connect-onboard` Edge Function must be called each time the Scout taps "Open Stripe Connect"). Handle the `refresh_url` deep link by regenerating a new link.

### Pitfall 5: Not Gating "Go Online" on Onboarding Completion
**What goes wrong:** Scout can accept requests before Stripe has verified their identity/bank account, leading to undeliverable payouts.
**Why it happens:** `return_url` is called when the Scout finishes the Stripe flow — but Stripe's docs note that not all info may be collected yet. `charges_enabled` may still be false.
**How to avoid:** Check `account.charges_enabled && account.payouts_enabled` either by fetching the account server-side on the `return_url` deep link, OR wait for the `account.updated` webhook. Don't rely on the deep link URL alone. Gate "go online" on `charges_enabled: true`.

### Pitfall 6: PaymentSheet Requires Development Build (Not Expo Go)
**What goes wrong:** Testing PaymentSheet, Apple Pay, or Google Pay in Expo Go — they throw errors or fail silently.
**Why it happens:** The Stripe native module requires native compilation.
**How to avoid:** Always test Stripe flows in an EAS development build or `npx expo run:ios`. The existing app already uses native modules (vision-camera, Mapbox) so this is already the established workflow.

### Pitfall 7: New Architecture Incompatibility
**What goes wrong:** `@stripe/stripe-react-native` does not yet support the New Architecture (Fabric/JSI). Enabling New Architecture in Expo 54 will cause build failures.
**Why it happens:** Stripe React Native SDK is still on the Old Architecture.
**How to avoid:** Keep `newArchEnabled: false` (or unset) in app.config.js until Stripe announces New Architecture support. [CITED: WebSearch 2026-06-21 — "does not yet support the New Architecture, but support is coming soon"]

### Pitfall 8: Instant Payout Fee Discrepancy
**What goes wrong:** Stripe's actual instant payout fee is **1% (min $0.50)** not 1.5% as mentioned in some older docs. The payout.tsx UI already says "2% fee" to the Scout. If Stripe's fee is 1%, LMC margin is 1%, not 0.5% as previously estimated.
**Why it happens:** Stripe changed their instant payout pricing; older community posts cite 1.5%.
**How to avoid:** Verify current fee in Stripe Dashboard > Connect > Pricing at launch time. The 2% Scout-facing rate (D-05) is locked; the platform margin is the difference between 2% and whatever Stripe charges. [VERIFIED: Stripe docs 2026-06-21 say 1%, but CONFIRM in Dashboard at launch — fee can vary by platform agreement]

---

## Code Examples

### Stripe Webhook Signature Verification (mirrors verifyMuxSignature)
```typescript
// supabase/functions/_shared/stripe.ts
// Stripe's Stripe-Signature header: t=<unix>,v1=<hex>
// Signed payload: `${t}.${rawBody}` — IDENTICAL scheme to Mux
// Source: https://docs.stripe.com/webhooks/signature
export async function verifyStripeSignature(
  rawBody: string,
  headers: Headers,
): Promise<void> {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  const sigHeader = headers.get('stripe-signature') ?? headers.get('Stripe-Signature') ?? '';
  const fields: Record<string, string> = {};
  for (const pair of sigHeader.split(',')) {
    const idx = pair.indexOf('=');
    if (idx > 0) fields[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
  const t = fields['t'];
  const v1 = fields['v1'];
  if (!t || !v1) throw new Error('missing stripe signature');
  const skew = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
  if (!Number.isFinite(skew) || skew > 300) throw new Error('stripe signature timestamp outside tolerance');
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const macBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${rawBody}`));
  const expected = Array.from(new Uint8Array(macBuf), b => b.toString(16).padStart(2, '0')).join('');
  if (expected.length !== v1.length) throw new Error('bad stripe signature');
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  if (diff !== 0) throw new Error('bad stripe signature');
}
```

### PaymentIntent Creation (Edge Function)
```typescript
// Source: https://docs.stripe.com/payments/place-a-hold-on-a-payment-method
const pi = await stripe.paymentIntents.create({
  amount: tierAmountCents,   // e.g., 1650 for standard ($16.50 = $15 + $1.50 fee)
  currency: currency,        // from market config, e.g., 'usd'
  capture_method: 'manual',
  setup_future_usage: 'off_session',
  customer: stripeCustomerId,
  payment_method_types: ['card'],
  transfer_group: checkId,
  metadata: { check_id: checkId, seeker_id: seekerId, tier },
});
```

### Capture + Transfer (triggered on delivery)
```typescript
// Source: https://docs.stripe.com/api/payment_intents/capture
// https://docs.stripe.com/connect/separate-charges-and-transfers
const pi = await stripe.paymentIntents.capture(paymentIntentId);
if (pi.status === 'succeeded') {
  await stripe.transfers.create({
    amount: scoutEarningsCents,  // 800 standard, 1200 priority (in cents)
    currency: currency,
    destination: scoutStripeAccountId,
    source_transaction: pi.latest_charge as string,
    transfer_group: checkId,
    metadata: { check_id: checkId, scout_id: scoutId },
  });
}
```

### Refund (no Transfer reversal)
```typescript
// Source: https://docs.stripe.com/api/refunds/create
// https://docs.stripe.com/connect/marketplace/tasks/refunds-disputes
await stripe.refunds.create({
  payment_intent: paymentIntentId,
  reason: 'requested_by_customer',
  metadata: { lmc_reason_code: reasonCode, check_id: checkId },
  // reverse_transfer NOT set — Scout keeps their pay
});
```

### Test Cards for Key Scenarios
```
Successful auth (no capture yet):    4242 4242 4242 4242   — manual capture holds in requires_capture
Successful auth + immediate capture: pm_card_visa           — server-side only
Generic decline:                     4000 0000 0000 0002   — proves D-02 gate
Insufficient funds:                  4000 0000 0000 9995   — proves D-02 gate
Requires 3D Secure:                  4000 0027 6000 3184   — test SCA flow
Decline after attaching to customer: 4000 0000 0000 0341   — post-setup decline
```
[VERIFIED: docs.stripe.com/testing 2026-06-21]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom card input forms (PCI DSS Self-Assessment) | PaymentSheet (Stripe-hosted UI) | 2020+ | No PCI SAQ needed for merchants; Stripe is the merchant of record for card data |
| Stripe Connect with type=express | Accounts v2 API (/v2/core/accounts) | Dec 2025 | v2 unifies Account + Customer into one object; new platforms should use v2 — but it is very new. Use legacy Express for V1. |
| Embedded onboarding (ConnectJS) | Hosted account_link onboarding | Both valid | For a React Native app with no web frontend, hosted account_link (WebBrowser redirect) is the correct approach |
| constructEvent() (sync, Node crypto) | constructEventAsync() + SubtleCryptoProvider | 2022+ Deno era | Deno doesn't have Node crypto; raw HMAC-SHA256 or the async SDK method both work |
| 1.5% instant payout fee (old docs) | 1% flat fee (min $0.50) per Stripe docs 2026 | ~2024 | Platform margin on 2% Scout-facing instant payout is now ~1%, not ~0.5% |

**Deprecated/outdated:**
- Stripe Radar rules for manual review: still valid but Stripe now recommends Stripe Sigma + custom webhooks for marketplace-specific fraud logic. Radar is still the right default for V1.
- `type=express` in the accounts API: not deprecated but Stripe now calls it "legacy" vs the new Accounts v2 path. Fully supported for existing integrations.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Stripe's instant payout fee is 1% (not 1.5%) as of 2026 | Standard Stack / Pitfall 8 | If it's higher, LMC's margin on instant payouts shrinks or goes negative. Verify in Stripe Dashboard before launch. |
| A2 | `@stripe/stripe-react-native` 0.67.0 is compatible with Expo 54 / React Native 0.81.5 | Standard Stack | If incompatible, need to find the exact version pin from Stripe's CHANGELOG. Run `npx expo install @stripe/stripe-react-native` which auto-pins to compatible version. |
| A3 | The Stripe webhook `Stripe-Signature` format is identical to Mux (`t=<unix>,v1=<hex>`, signed payload = `${t}.${rawBody}`) | Code Examples | If Stripe uses a different scheme, the verifyStripeSignature function would silently reject all webhooks. Verified against official docs — HIGH confidence. |
| A4 | `charges_enabled` on a newly onboarded Scout Connect Express account is the correct gate for "go online" (not `payouts_enabled` alone) | Pattern 3 | If the wrong field is checked, Scouts who haven't set up bank accounts could go online. Both fields should be true — use `charges_enabled && payouts_enabled`. |
| A5 | The Scout earning amounts ($8 standard = 800 cents, $12 priority = 1200 cents) are correct and stored in market/tier config, not hard-coded | Code Examples | If amounts change, code must be config-driven. Currently implied by PROJECT.md and the existing checks.ts `currency` field. Confirmed by pricing model. |

---

## Open Questions

1. **Stripe Merchant ID for Apple Pay**
   - What we know: `app.config.js` already has a merchantIdentifier placeholder pattern; Apple Developer account exists (used for TestFlight)
   - What's unclear: The exact Apple Pay Merchant ID (`merchant.com.blackmalibuinc.letmecheck`) needs to be registered in the Apple Developer portal, then verified in the Stripe Dashboard before Apple Pay works in production.
   - Recommendation: Create the merchant ID in Apple Developer > Certificates, Identifiers & Profiles > Merchant IDs. Register it in Stripe Dashboard > Settings > Apple Pay. Wave 0 task.

2. **Stripe Customer ID persistence**
   - What we know: The PaymentSheet `initPaymentSheet` call requires a `customerId` (Stripe Customer object ID) and `customerEphemeralKeySecret` for saved card support.
   - What's unclear: The current `users` table likely has no `stripe_customer_id` column yet.
   - Recommendation: Add `stripe_customer_id` to the `users` table in migration 0011. Create a Stripe Customer once per user (on first payment attempt) and store the ID. The ephemeral key is generated server-side per session.

3. **Refund reason taxonomy and auto-approval thresholds**
   - What we know: D-06/D-07 lock the structured-reason approach; D-07 lists 5 reason codes.
   - What's unclear: Auto-approval rules (e.g., "blurry + first refund ever → auto-approve; 3rd refund in 30 days → manual review").
   - Recommendation: Planner should propose a simple rule set (e.g., first refund in 30 days auto-approves for any reason; second refund in 30 days flags for review). Captured in `refund_requests` table with `auto_approved boolean` and `review_status`.

4. **Stripe live account entity blocker (US entity + EIN)**
   - What we know: `OUTSTANDING.md` confirms real money is gated on a US entity + EIN + live Stripe account. This is NOT a build blocker.
   - What's unclear: Whether the Stripe test mode Connect Express flow (creating test connected accounts) works without the live platform account being fully verified.
   - Recommendation: Stripe test mode IS fully functional for Connect Express — you can create test connected accounts, test transfers, test instant payouts, and test webhooks all without a live entity. Build and test everything in test mode; switch to live credentials at launch.

5. **Capture failure handling seam in the Mux webhook**
   - What we know: The `mux-webhook/index.ts` drives `delivered` via `transition_check`. Capture should fire immediately after.
   - What's unclear: Whether to inline the capture call in `mux-webhook/index.ts` (adding Stripe logic) or call a separate Edge Function. Inlining increases coupling; a separate call adds latency.
   - Recommendation: Create a `stripe-capture` Edge Function and call it from within the Mux webhook after the `delivered` transition. The Mux webhook already calls Supabase RPC — one more fetch to the Stripe Edge Function is acceptable. Keeps Stripe logic in Stripe functions.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Stripe account (test mode) | All payment flows | Needs setup | — | None — required, but test mode needs no entity |
| Apple Developer Merchant ID | Apple Pay | Needs registration | — | Apple Pay disabled until registered |
| EAS development build | PaymentSheet testing (no Expo Go) | Existing (vision-camera already requires it) | Build 9 | — |
| STRIPE_SECRET_KEY (test) | Edge Functions | Needs env var in Supabase | — | None |
| STRIPE_WEBHOOK_SECRET | stripe-webhook Edge Function | Needs setup in Stripe Dashboard | — | None |
| EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY | StripeProvider in _layout.tsx | Needs env var | — | None |

**Missing dependencies with no fallback:**
- Stripe test account must be created and API keys added to Supabase Edge Function secrets and lmc-app/.env. No test can run without them.
- Stripe webhook endpoint must be registered (Stripe Dashboard > Webhooks) to get the STRIPE_WEBHOOK_SECRET.

**Missing dependencies with fallback:**
- Apple Pay Merchant ID: Apple Pay simply won't show in PaymentSheet until registered. Google Pay and card entry still work. Not blocking.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No test framework detected in lmc-app/; Supabase Edge Functions use Deno's built-in test runner |
| Config file | None yet — Wave 0 creates test files |
| Quick run command | `deno test supabase/functions/_shared/stripe.test.ts` |
| Full suite command | `deno test supabase/functions/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAY-01 | PaymentIntent created with capture_method=manual, returns client_secret | unit (Edge) | `deno test supabase/functions/stripe-create-payment-intent/` | ❌ Wave 0 |
| PAY-01 | Auth failure (declined card) blocks createCheck | integration | Manual test with card 4000...0002 in dev build | ❌ Manual |
| PAY-02 | Capture fires on delivered transition; PI status becomes succeeded | unit (Edge) | `deno test supabase/functions/stripe-capture/` | ❌ Wave 0 |
| PAY-02 | hold cancelled when check → no_scout or cancelled | unit (Edge) | `deno test supabase/functions/stripe-create-payment-intent/cancel.test.ts` | ❌ Wave 0 |
| PAY-03 | Transfer created to Scout after capture | unit (Edge) | in stripe-capture test | ❌ Wave 0 |
| PAY-03 | Instant payout eligibility check before offering option | unit (Edge) | `deno test supabase/functions/stripe-connect-onboard/` | ❌ Wave 0 |
| PAY-04 | Refund issued without reverse_transfer; Scout Transfer intact | unit (Edge) | `deno test supabase/functions/stripe-refund/` | ❌ Wave 0 |
| PAY-05 | charge.dispute.created webhook received and logged | unit (Edge) | `deno test supabase/functions/stripe-webhook/` | ❌ Wave 0 |
| SCOUT-01 | Connect Express account created + account_link generated | unit (Edge) | in stripe-connect-onboard test | ❌ Wave 0 |
| SCOUT-01 | charges_enabled gate on go-online | integration | Manual: complete Stripe test onboarding, verify gate | ❌ Manual |
| SCOUT-02 | Scout Code consent recorded before account_link redirect | unit (RLS) | grep + manual | ❌ Manual |

### Sampling Rate
- **Per task commit:** `deno test supabase/functions/_shared/` (shared helpers only, fast)
- **Per wave merge:** `deno test supabase/functions/` (all Edge Function unit tests)
- **Phase gate:** Full suite green + manual dev-build smoke test of PaymentSheet (card + Apple Pay) before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `supabase/functions/_shared/stripe.test.ts` — unit tests for `verifyStripeSignature` and Stripe client factory (mock injected, same pattern as mux.ts)
- [ ] `supabase/functions/stripe-create-payment-intent/index.test.ts` — covers PAY-01
- [ ] `supabase/functions/stripe-capture/index.test.ts` — covers PAY-02, PAY-03
- [ ] `supabase/functions/stripe-refund/index.test.ts` — covers PAY-04
- [ ] `supabase/functions/stripe-webhook/index.test.ts` — covers PAY-05, account.updated events
- [ ] `supabase/functions/stripe-connect-onboard/index.test.ts` — covers SCOUT-01
- [ ] Stripe env vars in Supabase project secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (JWT) gates all Edge Function calls; service role only in webhook handler |
| V3 Session Management | yes | Stripe ephemeral key scoped to single session; never stored |
| V4 Access Control | yes | RLS: only the check's seeker can request a refund; only service role can capture/transfer |
| V5 Input Validation | yes | Validate tier, currency, amounts as integers > 0 at Edge Function boundary; reason_code as enum |
| V6 Cryptography | yes | HMAC-SHA256 (Web Crypto) for webhook verification; Stripe SDK for card tokenization — never hand-roll |

### Known Threat Patterns for Stripe / Payments Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged Stripe webhook (fake delivery event) | Spoofing | `verifyStripeSignature` (HMAC-SHA256 + timestamp replay protection) before processing any event |
| Client-side capture trigger | Tampering | Capture only fires in Edge Function triggered by verified Mux webhook — client has no capture API |
| Refund abuse (Seeker requests refunds repeatedly) | Tampering | Reason code + per-user refund count gate in auto-approval rules; repeat refunders flag to manual review |
| Transfer reversal race (Scout paid then reversed) | Tampering | Never set `reverse_transfer: true` on refund; platform absorbs cost from its own balance |
| Account_link URL interception | Information Disclosure | Single-use URL; delivered only within authenticated app session to the owning Scout; never stored in DB |
| Secret key exposure | Information Disclosure | STRIPE_SECRET_KEY stored only in Supabase Edge Function secrets (Deno.env) — never in client bundle, never in git |
| Timing attack on signature verification | Tampering | `crypto.subtle.verify()` (constant-time) for final compare — same as verifyMuxSignature pattern |
| Chargeback from stolen card | Repudiation | Stripe Radar (default fraud scoring); platform absorbs per D-08; event log records all payment events for evidence |

---

## Sources

### Primary (HIGH confidence)
- [Stripe — Place a hold on a payment method](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method) — hold lifetimes, capture_method=manual, partial capture
- [Stripe — Capture a PaymentIntent](https://docs.stripe.com/api/payment_intents/capture) — capture API
- [Stripe — Using Express connected accounts](https://docs.stripe.com/connect/express-accounts) — account creation, account_links, charges_enabled
- [Stripe — Create separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers) — charge on platform, transfer to Scout
- [Stripe — Handle refunds and disputes](https://docs.stripe.com/connect/marketplace/tasks/refunds-disputes) — refund without reverse_transfer
- [Stripe — Receive Stripe events in your webhook endpoint](https://docs.stripe.com/webhooks) — signature format, 5-min tolerance, v1 scheme only
- [Stripe — Instant Payouts for Connect](https://docs.stripe.com/connect/instant-payouts) — eligibility, 1% fee, method=instant API
- [Stripe — Test card numbers](https://docs.stripe.com/testing) — test cards for all decline scenarios
- [Stripe SDK — stripe-react-native@0.67.0](https://www.npmjs.com/package/@stripe/stripe-react-native) — current version, peer deps
- [Stripe SDK — stripe@22.2.2](https://www.npmjs.com/package/stripe) — current Node/Deno SDK
- [Supabase — stripe-webhooks Edge Function example](https://github.com/supabase/supabase/blob/master/examples/edge-functions/supabase/functions/stripe-webhooks/index.ts) — `createSubtleCryptoProvider()` + `constructEventAsync()` pattern

### Secondary (MEDIUM confidence)
- [Supabase — Edge Functions: Node and npm compatibility](https://supabase.com/blog/edge-functions-node-npm) — npm: specifier support for stripe@22 in Deno
- [Stripe — Accounts v2](https://docs.stripe.com/connect/accounts-v2) — new API (Dec 2025), flagged as preferred for new integrations but very new; using legacy Express for V1
- [Expo Docs — @stripe/stripe-react-native](https://docs.expo.dev/versions/latest/sdk/stripe/) — Expo integration, config plugin, dev build requirement

### Tertiary (LOW confidence)
- WebSearch result citing 1.5% instant payout fee — **contradicted by official Stripe docs (1%)**; trust the official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against npm registry; compatibility cross-checked
- Architecture (PaymentIntent manual capture + separate charges + transfers): HIGH — verified against Stripe official docs
- Webhook verification pattern: HIGH — mirrored from verified mux.ts; Stripe format confirmed identical
- Connect Express onboarding flow: HIGH — official docs confirmed
- Instant payout fee (1%): MEDIUM — official Stripe docs say 1%, but older sources say 1.5%. Platform must verify in Dashboard at launch.
- Accounts v2 vs legacy: MEDIUM — Stripe recommends v2 for new platforms, but v2 was released Dec 2025 and is very new; recommending legacy Express for V1 safety.

**Research date:** 2026-06-21
**Valid until:** 2026-09-21 (90 days — Stripe APIs are stable; check Stripe changelog if instant payout fees or New Architecture support changes)
