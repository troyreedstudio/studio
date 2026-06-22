# LMC — Device Test Checklist (Beta build, Phases 7-11)

Run on the all-in-one Release build. Tick each. Most need a re-armed test job (dispatch_timeout is back to 300 = 5 min, so jobs expire — Guy can re-arm or temporarily widen it during the session).

Note: full two-sided tests (push between two devices, seeker watching a scout's clip) need either two devices/accounts or Guy reassigning a check. Flag those to Guy as you reach them.

---

## Phase 8 — On-device blur (already verified ✅)
- [x] Film a face → submit → delivered clip is blurred (square, proportional). DONE.
- [ ] (optional) Re-confirm a distant face also blurs cleanly.

## Phase 7 — SLA + money
- [ ] **Real countdown:** accept a job → the filming countdown shows real time left; background the app + reopen → it resumes (does NOT reset to 7/10 min).
- [ ] **Trouble-Here:** on the filming screen tap a "Trouble Here" reason → it confirms only after the server responds → check the Stripe test dashboard: the Seeker hold is cancelled + the Scout got the no-fault transfer (~$3).
- [ ] **Auto-expire:** accept a job, let it sit past the deadline without filming → within ~1 min it flips to no_scout and the hold is released (check backend / no charge).
- [ ] **Scout earnings:** Earnings screen shows real numbers (not the old fake bar chart); tap Withdraw → real payout flow (Stripe test).

## Phase 9 — Verified badge + Scout identity + reconnects
- [ ] **Verified badge:** a delivered, GPS-verified clip shows "✓ Verified" on the delivery screen; (a non-verified one should NOT show it).
- [ ] **Real Scout:** delivery screen shows a real Scout name/rating, NOT "Jake C." (needs viewing a delivered check as the Seeker — Guy may reassign one to your account).
- [ ] **No fake tags:** the old "AI Verdict" + "Crowd Report" tags are GONE from delivery.
- [ ] **Reconnects persist (restart the app between each):** Notifications toggles, Preferred Cities, and Profile stats (real check count + spent + avg rating) all survive an app restart.
- [ ] Saved places + recurring screens still work (were already wired).

## Phase 10 — Push notifications (needs APNs key on the build + ideally 2 devices)
- [ ] On first login, the app asks for notification permission.
- [ ] **Job-nearby:** when a job dispatches near an online Scout → Scout gets a push. (2-device or Guy triggers.)
- [ ] **Video-ready:** when a check is delivered → the Seeker gets a push.
- [ ] A notification category turned OFF in settings does not push.

## Phase 11 — Apple-readiness
- [ ] **No dead buttons:** Membership + Invite are not reachable; Search "use my location" works; no leftover dev/blur test buttons anywhere.
- [ ] **Delete Account:** Profile → Delete Account → confirm → account is deleted + you're signed out. (Use a throwaway account! This is real deletion.)
- [ ] **Help links:** Privacy / Terms / Support links open (placeholder URLs for now).
- [ ] General stability: run the core Seeker + Scout flows start to finish, no crashes.

---

## Known/expected
- Blur shape is a square (soft oval deferred — works, just aesthetics).
- Push delivery only works once the APNs key is added on an `eas build` (Guy's checklist).
- Stripe is in TEST mode (live gated on the Delaware LLC).
- filming.tsx is long (695 lines) — internal cleanup TODO, no user impact.

## After testing → Apple submission
See `.planning/APPLE-SUBMISSION-CHECKLIST.md` for the human steps (App Store Connect, screenshots, demo account, privacy URLs, EAS build + submit).
