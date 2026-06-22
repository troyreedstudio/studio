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
**Plans:** 7/7 plans complete

Plans:
- [x] 04-01-PLAN.md — Payments data spine (migration 0011: payments/refund_requests/scout_stripe_accounts + RLS) + secret-holding _shared/stripe.ts (native-Web-Crypto webhook verify) + pgTAP
- [x] 04-02-PLAN.md — Auth-and-hold front gate: stripe-create-payment-intent (manual capture) + _shared/pricing.ts + client lib/payments.ts contract (D-01/D-02)
- [x] 04-03-PLAN.md — Money movement: stripe-capture (capture + separate Transfer + D-09 fallback) + stripe-webhook (sig-verified disputes/account.updated/hold-release) (D-03/D-04/PAY-05)
- [x] 04-04-PLAN.md — Scout onboarding: stripe-connect-onboard (Express account + account_link + Scout Code consent) + stripe-connect-status (charges_enabled/payouts_enabled go-online gate) (SCOUT-01/02)
- [x] 04-05-PLAN.md — [BLOCKING] live deploy: wire capture trigger into mux-webhook + db push 0011 + Stripe test secrets + deploy 5 functions + register webhook + regen types
- [x] 04-06-PLAN.md — Wire UI: StripeProvider (New Arch off) + real PaymentSheet hold-then-createCheck in payment.tsx + real Connect onboarding + go-online gate in scout/payout.tsx + on-device smoke test
- [x] 04-07-PLAN.md — Reason-coded reviewed refunds: stripe-refund (no reverse_transfer, D-08) + _shared/refund-rules.ts (auto-approve first / review repeats) + delivery.tsx report-a-problem picker (D-06/D-07/PAY-04/PAY-05)

### Phase 5: Verification moat + dispatch — geofenced dispatch (only Scouts inside a ~30-50m venue fence are pinged; atomic accept, no double-assignment), reference-photo confirm before filming, GPS-stamped clips auto-rejected if off-fence, AI signage detection auto-reject on the clip, 20-min Scout cooldown per venue; replaces the interim manual dispatch

**Goal:** Replace interim manual dispatch with real geofenced dispatch (only Scouts within a tunable ~1.5 km radius see a check; atomic first-accept; one active job per Scout) and add the on-submit GPS verification gate that auto-rejects any clip filmed more than 30 m from the venue BEFORE it can be delivered or charged (re-dispatch instead), plus advisory-only AI signage detection that never blocks delivery. Reference-photo and cooldown are dropped per D-07/D-08.
**Requirements**: DISP-01, DISP-02, DISP-03, SCOUT-03, VER-01, SAFE-01
**Depends on:** Phase 4
**Plans:** 5/6 plans executed

Plans:
- [x] 05-01-PLAN.md — SQL spine (0012): scout_locations, market_config (tunable dispatch radius + film-fence), no_film_zones, checks.coord, clip advisory cols, distance_m, re-dispatch edges + reset RPC, RLS + pgTAP (lng/lat order, 30 m boundary)
- [x] 05-02-PLAN.md — Dispatch RPCs (0012b): geo-filtered list_open_checks_for_scout + accept_check v3 (geo-eligibility + one-active-job) + pgTAP
- [x] 05-03-PLAN.md — GPS auto-reject: verify-clip Edge Function + mux-webhook gate BEFORE delivered (off-fence -> re-dispatch, no charge) + Deno tests
- [x] 05-04-PLAN.md — Advisory signage: signage-check (Google Vision REST, advisory-only, never gates) + fire-and-forget mux-webhook hook + Deno tests
- [x] 05-05-PLAN.md — Client wiring: scout-location + dispatch helpers, dashboard foreground watch + geo-filtered list, createCheck coord, filmed GPS through mux-upload-url
- [ ] 05-06-PLAN.md — [BLOCKING] live deploy: db push 0012/0012b + live pgTAP + deploy functions + Google Vision key checkpoint + regen types + on-device geo walk-through

### Phase 6: Privacy + anti-fraud hardening — on-device face/plate blur before upload (privacy-by-default), mock-GPS / location-spoofing detection to protect the geofence moat, and on-device AI frame processors for signage/blur; make the verification tamper-resistant + legally safe for public filming

**Goal:** Make the verification moat tamper-resistant and legally safe for public filming WITHOUT changing what users see at launch. Ship the privacy + anti-fraud machinery dormant: a server-side "detect faces + hold-for-review" blur gate (Google Vision, reusing the Phase-5 pattern) that guarantees no clip is ever delivered with unblurred faces once enabled (D-03/D-07); a fraud-signal engine that records + flags location-spoofing signals layered on the Phase-5 GPS fence, flag-only at launch (D-04/D-05); and a scaffolded on-device blur path (vision-camera + face-detector + Skia) behind a feature flag, compiled + boot-verified but not activated until a device build + Troy's visual check confirm it. Both feature flags (server blur_enabled, client BLUR_NATIVE_ENABLED) ship FALSE.
**Requirements**: BLUR-01, BLUR-02, BLUR-03, BLUR-04, BLUR-05, FRAUD-01, FRAUD-02, FRAUD-03, SCH-01, BLUR-NATIVE-01
**Depends on:** Phase 5
**Plans:** 5/5 plans complete

