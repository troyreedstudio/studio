# Pink Pineapple

Premium Bali lifestyle guide and booking app. Curated discovery of clubs, restaurants, beach clubs, and gyms with instant booking. Tells tourists which night to go to which venue, with precision on times and genres. Think Monocle meets Time Out meets a local insider's WhatsApp group.

**Status**: LIVE on App Store + Google Play. Current build 1.2.0+8 (TestFlight). Backend, dashboard, Flutter app all deployed to Hostinger.

---

## Who's Who

- **Troy** — the human you're working with. Co-founder of Pink Pineapple (with Sascha). Based Bali/Singapore. Calls you **Rocky**.
- **Rocky** — you. The Claude Code agent assigned to Pink Pineapple. Troy renamed Claude → Rocky on 2026-04-21. Respond to "Rocky". Don't refer to yourself as "Claude" in conversation with Troy.
- **Sascha** — Troy's partner, co-founder, handles fashion/wellness/e-commerce side. Based Singapore/Bali.
- **Prior agents on this codebase**: Pink (Troy's earlier OpenClaw agent — legacy files at `/Users/troyreed/.openclaw`), Frankie (Sascha's agent — did heavy lifting on audit + rebrand). The "Champ" session (`session-1776772678360`) was the one before this — its work is committed through `6765f62`.

---

## Key Decisions (LOCKED — do not revisit)

1. **Pink Pineapple stays on Flutter.** Never propose a React Native rewrite.
2. **Login-first, not browse-first.** Users sign up / log in before seeing venues.
3. **Outfit font** (not Playfair Display). Venue names: Outfit bold italic.
4. **No emojis on location pills** — "dated and tacky".
5. **Category order**: Nightlife → Beach Clubs → Restaurants → Top Gyms → Events.
6. **No "See All" buttons** — they didn't work and cluttered the UI.
7. **No website links on venue detail.** Instagram shown but not clickable. Keep users in app (monetisation).
8. **"Top Gyms"** not "Fitness".
9. **All nightlife is Canggu** (Sascha confirmed 2026-03-30).
10. **Brand + design system are LOCKED.** `docs/BRAND-GUIDELINES.md` + `docs/DESIGN-SYSTEM.md` are the source of truth. Do not change without Sascha's approval.
11. **Social features (posts/followers/likes/newsfeed) are NOT the product direction.** Being removed/gated.

---

## Tech Stack

### Flutter App (`app/`)
- **Framework**: Flutter/Dart (SDK ^3.9.0), GetX state management
- **Version**: 1.2.0+8
- **App Store ID**: `id6758339469`
- **Key deps**: flutter_screenutil, google_fonts (Outfit), cached_network_image, http, web_socket_channel, shared_preferences, carousel_slider, upgrader, webview_flutter
- **Design size**: 360x640 (ScreenUtilInit)
- **Entry point**: `lib/main.dart` → SplashScreen via GetMaterialApp

### Backend (`backend/`)
- **Framework**: Node.js + Express 4 + TypeScript
- **ORM**: Prisma 6.15 → MongoDB Atlas
- **Auth**: JWT + bcrypt + OTP (nodemailer)
- **Payments**: Stripe v16.8 (installed, NOT wired up)
- **File storage**: Cloudinary, AWS S3, Google Cloud Storage
- **Real-time**: Socket.IO
- **Integrations**: Google Places API (New) for venue search

### Dashboard (`dashboard/`)
- **Framework**: Next.js 16 (App Router, Turbopack)
- **State**: Redux Toolkit + RTK Query
- **UI**: Tailwind 3.4 + shadcn/ui
- **Forms**: React Hook Form + Zod

---

## Live Infrastructure

| Service   | Location |
|-----------|----------|
| Backend   | Hostinger VPS `145.79.6.151`, PM2 managed |
| Dashboard | Same Hostinger VPS, PM2 managed |
| API       | `https://api.pinkpineapple.app/api/v1` |
| WebSocket | `wss://api.pinkpineapple.app` |
| Dashboard | `https://dashboard.pinkpineapple.app` |
| Database  | MongoDB Atlas (via Prisma) |
| Files     | DigitalOcean Spaces + Cloudinary |
| SSH       | `ssh -i ~/.ssh/pink_gitea root@145.79.6.151` |
| Server paths | Backend `/var/www/troyreed1725-backend/` · Dashboard `/var/www/troyreed1725-dashboard/` |
| Node      | v18.17.1 via nvm (PM2 not on root PATH — use `npx pm2`) |
| PM2       | `server` (id 1, port 5020, stable) · `frontend` (id 0, port 3000, flaky — 43+ restarts) |
| Deploy    | SCP-patch changed files + rebuild in place. See **Deployment** section below. |

