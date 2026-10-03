# Let Me Check — App Store Review Pack

> Everything needed to submit to App Store Connect: reviewer notes, data-privacy ("nutrition label") answers, encryption/export compliance, permissions copy, and the UGC/payments compliance story. Last updated 2026-10-03.
> Status legend: ✅ ready to paste · ⚠️ needs Troy to confirm/do before submit.

---

## 0. Quick submit checklist (do these before hitting Submit)
- ✅ **Completed check already seeded** on the reviewer test account (verified in Supabase 2026-10-03: check `94ad459e…`, status `rated`, clip `ready`). Delivery token only needs owner + clip-ready, both true — reviewer will see the video.
- ✅ **Test login valid until January 2027** (Supabase → Auth → Phone → Test numbers; `305-555-0100 / 123456`). No action needed.
- ✅ **Stripe in TEST mode** for review (confirmed by Troy). Reviewer uses card 4242…
- ✅ **No third-party analytics/ad/crash SDK** (confirmed) — do not declare Crash/Analytics-SDK data.
- ✅ **No microphone** — clips are silent by design (consent/privacy), filming is video-only. Omit mic permission.
- ✅ Paste reviewer notes (§2), privacy answers (§6), encryption answer (§7).
- ✅ Upload the 6 screenshots from `marketing/app-store-screenshots/final/`.
- ⚠️ ONE last check: open the test account's delivered check once before submit to confirm the Mux clip still plays (free-plan asset longevity).

---

## 1. App overview (reviewer context — paste into "Notes" top)
Let Me Check is an on-demand visual verification marketplace. A user (a "Seeker") requests a short 15-second video of a real-world location — a bar, a restaurant, a beach, a DMV line, anywhere — and a nearby independent person (a "Scout") films and delivers it within minutes, so the Seeker can see a place before travelling there. One account can act as both a Seeker and a Scout. Payments run through Stripe; video is delivered through Mux.

---

## 2. Reviewer notes (paste into App Review "Notes")
**Test login (no real SMS needed):**
- Sign-in method: **Phone**
- Number: **+1 (305) 555-0100**
- Verification code: **123456**

**How to see the core experience (Seeker):**
1. Launch the app, tap **"Choose your profile" → Seeker + Scout → Continue**.
2. Sign in with **Phone**, enter the number and code above.
3. On the globe home, tap the pre-loaded recent **"Soho House Hotel"** (or search any place).
4. Choose a tier (**Standard $15**) and tap **Request Check**.
5. At payment, use Stripe's test card **4242 4242 4242 4242**, any future expiry, any CVC, any ZIP.
6. The request moves to **"Finding a Scout."**

**Seeing a delivered video:** Because this is a live marketplace that depends on a real person filming on location, we have **pre-loaded one completed check on this test account** so you can open it and view the delivered clip, the GPS-verified / faces-blurred badges, and the rating screen. (See the check in **Activity / History**.)

**Scout side:** From the profile you can switch to **Scout**. Going "online" to accept paid jobs requires completing Stripe Connect payout onboarding (standard for a payouts marketplace) — this is expected behaviour, not a bug.

**Permissions:** Location is used to find nearby places and match Scouts; Camera is used only while a Scout is actively filming a requested clip. Clips are silent (no audio recorded).

---

## 3. ✅ Demo content — seeded with a proper venue clip
The test account (`+13055550100`, user `a02e00ac…`) has a completed check (`94ad459e…`, status `rated`) whose clip now streams a **real venue clip** (dark Bangkok rooftop bar + city skyline, silent, no identifiable faces) — uploaded to Mux as a signed asset 2026-10-03, playback id `BodHjdrWWw2CpVQ5Fw01OEQfPvT6eh5ZuJyD0100SfqYDQ`, verified same Mux environment as the signing key (so it authorizes/plays). This replaced the earlier placeholder (a person in a bedroom) which would have contradicted the "places not people / faces blurred" rules. The reviewer opens it in **Activity / History**. (Check `venue_id` is null → title may show generic; not blocking.)

---

## 4. Payments — why Stripe, not In-App Purchase (Guideline 3.1.1 / 3.1.3(e))
Let Me Check sells a **real-world physical service** — a person physically travels to a location and films it. Under App Store Review Guideline 3.1.3(e) and 3.1.1, physical, real-world services (like ride-share, food delivery, or on-demand errands) are **paid outside of In-App Purchase**. Stripe is the correct and compliant processor here; Apple IAP is for digital goods consumed in-app, which this is not. The Scout is paid out via Stripe Connect.

For review, the app runs in **Stripe test mode** so the reviewer can complete a purchase with the test card. Live keys are switched on at public launch.

---