Plans:
- [x] 06-01-PLAN.md — SQL spine (0014): clips blur_status/fraud_signals/fraud_flag/fraud_score + market_config blur_enabled(FALSE)/fraud_strictness('flag') + blur_review enum/edges + pgTAP + RED Deno/Vitest scaffolds [Category A]
- [x] 06-02-PLAN.md — Edge brains: face-blur-check (Vision FACE_DETECTION detect+hold, D-01/02/03) + fraud-eval (teleport heuristic + flag, D-04/05) + client fraud-signals.ts (FRAUD-03) [Category A]
- [x] 06-03-PLAN.md — Wire the gate: mux-webhook blur gate (hold->blur_review, BLUR-04/05) + fraud-eval fire-and-forget + fraud_signals persisted filming.tsx->clips.ts->mux-upload-url [Category A]
- [x] 06-04-PLAN.md — [BLOCKING] live deploy: db push 0014 + live pgTAP + deploy face-blur-check/fraud-eval + redeploy mux-webhook/mux-upload-url + confirm blur_enabled=false + regen types [Category A]
- [x] 06-05-PLAN.md — [Category B] on-device blur scaffold: install worklets-core+face-detector+Skia behind BLUR_NATIVE_ENABLED(false) + SkiaCamera blur overlay + [DEVICE BUILD] compiles+boots gate (visual blur = Troy AM)

### Phase 7: SLA + money integrity — real server-driven delivery deadlines (deadline_at on checks), Edge-cron enforcement of expiry + auto-refund on late/failed delivery, client countdowns that read the real deadline (not cosmetic resettable timers), wire Trouble-Here to the real refund, and real Scout earnings + payout/withdraw via Stripe Connect (replace fake earnings numbers)

**Goal:** Make time and money REAL and trustworthy: a server-set deadline_at on checks drives client countdowns that survive app reopen; pg_cron sweeps auto-expire stale/late checks and release the Seeker's hold; Trouble-Here fires a real refund (PI cancel) plus platform-funded Scout no-fault pay; and Scout earnings + payout/withdraw run on real Stripe Connect data.
**Requirements**: D-01 (server deadlines), D-02 (5-min unclaimed timeout), D-03 (auto-refund on miss), D-04 (Scout pay protection), D-05 (pg_cron sweep), D-06 (real earnings + payout)
**Depends on:** Phase 6
**Plans:** 4/4 plans complete

Plans:
- [x] 07-01-PLAN.md — Migration 0015: additive deadline_at/accepted_at, deadline-seeding accept_check (420/600 by tier), expire_stale_filming() + 5-min unclaimed window + RED pgTAP scaffolds (D-01/D-02/D-03)
- [x] 07-02-PLAN.md — Money Edge fns: trouble-report (PI cancel + flat no-fault Transfer), scout-earnings (DB aggregate + Stripe balance), stripe-connect-payout (instant net, never gross) + deno tests (D-04/D-06)
- [x] 07-03-PLAN.md — Client wiring: filming countdown reads deadline_at, Trouble-Here calls reportTrouble, earnings + withdraw show/move real money (D-01/D-04/D-06)
- [x] 07-04-PLAN.md — [BLOCKING] live deploy: push 0015 + enable pg_cron/pg_net + schedule sweeps + sla-sweeper hold release + deploy functions + regen types + on-device walk-through (D-01..D-06)

### Phase 8: On-device face blur — custom Expo native module: post-record blur of faces in the recorded clip before upload (iOS AVFoundation+Vision+CoreImage, Android MediaCodec+MLKit), avoiding the worklets-core/New-Arch crash class; server-side detect-and-hold kept as dormant last-resort net

**Goal:** A Scout films a clip and the DELIVERED clip the Seeker watches has faces blurred, done automatically ON-DEVICE before upload (raw never leaves the phone on the happy path), via a custom local Expo module (iOS AVFoundation + Vision + Core Image) wired at the single record→upload seam. Built and verified in 6 isolated on-device steps so a failure is caught at the smallest layer (the lesson from the worklets-core crash-after-crash). Flag-gated so an incomplete blur path never blocks the working upload; blur failure falls back to the dormant server-side detect-and-hold so no unblurred face is ever delivered (D-04/D-07). iOS-first for beta; Android is a fast-follow.

**Requirements**: BLUR-NATIVE-01, BLUR-03, BLUR-04, BLUR-05
**Depends on:** Phase 7
**Plans:** 6 plans

Plans:
- [x] 08-01-PLAN.md — Step 1: scaffold the local lmc-blur Expo module (no-op) + lock the BlurResult contract; [DEVICE] empty module links + app boots
- [x] 08-02-PLAN.md — Steps 2+3: AVFoundation re-encode (export links) + Vision face detection (count only, no blur yet); [DEVICE] re-encode plays audio-free + face count plausible
- [x] 08-03-PLAN.md — Step 3: Core Image blur composited to detected face rects; [DEVICE] Troy confirms his face is blurred in the saved clip
- [ ] 08-04-PLAN.md — Step 4: full 15s 1080p clip end-to-end with temporal coverage + perf/memory tuning; [DEVICE] whole-clip blur, acceptable time, no OOM
- [ ] 08-05-PLAN.md — Step 5: wire blurFaces into submit() flag-gated + retry→pixelate→server-hold fallback; [DEVICE] flag on/off + forced-failure never uploads raw
- [ ] 08-06-PLAN.md — Step 6: end-to-end (Troy confirms DELIVERED clip blurred) + remove dead worklets-core live-blur scaffold; [DEVICE] post-cleanup build still compiles + blurs

### Phase 9: Verified badge + Scout identity + quick-win reconnects — surface real gps_verified + real Scout name/rating on delivery; reconnect saved places, recurring checks, payment-method cards, notification prefs, profile stats to existing backend; remove fake AI-verdict/crowd copy

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 8
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 9 to break down)

### Phase 10: Push notifications — Expo Push + device-tokens table, notify Scouts of nearby jobs + Seekers on delivery, wire notification preference toggles

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 9
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 10 to break down)

### Phase 11: Apple submission readiness — hide unfinished growth screens, privacy policy URL, account deletion, demo reviewer account, App Privacy labels + metadata + screenshots, stability pass, TestFlight + App Store submit

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 10
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 11 to break down)
