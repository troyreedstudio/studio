# LMC Tech Stack — Locked

This document records every technology choice for Let Me Check, locked 2026-04-25 with Troy. No re-litigating without an explicit decision review.

The bar Troy set: **Uber/Lyft-grade geo + TikTok/Instagram-grade video + a "vast and forward" backend**. Every choice below is the best-in-class commercial equivalent of what the giants use, sized so we get giant-grade quality from Day 1 without giant-grade infrastructure costs at launch.

---

## Mobile (single codebase, iOS + Android)

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **React Native 0.83.2 + Expo 54 + TypeScript 5.9** | One codebase, two stores. Used by Discord, Shopify, Tesla. Already in repo. |
| Routing | **Expo Router (file-based)** | Already wired. Route groups: `(seeker)/`, `(scout)/`. |
| Camera | **react-native-vision-camera** | 60fps, hardware-accelerated, frame processors for live AI overlays. NOT expo-camera. |
| Animations | **React Native Reanimated 3** | 60fps Instagram-smooth animations. |
| Gestures | **React Native Gesture Handler** | Native-feel taps and swipes. |
| Micro-animations | **Lottie** | Loading states, success ticks, etc. |
| Custom rendering | **React Native Skia** | Filters, overlays, TikTok-style effects when needed. |
| Local storage | **MMKV** | Fastest mobile k-v store. Used by Discord. |
| Design system | **NativeWind or Tamagui** | TBD; will pick one when rolling out global theme. |
| Builds | **EAS Build** | Expo Application Services for iOS + Android binaries. |

## Smart inputs (the "easy, self-explanatory" polish bar)

| Need | Choice |
|------|--------|
| Venue / address autocomplete | **Google Places Autocomplete API** |
| Geocoding (name → GPS) | **Google Geocoding API** |
| Country code picker (📞 +1, +44, +62 with flags) | **react-native-country-picker-modal** |
| State / region / city dropdowns | **country-state-city** package |
| Form state + validation | **React Hook Form + Zod** |
| Native dropdowns | **react-native-element-dropdown** |
| Date / time pickers | iOS/Android native via Expo |
| Phone verification SMS OTP | **Twilio Verify** |
| Smart keyboard handling | **react-native-keyboard-controller** |
| Haptic feedback | **expo-haptics** |

## Geo (Uber-grade dispatch)

| Layer | Choice | Why |
|-------|--------|-----|
| Map UI | **Mapbox SDK** | Lyft, Foursquare, Strava use it. Better customisation + cheaper than Google Maps at scale. |
| Spatial indexing | **H3** | Uber's open-source hexagonal indexing — same lib Uber dispatch uses. |
| Spatial database | **PostGIS** (Postgres extension) | Industry-standard for geofencing + radius queries. |
| Live location | iOS Core Location + Android Fused Location | Highest available accuracy. |
| Distance / boundary math | **Turf.js** | Standard JS geospatial library. |

## Video (TikTok-grade pipeline)

| Layer | Choice | Why |
|-------|--------|-----|
| Capture | **react-native-vision-camera** | 60fps, frame processors. |
| Upload + transcode + CDN | **Mux** | Used by Loom, Cameo, Robinhood. Adaptive HLS streaming, instant playback. |
| Playback | **Mux Player** (or react-native-video) | HLS, smooth scroll feed. |
| Live face/scene blur (privacy) | **Vision-camera frame processors + on-device CoreML** | Privacy by default for Scouts and bystanders. |
| Client-side compression | **FFmpeg-kit-react-native** | Pre-upload optimisation. |

## Auth

| Method | Choice |
|--------|--------|
| iOS sign-in | **Sign in with Apple** (mandatory on iOS) |
| Google sign-in | **Google Sign-In** native |
| Email / passwordless | **Supabase Auth magic link** |
| SMS OTP | **Twilio Verify** |
| Biometric unlock | **expo-local-authentication** (Face ID, fingerprint) |

## Payments (marketplace)

| Need | Choice | Why |
|------|--------|-----|
| Seeker payment | **Stripe Payments** | Industry default. |
| Scout payouts (marketplace) | **Stripe Connect Express** | Only sane choice for global gig payouts. |
| Apple Pay one-tap | **@stripe/stripe-react-native** native integration | |
| Google Pay one-tap | Same | |
| Scout identity verification (KYC) | **Stripe Identity** | |
| Marketplace tax compliance | **Stripe Tax** | |
| Fraud detection | **Stripe Radar** | |

## Backend

