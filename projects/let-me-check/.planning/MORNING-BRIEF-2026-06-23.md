# Morning Brief — 2026-06-23

Good morning, Troy. Here's where things stand and what to do next.

## TL;DR
The **entire beta build is done and on your phone**, the **core loop is tested end-to-end and works** (request → pay → countdown → on-device-blurred delivery → rate), and **everything is committed + pushed to GitHub** (synced). A handful of money/push tests + the Apple submission steps remain — none are code-blocked.

## Built + deployed (all 5 beta phases)
- **7 SLA + money** — real deadlines, auto-expire sweeper, Trouble-Here refund, real Scout earnings/payout (live)
- **8 On-device blur** — faces blurred on the phone before upload (proven end-to-end on device)
- **9 Verified badge + Scout identity + reconnects** — real GPS-verified badge, real Scout, fake AI/crowd removed, screens persist (live)
- **10 Push notifications** — token + triggers deployed (push *delivery* needs the APNs key on an EAS build)
- **11 Apple readiness** — account deletion (live, tested), dead buttons hidden, privacy links, submission package written

## Tested on device last night — PASSED
On-device blur loop · seeker delivery (hero video + branded poster + Verified badge + real Scout + rating) · Scout filming countdown (resumes after backgrounding) · Seeker waiting countdown · no dead buttons · Delete Account flow · help links · settings persist.

## Real bugs found + fixed while testing
- Delivery stuck on "Processing" → `getCheckClip` + `mux-playback-token` couldn't handle a check with >1 clip (retakes). Fixed (take latest).
- Re-tapping a rating errored → `rateCheck` now delete-then-insert.
- Video was a small thumbnail / green pre-play → hero video + branded "Let Me Check" poster.
- Seeker waiting screen had **no real timer** (old one was fake + removed) → wired a real countdown from the server deadline.
- Settings load-flicker → fixed overnight (hold render until saved data loads).

## Remaining TESTS for today
1. **Money flows** (need a real card hold — quick to set up): capture-on-delivery, Trouble-Here refund, Scout withdraw.
2. **Push notifications**: do an EAS build, accept the one-tap APNs key, then test job-nearby + video-ready (ideally a 2nd device).
3. **Off-fence GPS auto-reject**: re-confirm on the latest build (film >30m from the venue → rejected, no charge).

## Then — Apple submission (human steps)
See `.planning/APPLE-SUBMISSION-CHECKLIST.md`: App Store Connect record + metadata + screenshots (1320×2868), App Privacy labels, demo reviewer account (seed script in `scripts/seed-demo-account.sql`), **host the Privacy/Terms drafts** (`.planning/legal/`) + swap the placeholder `lmc.app` URLs, then `eas build -p ios --profile production --auto-submit`. **Stripe goes live when the Delaware LLC lands.**

## Design work (separate, together)
`.planning/DESIGN-FIXES.md` is your running list — waiting-screen layout + timer font, cross-screen transition consistency, delivery tweaks, etc. This is the color/redesign pass, led by you.

## Housekeeping notes
- `market_config.dispatch_timeout_s` is temporarily **3600** (1hr) for testing convenience — **reset to 300 before submission** (it's on the Apple checklist).
- A couple of pre-existing stray files are untracked (`-oldCLAUDE.md`, `How to start GUY…md`, `docs/VENUE-STRATEGY.md`, `images/`) — not today's work; deal with whenever.
- Overnight verification build result is noted at the top of our chat when you're back.
