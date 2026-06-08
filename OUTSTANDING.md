# Studio — Outstanding Tasks

Living list of outstanding work across all studio projects. Pulled from each project's skill `CLAUDE.md` and current phase notes. Update this file when tasks are completed or new ones appear.

Last updated: 2026-06-09

---

## Let Me Check (LMC)

Phase: MVP/prototype complete — fully functional UI with mock data. Ready for backend.

- [ ] Backend integration: auth (sign-up/login), Stripe payments, real-time notifications, camera capture, geolocation
- [ ] Build out Scout onboarding and verification flow
- [ ] Beta launch in one target city
- [ ] Add test / lint / build scripts to `lmc-app/` (none configured yet)
- [ ] **Privacy / Rules / Acceptable-Use policy** — must be presented and accepted at sign-up (added 2026-05-06):
  - No filming of people's personal image (no faces / individuals)
  - No filming in court rooms
  - No filming someone's home
  - No sharing of LMC imagery to social media (Instagram, TikTok, etc.)
  - Imagery is for personal recommendation and use only — not redistribution
  - Build out the full Rules + Privacy + Regulations section on top of these
  - Wire to sign-up acceptance flow (checkbox + ToS/Privacy link)
- [ ] **Mapbox setup for live Scout tracking map** (added 2026-05-08) — currently using Apple Maps with `mutedStandard` style on the Waiting screen; switching to Mapbox gives the Uber/Grab-style premium dark map look:
  - Sign up at https://account.mapbox.com/auth/signup/ (suggested email: blackmalibuinc@gmail.com)
  - Pick username (suggestion: `lmcapp` or `letmecheck`)
  - Generate password via iCloud Keychain or 1Password
  - Verify email
  - Get Default public token from Account → Tokens (starts with `pk.eyJ1...`)
  - Install: `npx expo install @rnmapbox/maps -- --legacy-peer-deps`
  - Add token to `lmc-app/.env` as `EXPO_PUBLIC_MAPBOX_TOKEN=pk.xxxx`
  - Reference via `app.json` extra config or expo-constants
  - Update `app/(seeker)/waiting.tsx` MapView → Mapbox with dark style sheet `mapbox://styles/mapbox/dark-v11`
  - Replace mock setInterval Scout movement with WebSocket push from backend when ready
- [ ] **AI / ML backend layer** (phased per CTO review 2026-05-08) — split into three tiers based on cost/value/build effort:

  **Tier A — Trust & Moat (ship with Pilot, Miami launch)**
  The 6-layer verification stack. Without these, a Scout can fake a clip and the marketplace collapses. This IS the moat — non-negotiable for v1.
  - **30-50m GPS geofence around each venue** — server-side polygon per venue; only Scouts physically inside the fence are eligible to receive the ping. No AI, pure PostGIS.
  - **Geofenced Scout dispatch** — only Scouts inside the fence get pinged when a Seeker requests. Logged and time-stamped.
  - **Reference photo confirmation** — Scout sees a recent reference photo of the venue exterior/sign before filming, taps "Confirm I see this." Catches "wrong place" before the clip is captured.
  - **GPS-stamped clip on submission** — capture coords baked into clip metadata. Server auto-rejects any clip whose GPS falls outside the fence at submission time.
  - **AI signage / venue verification on submitted clips** — Google Vision API (~$1/mo at pilot scale, 1 day build); auto-validate the Scout filmed the right place (logo/sign detection + GPS cross-check). Last line of defence.
  - **20-minute Scout cooldown per venue** — same Scout can't film the same venue twice in 20 min. Redis TTL gate. Prevents same-clip resubmission farming.

  **Tier B — Premium polish (ship with v1 alongside Tier A — cheap and fast)**
  Each is under $10/mo to run at pilot scale; total build effort ~8-10 days. Ship together to make the product feel premium from day 1.
  - **Real speech-to-text** — replace voice search mock (`VOICE_MOCKS` in `app/(seeker)/search.tsx`) with @react-native-voice/voice or expo-speech-recognition; OpenAI Whisper backend (~$3/mo, 1-2 days)
  - **Natural-language query parsing** — Claude Haiku parses "busiest gym in Miami" into structured search params (~$1/mo, 1 day). Powers SMART_CHIPS_BY_KEYWORD + conversational placeholders.
  - **Google Places Autocomplete API** — replace `ALL_PLACES` mock with live Google Places (~$3/mo, half day)
  - **AI clip auto-summary** — Claude with frames generates "Short line · ~30 inside · medium energy" verdict (~$5/mo, 2-3 days). Currently hardcoded on `app/(seeker)/delivery.tsx`.
  - **Real-time activity feed** — Supabase realtime (free, 1 day); replace `LIVE_FEED` static array with live stream of recently-completed checks
  - **Voice agent (out-loud confirmation)** — OpenAI TTS (<$5/mo, 2 days); "Sending a Scout to Komodo for $15 in 8 min — confirm?"
  - **Smart push notifications (rules-based)** — Expo Push (free, 1 day); geofenced + time-aware triggers via simple rules (defer ML-driven version to v2)

  **Tier C — Defer to v2 (after PMF proven)**
  Either expensive, build-heavy, or requires real user data we don't have yet.
  - **Crowd-density estimation from video** — off-the-shelf models give bad answers; custom ML training is weeks of work + ongoing cost ($25-50/mo Rekognition or custom). Wait until we have real clips to train on.
  - **Personalized "For You" feed** — needs user check history + behavioural data we don't have yet. Defer until post-pilot.
  - **ML-driven smart push** — upgrade rules-based version to ML triggering once we have engagement data.
  - **Reinforcement learning loop** — feed Seeker ratings back into Scout/venue ranking model. v3 problem; don't design for it yet.