---

## App Architecture (`app/lib/`)

```
core/
  binding/          GetX dependency injection
  const/            app_colors.dart, image_path.dart (all logos → app_logo_dark.jpg)
  global_widgets/   Reusable UI, country_code_picker.dart (searchable)
  local/            SharedPreferences wrapper
  network_caller/   HTTP client + endpoints.dart
  services/         WebSocketService, venue_tap_tracker, venue_rating_service, venue_vibe_service
  style/            global_text_style.dart (Outfit)

feature/
  auth/             splash → login → sign-up (email/WhatsApp/Instagram/DOB/gender) → OTP → profile setup
  home/             This Week schedule + category sections + Plan My Night + Featured Events
  home_bottom_nav/  3-tab nav: Home, Bookings, Profile
  venue/            venue_controller (curated schedule + tap tracker), venue_detail_screen, venue_booking_webview
  bookings/         V2 timeline itinerary, tonight highlight, 7-day window
  profile_tab/      Edit profile with photo upload, logout → login, country picker
  favorites/        Saved venues — Wishlist UI built (favorite_venues_screen.dart) + heart toggle on venue cards
  chat_tab/         Real-time messaging (WebSocket)
  free_user/ newsfeed/ follow_followers/ saved_posts/ hidden_posts/ — legacy social, being removed
```

---

## Backend Modules (`backend/src/app/modules/`)

**Core**: Auth, User, **Venue** (new full CRUD), Events, Booking, Chat, Notification
**Legacy/social**: Post, Comment, Like, Follow, BlockUser, FavoritePost, SavedPost

### Database (Prisma)

**Core models**: User (roles: ADMIN/CLUB/USER), **Venue** (with `tags String[]` for cross-category, `weeklySchedule`, `bookingUrl`), Events, EventTickets, EventTable, Booking (TABLE/TICKET), Chat, Room, Notification

**Venue categories**: `NIGHT_CLUB`, `BEACH_CLUB`, `RESTAURANT`, `GYM`
**Areas**: Canggu, Seminyak, Uluwatu

### Venue Database (51 venues seeded)

Seed script: `backend/src/scripts/seed-venues.ts`. 32 original + 9 gyms + 10 additional. Every venue has weekly schedule data (day, startTime, endTime, genre, description). Tags system lets venues like Savaya appear in both Beach Clubs AND Nightlife.

---

## Design System (LOCKED)

Source of truth: `docs/DESIGN-SYSTEM.md` + `docs/BRAND-GUIDELINES.md` + `app/lib/core/const/app_colors.dart`.

### Colours
```
Background:         #000000   pure black
Surface:            #1A1A1A   cards, inputs
Surface elevated:   #2A2A2A   modals

Rose-gold gradient: #8B4060 → #C4707E → #E8A0B0   (135°, CTAs/active)
Rose-gold solid:    #C4707E

Text primary:       #FFFFFF
Text secondary:     #B0B0B0
Text muted:         #6B6B6B

Success: #00C853   Ratings: #FFB800   Error: #FF3B3B
```

### Typography
- **Venue names**: Outfit, bold italic, 32–40px
- **Headings**: Outfit, bold
- **Body**: Outfit, regular, 14–16px
- **Labels**: Outfit, 12–14px, UPPERCASE, wide tracking
- **Category format**: `BEACH CLUB · ULUWATU` (centered dot)

### Principles
Dark-first · Photography-forward · Minimal chrome · Location-aware · Bali-native

---

## Curated Content Systems

### This Week schedule (`venue_controller._applyCuratedSchedule()`)
Hardcoded Mon–Sun venue lists with real event names, genres, time ranges:
```
mon: Bella, Luigi's, Mesa, Iron Fairies, ShiShi
tue: Desa Kitsune, Mesa, Miss Fish, Shady Pig
wed: Jade, Da Maria (Hip Hop Night), Savaya, ShiShi
thu: Bella, Luigi's, Motel Mexicola, Desa Kitsune
fri: Savaya, Shady Pig, Miss Fish, Mesa, La Brisa
sat: Savaya, Desa Kitsune, Jenja, Mirror Bali, Vault
sun: Da Maria (Hip Hop Night), Jade, Old Man's, La Brisa, Finns
```

