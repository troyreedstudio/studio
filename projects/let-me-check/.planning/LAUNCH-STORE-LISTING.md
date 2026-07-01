# App Store + Google Play listing — ✅ APPROVED (2026-07-01)

Troy approved the name, subtitle, description, and category. Screenshots + support/privacy URLs still to gather.

Universal positioning (NOT nightlife-only). Taglines: "Know Before You Go." / "Real Eyes. Right Now. Anywhere."

---

## App name
**Let Me Check**  *(12 chars — fits Apple's 30 + Google's 30)*

## Subtitle / short tagline
- **Apple subtitle** (≤30): `Know before you go, anywhere`
- **Google short description** (≤80): `Pay a real person to film a 15-sec video of any place — delivered in minutes.`

## Promotional text (Apple, ≤170, updatable anytime)
`Wondering what a place is really like right now? Pay someone on the ground to film a 15-second video — GPS-verified, faces blurred, delivered in minutes.`

## Full description (both stores)
> **Know before you go.**
>
> Ever wanted real eyes on a place before you show up? Let Me Check connects you with a real person on the ground — a Scout — who films a quick 15-second video of any location and sends it straight to you, usually within 7–10 minutes.
>
> Long line at the DMV? Is the beach club actually busy? What's the vibe at that restaurant right now? Is the apartment as nice as the photos? Don't guess — check.
>
> **How it works**
> 1. Search for any place
> 2. A nearby Scout accepts and films a live 15-second video
> 3. Watch it, delivered to your phone in minutes
>
> **Real, right now**
> • Filmed live and GPS-verified — no stock footage, no old clips
> • Faces are automatically blurred for privacy
> • See exactly what's happening on the ground, the moment you need it
>
> **Earn as a Scout**
> Already out and about? Become a Scout, accept nearby requests, film short clips, and get paid — straight to your bank.
>
> Real eyes. Right now. Anywhere.

## Keywords (Apple, ≤100 chars, comma-sep, no spaces)
`check,verify,live video,scout,know before you go,real time,location,line,wait,busy,vibe,on demand`

## Category
- Primary: **Lifestyle** · Secondary: **Travel**

## Screenshots — shot list (caption overlays)
1. Home / search map → **"Search any place, anywhere"**
2. Delivery screen w/ the video → **"Real video, delivered in minutes"**
3. Waiting screen (red hero + clock) → **"Track your check live"**
4. GPS-verified badge on a clip → **"GPS-verified. Filmed live. Faces blurred."**
5. Scout earnings → **"Out and about? Get paid to film."**
   *(Apple needs 6.7" + 6.5"; Google needs phone set. I'll capture from the device once we're on the final build.)*

## Still needed from Troy
- **Support URL** + **Marketing URL** (a simple landing page or even a linktree works)
- **Support email** (help@letmecheck.com?)
- Confirm **age rating** answers (does it show user-generated video? yes → likely 17+ or a content note)
- **Privacy**: the in-app policy is wired; the store also needs a hosted privacy URL + the data-collection declarations (I'll fill the declaration; you host the policy page)

---
## BUILD STATUS — resume point (2026-07-01, evening)
- ✅ Android production build FINISHED (`.aab`) — build `c95c2929`. Play submission NOT done (needs Play Console app + service-account key, or manual .aab upload).
- 🍎 iOS builds #1/#2/#3 (`34e97ec8`, `f71278c4`, `72aa2089`) all ERRORED — root cause: `XCODE_BUILD_ERROR`, the auto-generated provisioning profile (June 13) predated the Apple Pay + Push + Sign-in-with-Apple capabilities, so signing failed.
- 🔧 FIX applied: (a) deferred Apple Pay post-v1 — removed `merchantIdentifier` from the Stripe plugin (app.config.js), the payment sheet (payment.tsx), and StripeProvider (_layout.tsx); card + Google Pay remain. (b) Regenerated the iOS provisioning profile by running the build with `EXPO_ASC_API_KEY_PATH`/`EXPO_ASC_KEY_ID`/`EXPO_ASC_ISSUER_ID` **plus `EXPO_APPLE_TEAM_ID=YNCLWQN2B8`** — the Team ID was the missing piece that let EAS authenticate + regenerate the profile (new profile `M4B2Y3MR29`) non-interactively.
- 🍎 iOS build **`714259fe` FINISHED GREEN (2026-07-01 ~23:48)** — auto-submit to TestFlight scheduled. Getting there took stripping THREE capabilities the profile lacked: Apple Pay (removed), Sign in with Apple (regenerated into profile), Push (deferred). The Push one was stubborn: commenting out expo-notifications wasn't enough — something in the dep graph re-injected `aps-environment`, so a config plugin `plugins/withoutApsEnvironment.js` strips it (verified via local `expo prebuild` before building). Builds da7afc22/551ff04e/2a86d7fa all errored on Push before this.
- ⏳ Next: confirm `714259fe` lands in TestFlight (Apple processing ~5-15 min after submit) → install on device. Fill App Store Connect export-compliance + test notes (Sasha's checklist). Then set up Play submission.
- 🔁 Fast-follows before PUBLIC launch: (1) Apple Pay — create merchant ID in Apple portal, restore the 3 configs. (2) Push — un-comment expo-notifications + remove withoutApsEnvironment plugin, run `eas credentials -p ios` interactively once to make the APNs key, rebuild.
- EAS: `owner troyreed26`, ascAppId 6764298662, appleTeamId YNCLWQN2B8 (Pink pineapple App LLC), all 6 env vars registered in EAS production.
