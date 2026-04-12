# Credential Rotation Checklist

The Fiverr development team had access to all credentials. Every secret must be rotated. This document covers what to rotate, where each credential is used in the codebase, where to generate replacements, and the order to do it in.

## Rotation Order

Rotate in this order. Services at the top are safe to rotate first (low blast radius). Database is last because changing it breaks everything immediately.

1. JWT secrets (invalidates sessions, not infrastructure)
2. Firebase Admin (push notifications only)
3. Stripe (not integrated yet, lowest risk)
4. Cloudinary (file uploads)
5. DigitalOcean Spaces (file uploads)
6. Google Cloud Storage (file uploads)
7. Email/SMTP (password resets, OTP)
8. MongoDB Atlas (breaks all backend operations -- do last)

---

## 1. JWT Secrets

These are arbitrary strings you generate yourself. Rotating them invalidates all existing user sessions (users will need to log in again).

### JWT_SECRET
- **What**: Signs access tokens for user authentication
- **Used in**: `backend/src/config/index.ts` (line 12), `backend/src/shared/websocketSetUp.ts` (line 40 -- WebSocket auth)
- **Env var**: `JWT_SECRET`
- **Generate**: `openssl rand -base64 64`
- **Impact**: All logged-in users get logged out

### REFRESH_TOKEN_SECRET
- **What**: Signs refresh tokens for session renewal
- **Used in**: `backend/src/config/index.ts` (line 14)
- **Env var**: `REFRESH_TOKEN_SECRET`
- **Generate**: `openssl rand -base64 64`
- **Impact**: All refresh tokens become invalid

### RESET_PASS_TOKEN
- **What**: Signs password reset tokens sent via email
- **Used in**: `backend/src/config/index.ts` (line 16)
- **Env var**: `RESET_PASS_TOKEN`
- **Generate**: `openssl rand -base64 64`
- **Impact**: Any in-flight password reset links stop working

**Action**: Generate three new random strings, update `.env` on the server, restart the backend. All three can be rotated at the same time.

---

## 2. Firebase Admin (FCM Push Notifications)

### FIREBASE_PROJECT_ID
- **What**: Firebase project identifier
- **Used in**: `backend/src/app/modules/Notification/firebaseAdmin.ts` (line 6)
- **Env var**: `FIREBASE_PROJECT_ID`
- **Generate**: This is your project ID -- it does not change. But you need a new service account key.

### FIREBASE_CLIENT_EMAIL
- **What**: Service account email for Firebase Admin SDK
- **Used in**: `backend/src/app/modules/Notification/firebaseAdmin.ts` (line 7)
- **Env var**: `FIREBASE_CLIENT_EMAIL`
- **Generate**: Firebase Console > Project Settings > Service Accounts > Generate New Private Key

### FIREBASE_PRIVATE_KEY
- **What**: Private key for Firebase Admin SDK authentication
- **Used in**: `backend/src/app/modules/Notification/firebaseAdmin.ts` (line 8)
- **Env var**: `FIREBASE_PRIVATE_KEY`
- **Generate**: Same as above -- comes from the downloaded JSON service account key

**Action**: Go to Firebase Console > Project Settings > Service Accounts. Generate a new private key. This invalidates the old one. Extract `client_email` and `private_key` from the downloaded JSON. Update `.env`. Note: the private key contains `\n` characters -- make sure your `.env` handles them (wrap in double quotes).

---

## 3. Stripe

### STRIPE_SECRET_KEY
- **What**: Server-side Stripe API key for payments
- **Used in**: `backend/src/config/index.ts` (line 8)
- **Env var**: `STRIPE_SECRET_KEY`
- **Generate**: Stripe Dashboard > Developers > API Keys > Roll key (or create restricted key)
- **Impact**: Stripe is installed but NOT integrated (no checkout or webhook code exists). Low risk.

### STRIPE_WEBHOOK_SECRET
- **What**: Validates incoming Stripe webhook events
- **Used in**: Not yet in code -- will be needed when payments are integrated
- **Env var**: `STRIPE_WEBHOOK_SECRET`
- **Generate**: Stripe Dashboard > Developers > Webhooks > Add endpoint > Signing secret

**Action**: In Stripe Dashboard, roll the secret key. If using test mode, roll test keys. Add `STRIPE_WEBHOOK_SECRET` to `.env` for future use. Since Stripe is not integrated, this rotation has zero production impact.

---

## 4. Cloudinary

