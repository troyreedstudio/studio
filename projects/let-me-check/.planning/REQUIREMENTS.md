# LMC — Requirements (v1: prototype → launched product)

Scope: turn the working UI prototype into a real product, sequenced core-loop-first, built nationally and rolled out city-by-city (NYC first). Each requirement is a hypothesis until shipped + validated.

## v1 Requirements

### Accounts & Auth
- [ ] **AUTH-01**: A user can sign up / sign in with Apple, Google, or phone + OTP
- [x] **AUTH-02**: A user stays signed in across app restarts (persistent session)
- [x] **AUTH-03**: One account holds both roles; a user can switch between Seeker and Scout
- [x] **AUTH-04**: A user can sign out

### Backend & Data
- [x] **DATA-01**: App data persists in a real backend (Supabase), replacing in-memory stores
- [x] **DATA-02**: A check's lifecycle is a server-owned state machine; the client holds no business logic or secrets
- [x] **DATA-03**: Core entities persist: users, roles, checks, venues/locations, clips, payments, payouts, ratings
- [ ] **DATA-04**: **Immutable event log from day 1** — every action (request created, Scout pinged/accepted/declined, clip captured/submitted/rejected, cancel, rating, GPS ping, payment auth/capture/refund/payout) logged with timestamp + geo + context. Decided before schemas are drawn. Foundation for later predictive AI (per CTO plan §6).

### The Core Check Loop
- [x] **CHECK-01**: A Seeker can request a check at a chosen location (tier: Standard/Priority)
- [x] **CHECK-02**: The request is dispatched to an eligible nearby Scout
- [x] **CHECK-03**: A Scout can accept a request and is guided to film it
- [x] **CHECK-04**: A filmed clip is uploaded, processed, and delivered to the Seeker
- [x] **CHECK-05**: A Seeker can watch the delivered clip and see its details (when/where filmed)
- [x] **CHECK-06**: A Seeker can rate the delivered check

### Video Capture & Pipeline
- [ ] **VID-01**: A Scout films a **live** 15-second clip in-app; **gallery/camera-roll import is blocked** (fresh-capture enforcement)
- [ ] **VID-02**: Clips are **video-only — audio is stripped/never recorded** by default
- [x] **VID-03**: Upload is resilient on weak mobile networks (resumable/retried)
- [x] **VID-04**: Clips are transcoded and streamed via CDN (Mux); Seeker playback is smooth

### Payments & Payouts
- [x] **PAY-01**: A Seeker's card is **authorized (held)** when they confirm a request
- [x] **PAY-02**: The Seeker is **charged on delivery**; if no Scout / no delivery, the hold is released (no charge)
- [x] **PAY-03**: A Scout is paid out via **Stripe Connect Express**, with an instant-payout option
- [x] **PAY-04**: A Scout **keeps their pay when a passing clip is refunded** to the Seeker (LMC funds the refund)
- [x] **PAY-05**: A Seeker can be refunded; disputes/chargebacks are handled (and absorbed by the platform, not the Scout)

### Scout Onboarding (ultra-low friction)
- [x] **SCOUT-01**: A Scout completes payout setup via Stripe Connect Express (the **only** identity = legally-required tax + Stripe KYC; **no background check, no separate ID/selfie step**)
- [x] **SCOUT-02**: A Scout agrees to the Scout Code (consent + acceptable-use)
- [ ] **SCOUT-03**: A Scout can go online / set availability and receive nearby jobs

### Real-Time Dispatch & Geo
- [ ] **DISP-01**: Only Scouts inside the location's geofence are pinged for a request
- [ ] **DISP-02**: A request is claimed atomically — two Scouts can never be assigned the same job (no double-booking)
- [ ] **DISP-03**: If no Scout accepts within the window, the request times out gracefully (release hold / refund, notify Seeker)
- [x] **DISP-04**: The Seeker sees live status (finding → accepted → filming → delivered)

### Verification & Safety (beta-grade)
- [ ] **VER-01**: Capture is GPS-geofenced and the clip is GPS-stamped (recorded at the right place/time)
- [ ] **VER-02**: A Scout confirms a reference photo of the target before filming
- [ ] **VER-03**: A Scout has a cooldown per location (anti-spam / anti-farming)
- [ ] **VER-04**: A manual-review path exists for flagged/disputed clips
- [ ] **VER-05**: **Location integrity is hardened for V1** — maximize GPS accuracy and **detect/reject spoofed GPS** (location accuracy is a core quality bar, not a fast-follow)
- [ ] **VER-06**: **AI signage/place detection on every clip (V1)** — managed vision API (Google Vision, ~$1/mo) detects the venue's sign/logo + cross-checks GPS, and **auto-rejects wrong/faked clips** (the "last line of defence"); ambiguous cases fall to manual review (VER-04)
- [ ] **VER-07**: **AI clip auto-summary ("AI Verdict", V1)** — a qualitative one-line read of the clip ("short line · medium energy"); deliberately **NOT precise headcounts** (crowd-counting from video is deferred — unreliable off-the-shelf)
- [ ] **SAFE-01**: No-film zones are auto-blocked (hospitals, schools, courts, police, private residences)
- [x] **SAFE-02**: 18+ + consent gates and acceptable-use are enforced at onboarding and use

