# External Integrations

**Analysis Date:** 2026-06-19

> **Read this first:** LMC is a UI prototype. The product's marketplace plumbing (backend, auth, payments, real-time dispatch, push, camera capture) is **mocked in-component** — there is no live backend. Only a small set of integrations actually talk to the outside world today: **Mapbox** (maps), **device GPS via expo-location**, an **IP geolocation API (ipwho.is)**, **video/audio playback**, and **Google Fonts**. The rest is planned (`docs/STACK.md`) and listed below as not-yet-wired.

## APIs & External Services (LIVE / wired today)

**Maps:**
- **Mapbox** - native map UI rendered in `lmc-app/app/(seeker)/home.tsx` and `lmc-app/app/(seeker)/waiting.tsx`.
  - SDK/Client: `@rnmapbox/maps` ^10.3.1
  - Auth (runtime): `EXPO_PUBLIC_MAPBOX_TOKEN`, set in `lmc-app/app/_layout.tsx` via `Mapbox.setAccessToken(...)`
  - Auth (build): `MAPBOX_DOWNLOAD_TOKEN`, consumed by the `@rnmapbox/maps` plugin in `lmc-app/app.config.js`

**Geolocation:**
- **Device GPS + reverse geocoding** via `expo-location` (Apple/Google location services) - exact coordinates and city name. Implemented in `lmc-app/app/state/location.ts` (`requestForegroundPermissionsAsync`, `getCurrentPositionAsync`, `reverseGeocodeAsync`).
  - Auth: OS permission prompt (iOS Info.plist `NSLocationWhenInUseUsageDescription` in `app.config.js`)
- **ipwho.is** - free IP-to-city geolocation HTTP API used as a no-permission fallback when GPS is denied. Called in `lmc-app/app/state/location.ts` via `fetch('https://ipwho.is/')`.
  - Auth: none (unauthenticated public endpoint)

**Fonts:**
- **Google Fonts** (via `@expo-google-fonts/*` bundled packages, loaded with `useFonts` in `lmc-app/app/_layout.tsx`). Fonts ship in the bundle, so no runtime network dependency.

## Data Storage

**Databases:**
- None. No database client, no API layer. All domain data is mock data in `lmc-app/app/data/markets.ts` and embedded in screen components.
- *Planned:* Postgres via Supabase + PostGIS (`docs/STACK.md`). Not wired.

**File Storage:**
- Local app bundle / device only (icons in `lmc-app/assets/`, sample media). No remote object storage.
- *Planned:* Supabase Storage for reference/profile photos, Mux for video. Not wired.

**Caching:**
- In-memory JS stores only (`lmc-app/app/state/*.ts`), reset on app restart.
- *Planned:* Upstash Redis (online-Scout list, cooldown TTLs). Not wired.

## Authentication & Identity

**Auth Provider:**
- None wired. `lmc-app/app/auth/sign-in.tsx` and `lmc-app/app/auth/sign-up.tsx` are UI-only; `lmc-app/app/scout/identity.tsx` is a mock KYC capture screen. Role selection is a local in-memory store (`lmc-app/app/state/intended-role.ts`).
- *Planned:* Sign in with Apple, Google Sign-In, Supabase Auth magic link, Twilio Verify SMS OTP, biometric unlock (`expo-local-authentication`). None installed.

## Monitoring & Observability

**Error Tracking:**
- None.
- *Planned:* Sentry (`docs/STACK.md`). Not wired.

**Logs:**
- Local `console` only. No analytics.
- *Planned:* PostHog product analytics + session replay. Not wired.

## CI/CD & Deployment

**Hosting / distribution:**
- iOS via TestFlight / App Store, Android via Google Play. Built and submitted through **EAS Build** (Expo Application Services).
- Config: `lmc-app/eas.json` (development / preview / production profiles; iOS submit profile references ascAppId `6764298662`, Apple Team `YNCLWQN2B8`, and an App Store Connect API key path — no secret values stored in repo). EAS projectId and owner `troyreed26` in `lmc-app/app.config.js`.

**CI Pipeline:**
- None in repo.
- *Planned:* GitHub Actions (`docs/STACK.md`). Not wired.

## Environment Configuration

**Env vars (by name — values never read):**
- `EXPO_PUBLIC_MAPBOX_TOKEN` - public Mapbox runtime token (used in `app/_layout.tsx`).
- `MAPBOX_DOWNLOAD_TOKEN` - secret Mapbox SDK download token (used at build time in `app.config.js`).

**Secrets location:**
- `lmc-app/.env` (git-ignored; **contents not read or echoed**).
- iOS signing/submit references in `lmc-app/eas.json` point to a private key path on Troy's machine (`~/.private_keys/...`), not committed.
- Repo also contains `SECURITY_ANALYSIS.json` / `SECURITY_AUDIT.json` artifacts at the studio root — not read for this analysis.

## Webhooks & Callbacks

**Incoming:**
- None (no backend).
- *Planned:* Supabase Edge Functions for signage-AI triggers and payment webhooks. Not wired.

**Outgoing:**
- One outbound HTTP call: `GET https://ipwho.is/` for IP geolocation (`lmc-app/app/state/location.ts`). No other network egress in app code.

## Device Capabilities (declared, partially mocked)

- **Camera/Microphone** - iOS usage strings declared in `app.config.js` (`NSCameraUsageDescription`, `NSMicrophoneUsageDescription`), but **no camera library is installed**. The Scout filming screen (`lmc-app/app/(scout)/filming.tsx`) renders a *simulated* viewfinder placeholder, not a real camera feed.
  - *Planned:* `react-native-vision-camera` for real capture. Not installed.
- **Photo Library** - usage string declared (`NSPhotoLibraryUsageDescription`); no library integration wired yet.

---

*Integration audit: 2026-06-19*