### Curated category order (`home.dart _curatedOrder`)
```
NIGHTLIFE:   Savaya, Desa Kitsune, Shady Pig, Mesa, Miss Fish
BEACH_CLUB:  Finns, El Kabron, Atlas, Desa Kitsune, Potato Head, Ku De Ta
RESTAURANT:  Gimme Shelter, Da Maria, Yuki, Muda/Suka
WELLNESS:    Nirvana, Obsidian, Power & Revive, Body Factory, Bambu Fitness
```

### Plan My Night (`plan_my_night_screen.dart`)
5-vibe itinerary planner:
1. Chill dinner & drinks
2. Dinner & dancing
3. Up late (10pm warm up → 12am main → 2am after hours)
4. Date night
5. Beach club day party

### Live Vibe Check
On venue detail: sliders for crowd / music / energy. Stored locally via `venue_vibe_service`.

### Venue booking WebView
`venue_booking_webview.dart` auto-fills name/email/phone/DOB/gender via JS injection for booketing.com, mtix.me, crowdstack.app. Known URLs hardcoded in `venue_detail_screen._knownBookingUrls` and `_knownDailyBookingUrls` (Mesa has day-of-week routing).

---

## Build & Run

```bash
# Flutter app
cd app && flutter pub get && flutter run

# Backend (dev)
cd backend && npm install && npm run dev

# Backend (production build)
cd backend && npm run build && npm start

# Dashboard
cd dashboard && npm install && npm run dev   # localhost:3000
```

---

## Deployment

Full verified runbook (2026-04-21) → MemPalace wing `pink-pineapple`, room `deployment`. Query it before any deploy for exact commands, preflight checklists, and gotchas. Summary below.

### Critical paths & IDs
- **ASC API key**: `~/.private_keys/AuthKey_XPS8JFNPFY.p8`
- Key ID `XPS8JFNPFY` · Issuer ID `9f7da45d-e6c4-4ecf-8279-1da73f25facc`
- Team ID `YNCLWQN2B8` · Bundle ID `com.pink.pineapple`
- **Export plist**: `app/ios/ExportOptions.plist` (method=`app-store-connect`, destination=`upload`, signingStyle=`automatic`)

### iOS → TestFlight (only tested path)
1. Bump `pubspec.yaml` `version:` + comment log line
2. `flutter clean && flutter pub get && (cd ios && pod install)`
3. `flutter build ios --release --no-codesign`
4. `xcodebuild archive` with the three `-authenticationKey*` flags
5. `xcodebuild -exportArchive` with same auth flags (plist uploads automatically)
6. DO NOT open `ios/Runner.xcworkspace` in Xcode between archive and export

### Backend deploy (SCP-patch, not tar)
The old "download tar from GitHub" line was stale. Actual flow:
1. SCP changed files into `/var/www/troyreed1725-backend/...`
2. On server: `npx prisma generate` (if schema changed) → `npm run build` → `npx pm2 restart server`
3. `npx pm2 logs server --lines 50` to verify

### Dashboard deploy (same SCP pattern)
Same flow on `/var/www/troyreed1725-dashboard/`, end with `npx pm2 restart frontend`. `frontend` process is flaky — watch restart count. If `npm run build` fails, frontend will loop.

### Version bump
- `+N` build bump per TestFlight upload. Marketing `1.2.0` stable until Play Store prod / major drop.
- Update `pubspec.yaml` comment log: `# build N: 1.2.0+N, DATE — summary`.
- No CHANGELOG, no git tags, no GitHub releases — everything manual.

### Known gaps
- **Android keystore missing locally** — cannot sign Play Store builds from this machine. Ask Troy before first Play Store push.
- **No CI/CD, no monitoring, no Sentry, no uptime checks.** SSH in to verify health.
- **Rollback is manual** — snapshot `dist/` before risky deploys (`cp -r dist dist.backup.$(date +%s)`).

---

## Outstanding Work

### High priority
- [ ] End-to-end test of full sign-up flow (email → OTP → profile setup with country/DOB/Instagram/gender) on simulator
- [ ] **OTP sender email** — currently uses Fiverr dev's personal email. Migrate to a Pink Pineapple address.
- [ ] **Credential rotation** — follow `docs/CREDENTIAL-ROTATION.md`. Fiverr team had access to JWT, DB, Stripe, email, Cloudinary, AWS, Firebase.

