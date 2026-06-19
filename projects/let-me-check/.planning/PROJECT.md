# Let Me Check (LMC)

## What This Is

On-demand visual verification. A **Seeker** pays to have a **Scout** (a real person already on the ground) film a 15-second, video-only clip of any location — a nightclub line, an airport queue, a restaurant, a gym, real estate, anywhere — delivered in 7–10 minutes. One account holds both roles. Tagline: *"Know Before You Go."*

Built for the **whole United States** from day one, but **rolled out city by city** to win each market before opening the next. Launch order: **New York → Miami → Los Angeles → Atlanta → Chicago.**

Today it is a **fully-built React Native + Expo UI prototype on mock data** — every screen and flow works, but there is no real backend, payments, camera, dispatch, or verification yet. This project plans and executes the path from that prototype to a launched product.

## Core Value

**A Seeker can pay for, and reliably receive, a genuine, recent, location-true 15-second clip of a real place — fast.** If that single loop (request → a real Scout films the right place → trustworthy clip delivered) doesn't work, nothing else matters.

## Go-To-Market Strategy (drives the build)

- **Demand = influencer-led, viral.** Hand-picked influencers drive bursts of demand in a city. So **switching a new city ON must be instant and operational** (data/admin, not an engineering release).
- **Supply = the existing gig economy.** Scouts are recruited from **Uber Eats / Postmates / courier drivers (car, motorbike, bike)** who are already idle between orders and already distributed across dense areas. They earn passive income in the dead time. This is the answer to the cold-start risk.
- **Rollout = city-by-city.** Win NYC (coverage + ratings + marketing) → roll the momentum into the next city. The build supports all cities; markets are turned on as Scout supply is dense enough to feel instant.

## Requirements

### Validated

<!-- UI/flow proven in the working prototype. NOT backend-validated. -->

- ✓ Full Seeker flow UI: browse/search → venue → pay → wait → watch + rate — prototype
- ✓ Full Scout flow UI: go online → accept → film → submit → earnings — prototype
- ✓ Single dual-role account with Seeker↔Scout switching — prototype
- ✓ Onboarding + auth UI: Apple/Google/phone+OTP, role picker, consent gates — prototype
- ✓ Real device geolocation (GPS + IP fallback, real city) + live Mapbox maps — wired in prototype
- ✓ "Finding a Scout" dispatch UX + recurring-checks UI — prototype

### Active

<!-- The real build. National build, core-loop-first sequencing. Hypotheses until shipped. -->

**Core loop made real (first)**
- [ ] Real auth (Apple, Google, phone OTP), persistent sessions, dual-role
- [ ] Supabase backend + persistence; server owns the check state machine (no business logic/secrets on client)
- [ ] One real check end-to-end: request → dispatch → Scout films a real clip → upload/transcode → delivered

**Video**
- [ ] In-app **live** camera capture, 15s, **video-only / audio stripped** (fresh-capture enforced; no camera-roll import)
- [ ] Resilient upload on weak mobile networks → Mux transcode → CDN playback

**Money**
- [ ] Authorize a card hold at request; **capture on delivery**; release the hold if no Scout / no delivery
- [ ] Scout payouts via **Stripe Connect Express** (instant payout option); Scout **keeps pay when a passing clip is refunded** (LMC funds it); refund + dispute handling

**Scout onboarding (ultra-low friction)**
- [ ] **No background check.** Only legally-required identity = tax (W-9/1099) + Stripe payout KYC, handled inside Stripe Connect onboarding. No separate ID/selfie step.
- [ ] Connect payout → accept the Scout Code → go online / set availability

**Dispatch + trust (beta-grade verification + safety)**
- [ ] Real-time, server-driven dispatch: only Scouts inside the geofence are pinged; **atomic claim (no double-assignment)**; dispatch timeout/fallback
- [ ] Verification: GPS geofence on capture, reference-photo confirm, GPS-stamped clip, Scout cooldown, manual review + rating
- [ ] **Safety guardrails:** auto-block no-film zones (hospitals, schools, courts, police, private residences); abuse/stalking signals
- [ ] Push (Expo): job alerts to Scouts, delivery alerts to Seekers

**Markets / launch**
- [ ] Cities are **data-driven**; an operator can **activate a new city fast** (admin, no code deploy); per-city venue/coverage data
- [ ] City-by-city rollout starting **New York**; recurring checks wired to real dispatch

