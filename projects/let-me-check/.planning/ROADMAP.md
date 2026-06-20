# Roadmap: Let Me Check (LMC)

## Overview

LMC is a complete React Native + Expo UI prototype running entirely on mock data — every Seeker and Scout screen works, but nothing behind them is real. This roadmap wires real backend and services behind the existing screens, core-loop-first, so each phase ships something that actually works before the next layer plugs in. The order is dependency-driven: real identity and persistence first, then one genuine check end-to-end (no money), then video and payments in parallel, then the hard real-time dispatch + geofence layer, then the verification moat and trust/safety, and finally notifications, markets, B2B, and the New York launch. The app is built nationally (markets are data) but rolled out one city at a time, starting with NYC. The product is launched when a Seeker in New York can pay for and reliably receive a genuine, location-true 15-second clip filmed by a real Scout, fast.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Foundation (Auth + Persistence + Event Log)** - Real identity, real database behind every screen, immutable event log from day one
- [ ] **Phase 2: One Real Check (no money, no dispatch)** - A genuine server-owned check moves through real states, watched live by the Seeker
- [ ] **Phase 3: Video Pipeline** - Real in-app camera capture, audio-stripped, resilient upload, Mux-delivered clip (parallel with Phase 4)
- [ ] **Phase 4: Money (Payments + Payouts + Scout Onboarding)** - Card hold at request, charge on delivery, Stripe Connect payouts, low-friction Scout onboarding (parallel with Phase 3)
- [ ] **Phase 5: Real-Time Dispatch + Geofence** - Only in-fence Scouts pinged, atomic claim, live status, location integrity, no-film zones
- [ ] **Phase 6: Verification Moat + Trust & Safety** - Reference-photo confirm, AI signage auto-reject, AI Verdict, manual review, dispute loop
- [ ] **Phase 7: Notifications, Markets, B2B + New York Launch** - Push both directions, recurring checks, data-driven markets, partner venues, NYC live

## Timeline (estimated effort)

These are **build estimates for AI-assisted development** (Guy implements; Troy provides accounts/decisions/testing). They are ranges, and firm up when each phase is planned in detail. **Calendar time is driven more by external gates and Scout recruitment than by coding.**

| Phase | Focused build effort | External gate / what Troy does |
|-------|----------------------|--------------------------------|
| 1 · Foundation | ~1–1.5 wk | Supabase + Twilio (OTP) account setup |
| 2 · One Real Check | ~1 wk | — |
| 3 · Video Pipeline *(∥ 4)* | ~1–1.5 wk | Mux account; needs an EAS dev build (native camera) |
| 4 · Money *(∥ 3)* | ~1.5–2 wk | **Stripe Connect KYC takes 1–7 days — start the paperwork early** |
| 5 · Dispatch + Geofence | ~2 wk (the hard one) | — |
| 6 · Verification + AI | ~1.5–2 wk | Google Vision account |
| 7 · Push, Markets, B2B + NYC Launch | ~1.5–2 wk | **Florida/NYC legal review**; **NYC Scout recruitment (marketing/ops)** |

**Rolled up (Phases 3 & 4 run in parallel):** roughly **2.5–3 months of focused build** to *"New York technically ready to take real checks."*

**What that does NOT include (the real launch gates, run in parallel, not code):**
- **Scout supply in NYC** — the cold-start. Until enough gig drivers are live, "launched" isn't real. This is the influencer/recruitment effort, and it's the true determinant of go-live.
- **Legal sign-off** (filming/consent per market) and **Apple TestFlight/review** cycles.
- **Real-world iteration** — verification thresholds, dispatch tuning, and edge cases only surface with real clips and real users.

> Honest framing: the *engineering* is a ~2.5–3 month effort with me building. The *business* — getting Scouts dense enough in NYC that a Seeker always gets a clip — is the thing that actually decides launch, and it runs alongside Phases 5–7.

## Products & technology per phase

The specific services each phase wires in (from the locked, research-validated stack in `docs/STACK.md` + `.planning/research/STACK.md`). The exact *how* — database schemas, API endpoints, library versions, code — is detailed in each phase's `PLAN.md` when that phase is planned (`/gsd-plan-phase N`).

