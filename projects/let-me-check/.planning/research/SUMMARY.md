# Project Research Summary

**Project:** Let Me Check (LMC)
**Domain:** On-demand, real-time, location-based two-sided gig marketplace with a mobile video pipeline (Seeker pays → in-fence Scout films a 15-sec clip → delivered in 7–10 min)
**Researched:** 2026-06-19
**Confidence:** HIGH

## Executive Summary

LMC is an Uber-style real-time gig marketplace where the deliverable *is* the trust: a Seeker pays $15–20 up front for a genuine, recent, right-place 15-second clip filmed by a Scout standing inside the venue. Experts build this exact shape as a **thin server orchestrator over a Postgres source-of-truth on managed services** — Supabase (DB/auth/realtime/storage), Stripe Connect Express (charge + payout), Mux (video), vision-camera (capture), PostGIS + Mapbox (geo), Expo Push (alerts), Stripe Identity (KYC). The locked stack in `docs/STACK.md` is the correct, mainstream 2025/2026 toolkit and is **approved as-is for the beta** — the research confirms it, refines a few flows, and flags the real risks rather than re-litigating the choices.

The recommended approach is to sequence **core-loop-first** (PROJECT.md's locked decision) and let dependencies dictate the order: auth + persistence → one bare check (no money, no dispatch) → video and payments in parallel → real-time dispatch + geofence (the high-risk long pole) → beta-grade verification → push/recurring/launch. The single most important architectural rule is that **the server owns every state transition and secret** — the `checks.status` column is the workflow, clients only request actions and subscribe to "rows about me." Three patterns are load-bearing: auth-hold payments (`capture_method=manual`), atomic first-wins dispatch claims, and token-handoff for direct Stripe/Mux access with signature-verified, idempotent webhooks.

The risks that kill this product are invisible in a demo and lethal in production: it can look 100% done in TestFlight and still be a non-functioning *business*. The big ones — and they must become explicit phases/requirements, not polish — are **cold-start supply liquidity** (a hard geofence makes supply thinner than Uber; ~67% of failed marketplaces die supply-side), **faked/wrong-place clips** (the moat must hold during the exact window trust is being built, even with AI signage deferred), **Florida all-party audio consent** (video-only/audio-stripped is the cheap, mandatory mitigation — recording strangers' audio is a felony), **chargebacks landing on the platform** (capture-on-delivery, hold payouts past a dispute window), **Stripe KYC friction silently throttling Scout supply**, and **dispatch double-assignment races**. A curated 20-venue allow-list for the beta (no arbitrary pin-drops) single-handedly neutralizes most no-film-zone and stalking exposure.

## Key Findings

### Recommended Stack

The locked stack is sound and approved for beta — every piece is managed, well under all free/Pro ceilings, minimal ops, which is right for a small non-technical-led team. Research confirmed the core choices and applied four cleanups: **drop `react-native-maps`** (unused dead dependency; Mapbox is the live map layer), **avoid `ffmpeg-kit-react-native`** (retired/archived by its maintainer in 2025 — a supply-chain dead end; use Mux direct-upload transcode or vision-camera native settings instead), **defer H3** (plain PostGIS `ST_DWithin` with a GiST index handles 50 scouts / 20 venues fine — H3 is a scale-readiness layer, not a beta blocker), and **fix the RN version note** (package.json says 0.81.5, not the docs' 0.83.2 — trust package.json).

**Core technologies:**
- **Supabase** (Postgres 15+ / PostGIS 3.4+) — DB, auth, storage, realtime, edge functions — one managed platform; PostGIS is the standard geofencing backend, enable Day 1
- **Stripe Payments + Connect Express** — Seeker auth-hold charge + Scout marketplace payouts with KYC/tax built in — use `PaymentIntent(capture_method='manual')` + separate-charges-and-transfers
- **Mux** — video direct-upload → transcode → adaptive HLS CDN — no video ever touches your server; use resumable uploads + `passthrough=checkId` correlation
- **react-native-vision-camera** ^4.6.x — real capture with frame processors for future on-device AI — requires EAS dev build (already your reality), NOT expo-camera
- **Mapbox** (`@rnmapbox/maps`, installed) — map UI for both roles — keep; server-side PostGIS is the authoritative geofence, Mapbox/Turf is UX hint only
- **Expo Push** + **Stripe Identity** — transactional alerts + Scout KYC — fine for beta; Push needs receipt-checking + retry, KYC gates *payout* not *work*
- **Supporting:** `react-native-mmkv` (replace in-memory stores), `react-hook-form`+`zod`, `@turf/turf`, Sentry + PostHog before beta, **Inngest or Trigger.dev** durable job runner (stand up at the payments phase)

See `STACK.md` for full version compatibility, the payment-flow pattern, and risk flags (7-day auth-hold window, Supabase Realtime 500-connection Pro ceiling, KYC timing).

### Expected Features

LMC's category doesn't exist yet; the differentiator is **trustworthy real-time visual truth, delivered fast** — concentrate on integrity + speed + supply liquidity, not breadth. Scoped to the Miami nightlife beta (50 Scouts, 20 venues, 500 checks).

**Must have (table stakes — abandon without these):**
- Real auth + persistent sessions; request a check at a curated venue + tier
- Honest "Finding a Scout" state with a clear **no-Scout outcome** (and no charge)
- Live order tracking (accepted → filming → uploading → delivered) + push both directions
- Reliable clip capture, upload, and playback with timestamp + place label
- Stripe auth-hold pay (charged only when fulfilled) + Connect payouts + KYC
- **Refund / "this isn't right" flow + manual-review/admin console** — table stakes, NOT a differentiator
- Ratings, Scout safety minimum (SOS + share-location + decline-no-penalty), age/consent/AUP gates enforced server-side

**Should have (competitive differentiators):**
- The verification moat as a visible promise (geofence ping → reference-photo → GPS-stamped clip → cooldown → manual review)
- Speed SLA / live countdown ("7–15 min or refund"); Priority tier; **single dual-role account** (a powerful cold-start lever)
- **Supply-aware "available now"** — show a venue checkable only when a verified Scout is actually in-fence (the highest-leverage cold-start UX; implied but not named in PROJECT.md — elevate it)
- Clip authenticity metadata surfaced ("verified time + place" badge)

**Moat features missing from PROJECT.md (flag to requirements):**
- **Fresh-capture enforcement** (live in-app capture only, block gallery import) — **P1**, load-bearing for the moat
- **GPS-spoof / mock-location detection** — **P2**, the cheapest most common attack

**Defer (v1.x / v2+):**
- Recurring checks wiring, device fingerprint, scout incentive ledger (v1.x once 500 checks prove the loop)
- AI signage detection (needs labeled clip corpus from beta), Scout Elite, second city, B2B/interior/live feed/Library mode (v2+)

**Anti-features (deliberately NOT for beta):** AI signage auto-reject, live-streaming, committed audio, open "film anywhere" pin-drops, Seeker↔Scout chat, tipping, multi-city, public social feed, crypto/points.

See `FEATURES.md` for the full table-stakes/differentiator/anti-feature breakdown, the cold-start playbook, and the dispute/refund + Scout-safety detail.

### Architecture Approach

The standard shape is a **thin server orchestrator over a Postgres source-of-truth**: the `checks.status` column IS the workflow, Realtime is a read-side notification channel (never the brain), a small set of Supabase Edge Functions own every privileged action (money, dispatch, state transitions, webhooks), and a durable job runner (Inngest/Trigger.dev) owns anything delayed or retried (timeouts, payout release, push fan-out). The client holds **no business logic and no secrets** — only short-lived vendor tokens — and subscribes only to "rows about me." This single discipline is the biggest reliability lever for a non-technical-led team.

**Major components:**
1. **Postgres + PostGIS (Supabase)** — source of truth; geofence polygons + Scout positions; RLS everywhere; emits Realtime events
2. **Edge Functions** (`checks`, `dispatch`, `payments`, `media`, `webhooks`) — one folder per privileged action; secrets live only here; server-only `status`/`scout_id` writes
3. **Durable job runner** (Inngest/Trigger.dev) — dispatch timeout waves, auth-hold safety expiry, payout release, push fan-out (becomes load-bearing at the payments phase)
4. **Redis (Upstash, optional for beta)** — online-Scout set + cooldown TTL keys
5. **External services** — Stripe (auth-hold/capture/transfer), Mux (direct upload + signed HLS, `passthrough` correlation), Mapbox/Places, Expo Push

**Key patterns:** status-column state machine; server-driven dispatch + per-user subscriptions (never a global "open jobs" firehose — Supabase Postgres Changes is single-threaded and won't scale that way); token-handoff with signature-verified, idempotent webhooks. See `ARCHITECTURE.md` for the data flow, project structure, and five named anti-patterns.

### Critical Pitfalls

1. **Cold-start supply liquidity** — a hard 30–50m geofence makes supply thinner than Uber (a Scout three doors down is useless). Fix is 80% ops: recruit/verify 50 Scouts *before* Seeker marketing, manufacture liquidity with paid "Scout shifts" at the 20 venues on peak nights, and be honest in the no-Scout empty state (capture it as demand signal). Dispatch must expose live in-fence Scout counts so ops sees liquidity holes.
2. **Faked / staged / wrong-place / recycled clips** — even with AI signage deferred, the moat MUST include: **in-app-capture only** (no camera-roll, ever), **mock-location/jailbreak detection** (highest-ROI, cheap), server-side GPS/time stamping, sensor-trace + server nonce, clip hashing, and a *targeted* (not blanket) manual-review queue. Do not ship paid checks with only a static "GPS Verified" UI pill.
3. **Florida all-party audio consent** — recording strangers' audio is a 3rd-degree felony (Statute 934.03). **Strip/mute audio by default for the beta** — a 15-sec visual check doesn't need it. Cheap to prevent, expensive to recover. Legal review before launch.
4. **No-film zones / stalking / creepy-use** — constrain the beta to the **curated 20-venue allow-list** (no arbitrary pin-drops) + a no-film blocklist (hospitals, schools, courthouses, residences) + AUP + Scout decline/report. Launch-blocking, not polish.
5. **Chargebacks land on the platform, not the Scout** — with Connect, LMC eats the disputed $15 + ~$15 fee while already having paid the Scout $8. **Capture on delivery (not acceptance)**, hold Scout payout past a dispute window, run Stripe Radar, auto-attach the verification trail (GPS stamp + timestamp + viewed-receipt) as dispute evidence, watch the ~1% network threshold.
6. **(also critical) Stripe KYC friction** silently throttles supply (gate payout not work; instrument the onboarding funnel; handle `account.updated` webhooks) and **dispatch double-assignment races** (atomic conditional `status` claim + idempotent accept; test concurrency explicitly).

See `PITFALLS.md` for all 11 pitfalls, the "Looks Done But Isn't" checklist, integration gotchas, and the pitfall-to-phase mapping.

## Implications for Roadmap

Dependencies dictate the order, and PROJECT.md's locked decisions (full-product destination, core-loop-first sequencing, beta-grade verification with AI signage deferred) align cleanly with the architecture's build-order. Each phase is usable before the next exists.

### Phase 1: Auth + Persistence Foundation
**Rationale:** Nothing can be real until rows persist and identity is real — every downstream feature (money, reputation, dispatch) depends on it.
**Delivers:** Supabase project + schema (`users`, `scouts`, `venues` with PostGIS polygons, `checks`), RLS, real auth (Apple/Google/phone OTP), MMKV-backed client state replacing the in-memory `app/state/*` stores. Also the repo cleanups (drop `react-native-maps`, fix RN version note, gitignore cruft).
**Addresses:** Real auth + persistent sessions (table stakes).
**Avoids:** "Role enforcement only in client routing" — enforce role + ownership via server-side RLS from Day 1.

### Phase 2: One Real Check (no money, no dispatch)
**Rationale:** Prove the Postgres-as-state-machine + Realtime spine cheaply before layering money or the hard dispatch logic onto it.
**Delivers:** `checks-create` + manual server status transitions + Seeker subscribing to its own check row. Replaces the prototype's `setInterval` happy-path with a real state machine (incl. failure states).
**Implements:** Status-column state machine; server-driven, per-user subscriptions (architecture pattern 1 & 2).
**Avoids:** "Fake countdown that ignores reality" and "client orchestrates the workflow."

### Phase 3: Video Pipeline  *(parallel with Phase 4)*
**Rationale:** Independent of payments/dispatch; only depends on Phases 1–2. Delivers the visible "wow" and can run in parallel.
**Delivers:** `media-upload-url` + vision-camera capture + **fresh-capture enforcement (in-app only, no gallery)** + **audio stripped** + **resumable/background upload + local-persist-first** + Mux → `webhook-mux` → playable signed HLS clip in delivery.
**Uses:** Mux, vision-camera (STACK.md). **Avoids:** Florida audio-consent pitfall, recycled-clip fraud, and "filmed but never arrives" upload failures (the operating environment guarantees bad nightlife networks).

### Phase 4: Payments  *(parallel with Phase 3)*
**Rationale:** Slots onto the existing check state machine at `authorized`/`assigned`/`delivered`; only depends on Phases 1–2. Stand up the durable job runner here (auth-hold safety expiry).
**Delivers:** `payments-authorize` (manual-capture hold) → **capture on verified delivery** → Connect Express payout + Stripe Identity + Connect onboarding funnel + webhook-driven KYC status UI. Stripe Radar + auto-evidence + payout-hold-past-dispute-window.
**Avoids:** Chargebacks-on-platform, KYC-friction-throttles-supply, and the capture-timing trap. **Note:** research recommends capture-on-*delivery* (PITFALLS) where PROJECT.md/STACK currently say capture-on-*acceptance* — see Business Decisions below.

### Phase 5: Real-Time Dispatch + Geofence  *(critical-path long pole)*
**Rationale:** Highest-complexity, highest-risk new backend logic. Build it once the loop + money are proven so it has a real pipeline to plug into. Geofence enforces the venue allow-list + no-film blocklist.
**Delivers:** PostGIS `ST_DWithin` eligibility (online ∩ in-fence ∩ not-cooled-down), targeted push, **atomic first-wins accept**, dispatch-timeout/re-ping waves, cooldown, **supply-aware "available now"**, Scout reliability scoring + accept-timeout reassignment, honest no-Scout demand capture.
**Avoids:** Double-assignment races, thundering-herd, Scout no-show/SLA-miss, battery/location/push reliability, cold-start liquidity (product half).

### Phase 6: Beta-Grade Verification + Trust & Safety
**Rationale:** Layers onto dispatch + media; the moat that makes the product trustworthy and the refund loop defensible. T&S is launch-blocking.
**Delivers:** Reference-photo confirm, server-side GPS-stamp-inside-fence verdict, **mock-location/jailbreak detection**, targeted manual-review queue, rating → payout gate, **refund/dispute loop + Scout-protection policy**, AUP/no-film enforcement, Scout SOS/decline-report + human-on-call. (AI signage detection deferred per PROJECT.md.)
**Avoids:** Faked clips, no-film/stalking incidents, Scout physical safety, refund-trail-needed-for-chargeback-defense.

### Phase 7: Push, Recurring, Polish + Miami Launch
**Rationale:** Final integration once the loop is trustworthy and paid.
**Delivers:** Full Expo Push fan-out via job runner, recurring-check scheduler wiring, Sentry/PostHog, then the Miami beta (50 Scouts, 20 venues, 500 paid checks / 90 days). Supply-first ops: recruit + verify Scouts and manufacture liquidity *before* Seeker marketing.

### Phase Ordering Rationale
- **Dependency-driven:** auth → bare loop → (video ∥ payments) → dispatch → verification → launch. Each layer is independently usable; the loop works end-to-end before the risky dispatch layer plugs in.
- **Parallelism:** Phases 3 (video) and 4 (payments) are independent and can run concurrently; both depend only on 1–2. The durable job runner becomes load-bearing at Phase 4.
- **Risk-back-loaded sensibly:** dispatch (Phase 5) is the long pole and benefits from a proven pipeline; verification (Phase 6) reads the verification trail that dispatch + media produce, and the refund/Scout-protection policy depends on the verification verdict existing server-side.

### Research Flags

Phases likely needing `/gsd-research-phase` during planning:
- **Phase 5 (Dispatch):** atomic claim / double-assignment concurrency + tiered-vs-herd dispatch is the highest-risk new logic and most needs tests + deeper research (flagged in both ARCHITECTURE and PITFALLS).
- **Phase 6 (Verification):** liveness/anti-fraud without AI signage (mock-location detection on iOS is harder, sensor-trace, nonce, clip-hashing thresholds) is novel — tune with real data.
- **Phase 4 (Payments):** capture-timing + chargeback-liability + Connect onboarding edge cases warrant a focused pass (and the capture-on-delivery vs acceptance decision).
- **Florida legal review** is a cross-cutting flag (audio consent, no-film zones, surveillance/stalking) — get a Florida-licensed attorney before beta.

Phases with standard patterns (can skip deep research):
- **Phase 1 (Auth/Persistence):** Supabase auth + RLS + migrations are well-documented.
- **Phase 3 (Video):** Mux direct-upload + webhooks is a documented, official flow.

### Open Business Decisions (surface to Troy)

These are policy/product calls, not engineering — decide intentionally before the relevant phase ships:
1. **Capture-on-acceptance vs capture-on-delivery.** PROJECT.md/STACK say capture on Scout *acceptance*; PITFALLS argues capture on *verified delivery* to avoid charge-for-nothing + chargebacks. Recommend **capture-on-delivery** (well within the 7-day auth window). Decide before Phase 4.
2. **Scout-protection refund policy.** Does a Scout keep their $8 when a clip that *passed verification* is refunded? Recommend **yes, platform-funded** — or Scouts learn any complaint costs them money and quit. Shapes the payments + dispute build.
3. **Venue allow-list vs "film anywhere" for beta.** Recommend **curated 20-venue allow-list** (eliminates most no-film-zone + stalking risk). Universal pin-drop is post-beta.
4. **Audio policy.** Recommend **video-only / audio stripped** for beta (Florida consent). One-line decision before camera capture is built.
5. **Background-check depth** beyond Stripe Identity KYC (criminal background for people sent to venues at night?) — duty-of-care + cost call, likely post-beta but decide intentionally.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Mainstream, battle-tested toolkit verified against current Expo/Stripe/Mux/Supabase docs; a few refinements and risk flags, nothing requiring re-litigation. |
| Features | MEDIUM-HIGH | Marketplace mechanics/trust/fraud are HIGH (well-documented Uber/DoorDash/Incognia patterns); LMC-specific verification calls are MEDIUM (novel category, fewer direct precedents — tune thresholds with real data). |
| Architecture | HIGH | Core integration flows verified against official Stripe/Mux/Supabase/PostGIS docs; dispatch/geo patterns against PostGIS docs + marketplace case studies. |
| Pitfalls | HIGH | Marketplace dynamics, fraud, payments, dispatch/video reliability verified against current research; MEDIUM-LOW only on jurisdiction-specific legal edges (flagged for a Florida attorney). |

**Overall confidence:** HIGH

### Gaps to Address

- **Florida legal edges** (audio all-party consent, no-film zones, surveillance/stalking) — MEDIUM-LOW confidence; **confirm with a Florida-licensed attorney before launch.** Default to video-only + venue allow-list to de-risk regardless.
- **Verification thresholds without AI signage** — liveness signal tuning (GPS-edge, motion variance, repeat-venue anomaly routing) needs real clip volume; ship targeted-review + mock-location block first, tune from beta data.
- **iOS mock-location detection** — Android exposes `isMockLocation`; iOS is harder. Research the iOS device-integrity approach during Phase 6 planning.
- **vision-camera v4.6.x exact version** — npm page returned 403 during research; verify at install.
- **Supabase Realtime 500-connection Pro ceiling** — fine for beta; becomes a hard wall at scale (evaluate Ably/Pusher then).

## Sources

### Primary (HIGH confidence)
- Stripe — manual capture / authorization holds (7-day expiry), separate-charges-and-transfers, Connect disputes + risk/liability — https://docs.stripe.com/payments/place-a-hold-on-a-payment-method , https://docs.stripe.com/connect/disputes
- Mux — direct (resumable) upload + webhook flow + `passthrough` correlation — https://www.mux.com/docs/guides/upload-files-directly
- Supabase — Realtime Postgres Changes (filters + single-thread scale limit), Realtime limits / 500-connection ceiling — https://supabase.com/docs/guides/realtime/postgres-changes
- PostGIS — `ST_DWithin` indexed radius query + GiST indexing — https://postgis.net/docs/ST_DWithin.html
- Expo — SDK 54 = RN 0.81; Push notification limits + FCM v1/APNs requirements — https://expo.dev/changelog/sdk-54
- Florida all-party audio consent (Statute 934.03; 3rd-degree felony) — https://www.recordinglaw.com/party-two-party-consent-states/florida-recording-laws/ (confirm with a Florida attorney)
- Project canon — `.planning/PROJECT.md`, `docs/STACK.md`, `docs/BUSINESS-PLAN.md`, `.planning/codebase/` map

### Secondary (MEDIUM confidence)
- Uber / DoorDash / Airbnb cold-start + supply-subsidy playbooks; Reforge marketplace liquidity guides; a16z 67% supply-side-failure stat
- Incognia / Trulioo / iDenfy — gig-economy fraud trends 2026 (GPS spoofing, multi-accounting, collusion), KYC funnels
- Uber Safety Toolkit / DoorDash trusted-contacts — worker-safety baseline
- Mux vs Cloudflare Stream vs Bunny cost comparison; H3-vs-PostGIS dispatch indexing

### Tertiary (LOW confidence)
- vision-camera v4.6.x exact version (npm 403 at research time — verify at install)
- iOS mock-location detection approach (Android `isMockLocation` clear; iOS needs validation)

---
*Research completed: 2026-06-19*
*Ready for roadmap: yes*
