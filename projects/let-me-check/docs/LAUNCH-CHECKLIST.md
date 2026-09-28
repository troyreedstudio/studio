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
- 🔴 Verify on a REAL phone: camera capture, GPS dispatch, voice search (all placeholder/simulated in the simulator)

## 2. Go-live switches (services)
- 🔴 Stripe: test → **live keys** (LLC + EIN in place, ready)
- 🔴 Mux: upgrade off free video plan
- 🔴 Supabase: confirm production footing (paid tier / keepalive)
- 🟡 Twilio phone sign-in: finish A2P 10DLC approval — NOT a launch blocker (launch on Apple/Google)

## 3. Apple paperwork
- 🔴 Privacy Policy + Terms of Service (also legal)
- 🔴 App Store Connect listing: screenshots, description, keywords, age rating, support URL
- 🔴 App privacy questionnaire + encryption compliance
- 🔴 TestFlight on real device → submit for review (~1–3 days)
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