### CLOUDINARY_CLOUD_NAME
- **What**: Cloudinary account cloud name
- **Used in**: `backend/src/helpars/fileUploader.ts` (line 30)
- **Env var**: `CLOUDINARY_CLOUD_NAME`
- **Generate**: This is your account identifier. Does not change unless you create a new Cloudinary account.

### CLOUDINARY_API_KEY
- **What**: Cloudinary API key for uploads
- **Used in**: `backend/src/helpars/fileUploader.ts` (line 31)
- **Env var**: `CLOUDINARY_API_KEY`
- **Generate**: Cloudinary Console > Settings > Access Keys > Generate new key pair

### CLOUDINARY_API_SECRET
- **What**: Cloudinary API secret for uploads
- **Used in**: `backend/src/helpars/fileUploader.ts` (line 32)
- **Env var**: `CLOUDINARY_API_SECRET`
- **Generate**: Same as above -- comes with the new key pair

**Action**: In Cloudinary Console, generate a new API key pair. The old key pair can be deleted after updating. Existing uploaded files are NOT affected -- they stay accessible. Only new uploads require the new credentials.

---

## 5. DigitalOcean Spaces

### DO_SPACE_ENDPOINT
- **What**: S3-compatible endpoint URL for DigitalOcean Spaces
- **Used in**: `backend/src/helpars/fileUploader.ts` (lines 21, 123)
- **Env var**: `DO_SPACE_ENDPOINT`
- **Generate**: DigitalOcean Console > Spaces > your space > Settings. Format: `https://<region>.digitaloceanspaces.com`
- **Note**: This is a URL, not a secret. Only changes if you create a new Space in a different region.

### DO_SPACE_ACCESS_KEY
- **What**: Access key for DigitalOcean Spaces API
- **Used in**: `backend/src/helpars/fileUploader.ts` (line 23)
- **Env var**: `DO_SPACE_ACCESS_KEY`
- **Generate**: DigitalOcean Console > API > Spaces Keys > Generate New Key

### DO_SPACE_SECRET_KEY
- **What**: Secret key for DigitalOcean Spaces API
- **Used in**: `backend/src/helpars/fileUploader.ts` (line 24)
- **Env var**: `DO_SPACE_SECRET_KEY`
- **Generate**: Same as above -- shown once at creation time, save it immediately

### DO_SPACE_BUCKET
- **What**: Name of the DigitalOcean Space (bucket)
- **Used in**: `backend/src/helpars/fileUploader.ts` (lines 112, 123, 126)
- **Env var**: `DO_SPACE_BUCKET`
- **Note**: Not a secret. Only changes if you create a new Space.

**Action**: In DigitalOcean Console > API > Spaces Keys, generate a new key pair. Delete the old key after updating. Existing files in the Space remain accessible.

---

## 6. Google Cloud Storage

### GOOGLE_CREDENTIALS
- **What**: Full GCS service account JSON, stored as a single env var
- **Used in**: `backend/src/helpars/fileUploader.ts` (line 137) -- parsed via `JSON.parse()`
- **Env var**: `GOOGLE_CREDENTIALS`
- **Generate**: Google Cloud Console > IAM & Admin > Service Accounts > select account > Keys > Add Key > JSON
- **Note**: This is an entire JSON object in one env var. Escape it properly or base64 encode it.

### GOOGLE_BUCKET_NAME
- **What**: GCS bucket name
- **Used in**: `backend/src/helpars/fileUploader.ts` (line 141)
- **Env var**: `GOOGLE_BUCKET_NAME`
- **Note**: Not a secret. Only changes if you create a new bucket.

**Action**: In Google Cloud Console, create a new service account key for the same service account (or create a new service account with Storage Object Admin role). Delete the old key. Update `GOOGLE_CREDENTIALS` in `.env` with the full JSON content.

---

## 7. Email / SMTP

### EMAIL
- **What**: Email address used to send OTP codes and password reset emails
- **Used in**: `backend/src/config/index.ts` (line 21)
- **Env var**: `EMAIL`
- **Note**: If using Gmail, this is the Gmail address. Does not need rotating unless compromised.

### APP_PASS
- **What**: App-specific password for SMTP authentication (likely Gmail App Password)
- **Used in**: `backend/src/config/index.ts` (line 22)
- **Env var**: `APP_PASS`
- **Generate**: Google Account > Security > 2-Step Verification > App Passwords > Generate new password
- **Impact**: Revoke the old app password first, then generate a new one. OTP and password reset emails will fail between revocation and update.

**Action**: Go to Google Account security settings. Revoke the existing app password. Generate a new one. Update `.env` and restart backend. Do this during low-traffic hours since email-dependent flows (registration OTP, password reset) will be down briefly.

---

