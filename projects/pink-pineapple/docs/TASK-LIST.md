# 🍍 Pink Pineapple — Task List

**Created:** 2026-03-29
**Status:** In Progress

## Legend
- ✅ Done (Frankie fixed)
- 🔧 In Progress
- ⏳ Queued (Frankie will fix)
- 🔑 Requires Sascha/Troy (credentials, accounts, external access)
- 🏗️ Fiverr Team (needs app rebuild/deploy)

---

## Phase 1: 🔴 CRITICAL SECURITY (Do First)

### 1.1 — Credential Rotation 🔑
**Owner:** Sascha/Troy
**Why:** All secrets are exposed in the repo. Anyone with access can read your database, use your Stripe, delete your files.

| Credential | Action Needed |
|-----------|---------------|
| MongoDB password (`troyreed1725`) | Change password in MongoDB Atlas, update .env |
| Stripe test key (`sk_test_51NHR4g...`) | Rotate in Stripe Dashboard |
| DigitalOcean Spaces key | Rotate in DO console |
| Cloudinary API key/secret | Rotate in Cloudinary console |
| Gmail app password (`yfma zchm woks cebv`) | Generate new app password in Google |
| JWT secret (`"YOUR SECRET"`) | Replace with random 64-char string |
| Refresh token secret (`"YOUR SECRET"`) | Replace with different random 64-char string |

### 1.2 — Remove .env from Git History 🔑
**Owner:** Troy (needs repo access)
**Action:** Run BFG Repo Cleaner to purge .env from all commits

### 1.3 — Add .env to .gitignore ⏳
**Owner:** Frankie
**Files:** `backend/.gitignore`, `dashboard/.gitignore`

### 1.4 — Remove Hardcoded Firebase Key ⏳
**Owner:** Frankie
**File:** `backend/src/app/modules/Notification/firebaseService.ts`
**Action:** Replace hardcoded "mawaddah-match" service account with environment variable

### 1.5 — Set Proper JWT Secrets ⏳
**Owner:** Frankie
**File:** `backend/src/config/index.ts`
**Action:** Generate cryptographically random secrets, ensure env vars are used

### 1.6 — Add Dashboard Route Protection ⏳
**Owner:** Frankie
**Files:** `dashboard/src/middleware.ts` (new), `dashboard/src/app/(defaultLayout)/layout.tsx`
**Action:** Add Next.js middleware to redirect unauthenticated users

### 1.7 — Fix Authorization on Endpoints ⏳
**Owner:** Frankie
**Files:** Multiple backend service files
**Actions:**
- Post deletion: add ownership check
- Booking update: add ownership check + validation
- User update: add role check
- Password reset: add rate limiting

### 1.8 — Rate Limit OTP Endpoints ⏳
**Owner:** Frankie
**Files:** `backend/src/app/routes/auth.routes.ts`, new rate limit middleware
**Action:** Max 5 OTP attempts per email per hour, max 3 resends per hour

---

## Phase 2: 🟡 CODE QUALITY (Clean Up)

### 2.1 — Fix All Typos ⏳
**Owner:** Frankie
| Current | Correct | Location |
|---------|---------|----------|
| `helpars/` | `helpers/` | Backend folder |
| `follwing_followers/` | `following_followers/` | Mobile folder |
| `events.spi.ts` | `events.api.ts` | Dashboard |
| `VeifyOtpForm.tsx` | `VerifyOtpForm.tsx` | Dashboard |
| `varifyToken` | `verifyToken` | Dashboard function |
| `user.costant.ts` | `user.constant.ts` | Backend |

### 2.2 — Remove Debug Code ⏳
**Owner:** Frankie
**Actions:**
- Remove all `console.log` with emojis from backend
- Remove all `print()` debug statements from mobile
- Remove hardcoded JWT tokens from `network_config.dart`
- Remove `chat_integration_example.dart`
- Remove `user_profile_backup.dart`
- Remove `event_details_model_saon.dart` (merge into main model)

### 2.3 — Clean Dead Code ⏳
**Owner:** Frankie
**Actions:**
- Remove commented-out functions in `Events.service.ts`
- Remove commented-out notification calls in `Follow.service.ts`
- Remove commented-out code in `post.services.ts`
- Remove unused `CloudFormation` import in `post.services.ts`
- Remove duplicate `cn` utility (keep `src/lib/utils.ts`)

