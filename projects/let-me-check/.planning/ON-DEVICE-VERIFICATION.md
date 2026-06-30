# On-Device Verification Pass

The functional audit Troy asked for — **executed on the real phone** (UDID `00008110-001969180C79801E`, iPhone 13), grounded in `ROADMAP.md`. The code is built; this pass confirms each piece actually *runs* on-device, logs solid vs. broken, and drives the fixes.

**Why this exists:** Most phases shipped "code complete + tests passing + plan marked done." But the *one* unchecked box in the whole roadmap is **Phase 3 / 03-05 — "on-device end-to-end walk-through"**, and the blur (Phase 8) has a documented crash history. "Code done" was conflated with "verified on a device." This pass closes that gap honestly.

**Legend:** ✅ verified on-device · ⚠️ verified after a fix today · ❌ broken, needs fix · ⏳ not yet run on-device · 🔒 needs a precondition (e.g. a delivered clip)

---

## A. Entry + Auth  (Phase 9 / auth)
| Check | Status | Notes |
|---|---|---|
| Splash → How-it-works → Choose profile | ✅ | today |
| Sign up — Apple | ✅ | creates session, reaches Almost-done |
| Sign up — Google | ✅ | creates session |
| Sign in (returning user) | ⚠️ | timeout seen after reinstall — **flaky, needs retry/hardening** |
| Almost-done (quick-finish) form | ⚠️ | fixed today: placeholders + "what's missing" + trim |
| Onboarding routing (both-fork, Service Standards) | ⚠️ | fixed today: BootGate was bouncing seeker/scout groups |
| Sign out | ✅ | today |

## B. Seeker flow  (Phases 2/9)
| Check | Status | Notes |
|---|---|---|
| Home map / "Where do you need eyes?" | ✅ | today |
| Search — place + voice | ⏳ | |
| Request a check → payment (Stripe hold) | ⏳ | roadmap: 04-06 smoke-tested |
| Finding a Scout (dispatch) | ✅ | correctly times out → "no scouts" |
| Waiting / delivery countdown | ⏳ | |
| Delivery — watch clip + rate | 🔒 | needs a delivered clip (blocked by D) |

## C. Scout flow  (Phases 4/5/7/8)
| Check | Status | Notes |
|---|---|---|
| Become a Scout → Verify ID & payouts (Stripe Connect) | ⏳ | merged to one screen today |
| Dashboard online/offline + incoming requests | ✅ | today (real dispatch) |
| Accept job (atomic) | ✅ | today |
| Filming — record 15s | ✅ | today |
| **Submit → upload to Mux** | ❌ | **0% then fails — BROKEN** |
| **On-device face blur** | ❌ | **OOM crash on submit — temp-disabled** |
| Submitted / completion screen | 🔒 | blocked by upload |
| Earnings / withdraw (Stripe) | ⏳ | |

## D. PRIORITY FIX — Video pipeline  ← I own this, off Troy's plate
The one never-verified-on-device path. Fix + test end-to-end:
1. **Upload to Mux fails (0% → back to submit).** Diagnose (likely the New-Arch `uploadAsync` / Mux URL / network). Confirm via `idevicesyslog` on submit.
2. **Blur OOM crash.** Re-engineer `modules/lmc-blur` to process frame-by-frame in `autoreleasepool` at a capped resolution; re-enable `BLUR_POST_RECORD_ENABLED`. (legal/required — see [[project_lmc_blur_memory_crash]])
3. **Run the full loop on-device:** record → blur → upload → Seeker's screen flips to delivered → plays the Mux clip.

## E. Payments (Stripe TEST)  (Phase 4) — ⏳ re-verify on-device
Card hold at request · capture-on-delivery + Scout transfer · refunds / Trouble-Here.

## F. Notifications (Phase 10) — ⏳
Scout push on nearby job · Seeker push on delivery.

---

## How we run it
- **Troy** drives the on-device steps for A/B/C/E/F; **Guy** logs status here + fixes each ❌/⚠️ and reboots the build.
- **Guy** owns **D (video pipeline)** as a focused, properly-tested fix — not live whack-a-mole.
- Update this file as the single source of truth each session.