### Medium
- [ ] **Android keystore recovery** — required for any Play Store deploy from this machine. Keystore + passwords (`keyAlias`, `keyPassword`, `storeFile`, `storePassword`) likely on Fiverr dev's machine / Troy's 1Password / lost
- [x] "My Wishlist" in Profile tab — Wishlist UI built (favorite_venues_screen.dart), heart toggle on venue cards + detail, optimistic updates with rollback. Profile tab → My Wishlist navigates correctly.
- [ ] App Store / Google Play submission QA pass for 1.2.0+8
- [ ] Deploy latest dashboard changes to Hostinger (`bookingUrl` field, commit `be576ad`)

### Lower
- [ ] Proper designed app icon (currently logo resized to square)
- [ ] Real venue photography (Sascha in Bali) — replace stock/placeholders
- [ ] Stripe payments integration (checkout sessions + webhooks)
- [ ] Firebase project for push notifications
- [ ] Remove or gate legacy social features (newsfeed, posts, followers, likes, comments)
- [ ] Basic monitoring — Sentry for backend, uptime check on `api.pinkpineapple.app`
- [ ] Stabilise `frontend` PM2 process (43+ restarts — root cause not diagnosed)

---

## Known Issues & Technical Debt

- **No tests**: backend has no test scripts, no Flutter test files
- **Dummy data still wired in** `fav_saved_hidden_post/controller/post_controller.dart` calls `loadDummyData()` on init (legacy social)
- **Backend quality**: `helpars/` typo folder, `console.log` in production, `feeAmount` stored as String, some `data: any` types
- **Open TODOs**: search/filter API, OTP resend trigger, profile filtering API

---

## Documentation Index (`docs/`)

- `BRAND-GUIDELINES.md` — full brand bible (LOCKED)
- `DESIGN-SYSTEM.md` — colour tokens, typography, component specs (LOCKED)
- `HANDOVER-TERMINAL-A.md` — parallel-terminal session record (2026-04-21)
- `AUDIT-REPORT.md` — security + code quality
- `CREDENTIAL-ROTATION.md` — credential rotation checklist
- `UI-UX-REDESIGN-ROADMAP.md` — redesign plan
- `PROJECT-STATUS.md` — deployment handoff
- `VENUE-BUILD-LOG.md`, `MOBILE-BUILD-LOG*.md`, `CHANGES-LOG.md`, `FIXES-APPLIED.md` — history
- `DASHBOARD-REBRAND-PLAN.md`, `TASK-LIST.md` — working docs

---

## RuFlo / Claude Code Operating Rules

### Behavioural
- Do what has been asked — nothing more, nothing less
- NEVER create files unless absolutely necessary; prefer editing existing files
- NEVER proactively create `*.md` or README files unless requested
- NEVER save working files, tests, or markdown to the root folder (use `/src`, `/tests`, `/docs`, `/config`, `/scripts`)
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or `.env` files
- Run tests after code changes; verify build before committing
- When uncertain, ask — don't assume

### Security
- No hardcoded API keys or credentials in source
- Validate user input at system boundaries
- Sanitise file paths (prevent traversal)
- Run `npx @claude-flow/cli@latest security scan` after security-related changes

### Concurrency
- One message = all related operations. Batch reads/writes/edits/bash calls into a single tool-call block where possible.
- Spawn Agent tool agents in parallel in ONE message, `run_in_background: true`, then STOP and wait — don't poll status.

### Swarm config (when used)
- Topology: hierarchical (anti-drift), max-agents 6–8, strategy specialized, consensus raft
- `npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 8 --strategy specialized`

### MCP / Memory
- Claude Code Agent tool does execution. MCP tools (discover via `ToolSearch`) do coordination: swarm, memory, hooks, routing, hive-mind.
- Auto-memory at `~/.claude/projects/-Users-troyreed-studio/memory/` is the cross-session memory for the studio.
- `memory_store` / `memory_search_unified` → AgentDB with ONNX 384-dim embeddings.

### 3-Tier Model Routing
| Tier | Handler           | Use                                      |
|------|-------------------|------------------------------------------|
| 1    | Agent Booster WASM| Simple transforms (var→const, types) — no LLM |
| 2    | Haiku             | Simple tasks, low complexity             |
| 3    | Sonnet/Opus       | Reasoning, architecture, security        |
