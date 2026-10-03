# Let Me Check — App Store Launch Checklist

> Master to-do to get LMC onto the Apple App Store. Living doc.
> Status: 🟢 done · 🟡 in progress · 🔴 not started. Last updated 2026-09-28.

**Critical path:** App code (1) → Go-live switches (2) → Apple paperwork (3) → ship.
Everything else runs in parallel.

## 1. App (code)
- 🟡 Strip demo mode — DONE: deleted demo-menu.tsx, removed floating ☰ button (_layout.tsx), restored real "Choose your profile" → /onboarding/role (how-it-works.tsx), reverted fake-data error fallbacks to real error handling (PersonalInfoScreen, verification, payout-method). REMAINING: inert `?demo=1`-gated branches in home/finding/delivery/history/dashboard/earnings are harmless dead code in production (never fire without the demo param) — optional final cleanup.
- 🔴 Wire **Scout payouts** — Scouts are NOT credited on delivery yet (stubbed as "Phase 4 / real money" in submitted.tsx)
- 🔴 Real saved-card management (Stripe) — payment-methods.tsx is a post-v1 placeholder
- 🔴 Mock stats → real or hidden (globe "checks today / Scouts online", "Scouts nearby" on search/finding/dashboard)
- 🟢 Payment summary math fixed — Total now = Check Fee + $2 platform (Standard $15→$17, Priority $20→$22); self-correcting. (2026-09-23)
- 🟢 Waiting screen legacy blue → Sheet Black (matches globe). (2026-09-28)
- 🟢 Home globe venue sheet legacy blue → Sheet Black `rgba(0,0,0,0.82)`. (2026-09-23)
- 🟢 SMS consent line added to phone sign-in + sign-up (A2P compliance). (2026-09-28)
- 🟢 Core Seeker loop VERIFIED on real device (build 43, 2026-10-03): sign-in → request → pay (test card) → createCheck → delivery video (GPS-verified + face-blurred) + rating. Root-cause auth-lock hang fixed (no-op lock) — see [[project_lmc_rn_auth_lock_fix]].
- 🟢 New-user PHONE sign-up flow VERIFIED on sim (2026-10-03): Choose profile → role → phone → OTP → Almost done → app, in one shot. Fixed the role-picker loop (role.tsx routes signed-in users to quick-finish; BootGate no longer bounces mid-auth users off the auth screen) and carried the verified phone number through to the Almost-done screen + profile.
- 🟡 Still to verify on a real device IN a live market: a Scout filming a FRESH clip (camera pipeline itself was verified on-device 2026-07-01). Everything else validated via the dummy-scout method.

## 2. Go-live switches (services)
- 🔴 Stripe: test → **live keys** (LLC + EIN in place, ready)
- 🔴 Mux: upgrade off free video plan
- 🔴 Supabase: confirm production footing (paid tier / keepalive)
- 🟢 Twilio phone sign-in: A2P 10DLC Brand + Campaign APPROVED 2026-10-03. Phone/SMS OTP now usable for real US delivery. (Worth a one-time real-device test with a real number.)

## 3. Apple paperwork
- 🟢 Privacy Policy + Terms LIVE at letmecheckapp.com (privacy has compliant SMS section §9)
- 🟡 App Store Connect listing — copy/description/keywords/subtitle DRAFTED in docs/APP-STORE-LISTING.md; screenshots pending (capture on iPhone 17 Pro Max = 6.9"/1320×2868)
- 🟢 Reviewer test-login configured — Supabase Test OTP: phone (305) 555-0100 / code 123456 (3-month expiry — EXTEND before it lapses). Reviewer notes drafted; add demo-video + sample check at submission time.
- 🔴 App privacy questionnaire + encryption compliance
- 🟢 EAS production build shipped to TestFlight (2026-09-28). NEXT: verify Apple/Google sign-in on a real device before inviting testers / submitting for review.
- 🟢 EAS build + Apple submit credentials set up (App Store Connect API key, cert, provisioning). (2026-08-20)

## 4. Legal / ops
- 🟡 Trademark "Let Me Check" — with lawyer; file the LOGO, Class 9 + 42 (see [[project_lmc_trademark]])
- 🔴 Scout agreement (gig-worker / independent-contractor terms)

## 5. Supply — Miami (marketplace's other half)
- 🔴 Recruit ~50 Scouts
- 🔴 Sign ~20 venue partners
- 🔴 Seed real venue data for Miami

## 6. Marketing
- 🟢 Website letmecheckapp.com LIVE — needs brand/pricing refresh
- 🔴 Lock social handles (Instagram, TikTok, X)
- 🟡 Investor/marketing deck — exists, needs upgrade
- 🔴 Influencer launch plan + first-check-free acquisition
- 🔴 Customer support flow (hello@letmecheckapp.com exists)

## 7. Analytics
- 🔴 Instrument the app for day-one usage visibility

---

### Decisions locked
- App uses **Standard / Priority** ($15 / $20) at launch, NOT the deck's Instant/Fast/Standard. (see [[project_lmc_app_pricing_decision]])
- Home globe stays dark/satellite; rest of app red/white/black. "Sheet Black" = `rgba(0,0,0,0.82)` for panels over the map.

### Sequencing note
The full demo strip + real-auth switchover is best done as ONE final pass paired with the go-live switches (2), because it disables the easy simulator walkthrough and needs live services + a real device to verify. Keep reviewing in demo mode until every screen is signed off, THEN strip + flip + ship.