### Notifications
- [ ] **NOTIF-01**: Scouts get push alerts for nearby jobs
- [ ] **NOTIF-02**: Seekers get a push alert when their clip is delivered

### Markets & Rollout (national, city-by-city)
- [ ] **MKT-01**: Cities/markets are **data-driven** (venues, coverage, pricing, **plus country, currency, and locale**) as data, not code — the foundation that makes non-US markets additive later
- [ ] **MKT-02**: An operator can **activate a new city quickly** via admin — no engineering release
- [ ] **MKT-03**: Launch sequence is supported (7 cities): New York first, then Miami, LA, Atlanta, Chicago, Houston, San Francisco
- [ ] **REC-01**: Recurring checks (already prototyped) are wired to real dispatch + billing

### B2B / Partner Venues (V1)
- [ ] **B2B-01**: Partner venues unlock **interior** checks (30-sec, +$5); partner onboarding + a way to manage partner venues/pricing
- [ ] **B2B-02**: Partner-venue status surfaces in the app (a check at a partner shows the interior-check option)

## v2 / Fast-Follow (deferred)

- **PRED-AI**: Predictive AI — demand forecasting, surge dispatch, fraud/quality/churn prediction, RL ratings→ranking. Phase 2+ (needs accumulated event data; DATA-04 makes it possible later). *Hard rule per CTO plan: no predictive AI in V1.*
- **CROWD-AI**: Crowd-density / exact headcount estimation from video — deferred (off-the-shelf unreliable; "47 when it's 200")
- **GROWTH-01**: Live feed, AI Scout coach, Library mode, personalized "For You" feed
- **OPS-01**: Background checks (only if a future feature ever creates Scout↔customer contact)

## Out of Scope (with reasons)

- **Background checks on Scouts** — Scouts never contact the customer; no in-person risk → pure friction
- **Separate gov-ID + selfie verification** — beyond the legally-required tax + Stripe payout KYC
- **Audio in clips** — all-party-consent states (e.g. Florida) make it a felony
- **Multi-country / outside US** — US-only for v1. International (London → Dubai → Sydney/Melbourne → Singapore → Bangkok/Tokyo/Seoul) is *designed-for, not built-now*: each needs local payout rails (Stripe Connect availability varies; some need alternatives), per-country legal review (GDPR in EU, strict public-filming/privacy law e.g. Dubai, gig-labor classification), localization (language/currency), and likely a local operating entity. The market-aware data model (MKT-01) keeps it additive.
- **Native rewrite** — staying on React Native + Expo

## Traceability

Every v1 requirement maps to exactly one phase. Coverage: 41/41.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Pending |
| SAFE-02 | Phase 1 | Complete |
| CHECK-01 | Phase 2 | Complete |
| CHECK-02 | Phase 2 | Complete |
| CHECK-03 | Phase 2 | Complete |
| CHECK-05 | Phase 2 | Complete |
| CHECK-06 | Phase 2 | Complete |
| DISP-04 | Phase 2 | Complete |
| VID-01 | Phase 3 | Pending |
| VID-02 | Phase 3 | Pending |
| VID-03 | Phase 3 | Complete |
| VID-04 | Phase 3 | Complete |
| CHECK-04 | Phase 3 | Complete |
| PAY-01 | Phase 4 | Complete |
| PAY-02 | Phase 4 | Complete |
| PAY-03 | Phase 4 | Complete |
| PAY-04 | Phase 4 | Complete |
| PAY-05 | Phase 4 | Complete |
| SCOUT-01 | Phase 4 | Complete |
| SCOUT-02 | Phase 4 | Complete |
| DISP-01 | Phase 5 | Pending |
| DISP-02 | Phase 5 | Pending |
| DISP-03 | Phase 5 | Pending |
| SCOUT-03 | Phase 5 | Pending |
| VER-01 | Phase 5 | Pending |
| VER-03 | Phase 5 | Pending |
| VER-05 | Phase 5 | Pending |
| SAFE-01 | Phase 5 | Pending |
| VER-02 | Phase 6 | Pending |
| VER-04 | Phase 6 | Pending |
| VER-06 | Phase 6 | Pending |
| VER-07 | Phase 6 | Pending |
| NOTIF-01 | Phase 7 | Pending |
| NOTIF-02 | Phase 7 | Pending |
| REC-01 | Phase 7 | Pending |
| MKT-01 | Phase 7 | Pending |
| MKT-02 | Phase 7 | Pending |
| MKT-03 | Phase 7 | Pending |
| B2B-01 | Phase 7 | Pending |
| B2B-02 | Phase 7 | Pending |

**Note on CHECK-04:** "A filmed clip is uploaded, processed, and delivered" is the through-line of the whole loop. It is owned by **Phase 3** (the video pipeline that actually produces, uploads, and delivers a real clip). Phases 2 (delivery state) and 5/6 (dispatch + verification feeding it) contribute, but the requirement is satisfied — a real clip arriving — only when Phase 3 ships.
