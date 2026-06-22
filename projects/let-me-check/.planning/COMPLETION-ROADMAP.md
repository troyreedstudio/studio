# Let Me Check — Completion Roadmap (post-audit, 2026-06-22)

Synthesis of the full seeker + scout audits (.planning/SEEKER-AUDIT.md, .planning/SCOUT-AUDIT.md). Answers: what backend is left, what the frontend plan is, and the path to a Miami beta.

## Where we actually are

- **Frontend tech is FINAL and correct:** React Native + Expo + TypeScript, running on real iOS devices. NOT prototypes, NOT a rebuild. The work is *wiring + backend*, not re-writing screens.
- **The core engine WORKS end-to-end on device:** request → geofenced dispatch → atomic claim → on-site GPS-verified filming → Mux upload → pay (auth/hold/capture) → deliver → watch. Plus the Phase-6 privacy/fraud backend (dormant).
- **The surrounding surface is partly mock:** many screens render hardcoded data or in-memory state instead of the live backend.

## What's already REAL (no work)
- Seeker: History (just wired), Finding/dispatch, delivery video player + rating + refund flow, real GPS/location, payment auth+capture+decline.
- Scout: filming (GPS pre-flight + camera + upload + deliver), dashboard (live jobs, GPS filter, atomic claim, realtime), scout-location tracking, Stripe Connect onboarding.

## Backend still to build (grouped)

### A. Money + Trust integrity (HIGH — beta-critical)
- **SLA / deadlines:** `deadline_at` on checks, an Edge-cron to enforce expiry + auto-refund on late/failed delivery, and client countdowns that read the REAL deadline (today they're cosmetic timers that reset on reopen — the #1 structural gap, both sides).
- **"Trouble Here" → real refund:** the button currently FAKES a refund and calls nothing. Wire it to the existing Phase-4 refund.
- **Scout earnings + withdraw:** earnings screen + payout history are hardcoded; withdraw fakes a payout. Needs a real earnings/ledger source + withdraw → Stripe payout.

### B. The product's value made real (HIGH — beta-critical)
- **Real Verified badge + real Scout info on delivery** (currently "Jake C." + always-on badge are hardcoded; the real gps_verified result + scout identity exist in the DB — surface them).
- **On-device face blur** (Troy: non-negotiable). Researched: custom Expo native module, post-record blur via Apple Vision + Core Image / Android ML Kit. See 06-RESEARCH-BLUR-V2.md.
- **Push notifications:** Scouts currently must stare at the app to catch jobs. Needs Expo Push + a device-tokens table + wiring to dispatch + the notification toggles.

### C. Quick wins (LOW effort — backend mostly EXISTS, just reconnect)
- Saved places, recurring checks (+ setup), preferred cities, notification prefs persistence, payment-method last4 / confirmed+cancelled cards, profile stats. These screens bypass existing backend with in-memory state — connecting them is the cheapest, highest-polish work.

### D. Growth features (LATER — post-beta)
- **Referrals/Invite:** needs a codes/credits table + logic (currently dead buttons + fake code).
- **Memberships/Subscriptions:** biggest net-new — needs RevenueCat / in-app-purchase infra (currently "Upgrade" = an alert).
- **Real search + venue catalog:** Search is 84 hardcoded places; venue detail uses a local sample clip. Beta can run on a curated venue set; full search is later.
- **AI Verdict + Crowd Report:** currently fake tags on delivery. Either build the real AI crowd-analysis feature or remove the fake copy for beta (recommend remove for honesty until built).
- **Real Scout dots on the seeker map** (currently animated fakes; scout-location data exists to make real).

## Frontend plan
No rebuild. Every screen is real React Native/Expo on device. "Progressing to the real app" = wire each screen to the backend above + build the genuinely-missing data sources. Pure frontend-only remaining work is small (mostly removing mock + connecting calls).

## Proposed phase sequence (GSD)
- **Phase 7 — SLA + money integrity** (A): deadlines, cron expiry/auto-refund, Trouble-Here refund, scout earnings + withdraw real.
- **Phase 8 — On-device blur** (B): the native module (Troy's hard requirement).
- **Phase 9 — Verified badge + Scout identity + seeker quick-wins** (B + C): the value-prop made real + cheap reconnects.
- **Phase 10 — Push notifications** (B).
- **Phase 11+ — Growth** (D): referrals, memberships (RevenueCat), real search/catalog, AI verdict.

**Beta-critical = Phases 7-10.** Phase 11+ is post-beta growth.

## Open question for Troy
Confirm the beta-critical set (7-10) and whether memberships/referrals/search are truly post-beta, so we lock the sequence.
