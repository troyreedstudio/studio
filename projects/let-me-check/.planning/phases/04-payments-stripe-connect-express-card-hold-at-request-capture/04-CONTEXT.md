# Phase 4: Payments - Context

**Gathered:** 2026-06-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire real money into the existing check lifecycle: a Seeker's card is authorized + held when they request a check, the held funds are captured when the clip is delivered and approved, and the Scout is paid out via Stripe Connect. Includes refunds (reason-captured, reviewed) and the card-validation gate at request time.

In scope: Stripe payment intents (auth/hold → capture on delivery), Stripe Connect Express onboarding + payouts, refund flow with reason capture, card-validation gate at request, dispute/chargeback handling seam.

Out of scope: the verification moat (geofence, signage AI — Phase 5), face-blur (Phase 6), tipping, one-tap self-refund.
</domain>

<decisions>
## Implementation Decisions

### Card validation & hold (Uber-style front gate)
- **D-01:** Authorize + hold the Seeker's funds at REQUEST time (when they confirm the check), not at delivery. The hold itself is the card-validity check.
- **D-02:** If the card is declined / expired / cancelled / invalid, the authorization fails and the request is BLOCKED. The Seeker cannot book a check until they update the card or switch to another payment method — re-prompt them back to payment, Uber-style, until a hold succeeds.
- **D-03:** Capture the held funds on delivery + approval. Because the delivery window is 7-15 min (far inside Stripe's ~7-day hold lifetime), the capture of an already-authorized hold will almost always succeed.

### When the Scout is paid
- **D-04:** The Scout's earnings are triggered when the clip is submitted → delivered to the Seeker → approved (quality/verification passed). NOT on acceptance, NOT on submission alone.
- **D-05:** Earnings become available on delivery/approval. The Scout chooses their Stripe payout speed: **instant** (carries the decided 2% Scout-facing fee; Stripe's instant rail is ~1.5%, LMC keeps ~0.5%) or **standard ACH** (free, ~24h). The choice is the Scout's, surfaced in the payout screen.

### Refunds (reason-captured, reviewed — Uber/Grab model)
- **D-06:** No instant no-questions self-refund at launch (too open to abuse). Instead: Seeker reports a problem from the delivered clip, **selects a reason** from a structured list, it goes through an **automated/rules-based review**, and on approval the **refund is issued to the original card** with a notification.
- **D-07:** EVERY refund request captures a structured reason code (blurry / wrong location / didn't show what was needed / never delivered / other). This data feeds clip-quality and abuse/fraud signals (event log).
- **D-08:** The Scout KEEPS their pay even when a clip is refunded — LMC funds the refund, never the Scout (carried from PROJECT.md). **This protection is the default and is conditional on the Scout having done their part** (a genuine, quality clip). LMC always absorbs refunds/losses caused by things OUTSIDE the Scout's control — Seeker dissatisfaction with a valid clip, card-capture failure, disputes. A refund or loss must NEVER claw back or penalize a Scout who delivered quality work.
- **D-08a:** The ONLY case where a Scout is not paid is a genuinely bad/fake clip (didn't do their part) — and that is a Scout-accountability / quality-gate matter (Phase 5 verification), NOT a payment refund. Payments-side default: assume the Scout did their job and pay/protect them; bad-faith handling lives in the verification gate, not here.

### Capture-failure fallback (rare)
- **D-09:** If a valid hold still fails at capture on delivery (unusual within the short window), the Scout is STILL paid (LMC absorbs the shortfall) and the Seeker's account is blocked from booking new checks until they settle.

### Claude's Discretion
- **How Seekers pay** (Troy did not flag this): use Stripe PaymentSheet with Apple Pay / Google Pay + a saved card on file for one-tap reorders. Standard, fast checkout.
- Exact refund reason taxonomy, auto-approval thresholds/rules, refund eligibility window, and per-user refund caps — propose during planning.
- Whether flagged/repeat refunders route to a light manual-review queue vs pure automation.
- Stripe object modeling (PaymentIntent manual capture, Connect account types, webhook set) — planner/research decides, mirroring the Phase-3 Edge Function + webhook pattern.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Money & payments decisions
- `.planning/PROJECT.md` — capture-on-delivery model, 2% instant-payout fee, "Scout keeps pay on refund", no background checks, currency/market-aware (no hard-coded USD)
- `/Users/troyreed/studio/OUTSTANDING.md` — US entity + EIN blocker (real money gated on it; NOT needed to build/test), 2% instant-payout margin rationale
- `docs/STACK.md` — Stripe Connect Express locked as the payments/payouts rail
- `docs/BUSINESS-PLAN.md` — pricing model (Standard $15/$8, Priority $20/$12, platform margins)

### Existing code & patterns
- `lmc-app/app/(seeker)/payment.tsx` — existing payment screen; `createCheck` runs here with a `// TODO(phase-4)` Stripe-hold seam already marked
- `lmc-app/app/(seeker)/payment-methods.tsx` — payment-methods UI
- `lmc-app/app/scout/payout.tsx` — Scout payout UI (already references the 2% instant rate)
- `lmc-app/app/lib/checks.ts` — `createCheck` (request-time hold seam) and the check state machine
- `supabase/functions/` — Edge Function + signature-verified webhook pattern (from Phase 3 Mux) to mirror for Stripe secret operations
- `.planning/codebase/INTEGRATIONS.md`, `.planning/codebase/STACK.md` — current integration + stack maps
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `payment.tsx` / `payment-methods.tsx` / `scout/payout.tsx` — UI shells already exist; Phase 4 wires them to real Stripe.
- Edge Function + webhook pattern from Phase 3 (Mux) — Stripe secrets live ONLY in Edge Functions (Deno.env); webhooks are signature-verified with native Web Crypto (the Mux SDK crashed Deno — use `fetch`/native crypto for Stripe webhooks too, do not assume the SDK works in Edge).
- Event log (Phase 1) — every payment event (auth, capture, refund, payout, dispute) must be logged immutably.

### Established Patterns
- Server owns every state transition and secret; client holds no business logic (RLS-enforced). Payment state transitions belong server-side, like check transitions.
- `transition_check` state machine — capture/refund tie into check status (delivered → captured; refunded state).

### Integration Points
- Request-time hold: `createCheck` in `checks.ts` (the `// TODO(phase-4)` seam).
- Capture-on-delivery: the Mux webhook → delivered transition is where capture should trigger.
- Scout payout: Connect Express onboarding gated before "go online" (per PROJECT.md: connect payout → accept Scout Code → go online).
</code_context>

<specifics>
## Specific Ideas

- **Uber/Grab as the reference model** for BOTH: (1) the card gate — can't book until the card authorizes, keeps bouncing you to fix card/switch payment; (2) refunds — pick a reason, automated review, refund to card with notification.
- Build and test everything in **Stripe TEST mode** now (fake cards/payouts, no entity needed). Real money is a launch-time switch once the US entity + live Stripe account exist.
</specifics>

<deferred>
## Deferred Ideas

- One-tap instant self-refund (no questions) — revisit post-launch once we have abuse/quality data to set safe caps.
- Tipping the Scout — new capability, its own consideration.
- Surge/dynamic pricing — out of scope.

</deferred>

---

*Phase: 04-payments-stripe-connect-express-card-hold-at-request-capture*
*Context gathered: 2026-06-21*
