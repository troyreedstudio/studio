# Stack Research

**Domain:** On-demand, real-time, location-based two-sided gig marketplace with a mobile video pipeline (Seeker pays → nearby Scout films a 15-sec clip → delivered in 7–10 min)
**Researched:** 2026-06-19
**Confidence:** HIGH (the locked stack is mainstream, battle-tested, and verified against current docs; a handful of refinements and risk flags below)

> **Verdict on `docs/STACK.md`:** The locked stack is **sound and approved as-is for the beta**. It is the standard 2025/2026 toolkit for this domain. This research **confirms** the core choices (Supabase, Stripe Connect Express, Mux, vision-camera, PostGIS+H3, Mapbox, Expo Push, Stripe Identity), **refines** a few (payment flow model, dispatch transport, what to defer), and **flags** the real risks (Supabase Realtime connection ceiling, the auth-hold/7-day window, KYC timing, vision-camera + Expo build coupling). Nothing here calls for re-litigating the locked stack.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Supabase** (Postgres 15+ / PostGIS 3.4+) | Pro plan | DB, auth, storage, realtime, edge functions | One managed platform covers DB + auth + storage + websockets + serverless. Right call for a small non-technical team: less infra to operate. Postgres + PostGIS is the industry-standard spatial backend. **CONFIRM.** |
| **PostGIS** | 3.4+ (bundled with Supabase) | Geofence polygons, radius/`ST_DWithin` "scouts near venue" queries | The standard for geofencing. Enable on day 1. **CONFIRM.** |
| **H3** | h3-js ^4.1.0 | Hexagonal spatial index for "which scouts are in this venue's cell" lookups | Uber's own dispatch index. **Note:** for a single-city beta with low scout counts, H3 is *optional* — PostGIS `ST_DWithin` alone handles 50 scouts / 20 venues comfortably. Treat H3 as a scale-readiness layer, not a beta blocker. **CONFIRM, but sequence late.** |
| **Stripe Payments + Connect Express** | API `2025-xx`; `@stripe/stripe-react-native` ^0.45.x | Seeker charge (auth-hold) + Scout payouts (marketplace) | The only sane choice for marketplace payouts with KYC + tax built in. Connect Express = Stripe-hosted onboarding, you control payout schedule. **CONFIRM.** |
| **Mux** | `@mux/mux-node` server SDK; direct upload + HLS | Video upload, transcode, adaptive HLS CDN playback | Loom/Cameo-grade pipeline as a managed service. Direct upload from device means no video ever touches your server. **CONFIRM** (cost-alternative flagged below). |
| **react-native-vision-camera** | ^4.6.x | Real camera capture (the Scout filming screen) | 60fps, hardware-accelerated, frame processors for later on-device AI. Has a first-class Expo config plugin; requires a **dev build / EAS Build** (not Expo Go — already your workflow). **CONFIRM.** NOT expo-camera (no frame processors, weaker control). |
| **Mapbox** (`@rnmapbox/maps`) | ^10.3.1 (already installed) | Map UI for both roles | Already wired and working in the prototype. Lyft/Strava use it; cheaper than Google Maps at scale. **CONFIRM — keep.** |
| **Expo Push** (APNs + FCM v1) | expo-notifications ~0.x for SDK 54 | Job alerts to Scouts, delivery alerts to Seekers | Free, simple, good enough for beta. **CONFIRM with caveats** — no SLA, 600 notif/sec/project cap, must implement receipt-checking + retry. Fine at beta scale; revisit at multi-city. |
| **Stripe Identity** | via Stripe dashboard / API | Scout KYC before first payout | Native to Connect, lowest-friction KYC. **CONFIRM.** |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` | ^2.45.x | Supabase client (DB, auth, realtime, storage) | Core — every screen that touches the backend |
| `react-native-mmkv` | ^3.x | Fast local key-value (session token, cached profile, flags) | Replace the in-memory JS stores in `app/state/*.ts` |
| `react-hook-form` + `zod` | ^7.x / ^3.x | Form state + validation (onboarding, KYC, address) | Auth + onboarding + payment screens |
| `@turf/turf` | ^7.x | Client-side distance / point-in-polygon checks | Cheap "am I inside the geofence?" check on-device before upload |
| `expo-location` | ~19.0.8 (installed) | Device GPS + reverse geocode + IP fallback | Already wired — reuse for GPS-stamping clips |
| `expo-local-authentication` | ~16.x for SDK 54 | Face ID / fingerprint unlock | Optional polish; defer past core loop |
| `@react-native-google-signin/google-signin` | ^13.x | Native Google sign-in | Auth |
| `expo-apple-authentication` | ~8.x for SDK 54 | Sign in with Apple (mandatory on iOS if you offer other social logins) | Auth |
| `ffmpeg-kit-react-native` | **see warning** | Client-side compression before upload | **Flag:** ffmpeg-kit was retired/archived by its maintainer in early 2025. Prefer Mux direct-upload's built-in client transcode, or vision-camera's native compression. Avoid adding ffmpeg-kit unless strictly needed. |
| `@sentry/react-native` | ^6.x | Crash + perf reporting | Add before beta (real users, real money) |
| `posthog-react-native` | ^3.x | Product analytics + funnels | Add before beta to measure the 500-checks goal |
| `twilio` (Verify) | server-side | SMS OTP | Phone auth. **Note:** Supabase Auth has native phone OTP via Twilio — wire Twilio *through* Supabase Auth rather than as a separate path. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| EAS Build | iOS/Android binaries | Already in use (Build 9 on TestFlight). vision-camera + Mapbox both require dev builds — already your reality. |
| Supabase CLI | Local DB, migrations, type generation | Use `supabase gen types typescript` so the RN app gets typed DB access — high value for a strict-TS codebase |
| GitHub Actions | CI (typecheck, lint, EAS build triggers) | Add a typecheck gate first; there are no tests today |
| Inngest **or** Trigger.dev | Durable background jobs (payout transfers, push fan-out, future signage AI, recurring-check scheduling) | Pick **one**. Inngest's free tier + DX is the lighter choice for this team. Needed once payouts + recurring checks are real. |

## Installation

```bash
# Backend client + storage + forms
npm install @supabase/supabase-js react-native-mmkv react-hook-form zod @turf/turf h3-js

# Payments
npm install @stripe/stripe-react-native

# Camera (real capture) — requires EAS dev build, not Expo Go
npm install react-native-vision-camera

# Auth (native social)
npm install @react-native-google-signin/google-signin
npx expo install expo-apple-authentication expo-local-authentication

# Notifications
npx expo install expo-notifications expo-device

# Observability (before beta)
npm install @sentry/react-native posthog-react-native

# Server-side (separate backend / edge functions, not the RN bundle)
# @mux/mux-node, stripe, inngest, twilio
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Mux** | **Cloudflare Stream** / Bunny Stream | If video cost becomes the dominant line item. Cloudflare Stream is cheaper per-minute and Cloudflare-native; Bunny is cheapest. Mux earns its premium via Mux Data analytics + best-in-class DX. **For beta: stay on Mux.** Re-cost at ~10k clips/mo. |
| **Supabase Realtime** | **Ably / Pusher** | If concurrent connections exceed ~500 (Supabase Pro ceiling) or you need guaranteed delivery + geo-redundancy. Beta scale (50 scouts) is far under the ceiling — Supabase is correct now. Use Supabase **Broadcast** (<50ms) for dispatch, NOT Postgres Changes (50–200ms WAL lag) for time-sensitive pings. |
| **Stripe Connect Express** | Connect Custom / Standard | Express is right: Stripe hosts onboarding + handles KYC liability. Custom only if you need fully white-labeled onboarding (more compliance burden — avoid for beta). |
| **H3 + PostGIS** | PostGIS `ST_DWithin` alone | At beta scale, plain PostGIS radius queries are enough. Add H3 indexing as scout density grows. |
| **react-native-vision-camera** | expo-camera | expo-camera is simpler and Expo-Go-friendly, but lacks frame processors needed for the future on-device signage/blur AI. vision-camera is the forward choice. |
| **Expo Push** | OneSignal | OneSignal adds segmentation, scheduling, dashboards. Worth it post-beta for marketing pushes; overkill for transactional job alerts now. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **`react-native-maps`** (currently installed) | Unused dead dependency; Mapbox is the active map layer. Adds bundle weight + a second map SDK to maintain. | Remove it. Keep `@rnmapbox/maps`. |
| **`ffmpeg-kit-react-native`** | The package was retired/archived by its maintainer (binaries pulled in 2025). Building on it is a supply-chain dead-end. | Mux direct-upload client transcode, or vision-camera native settings. |
| **Postgres Changes for dispatch pings** | 50–200ms replication lag + fires on every row change; wrong tool for "ping the 3 scouts in this geofence now." | Supabase **Broadcast** channels (server-mediated, <50ms) + **Presence** for the online-scout roster. |
| **Charge-then-refund payment flow** | Creates refunds, disputes, and bad UX when no Scout is found. PROJECT.md already specifies auth-hold. | Stripe **PaymentIntent `capture_method: manual`** — authorize on request, **capture on Scout acceptance**, **cancel** (auto-release) if no Scout. See risk flag on the 7-day window. |
| **expo-camera for the Scout filming screen** | No frame processors → blocks the future on-device AI moat (signage detect, privacy blur). | react-native-vision-camera. |
| **Separate non-Supabase auth provider (Auth0/Clerk)** | Doubles your identity surface; Supabase Auth already does Apple/Google/phone-OTP/magic-link and ties rows to `auth.uid()` for row-level security. | Supabase Auth as the single source of truth; Twilio Verify *behind* it for SMS. |
| **Hand-rolled WebSocket server / self-hosted Redis cluster** | Operating real-time infra is exactly what this team should not own. | Supabase Realtime now; Upstash serverless Redis only for cooldown TTLs + online-scout cache (pay-per-use). |

## Stack Patterns by Variant

**Beta (Miami, 50 scouts / 20 venues / 500 checks):**
- Supabase Pro + Broadcast/Presence for dispatch, PostGIS `ST_DWithin` for geofence (skip H3 for now)
- Mux direct upload, Stripe manual-capture auth-hold, Expo Push, Stripe Identity
- Because: every piece is managed, well under all free/Pro ceilings, minimal ops.

**Scale-up (multi-city, >500 concurrent connections):**
- Add **H3** indexing; introduce **Upstash Redis** for the online-scout list + 20-min cooldown TTLs
- Evaluate **Ably/Pusher** if Supabase Realtime connection ceiling is hit
- Move long-running work (payouts, push fan-out, signage AI) onto **Inngest/Trigger.dev**
- Re-cost Mux vs Cloudflare Stream.

**Payment flow (the important pattern):**
- `PaymentIntent(capture_method='manual')` on request → authorization hold (no charge)
- Scout accepts within minutes → **capture** the PaymentIntent
- No Scout found → **cancel** → hold auto-releases, nothing charged
- Payout: **separate charges and transfers** to the Scout's Connect Express account (lets the Scout payout differ from the charge, handles platform fee cleanly). Destination charges are simpler but separate-charges-and-transfers fits "scout unknown at charge time" better.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Expo SDK ~54.0.34 | React Native **0.81.5** | **Action:** docs/CLAUDE say RN 0.83.2 — package.json says 0.81.5. Trust package.json. Fix the docs. |
| react-native-vision-camera ^4.x | Expo SDK 54 / RN 0.81 | Works via config plugin + EAS dev build. NOT Expo Go. New Architecture supported. |
| @stripe/stripe-react-native ^0.45.x | Expo SDK 54 | Use the Expo config plugin. Apple Pay / Google Pay supported. |
| @rnmapbox/maps ^10.3.1 | Expo SDK 54 (installed, working) | Keep download token in `MAPBOX_DOWNLOAD_TOKEN` (build-time) as now. |
| expo-notifications | Expo SDK 54 | Requires FCM **v1** credentials (FCM legacy is dead) + APNs key. |

## Key Risk Flags (for the roadmap)

1. **Auth-hold 7-day window.** Stripe cancels uncaptured PaymentIntents after 7 days by default. Irrelevant for the 7–10 min loop, but recurring/scheduled checks must create the PaymentIntent *near* dispatch time, not days ahead. Extended Authorizations (up to ~30 days) exist but are merchant-gated — don't design around them for beta.
2. **Supabase Realtime 500-connection Pro ceiling.** Fine for beta; becomes a hard wall at scale. Use Broadcast (not Postgres Changes) for dispatch so you're not also paying replication latency.
3. **KYC timing.** Stripe Identity / Connect onboarding must complete *before a Scout's first payout*, not before they can film. Don't gate the filming flow on KYC or you'll stall scout supply. Gate the payout.
4. **Expo Push has no SLA.** Acceptable for beta transactional alerts; must implement receipt-checking + exponential backoff retry (HTTP 429/5xx). Critical "your check is ready" alerts should also have an in-app fallback.
5. **vision-camera ↔ EAS coupling.** Adds native build complexity; every camera change needs a new dev build. Already true for Mapbox, so no new pain — just budget build time.
6. **ffmpeg-kit is dead.** Don't build the compression step on it.

## Sources

- Expo Push Notifications docs — limits (600/sec, 4KB payload, no SLA), FCM v1/APNs requirements, retry guidance — HIGH. https://docs.expo.dev/push-notifications/sending-notifications/
- Stripe — manual capture / authorization holds, 7-day default expiry, Extended Authorizations, separate-charges-and-transfers for Connect — HIGH. https://docs.stripe.com/payments/place-a-hold-on-a-payment-method , https://docs.stripe.com/connect/marketplace/tasks/accept-payment/separate-charges-and-transfers
- Stripe Connect destination vs separate charges/transfers (React Native) — HIGH. https://docs.stripe.com/connect/destination-charges?platform=react-native
- Supabase Realtime limits + Broadcast/Presence/Postgres-Changes latency profile, 500-connection Pro ceiling — MEDIUM/HIGH. https://supabase.com/docs/guides/realtime/limits , https://ably.com/compare/ably-vs-supabase
- Mux vs Cloudflare Stream vs Bunny — video API tradeoffs, direct upload, react-native-video HLS — MEDIUM. https://www.mux.com/video-for/react-native , https://www.pkgpulse.com/guides/mux-vs-cloudflare-stream-vs-bunny-stream-video-cdn-2026
- Expo SDK 54 = React Native 0.81, precompiled iOS frameworks; vision-camera needs dev build (not Expo Go) — HIGH. https://expo.dev/changelog/sdk-54
- vision-camera v4 / Expo config plugin / frame processors — MEDIUM (training + ecosystem; npm page returned 403, version stated as ^4.6.x from current knowledge, verify at install).
- Installed versions cross-checked against `.planning/codebase/STACK.md` and `lmc-app/package.json` — HIGH.

---
*Stack research for: on-demand real-time location-based gig marketplace with mobile video pipeline*
*Researched: 2026-06-19*
