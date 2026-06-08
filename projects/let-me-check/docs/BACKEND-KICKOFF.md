# LMC Backend Kickoff Brief

**Status**: Frozen pre-build plan. Read this end-to-end on backend day 1 before any schema is drawn or any service is provisioned.

**Date locked**: 2026-06-09

This is the one-page operating manual for moving LMC from a working iOS prototype to a live marketplace. Everything in this doc is already decided. If something here is unclear, re-read it. Do not relitigate.

---

## 1. What we are building

A two-sided on-demand visual verification marketplace. Seekers pay $15 (Standard) or $20 (Priority) for a 15-second GPS-verified video clip of any location, filmed by a Scout who happens to be nearby. Pure marketplace — no hired team, no human dispatch, no manual ops. Phase 1 launch wedge: Miami nightlife (50 Scouts, 20 venues, 500 paid requests in 90 days). Product is universal long-term.

The app is built. The backend is what makes the marketplace real.

---

## 2. Tech stack (locked — STACK.md, 2026-04-25)

| Layer | Choice | Why |
|---|---|---|
| Backend platform | **Supabase** | Postgres + auth + realtime + storage in one |
| Geo | **PostGIS + H3 + Mapbox** | Spatial queries + hex indexing for dispatch |
| Camera | **react-native-vision-camera** | Best quality + GPS metadata |
| Video pipeline | **Mux** | Upload, transcode, CDN, AI-ready ingest |
| Payments | **Stripe Connect Express** | Marketplace payouts (Uber/Lyft pattern) |
| Identity | **Stripe Identity** | KYC for Scouts (Uber/Airbnb pattern) |
| Auth | **Apple + Google + Twilio (SMS OTP)** | All three login methods covered |
| Jobs/queue | **Inngest** | Background tasks, webhooks |
| Infra/CDN | **Cloudflare** | DNS + edge + image proxy |
| Email | **Resend** | Transactional |
| Analytics | **PostHog** | Event tracking + funnels |
| Errors | **Sentry** | Crash + error monitoring |

Each line is either free-tier or pay-as-you-go at pilot scale. Total infra at Miami launch: ~$120-170/month.

---

## 3. Wave 1 build sequence (5 phases)

Build these in order. Do not parallelise.

1. **Backend + auth shell** — Supabase project, Apple/Google sign-in, Twilio SMS OTP fallback
2. **Dispatch + geolocation core** — PostGIS schemas, H3 cell indexing, Mapbox wired into Home + Venue + Scout dashboard
3. **Video + payments** — vision-camera capture, Mux upload pipeline, Stripe Connect Express payouts
4. **Verification stack (the moat)** — the 6 layers in §4 below
5. **Miami beta** — 50 Scouts, 20 venues, 500 paid requests in 90 days

---

## 4. The moat — Tier A verification stack (NON-NEGOTIABLE for v1)

Without these, a Scout can fake a clip from their couch and the marketplace dies in week 1. Ship all 6 layers with Phase 1.

1. **30-50m GPS geofence around each venue** — server-side polygon in PostGIS. No AI, pure maths.
2. **Geofenced Scout dispatch** — only Scouts physically inside the fence get pinged. Logged + time-stamped.
3. **Reference photo confirmation** — Scout sees a recent reference photo of the venue exterior/sign and taps "Confirm I see this" before filming. Catches "wrong place" pre-capture.
4. **GPS-stamped clip on submission** — capture coordinates baked into clip metadata. Server auto-rejects any clip whose GPS falls outside the fence at submission time.
5. **AI signage detection on the clip** — Google Vision API call per clip (~$1/month at pilot scale). Logo/sign detection + GPS cross-check. Last line of defence.
6. **20-minute Scout cooldown per venue** — Redis TTL gate. Same Scout can't film the same venue twice in 20 min. Prevents farming.

---

## 5. Tier B — cheap polish AI (ship with v1, alongside Tier A)

Each is under $10/month at pilot scale; together they're ~8-10 days of build time. They make the product feel premium from day 1. **Run cost is rounding error. Build time is the real constraint.**

| Feature | Service | Run cost/mo | Build |
|---|---|---|---|
| Real speech-to-text (voice search) | OpenAI Whisper | ~$3 | 1-2 days |
| Natural-language query parsing | Claude Haiku | ~$1 | 1 day |
| Google Places Autocomplete | Google Maps API | ~$3 | half day |
| AI clip auto-summary (the "AI Verdict" line) | Claude with frames | ~$5 | 2-3 days |
| Real-time activity feed | Supabase realtime | $0 | 1 day |
| Voice agent (TTS confirmation) | OpenAI TTS | <$5 | 2 days |
| Smart push notifications (rules-based) | Expo Push | $0 | 1 day |

Tier A + Tier B together: ~$18/month run, ~10-11 days build.

---

## 6. The predictive AI mandate (Phase 1 architectural constraint)

