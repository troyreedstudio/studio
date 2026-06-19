# Feature Research

**Domain:** On-demand two-sided gig marketplace + real-time visual verification (Seeker pays, Scout films a 15-sec clip of a real place)
**Researched:** 2026-06-19
**Confidence:** MEDIUM-HIGH

Grounded in: the existing LMC prototype (`.planning/PROJECT.md`, `docs/BUSINESS-PLAN.md`), the locked stack (`docs/STACK.md`), and current (2025-2026) gig-marketplace trust/safety/fraud/cold-start practice (Uber, DoorDash, Incognia, Checkr, Stripe). Marketplace-mechanics findings are HIGH confidence (well-documented industry patterns); LMC-specific verification calls are MEDIUM (novel category, fewer direct precedents).

---

## How LMC differs from a normal gig marketplace (frames everything below)

Three properties change which features are table stakes:

1. **The deliverable is the trust.** Unlike Uber (you can see the car arrive) or DoorDash (you got food or you didn't), a Seeker cannot independently tell whether a clip is genuine, recent, and of the *right place*. Verification is not a "safety nice-to-have" — it IS the product. A faked or wrong-place clip is a silent product failure.
2. **It's a perishable, pay-first micro-transaction.** $15-20, delivered in 7-15 min, with money taken up front. There is no ongoing relationship to recover a bad experience. The refund/dispute loop must be fast and generous or the marketplace dies on first-bad-experience.
3. **Brutal real-time supply matching.** A request only succeeds if a verified Scout is *already standing inside a 30-50m geofence* and free to film. This is a harder density problem than Uber (Uber drivers move toward demand; a Scout either is at Nobu right now or isn't). Cold-start is the existential risk.

Everything below is categorized for a **Miami nightlife beta** (50 Scouts, 20 venues, 500 paid checks / 90 days), not the global vision.

---

## Feature Landscape

### Table Stakes (Users / Scouts leave without these)

Non-negotiable for a trustworthy beta. Users give no credit for these but abandon (and tell others) when they're missing.

#### Seeker side

| Feature | Why Expected | Complexity | Notes / Dependencies |
|---------|--------------|------------|----------------------|
| Real auth + persistent session (Apple, Google, phone OTP) | Can't take money or tie reputation to anonymous users | MEDIUM | UI exists. Needs Supabase Auth. Foundation for everything. |
| Request a check at a real place (pin/venue + tier) | The core action | MEDIUM | UI exists; needs to write a real job to the backend. Depends on geo + venue data. |
| Honest "Finding a Scout" state + **no-Scout-available outcome** | The #1 silent failure: no Scout in the geofence. Seeker must be told clearly and **not charged** | MEDIUM | Auth-hold model (charge only on Scout acceptance) makes this clean. UI prototyped. Depends on dispatch + payments. |
| Live order tracking (accepted → filming → uploading → delivered) | Pay-first + minutes-long wait = anxiety; users need a live progress signal or they assume it failed | MEDIUM | Realtime status (Supabase Realtime) + push. Mirrors Uber's ETA obsession. |
| Pay securely, charged only when fulfilled | Table stakes for any paid marketplace; refund-aversion | MEDIUM-HIGH | Stripe authorize-on-confirm, capture-on-acceptance, release if no Scout. Depends on auth. |
| Receive + play the clip reliably (with timestamp + place label) | The whole point. Must play first time, every time | MEDIUM | Mux playback + CDN. The clip must carry "filmed at X, at HH:MM" or trust evaporates. |
| Rate the check + Scout (post-delivery) | Two-sided reputation is the quality flywheel; how bad Scouts get filtered | LOW | UI exists. Needs to persist + feed Scout score. |
| **Refund / "this isn't right" flow** | Wrong place, too dark, expired relevance, obvious fake. Without an easy refund, one bad clip = churned user + chargeback | MEDIUM | See dedicated section. This is table stakes, NOT a differentiator. |
| Order history / receipts | Expected of any payment app; also Apple/Stripe expectation | LOW | UI exists; persist. |
| Clear "what you'll get / what you won't" expectation-setting | 15 sec, exterior only (beta), no audio promise, legal no-go zones | LOW | Copy + consent gate. Prevents most disputes at the source. |

#### Scout side

| Feature | Why Expected | Complexity | Notes / Dependencies |
|---------|--------------|------------|----------------------|
| Identity verification (KYC) before earning | Real money out + real people sent to real places. Legal/Stripe requirement, and trust foundation | HIGH | Stripe Identity (in stack). Document + selfie. Gates payouts. |
| Go online/offline + location sharing while online | Dispatch can't work otherwise | MEDIUM | Background geolocation (battery-sensitive). Prototype has the toggle. |
| Receive only *relevant, in-geofence* job pings | Spammy/irrelevant pings = Scouts disable notifications = supply dies | MEDIUM-HIGH | PostGIS + H3 geoquery + Expo Push. Core dispatch. |
| Accept/decline a job; clear payout shown up front | Gig workers need to see "$8 for this, ~5 min" before committing | LOW | UI exists. |
| Reference-photo confirm ("are you at the right entrance?") | Stops honest mistakes (wrong door, wrong branch) before filming | LOW-MEDIUM | Layer 3 of the moat. Cheap, high-value. |
| Reliable in-app camera capture (15/30 sec) + retry on failed upload | A dropped upload after filming = unpaid Scout = lost Scout | HIGH | vision-camera + Mux upload. Must handle bad nightlife connectivity gracefully. |
| Get paid fast + reliably, with a visible earnings ledger | Late/opaque pay is the #1 reason gig workers churn | HIGH | Stripe Connect Express + 1099/tax. Weekly payout min. UI exists. |
| Scout rating / standing + clear deactivation rules | Scouts need to know how they're judged and that bad actors are removed | MEDIUM | Feeds dispatch priority. Fairness matters or good Scouts leave. |
| Basic safety kit: emergency button, share-trip-with-contact, no-film guidance | Scouts go to nightlife venues at night, alone. Industry standard (Uber/DoorDash) | MEDIUM | See Trust & Safety section. Beta can start light but cannot be zero. |

#### Both / platform

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Server-side verification gate (GPS-stamped clip checked against geofence before payout) | The integrity core. Auto-reject off-fence clips | MEDIUM | Layers 1-4 of the moat. Manual review backstops AI (deferred). |
| Manual review queue / admin ops console | Beta WILL have edge cases; founders must see/refund/ban manually | MEDIUM | Cheapest insurance in the build. Replaces AI signage detection for beta. |
| Push notifications both directions | Job alerts to Scouts; delivery alerts to Seekers | MEDIUM | Expo Push. Without it, dispatch and delivery feel broken. |
| Content moderation / report-a-clip | Scout could film something illegal/abusive; Seeker could request something creepy | MEDIUM | Report button + takedown + ban path. Legal exposure if absent. |
| Age gate (18+) + consent/acceptable-use gates | Legal; nightlife + filming people in public | LOW | UI prototyped. Must be enforced server-side. |

---

### Differentiators (Competitive advantage — where LMC actually competes)

The category doesn't exist yet, so the differentiator is **trustworthy real-time visual truth, delivered fast.** Don't differentiate on everything — concentrate on integrity + speed + supply liquidity.

| Feature | Value Proposition | Complexity | Notes / Dependencies |
|---------|-------------------|------------|----------------------|
| **The verification moat as a visible promise** (geofence ping → reference-photo confirm → GPS-stamped clip → cooldown → manual review) | This IS the product. "Genuine, recent, right-place — or your money back" is the entire reason to pay vs. checking Google | MEDIUM-HIGH | Beta-grade: layers 1-4 + 6 + manual review. AI signage (layer 5) deferred per Troy. Confidence MEDIUM — novel; tune thresholds with real data. |
| **Speed SLA / live countdown ("7-15 min or refund")** | Turns a fuzzy promise into a guarantee; Uber proved ETA reliability drives conversion | MEDIUM | Depends on supply density. Priority tier ($20/7min) monetizes urgency. |
| **Priority tier** (faster + higher Scout pay) | Monetizes urgency; gives Scouts a reason to drop everything | LOW | UI + pricing exist. Pure config once payments land. |
| **Single dual-role account (Seeker ↔ Scout switch)** | Uber-style. Lowers Scout acquisition cost (every user is a latent Scout) and deepens engagement | MEDIUM | UI exists. Powerful cold-start lever — a Seeker who's at a venue can become a Scout. |
| **Recurring / scheduled checks** | "Check this gym every morning at 8" — turns one-off into habit + predictable demand | MEDIUM | UI prototyped. Defer wiring until core loop proven, but it's a real moat for retention. |
| **Scout Elite tier** (priority pings, premium earnings, badge) | Retains best Scouts; supply-side loyalty; future subscription revenue | MEDIUM | Post-beta. Don't build the program yet — but design ratings so Elite is derivable later. |
| **Clip authenticity metadata surfaced to Seeker** (verified time, verified location, "passed checks" badge) | Makes the invisible trust *visible* — the difference between "a video" and "verified intelligence" | LOW-MEDIUM | Cheap UX win once GPS-stamp + geofence pass exist. High trust ROI. |

---

### Anti-Features (Seem good, deliberately do NOT build for beta)

Documenting these prevents scope creep and protects the timeline + legal posture.

| Feature | Why Requested | Why Problematic (for beta) | Alternative |
|---------|---------------|----------------------------|-------------|
| **AI signage / object detection auto-reject** | Sounds like the killer moat; in the business plan as "Layer 5" | ML pipeline = months; false-rejects punish honest Scouts; tuning needs real clip volume you don't have yet | **Manual review queue** + GPS/geofence/photo/cooldown. Add AI post-beta once you have labeled clips. (Already Troy's call in PROJECT.md.) |
| **Live-streaming instead of recorded clips** | "Real-time" sounds like live | Massive infra (latency, bandwidth, abuse moderation in real time), drains Scout battery/data, harder to verify after the fact, privacy nightmare | 15-sec recorded clip, GPS-stamped, delivered fast. Asynchronous is verifiable and cheap. |
| **In-app audio / two-way comms on the clip** | "I want to hear the music" | Wiretap/consent law varies by state; recording audio of bystanders is a legal minefield; moderation burden | Video only, no committed audio, in beta. Revisit with legal review later. |
| **Open free-text "film anything anywhere" at launch** | The universal vision (DMV, airports, real estate...) | No-go zones (private property, secure areas, filming individuals), thin supply outside the wedge, unbounded T&S surface | **Curated Miami nightlife venue list (20 venues)** for beta. Universal is the destination, not the launch. Matches PROJECT.md. |
| **In-app Seeker↔Scout chat** | "Let me tell the Scout exactly what to film" | Opens harassment, off-platform payment leakage, PII exchange, moderation load | Structured request (place + tier + optional preset note). No free chat in beta. |
| **Tipping** | Standard in gig apps | Adds payment complexity + tax handling; muddies the clean $8/$12 Scout economics during validation | Flat transparent payout in beta. Add later if Scouts ask. |
| **Multi-city / waitlist-driven expansion at launch** | "We have demand in NYC too" | Splits scarce supply; kills the density you need in Miami; the cold-start killer | One city, dominate density (DoorDash/Airbnb playbook). Out-of-coverage = honest waitlist banner (already in the location-flow memory). |
| **Public social feed of clips** ("TikTok of places") | In the vision ("Library mode", live feed) | Privacy/consent of filmed bystanders, content moderation at scale, dilutes the paid on-demand loop | Private delivery to the requesting Seeker only, in beta. |
| **Crypto / wallet / points economy** | "Web3 Scout rewards" | Regulatory + UX overhead, distracts from proving the core loop | Plain fiat via Stripe. |

---

## Trust & Safety, Fraud, and Dispute Handling (the category-defining detail)

### Verification / fraud prevention

The known attack: a Scout fakes location (GPS spoofing is "low tech," per Incognia 2026) or films the wrong place / an old clip / a different venue to collect $8 without doing the work. Defenses, in beta-buildable order:

| Defense | What it stops | Complexity | Status |
|---------|---------------|------------|--------|
| Geofence dispatch (only in-fence Scouts pinged) | Out-of-area Scouts can't even accept | MEDIUM | Active build |
| Reference-photo confirm before filming | Honest wrong-place mistakes | LOW | Active build |
| GPS-stamp at moment of capture, server-checked vs. fence | Filming from the wrong spot | MEDIUM | Active build |
| Fresh-capture enforcement (clip recorded in-session, not uploaded from gallery) | Old/reused/downloaded clips | MEDIUM | **Add explicitly** — vision-camera must capture live, block library import |
| Scout cooldown (20 min/venue) | Spamming one venue for repeat pay | LOW | Active build |
| KYC + one account per identity + device fingerprint | Multi-accounting, account renting/sharing (the persistent gig-fraud problem per Trulioo/Incognia) | MEDIUM-HIGH | Stripe Identity covers KYC; device-binding is a fast-follow |
| **GPS-spoofing detection** (mock-location flag) | The cheapest, most common attack | MEDIUM | **Flag as research item** — RN can read Android `isMockLocation`; iOS harder. Incognia-style is post-beta. |
| Periodic re-verification / selfie at random | Account handoff after onboarding | MEDIUM | Post-beta; note for design |
| Manual review queue | Everything the automated layers miss | MEDIUM | Active build — beta backstop |

> **Dependency flag:** fresh-capture enforcement + GPS-spoof detection are *not yet explicit* in PROJECT.md's verification list but are core to the moat actually holding. Recommend surfacing them in requirements.

### Dispute / refund handling (table stakes, not optional)

A pay-first micro-transaction with a subjective deliverable needs a refund loop that is **fast and biased toward the Seeker** in beta — the cost of a $15 refund is tiny vs. a churned user + a Stripe chargeback (which carries fees and dispute risk).

| Capability | Why | Complexity |
|------------|-----|------------|
| One-tap "this isn't right" on delivery (reason picker: wrong place / too dark / not what I asked / looks fake / never arrived) | Captures the dispute in-app *before* it becomes a chargeback | LOW |
| Auto / near-auto refund within policy (e.g. wrong-place auto-refunds since geofence data exists) | Speed = retained user; Stripe makes refunds easy | MEDIUM |
| **Scout-protection logic**: if the clip *passed* verification (in-fence, fresh, right reference) the Scout still gets paid even on a Seeker refund, funded by platform | Or Scouts learn that any complaint costs them $8 and they quit. This is the hard, important policy call | MEDIUM |
| Chargeback handling / evidence packet (GPS stamp + timestamp + verification trail auto-attached) | The verification trail is your chargeback defense — a real asset | MEDIUM |
| Admin override (refund, ban Scout, ban Seeker, replay a check) | Founders must resolve edge cases by hand in beta | LOW-MEDIUM |

### Scout safety (real people, at night, alone)

Industry standard now (Uber Safety Toolkit, DoorDash trusted-contacts + SafeDash). Beta minimum:

| Feature | Complexity | Notes |
|---------|------------|-------|
| In-app emergency button (call 911 / local) while on a job | LOW-MEDIUM | Even a basic version signals seriousness |
| Share live location with a trusted contact while online | MEDIUM | DoorDash shares with up to 5 contacts |
| No-go / no-film guidance + "decline if unsafe, no penalty" | LOW | Protects Scouts and platform legally |
| Report-a-Seeker / report-a-venue | LOW | Two-way T&S |

### Seeker safety / privacy

| Feature | Complexity | Notes |
|---------|------------|-------|
| No exposure of Seeker identity to Scout (and vice-versa beyond first name/rating) | LOW | Privacy by default |
| Filming-of-bystanders policy + visible "public spaces only" rule | LOW | Reduces legal + creepiness risk |
| Block requests targeting private individuals / residences (beta = curated venues only sidesteps most of this) | LOW (via curation) | Curation is the cheap mitigation |

---

## The Cold-Start Problem (the existential beta risk — read this twice)

LMC's matching is *harder than Uber's*: a check only succeeds if a verified Scout is **already inside the exact venue right now**. You can't subsidize a Scout to "drive toward" a nightclub interior. This is why the beta is scoped to **20 venues, not a whole city** — concentrate density where you can guarantee it.

Findings from Uber / DoorDash / Airbnb cold-start playbooks, mapped to LMC:

| Tactic | LMC application | Feature/ops implication |
|--------|-----------------|-------------------------|
| **Geographic concentration over volume** (DoorDash suburbs, Uber "100 drivers in a few sq mi") | 20 hand-picked venues in a tight Miami nightlife corridor, not "all of Miami" | Venue curation tool; Scout recruiting targeted to those venues' regulars |
| **Subsidize supply to guarantee reliability** (Uber paid drivers to be online) | Guaranteed minimums / bonuses for Scouts who go online at target venues on peak nights | Scout bonus/incentive ledger; "hot venue" surge pings |
| **Seed the supply manually, unscalably** (Airbnb door-to-door) | Founders recruit + onboard the first 50 Scouts in person at venues; warm relationships | White-glove Scout onboarding; referral codes |
| **Dual-role flywheel** | Every Seeker at a venue is a potential Scout — prompt "you're here, earn $8 answering nearby checks" | In-app role-switch nudge when a user is inside a covered geofence |
| **Demand follows reliability (ETA obsession)** | If the first checks fail to fill, demand never returns. Better to *guarantee* fill on a few venues than offer many that often return "no Scout" | Supply-aware availability: only show a venue as "checkable now" if a Scout is actually in-fence |
| **Pre-commit demand to scheduled supply** | Recurring/scheduled checks let you line up a Scout in advance | Recurring-check wiring (defer, but high cold-start value) |

> **The single most important product decision for cold-start:** show venues as **"available now"** only when a verified Scout is actually in-fence and free. A "no Scout available" after payment intent is a churn event; a venue that simply isn't lit up yet is fine. Supply-aware availability turns the cold-start weakness into an honest UX.

---

## Feature Dependencies

```
Real Auth + Persistent Session (Supabase Auth)
    └──requires──> nothing (foundation)
        ├──enables──> Payments (Stripe — identity to charge)
        ├──enables──> Scout KYC (Stripe Identity)
        └──enables──> Reputation / ratings (tied to real accounts)

Backend + DB (Supabase)
    └──requires──> Auth
        └──enables──> everything persistent (jobs, history, ratings, ledger)

Geolocation Core (PostGIS + H3 + Mapbox)
    └──requires──> Backend
        └──enables──> Geofence Dispatch
                          ├──requires──> Push Notifications (to ping in-fence Scouts)
                          ├──enables──> Reference-Photo Confirm
                          ├──enables──> GPS-Stamped Clip verification
                          └──enables──> Supply-Aware "available now" (cold-start UX)

Camera + Video Pipeline (vision-camera + Mux)
    └──requires──> Backend + Auth
        ├──requires──> Fresh-Capture Enforcement (live capture, block gallery import)
        └──enables──> Clip Delivery + Playback + authenticity metadata

Payments (Stripe authorize/capture/release)
    └──requires──> Auth
        ├──pairs-with──> Dispatch (capture ON Scout acceptance — the auth-hold model)
        ├──enables──> Refund / Dispute loop
        └──requires──> Scout Payouts (Stripe Connect Express) + KYC

Verification Moat (the differentiator)
    └──requires──> Geofence Dispatch + GPS-Stamp + Fresh-Capture + Cooldown + Reference-Photo
        └──backstopped-by──> Manual Review Queue (replaces AI signage for beta)
            └──feeds──> Dispute/Refund evidence + Chargeback defense

Cold-Start (ops + product)
    └──requires──> Dispatch + Supply-Aware Availability + Dual-Role switch + Scout incentives
```

### Dependency notes

- **Dispatch requires Push:** an in-fence Scout who isn't notified is invisible supply. Push is on the critical path, not a polish item.
- **Refund loop requires the verification trail:** auto-refunds and chargeback defense both read geofence + GPS-stamp data. Build verification before promising "money back."
- **Scout-protection refund policy depends on the verification verdict existing server-side:** you can only pay a Scout on a refunded check if the system knows the clip passed. Sequence verification before finalizing refund policy.
- **Fresh-capture enforcement conflicts with "upload from library" convenience** — and that conflict is the point. Live-capture-only is a feature, not a limitation.
- **Cold-start "available now" depends on real-time Scout presence** — it's a thin layer on top of dispatch but the highest-leverage UX in the whole beta.

---

## MVP Definition

### Launch With (beta v1 — the trustworthy core loop)

- [ ] Real auth + persistent sessions — foundation for money + reputation
- [ ] Supabase backend/DB — real persistence replacing in-memory stores
- [ ] Request → geofence dispatch → in-fence Scout pinged → accept — the matching core
- [ ] Reference-photo confirm + live (fresh) camera capture + Mux upload/playback — the deliverable, made un-fakeable at capture
- [ ] GPS-stamped clip checked vs. geofence server-side + 20-min cooldown — the verification verdict
- [ ] Stripe auth-hold payments (capture on acceptance, release if no Scout) + Stripe Connect Express payouts + KYC — the money loop
- [ ] Push notifications both directions — dispatch + delivery
- [ ] Rate the check/Scout — quality flywheel
- [ ] Refund / "this isn't right" flow + admin/manual-review console — the trust backstop
- [ ] Scout safety minimum (emergency button + share-location + decline-if-unsafe) — duty of care
- [ ] Supply-aware "available now" venue list (curated 20 Miami venues) — cold-start honesty
- [ ] Age + consent + acceptable-use gates, enforced server-side — legal floor

### Add After Validation (v1.x — once 500 checks prove the loop)

- [ ] Recurring / scheduled checks wired — retention + pre-committed demand
- [ ] GPS-spoof / mock-location detection — once you see real fraud attempts
- [ ] Device fingerprint / one-account-per-device — anti multi-accounting
- [ ] Clip authenticity metadata surfaced ("verified time + place" badge) — make trust visible
- [ ] Scout incentive/bonus ledger ("hot venue" surge) — tune supply with real data
- [ ] Richer dispute automation (auto-refund on geofence-fail) — once policy edges are known

### Future Consideration (v2+ — after Miami product-market fit)

- [ ] AI signage / object-detection auto-reject — needs labeled clip corpus from beta
- [ ] Scout Elite program + subscriptions
- [ ] Second city (NYC) — only after density model is proven
- [ ] Partner/B2B interior checks (+$5), enterprise API, live feed, Library mode
- [ ] Universal free-place requests beyond curated venues (with no-go-zone policy + legal review)

---

## Feature Prioritization Matrix (beta)

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Auth + backend foundation | HIGH | MEDIUM | P1 |
| Geofence dispatch + push | HIGH | HIGH | P1 |
| Live camera capture + Mux delivery | HIGH | HIGH | P1 |
| Stripe auth-hold pay + Connect payouts + KYC | HIGH | HIGH | P1 |
| GPS-stamp verification + cooldown + reference photo | HIGH | MEDIUM | P1 |
| Refund/dispute loop + manual-review console | HIGH | MEDIUM | P1 |
| Supply-aware "available now" (cold-start) | HIGH | MEDIUM | P1 |
| Scout safety minimum | HIGH | MEDIUM | P1 |
| Ratings | MEDIUM | LOW | P1 |
| Fresh-capture enforcement | HIGH | MEDIUM | P1 (often forgotten — flag) |
| Recurring checks (wired) | MEDIUM | MEDIUM | P2 |
| Clip authenticity badge | MEDIUM | LOW | P2 |
| GPS-spoof detection | MEDIUM | MEDIUM | P2 |
| Scout incentive ledger | MEDIUM | MEDIUM | P2 |
| AI signage detection | MEDIUM | HIGH | P3 |
| Scout Elite / subscriptions | LOW (beta) | MEDIUM | P3 |
| Second city / B2B / live feed | LOW (beta) | HIGH | P3 |

---

## Competitor / Analogue Feature Analysis

LMC's category doesn't exist; the right comparison is to the mechanics of adjacent on-demand marketplaces.

| Feature | Uber / DoorDash (gig logistics) | TaskRabbit / Field-task apps | LMC's approach |
|---------|-------------------------------|------------------------------|----------------|
| Identity / KYC | Background check + ID verification before activation | ID + sometimes background check | Stripe Identity KYC pre-payout; background check post-beta |
| Worker dispatch | Proximity + ETA optimization | Browse/bid or auto-assign | Hard geofence (must be *inside* venue) — stricter than proximity |
| Proof of completion | Delivery photo / GPS drop-off | Photo / client sign-off | GPS-stamped fresh clip checked vs. fence + reference photo — proof IS the product |
| Trust verification | Driver selfie, mock-location detection (Incognia) | Reviews + insurance | Multi-layer moat + manual review; spoof detection as fast-follow |
| Dispute / refund | In-app report → fast refund; chargeback defense via trip data | Mediation / guarantee | Fast Seeker-biased refund + Scout-protection on verified clips; verification trail = chargeback defense |
| Worker safety | Emergency button, trusted contacts, trip-share | Limited | Emergency button + location-share minimum from day one |
| Cold-start | Geo concentration + supply subsidy + ETA reliability | Category-by-category seeding | 20-venue density + Scout bonuses + dual-role flywheel + supply-aware availability |
| Reputation | Two-sided ratings, deactivation thresholds | Two-sided reviews | Two-sided ratings feeding dispatch priority + Elite (later) |

---

## Open Questions / Flags for Requirements

1. **Fresh-capture enforcement and GPS-spoof detection are not explicit in PROJECT.md's verification list** but are load-bearing for the moat. Recommend adding both to requirements (fresh-capture as P1, spoof-detection as P2).
2. **Scout-protection refund policy is an unresolved business decision:** does the Scout keep $8 when a verified-passing clip is refunded? (Recommend yes, platform-funded.) This shapes the payment + dispute build and should be decided before payouts ship.
3. **Supply-aware "available now"** is the highest-leverage cold-start feature and is implied but not named in PROJECT.md — recommend elevating it to an explicit requirement.
4. **Audio policy** needs a one-line legal decision (recommend: no committed audio in beta) before camera capture is built.
5. **Background-check depth** beyond Stripe Identity KYC (criminal background?) is a duty-of-care + cost question for sending Scouts to venues — flag for legal/ops, likely post-beta but decide intentionally.

---

## Sources

Marketplace mechanics, cold-start, trust/safety, and fraud patterns (2025-2026):
- [How Uber Solved the Cold Start Problem (network effects, ETA, supply subsidy)](https://medium.com/@cagdasbalci0/how-uber-solved-the-cold-start-problem-a-masterclass-in-network-effects-5315d2292166)
- [How DoorDash Built Its Go-to-Market Playbook (geographic concentration)](https://larskamp.medium.com/how-doordash-built-the-most-incredible-go-to-market-playbook-ever-5e8f1d58f6cd)
- [Andrew Chen — Uber's virtuous cycle / geographic density](https://andrewchen.com/ubers-virtuous-cycle-5-important-reads-about-uber/)
- [Reforge — Beat the cold-start problem in a marketplace](https://www.reforge.com/guides/beat-the-cold-start-problem-in-a-marketplace)
- [NFX — Marketplace expansion framework](https://www.nfx.com/post/marketplace-expansion-framework)
- [Trulioo — Trust & Safety: Onboarding, KYC (account renting problem)](https://www.trulioo.com/identity-verification-use-cases/trust-safety)
- [iDenfy — KYC for the Gig Economy and Online Marketplaces](https://idenfy.com/blog/kyc-for-gig-and-online-marketplaces/)
- [Didit — Gig Economy IDV & KYC guide](https://didit.me/blog/mastering-gig-economy-identity-verification-on-demand-workforce-kyc/)
- [Incognia — Gig Economy Fraud Trends 2026 (GPS spoofing, multi-accounting, collusion)](https://www.incognia.com/blog/gig-economy-fraud-trends-2026)
- [Incognia — 5 Ways Gig Platforms Can Strengthen Fraud Prevention in 2026](https://www.incognia.com/blog/ways-gig-economy-platforms-can-strengthen-fraud-prevention-in-2026)
- [Incognia — Detecting location spoofing](https://www.incognia.com/solutions/detecting-location-spoofing)
- [Uber — Emergency Button & safety technologies](https://www.uber.com/us/en/blog/ubers-emergency-button-and-the-technologies-behind-it/)
- [DoorDash — Dasher safety (trusted contacts, location share)](https://dasher.doordash.com/en-us/safety)
- [ADT × Uber — in-app safety features](https://newsroom.adt.com/corporate-news/adt-partners-with-uber-to-provide-in-app-safety-features-for-riders-and-drivers-nationwide)

Project context:
- `.planning/PROJECT.md` (validated prototype + active build goals + out-of-scope)
- `docs/BUSINESS-PLAN.md` (pricing, 6-layer verification moat, Miami launch sequence)

---
*Feature research for: on-demand visual-verification gig marketplace (LMC)*
*Researched: 2026-06-19*