| Phase | Products / technology used |
|-------|-----------------------------|
| 1 · Foundation | **Supabase** (Postgres DB, Auth: Sign in with Apple/Google + phone OTP, Row-Level Security) · **Twilio Verify** (SMS OTP) · event log in **Postgres + Timescale** |
| 2 · One Real Check | **Supabase Realtime** (live status to Seeker) · Postgres server-owned state machine · **Mapbox** (already wired) |
| 3 · Video Pipeline | **react-native-vision-camera** (live in-app capture, audio stripped) · **Mux** (direct upload → transcode → CDN playback) |
| 4 · Money | **Stripe PaymentIntents** with *manual capture* (hold at request → capture on delivery → auto-release) · **Stripe Connect Express** (Scout payouts, tax/KYC + 1099, instant payout) |
| 5 · Dispatch + Geofence | **PostGIS** (geofence `ST_DWithin`) · **Supabase Realtime/Broadcast** (server-driven dispatch pings) · a **durable job runner** (dispatch timeouts + payment-hold-expiry safety) · Mapbox |
| 6 · Verification + AI | **Google Vision API** (signage/logo detection + GPS cross-check → auto-reject) · **Claude** (AI Verdict summary from frames) · reference-photo confirm · manual-review tooling |
| 7 · Push, Markets, B2B + NYC Launch | **Expo Push** (notifications both ways) · data-driven market/admin config · partner-venue management · **Brevo** (transactional email / receipts — existing account, replaces Resend) |

*Note: `H3` and `ffmpeg-kit` from the original stack were dropped (PostGIS alone covers beta scale; ffmpeg-kit was retired) — see `.planning/research/STACK.md`.*

## Infrastructure & hosting

LMC runs on **managed, serverless infrastructure — there is no server to rent or babysit** (deliberate for a small, non-technical-led team).

- **Backend host = Supabase** — managed Postgres + PostGIS, Auth, Realtime, Storage, and **Edge Functions**. Runs on AWS under the hood; Supabase operates it. The Edge Functions are the "server": they own every privileged action (money, dispatch, state transitions, webhooks), and secrets (Stripe/Mux keys) live only there.
- **Durable job runner = Inngest or Trigger.dev** (managed) — for anything with a timer/retry: dispatch timeouts, payout release, signage AI, push fan-out, recurring checks. Phase 4 onward depends on this.
- **Hot cache = Upstash Redis** (serverless, pay-per-use) — online-Scout set + per-venue cooldown TTLs.
- **App distribution = EAS** (Expo cloud build) → Apple App Store / TestFlight (Google Play later). The app isn't hosted; it's shipped.

**Storage — "do we need S3?" → no separate AWS bucket to manage:**
- **Video clips → Mux** (managed upload → transcode → CDN). Clips upload **device-direct; no video ever touches our infra**.
- **Photos & files (reference photos, profile pics) → Supabase Storage**, which is **S3-compatible / S3-backed** — so that *is* our S3, managed through Supabase.
- **Structured data + the immutable event log → Postgres + Timescale** (in Supabase).

A dedicated AWS S3 bucket is trivial to add later for raw archival if ever needed, but is **not required for v1**.

## Cost model

Estimates (ranges). Principle: managed/serverless = **cost scales with usage, near-zero idle**. Infra is *not* the cost risk — Scout recruitment is.

**Beta (one city):**
- **Fixed platform ≈ $50–150/mo** — Supabase Pro (~$25), Apple Developer ($99/yr), domain; Inngest/EAS/Upstash on free/pay-per-use.
- **Variable ≈ ~$0.80–1.00 per check**, paid *out of revenue*. On a $15 Standard check: Scout $8.00 + Stripe ~$0.74 + Mux/Vision/Claude ~$0.05 → **LMC nets ~$6.20**.
- ~500 checks/mo → roughly **$100/mo platform + per-check fees from revenue**. ("Run cost is a rounding error" — original plan.)

**Scale:**
- Variable scales ~linearly (≈95% Stripe fees, deducted per sale → margin holds). SaaS tiers (Supabase Team, Mux volume) step up at real volume but stay low single-digit % of GMV (e.g. 50k checks/mo ≈ ~$300k gross vs a few $k infra).

**The costs that actually matter (none are infra):**
1. **Scout recruitment / marketing** — seeding gig drivers + influencer GTM per city. The real budget line; a growth decision, not engineering.
2. **Refund leakage** — "Scout keeps pay on a passing-clip refund" means LMC funds those (small % loss to track).
3. **Legal review** — per state/country.

**⚠️ Cost RISK — Apple's 30% cut:** digital goods are taxed 30%; **real-world services (Uber/DoorDash) bill via Stripe directly and avoid it.** LMC is a real-world service, so it *should* qualify — but **confirm against Apple guidelines early** (handled in the launch phase); if forced into in-app purchase, 30%/check would dent the economics badly.

## Testing strategy

Today there are **no automated tests** (only `tsc` + manual QA) — fine for a UI prototype, not for real money + trust. Principle: **test heavily where a silent bug costs money or trust; lightly on visuals** (real-device QA covers the UI).

