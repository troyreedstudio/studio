# Let Me Check — Build Plan

**Document date:** 2026-04-28
**Status:** Active build, pre-TestFlight
**Owner:** Troy Reed (Black Malibu Inc.)

---

## What it is

**Universal visual verification on demand.** A phone-based marketplace where any user can request a 60-second video of any location (DMV queue, airport security, restaurant wait, hotel pool, used car, real-estate tour, retail queue, gym, club, anywhere) filmed in real time by another user already there. $15 standard / $20 priority. Same model as Uber — anyone is both Seeker (requester) or Scout (filmer), no employees, no human ops, runs itself once the app is in users' hands.

**Tagline:** "Real Eyes. Right Now. Anywhere." (primary), "Know Before You Go." (secondary)

---

## Where we are right now (state at this date)

- React Native + Expo + TypeScript app with 11 visual screens, all flows working with mock data
- Reskinned to Seeker / Scout brand
- Color locked: black + white + orange (`#F47B20`) on LMC logo + LIVE markers
- Tech stack locked in [`docs/STACK.md`](./STACK.md)
- 2 commits in git, runs cleanly on iOS simulator
- `app.json` + `eas.json` configured for Bundle ID `com.blackmalibuinc.letmecheck`
- Pink's locked artifacts in [`docs/BUSINESS-PLAN.md`](./BUSINESS-PLAN.md) (canonical)

---

## Platforms / services

### Already paid for
| Service | Cost |
|---------|------|
| Apple Developer Account | $99/yr (already owned via Black Malibu Inc.) |

### Free or free-tier to start
| Service | Purpose |
|---------|---------|
| Expo / EAS Build | iOS + Android build pipeline |
| App Store Connect | Apple's app management |
| Supabase | Backend: Postgres + auth + storage + realtime |
| Mapbox | Maps + geocoding |
| Cloudflare | CDN + edge + DDoS protection |
| Sentry | Crash reporting |
| PostHog | Product analytics |
| Resend | Transactional email |
| Inngest | Background jobs |
| Upstash Redis | Hot cache for dispatch state |
| TestFlight | iOS beta distribution (built into Apple Dev) |

### Pay-per-use
| Service | Approx cost at small scale |
|---------|---------------------------|
| Mux (video pipeline) | ~$50/mo at 1,000 clips/month |
| Stripe Payments + Connect Express | 2.9% + 30¢ per transaction (built into pricing) |
| Twilio Verify (SMS OTP) | ~$0.01 per SMS (~$10/mo) |
| Google Vision API (AI signage check) | ~$5/mo at low volume |

### Deferred to later phase
| Service | Cost |
|---------|------|
| Google Play Console | $25 one-time (Android launch — Phase 7+) |

---

## Build phases

| Phase | Description | Time | Who |
|-------|-------------|------|-----|
| **1. TestFlight setup** | EAS Build configured, app registered in App Store Connect, first iOS build uploaded, LMC installed on Troy's real iPhone via TestFlight | **1–2 days** | Both — Troy handles App Store Connect + Expo signup, Guy handles code config |
| **2. Real-iPhone polish** | Fix anything that breaks on real device vs simulator. Match orange palette across remaining 9 screens. Wire up remaining static elements (search bar, profile rows, history filters). | **~1 week** | Both — Troy flags issues, Guy implements |
| **3. Backend Wave 1 — Foundation** | Supabase project + Postgres schemas (Seeker, Scout, Venue, Request, Clip, Verification). Authentication (Apple, Google, email + SMS OTP). Replace all mock data with real API calls. | **~1 week** | Guy. Troy does Twilio account signup. |
| **4. Backend Wave 2 — Dispatch + Geo** | Mapbox integrated. PostGIS for venue geofences. H3 spatial indexing for Scout location queries. Real-time dispatch — only Scouts inside the geofence get pinged. Status flow (requested → assigned → filming → delivered). | **~1 week** | Guy. Troy does Mapbox account signup. |
| **5. Backend Wave 3 — Video + Payments** | Real camera (`react-native-vision-camera`). Mux video upload + adaptive streaming + CDN. Stripe Payments for Seeker. Stripe Connect Express for Scout payouts. Refund handling. | **~1 week + 1–7 days for Stripe Connect KYC** | Both — Troy does Stripe Connect account + KYC, Guy wires the integration |
| **6. Backend Wave 4 — Verification Stack** | All 6 layers from Pink's plan: geofence enforcement, reference photo confirmation, GPS-stamped clips, AI signage detection (Google Vision), 20-min Scout cooldown, rating + reputation loop. | **~1 week** | Guy. Troy does Google Cloud account for Vision API. |
| **7. Soft launch in Miami** | App Store review submission, Apple review (3–7 days), public release. Marketing launch (TikTok, Instagram, Miami nightlife partnerships, viral referral incentives). Onboarding first wave of Seekers + Scouts in Miami. | **~2 weeks build-ready + 90-day operational target** | Both — Guy preps submission, Troy handles marketing + user acquisition |

