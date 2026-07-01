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
## BUILD STATUS — resume point (2026-07-01, ~14:45)
- ✅ Android production build FINISHED (`.aab`) — build `c95c2929`. Play submission NOT done (needs Play Console app + service-account key, or manual .aab upload).
- 🍎 iOS build #1 (`34e97ec8`) ERRORED early (~3 min). Re-fired as `f71278c4` (auto-submit to TestFlight scheduled). Android succeeded from same project → code is fine; likely transient.
- ⏳ On return: check TestFlight for iOS (v1.0.0). Fill App Store Connect export-compliance + test notes. If iOS errored again, pull logs at expo.dev/accounts/troyreed26/projects/lmc-app/builds and diagnose. Then set up Play submission.
- EAS: `owner troyreed26`, ascAppId 6764298662, all 6 env vars registered in EAS production, eas.json `_env_setup` key removed (it broke the CLI).
