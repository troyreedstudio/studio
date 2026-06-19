# Technology Stack

**Analysis Date:** 2026-06-19

> **Read this first:** LMC is a **fully-built UI prototype**. Most of the product runs on **mock data embedded in components** and small in-memory stores. A handful of integrations are genuinely wired (Mapbox maps, device GPS, IP geolocation, video playback, Google Fonts). The large "giant-grade" stack (Supabase, Stripe, Mux, vision-camera, push) is **documented but NOT installed** — see the **Target Stack (Not Yet Built)** section and `docs/STACK.md`.
>
> **Version note:** Project docs (`CLAUDE.md`, `docs/STACK.md`) say React Native 0.83.2 + Expo 54. The actual installed versions in `lmc-app/package.json` are **React Native 0.81.5 + Expo ~54.0.34**. Trust `package.json` for what is real.

## Languages

**Primary:**
- TypeScript ~5.9.2 - All app code under `lmc-app/app/` (`.tsx` screens, `.ts` state/data modules). `tsconfig.json` extends `expo/tsconfig.base` with `strict: true`.

**Secondary:**
- JavaScript - Config only (`lmc-app/app.config.js`).

## Runtime

**Environment:**
- React Native 0.81.5 (installed) running on the Hermes engine via Expo.
- React 19.1.0.
- Expo SDK ~54.0.34 - managed workflow with `expo-router/entry` as the app entry (`lmc-app/package.json` `main`).

**Package Manager:**
- npm
- Lockfile: present (`lmc-app/package-lock.json`)
- No Node version pin (`.nvmrc` / `.node-version` not present).

## Frameworks

**Core (installed and used):**
- Expo ~54.0.34 - Managed React Native app platform. Config: `lmc-app/app.config.js`.
- Expo Router ~6.0.23 - File-based routing. Routes live in `lmc-app/app/`, grouped `(seeker)/` and `(scout)/`, plus `auth/`, `onboarding/`, `scout/`, `seeker/`, `legal/`. Root navigator: `lmc-app/app/_layout.tsx`.
- React 19.1.0 / React Native 0.81.5 - UI runtime.

**Testing:**
- Not detected. No test runner, no `*.test.*` / `*.spec.*` files, no test script in `package.json`.

**Build/Dev:**
- EAS Build (Expo Application Services) - iOS/Android binaries. Config: `lmc-app/eas.json` (development / preview / production profiles; `appVersionSource: remote`). Project owner `troyreed26`, EAS projectId in `lmc-app/app.config.js`.
- TypeScript ~5.9.2 (devDependency) - type checking.
- Scripts (`lmc-app/package.json`): `start`, `ios`, `android`, `web`. No `build`, `lint`, or `test` script configured.

## Key Dependencies (installed)

**Maps & location (wired to real APIs):**
- `@rnmapbox/maps` ^10.3.1 - Mapbox native map UI. Access token set in `lmc-app/app/_layout.tsx` via `Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN)`. Map rendered in `lmc-app/app/(seeker)/home.tsx`, `lmc-app/app/(seeker)/waiting.tsx`, and configured as an Expo plugin in `app.config.js` (`RNMapboxMapsDownloadToken` from `MAPBOX_DOWNLOAD_TOKEN`).
- `react-native-maps` 1.20.1 - Installed but not referenced in `app/` code (Mapbox is the active map layer). Candidate for removal.
- `expo-location` ~19.0.8 - Real device GPS + reverse geocoding + IP-fallback ladder. Implemented in `lmc-app/app/state/location.ts`.

**Media (wired):**
- `expo-video` ~3.0.16 - Video playback (`useVideoPlayer` / `VideoView`). Used in `lmc-app/app/(seeker)/venue.tsx`, `app/index.tsx`, `app/how-it-works.tsx`. Registered as an Expo plugin.
- `expo-audio` ~1.1.1 - Audio playback. Used in `lmc-app/app/sound-lab.tsx`.
- `expo-image` ~3.0.11 - Optimized image rendering.

**UI / visual:**
- `@expo/vector-icons` ^15.1.1 - Icon set.
- `expo-linear-gradient` ~15.0.8, `expo-blur` ~15.0.8, `@react-native-masked-view/masked-view` ^0.3.2 - Gradients, blur, masked text effects.
- `react-native-gesture-handler` ~2.28.0, `react-native-screens` ~4.16.0, `react-native-safe-area-context` ~5.6.2 - Navigation/gesture/safe-area primitives.
- `expo-splash-screen` ~31.0.13, `expo-status-bar` ~3.0.9, `expo-linking` ~8.0.12.