### 2.4 — Fix Package Metadata ⏳
**Owner:** Frankie
| File | Current | Should Be |
|------|---------|-----------|
| Dashboard `package.json` | `my-nextjs-redux-startar-pack` | `pink-pineapple-dashboard` |
| Dashboard `layout.tsx` | "Insightify" | "Pink Pineapple Admin" |
| Mobile `pubspec.yaml` version comment | Inconsistent | Clean up |

### 2.5 — Deduplicate Backend Code ⏳
**Owner:** Frankie
**File:** `backend/src/app/modules/Events/Events.service.ts`
**Action:** Extract the 60-line select block into a shared constant, use across all methods

### 2.6 — Standardise File Naming ⏳
**Owner:** Frankie
**Action:** Consistent naming convention across backend services (pick singular `.service.ts`)

---

## Phase 3: 🟡 DATABASE & PERFORMANCE

### 3.1 — Add Prisma Indexes ⏳
**Owner:** Frankie
**File:** `backend/prisma/schema.prisma`
**Indexes needed:**
- `Like: @@unique([userId, postId])`
- `Follower: @@unique([followerId, followingId])`
- `Room: @@unique([senderId, receiverId])` or compound index
- `ClubFavorite: @@unique([clubId, userId])`
- `EventFavorite: @@unique([eventId, userId])`
- `Event: @@index([date])` for tonight queries
- `Booking: @@index([userId])`

### 3.2 — Fix N+1 Queries ⏳
**Owner:** Frankie
**Files:**
- `auth.service.ts` `getMyProfile` — use Prisma `_count` in single query
- `user.services.ts` `getUsersFromDb` — combine into single query with include

### 3.3 — Fix "Tonight Events" Timezone ⏳
**Owner:** Frankie
**File:** `backend/src/app/modules/Events/Events.service.ts`
**Action:** Accept timezone param from client, calculate tonight range accordingly

### 3.4 — Fix Event Deletion Cascade ⏳
**Owner:** Frankie
**File:** `backend/src/app/modules/Events/Events.service.ts`
**Action:** Delete related EventTickets, EventTable, Charges, Bookings when event is deleted

### 3.5 — Add Upload Validation ⏳
**Owner:** Frankie
**File:** `backend/src/app/middlewares/fileUploader.ts`
**Action:** Add file type whitelist (images/videos only), max file size (10MB images, 100MB videos), reduce max files from 500 to reasonable limit

---

## Phase 4: 🏗️ MOBILE APP FIXES

### 4.1 — Secure Token Storage 🏗️
**Owner:** Fiverr team (needs app rebuild)
**File:** `mobile/lib/core/local/local_data.dart`
**Action:** Replace SharedPreferences with `flutter_secure_storage`

### 4.2 — Environment Config 🏗️
**Owner:** Fiverr team
**Action:** Add Flutter flavors for dev/staging/prod with different API URLs

### 4.3 — Remove SystemUiMode.immersiveSticky 🏗️
**Owner:** Frankie (code) + Fiverr team (rebuild)
**File:** `mobile/lib/main.dart`
**Action:** Remove aggressive status bar hiding

### 4.4 — Add Push Notifications 🏗️
**Owner:** Fiverr team
**Action:** Add `firebase_messaging` + proper Firebase project setup

### 4.5 — Add Crash Reporting 🏗️
**Owner:** Fiverr team
**Action:** Add Firebase Crashlytics or Sentry

---

## Phase 5: 🔵 NEW FEATURES (Post-Cleanup)

### 5.1 — Set Up Firebase Project for Pink Pineapple 🔑
**Owner:** Troy/Sascha
**Action:** Create new Firebase project, generate service account key

### 5.2 — Stripe Payment Integration 🔑
**Owner:** Sascha/Troy (business setup) + Frankie (code)
**Action:** Implement actual payment flow with Stripe Checkout

### 5.3 — Set Up CI/CD ⏳
**Owner:** Frankie
**Action:** GitHub Actions for backend + dashboard (lint, test, deploy)

### 5.4 — Admin Analytics Dashboard ⏳
**Owner:** Frankie
**Action:** Add metrics page (users, events, bookings, revenue)

### 5.5 — Search by Location/Date ⏳
**Owner:** Frankie
**Action:** Add event search with area filtering (Canggu, Uluwatu, Seminyak)

---

## Progress Tracker

| Phase | Tasks | Done | Status |
|-------|-------|------|--------|
| 1. Security | 8 | 0 | ⏳ Starting |
| 2. Code Quality | 6 | 0 | Queued |
| 3. Database & Performance | 5 | 0 | Queued |
| 4. Mobile Fixes | 5 | 0 | Queued |
| 5. New Features | 5 | 0 | Queued |
| **Total** | **29** | **0** | |
