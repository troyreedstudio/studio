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
| Search — place (Soho House NYC) | ✅ | today on-device |
| Request a check → payment (Stripe hold) | ✅ | today: saved card picked up, hold placed, moved to Finding |
| Finding a Scout (dispatch) | ✅ | correctly times out → "no scouts" |
| Search — voice | ⏳ | not yet exercised |
| Waiting / delivery countdown | ✅ | VERIFIED + redesigned (red hero sheet, venue title, mono clock) |
| Delivery — watch clip + rate | ✅ | watched the delivered blurred clip; rating available |

## C. Scout flow  (Phases 4/5/7/8)
| Check | Status | Notes |
|---|---|---|
| Become a Scout → Verify ID & payouts (Stripe Connect) | ✅ | COMPLETED end-to-end on-device (acct_1To3Bk…, charges+payouts enabled, identity verified) after enabling Connect + the https-return fix. Button → "Manage in Stripe" |
| Dashboard online/offline + incoming requests | ✅ | today (real dispatch) |
| Accept job (atomic) | ✅ | today |
| Filming — record 15s | ✅ | today |
| Trouble-Here report (refund) | ✅ | backend FIXED (was 500 "catch is not a function" — bad `.catch` on rpc); now reports + refunds Seeker. UI busy-state polish queued for rebuild |
| Submit → upload to Mux | ✅ | FIXED (was the Mux free-plan 10-asset cap, not code) — uploads end-to-end |
| On-device face blur | ✅ | FIXED + verified (autoreleasepool + cache-off + 720p); 0 memory kills; faces visibly blurred |
| Submitted / completion screen | ✅ | reached "sent to Seeker" |
| Earnings tab | ✅ | real data (3 delivered, 5★, 100%); $0 to withdraw is correct (no payout account) |
| Payout / Identity sections (resume setup) | ✅ | resume path works; post-setup shows active + "Manage in Stripe" reconnects to Stripe ✅ |

### Findings (to fix)
1. **❌ Go-online gate not enforced (Phase 4 / 04-04).** A Scout with NO `scout_stripe_accounts` row (payouts not enabled) was able to go online, accept, film, and deliver jobs — so they could work jobs they can't be paid for. Gate should block online/accept until `payouts_enabled`. Verify the stripe-connect-status go-online gate is actually wired client + server.
2. ✅ Button IS wired — "Set up bank account" calls `stripe-connect-onboard` (good).
3. **✅ FIXED — `stripe-connect-onboard` HTTP 500.** Two root causes, both resolved: (a) Connect not signed up → Troy enabled it in the "Let me check" sandbox; (b) `account_links` rejected `lmc://` return URLs → added public `stripe-return` https function that deep-links back. Onboarding now completes end-to-end. Also added error-surfacing try/catch to the function.
   - **Code issue (likely next failure):** `accountLinks.create` uses `return_url`/`refresh_url` = `lmc://scout/payout?...` (custom scheme). Stripe typically **rejects non-https** account-link URLs — once Connect is enabled, this may need an https universal-link/redirect that bounces to `lmc://`.
   - **Code hygiene:** the function has **no try/catch** around the Stripe calls → returns a bare 500 with no message. Add error handling to surface the real Stripe error.

## D. Video pipeline  ← was the broken path; now largely cracked
1. **✅ Upload — FIXED.** The "0% fail" was NOT a code bug: the Mux **free plan caps at 10 assets** and it was full. Surfaced via the new error path; cleared 8 old test assets. Upload now works end-to-end (check `4b4f866b` reached `delivered`, clip `ready` + `playable`). **Before launch: upgrade Mux off the free plan.**
2. **✅ Blur OOM — FIXED + VERIFIED on-device (2026-07-01).** `LmcVideoExport.swift`: per-frame `autoreleasepool` + `CIContext cacheIntermediates:false`; capture→720p; `BLUR_POST_RECORD_ENABLED` re-enabled. Filmed + submitted with blur ON: securing → uploading 0-100 → "sent to Seeker", **0 memory kills** (confirmed via `idevicecrashreport`: 0 new JetsamEvents; log: 0 real ReportMemoryException). Check delivered, clip ready+playable.
3. **✅ Full loop with blur ON** — record → blur → upload → deliver — works end-to-end. (Still to eyeball: faces actually visibly blurred in a clip with a face in frame.)

## MORNING TEST PLAN (first thing)
1. **Blur** (the overnight fix): film + submit a clip → must NOT crash → secures → uploads. Confirm with `idevicecrashreport`/`idevicesyslog` (no new ReportMemoryException). Check the delivered clip's faces are blurred.
2. **✅ Seeker receiving flow — VERIFIED end-to-end.** request → finding → (Scout accepted) → waiting screen → delivered → screen **flipped live** to Delivery → watched the **blurred** clip → correct. Full seeker loop works. (No manual "accept" step by design — confirmed OK.) Waiting-screen DESIGN reworked (red-gradient hero sheet + big 62px mono clock + white text) — rebuilding for Troy's review.
3. **Help links** (fixed, needs this build): Seeker → Help → Terms/Privacy now open the in-app legal screens.
4. **Design fixes** (this build): History red-circle badge, recurring icon circle, Scout name = Inter, Trouble-Here per-row spinner.
5. **✅ Saved places — built + verified.** The save trigger was missing entirely; wired "Save this place" on Delivery + a per-row bookmark in History (save-after-a-check UX, Troy's call). Verified: save → shows in Saved Places → selectable on home search.
6. **✅ Voice search improved** — forced Apple server recognition (`requiresOnDeviceRecognition:false`) since on-device was mis-hearing place names; pending Troy's re-test.
7. **Still ⏳:** notifications, money capture-on-delivery + Scout payout, refund/dispute, go-online gate **FIX** (#1 — Scout could go online with no payout account), + smaller screens (membership / profile edits / referrals).

## E. Payments (Stripe TEST)  (Phase 4)
- **✅ Card hold at request** — verified (real `authorized` PI on the test card).
- **✅ Capture-on-delivery + Scout transfer — VERIFIED (hold → captured → `scout_paid: true`).**
  - 🐛 **FIXED (critical):** `stripe-capture` loaded the check with `.eq('check_id', …)` but the checks PK is `id` → `scout_id` was always null → **every Scout transfer deferred forever (Scouts never paid).** Changed to `.eq('id', …)`, deployed; re-tested → transfer completes. Would have shipped broken.
- **✅ Refunds — fully verified.** Scout Trouble-Here refund ✅; Seeker "problem with my video" refund ✅ (reported too-blurry → instant refund; payment `refunded`, Scout kept pay per D-08). 🐛 `stripe-refund` had the SAME `.eq('check_id')`-on-checks bug → refunds always 404'd; fixed to `.eq('id')`, deployed, verified. Swept all fns — no others.
- (Test artifact: check `9d49fd44` is captured-but-not-transferred from the pre-fix run — harmless test data.)

## F. Notifications (Phase 10) — ⏳
Scout push on nearby job · Seeker push on delivery.

---

## How we run it
- **Troy** drives the on-device steps for A/B/C/E/F; **Guy** logs status here + fixes each ❌/⚠️ and reboots the build.
- **Guy** owns **D (video pipeline)** as a focused, properly-tested fix — not live whack-a-mole.
- Update this file as the single source of truth each session.