- [ ] **Predictive AI / analytics roadmap** (locked 2026-06-07) — Phase 2+ commitment to make LMC a learning marketplace, not just a relay. **Critical Phase 1 dependency: build the event-collection pipeline from day 1 of backend**, otherwise we can't train any of this later.
  - **Phase 1 mandate (non-negotiable)**: every action logged immutably with timestamp + geo + context — request created, Scout accepted, clip delivered, cancel, rating, GPS ping, payment event. Postgres + Timescale extension (lean) OR BigQuery (heavyweight). Decide before any schemas are drawn.
  - **Phase 2 — Dispatch + demand intelligence**: demand prediction (when/where check requests will spike — nightlife Fri/Sat, DMV Mon mornings, stadium events). Scout positioning model ("be near LIV at 11pm Friday"). Venue intelligence (predict line lengths from historical clips + weather + events). Dynamic Priority-tier pricing during high-demand windows.
  - **Phase 2.5 — Trust + quality**: fraud detection (recycled clips, GPS spoofing, signage mismatches, scout submission velocity anomalies). Quality prediction (route to high-rated Scouts). Churn prediction (identify disengaging Seekers/Scouts; targeted retention nudges).
  - **Phase 3 — Recommendation + personalization**: proactive scheduling ("You usually check Brickell DMV Mondays at 8am — schedule it?"). Behavioural clustering (learn what each Seeker prioritizes). City expansion intelligence (predict which markets are ready).
  - **Estimated cost footprint**: Phase 2 data infra ~$2-5K/mo year 1; ML compute ~$1-3K/mo at launch scale; 1-2 ML engineers at $150-200K/year each. Build models with XGBoost + lightweight gradient boost + CNN — well-understood ML, no novel research required.
  - **Do not**: build any predictive AI in Phase 1. Ship basic product, collect data, layer AI on top in 6-9 months once data is flowing.

Code: `projects/let-me-check/lmc-app/` · Docs: `projects/let-me-check/docs/` · Kickoff brief: `projects/let-me-check/docs/BACKEND-KICKOFF.md`

---

## Pink Pineapple

Phase: LIVE on App Store + Google Play. Backend, dashboard, Flutter app deployed. 38 venues seeded.

