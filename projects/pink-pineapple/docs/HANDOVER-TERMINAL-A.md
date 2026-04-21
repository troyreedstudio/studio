# Handover: Terminal A (Claude Session)

**Date**: 21 April 2026
**Purpose**: Record of all work done in this terminal session so Troy can merge context from both terminals into one clean session.

---

## What This Session Was About

This was the **main Pink Pineapple rebuild session**. We took the app from the messy Fiverr handoff state and rebuilt it into a proper product — focused on the core value proposition: **telling tourists which night to go to which venue in Bali, with precision on times and genres.**

---

## Major Work Completed

### 1. Home Screen Rebuild
- Removed the old generic home screen (search bar, random venue cards)
- Built a new structure: **This Week schedule** at the top (horizontal day cards), then category sections below
- Day cards show venue name, special night name, genre, and time range (e.g. "9PM – 2AM")
- Category order locked: Nightlife, Beach Clubs, Restaurants, Top Gyms, Events
- Area filter pills: All Bali, Canggu, Seminyak, Uluwatu (no emojis, no Kuta)
- Logo centered at top, 100px height
- Removed: search icon, notification bell, "What's Your Vibe?", "Tonight's Events", all "See All" buttons

### 2. Curated Weekly Schedule System
- Built the core differentiating feature: a hardcoded curated schedule that controls which venues appear on which day and in what order
- `_applyCuratedSchedule()` in venue_controller.dart
- Monday: Bella, Luigi's, Mesa, Iron Fairies, ShiShi
- Tuesday: Desa Kitsune, Mesa, Miss Fish, Shady Pig
- Wednesday: Jade, Da Maria, Savaya, ShiShi
- Thursday: Bella, Luigi's, Motel Mexicola, Desa Kitsune
- Friday: Savaya, Shady Pig, Miss Fish, Mesa, La Brisa
- Saturday: Savaya, Desa Kitsune, Jenja, Mirror Bali, Vault
- Sunday: Da Maria, Jade, Old Man's, La Brisa, Finns Beach Club
- Each day shows the real event names, genres, and time ranges from venue data

### 3. 51 Venues Seeded
- Backend seed script (`backend/src/scripts/seed-venues.ts`) with 51 real Bali venues
- 32 original + 9 gyms + 10 additional nightlife/restaurants
- Every venue has real weekly schedule data (day, startTime, endTime, genre, description)
- Areas: Canggu, Seminyak, Uluwatu
- Categories: NIGHT_CLUB, BEACH_CLUB, RESTAURANT, GYM

### 4. Tags System for Cross-Category Venues
- Added `tags String[]` field to Venue model in Prisma schema
- Venues like Savaya can appear in both Beach Clubs AND Nightlife
- Backend filters use Prisma `hasSome` for tag-based queries
- Solves the "Savaya is a beach club AND a nightclub" problem

