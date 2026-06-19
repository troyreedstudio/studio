# Let Me Check (LMC)

## What This Is

On-demand visual verification. A **Seeker** pays to have a **Scout** (a real person on the ground) film a 15-second clip of any location — a nightclub line, an airport queue, a restaurant, a gym, real estate, anywhere — delivered in 7–10 minutes. One account holds both roles (Uber-style switch). Tagline: *"Know Before You Go."* Phase-1 launch wedge: Miami nightlife.

Today it is a **fully-built React Native + Expo UI prototype running entirely on mock data** — every screen and flow works, but there is no real backend, payments, camera, real-time dispatch, or verification yet. This project plans and executes the path from that prototype to a launched product.

## Core Value

**A Seeker can pay for, and reliably receive, a genuine, recent, location-true 15-second clip of a real place — fast.** If that single loop (request → real Scout films the right place → clip delivered, trustworthy) does not work, nothing else matters.

## Requirements

### Validated

<!-- UI/flow proven in the working prototype (look + interaction). NOT backend-validated. -->

- ✓ Full Seeker flow UI: browse/search → venue → pay → wait → watch + rate — prototype
- ✓ Full Scout flow UI: go online → accept → film → submit → earnings — prototype
- ✓ Single dual-role account with Seeker↔Scout switching — prototype
- ✓ Onboarding + auth UI: Apple/Google/phone+OTP, role picker, quick-finish, consent gates — prototype
- ✓ Real device geolocation (GPS + IP fallback, real city, no hard-coded Miami) — wired in prototype
- ✓ Live Mapbox maps on device — wired in prototype
- ✓ "Finding a Scout" dispatch UX + auth-hold payment messaging — prototype
- ✓ Recurring checks (schedule + manage) UI — prototype

### Active

<!-- The real build. Destination = the full product; sequenced core-loop-first. Hypotheses until shipped. -->

**Core loop made real (first)**
- [ ] Real authentication (Apple, Google, phone OTP) with persistent sessions
- [ ] Backend + database (Supabase) replacing in-memory stores; real persistence
- [ ] One real check end-to-end: request → dispatch → Scout films a real clip → upload/transcode → delivered to Seeker
- [ ] Real camera capture + video pipeline (vision-camera + Mux): record, upload, transcode, CDN playback

**Money**
- [ ] Seeker payment via Stripe (authorize on confirm, capture on Scout acceptance, release if no Scout)
- [ ] Scout payouts via Stripe Connect Express + identity (Stripe Identity) + tax/1099

**Dispatch + trust (beta-grade verification)**
- [ ] Real-time dispatch: only Scouts inside the venue geofence are pinged; accept/assign; live status
- [ ] GPS geofence (30–50m) + reference-photo confirm + GPS-stamped clip + Scout cooldown + manual review + rating
- [ ] Push notifications (Expo Push): job alerts to Scouts, delivery alerts to Seekers

**Launch**
- [ ] Miami nightlife beta: 50 Scouts, 20 venues, 500 paid checks in 90 days (success metric)

**Full-vision phases (later)**
- [ ] Full 6-layer moat incl. AI signage detection + auto-reject of off-target/faked clips
- [ ] Partner/B2B venues (30-sec interior checks, +$5), live feed, AI Scout coach, Library mode, second city

### Out of Scope (for the build toward beta)

- **AI signage detection / auto-reject** — deferred to post-beta; manual review covers integrity meanwhile (Troy's call)
- **Second city / multi-market** — only after the Miami beta validates the model
- **B2B API, partner-interior premium, live feed, AI coach, Library mode** — post-beta vision, not in the initial build
- **Native rewrite** — N/A; staying on React Native + Expo

## Context

- **Brownfield:** a complete UI prototype (`lmc-app/`) on mock data + in-memory module stores (`lmc-app/app/state/*.ts`) that reset on reload. See `.planning/codebase/` for the full map.
- **Locked target stack** in `docs/STACK.md`: Supabase (DB/auth/realtime/storage), Stripe Connect Express (payments/payouts), Mux + react-native-vision-camera (video), PostGIS + H3 + Mapbox (geo), Expo Push (notifications), Stripe Identity (KYC).
- **Business plan** in `docs/BUSINESS-PLAN.md`: pricing ($15 Standard → $8 Scout / $7 platform; $20 Priority → $12 / $8), the 6-layer verification "moat", Miami launch sequence.
- **Already shipping to TestFlight** via EAS (Build 9 live, maps working). iOS-first for the beta.
- **Known cleanups from the map:** RN version mismatch (docs 0.83.2 vs package.json 0.81.5), unused `react-native-maps`, repo cruft to gitignore (`.claude-flow/`, `.swarm/`, `SECURITY_*.json`, `ruvector.db`).

## Constraints

- **Tech stack**: Locked per `docs/STACK.md` — favor managed services over custom infra.
- **Platform**: React Native + Expo, iOS-first for beta (TestFlight). No rewrite.
- **Team**: Small — two founders + AI agents; product lead (Troy) is non-technical → reliability and managed services matter more than bespoke cleverness.
- **Real money + real people on the ground**: trust/verification, safety, and legal (18+, consent, acceptable-use, no-film zones) are first-class, not afterthoughts.
- **Monorepo**: lives inside the `studio` git repo; `.planning/` is committed scoped to `projects/let-me-check`.
- **Beta goal**: Miami nightlife — 50 Scouts, 20 venues, 500 paid checks in 90 days.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Roadmap destination = full product, sequenced core-loop-first | De-risk the core loop and validate early, then layer payments → moat → scale → full vision | — Pending |
| Beta-grade verification first; AI signage detection deferred | Ship the beta sooner; manual review + GPS/photo/cooldown cover integrity in the interim | — Pending |
| Auth-hold payment model (charge only when a Scout accepts) | Avoid charge-then-refund; no Scout = no charge = nothing to refund | — Pending (UI prototyped) |
| Managed services (Supabase / Stripe / Mux / Mapbox) over custom infra | Small non-technical team; speed, reliability, less to operate | — Pending |
| Stay on React Native + Expo | Prototype already complete and shipping to TestFlight | ✓ Good |

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
*Last updated: 2026-06-19 after initialization*
