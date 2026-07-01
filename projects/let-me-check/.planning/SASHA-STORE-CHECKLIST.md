# Sasha's plain-English App Store Connect checklist

Everything technical (keys, credentials, connections) is DONE. These are the *form fields* someone needs to fill in App Store Connect once the iOS build lands in TestFlight. Exact answers below — just copy them.

## ✅ Already done (nothing to do)
Apple credentials, Expo login, all backend keys (Supabase/Mapbox/Google), Mux paid plan, Stripe test keys, and **export compliance** (auto-answered in the app now).

## When the iOS build shows up in TestFlight (App Store Connect → TestFlight)

**1. Export Compliance** — should NOT prompt anymore (we auto-answered it). *If* it ever does: choose **"None of the algorithms mentioned above"** / **No** (the app only uses standard HTTPS). No documentation needed.

**2. Test Details / "What to Test"** (only needed for *external* testers; internal testers like you + Troy can install immediately). Paste:
> Test the full flow: search a place, request a check, watch the delivered video. Try both Seeker and Scout modes (switch via the pill in the header). Sign in with Apple or Google. Payments are in TEST mode — use test card 4242 4242 4242 4242.

**3. App Privacy** (App Store Connect → App Privacy — needed before public submission, not for TestFlight). Data collected + "used for App Functionality", **NOT** for tracking/advertising:
- Contact Info: **Email, Name, Phone**
- Location: **Precise Location** (to find nearby Scouts / verify venues)
- Financial Info: **Payment Info** (handled by Stripe)
- User Content: **Photos or Videos** (the verification clips)
- Identifiers: **User ID**
- Everything: purpose = **App Functionality**. Linked to the user: yes. Used for tracking: **No**.

**4. Age Rating** (App Store Connect → the questionnaire). The app shows **user-generated real-world video that isn't pre-moderated**, so expect a **17+** rating. Answer honestly: "Unrestricted Web Access" = No; "User-Generated Content" = Yes → this drives the 17+.

## Still needs Troy/Guy together (NOT now)
- Screenshots (Guy captures from the final build)
- Support URL + privacy-policy URL (host a simple page)
- Google Play submission (service-account key)
- Stripe live keys (go-live switch)

## If the iOS build shows "errored" in Expo
Tell Guy — he'll pull the logs and re-fire it. (Android already built fine, so the code is good.)