### 5. Venue Detail Screen
- Hero image, venue name in Outfit bold italic, category/area label
- Status indicator, star rating, editorial description
- "Best Nights to Visit" section showing weekly schedule
- Instagram handle shown (non-clickable — keeps users in app)
- Website link deliberately REMOVED (monetisation strategy — don't send users away)
- Separate `isDetailLoading` flag to fix the bug where venue detail showed "not found"

### 6. VenueTapTracker for Popularity Ranking
- Tracks which venues users tap most
- Used as secondary ranking after curated schedule
- Stored locally on device

### 7. Auth Flow Overhaul
- **Login-first**: Users must sign up/log in before browsing venues (Troy's explicit decision)
- Splash screen: just logo + "KNOW BALI LIKE A LOCAL" tagline
- Login page: fixed overflow crash (Spacer inside SingleChildScrollView)
- Sign-up page redesigned with: email, WhatsApp (searchable country picker), Instagram, DOB (3 dropdown selectors), Gender dropdown, Password
- OTP verification → now correctly goes to Profile Setup (was wrongly going back to Login)
- Branded OTP email template (dark theme, rose-gold accents, Pink Pineapple branding)

### 8. Profile Tab
- Removed Posts/Followers/Following counts
- Removed profile privacy toggle
- Added searchable country code picker (full-screen modal with search)
- Edit Profile navigates to ProfileEditScreen
- Logout goes to LoginPage (was going to old FreeUserHomePage)
- Favourites link goes to FavoriteEventScreen

### 9. Bottom Navigation
- Simplified to 3 tabs: Home (house), Bookings (ticket), Profile (person)
- Removed Tonight and Explore tabs

### 10. Branding
- All fonts changed to Outfit (was incorrectly Playfair Display)
- Venue names: Outfit bold italic
- Dark-first black (#000000) background throughout
- Rose-gold gradient (#8B4060 → #E8A0B0) for accents
- Logo: `app_logo_dark.jpg` used everywhere (image_path.dart consolidated)

### 11. Backend & Deployment
- Backend runs on Hostinger VPS at 145.79.6.151 (not DigitalOcean)
- SSH access via `pink_gitea` key
- PM2 manages backend + dashboard processes
- Deployment: download tar from GitHub → extract → copy → npm install → prisma generate → tsc → pm2 restart
- Cleaned 16 junk test events left by Fiverr team
- Built full Venue CRUD module (service, controller, routes, validation)
- Public browse routes (no auth required), protected CRUD routes

### 12. Bookings Page
- V2 timeline itinerary layout
- Date-grouped, tonight highlight, 7-day window
- Empty day prompts, collapsible past section

---

## Key Bug Fixes

| Bug | Cause | Fix |
|-----|-------|-----|
| Login page black screen | Spacer in SingleChildScrollView = infinite layout | Replaced with SizedBox(height: 32.h) |
| Venue detail "not found" | Shared isLoading between list and detail | Added separate isDetailLoading flag |
| What's-on data missing | API returned `event` key, code expected `tonight` | Fixed key mapping in controller |
| Day card text repetition | "Bella Monday" showed venue+day twice | Built _getSpecialNightName stripping logic |
| Category sections empty | Default fetch limit=10, gyms weren't in first 10 | Set limit=100 |
| OTP flow wrong destination | After sign-up OTP → LoginPage | Changed to → SignUpProfileSetUp |
| Logout wrong destination | Went to FreeUserHomePage (old Fiverr page) | Changed to → LoginPage |
| Backend 167K restarts | EADDRINUSE on port 5020 | Killed orphan process |

---

## Troy's Key Decisions (Documented for Continuity)

These are explicit decisions Troy made during this session. Don't revisit or question these:

1. **Login-first, not browse-first** — users sign up before seeing venues
2. **Outfit font, not Playfair Display** — matches the wireframe
3. **No emojis on location pills** — "dated and tacky"
4. **Category order**: Nightlife → Beach Clubs → Restaurants → Top Gyms → Events
5. **No "See All" buttons** — they didn't work and cluttered the UI
6. **No website links on venue detail** — monetisation strategy, keep users in app
7. **Instagram shown but not clickable** — same reason
8. **Desa Kitsune, not Desa Potato Head** — Troy corrected the venue name
9. **"Top Gyms" not "Fitness"** — Troy's preferred label
10. **Logo centered and large** — "cannot read pineapple, far too small" was the feedback
11. **Pink Pineapple stays on Flutter** — never propose a React Native rewrite

---

## Outstanding / Not Yet Done

### High Priority
- [ ] **End-to-end test of full sign-up flow** — sign up → OTP → profile setup (with country/city/DOB/Instagram/gender) — needs testing on simulator
- [ ] **OTP sender email** — currently sends from Fiverr dev's personal email, needs changing to a Pink Pineapple email address
- [ ] **Credential rotation** — follow `docs/CREDENTIAL-ROTATION.md` checklist, many services still use Fiverr dev's credentials

### Medium Priority
- [ ] **"My Wishlist" in Profile tab** — saved/favourited venues section, backend endpoint exists but UI not built
- [ ] **App Store / Google Play submission** — build is at 1.2.0+8 but needs final QA pass before submitting
- [ ] **Deploy latest dashboard changes** — dashboard on Hostinger may be behind latest commits

### Lower Priority
- [ ] **App icon** — currently using logo resized to square, may need a properly designed version
- [ ] **Real venue photography** — replace stock/placeholder images with real photos
- [ ] **Stripe payments integration** — checkout sessions + webhooks (code structure exists but not wired up)

---

## Key Files Modified in This Session

### Flutter App (most important)
- `app/lib/feature/home/ui/home.dart` — complete home screen rebuild
- `app/lib/feature/venue/controller/venue_controller.dart` — curated schedule, tap tracker, fetch logic
- `app/lib/feature/venue/model/venue_model.dart` — model with tags, weeklySchedule
- `app/lib/feature/venue/ui/venue_detail_screen.dart` — venue detail page
- `app/lib/feature/home_bottom_nav/ui/home_bottom_nav.dart` — 3-tab nav
- `app/lib/feature/auth/ui/0.splash_ui.dart` — splash screen
- `app/lib/feature/auth/ui/1.login_ui.dart` — login page (overflow fix)
- `app/lib/feature/auth/ui/2.sign_up_ui.dart` — redesigned sign-up
- `app/lib/feature/auth/controller/0.splash_screen_controller.dart` — login-first flow
- `app/lib/feature/auth/controller/4.otp_controller.dart` — OTP → profile setup
- `app/lib/feature/profile_tab/controller/profile_tab_controller.dart` — logout + menu fixes
- `app/lib/core/const/image_path.dart` — all logos point to app_logo_dark.jpg
- `app/lib/core/const/app_colors.dart` — brand colours
- `app/lib/core/global_widgets/country_code_picker.dart` — searchable picker

### Backend
- `backend/prisma/schema.prisma` — Venue model with tags, weeklySchedule, User with new fields
- `backend/src/app/modules/Venue/` — full CRUD module (new)
- `backend/src/scripts/seed-venues.ts` — 51 venues with real data
- `backend/src/shared/emaiHTMLtext.ts` — branded email templates
- `backend/src/app/modules/User/user.services.ts` — profile update with DOB normalisation

### Build
- Current version: **1.2.0+8**
- pubspec.yaml updated with webview_flutter dependency

---

## Infrastructure

- **Backend**: Hostinger VPS, 145.79.6.151, SSH key `pink_gitea`
- **Database**: MongoDB (connection string in .env on server)
- **Dashboard**: Next.js on same Hostinger VPS, PM2 managed
- **App**: Flutter, tested on iOS Simulator, builds uploaded to TestFlight
- **Git**: GitHub repo, main branch

---

*This handover was written by Terminal A (Claude session) on 21 April 2026 so Troy can consolidate both terminal sessions into one clean starting point.*
