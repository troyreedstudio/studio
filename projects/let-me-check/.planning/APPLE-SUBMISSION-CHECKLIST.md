# Let Me Check: Apple Submission Checklist

> **Plain-English first.** This is the step-by-step guide for Troy to take the
> app from "code ready" to "live on the App Store." The code is done. These are
> the human steps only you can complete.

---

## What the code team has already done for you

Plans 01 through 04 of Phase 11 are complete. Here is what that means in
plain English:

- **Account deletion is live.** Users can delete their own account from the app.
  Apple requires this for any app where people can sign up -- it is now built and
  deployed.
- **Dev-only test buttons are removed.** The blur test buttons, wireframe badges,
  and dev-only error-state menu are all gone from the production build.
- **Unfinished screens are hidden.** The membership upgrade screen and the
  invite/referrals screen are no longer reachable from the profile page.
  (The code is kept for when those features launch post-App Store.)
- **The search "use my location" button is wired.** Dead buttons are a common
  Apple rejection reason -- that one is fixed.
- **Privacy and terms links work.** The help screen links to `lmc.app/privacy`
  and `lmc.app/terms`. You just need to put the actual documents at those URLs.
- **The dispatch timeout is reset to 5 minutes.** It was at 60 minutes during
  testing. It is back to the correct production value.
- **All TypeScript checks pass.** The code compiles clean.

---

## Three separate logins: Apple, Expo, and GitHub

These are three completely separate accounts. None of them does the job of
the other two.

| Account | What it is | What you use it for |
|---------|-----------|---------------------|
| **Apple Developer** (developer.apple.com) | Your $99/year Apple dev account | App Store Connect, certificates |
| **Expo** (expo.dev -- account: troyreed26) | The Expo build service | Building and submitting the iOS binary |
| **GitHub** | Code repository | Storing the code only |

**Pushing code to GitHub does NOT build the app.** Building the app and
submitting it to Apple are separate steps using the Expo account.

---

## The ten steps (H-01 through H-10)

---

### H-01: Set up the app record in App Store Connect

App Store Connect is at https://appstoreconnect.apple.com
Your app may already be registered (App ID: `6764298662`). Check "My Apps."
If it is there, skip to H-02. If not, create a new app with these details:

- [ ] App name: **Let Me Check**
- [ ] Bundle ID: `Com.BlackMalibuinc.letmecheck` (capital C -- must match exactly)
- [ ] Primary language: **English (US)**
- [ ] Primary category: **Lifestyle**
- [ ] Secondary category: **Navigation**
- [ ] Privacy policy URL: the URL where you have hosted the privacy policy
      (you will create this in H-05 -- come back and fill this in)
- [ ] Support URL: `https://lmc.app/support` or use `mailto:help@letmecheck.com`
      as a support link
- [ ] Age rating: fill out the questionnaire. Correct answers for LMC:
      - Mature/suggestive content: No
      - Cartoon or fantasy violence: No
      - Realistic violence: No
      - Sexual content or nudity: No
      - Profanity or crude humor: No
      - Medical or treatment information: No
      - Alcohol, tobacco, or drug use: No
      - Gambling or contests: No
      - **Result: 4+**

---

### H-02: Write the App Store listing copy

This is what people read on the App Store page. Apple allows up to 4,000
characters for the description.

- [ ] **Description** (4,000 chars max). A starting draft:

  > Know Before You Go.
  >
  > Let Me Check connects you with Scouts -- real people on the ground -- who
  > film a 15-second video of any location and deliver it to you in under 10
  > minutes.
  >
  > Heading somewhere and wondering if it is worth the trip? Request a check,
  > pay a small fee, and a nearby Scout films it live. You watch. You decide.
  > Then you go -- or you do not.
  >
  > SEEKERS
  > Browse nearby venues, select a check, pay, and watch your video arrive.
  > Every video is GPS-stamped at the filming location and automatically
  > face-blurred to protect people in the footage.
  >
  > SCOUTS
  > Earn money by accepting nearby check requests. Go online when you are ready,
  > film a short clip at the location, and get paid when it is delivered.
  >
  > Real eyes. Right now. Anywhere.
  >
  > PRICING
  > Standard check: $15 (Scout earns $8)
  > Priority check: $20 (Scout earns $12)

  **Do not mention memberships, referrals, or invite-a-friend in the
  description.** Those features are hidden in this version.

