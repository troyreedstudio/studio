# Phase 4: Payments - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-21
**Phase:** 04-payments-stripe-connect-express-card-hold-at-request-capture
**Areas discussed:** Scout payout timing, Card failure handling, Refunds (Scout protection emphasised throughout)

---

## Scout payout timing

| Option | Description | Selected |
|--------|-------------|----------|
| Instant on delivery | Money available the moment the clip delivers + is approved | ✓ |
| Short hold (24h) | Small buffer before earnings unlock | |
| Longer hold (3-7 days) | Safest for cash exposure, worst for Scout | |

**User's choice:** Instant on delivery. Access speed is the Scout's choice via Stripe — instant (fee, ~1.5-2%) or standard ACH (~24h, free). Scout is PAID when clip is submitted → delivered → approved (quality passed).

---

## Card failure handling

**User's framing (free-text):** Validate the card at REQUEST time via the authorization hold, Uber-style. If the card won't authorize (declined/expired/cancelled), block the booking and force a card update or alternate payment before the Seeker can request — keep bouncing them to fix it. Because the hold is taken up front and delivery is 7-15 min away, capture-on-delivery almost always succeeds.

**Resolved:** Hold = card-validity gate at request. Capture on delivery. Rare valid-hold-fails-at-capture → Scout still paid (LMC absorbs), Seeker blocked until settled.

---

## Refunds

| Option | Description | Selected |
|--------|-------------|----------|
| One-tap self-refund, short window | Refund themselves, no questions | |
| Report, then quick review | Pick a reason → automated review → refund to card | ✓ |
| Rating-gated | Low rating triggers refund offer | |

**User's choice:** Option 2. No no-questions self-refund at launch (abuse risk). Model on Uber/Grab food refunds: go into app, select reason(s), automated review, refund issued to card with notification. MUST capture the reason every time (quality + abuse data).

---

## Scout protection (emphasised throughout)

**User's directive:** "We need to protect the Scout. If they've taken a quality video and done their part of the bargain, then we should never be penalizing a Scout. We'll have to absorb that."

**Resolved:** Scout-protection is the default and conditional on quality work. LMC absorbs all losses outside the Scout's control (refunds on valid clips, card-capture failures, disputes). The only non-payment case is a genuinely bad/fake clip — handled by the Phase-5 verification/quality gate, not by payments.

## Claude's Discretion

- How Seekers pay (not flagged): Stripe PaymentSheet + Apple Pay / Google Pay + saved card.
- Refund reason taxonomy, auto-approval rules, refund window, per-user caps.
- Manual-review queue for repeat refunders.

## Deferred Ideas

- One-tap instant self-refund (post-launch, once abuse data exists)
- Tipping
- Surge/dynamic pricing