**Typography (wired):**
- `expo-font` ~14.0.11 + ~20 `@expo-google-fonts/*` families (Playfair Display, Inter, Cormorant Garamond, Cinzel, Bodoni Moda, Italiana, Tenor Sans, Josefin Sans, Anton, DM Serif Display, and more). Loaded via `useFonts` in `lmc-app/app/_layout.tsx`.

**State / data (no library — hand-rolled):**
- No Redux/Zustand/Jotai. State is local `useState` plus tiny in-memory pub/sub stores in `lmc-app/app/state/` (`location.ts`, `saved.ts`, `intended-role.ts`, `scout-earnings.ts`, `recurring.ts`, `recents.ts`, `payment-method.ts`). Inter-screen data passes via route params (`useLocalSearchParams`).
- Mock domain data: `lmc-app/app/data/markets.ts` (607 lines) plus data embedded directly in screen components.

## Configuration

**Environment:**
- `lmc-app/.env` present (git-ignored; **never read its contents**). Variables referenced by name:
  - `EXPO_PUBLIC_MAPBOX_TOKEN` - public Mapbox token, read at runtime in `app/_layout.tsx`.
  - `MAPBOX_DOWNLOAD_TOKEN` - secret Mapbox SDK download token, read at build time in `app.config.js`.
- App config: `lmc-app/app.config.js` (name "Let Me Check", scheme `lmc`, iOS bundle `Com.BlackMalibuinc.letmecheck`, Android package `com.blackmalibuinc.letmecheck`, iOS Info.plist usage strings for location/camera/mic/photo-library, Expo plugins: `expo-router`, `expo-font`, `expo-video`, `@rnmapbox/maps`).

**Build:**
- `lmc-app/eas.json` - EAS build + submit profiles. iOS submit config references an App Store Connect API key path and Apple Team ID (no secrets stored in repo).
- `lmc-app/tsconfig.json` - extends Expo base, `strict: true`.

## Platform Requirements

**Development:**
- Node.js + npm, Expo CLI / EAS CLI (`>= 7.0.0`), Xcode (iOS) / Android SDK (Android). A development build is required because native modules (`@rnmapbox/maps`) are not in Expo Go.

**Production:**
- iOS via TestFlight / App Store (ascAppId, Apple Team ID in `eas.json`), Android via Google Play. Built and submitted through EAS (`eas build`/`eas submit`, production profile).

---

## Target Stack (Not Yet Built)

Documented and locked in `docs/STACK.md` (2026-04-25) but **NOT present in `package.json` and NOT wired** as of this analysis. These are the next-phase build targets:

| Layer | Planned choice | Status |
|-------|----------------|--------|
| Backend / DB | Supabase (Postgres) + PostGIS + Supabase Auth/Storage/Realtime/Edge Functions | Not installed |
| Camera | `react-native-vision-camera` (60fps, frame processors) | Not installed — filming UI is a simulated viewfinder in `lmc-app/app/(scout)/filming.tsx` |
| Video pipeline | Mux (upload/transcode/HLS CDN) | Not installed — playback today is `expo-video` on local/sample assets |
| Geo (dispatch) | H3 spatial index, Turf.js, PostGIS geofences | Not installed — geofence/dispatch are mock UI |
| Payments | Stripe Payments + Stripe Connect Express + `@stripe/stripe-react-native` (+ Identity/Tax/Radar) | Not installed — payment screens are mock summaries |
| Auth | Sign in with Apple, Google Sign-In, Supabase magic link, Twilio Verify OTP, biometric unlock | Not installed — `auth/` screens are UI-only |
| Push / comms | Expo Push (APNs+FCM), Twilio SMS, Resend email | Not installed |
| Storage (local) | MMKV | Not installed — using in-memory JS stores |
| Animation | Reanimated 3, Lottie, Skia | Not installed |
| Forms | React Hook Form + Zod | Not installed |
| AI / ML | Google Vision / AWS Rekognition (signage detection) | Not installed |
| Quality/ops | Sentry, PostHog, GitHub Actions CI | Not installed |

See `docs/STACK.md` for full rationale, planned third-party accounts, and the verification-stack-to-tech mapping.

---

*Stack analysis: 2026-06-19*