---

## Timeline summary

| Milestone | When |
|-----------|------|
| LMC running on real iPhone via TestFlight (no real backend yet) | **End of Day 2** |
| Polished prototype on TestFlight, all UI working on real device | **End of Week 1** |
| Real backend — accounts, auth, real data | **End of Week 2** |
| Real dispatch — Seekers can request, Scouts get pinged | **End of Week 3** |
| Real money + real video — full transactional flow | **End of Week 4** |
| Verification stack complete — fraud-resistant | **End of Week 5** |
| App Store live, Miami soft launch begins | **End of Week 6–7** |
| 500 paid requests / proof of concept (Pink's Phase 1 target) | **End of Month 4** |

**Realistic build-to-launch:** ~6–7 weeks, assuming Troy is responsive on accounts + decisions, no major Apple App Store rejection issues, and Stripe KYC clears in standard 1–7 days.

**Add ~20% buffer** for real-world slippage. Confident range: **7–9 weeks**.

---

## Costs

### Already paid
- Apple Developer: $99/yr ✓

### One-time setup costs
- Domain (e.g. `letmecheck.com`, optional): ~$15/yr
- Google Play Console: $25 (deferred to Android launch)

### Monthly infrastructure at Miami launch scale
| Service | Monthly cost |
|---------|--------------|
| Supabase Pro | $25 |
| Mux video (~1,000 clips/mo) | ~$50 |
| Mapbox | $0–50 |
| Twilio SMS | ~$10 |
| Google Vision API | ~$5 |
| Other (Inngest, Upstash, Resend, Sentry, PostHog) | ~$30 |
| **Infra subtotal** | **~$120–170/mo** |

### Variable costs (scale with revenue)
- Stripe: 2.9% + 30¢ per transaction (built into pricing — comes out of the $7–8 platform margin)

### At scale (10,000 clips/month)
- ~$500/mo infrastructure cost
- Margin holds at any volume per Pink's pricing model

---

## Roles

| Person | Owns |
|--------|------|
| **Troy** | Product decisions, brand, all account signups (Apple, Stripe, Supabase, Mapbox, Mux, Google Cloud, Twilio, Expo), real-device testing, marketing, launch operations, content/copy, partnerships |
| **Guy** (Claude Code agent) | All code (mobile + backend + dispatch + integrations), DevOps, deployments, configuration, troubleshooting |
| **Optional later** | Designer (brand polish + real venue photography), QA tester (manual edge-case testing) |

---

## Honest risks / caveats

1. **Stripe Connect KYC can delay Wave 3.** Stripe takes 1–7 days to verify a marketplace payout account. Start the paperwork well before Wave 3 begins.
2. **Apple App Store review can reject the first submission.** Common reasons: missing privacy policy, unclear in-app purchase descriptions, geofencing permissions copy. Usually fixable in 1–2 days.
3. **User acquisition is the real challenge — not the build.** Building the marketplace ≈ 6 weeks. Filling it with enough Seekers + Scouts in Miami to make the marketplace work ≈ the actual project. Marketing strategy must be planned alongside the technical build.
4. **Schedule slippage is normal.** Assume +20% on every estimate. Realistic landing zone: **7–9 weeks**.
5. **Cross-project rule.** Pink Pineapple stays on its own track, untouched. LMC has its own Bundle ID, Supabase project, App Store Connect entry — fully sandboxed.

---

## What's holding us up at this exact moment

**One thing:** Troy's Expo account.

Once Troy creates an account at [expo.dev](https://expo.dev/signup) and provides the username, the next 24 hours are:

1. Guy links the LMC repo to Troy's Expo account
2. Guy triggers first iOS build (~15–25 min on Expo's servers)
3. Guy submits the build to TestFlight (~10 min Apple processing)
4. Troy installs LMC on his real iPhone via the TestFlight app

That's when Troy is holding LMC on his own phone — the first real motivation moment of the project.

---

## References

- [`BUSINESS-PLAN.md`](./BUSINESS-PLAN.md) — Pink's locked business plan (brand, pricing, verification stack, launch sequence)
- [`STACK.md`](./STACK.md) — full locked tech stack with rationale
- [`archive/MVP-PLAN-telegram-bot-OUTDATED.md`](./archive/MVP-PLAN-telegram-bot-OUTDATED.md) — superseded original Telegram MVP plan, reference only

---

*Authored 2026-04-28 by Guy (Claude Code agent for Let Me Check) for Troy Reed.*
