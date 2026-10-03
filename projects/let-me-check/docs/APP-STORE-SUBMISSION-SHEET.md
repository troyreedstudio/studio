# Let Me Check — Paste-Ready Submission Sheet

> Open this next to App Store Connect and copy each block into the matching field. Order follows the ASC flow. Created 2026-10-03.

---

## A. App information / Version metadata

**Name** (≤30)
```
Let Me Check
```

**Subtitle** (≤30)
```
Know before you go
```

**Promotional text** (≤170 — editable anytime, no review)
```
See any place before you go. Tap a spot, a real person nearby films a live 15-second video, and you know exactly what it's like right now. Don't guess. Let Me Check.
```

**Keywords** (≤100, comma-separated, no spaces)
```
live,video,verify,check,real time,scout,nearby,queue,line,busy,crowd,before you go,local,on demand
```

**Description** (≤4000)
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

**Support URL:** `https://letmecheckapp.com`
**Marketing URL:** `https://letmecheckapp.com`

---

## B. Screenshots
Upload the 6 files (6.9", 1320×2868) from:
`projects/let-me-check/marketing/app-store-screenshots/final/`
Order: `01-hero → 02-beach → 03-vibe → 04-dmv → 05-guarantees → 06-globe`
(Drag them into the **6.9" Display** slot; ASC auto-scales for smaller iPhones.)

---

## C. Build
Select **build 44** (the TestFlight build from today, with the onboarding fixes + Stripe **test** keys). If it's still "Processing," wait for it to finish then select it.

---

## D. General App Information
- **Primary category:** Lifestyle
- **Secondary category:** Travel
- **Age rating:** answer the questionnaire → expect **17+** (user-generated live video). This is the safe answer for a UGC video app; 12+ is defensible given the moderation but 17+ avoids a rating dispute. Answer "None" to all mature-content items; the UGC safeguards cover it.

---

## E. App Privacy (Data collection questionnaire)
Answer **"Yes, we collect data."** For every item below: **Linked to the user = Yes**, **Used for tracking = NO**, **Purpose = App Functionality** (Product Interaction may also tick Analytics).

Tick these data types:
- Contact Info → **Name**, **Email Address**, **Phone Number**
- Location → **Precise Location**
- User Content → **Photos or Videos**, **Other User Content** (ratings/reports)
- Financial Info → **Payment Info** (via Stripe)
- Identifiers → **User ID**, **Device ID** (push token)
- Usage Data → **Product Interaction**

Do **NOT** tick: any "Tracking," advertising data, crash/analytics-SDK data (there are none).

---

## F. Export compliance / Encryption
- "Does your app use encryption?" → **Yes**
- "Does it qualify for the exemption?" → **Yes** (uses only standard HTTPS/TLS)
- Result: no CCATS / no annual report needed.
- (Optional: add `ITSAppUsesNonExemptEncryption = NO` to the app config so this stops being asked each build.)

---

## G. App Review Information (CRITICAL — paste into "Notes")
**Sign-in:** First name / Last name / your contact phone + email as prompted.

**Notes field — paste this:**
```
Let Me Check is an on-demand visual verification marketplace. A "Seeker" requests a short 15-second video of a real place; a nearby "Scout" films and delivers it. One account can be both.

TEST LOGIN (no real SMS needed):
- Method: Phone
- Number: +1 (305) 555-0100
- Code: 123456

SEE THE CORE FLOW (Seeker):
1. Choose your profile → Seeker + Scout → Continue.
2. Sign in with Phone using the number and code above.
3. On the globe home, tap the recent "Soho House Hotel" (or search any place).
4. Choose Standard ($15) → Request Check.
5. At payment use Stripe TEST card 4242 4242 4242 4242, any future expiry, any CVC/ZIP. The request moves to "Finding a Scout."

SEE A DELIVERED VIDEO:
This is a live marketplace that needs a real person on location, so we pre-loaded one completed check on this test account. Open it in Activity / History to view the delivered clip, the GPS-verified / faces-blurred badges, and the rating screen.

PAYMENTS: This is a real-world physical service (a person travels and films on location), so payment is via Stripe, not In-App Purchase (Guideline 3.1.3(e)). The review build runs in Stripe test mode.

SAFETY (UGC): Clips are wide shots of public places, not people; faces are auto-blurred before delivery; clips are GPS-verified and auto-rejected/refunded if off-location; every check has a report control; an Acceptable Use Policy is agreed at sign-up.

PERMISSIONS: Location = find nearby places + match Scouts. Camera = only while a Scout films. Clips are silent (no microphone).
```

---

## H. Final pre-submit checks
- [ ] Screenshots uploaded (6)
- [ ] Build 44 selected
- [ ] Privacy questionnaire done (§E)
- [ ] Encryption = exempt (§F)
- [ ] Review notes pasted + test login entered (§G)
- [ ] (Recommended) open the test account's completed check once and confirm the Bangkok clip plays
- [ ] Hit **Add for Review → Submit**

Stays on Stripe **test** for review. Flip to **live** only after approval (new build with live publishable key). See [[project_lmc_launch_readiness]], [[project_lmc_appstore_screenshots]], APP-STORE-REVIEW-PACK.md.