- [ ] **Keywords** (100 characters max):
  `venue check,scout,live video,location,on demand,real-time,verification,know before you go`

- [ ] **Promotional text** (170 chars, can be changed without resubmitting):
  `Real eyes on the ground. Know what's happening before you go.`

- [ ] **What's New** (first submission -- optional or write):
  `First release of Let Me Check -- visual verification on demand.`

- [ ] **Copyright**: `2026 Black Malibu Inc.`

---

### H-03: Take screenshots

Apple requires screenshots at specific pixel sizes. **One size covers all
iPhones.** You only need to upload the 6.9-inch set.

```
Required size: 1320 x 2868 pixels, portrait orientation
Device: iPhone 16 Pro Max (or its simulator)
```

**How to take them:**
1. Open Xcode, launch the iOS Simulator, choose iPhone 16 Pro Max.
2. Run the app (`cd lmc-app && npm run ios` -- it will open in the simulator).
3. Navigate to each screen you want to capture.
4. Press Cmd+S in the Simulator window (or go to File -> Save Screenshot).
5. Screenshots save to your Desktop.

**Screens to capture (3-6 screenshots recommended):**
- [ ] Home screen with venue cards showing
- [ ] Venue detail screen (the one with "Standard Check" and "Priority" buttons)
- [ ] Payment / order summary screen
- [ ] Waiting screen (showing the dispatch countdown)
- [ ] Delivery screen (showing the video player and Scout info)
- [ ] Optional: Scout dashboard (showing the "Go Online" toggle)

**IMPORTANT:** Take screenshots AFTER Phase 11 code changes are merged and
built. Do not use screenshots that show the "WF" wireframe badge, the dev error
section in Help, or the Membership/Invite screens.

---

### H-04: Fill in the App Privacy "nutrition labels"

In App Store Connect, under your app, go to App Privacy. Apple will ask you
a series of questions about every type of data you collect.

Use this table as your guide:

| Data type | Does LMC collect it? | Linked to the user? | Used for |
|-----------|---------------------|---------------------|---------|
| Name | Yes (from Apple/Google sign-in) | Yes | Account management |
| Email address | Yes (from Apple/Google sign-in) | Yes | Account management |
| User ID | Yes (internal Supabase account ID) | Yes | App functionality |
| Precise location | Yes | Yes | App functionality (finding Scouts) |
| Coarse location | No | -- | -- |
| Device ID / push token | Yes (push notification token only) | No | Notifications |
| Videos | Yes (clips filmed by Scouts) | Yes | App functionality |
| Payment info | **No** -- Stripe handles all card data; LMC never sees it | -- | -- |
| Photo or video library | No -- the app does not access your camera roll | -- | -- |
| Crash data | No | -- | -- |
| Browsing history | No | -- | -- |

**Key notes for filling out the form:**
- Select "Card number or payment information" as NOT collected by LMC. Stripe
  processes payments -- LMC does not see your card number.
- Select "Photos or Videos" as collected (Scout videos go through our servers)
  but clarify it is user-generated content for app functionality, not for
  advertising.
- Do not select photo library access -- the app does not use your camera roll.

---

### H-05: Host the privacy policy, terms, and support page

Apple requires a **working** privacy policy URL in App Store Connect. The
link in the app currently points to `https://lmc.app/privacy` and
`https://lmc.app/terms` -- you need to put the actual documents there.

**What to host and where:**

You have a few options for where to host the documents. The easiest is a
Google Doc set to "anyone with the link can view" -- but a real domain
(`lmc.app`) is better for the App Store listing.

**Option A (easiest for now -- fine for TestFlight):**
- Create a Google Doc with the privacy policy text.
- Share it publicly ("anyone with link can view").
- Paste the Google Doc URL into App Store Connect as the privacy policy URL.
- Update the URL in the app code (in `app/(seeker)/help.tsx`) to point to
  the Google Doc. Come back and swap to `lmc.app/privacy` when the domain
  is live.

**Option B (recommended for final submission):**
- Host the files at `lmc.app/privacy` and `lmc.app/terms`.
- A simple Notion page, a static HTML file, or any web host works.

**The text for both documents is ready here:**
- Privacy policy draft: `.planning/legal/PRIVACY-POLICY-DRAFT.md`
- Terms of service draft: `.planning/legal/TERMS-DRAFT.md`

