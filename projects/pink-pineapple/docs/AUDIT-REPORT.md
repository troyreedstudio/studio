# 🍍 Pink Pineapple — Full Code Audit Report

**Date:** 2026-03-29  
**Auditor:** Frankie (AI Agent)  
**Requested by:** Sascha Gray  
**Purpose:** Pre-redesign assessment of Fiverr-built codebases

---

## Executive Summary

This is a nightclub/events social app with three codebases: a Node.js/Express backend, a Next.js admin dashboard, and a Flutter mobile app. The code is **functional but has critical security issues and significant quality gaps** that make it unsuitable for production without major rework.

**Overall Rating: 🔴 Critical — needs substantial rework before scaling**

| Codebase | Rating | Summary |
|----------|--------|---------|
| Backend | 🔴 Critical | Exposed secrets, weak auth, no authorization on key endpoints |
| Dashboard | 🟡 Needs Work | Functional but fragile auth, no route protection, template code |
| Mobile | 🟡 Needs Work | Works but hardcoded URLs, insecure token storage, debug code in prod |

---

## 🔴 PART 1: BACKEND AUDIT

**Stack:** Node.js, Express, Prisma (MongoDB), TypeScript  
**Path:** `backend/troyreed1725-backend-main/`

### 1. Architecture & Code Quality — 🟡 Needs Work

**Structure:**
```
src/
├── app/
│   ├── db/
│   ├── middlewares/    (auth, validation, error handler)
│   ├── modules/        (feature modules: Auth, User, Post, Events, etc.)
│   └── routes/
├── config/
├── errors/
├── helpars/            ← typo: should be "helpers"
├── interfaces/
└── shared/
```

**Positives:**
- Modular structure with controller/service/route/validation per feature
- Zod for request validation
- Prisma ORM (typed queries)
- Global error handler with typed Prisma error handling

**Issues:**
- **Misspelled folder:** `helpars/` instead of `helpers/` — indicates rushed work
- **Massive code duplication:** The Events service (`Events.service.ts`) has the same 60-line `select` block copy-pasted 5+ times across `getListFromDb`, `myEvent`, `tonightEvent`, `getByIdFromDb`. Same pattern in Booking service.
- **Commented-out code everywhere:** `Events.service.ts` lines 1-65 contain an entire commented-out function. `Follow.service.ts` has commented-out notification calls throughout. `post.services.ts` has commented-out code blocks.
- **Inconsistent naming:** Files mix `PascalCase` (`Booking.service.ts`) and `camelCase` (`like.services.ts`, `post.services.ts`). Some have `.services` (plural), others `.service` (singular).
- **Unused imports:** `post.services.ts` imports `CloudFormation` from aws-sdk (line 5) — completely unrelated.
- **Both Mongoose AND Prisma** in `package.json` dependencies — double ORM for MongoDB is wasteful and confusing.
- **Both old `aws-sdk` AND new `@aws-sdk/client-s3`** in dependencies — redundant.

### 2. Security Issues — 🔴 CRITICAL

#### 🚨 EXPOSED SECRETS IN `.env` FILE (COMMITTED TO REPO)

The `.gitignore` does NOT include `.env`:
```gitignore
node_modules
dist
.vercel
```

**The `.env` file is committed and contains LIVE credentials:**

| Secret | Status | Risk |
|--------|--------|------|
| MongoDB connection string with password (`troyreed1725:troyreed1725`) | 🔴 EXPOSED | Full database access |
| Stripe test secret key (`sk_test_51NHR4g...`) | 🔴 EXPOSED | Payment API abuse |
| DigitalOcean Spaces access key + secret | 🔴 EXPOSED | File storage abuse/deletion |
| Cloudinary API key + secret | 🔴 EXPOSED | Image storage abuse |
| Gmail app password (`yfma zchm woks cebv`) | 🔴 EXPOSED | Email sending abuse |
| JWT secret = `"YOUR SECRET"` | 🔴 DEFAULT VALUE | Trivially guessable — anyone can forge tokens |
| Refresh token secret = `"YOUR SECRET"` | 🔴 DEFAULT VALUE | Same as above |