**Automated (Vitest/Jest), run against staging Supabase + Stripe test mode + Mux test:**
- **Money math** — pricing, fees, $8/$12 split, refunds, auth-hold → capture-on-delivery (a wrong number = lost money)
- **Check state machine** — valid/invalid transitions, no double-charge, no deliver-without-clip
- **Dispatch concurrency** — the double-booking race (two Scouts accept at once) — explicit test
- **Verification rules** — geofence pass/fail, cooldown, AI auto-reject thresholds
- **Webhooks** — Stripe/Mux signature verify → correct state transition

**E2E** on the critical happy path **and** failure paths (no-Scout timeout, hold release, double-claim, upload-fail-retry).

**Manual / real-device (Troy, via TestFlight)** — camera capture, GPS accuracy, weak-network upload, push notifications: the things only real hardware/network reveal.

**How it fits the build:**
- **Phase 1 stands up the test harness** (runner + staging env + Stripe/Mux test mode) so later phases add tests cheaply.
- **Each phase ships tests for its own risky logic** (Money phase → payment tests; Dispatch phase → race test; Verification phase → pass/fail tests). Targeted, not blanket coverage.
- **GSD's per-phase Verifier (enabled in config)** checks each phase's deliverables against its requirements as an automated acceptance gate.
- Everything runs in **test mode (fake money, test clips)** until proven, then promoted to live.

## Phase Details

### Phase 1: Foundation (Auth + Persistence + Event Log)
**Goal**: Real identity and a real database sit behind every screen, with an immutable event log recording everything from the very first action.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, DATA-01, DATA-02, DATA-03, DATA-04, SAFE-02
**Success Criteria** (what must be TRUE):
  1. A user can sign up / sign in with Apple, Google, or phone + OTP, and stays signed in across app restarts (the prototype auth screens now do real work)
  2. One account holds both roles; a user can switch between Seeker and Scout and sign out, with role and ownership enforced server-side (not just by client routing)
  3. Saved places, recents, payment method, and role survive an app restart because they persist in Supabase, not in-memory stores
  4. A check's lifecycle is a server-owned state machine; the client holds no business logic or secrets
  5. Every meaningful action is written to an immutable event log with timestamp + geo + context, and 18+/consent/AUP acceptance is recorded against the account at onboarding
**Plans**: 3 plans (3 waves)
- [ ] 01-01-PLAN.md — Supabase backend: event-log-first schema, RLS on every table, check state machine, test harness, schema push
- [ ] 01-02-PLAN.md — Client data+auth layer: SecureStore session, Apple/Google/phone-OTP sign-in, boot gate, typed api wrappers
- [ ] 01-03-PLAN.md — Persist the 6 stores via Supabase, record consent (SAFE-02), role switch + sign-out, EAS env, on-device verification

### Phase 2: One Real Check (no money, no dispatch)
**Goal**: Prove the Postgres-as-state-machine + Realtime spine — a genuine check is created, moves through real states (including failure states), and the Seeker watches it live.
**Depends on**: Phase 1
**Requirements**: CHECK-01, CHECK-02, CHECK-03, CHECK-05, CHECK-06, DISP-04
**Success Criteria** (what must be TRUE):
  1. A Seeker can request a check at a chosen location and tier, and a real check row is created server-side
  2. The Seeker sees live status driven by real state transitions (finding → accepted → filming → delivered), replacing the prototype's fake countdown — including honest no-Scout / cancelled / timed-out paths
  3. A Scout can accept a request (manually routed at this stage) and is guided through to a delivered result
  4. A Seeker can watch the delivered check, see when and where it was filmed, and rate it — and the rating persists
**Plans**: TBD

### Phase 3: Video Pipeline
**Goal**: Replace the simulated camera with real in-app capture and a resilient pipeline that produces a genuine, audio-free clip the Seeker can actually watch.
**Depends on**: Phase 2 (can run in parallel with Phase 4)
**Requirements**: VID-01, VID-02, VID-03, VID-04
**Success Criteria** (what must be TRUE):
  1. A Scout films a live 15-second clip in-app; importing from the camera roll is blocked (fresh-capture enforced)
  2. Clips are video-only — audio is never recorded (sidesteps all-party-consent exposure)
  3. An upload survives a weak/dropped mobile network (resumable, retried, persisted locally first) and the job is not marked done until the server confirms receipt
  4. The Seeker watches a real transcoded clip streamed smoothly from CDN (Mux), with playback scoped to the buying Seeker
**Plans**: TBD
**UI hint**: yes