## 5. User-generated content safety (Guideline 1.2) — the safeguards
Let Me Check is a UGC/video marketplace, so these protections are in place and should be highlighted:
- **Content is places, not people.** Clips are wide shots of public locations; the product rules forbid filming identifiable individuals, private property, interiors of homes, courtrooms, hospitals, schools, and "no photography" zones.
- **Faces are auto-blurred** before a clip reaches the Seeker.
- **GPS-verified:** clips are geofenced to the requested location and auto-rejected/refunded if off-location.
- **Acceptable Use Policy** is agreed to at sign-up; abusive use can suspend an account.
- **Reporting:** every delivered check has a **"Something wrong with this check?"** report control.
- **Silent clips** (no audio captured).
- A published content policy, Terms, Privacy Policy, and AUP are live at letmecheckapp.com.

---

## 6. App Privacy — data collection answers (App Store Connect "App Privacy")
No data is used for **Tracking** (the app contains no advertising or cross-app tracking SDKs). All items below are **linked to the user's identity** and used for **App Functionality** (and, where noted, Analytics) only.

| Apple data type | Collected? | Linked to user | Tracking | Purpose |
|---|---|---|---|---|
| **Name** | Yes | Yes | No | App Functionality (account) |
| **Email address** | Yes (if Apple/Google used) | Yes | No | App Functionality (account) |
| **Phone number** | Yes (if phone sign-in) | Yes | No | App Functionality (account, SMS OTP) |
| **Precise location** | Yes | Yes | No | App Functionality (dispatch + geofence verification) |
| **Photos or videos** (the clips) | Yes | Yes | No | App Functionality (deliver the requested clip) |
| **Other user content** (ratings, reports) | Yes | Yes | No | App Functionality |
| **Payment info** | Yes (via Stripe) | Yes | No | App Functionality (process payment/payout) |
| **Sensitive info** — Scout KYC: legal name, DOB, gov ID, bank (via Stripe Connect) | Yes (Stripe-handled) | Yes | No | App Functionality + Legal (payouts/KYC) |
| **User ID** | Yes | Yes | No | App Functionality |
| **Device ID / push token** | Yes | Yes | No | App Functionality (notifications) |
| **Product interaction** (in-app events) | Yes | Yes | No | Analytics + App Functionality |

Notes:
- Payment card numbers and Scout bank/ID details are **collected and stored by Stripe**, not by Let Me Check; we do not retain full card or ID numbers. Still declared above because the Stripe SDK collects them in-app.
- ✅ No third-party crash/analytics SDK (confirmed) — do **not** declare Crash/Performance/Analytics-SDK data. The app uses an in-house event log only (declared as Product Interaction).

---

## 7. Encryption / export compliance
- Does your app use encryption? **Yes** — but only **standard encryption** (HTTPS/TLS) provided by the OS.
- Qualifies for the **exemption** under Category 5 Part 2 (uses only standard/exempt encryption). **No CCATS or annual self-classification report required.**
- In `Info.plist` / app config set **`ITSAppUsesNonExemptEncryption = NO`** so App Store Connect stops asking each build.

---

## 8. Permissions — Info.plist usage strings (recommended copy)
- **NSLocationWhenInUseUsageDescription:** "Let Me Check uses your location to find places to check near you and to match Scouts to requests nearby."
- **NSCameraUsageDescription:** "Let Me Check uses the camera so Scouts can film the short verification clip you requested."
- **NSMicrophoneUsageDescription:** ✅ NOT required — clips are silent by design (you can't publish someone's voice without consent), filming is video-only. Do not request mic permission.
- **NSPhotoLibraryUsageDescription** (only if the app saves/shares clips to Photos): "Let Me Check lets you save or share your delivered clip."

---

## 9. Age rating (App Store Connect questionnaire)
Likely **12+**. It is a UGC app showing real-world video of public places; there is no objectionable content by design (places not people, faces blurred, moderated, reportable). Answer "None/Infrequent" to the mature-content questions; the UGC safeguards in §5 cover Apple's concern. If the questionnaire pushes to 17+ because of "Unrestricted Web Access / UGC," that is acceptable — but 12+ should hold given the moderation controls.

---

## 10. Open items — status (as of 2026-10-03)
1. ✅ Completed check seeded on the test account (verified in Supabase).
2. ✅ Test login valid until January 2027.
3. ✅ No third-party analytics/ad/crash SDK (confirmed).
4. ✅ No mic permission (silent clips, video-only).
5. ✅ Review build on Stripe test mode (confirmed).
6. ⚠️ ONLY remaining: open the test account's delivered check once to confirm the Mux clip still streams before hitting Submit (free-plan asset longevity). Everything else is ready.

See also: [[project_lmc_launch_readiness]], [[project_lmc_app_pricing_decision]] (LAUNCH-CHECKLIST.md), [[project_lmc_appstore_screenshots]].
