# Pink Pineapple — Shared Project Status
_Last updated: 2026-03-30 by Frankie_

## ⚠️ IMPORTANT: READ THIS FIRST, PINK

**ALL code work is DONE.** Do NOT write any new features, screens, or backend code. Everything below has been built, tested in code, committed to git, and is ready to deploy. Your job is DEPLOYMENT ONLY.

---

## What Frankie Has Already Built (DO NOT REDO)

### Backend (Node.js/Express/Prisma)
- ✅ Security fixes (auth, rate limiting, upload validation, JWT secrets)
- ✅ Code quality cleanup (typos, dead code, debug removal, deduplication)
- ✅ Database indexes and N+1 query fixes
- ✅ Venue API — full CRUD with areas + categories
- ✅ 38 venues seeded across Canggu, Uluwatu, Seminyak
- ✅ Venue favorites API (toggle + list)
- ✅ Booking API
- ✅ Event deletion cascade fix
- ✅ Upload validation (file type whitelist, size limits)

### Dashboard (Next.js)
- ✅ 100% rebranded to PP dark theme with rose-gold accents
- ✅ All auth pages (Login, Register, Forgot Password, Verify OTP, Reset Password)
- ✅ All admin pages (Dashboard, Venues, Events, Bookings, Users, Settings)
- ✅ All venue manager pages (Events, Messages, Availability, Settings)
- ✅ All modals, components, shared UI — zero Fiverr remnants
- ✅ Venue management system (CRUD, detail modal, create modal)
- ✅ Redux RTK Query API layer for venues

### Mobile App (Flutter)
- ✅ 5 main tabs: Discover, Explore, Tonight, Bookings, Profile
- ✅ Venue Detail screen with booking flow
- ✅ Venue Booking screen (date, time, party size, special requests)
- ✅ Venue Favorites with heart icons (optimistic UI)
- ✅ All auth screens: Login, Sign Up, OTP verify, Forgot Password, Reset Password, Set New Password
- ✅ Full PP dark theme throughout (black bg, rose-gold accents, gradient buttons)
- ✅ Bottom navigation with 5 tabs
- ✅ Area filtering (Canggu, Uluwatu, Seminyak)

### Design System
- ✅ Locked in DESIGN-SYSTEM.md
- ✅ Colours: black bg, #1A1A1A surface, rose-gold gradient (#8B4060 → #E8A0B0)
- ✅ Typography: Bodoni Moda (venue names), Montserrat (labels), Inter (body)
- ✅ All components specced

---

## What Pink Needs To Do (DEPLOYMENT ONLY)

### Step 1: Pull the Code
```bash
cd ~/pink-pineapple   # or wherever the repo is cloned
git pull origin main
```
If not cloned yet, clone from the Gitea repo.

### Step 2: Deploy Backend to DigitalOcean
SSH into the DigitalOcean server and:

```bash
# 1. Pull latest code
cd /path/to/pink-pineapple/backend
git pull origin main

# 2. Install dependencies
npm install

# 3. Generate Prisma client (CRITICAL — new models added)
npx prisma generate

# 4. Push database schema changes
npx prisma db push

# 5. Seed the venues (38 venues across 3 areas)
# Check if seed script exists, or the venues may need manual seeding
# Look for: prisma/seed.ts or similar

# 6. Restart the backend
pm2 restart all   # or however the process manager is set up
```

**Environment variables to UPDATE in .env:**
- `JWT_SECRET` → generate a random 64-char string (current value is placeholder)
- `REFRESH_TOKEN_SECRET` → generate a different random 64-char string
- `RESET_PASS_TOKEN` → generate another random 64-char string
- All other .env values should already be set from the existing deployment

### Step 3: Deploy Dashboard to DigitalOcean
```bash
cd /path/to/pink-pineapple/dashboard
git pull origin main
npm install
npm run build
# Restart with pm2 or however it's served
pm2 restart dashboard   # adjust name as needed
```

### Step 4: Build Flutter Mobile App

**Prerequisites — install once:**
```bash
# Install Flutter SDK
git clone https://github.com/flutter/flutter.git -b stable ~/flutter
export PATH="$PATH:$HOME/flutter/bin"
flutter doctor   # check what else is needed
```

**For Android (APK):**
```bash
cd /path/to/pink-pineapple/mobile
flutter pub get
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

**For iOS (requires Mac + Xcode):**
```bash
cd /path/to/pink-pineapple/mobile
flutter pub get
flutter build ios --release
# Then open in Xcode to archive and upload to App Store Connect
```

### Step 5: App Store / Google Play Upload
- **Google Play:** Upload the APK/AAB via Google Play Console
- **Apple App Store:** Archive from Xcode → upload via App Store Connect
- Update screenshots, description, and branding to match new PP design
- App Store ID: `id6758339469`

---

## What Still Needs Humans (Troy + Sascha)

1. **📸 Venue photos** — need real photos for all 38 venues (Sascha sourcing)
2. **🔑 Credential rotation** — MongoDB password, Stripe key, DigitalOcean Spaces key, Cloudinary key, Gmail app password (see TASK-LIST.md for full list)
3. **🔑 DigitalOcean SSH access** — Pink needs this to deploy
4. **🔑 App Store / Google Play accounts** — Pink needs these to upload builds
5. **🔑 Firebase project** — create new Firebase project for push notifications

---

## Architecture Reference

- **API:** `https://api.pinkpineapple.app/api/v1`
- **Dashboard:** `https://dashboard.pinkpineapple.app`
- **Database:** MongoDB (connection string in backend .env)
- **File storage:** DigitalOcean Spaces + Cloudinary
- **Mobile:** Flutter (Dart)
- **Backend:** Node.js + Express + Prisma
- **Dashboard:** Next.js + Redux RTK Query + Tailwind

---

## DO NOT

- ❌ Do NOT rewrite any screens or features — they are all done
- ❌ Do NOT change the design system — it's locked
- ❌ Do NOT rebrand anything — dashboard and mobile are 100% PP themed
- ❌ Do NOT create new API endpoints — all needed endpoints exist
- ❌ Do NOT modify the database schema — indexes and models are set

**If something seems missing or broken, check with Frankie first before making changes.**