## 8. MongoDB Atlas (DO LAST)

### DATABASE_URL
- **What**: Full MongoDB connection string including username, password, cluster address, and database name
- **Used in**: Prisma schema (`backend/prisma/schema.prisma`) via `datasource db`
- **Env var**: `DATABASE_URL`
- **Generate**: MongoDB Atlas > Database Access > Edit user > Update password. Then update the connection string.
- **Impact**: BREAKS ALL BACKEND OPERATIONS IMMEDIATELY. The backend cannot read or write any data until the new connection string is in place.

**Action**:
1. Go to MongoDB Atlas > Database Access
2. Edit the database user and set a new password
3. Go to Database > Connect > Get connection string
4. Update `DATABASE_URL` in `.env` with the new password in the connection string
5. Restart the backend immediately
6. Verify the backend connects successfully

**Timing**: Do this last, during lowest-traffic window. Have the new connection string ready to paste before changing the password. The window of downtime should be under 60 seconds if you are prepared.

---

## Non-Secret Configuration

These are not secrets but should be documented:

| Env Var | What | Used In | Notes |
|---------|------|---------|-------|
| `BCRYPT_SALT_ROUNDS` | Number of bcrypt hashing rounds | `backend/src/config/index.ts` (line 10) | Typically 10-12. Not a secret. Does not need rotating. Changing it does NOT invalidate existing passwords. |
| `PORT` | Backend server port | `backend/src/config/index.ts` (line 9) | Not a secret. |
| `NODE_ENV` | Environment flag | `backend/src/config/index.ts` (line 7) | Not a secret. |
| `BACK_END_URL` | Backend base URL for local file uploads | `backend/src/helpars/fileUploader.ts` (line 191) | Not a secret. |
| `RESET_PASS_LINK` | Frontend URL for password reset page | `backend/src/config/index.ts` (line 19) | Not a secret. |
| `EXPIRES_IN` | JWT access token expiry duration | `backend/src/config/index.ts` (line 13) | Not a secret. |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token expiry duration | `backend/src/config/index.ts` (line 15) | Not a secret. |
| `RESET_PASS_TOKEN_EXPIRES_IN` | Reset password token expiry | `backend/src/config/index.ts` (line 17) | Not a secret. |
| `NEXT_PUBLIC_BASE_URL` | API URL for the Next.js dashboard | `dashboard/src/redux/api/baseApi.ts` (line 5) | Not a secret. Public env var. |

---

## After Rotation

Once all credentials are rotated, do the following:

### Immediate
- [ ] Update `.env` on the DigitalOcean backend server with all new values
- [ ] Restart the backend process (PM2, systemd, or however it is managed)
- [ ] Verify backend starts without errors (`/api/v1` responds)
- [ ] Verify WebSocket connection works (`wss://api.pinkpineapple.app`)
- [ ] Test a file upload (Cloudinary, DO Spaces, or GCS depending on which is active)
- [ ] Test user registration (triggers OTP email)
- [ ] Test login (JWT issuance)
- [ ] Test password reset flow (email + reset token)
- [ ] Test push notifications (Firebase FCM)

### Dashboard (Vercel)
- [ ] If `NEXT_PUBLIC_BASE_URL` changed, update it in Vercel environment variables and redeploy
- [ ] Verify dashboard login works against the new backend

### Flutter App
- [ ] The app uses hardcoded API URLs in `app/lib/core/network_caller/endpoints.dart` -- these are URLs, not secrets. No app update needed unless the API domain changes.
- [ ] If API URLs change, update `endpoints.dart`, rebuild, and submit to App Store + Google Play

### Access Control
- [ ] Revoke the Fiverr team's access to MongoDB Atlas
- [ ] Revoke the Fiverr team's access to DigitalOcean
- [ ] Revoke the Fiverr team's access to Cloudinary
- [ ] Revoke the Fiverr team's access to Google Cloud
- [ ] Revoke the Fiverr team's access to Stripe
- [ ] Revoke the Fiverr team's access to Firebase Console
- [ ] Revoke the Fiverr team's access to the Gmail account (if shared)
- [ ] Revoke the Fiverr team's access to any Git repositories
- [ ] Check for any hardcoded credentials in the codebase (there should be none, but verify)
- [ ] Ensure the old `.env` file is not committed anywhere in Git history

### Ongoing
- [ ] Store new credentials in a password manager (1Password, Bitwarden, etc.)
- [ ] Set a calendar reminder to rotate credentials every 90 days
- [ ] Consider using DigitalOcean's App Platform environment variables or a secrets manager instead of `.env` files on the server
