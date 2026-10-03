# Let Me Check — Google Play (Android) Submission Plan

> Work top to bottom. Most content is reused from the iOS submission; Android-specific items are flagged. Created 2026-10-03 (evening), for a morning run.
> ✅ = asset/answer ready · ⚙️ = you do it (build/dashboard) · ❓ = decision to confirm first

---

## 0. Confirm first (5 min)
- ❓ **Which Play account?** Pink Pineapple is already live on Google Play — LMC can go under that **same established Play Console account** (sign in at play.google.com/console). Using the established account matters because…
- ❓ **New-app testing rule:** Google forces *brand-new personal* developer accounts (created after Nov 2023) to run **14 days of closed testing with 12+ testers** before production. An **established/organization** account (like Pink Pineapple's) is typically **exempt** → you can go straight to production or a quick internal test. Confirm in Play Console which applies — it's the single biggest timeline factor.
- ✅ **Payments:** same as iOS — real-world service → **Stripe, not Google Play Billing** (Google's physical-services exception). Keep the build on **Stripe TEST keys** for review; flip to live post-approval (see §6).

---

## 1. Build the Android app ⚙️
Package is already set: `com.blackmalibuinc.letmecheck`. Adaptive icons already configured.

1. In `lmc-app/`, run:
   ```
   npx eas-cli build -p android --profile production
   ```
2. When prompted about a signing keystore for this new app → **let EAS generate & manage it** (easiest; Google Play App Signing handles the rest).
3. ⚙️ Minor: `eas.json`'s `production` profile only lists `ios`. EAS will still build Android with defaults (an `.aab`), but for clarity you can add:
   ```json
   "production": { "android": { "buildType": "app-bundle" } }
   ```
4. Output = an **`.aab`** file (Android App Bundle) — that's what you upload to Play.

---

## 2. Test on Android — THE real work ⚙️
Everything so far was validated on iOS. Run the app on an **Android device or emulator** (EAS can also give an install link) and confirm:
- [ ] Phone sign-in (OTP) — and Google sign-in (native on Android)
- [ ] Location permission + the **Mapbox globe renders** (check the Android Mapbox token works)
- [ ] Request a check → **Stripe PaymentSheet** with test card `4242 4242 4242 4242`
- [ ] Open the seeded check → **Mux video plays** (same backend/account as iOS — the Bangkok demo clip works here too)
- [ ] Scout filming → **camera** works
- [ ] App doesn't crash on launch / cold start

This is where Android-only issues surface (map token, permissions, camera). Budget the most time here.

---

## 3. Play Console — create app + store listing ⚙️
**Create app:** name "Let Me Check", default language English (US), type **App**, **Free**.

**Store listing (paste-ready):**

- **App name** (≤30):
  ```
  Let Me Check
  ```
- **Short description** (≤80) ✅:
  ```
  See any place before you go — a real person films it live, in minutes.
  ```
- **Full description** (≤4000) ✅ — reuse the iOS copy:
  ```
  Know before you go.

  Let Me Check shows you what any place is really like — right now — through the eyes of a real person on the ground. Wondering if the bar is packed, the beach is crowded, the line at the DMV is out the door, or the restaurant is worth the trip? Don't guess. Let Me Check.

  HOW IT WORKS
  1. You seek — search any place and choose how fast you want it.
  2. A Scout films it — a verified person nearby records a real 15-second video on the spot, GPS-stamped so you know it's genuine.
  3. You see it — the live video lands on your phone in minutes. See it before you go.

  WHY PEOPLE LOVE IT
  • Real, live video — not old reviews or stale photos
  • Delivered in minutes by someone actually there
  • GPS-verified and faces auto-blurred for privacy
  • Works for anywhere: bars, restaurants, beaches, gyms, stores, queues, events, travel

  BECOME A SCOUT — EARN ON YOUR SCHEDULE
  Already out and about? Turn your phone into income. Accept nearby requests, film a quick 15-second clip, and get paid. No car, no shifts, no boss — just your phone.

  You're only charged when your video is delivered. Know before you go, anywhere.
  ```

**Graphics (all prepped in `marketing/app-store-screenshots/android/`):**
- ✅ **App icon** 512×512 → `play-icon-512.png`
- ✅ **Feature graphic** 1024×500 (required by Play) → `feature-graphic-1024x500.png`
- ✅ **Phone screenshots** (2:1-compliant, 1344×2688) → `01-hero … 06-globe` *(our iOS ones were 2.16:1, which Play rejects; these are padded to exactly 2:1)*

**Category:** App category = **Lifestyle** (or Travel & Local). Tags: optional.

---

## 4. Play Console — the questionnaires ⚙️

**Content rating (IARC questionnaire):** answer honestly → all **No** for violence/sexual/profanity/drugs/gambling; **Yes** for user-generated content; **No** for user-to-user messaging; **No** for sharing location socially. Lands around **Teen / PEGI 12** — fine.

**Data safety form** ✅ (mirror the iOS privacy answers):
- **Does the app collect/share user data?** → Collect **Yes**, Share **No** (Stripe/Mux are processors acting on our behalf, not third-party sharing).
- **Data types collected** (all **collected, linked to user, purpose = App functionality**, not for ads/tracking):
  - Personal info: **Name, Email, Phone number**
  - Location: **Precise location**
  - Photos/Videos: **the clips**
  - Financial info: **Payment info** (via Stripe)
  - App activity: **Product interaction**
  - Identifiers: **User ID, Device ID**
- **Encrypted in transit?** → **Yes**
- **Can users request data deletion?** → **Yes** (in-app account deletion exists)

**Ads:** "Does your app contain ads?" → **No**.

**Target audience:** 18+ (or 13+). Not directed at children.

**App access (reviewer login)** — paste into the "All functionality is available with restrictions / provide instructions" box:
```
Sign in with Phone. Test number: +1 305-555-0100, code: 123456 (test line, no real SMS).
To see a delivered video: after signing in, go to Activity → open the completed check (it's pre-seeded) → tap play on the clip.
To test a purchase: request a check, then at payment use Stripe TEST card 4242 4242 4242 4242, any future expiry/CVC/ZIP.
Payments use Stripe (real-world physical service), not Google Play Billing. Clips are wide shots of public places; faces are auto-blurred; GPS-verified.
```

**Privacy policy URL:**
```
https://letmecheckapp.com/privacy
```

---

## 5. Release ⚙️
1. **Pricing & distribution:** Free; select countries (US at minimum for the Miami launch — or worldwide).
2. Choose a track: with an **established account** → you can push to **Production** (or do a quick **Internal testing** release first to sanity-check the .aab on a device — recommended, 10 min).
3. **Upload the `.aab`** to the release.
4. Complete any remaining "Dashboard" tasks Play flags (it shows a checklist like Apple did).
5. **Send for review.** Google review is often faster than Apple (hours–couple of days), though a first app on the account can take longer.

---

## 6. Post-approval (same gotcha as iOS)
The build is on **Stripe TEST keys**. Before real users:
- Flip Stripe to **live** (backend secret + live webhook) **and** ship a new build with the live publishable key → re-submit that build → then roll out.
- Keep the first production rollout **staged/held** until the live-keys build is ready (Play supports staged rollout %).

---

## Reused vs new — quick map
- **Reused:** codebase, store copy, privacy policy, demo check (same Supabase backend), test login, compliance logic (Stripe-not-billing, UGC safety).
- **New (all prepped tonight):** `.aab` build, 512 icon, feature graphic, 2:1 screenshots, Data Safety form, IARC content rating.
- **Only real unknown:** Android device testing (§2).

Assets: `marketing/app-store-screenshots/android/`. See also [[project_lmc_appstore_submission]], APP-STORE-REVIEW-PACK.md.