### Out of Scope (this build / deferred)

- **Background checks on Scouts** — Scouts never contact the customer; no in-person safety/liability, so unnecessary friction
- **Separate gov-ID + selfie identity verification** — beyond the tax + Stripe-payout KYC that's legally required; don't add friction
- **AI signage detection / auto-reject** — deferred post-beta; manual review covers integrity meanwhile
- **GPS-spoof detection** — fast-follow (v1.5), not the first verification build
- **B2B/partner-interior premium, live feed, AI Scout coach, Library mode** — post-launch vision
- **Audio in clips** — illegal in all-party-consent states (e.g. Florida); video-only, always
- **Native rewrite** — staying on React Native + Expo

## Context

- **Brownfield:** a complete UI prototype (`lmc-app/`) on mock data + in-memory module stores (`lmc-app/app/state/*.ts`) that reset on reload. Full map in `.planning/codebase/`; domain research in `.planning/research/`.
- **Locked target stack** (`docs/STACK.md`, validated by research): Supabase (DB/auth/realtime/storage), Stripe Connect Express (payments/payouts), Mux + react-native-vision-camera (video), PostGIS + Mapbox (geo; **H3 deferred**), Expo Push.
- **Pricing** (`docs/BUSINESS-PLAN.md`): $15 Standard → $8 Scout / $7 platform; $20 Priority → $12 / $8.
- **Already shipping to TestFlight** via EAS (Build 9 live, maps working). iOS-first.
- **Map cleanups:** drop unused `react-native-maps`, avoid retired `ffmpeg-kit`, fix RN version note (0.81.5), gitignore repo cruft.

## Constraints

- **Tech stack**: locked per `docs/STACK.md`; managed services over custom infra.
- **City activation must be ops/data-driven** — turning on a city is an admin action, not a deploy (influencer virality demands speed).
- **Scout onboarding must be ultra-low-friction** — every extra step loses gig-driver supply.
- **Platform**: React Native + Expo, iOS-first. No rewrite.
- **Team**: two founders + AI agents; product lead (Troy) non-technical → reliability + managed services matter.
- **Real money + public filming**: trust/verification, safety guardrails, and legal (18+, consent, no-film zones, audio-off, per-state review) are first-class.
- **Market-aware / international-ready architecture**: money carries a **currency**; a **market** carries country + locale + legal/payout config as **data**. US-only for v1, but built so adding a country later (London → Dubai → Sydney/Melbourne → Singapore → Bangkok/Tokyo/Seoul) is config + a local payout rail, **not a rewrite**. Do NOT hard-code USD or US-only tax/payout assumptions.
- **Monorepo**: lives in the `studio` git repo; `.planning/` committed scoped to `projects/let-me-check`.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| National build, city-by-city rollout (NYC → Miami → LA → ATL → CHI) | Win one market's coverage/ratings/marketing, then roll momentum into the next | — Pending |
| Demand via viral influencers; cities switch on instantly (data/admin) | Virality spikes demand fast; must open a city without a code release | — Pending |
| Supply via existing gig drivers (Uber Eats/Postmates/couriers) | Pre-positioned, idle, gig-comfortable fleet = the answer to cold-start | — Pending |
| Charge the Seeker on **delivery** (hold at request, capture on delivery) | No clip = no charge automatically; fewest refunds; Seeker-friendly | — Pending |
| Scouts can film **anywhere in an active city**, with hard no-film-zone guardrails | Roaming drivers give city-wide coverage → deliver the "anywhere" promise safely | — Pending |
| Scout keeps pay when a passing clip is refunded (LMC funds it) | Driver trust = supply; don't burn honest Scouts | — Pending |
| **No background checks**; identity = only tax + Stripe payout KYC | Scouts never meet customers → no in-person risk → no friction beyond legal minimum | — Pending |
| Clips are video-only, audio stripped by default | All-party-consent states make audio recording a felony | — Pending |
| Beta-grade verification first incl. fresh-capture enforcement; AI signage deferred | Ship sooner; fresh-capture + GPS + manual review cover integrity | — Pending |
| Stay on React Native + Expo | Prototype complete and shipping to TestFlight | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-19 after initialization (strategy: national build, city-by-city, gig-driver supply)*
