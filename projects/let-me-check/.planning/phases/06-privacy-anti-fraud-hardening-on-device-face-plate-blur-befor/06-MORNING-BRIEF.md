# Phase 6 — Morning Brief (Troy)

*Built overnight 2026-06-22 while you slept. Everything below is committed + pushed to GitHub. Your phone has the latest clean build and works.*

---

## TL;DR (30 seconds)

- **Phase 6 backend is DONE, LIVE, and DORMANT.** The whole privacy + anti-fraud machinery is deployed but switched **off** — nothing changed for users. No clip behaves differently until you flip a switch.
- **On-device face blur hit a real wall** (not a bug): the face-detection library needs a newer minimum iPhone version than we currently support. That's a **product decision for you**, so I did NOT make it — I cleanly removed that piece and left the app working.
- **4 decisions need your yes/no** (below). I built sensible defaults; confirm or change them.
- **Then we do the seeker-side testing** we planned for lunchtime.

---

## What's live now (and safe)

I built the privacy + anti-fraud system **server-side** — it's the part that guarantees the promise *"we never deliver a clip with an unblurred face."* It works like this:

1. When a Scout's clip finishes processing, the server checks it for faces (reusing the same AI we already use for signage).
2. **If face-blur is enabled** and faces are found, the clip is **held** (status "blur review") instead of being delivered — so an unblurred bystander never reaches a Seeker.
3. Separately, the server records **fraud signals** (e.g. signs the Scout faked their GPS) and **flags** suspicious clips for review.

**All of this ships OFF.** I confirmed no market has it enabled. So today the app behaves exactly as it did last night — the safety net is built and waiting, not active.

Everything is tested (40+ automated tests green) and deployed live. The webhook keeps the `--no-verify-jwt` fix from last night (I re-confirmed it returns the right response).

---

## ⚠️ 4 decisions I need you to confirm

I picked a default for each and built to it. Tell me to keep or change:

| # | Decision | My default (built) | The alternative |
|---|----------|--------------------|-----------------|
| **1** | **On-device vs server-side blur** | (blocked — see below) | server-side is built + ready |
| **2** | **If blur can't be confirmed, what happens to the clip?** | **Hold it** (don't deliver an unblurred face) | Deliver it anyway + flag |
| **3** | **When we detect a faked location** | **Flag for review** (don't auto-reject — avoids false accusations at launch) | Auto-reject the clip |
| **4** | **Keep signage AI server-side?** | **Yes** (it works; leave it) | Move on-device |

My defaults are the privacy-safe, false-positive-cautious choices. I think they're right for launch, but they're your calls.

---

## The on-device blur wall (decision #1)

**What happened:** the plan was to blur faces *on the phone before upload* (the most private option — raw footage never leaves the device). I installed the libraries and tried to build it. It **failed**: the face-detection library (`react-native-vision-camera-face-detector`, which uses Google's MLKit) requires a **minimum iPhone OS of ~15.5**. Our app currently supports back to iOS 12.

**Why I stopped:** raising the minimum iPhone version **drops users on older phones** — that's a business call, not a technical one, and it's tied to whether you even want on-device blur. So I didn't decide it for you. I removed the half-built native piece so your app stays clean and building.

**Your options (we'll pick together):**
- **(A) Go on-device:** bump the minimum to iOS 15.5+ (in practice ~95%+ of active iPhones are already on iOS 16+, so the real-world loss is tiny), then I finish + you visually check the blur. Most private.
- **(B) Go server-side:** keep supporting old phones; blur (or hold) happens after upload. **This path is already built and live** — we'd just turn it on. Slightly less private (raw clip transits our video host briefly) but simpler and works on every phone.

My lean: **(B) server-side for launch** (it's done, works everywhere, and the "hold unblurred clips" gate already guarantees the promise), revisit on-device later. But it's your call.

---

## How to turn the privacy gate ON (when you're ready)

One config change enables it for a market — no rebuild:
`market_config.blur_enabled = true` (I'll run it; takes 5 seconds).

Then we run these **manual checks** (need you + a real clip — that's why they're for this morning):
- Film a clip **with a face** → confirm it's **held** (status "blur review"), not delivered.
- Confirm a normal clip (no faces / blur off) still delivers as today.
- Confirm a fraud signal gets recorded + flagged.

---

## Suggested plan for our lunchtime session

1. **5 min:** you confirm the 4 decisions above.
2. **10 min:** if you want blur live, I enable it + we run the 3 manual checks.
3. **Then: the seeker-side testing** we parked — watch a real delivered clip end-to-end + wire the real "Verified" badge (currently a placeholder).

---

## Build status / housekeeping
- All Phase 6 commits pushed to GitHub. App on your phone = latest clean build, boots fine.
- Native blur stack reverted (commits b4227b8 + the overlay revert) — package.json clean, build green.
- Nothing is in a broken or half-finished state. You can demo the app safely as-is.

*— Guy*