| Layer | Choice | Why |
|-------|--------|-----|
| Database | **Postgres** via **Supabase** | Industry-standard. Same DB engine the giants use. |
| Spatial extension | **PostGIS** turned on Day 1 | For geofencing + radius queries. |
| Auth | **Supabase Auth** | One platform for auth + DB. |
| File / video storage | **Supabase Storage** + **Mux** for video | Mux handles the video pipeline; Supabase Storage holds reference photos, profile photos, certificates. |
| Realtime | **Supabase Realtime** | Postgres logical replication → WebSocket subscriptions. For dispatch + live location. |
| Edge functions | **Supabase Edge Functions** (Deno) | For lightweight webhooks, signage AI triggers. |
| Hot cache (online Scouts, cooldowns) | **Upstash Redis** | Serverless Redis, pay-per-use. |
| Background jobs (signage AI, payouts, push) | **Inngest** or **Trigger.dev** | Durable workflows, retries, scheduled jobs. |
| CDN + edge + DDoS | **Cloudflare** | Free tier covers launch needs. |

## Search & discovery

| Need | Choice |
|------|--------|
| Venue search (typo-tolerant, instant) | **Algolia** or **Typesense** |
| Venue data fallback (when our DB doesn't have a venue) | **Google Places API** + **Foursquare Places** as backup |

## AI / ML

| Need | Choice (Wave 1) | Choice (later) |
|------|----------------|----------------|
| AI signage detection on clips | **Google Vision API** or **AWS Rekognition** | Custom CLIP-based model on Replicate or Modal as data accumulates |
| Future "Ask LMC" chat | — | **OpenAI GPT-4o** (Wave 4) |
| Voice mode | — | **ElevenLabs** (post-launch) |

## Notifications & comms

| Channel | Choice |
|---------|--------|
| Push (iOS + Android) | **Expo Push** (uses APNs + FCM) |
| SMS | **Twilio** |
| Transactional email | **Resend** |
| In-app chat support | **Crisp** or **Intercom** |

## Quality + ops

| Need | Choice |
|------|--------|
| iOS + Android builds | **EAS Build** |
| Beta distribution | **TestFlight** (iOS) + **Play Console internal track** (Android) |
| CI / CD | **GitHub Actions** |
| Crash reporting + perf | **Sentry** |
| Product analytics | **PostHog** |
| Session replay | **PostHog Session Replay** |

---

## Third-party accounts needed (action items)

- [ ] Apple Developer ($99/year) — Troy may already have one from Pink Pineapple
- [ ] Google Play Console ($25 one-off)
- [ ] Stripe (with Connect enabled)
- [ ] Mapbox account (free tier OK to start)
- [ ] Mux account (pay-as-you-go)
- [ ] Supabase project (free tier OK to start, $25/month Pro at scale)
- [ ] Twilio account (Verify product enabled)
- [ ] Cloudflare account (free)
- [ ] Sentry, PostHog, Resend (free tiers)

## Rough monthly cost at Miami launch (small scale)

| Item | Approx |
|------|--------|
| Supabase Pro | $25 |
| Mux video (1,000 clips/mo) | ~$50 |
| Mapbox (small usage) | $0–50 |
| Upstash Redis | $0–10 |
| Inngest | $0–20 |
| Cloudflare | $0 |
| Stripe | per-transaction (passed in pricing) |
| Twilio | per-SMS (low) |
| **Total** | **~$100–150/month** |

Scales to ~$500/month at 10,000 clips/month. We don't pay TikTok-scale infra costs until we have TikTok-scale usage.

---

## Verification stack ↔ tech mapping

The 6-layer verification stack from Pink's business plan, mapped to specific tech:

| Verification layer | Tech that delivers it |
|--------------------|----------------------|
| 1. 30–50m GPS geofence around venue | **PostGIS** (geofence stored as polygon) + **H3** (hex lookup) |
| 2. Only Scouts inside geofence get pinged | **Supabase Realtime** filtered subscriptions + **Redis** for online Scout list |
| 3. Reference photo confirmation before filming | **Google Places API** (photo source) + **Supabase Storage** (cached) + native UI |
| 4. GPS-stamped clip on submission | **iOS Core Location / Android Fused Location** + Mux upload metadata |
| 5. AI signage detection on clip | **Google Vision API** (Wave 1) → custom CLIP model later, triggered via **Inngest** background job |
| 6. 20-minute Scout cooldown per venue | **Redis** TTL keys keyed on `scout_id:venue_id` |

---

*Locked 2026-04-25 — every choice approved by Troy.*