### Phase 4: Money (Payments + Payouts + Scout Onboarding)
**Goal**: Real money flows correctly and safely — held at request, charged only on delivery, paid out to Scouts via Stripe Connect, with the lowest-friction onboarding that's legally possible.
**Depends on**: Phase 2 (can run in parallel with Phase 3); durable job runner stood up here
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, SCOUT-01, SCOUT-02
**Success Criteria** (what must be TRUE):
  1. A Seeker's card is authorized (held) when they confirm a request, with card data tokenized by Stripe (no raw card numbers reach our servers)
  2. The Seeker is charged on delivery; if no Scout accepts or nothing is delivered, the hold is released and they are never charged
  3. A Scout completes payout setup via Stripe Connect Express — identity is only the legally-required tax + Stripe KYC, with no background check and no separate ID/selfie step — and agrees to the Scout Code
  4. A Scout is paid out via Stripe Connect Express (with an instant-payout option), and keeps their pay when a passing clip is refunded (LMC funds the refund)
  5. A Seeker can be refunded, and disputes/chargebacks are handled and absorbed by the platform, not the Scout
**Plans**: TBD

### Phase 5: Real-Time Dispatch + Geofence
**Goal**: The hardest layer — real-time, server-driven dispatch that pings only eligible in-fence Scouts, assigns each job to exactly one Scout, and enforces location integrity and no-film zones.
**Depends on**: Phase 2 (loop), Phase 3 (video), Phase 4 (money) — built once the loop works end-to-end
**Requirements**: DISP-01, DISP-02, DISP-03, SCOUT-03, VER-01, VER-03, VER-05, SAFE-01
**Success Criteria** (what must be TRUE):
  1. A Scout can go online / set availability, and only Scouts inside the location's geofence are pinged for a request
  2. A request is claimed atomically — two Scouts can never be assigned the same job — and if no one accepts in the window it times out gracefully (hold released / refund, Seeker notified)
  3. Capture is GPS-geofenced and the clip is GPS-stamped at the right place and time, with spoofed/mock GPS detected and rejected
  4. A Scout has a per-location cooldown (anti-farming), and requests geofenced to no-film zones (hospitals, schools, courts, police, residences) are auto-blocked
**Plans**: TBD

### Phase 6: Verification Moat + Trust & Safety
**Goal**: Make every paid clip trustworthy — the AI + human verification stack that auto-rejects fakes, summarizes the clip, and gives a defensible dispute loop.
**Depends on**: Phase 5 (reads the dispatch + GPS verification trail), Phase 3 (clips), Phase 4 (payout gate / refunds)
**Requirements**: VER-02, VER-04, VER-06, VER-07
**Success Criteria** (what must be TRUE):
  1. A Scout confirms a reference photo of the target before filming (catches wrong-place before capture)
  2. AI signage/place detection runs on every clip and auto-rejects wrong or faked clips; ambiguous cases fall to a targeted manual-review queue
  3. Every delivered clip carries an AI Verdict one-line read (e.g. "short line · medium energy") — qualitative, deliberately not a precise headcount
  4. A manual-review path exists for flagged or disputed clips, and the verification verdict gates Scout payout
**Plans**: TBD

### Phase 7: Notifications, Markets, B2B + New York Launch
**Goal**: Final integration and go-live — push both directions, recurring checks on real dispatch, data-driven markets an operator can switch on without a deploy, partner venues, and New York live.
**Depends on**: Phase 5 (dispatch), Phase 6 (verification) — the loop must be trustworthy and paid first
**Requirements**: NOTIF-01, NOTIF-02, REC-01, MKT-01, MKT-02, MKT-03, B2B-01, B2B-02
**Success Criteria** (what must be TRUE):
  1. Scouts get push alerts for nearby jobs and Seekers get a push when their clip is delivered — reaching a backgrounded device reliably
  2. Recurring checks (already prototyped) fire against real dispatch and billing
  3. Markets carry country, currency, locale, venues, coverage, and pricing as data, and an operator can activate a new city via admin with no engineering release — New York first, with Miami, LA, Atlanta, Chicago, Houston, San Francisco supported next
  4. Partner venues unlock interior checks (30-sec, +$5) with partner onboarding/management, and partner status surfaces in the app at the relevant check
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → (3 ∥ 4) → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation (Auth + Persistence + Event Log) | 0/3 | Not started | - |
| 2. One Real Check (no money, no dispatch) | 0/TBD | Not started | - |
| 3. Video Pipeline | 0/TBD | Not started | - |
| 4. Money (Payments + Payouts + Scout Onboarding) | 0/TBD | Not started | - |
| 5. Real-Time Dispatch + Geofence | 0/TBD | Not started | - |
| 6. Verification Moat + Trust & Safety | 0/TBD | Not started | - |
| 7. Notifications, Markets, B2B + New York Launch | 0/TBD | Not started | - |