#### 🚨 FIREBASE SERVICE ACCOUNT PRIVATE KEY HARDCODED IN SOURCE

**File:** `src/app/modules/Notification/firebaseService.ts`

The entire Firebase service account JSON — including the **full private key** — is hardcoded as a string literal in the source code. This is for a project called `mawaddah-match-6e449` which appears to be **from a completely different project** (likely copy-pasted from the Fiverr dev's other client work).

```typescript
// firebaseService.ts - HARDCODED private key
export const serviceAccount = {
  project_id: 'mawaddah-match-6e449',  // ← NOT Pink Pineapple!
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQ...',
  // ...
};
```

**This means:**
1. Pink Pineapple push notifications are routed through someone else's Firebase project
2. The private key is exposed to anyone with repo access
3. This is likely a Terms of Service violation

#### 🚨 WEAK AUTHENTICATION

- **JWT secret is literally `"YOUR SECRET"`** — never changed from placeholder (`config/index.ts`)
- Token expiry is 30 days (`EXPIRES_IN="30d"`) — excessively long
- No refresh token rotation — refresh token also expires in 30 days
- No token blacklisting on logout (logout endpoint exists but likely does nothing server-side)
- Auth middleware (`auth.ts` line 21) takes raw token from `Authorization` header without `Bearer` prefix validation

#### 🚨 MISSING AUTHORIZATION CHECKS

- **`/auth/reset-password` has NO auth middleware** (`auth.routes.ts` line 52) — anyone can reset any user's password by email after OTP verification, but the OTP is only 4 digits (1000-9999) and there's no rate limiting on OTP verification attempts
- **`/auth/forgot-password` has no rate limiting** — can spam OTP emails
- **`/auth/resend-otp` has no rate limiting** — can spam OTP emails
- **Booking `updateIntoDb`** (`Booking.service.ts` line ~185) accepts `data: any` — no validation, no ownership check. Any authenticated user could update any booking.
- **Post deletion** (`post.services.ts` `deletePost`) doesn't check if the user owns the post — any user can delete any post
- **User `updateUserIntoDb`** (`user.services.ts`) has no role check — payload is passed directly to Prisma update

#### OTP Weaknesses
- 4-digit OTP (1000-9999) = only 9000 possible values
- No brute-force protection on OTP verification endpoints
- OTP stored as plain integer in database (not hashed)

### 3. Bug Risks — 🟡 Needs Work

- **`user.services.ts` `updateProfile`** (line ~125): The `select` clause is dynamically built with `true/false` based on whether data was provided. If `parseData.email` is `""` (empty string), it evaluates as falsy, so the email won't be selected in the response — but will also not be updated due to `||` logic. **You can never clear a field to empty string.**
- **`user.services.ts`** line ~100: `console.log("otp", otp)` — OTP is logged to stdout in production
- **`auth.service.ts` `resetPassword`** (line ~155): Uses `bcrypt.hash(payload.password, 10)` hardcoded salt rounds instead of the configured `BCRYPT_SALT_ROUNDS=12`
- **`Events.service.ts` `tonightEvent`**: Hardcodes UTC 6PM-midnight as "tonight" — doesn't account for user timezones. For a nightclub app this is fundamentally broken.
- **WebSocket `websocketSetUp.ts`**: No heartbeat/ping mechanism — connections will silently die behind NAT/proxies. No message queue — if a user is offline, messages are lost.
- **`Booking.service.ts` `createIntoDb`**: Wraps a single create in `$transaction` unnecessarily (line ~36). No check for double-booking or ticket capacity limits.
- **Event deletion** (`Events.service.ts` `deleteItemFromDb`): Deletes event but doesn't cascade to EventTickets, EventTable, TicketCharges, TableCharges, Bookings — will leave orphaned records.
- **`fileUploader.ts`**: Google Cloud Storage is configured but `GOOGLE_CREDENTIALS` is empty in `.env` — `JSON.parse("{}")` will create a broken client.

### 4. Performance — 🟡 Needs Work

- **N+1 queries in `getMyProfile`** (`auth.service.ts` lines 54-65): Makes 4 separate queries (user, follower count, following count, post count) instead of using Prisma's `_count` in a single query.
- **N+1 in `getUsersFromDb`** (`user.services.ts`): Fetches all users, then separately fetches all favorites, then does a JS `Set` lookup. Could be a single query with `include`.
- **No database indexes defined** in Prisma schema — MongoDB relies on `_id` by default but there are no compound indexes on frequently queried fields like `{userId, postId}` on Like, `{followerId, followingId}` on Follower, `{senderId, receiverId}` on Room, etc.
- **No pagination on WebSocket `fetchChats`** — loads ALL messages in a room at once
- **No pagination on `messageList`** — loads ALL rooms with their latest message
- **Rate limiter set to 2000 requests per 15 minutes per IP** — effectively no rate limiting (133 req/min)
- **`uploadPost`** allows 500 photos and 100 videos per post — no file size limits in multer config

### 5. Missing Features / Gaps — 🟡 Needs Work

- **Notifications are largely disabled** — `Follow.service.ts` and `like.services.ts` have all notification calls commented out
- **No Stripe payment integration** despite having the key — `paidAmount` in Booking is just a number field with no actual payment processing
- **No email verification on registration** — user can register with any email, OTP is sent but there's no proof the email was verified before allowing sign-up
- **No file type validation** — any file type can be uploaded via the file upload endpoints
- **No image size/dimension limits**
- **No user deletion/account deactivation** endpoint
- **No search endpoint for events by location/date**
- **No admin dashboard API** for analytics/metrics
- **WebSocket has no `messageToAdmin`** handler despite the dashboard expecting it
- **`user.costant.ts`** (misspelled "constant") — likely has search fields but the typo indicates carelessness

### 6. DevOps / Deployment — 🟡 Needs Work

- **Deployed on Vercel** (`vercel.json` present) — Vercel is for serverless/static, not ideal for WebSocket servers. WebSocket connections will not persist on Vercel's serverless functions.
- **No Dockerfile or docker-compose**
- **No CI/CD pipeline** (no `.github/workflows`, no `.gitlab-ci.yml`)
- **No test files** — `"test": "echo \"Error: no test specified\" && exit 1"`
- **No environment validation** — app will crash at runtime if env vars are missing
- **`nodemon` in production dependencies** instead of dev dependencies
- **No health check endpoint**
- **No logging framework** — uses `console.log` throughout

### 7. Database Schema — 🟡 Needs Work

**Positives:**
- Decent relational modeling for MongoDB (using Prisma relations)
- Appropriate use of enums for status fields

**Issues:**
- **No unique constraints** on Follower `{followerId, followingId}` — duplicate follow records possible
- **No unique constraints** on Like `{userId, postId}` — duplicate likes possible (though code checks, a race condition could create duplicates)
- **No unique constraints** on Room `{senderId, receiverId}` — duplicate chat rooms possible
- **No unique constraints** on ClubFavorite `{clubId, userId}` or EventFavorite `{eventId, userId}`
- **`feeAmount` is String** in TicketCharges and TableCharges — should be numeric for calculations
- **`photos` and `videos` on Post are `Json?`** — no schema validation on the JSON structure
- **No soft-delete** — records are hard deleted, no audit trail
- **`BlockUser` model has no `@@map`** — inconsistent with other models that use `@@map`
- **No indexes defined** — all queries rely on full collection scans except by `_id`

---

## 🟡 PART 2: DASHBOARD AUDIT

**Stack:** Next.js 16, React 19, Redux Toolkit (RTK Query), Tailwind CSS  
**Path:** `dashboard/troyreed1725-dashboard-main/`

### 1. Architecture & Code Quality — 🟡 Needs Work

**Structure:**
```
src/
├── app/              (Next.js App Router pages)
│   ├── (defaultLayout)/  (admin pages)
│   ├── club/             (club owner pages)
│   └── auth pages
├── components/
│   ├── common/       (Pagination, Spinner, etc.)
│   ├── form/         (form wrappers)
│   ├── modules/      (feature components)
│   ├── shared/       (Navbar, Sidebar)
│   └── ui/           (shadcn/ui components)
├── redux/
│   ├── api/          (baseApi)
│   ├── features/     (auth, events, user)
│   └── store, hooks
├── hooks/
├── schema/
├── types/
└── utils/
```

**Positives:**
- Clean use of RTK Query for API calls
- shadcn/ui component library (good foundation)
- Proper Next.js App Router usage with layouts
- TypeScript throughout

**Issues:**
- **Package name is `my-nextjs-redux-startar-pack`** — never renamed from template/boilerplate
- **Metadata says "Insightify"** (`layout.tsx` line 6) — leftover from a different project entirely
- **`events.spi.ts`** — filename typo (should be `.api.ts`)
- **`VeifyOtpForm.tsx`** — filename typo ("Veify" instead of "Verify")
- **`varifyToken`** (`verifyToken.ts`) — function name typo ("varify" instead of "verify")
- **Duplicate `cn` utility** — both `src/lib/utils.ts` and `src/utils/cn.jsx` exist
- **`demoData.tsx`** in constants — likely has demo/placeholder data shipping in production
- **No TypeScript strict mode issues** but heavy use of `any` type throughout (e.g., `Approvals.tsx` uses `any` for user items)

### 2. Security Issues — 🔴 Critical

- **No route protection/middleware:** The `(defaultLayout)/layout.tsx` renders admin pages without checking authentication. There's no `middleware.ts` file to redirect unauthenticated users. Any visitor can access admin routes directly.
- **Token stored in Redux state AND cookies** — double storage with no consistency guarantee
- **JWT decoded client-side with `jwt-decode`** (`verifyToken.ts`) — this only decodes, it does NOT verify the signature. The dashboard trusts the decoded token payload without server-side verification.
- **No CSRF protection**
- **Auth token sent without `Bearer` prefix** (`baseApi.ts` line 16: `headers.set("Authorization", token)`) — non-standard, fragile
- **`setCookie` uses default cookie options** — no `httpOnly`, no `secure`, no `sameSite` flags set

### 3. Bug Risks — 🟡 Needs Work

- **WebSocket hook** (`useWebSocket.ts`): No reconnection logic. If connection drops, messages stop working until page refresh.
- **WebSocket URL** is not configured via environment — would need to be hardcoded somewhere
- **`Approvals.tsx`**: Always passes `role=CLUB` filter regardless of which tab is selected (line 14: `...(status ? [{ name: "role", value: "CLUB" }] : [])` — `status` is always truthy since it's initialized to `"Booking"`)
- **No error boundaries** — unhandled errors crash the entire app
- **No loading states** for many operations
- **Login redirect** uses `setTimeout` with 1000ms delay — fragile, race condition with navigation

### 4. Performance — 🟢 Acceptable

- RTK Query handles caching well
- Next.js provides good defaults for code splitting
- No obvious performance anti-patterns

### 5. Missing Features / Gaps — 🟡 Needs Work

- **No route guards/middleware** — biggest gap
- **No responsive design testing** apparent — sidebar may break on mobile
- **Club dashboard** has limited pages: events, messages, settings — missing booking management for club owners
- **ManageEvents** component exists but appears minimal
- **No analytics/metrics dashboard** for admin
- **No image optimization** — uses Next.js `Image` component but external URLs may not be configured in `next.config.ts`

### 6. DevOps / Deployment — 🟢 Acceptable

- Standard Next.js setup, deployable to Vercel
- Environment variable properly externalized (`NEXT_PUBLIC_BASE_URL`)
- Turbopack enabled for dev

---

## 🟡 PART 3: MOBILE APP AUDIT

**Stack:** Flutter (Dart), GetX state management  
**Path:** `mobile/pineapple-main/`

### 1. Architecture & Code Quality — 🟡 Needs Work

**Structure:**
```
lib/
├── core/
│   ├── binding/          (GetX bindings)
│   ├── const/            (colors, icons, paths)
│   ├── controller/       (image picker)
│   ├── global_widgets/   (shared widgets)
│   ├── local/            (SharedPreferences)
│   ├── network_caller/   (HTTP client)
│   ├── services/         (WebSocket)
│   └── style/
├── feature/
│   ├── auth/             (login, signup, OTP, etc.)
│   ├── home/
│   ├── newsfeed/
│   ├── chat_tab/
│   ├── profile_tab/
│   ├── explore/
│   ├── bookings/
│   ├── event_details*/   (3 separate modules!)
│   ├── favorites/
│   ├── free_user/
│   └── ... (15+ feature modules)
```

**Positives:**
- Feature-based folder structure (good separation)
- GetX used consistently for state management
- Core utilities well organized
- WebSocket service with reconnection logic (exponential backoff)
- `LocalService` is clean and well-documented

**Issues:**
- **Numbered file names:** `0.splash_ui.dart`, `1.login_ui.dart`, etc. — unconventional, makes refactoring painful
- **Typos in folder names:** `follwing_followers/` (missing 'o' in "following")
- **Backup files in production:** `user_profile_backup.dart` — dead code
- **`network_config.dart`** is a 200+ line God method (`ApiRequestHandler`) handling ALL HTTP methods in one giant if/else chain — violates Single Responsibility, hard to test, hard to maintain
- **Debug `print` statements everywhere:** `login_controller.dart` has 15+ `print()` calls with emojis that will show in production logs
- **Hardcoded commented-out JWT tokens** in `network_config.dart` (lines ~27-30) — from dev testing, left in production code
- **`chat_integration_example.dart`** — example/demo file committed to production
- **Two separate model files for event details:** `event_details_model.dart` and `event_details_model_saon.dart` — "saon" appears to be a developer's name, indicating unfinished refactoring
- **`network_config_v2.dart`** exists alongside `network_config.dart` — unclear which is canonical

### 2. Security Issues — 🔴 Critical

- **Token stored in SharedPreferences** (`local_data.dart`) — SharedPreferences is NOT encrypted. On rooted Android devices, tokens can be read from XML files. Should use `flutter_secure_storage`.
- **Hardcoded production API URL** in `endpoints.dart`: `https://api.pinkpineapple.app/api/v1` — no environment switching, no dev/staging separation
- **Hardcoded WebSocket URL:** `wss://api.pinkpineapple.app` — same issue
- **No certificate pinning** — vulnerable to MITM attacks
- **No token refresh logic** — if the 30-day token expires, user must re-login
- **Auth token sent without `Bearer` prefix** (matching backend issue)
- **No biometric lock** or app-level security
- **Password sent in plain text** in request body (standard over HTTPS, but combined with no cert pinning this is risky)

### 3. Bug Risks — 🟡 Needs Work

- **`login_controller.dart`** (lines 50-80): Extensive null-checking for userId in response, trying `_id`, `id`, `user._id`, `user.id`, `data._id`, `data.id` — indicates the API response format is unstable/undefined
- **`network_config.dart`**: All error `catch` blocks are empty or commented out (e.g., `// ShowError(e);`) — errors are silently swallowed, making debugging impossible
- **No form validation** on most screens — the login controller does basic checks but sign-up likely has gaps
- **`SystemUiMode.immersiveSticky`** in `main.dart` — hides status bar AND navigation bar permanently. This is aggressive and unusual for a social app.
- **WebSocket service**: `if (_channel != null) return;` in `connect()` means if the channel exists but is disconnected, reconnection won't work until `_channel` is set to null
- **No offline handling** — if network drops during an operation, behavior is undefined

### 4. Performance — 🟡 Needs Work

- **No image caching strategy** beyond `cached_network_image` — no cache eviction policy
- **No pagination on chat messages** — loads all at once via WebSocket
- **No lazy loading** of feature modules
- **`internet_connection_checker`** runs on every API call — creates overhead. Should check once and listen to connectivity stream.
- **Multiple GetX controllers** may not be properly disposed — potential memory leaks

### 5. Missing Features / Gaps — 🟡 Needs Work

- **Push notifications not implemented** in mobile — `firebase_messaging` is not in `pubspec.yaml` despite backend having FCM setup
- **No deep linking** setup
- **No analytics** (Firebase Analytics, Mixpanel, etc.)
- **No crash reporting** (Crashlytics, Sentry)
- **`free_user/`** feature exists but `FREE_USER_IMPLEMENTATION_GUIDE.md` suggests it's still being planned
- **Terms & Conditions and Privacy Policy** pages exist but likely have placeholder content
- **No image/video compression** before upload — raw camera files sent to server
- **No pull-to-refresh** on most list views
- **Report feature** exists (`feature/report/`) but unclear if functional

### 6. DevOps / Deployment — 🟡 Needs Work

- **Version comment says** "1.2.0+4" but the comment above says "updating it to 1.4.0+4" — inconsistent
- **No flavor/environment setup** — can't build for dev/staging/prod
- **No CI/CD** configuration
- **iOS build data leaked into Android directory** (`android/build/ios/XCBuildData/`) — build artifacts committed
- **Only one test file** (`test/widget_test.dart`) — the default Flutter template test
- **No code signing configuration** visible
- **`change_app_package_name`** in production dependencies — this is a dev tool

---

## 🔴 CRITICAL ACTION ITEMS (Do These First)

### Immediate (Before Any New Development)

1. **ROTATE ALL SECRETS IMMEDIATELY:**
   - Change MongoDB password and update connection string
   - Rotate Stripe API keys
   - Rotate DigitalOcean Spaces credentials
   - Rotate Cloudinary credentials
   - Change Gmail app password
   - Generate new, strong JWT secrets (minimum 256-bit random strings)
   - Revoke the Firebase `mawaddah-match` service account key

2. **Add `.env` to `.gitignore`** and remove it from git history (`git filter-branch` or BFG Repo Cleaner)

3. **Remove hardcoded Firebase credentials** from `firebaseService.ts` — use environment variables

4. **Set proper JWT secrets** — replace `"YOUR SECRET"` with cryptographically random strings

5. **Add route protection** to the dashboard — implement Next.js middleware for auth checks

### Short-term (Before Next Release)

6. Add unique compound indexes to the Prisma schema (Like, Follower, Room, Favorites)
7. Add rate limiting to OTP endpoints (max 5 attempts per email per hour)
8. Implement proper authorization on all endpoints (ownership checks)
9. Use `flutter_secure_storage` instead of SharedPreferences for tokens
10. Remove all `console.log` / `print` debug statements
11. Fix post deletion to check ownership
12. Add file type and size validation to upload endpoints
13. Fix "tonight events" to use user timezone

### Medium-term (For Redesign)

14. Replace the WebSocket implementation with Socket.IO (already in dependencies) for better reconnection and room management
15. Implement proper payment processing with Stripe
16. Set up CI/CD pipelines for all three codebases
17. Add comprehensive testing (aim for 60%+ coverage)
18. Implement proper logging (Winston or Pino for backend)
19. Set up separate Firebase project for Pink Pineapple
20. Add mobile push notifications (Firebase Messaging)
21. Refactor the mobile network layer — split the God method into proper service classes
22. Add environment flavors to the Flutter app

---

## Summary

This codebase was clearly built quickly by a developer who reused code from other projects (evidenced by "mawaddah-match" Firebase project, "Insightify" in dashboard metadata, and the "startar-pack" package name). The fundamental architecture is reasonable — the choices of Prisma, RTK Query, and GetX are all fine. But the implementation has **serious security holes** (exposed secrets, weak auth, missing authorization) and **significant quality issues** (dead code, typos, no tests, debug code in production).

**The good news:** The database schema and module structure provide a decent foundation. A redesign doesn't need to start from zero — it needs to harden security, clean up the code quality issues, and fill the gaps in features and testing.

**The bottom line:** Do NOT put this into production with real users and real payments without addressing at least the Critical Action Items above. The exposed credentials alone are a liability.