- [ ] Source real venue photography for all 38 venues (Sascha in Bali)
- [ ] Rotate all credentials flagged in `projects/pink-pineapple/docs/AUDIT-REPORT.md` (critical)
- [ ] **Firebase / push notifications** — unblock Part B (added 2026-05-31). Backend + dashboard plumbing already shipped (commit `1b779e2`); Flutter SDK + token capture is on hold until these files land.

  **Troy steps (~30 min, do these first):**
  - [ ] Create Firebase project at https://console.firebase.google.com (name: "Pink Pineapple", location: asia-southeast1 / Singapore)
  - [ ] Add iOS app to the project — bundle ID `com.pink.pineapple`, App Store ID `6758339469`
  - [ ] Upload APNs Authentication Key from Apple Developer → Keys (or generate a new one if none exists) into Firebase → Project Settings → Cloud Messaging → APNs Keys
  - [ ] Download `GoogleService-Info.plist` from the iOS app config page
  - [ ] Add Android app to the project — package name `com.pink.pineapple`, SHA-1 fingerprint from `upload-keystore.jks` (Rocky can extract: `keytool -list -v -keystore app/android/app/upload-keystore.jks -alias upload`)
  - [ ] Download `google-services.json` from the Android app config page
  - [ ] Project Settings → Service Accounts → Generate new private key → download the JSON (this is the backend credential)
  - [ ] Hand all 3 files to Rocky (or drop them in a known folder and tell Rocky the path)

  **Rocky steps (~half day, after files arrive):**
  - [ ] Drop `GoogleService-Info.plist` into `app/ios/Runner/` + `google-services.json` into `app/android/app/`
  - [ ] Add backend env vars: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` from the service-account JSON (already wired through `firebaseAdmin.ts`)
  - [ ] Add `firebase_core` + `firebase_messaging` to `app/pubspec.yaml` (on a `feature/push-notifications` branch)
  - [ ] Wire FCM token capture: on app start + onTokenRefresh → POST to `/users/fcm-token`
  - [ ] Foreground notification handler → in-app snackbar
  - [ ] Background tap handler → deep-link to the right venue/event
  - [ ] Bump pubspec to `1.3.1+24`, build → archive → TestFlight upload, test end-to-end with a real broadcast from the dashboard
  - [ ] Once verified on TestFlight, submit `1.3.1` to App Store review
- [ ] Integrate Stripe for payments in the backend
- [ ] User acquisition and growth in the Bali market
- [ ] Iterate on the live product based on user feedback
- [ ] (Future) Rebuild Flutter app in React Native + Expo — browse-first, no social features

Live infra: `api.pinkpineapple.app` · `dashboard.pinkpineapple.app` · MongoDB on DigitalOcean

---

## Agape 26

Phase: Brand development — logo concept locked, content calendar written, Instagram live, avatar 26 on HeyGen.

- [ ] Vector logo production from a graphic designer (99designs / Fiverr Pro) — SVG/AI, PNG transparent, embroidery-ready
- [ ] Manufacturing sourcing trip to China or Vietnam (dates TBD)
- [ ] Shopify store setup
- [ ] Coming soon page on `agape26.com`
- [ ] Grab TikTok handle
- [ ] Execute Month 1 content calendar (16 posts, 4–5x/week)
- [ ] Rocco avatar voice cloning on HeyGen (group_id `48304a8a760048418b3ef40705950702`)
- [ ] Ambassador program — 20 scripts written, need remaining scripts + video production for Global Citizens rollout

Assets: `projects/agape/assets/` · Ambassadors: `projects/agape/ambassadors/`

---

## Ideas / Peptide Talk Show

Phase: Incubating — story bible, episode map, character catalog, Week 1 scripts exist. No hard deliverables committed.

- [ ] Decide whether to promote Peptide Talk Show out of `ideas/` into its own project
- [ ] If promoted: production pipeline (voice, animation, distribution)

---

## Studio-wide

- [ ] Review uncommitted LFS-tracked media changes in `projects/agape/assets/`, `projects/pink-pineapple/assets/`, `projects/let-me-check/` (see `git status`) — decide what to commit
- [ ] `.env.example` has uncommitted edits — decide final form and commit

---

## How this file is maintained

- Source of truth for the outstanding task list across the studio.
- Referenced from `~/.claude/projects/-Users-troyreed-studio/memory/` so future Claude Code sessions (terminal or Telegram) can find it.
- When a task ships, check it off or delete the line. When new work appears, add it under the right project.