**Checklist:**
- [ ] Privacy policy is live at a public URL
- [ ] Terms of service is live at a public URL
- [ ] Support page or email is reachable (a simple `mailto:help@letmecheck.com`
      link on a webpage works)
- [ ] Privacy policy URL is entered in App Store Connect (H-01)
- [ ] If you used temporary Google Doc URLs, swap them for the real `lmc.app`
      URLs in `lmc-app/app/(seeker)/help.tsx` before final build (the current
      placeholder is `https://lmc.app/privacy`)

---

### H-06: Create the demo reviewer account and seed it

Apple reviewers are in Cupertino, California. The app only shows active venues
in Miami and New York. Without a demo account, the reviewer will see "no
coverage in your area" and reject the app as having nothing to do.

**This takes three steps.**

**Step 1: Create two demo sign-in accounts.**

Go to Supabase dashboard (https://supabase.com/dashboard/project/cawqasszfbzvbtunamda)
and navigate to Authentication -> Users -> Add user (or sign up in the app
using email). Create:

- Seeker demo account: `reviewer@letmecheck.demo` with a strong password
- Scout demo account: `scout.reviewer@letmecheck.demo` with a strong password

After creating them, note down both UUIDs (shown in the Users table next to
each email).

**Step 2: Seed the Seeker's check history.**

Open the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
Open the file `scripts/seed-demo-account.sql` from this project.
Paste the contents into the SQL editor.
Replace the two placeholder values at the top:
- `PASTE-SEEKER-UUID-HERE` with the Seeker account's UUID
- `PASTE-SCOUT-UUID-HERE` with the Scout account's UUID

Then click Run. You should see a "Demo seed complete" notice at the bottom.

If you have a real Mux playback ID from a previous test delivery, add it to
the clip row so the reviewer can actually watch a video. See the instructions
in the SQL file (OPTION A vs OPTION B).

**Step 3: Paste these review notes into App Store Connect.**

In App Store Connect -> your app -> App Review Information -> Notes, paste
the following block exactly:

---

```
Let Me Check is an on-demand visual verification marketplace. Seekers pay for a 
15-second video of any location filmed by a nearby Scout (an independent 
contractor who is physically at the location).

DEMO ACCESS
To see the full delivered-check experience, sign in as the demo Seeker:

  Email: reviewer@letmecheck.demo
  Password: [FILL IN YOUR CHOSEN PASSWORD HERE]

  After signing in, tap the History tab. You will see one completed check. 
  Tap it to open the Delivery screen and watch the video.

To browse the Scout side of the app:

  Email: scout.reviewer@letmecheck.demo
  Password: [FILL IN YOUR CHOSEN PASSWORD HERE]

  After signing in, tap "I'm a Scout" on the splash screen. 
  You will see the Scout dashboard with the online/offline toggle and 
  earnings history.

PAYMENT NOTES
Seeker-to-Scout payments are processed by Stripe (not Apple In-App Purchase). 
Let Me Check is an on-demand real-world service -- a Scout physically travels 
to a location and films it. Under App Store Review Guideline 3.1.3, real-world 
services (equivalent to ride-hailing, food delivery, or on-demand labor 
marketplaces) are explicitly exempt from the IAP requirement. Stripe is the 
correct payment method for this type of service.

LOCATION NOTE
The app is location-dependent. Active coverage is currently in Miami and New 
York. The demo Seeker account above has a pre-completed check so you can see 
the full delivery experience without needing to be in a covered area. A live 
end-to-end check requires two devices: one Seeker and one Scout who is 
physically near the requested location.
```

---

**Remember:** Replace `[FILL IN YOUR CHOSEN PASSWORD HERE]` with the actual
passwords you set. Never commit those passwords to the code repository. Put
them only in the App Review Notes field in App Store Connect.

---

### H-07: APNs key (push notifications)

Good news: nothing to do here. The APNs key is already configured.

The `.p8` API key file at `/Users/troyreed/.private_keys/AuthKey_XPS8JFNPFY.p8`
is set up in the build config. When you run the EAS build command (H-08), it
will pick this up automatically. No manual certificate or key generation needed.

The Supabase Vault already has the push credentials set from Phase 10.

- [ ] Confirm the `.p8` file still exists at the path above (quick check:
      `ls /Users/troyreed/.private_keys/AuthKey_XPS8JFNPFY.p8`)

---

### H-08: Build and submit via EAS

Once H-01 through H-07 are done (especially the screenshots and the hosted
privacy policy URL), run these two commands from your terminal.

**Navigate to the app folder first, then run the build:**

```
cd /Users/troyreed/studio/projects/let-me-check/lmc-app

eas build -p ios --profile production
```

This sends the code to Expo's build servers. It takes about 15 to 20 minutes.
The build number increments automatically (you do not need to change anything
in the code). Version 1.0.0 is set in `app.config.js`.

**After the build finishes, submit it:**

```
eas submit -p ios --profile production --latest
```

This sends the finished build to App Store Connect. All your Apple credentials
are already in the config file -- you will not be asked to enter them manually.

After submit completes, go to App Store Connect -> TestFlight.
Your build will appear there within a few minutes.

**Do H-09 before submitting for App Review.**

---

### H-09: TestFlight first (strongly recommended)

Before you tap "Submit for Review" in App Store Connect, distribute the build
to yourself and two or three friends via TestFlight. This catches problems that
only show up on a real device (not the simulator):

- [ ] Camera permission prompt -- does it appear, and does the wording make sense?
- [ ] Location permission prompt -- does it appear, and is the wording clear?
- [ ] Push notification permission prompt -- does it appear at the right moment?
- [ ] Does the app launch without crashing on a real iPhone?
- [ ] Does the "no coverage in your area" banner appear outside Miami/New York?
- [ ] Does the delete-account flow actually delete the account and sign you out?

TestFlight distribution does not go through Apple review -- it goes live in
minutes. Anyone with your Apple Developer team access can be a tester.

Once you are happy with the TestFlight build, go to App Store Connect and
click "Submit for Review."

---

### H-10: Stripe live mode (gated -- do this after the LLC is ready)

**You do not need live Stripe to submit to Apple or to TestFlight.** The app
runs fine in Stripe test mode for the reviewer -- they are using the seeded
demo account, which has no real payment flow.

When the Delaware LLC and EIN are ready, flip Stripe to live mode. Here is
how:

**The exact steps to flip Stripe live:**

1. Go to the Stripe Dashboard and switch from Test Mode to Live Mode.
2. Generate your live `STRIPE_SECRET_KEY` (starts with `sk_live_`) and
   `STRIPE_PUBLISHABLE_KEY` (starts with `pk_live_`).
3. Go to Supabase Vault:
   Dashboard -> Project Settings -> Vault
   Update these two secrets:
   - `STRIPE_SECRET_KEY` -- replace the test key with the live key
   - `STRIPE_WEBHOOK_SECRET` -- get a new webhook secret for the live mode
     webhook endpoint (set it up in Stripe Dashboard -> Webhooks -> Add endpoint)
4. Go to EAS Dashboard (expo.dev):
   Your project -> Environment Variables -> production
   Update `STRIPE_PUBLISHABLE_KEY` to the live key.
5. Rebuild and resubmit with `eas build -p ios --profile production` and
   `eas submit`.

**No code changes are needed.** The code reads these values from environment
variables. Swapping the keys in the vault and EAS is the entire flip.

---

## Quick pre-submission checklist

Before you submit for App Review, run through this fast check:

- [ ] All screenshots taken on a clean build (no dev badges, no dev sections)
- [ ] Privacy policy URL is live and working (paste the URL in a browser to confirm)
- [ ] Terms URL is live and working
- [ ] Demo Seeker account (`reviewer@letmecheck.demo`) can sign in and see a
      delivered check in History
- [ ] Demo Scout account (`scout.reviewer@letmecheck.demo`) can sign in and see
      the Scout dashboard
- [ ] The "Delete Account" option is visible in the Profile screen (required by Apple)
- [ ] App Review notes are filled in with the demo credentials and the Stripe
      exemption explanation (H-06)
- [ ] TestFlight build tested on at least one real iPhone (H-09)
- [ ] `.p8` key file is at the expected path (H-07)
- [ ] No dead buttons in the shipped build (membership and invite screens are
      hidden, not broken)

---

## Support

Questions about these steps: help@letmecheck.com
Expo build help: https://docs.expo.dev/build/introduction/
App Store Connect help: https://developer.apple.com/help/app-store-connect/
