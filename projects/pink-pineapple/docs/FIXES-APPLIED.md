# Pink Pineapple Code Fixes - Applied Changes

**Date:** 2026-03-30  
**Status:** ✅ All fixes completed

---

## PHASE 1: CRITICAL SECURITY

### 1.1 - Add .env to .gitignore ✅
**Files Modified:**
- `backend-src/troyreed1725-backend-main/.gitignore`
- `dashboard-src/troyreed1725-dashboard-main/.gitignore`

**Changes:**
- Added `.env` and `.env.*` to backend `.gitignore`
- Uncommented and enforced `.env` exclusion in dashboard `.gitignore`

---

### 1.2 - Remove hardcoded Firebase credentials ✅
**File:** `backend-src/troyreed1725-backend-main/src/app/modules/Notification/firebaseService.ts`

**Changes:**
- Removed hardcoded private key from mawaddah-match project
- Replaced with environment variable loading
- Added validation to ensure required env vars are set
- Throws clear error message if Firebase credentials are missing

**Required Environment Variables:**
```
FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY_ID (optional)
FIREBASE_CLIENT_ID (optional)
```

---

### 1.3 - Fix JWT secrets in config ✅
**File:** `backend-src/troyreed1725-backend-main/src/config/index.ts`

**Changes:**
- Added `validateSecret()` function to check for placeholder values
- Validates `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `RESET_PASS_TOKEN`
- Application will crash on startup if secrets are set to placeholder values like:
  - "YOUR SECRET"
  - "your-secret"
  - "changeme"
  - "secret"
  - Empty strings

---

### 1.4 - Add Dashboard Route Protection ✅
**File:** `dashboard-src/troyreed1725-dashboard-main/src/middleware.ts` (NEW)

**Changes:**
- Created proper Next.js middleware (was `proxy.ts`, not wired up correctly)
- Validates JWT token from cookies
- Checks token expiration
- Redirects unauthenticated users to `/login`
- Role-based route protection:
  - ADMIN cannot access `/club/*` routes
  - CLUB cannot access non-club routes
- Clears invalid tokens automatically

---

### 1.5 - Fix auth endpoint authorization ✅

#### 1.5.1 - Reset Password Endpoint
**File:** `backend-src/troyreed1725-backend-main/src/app/modules/Auth/auth.routes.ts`

**Changes:**
- Added `auth()` middleware to `/reset-password` route
- Now requires valid JWT token (obtained after OTP verification)

#### 1.5.2 - Post Deletion Authorization
**Files:**
- `backend-src/troyreed1725-backend-main/src/app/modules/Post/post.services.ts`
- `backend-src/troyreed1725-backend-main/src/app/modules/Post/post.controller.ts`

**Changes:**
- Added ownership check to `deletePost()` service
- Only post owner or ADMIN can delete a post
- Returns 403 Forbidden if user lacks permission

#### 1.5.3 - Booking Update Authorization
**Files:**
- `backend-src/troyreed1725-backend-main/src/app/modules/Booking/Booking.service.ts`
- `backend-src/troyreed1725-backend-main/src/app/modules/Booking/Booking.controller.ts`

**Changes:**
- Added ownership check to `updateIntoDb()` service
- Only booking owner or ADMIN can update a booking
- Prevents updating sensitive fields like `userId`, `id`, `createdAt`
- Returns 403 Forbidden if user lacks permission

---

### 1.6 - Add rate limiting middleware ✅
**File:** `backend-src/troyreed1725-backend-main/src/app/middlewares/rateLimiter.ts` (NEW)

**Changes:**
- Created in-memory rate limiter for OTP endpoints
- Limits to 5 attempts per hour per email address
- Applied to:
  - `/auth/forgot-password`
  - `/auth/resend-otp`
  - `/auth/verify-otp`
  - `/auth/verify-register-otp`
- Returns 429 Too Many Requests with retry time
- Auto-cleans expired entries every 10 minutes

**Production Note:** For production deployments, consider migrating to Redis-backed rate limiting for multi-instance support.

---

## PHASE 2: CODE QUALITY

### 2.1 - Fix typos ✅

#### 2.1.1 - Dashboard: varifyToken → verifyToken
**File:** `dashboard-src/troyreed1725-dashboard-main/src/utils/verifyToken.ts`

**Changes:**
- Added new `verifyToken()` function (correct spelling)
- Kept `varifyToken()` as deprecated for backward compatibility
- Updated `middleware.ts` to use correct function name

#### 2.1.2 - Dashboard: events.spi.ts → events.api.ts
**Files:**
- Created: `dashboard-src/troyreed1725-dashboard-main/src/redux/features/events/events.api.ts`
- Modified: `dashboard-src/troyreed1725-dashboard-main/src/redux/features/events/events.spi.ts` (now re-exports)

**Changes:**
- Renamed file (`.spi.ts` was a typo, should be `.api.ts`)
- Kept old file as re-export for backward compatibility
- All imports still work without breaking existing code

#### 2.1.3 - Dashboard: VeifyOtpForm → VerifyOtpForm
**Files:**
- Created: `dashboard-src/troyreed1725-dashboard-main/src/components/modules/Auth/VerifyOtpForm.tsx`
- Modified: `dashboard-src/troyreed1725-dashboard-main/src/components/modules/Auth/VerifyOtp.tsx`

**Changes:**
- Copied file to correct name
- Updated import in `VerifyOtp.tsx`

#### Backend typos NOT fixed:
- `helpars/` folder: Actual folder name on disk - fixing would require renaming folder and updating all imports (risky)
- `user.costant.ts`: Should be `user.constant.ts` but not renamed to avoid breaking imports

---

### 2.2 - Remove debug code ✅

**Files Modified:**
- `backend-src/troyreed1725-backend-main/src/app/modules/User/user.services.ts`
  - Removed: `console.log("otp", otp)` (2 occurrences)
  - Removed: `import { object } from "zod"` (unused)
  - Removed: `// console.log(profileImage,licenseImage);`

- `backend-src/troyreed1725-backend-main/src/app/modules/Events/Events.service.ts`
  - Removed: `console.log(tonightStart,tonightEnd);`
  - Removed: `import e,` from express (unused)

- `backend-src/troyreed1725-backend-main/src/app/modules/ClubAvailableTimes/ClubAvailableTimes.service.ts`
  - Removed: `console.log(formattedData);`

- `backend-src/troyreed1725-backend-main/src/app/modules/Notification/Notification.service.ts`
  - Removed: `console.log(user?.fcmToken);`

- `backend-src/troyreed1725-backend-main/src/app/modules/Post/post.services.ts`
  - Removed: `import { CloudFormation } from "aws-sdk";` (unused)
  - Removed: `// console.log(req.body.data);`
  - Removed: `// console.dir(whereConditions,{depth:Infinity})`

- `backend-src/troyreed1725-backend-main/src/app/modules/Booking/Booking.controller.ts`
  - Removed: `// console.log(req.body);`

- `backend-src/troyreed1725-backend-main/src/app/modules/Booking/Booking.service.ts`
  - Removed: `// console.log(data);` (2 occurrences)

---

### 2.3 - Clean dead/commented-out code ✅

**Files Modified:**

- `backend-src/troyreed1725-backend-main/src/app/modules/Events/Events.service.ts`
  - Removed large commented-out `createIntoDb()` function (~120 lines)
  - Removed `// await prisma.events.updateMany({data:{userId}})` (2 occurrences)
  - Cleaned up emoji comments (🔍, 🎯, 📦)

- `backend-src/troyreed1725-backend-main/src/app/modules/Follow/Follow.service.ts`
  - Removed 3 commented-out `sendSingleNotificationUtils()` calls
  - Functions: `sendConnectionRequest`, `acceptConnectionRequest`, `declineConnectionRequest`

- `backend-src/troyreed1725-backend-main/src/app/modules/Post/post.services.ts`
  - Removed large commented-out `getAllPosts()` function
  - Removed `// await prisma.post.updateMany({data:{isHidden:false}})`

- `backend-src/troyreed1725-backend-main/src/app/modules/Post/post.controller.ts`
  - Removed commented-out `getAllPosts()` function

---

### 2.4 - Fix package metadata ✅
**File:** `dashboard-src/troyreed1725-dashboard-main/package.json`

**Changes:**
- Changed package name from `my-nextjs-redux-startar-pack` to `pink-pineapple-dashboard`

---

### 2.5 - Extract duplicated select blocks in Events.service.ts ✅
**File:** `backend-src/troyreed1725-backend-main/src/app/modules/Events/Events.service.ts`

**Changes:**
- Created `EVENT_SELECT` constant with shared Prisma select block
- Replaced 4 duplicated select blocks (~70 lines each) with `EVENT_SELECT`
- Functions updated:
  - `getListFromDb()`
  - `myEvent()`
  - `tonightEvent()`
  - `getByIdFromDb()` (uses spread: `{...EVENT_SELECT, _count: {...}}`)

**Impact:**
- Reduced code duplication by ~280 lines
- Single source of truth for event query fields
- Easier to maintain and extend event data structure

---

## PHASE 3: DATABASE

### 3.1 - Add Prisma indexes ✅
**File:** `backend-src/troyreed1725-backend-main/prisma/schema.prisma`

**Changes:**

#### 3.1.1 - Unique Constraints
Added `@@unique` constraints to prevent duplicate relationships:

- **Like:** `@@unique([userId, postId])`
- **Follower:** `@@unique([followerId, followingId])`
- **Room:** `@@unique([senderId, receiverId])`
- **ClubFavorite:** `@@unique([clubId, userId])`
- **EventFavorite:** `@@unique([eventId, userId])`

#### 3.1.2 - Performance Indexes
Added `@@index` for frequently queried fields:

- **Events:**
  - `@@index([startDate])`
  - `@@index([endDate])`

- **Booking:**
  - `@@index([userId])`
  - `@@index([eventId])`

**Next Steps:**
- Run `npx prisma migrate dev --name add_indexes` to apply changes
- Or `npx prisma db push` for development databases

---

### 3.2 - Fix N+1 queries ✅
**File:** `backend-src/troyreed1725-backend-main/src/app/modules/Auth/auth.service.ts`

**Changes in `getMyProfile()`:**

**Before (5 queries):**
1. Get user role
2. Get user profile
3. Count followers
4. Count following
5. Count posts

**After (1 query):**
- Single query with `_count` aggregation
- Uses Prisma's built-in `_count` feature
- Returns same data structure

**Performance Impact:**
- Reduced database round-trips from 5 to 1
- Eliminates N+1 query problem
- Faster response time for profile endpoint

**Additional improvements:**
- Added null check (throws 404 if user not found)
- Conditionally filters fields based on user role (CLUB vs USER)

---

## NOTES FOR TROY & SASCHA

### Critical Actions Required:

1. **Environment Variables:**
   - Set all Firebase credentials in `.env` file
   - Replace placeholder JWT secrets with strong, unique values
   - Never commit `.env` files to Git

2. **Database Migration:**
   ```bash
   cd backend-src/troyreed1725-backend-main/
   npx prisma migrate dev --name add_indexes_and_constraints
   ```
   Or for development:
   ```bash
   npx prisma db push
   ```

3. **Test Rate Limiting:**
   - Test OTP endpoints to ensure rate limiting works
   - Consider migrating to Redis for production deployments

4. **Test Middleware:**
   - Verify dashboard route protection works
   - Test role-based access control

5. **Review Removed Code:**
   - Commented-out notification calls in Follow.service.ts were intentionally disabled
   - If notifications are needed, uncomment and test

### Known Issues NOT Fixed:

1. **Folder naming:**
   - `helpars/` should be `helpers/` but not renamed (would break existing imports)
   - `user.costant.ts` should be `user.constant.ts` but not renamed

2. **Backward compatibility:**
   - `varifyToken()`, `VeifyOtpForm`, and `events.spi.ts` kept for backward compatibility
   - Update imports gradually as time permits

3. **Rate limiting:**
   - Current implementation is in-memory (not suitable for multi-instance deployments)
   - Migrate to Redis for production

### Testing Checklist:

- [ ] Run `npm install` in both backend and dashboard
- [ ] Set all required environment variables
- [ ] Run Prisma migration
- [ ] Test login flow
- [ ] Test OTP rate limiting (try 6 attempts)
- [ ] Test post deletion (owner vs non-owner)
- [ ] Test booking updates (owner vs non-owner)
- [ ] Test dashboard route protection
- [ ] Test role-based access (ADMIN vs CLUB routes)

---

**All fixes completed successfully! 🎉**
