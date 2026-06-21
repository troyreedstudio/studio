### Phase 3: Video Pipeline
**Goal**: Replace the simulated camera with real in-app capture and a resilient pipeline that produces a genuine, audio-free clip the Seeker can actually watch.
**Depends on**: Phase 2 (can run in parallel with Phase 4)
**Requirements**: VID-01, VID-02, VID-03, VID-04
**Success Criteria** (what must be TRUE):
  1. A Scout films a live 15-second clip in-app; importing from the camera roll is blocked (fresh-capture enforced)
  2. Clips are video-only — audio is never recorded (sidesteps all-party-consent exposure)
  3. An upload survives a weak/dropped mobile network (resumable, retried, persisted locally first) and the job is not marked done until the server confirms receipt
  4. The Seeker watches a real transcoded clip streamed smoothly from CDN (Mux), with playback scoped to the buying Seeker
**Plans**: 5 plans (4 waves)
- [x] 03-01-PLAN.md — SQL spine + Wave-0 scaffolds: 0010 Mux columns + new edges + delivered-needs-ready guard + service-actor; pgTAP + failing Vitest/Deno scaffolds
- [x] 03-02-PLAN.md — The 3 Edge Functions: mux-upload-url, mux-webhook (sig-verified, idempotent, owns delivered), mux-playback-token (Deno tests)
- [x] 03-03-PLAN.md — Client lib/clips.ts (resumable retried upload, playback token, no client-delivered) + vision-camera config (audio off) + invariants gate
- [ ] 03-04-PLAN.md — [BLOCKING] live deploy: db push 0010 + functions deploy + Mux account/secrets/webhook + types regen + fresh EAS dev build
- [ ] 03-05-PLAN.md — Wire filming.tsx (real camera) + delivery.tsx (signed Mux player) + on-device end-to-end walk-through
**UI hint**: yes

### Phase 4: Payments — Stripe Connect Express, card hold at request + capture-on-delivery, Scout payouts, refunds/disputes, instant-payout (2% fee), tax/KYC via Connect onboarding; buildable in Stripe test mode, real money gated on US entity at launch; currency/market-aware

**Goal:** Wire real money into the existing check loop in Stripe TEST mode: the Seeker's card is authorized + held when they confirm a request (a decline blocks the booking, Uber-style), the hold is captured on delivery and the Scout is paid via a separate, never-reversed Stripe Connect Express transfer, refunds are reason-coded + reviewed (the Scout always keeps a valid clip's pay), and Scout onboarding/KYC happens entirely inside Stripe.
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, SCOUT-01, SCOUT-02
**Depends on:** Phase 3
**Plans:** 2/7 plans executed

Plans:
- [x] 04-01-PLAN.md — Payments data spine (migration 0011: payments/refund_requests/scout_stripe_accounts + RLS) + secret-holding _shared/stripe.ts (native-Web-Crypto webhook verify) + pgTAP
- [x] 04-02-PLAN.md — Auth-and-hold front gate: stripe-create-payment-intent (manual capture) + _shared/pricing.ts + client lib/payments.ts contract (D-01/D-02)
- [ ] 04-03-PLAN.md — Money movement: stripe-capture (capture + separate Transfer + D-09 fallback) + stripe-webhook (sig-verified disputes/account.updated/hold-release) (D-03/D-04/PAY-05)
- [ ] 04-04-PLAN.md — Scout onboarding: stripe-connect-onboard (Express account + account_link + Scout Code consent) + stripe-connect-status (charges_enabled/payouts_enabled go-online gate) (SCOUT-01/02)
- [ ] 04-05-PLAN.md — [BLOCKING] live deploy: wire capture trigger into mux-webhook + db push 0011 + Stripe test secrets + deploy 5 functions + register webhook + regen types
- [ ] 04-06-PLAN.md — Wire UI: StripeProvider (New Arch off) + real PaymentSheet hold-then-createCheck in payment.tsx + real Connect onboarding + go-online gate in scout/payout.tsx + on-device smoke test
- [ ] 04-07-PLAN.md — Reason-coded reviewed refunds: stripe-refund (no reverse_transfer, D-08) + _shared/refund-rules.ts (auto-approve first / review repeats) + delivery.tsx report-a-problem picker (D-06/D-07/PAY-04/PAY-05)
