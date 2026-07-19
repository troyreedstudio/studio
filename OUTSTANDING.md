# Studio — Outstanding Tasks

Living list of outstanding work across all studio projects. Pulled from each project's skill `CLAUDE.md` and current phase notes. Update this file when tasks are completed or new ones appear.

Last updated: 2026-07-19

---

## Let Me Check (LMC)

Phase: **Backend LIVE, app on TestFlight (build #29), pre-launch.** Supabase backend live; Apple + Google + Phone sign-in all wired; Stripe Connect (test mode), Mux video, and verification edge functions (verify-clip, signage-check, face-blur-check, fraud-eval) deployed; camera capture + face-blur working; letmecheckapp.com website + privacy/terms live; hello@ business email live. Remaining work is launch switches + store submissions + Miami beta ops, not core building.

### 🟡 In flight (waiting on external clocks — no action needed)
- [ ] **A2P 10DLC approval** — unlocks phone-SMS login delivery. Brand SUBMITTED + under review; Campaign pending Brand approval (Trust Hub → A2P Campaign, use case 2FA). Twilio + Supabase already wired (build #29).
- [ ] **Website HTTPS cert** — auto-provisioning on GitHub Pages; enable `https_enforced` once ready.

### 🔴 Go-live switches (flip at launch)
- [ ] **Stripe test → LIVE keys** — activate live Stripe (dashboard) + swap backend test→live keys. App stays on test keys until launch.
- [ ] **Upgrade Supabase to Pro (~$25/mo)** — removes free-tier 7-day auto-pause permanently (the GitHub Actions keepalive is the free stopgap; delete it after upgrade).

### 📱 Store submissions
- [ ] **Apple App Store** — submit for review (privacy URL now available: letmecheckapp.com/privacy.html; needs store screenshots + review).
- [ ] **Google Play** — Android build + submit (~$25 one-time console fee, deferred to Android launch).

### 🛡️ Product — confirm end-to-end
- [ ] **Verification stack end-to-end** — backend functions deployed (GPS geofence, signage AI, face-blur, fraud, GPS-stamp reject, 20-min cooldown). Confirm all six wired + fire on real checks, incl. reference-photo confirm before filming.
- [ ] **Sign-up rules / consent screen** — present + accept at sign-up: no filming faces/individuals, court rooms, someone's home; no reposting LMC imagery to social; personal use only. Checkbox + ToS/Privacy links (now live at letmecheckapp.com).

### ✨ Polish (not blockers)
- [ ] **Globe "feel"** — where it lands when you tap into a location, more 3D depth (parked).
- [ ] **Official 4-colour Google "G"** on the sign-in button (needs `react-native-svg` at a rebuild).
- [ ] **Custom branded Mapbox style** — build a bespoke style in Mapbox Studio vs the stock dark-v11.
- [ ] Add test / lint / build scripts to `lmc-app/` (dev hygiene).

### 🏙️ Beta ops (Troy + Sascha)
- [ ] Recruit the **Miami beta**: ~50 Scouts, ~20 venues, target 500 paid checks in 90 days.

### ✅ Done (was outstanding — don't re-add)
- US LLC + EIN obtained · Backend live (Supabase, RLS, state machine, event log) · Apple + Google + Phone auth wired · Stripe Connect (test) · **Mux upgraded to pay-as-you-go (card added — fixed blur/render + timeout issues)** · on-device camera + face-blur working · Mapbox globe (home + waiting) · real voice search · letmecheckapp.com site + privacy + terms · hello@ business email + aliases + Gmail forwarding · delivery screen white rebrand · Supabase keepalive (free-tier pause fix) · SecureStore chunked session fix (Apple/Google sign-in).

### Reference — AI / predictive roadmap (Phase 2+, locked 2026-06-07; not for v1)
Tier A moat = the 6-layer verification stack above (ship with pilot). Tier B premium polish (NL query parsing, Places API, AI clip summary, live activity feed, voice confirm, smart push) — layer in cheaply post-launch. Tier C + predictive analytics (demand prediction, Scout positioning, fraud ML, personalization) deferred to Phase 2+ once real data flows. **Phase 1 mandate already met: immutable event log built day one.** Full detail in `docs/BACKEND-KICKOFF.md` + `docs/BUILD-PLAN.md`.

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