We've committed to making LMC a learning marketplace, not just a relay. Predictive features (demand forecasting, surge dispatch, fraud detection, churn prediction, recommendations) ship in **Phase 2+**, not Phase 1.

But there is **one Phase 1 architectural decision that cannot be skipped:**

### Event-collection pipeline from day 1

Every action gets logged, immutably, with timestamp + geo + context:
- Check request created
- Scout pinged / Scout accepted / Scout declined
- Clip captured / clip submitted / clip rejected
- Cancel (Seeker-initiated or Scout-initiated)
- Rating delivered
- GPS ping (every 30s while Scout is en route or on-site)
- Payment event (auth, capture, refund, payout)

**Storage**: Postgres + Timescale extension (lean path) OR BigQuery (heavyweight). Decide on day 1 of backend, before any schemas are drawn.

**Why this matters**: adding event logging retroactively is painful and loses 6-12 months of training data we can never get back. With it, every predictive feature in §7 below becomes possible later by simply layering ML on top.

---

## 7. What we deferred to Phase 2+ (Tier C — DO NOT BUILD IN V1)

| Feature | Why deferred |
|---|---|
| Crowd-density estimation from video | Off-the-shelf models give bad answers (says 47 people when it's 200). Custom training is weeks of work and may not work well enough. |
| Personalized "For You" feed | Needs user behaviour data we don't have at launch. |
| ML-driven smart push | Upgrade rules-based version once we have engagement data. |
| Reinforcement learning loop (ratings → ranking) | v3 problem. Don't design for it yet. Don't even leave hooks. |
| Demand forecasting / Scout positioning / dynamic pricing | Phase 2. Needs months of event data first. |
| Fraud / quality / churn prediction | Phase 2.5. Needs accumulated history. |
| Proactive scheduling / behavioural clustering / city expansion intel | Phase 3. |

**Hard rule**: do not build any predictive AI in Phase 1. Ship basic product, collect data, layer AI on top in 6-9 months.

---

## 8. KYC architecture (locked 2026-06-01)

- **Seeker = light**: name + email + phone OTP + 18+ attestation + Terms/Privacy/AUP consent. That's it.
- **Scout = heavy**: Stripe Identity (ID + selfie) + Stripe Connect Express (bank + SSN-last-4 + address + 1099 W-9). Handled entirely by Stripe — LMC never stores SSN or bank credentials.
- **No background checks, no police verification, no driving-record checks**. Content quality is enforced by the verification stack (§4) and community moderation, not gatekeeping at signup.

---

## 9. Costs at pilot scale (Miami, 500 checks in 90 days)

| Bucket | Monthly | Notes |
|---|---|---|
| Infra (Supabase + Mapbox + Cloudflare + Mux + Sentry + PostHog) | ~$120-170 | Sum of free/cheap tiers |
| Tier A AI (signage detection) | ~$1 | Google Vision API |
| Tier B AI (STT + NL parse + Places + summary + TTS) | ~$17 | OpenAI + Claude + Google |
| Stripe fees | Variable | 2.9% + 30¢ per Seeker charge, ~0.25% per Scout payout |
| **Total estimated** | **~$140-190/mo** | Plus Stripe % per transaction |

At 10K clips/month: ~$500/mo infra.

---

## 10. Prerequisites before backend day 1

Before any code gets written, these must be in place:

- [ ] App in TestFlight with real testers giving feedback (so we're not building backend for a UX that will change)
- [ ] Supabase account + project created
- [ ] Stripe Connect platform account approved (Stripe reviews — can take days)
- [ ] Mapbox account + token (already done — see `.env`)
- [ ] Mux account + API keys
- [ ] Google Cloud account + Vision API enabled
- [ ] OpenAI account + API key
- [ ] Anthropic account + API key
- [ ] Twilio account + verified sending number
- [ ] Sentry, PostHog, Resend, Inngest accounts
- [ ] Backend engineer hired (1 FTE for Wave 1) — or Guy does the bulk and brings in a contractor for Stripe Connect + Mux integration

---

## 11. The two rules we read out loud before starting

1. **Verification stack (Tier A) is non-negotiable in v1.** Without it we are not a marketplace — we are a relay anyone can copy in 6 weeks.
2. **Event-collection pipeline from day 1 of backend.** Without it the entire predictive AI roadmap is impossible later.

If either of these gets cut, stop and re-read this brief.

---

## Related docs

- `docs/STACK.md` — full tech stack with rationale per choice
- `docs/BUILD-PLAN.md` — full reference document with timeline, costs, risks
- `docs/BUSINESS-PLAN.md` — product positioning, pricing model, launch sequence
- `docs/SCOUT-CONDUCT.md` — Scout Code of Conduct
- `docs/FILMING-POLICY.md` — what Scouts can and can't film
- `studio/OUTSTANDING.md` — living task list with Tier A/B/C structure
