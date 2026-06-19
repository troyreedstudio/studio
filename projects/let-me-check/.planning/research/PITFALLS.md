# Pitfalls Research

**Domain:** On-demand visual-verification gig marketplace (Seekers pay Scouts to film 15-sec clips of real places, real-time dispatch, real money) — going from UI prototype to live, paid marketplace. Phase-1 wedge: Miami nightlife.
**Researched:** 2026-06-19
**Confidence:** HIGH on marketplace dynamics, fraud, payments, trust/safety, and dispatch/video reliability (verified against current marketplace research, Florida recording law, Stripe Connect docs, and known gig-platform failure modes). MEDIUM-LOW on a few jurisdiction-specific legal edges (flagged inline — get a Florida lawyer to confirm before launch).

> **Framing for the roadmap.** This is a *subsequent* milestone: the UI loop already works on mock data. The pitfalls below are the ones that kill marketplaces *after* the demo looks great — specifically the move from prototype to paying users with real strangers, real money, and real-time dispatch. The single biggest theme: **the product can look 100% done in TestFlight and still be a non-functioning business**, because liquidity, fraud, consent, and chargebacks are invisible in a demo and lethal in production.

---

## Critical Pitfalls

### Pitfall 1: Demand-first cold start — Seekers open an empty marketplace and never return

**What goes wrong:**
You launch, drive Seekers (the easy side) via marketing, and they request a check in a venue with zero Scouts nearby inside the 30–50m geofence. They wait, get "no Scout available," and churn permanently. The geofence — the trust moat — actively *worsens* this: it shrinks the eligible Scout pool to people standing inside a tiny circle *right now*. A Scout three doors down is useless. This is the #1 marketplace killer; ~67% of failed marketplaces die on the supply side, and a hard geofence makes the supply side even harder than a normal gig app.

**Why it happens:**
Demand is easy and gratifying to generate (ads, press, "Uber for X" pitch). Supply is slow, manual, and unglamorous. Founders optimize the side that gives a dopamine hit. The verification moat compounds it: most gig apps can route a driver from across town; LMC can only use a Scout already physically inside the venue's geofence at the moment of request — radically thinner liquidity.

**How to avoid:**
- **Supply-first, hyper-local.** Recruit and verify the 50 Miami Scouts *before* any Seeker marketing. Concentrate them in the 20 launch venues, not spread across the city. Density beats coverage.
- **Manufacture liquidity for the beta.** Schedule "Scout shifts" — pay Scouts a small guaranteed minimum (or a base + per-clip) to physically be at high-demand venues during peak nightlife hours. This is the Uber playbook (pay drivers to sit and wait early on). Treat it as a customer-acquisition cost, not a loss.
- **Be honest when there's no Scout.** When no Scout is in-fence, don't fake a wait. Show "No Scout at this venue right now — get notified when one arrives" and capture the request as demand signal that pings Scouts to go there.
- **Pre-position via the recurring-checks feature** to concentrate predictable demand at known venues/times so you can staff Scouts against it.

**Warning signs:**
- High request-to-fulfillment gap (requests created vs. clips delivered).
- "No Scout available" rate above ~10–15%.
- Seeker D1/D7 retention collapses after first failed request.
- Scouts going online but receiving zero pings (supply in the wrong places).

**Phase to address:**
Pre-launch operations + the **dispatch/geo phase** (must expose real-time in-fence Scout counts per venue so ops can see liquidity holes). The fix is 80% operational (Scout recruiting + guaranteed shifts), 20% product (honest empty-state + demand capture).

---

### Pitfall 2: Faked / staged / wrong-place / recycled clips defeat the verification moat

**What goes wrong:**
A Scout games the system to get paid without doing the real work: films an old clip and re-submits it; stands inside the geofence but points the camera at a different (busier-looking) venue; films a screen showing previous footage; or two Scouts collude (one inside the fence relays a clip filmed by a friend, or accounts trade GPS positions). The PROJECT.md explicitly **defers AI signage detection to post-beta**, relying on "manual review + GPS/photo/cooldown." That leaves a real integrity gap during the exact window when trust is being established. A single viral "I paid $15 for a fake clip" post can kill a trust-based product.

**Why it happens:**
GPS can be spoofed (mock-location apps, jailbroken devices), the reference-photo "Are you here?" tap is trivially passable from anywhere, and *liveness* (is this clip being filmed right now, here, of this place?) is genuinely hard. Manual review doesn't scale and is slow — directly conflicting with the 7–10 minute SLA. The 5 verification layers in the business plan are described as if they auto-work; in reality each is defeatable in isolation.

**How to avoid:**
- **Capture liveness signals even without AI signage detection.** Force in-app camera capture only (no camera-roll uploads — ever). Disallow imported video. Stamp each clip server-side with: device GPS at capture, capture timestamp, accelerometer/gyro motion trace, and (ideally) a server-issued nonce shown briefly so the clip can't be pre-recorded.
- **Detect mock-location / jailbreak / emulator** at the SDK level and hard-block those devices from Scout mode. This is the single highest-ROI anti-fraud control and is cheap to add.
- **Make manual review *targeted*, not universal.** Auto-pass clips with clean signals; route only anomalies (GPS-on-edge, motion=still, repeated venue, new Scout's first N jobs) to a human. This keeps SLA while covering the risk.
- **Seeker dispute = instant refund + Scout flag.** Cheap refunds early; pattern-detect Scouts who attract disputes.
- **Cooldown + per-Scout rate limits** to stop one account farming a venue.
- **Hash clips** to detect exact re-submission of prior footage.

**Warning signs:**
- Clips with GPS exactly on the geofence boundary, or suspiciously identical coordinates across submissions.
- Zero motion-sensor variance during "filming" (screen-of-a-screen / static replay).
- Same Scout, same venue, implausibly fast repeat submissions.
- Clusters of accounts with shared device fingerprints or referral links (collusion rings).
- Seeker dispute rate climbing.

**Phase to address:**
**Verification/dispatch phase.** Even with AI signage deferred, the roadmap MUST include: in-app-only capture, mock-location detection, server-side GPS/time stamping, sensor-trace capture, and a targeted manual-review queue. Do **not** ship paid checks with only a static "GPS Verified" UI pill (which is what the prototype shows today). Flag this phase for deeper research.

---

### Pitfall 3: Audio consent — Florida is an all-party-consent state, and your product records audio of strangers

**What goes wrong:**
A 15-second clip filmed inside or right outside a Miami nightclub captures bystanders' conversations. Florida (Statute 934.03) is a **two-party / all-party consent** state for audio. Recording a private conversation without all-party consent is a **third-degree felony (up to 5 years)**. Video of a public scene is generally fine; the *audio* is the exposure. A Scout filming a quiet restaurant interior or a conversation where someone has a reasonable expectation of privacy could commit a crime — and the platform that directed them there carries reputational and potentially legal liability.

**Why it happens:**
Founders think "it's public, filming is legal" and conflate video law with audio law. The two are different. Nightlife/crowded public spaces are mostly safe (no reasonable expectation of privacy when others can overhear), but interiors, queues, quieter venues, and one-on-one conversations are a gray-to-red zone. The business plan's universal pitch ("anywhere on earth") drags the product into exactly these riskier interior/private settings (the +$5 partner-interior checks especially).

**How to avoid:**
- **Strip or mute audio by default for the beta.** A 15-second visual check does not need audio. Capturing video-only sidesteps the entire all-party-consent problem. This is the cleanest, cheapest mitigation and should be the default.
- If audio is ever wanted, gate it to clearly-public, overhearable settings only, and get a Florida-licensed attorney to define the policy.
- **Acceptable-use policy + Scout agreement** explicitly prohibiting recording private conversations and filming where privacy is reasonably expected.
- Reinforce the no-film-zone list (below) which overlaps with consent risk.

**Warning signs:**
- Any product decision that defaults audio ON.
- Interior/partner-venue checks shipping before the audio policy is settled.
- Scout-submitted clips containing audible private conversations.

**Phase to address:**
**Video pipeline phase** — make video-only (audio stripped at capture or transcode) the default before the first paid clip. Cheap to do now, expensive to retrofit after an incident. Legal review before beta.

---

### Pitfall 4: No-film zones and creepy-use / harassment — the platform becomes a tool for stalking or films somewhere it must not

**What goes wrong:**
Two linked failures. (a) A Seeker uses LMC to get live eyes on a *person* — an ex, an employee, a specific individual at a known location — turning the platform into a stalking/surveillance tool. Repeated targeted filming can constitute criminal stalking/harassment even in public. (b) A Scout films somewhere legally or ethically off-limits: hospitals/clinics (HIPAA-adjacent, patient privacy), schools/playgrounds (minors), courthouses/secure government facilities, places of worship, private residences, or inside venues that prohibit filming. Either produces a headline-grade incident for a small, trust-dependent startup.

**Why it happens:**
The product is "eyes on any location on demand" — the same primitive that's useful for "is the club busy" is abusable for "watch this person." Founders building the happy path (venues, queues) don't model the adversarial user. No-film zones aren't obvious in a venue-list UI where any pin can be dropped (the business plan literally markets "drop a pin anywhere").

**How to avoid:**
- **Constrain the beta to a curated venue allow-list** (the 20 Miami venues), not arbitrary pin-drops. This single decision eliminates most no-film-zone and stalking risk for launch. Open-ended "any address" is a post-beta capability that needs a real T&S system first.
- **Maintain a no-film blocklist**: hospitals, schools, places of worship, courthouses/government secure sites, private residences. Block requests geofenced to these categories (POI category data from the maps provider).
- **Acceptable-use policy** prohibiting filming identifiable individuals as the subject, surveillance of named persons, and any harassment use; Scout right to decline + report any request.
- **Scout veto + report flow**: a Scout can refuse a job they find unsafe/creepy with no penalty, and flag it.
- **Rate-limit repeated requests on the same location/person pattern** to catch surveillance use.

**Warning signs:**
- Requests for residential addresses or repeated requests on the same non-commercial location.
- Scout reports of "this felt like spying."
- Any request resolving to a hospital/school/courthouse geofence.
- Free-text request notes naming a specific person.

**Phase to address:**
**Dispatch/geo phase** (venue allow-list + no-film blocklist enforcement) and a **Trust & Safety / acceptable-use phase** that must exist before public launch. This is not optional polish; it is launch-blocking.

---

### Pitfall 5: Chargebacks land on the platform, not the Scout — and the auth-hold model has a capture-timing trap

**What goes wrong:**
With Stripe Connect (Express/destination charges — the marketplace pattern LMC uses), **the platform is ultimately liable for chargebacks and dispute fees**, not the Scout. A Seeker who got a clip can still charge back ("I didn't authorize," "service not as described") and LMC eats the $15 plus the ~$15 dispute fee — while having already paid the Scout $8. Net loss per fraudulent dispute is larger than the platform's per-clip margin. At scale, friendly-fraud chargebacks can wipe out the $7–8 margin entirely. The auth-hold model (authorize on confirm, capture on Scout acceptance) is the right instinct, but has a trap: if you capture at *acceptance* but the Scout then fails to deliver a usable clip, you've charged the Seeker for nothing → refund or dispute.

**Why it happens:**
Founders assume "the Scout did the work, so the Scout's account pays if it's disputed." Stripe's liability model says otherwise for marketplace charge types. Also, digital/instant-delivery services have inherently high friendly-fraud rates, and a $15 impulse purchase at 1am is prime chargeback territory.

**How to avoid:**
- **Capture on delivery, not on acceptance.** Authorize at request → capture only when a verified clip is delivered and (briefly) viewable. If the Scout fails, void the auth — Seeker never charged, nothing to dispute. (Mind the 7-day auth-expiry window; with 7–10 min delivery this is a non-issue.)
- **Hold Scout payout until a short dispute/quality window passes** (e.g. release after the Seeker views or after N hours), so you can claw back from the Scout's Connect balance before the platform absorbs it.
- **Enable Stripe Radar + collect strong evidence automatically** (GPS stamp, delivery timestamp, viewed-receipt, the clip itself) to win "not as described" disputes.
- **Require Scout payout reserves** / negative-balance handling so a fraudulent Scout's future earnings cover their clawbacks.
- **Track chargeback rate against card-network thresholds** (~0.9–1%); exceeding it risks losing card processing entirely.

**Warning signs:**
- Chargeback rate approaching 1% of transactions.
- "Not as described" disputes clustering on specific Scouts (→ quality/fraud) or specific Seekers (→ friendly fraud).
- Refund rate eating margin.
- Scout payouts released before delivery is confirmed.

**Phase to address:**
**Payments phase.** Bake capture-on-delivery, payout-hold windows, Radar, and automated dispute evidence in from day one — retrofitting payment liability controls after losses is painful.

---

### Pitfall 6: Stripe Connect / Identity KYC friction silently throttles Scout supply

**What goes wrong:**
To pay Scouts, each must complete Stripe Connect Express onboarding: legal name, DOB, address, SSN/last-4, sometimes ID document via Stripe Identity, and bank details. A meaningful fraction of casual gig sign-ups abandon at this wall. Worse, payouts can be silently *held* if KYC verification is pending or fails, so a Scout films, earns $8, and then can't withdraw — they rage-quit and post about it. KYC friction is a stealth liquidity killer: it doesn't look like a supply problem, it looks like "Scouts signed up but aren't active."

**Why it happens:**
Onboarding KYC is treated as a checkbox ("Stripe handles it") rather than a funnel to optimize. Founders test with their own already-verified accounts and never feel the friction real Scouts hit. Tax thresholds (1099-K / new lower reporting thresholds) add forms casual earners don't expect.

**How to avoid:**
- **Let Scouts onboard and even accept jobs before full KYC, but gate the *payout*, not the work** — and tell them clearly upfront: "Add payout details to get paid; takes 3 minutes." Front-load the expectation.
- **Instrument the Connect onboarding funnel** (started → completed → first payout) as a first-class metric. Treat drop-off like a checkout-abandonment problem.
- **Handle `account.updated`/verification webhooks** to surface "your payout is on hold, here's the one missing field" instead of a dead end.
- **Set realistic earnings/tax expectations** in Scout onboarding (1099 at year end).
- **Test onboarding with real, fresh, non-founder accounts** before recruiting the 50 Scouts.

**Warning signs:**
- Big gap between Scout app sign-ups and Scouts who completed Connect onboarding.
- Scouts with completed jobs but zero successful payouts.
- Support tickets: "Why can't I withdraw my money?"

**Phase to address:**
**Payments / Scout-payout phase.** Build the onboarding funnel + webhook-driven KYC status UI alongside the payout integration, not after.

---

### Pitfall 7: Scout no-shows, SLA misses, and quality variance erode the "fast + reliable" promise

**What goes wrong:**
The core value is "reliably receive a genuine clip — *fast* (7–10 min)." In reality: a Scout accepts then ghosts; the clip arrives at minute 14 (SLA blown, especially the 7-min Priority tier); the clip is technically real but useless (dark, shaky, films the wrong door, 3 seconds long). Variance across human Scouts is enormous. Each miss is a paid Seeker who feels ripped off. Unlike Uber (you can see the car coming), the Seeker stares at a countdown with no signal that anything is actually happening.

**Why it happens:**
Humans are unreliable, especially unpaid-until-delivery gig workers at 1am. Acceptance ≠ delivery. There's no penalty modeled for accept-then-abandon. Quality has no objective bar. The prototype's `setInterval` countdown hides all of this — the real world has no happy-path guarantee.

**How to avoid:**
- **Model the request as an explicit state machine with failure states** (requested → dispatched → accepted → filming → delivered, plus no-Scout / cancelled / timed-out / rejected). The CONCERNS.md already flags this — it's essential, not optional.
- **Acceptance timeout + auto-reassign**: if an accepting Scout doesn't deliver within N minutes, re-dispatch to another in-fence Scout automatically.
- **Scout reliability scoring** (acceptance-to-delivery rate, on-time rate, rating) feeding dispatch priority; penalize accept-then-ghost.
- **Minimum quality bar**: enforce min clip length, basic brightness/stability check at capture, retake prompt before submission.
- **Honest Seeker-side status** ("Scout is heading in," "filming now") instead of a fake timer; and a clear SLA-miss path (auto-refund/credit if late).
- **Beta-stage human ops**: a person watching the dispatch board to manually rescue stuck requests for the first hundreds of checks.

**Warning signs:**
- Accept-to-deliver dropout rate rising.
- p90 delivery time creeping past the SLA (watch p90/p99, not average).
- Rating distribution bimodal (great Scouts + terrible Scouts).
- Repeat "re-do my check" requests.

**Phase to address:**
**Dispatch phase** (state machine + reassignment + reliability scoring) and **video phase** (capture-time quality gates). SLA-miss refund logic ties into the **payments phase**.

---

### Pitfall 8: Real-time dispatch race conditions — double-assignment and the thundering herd

**What goes wrong:**
A request goes out to 5 in-fence Scouts. Two tap "Accept" within the same second. Without atomic assignment, both think they have the job → two Scouts film, only one gets paid, the other is furious (and may post about it). Or: ping all in-fence Scouts at once and the first to accept wins, leaving everyone else with a worthless notification (the "thundering herd," which trains Scouts to ignore pings). Conversely, ping them one-at-a-time sequentially and dispatch is too slow for the 7-min SLA.

**Why it happens:**
"First to accept wins" feels simple but is a classic distributed-systems concurrency bug. Mobile networks add latency that widens the race window. Founders test single-Scout flows and never hit the collision until two real Scouts race.

**How to avoid:**
- **Atomic claim** on the job row (single DB transaction / conditional update / `SELECT ... FOR UPDATE` or compare-and-set on status). Exactly one Scout can transition `dispatched → accepted`; losers get a clean "job taken" message instantly.
- **Tiered/staggered dispatch**: offer to the best-ranked nearby Scout(s) with a short accept window, expand the pool if unclaimed — balances speed vs. herd.
- **Idempotent accept endpoint** so retries on flaky networks don't double-assign.
- **Test the race explicitly** (concurrent accept calls) before launch — it will not surface in manual testing.

**Warning signs:**
- Any report of two Scouts showing up / two clips for one request.
- Scouts complaining pings are "already gone" the instant they arrive.
- Logs showing multiple accepts on one request ID.

**Phase to address:**
**Dispatch phase.** This is the highest-risk piece of *new backend logic* in the whole build and the area most needing tests + deeper research. Flag it.

---

### Pitfall 9: Mobile video upload failures — the clip is filmed but never arrives

**What goes wrong:**
The Scout films a perfect clip in a nightclub basement with one bar of signal, hits submit, and the upload stalls, fails, or dies when they walk out of range / the app backgrounds / the call interrupts. The Seeker's countdown expires with nothing delivered; the Scout believes they did the job and expects to be paid. This is the most common *technical* failure in mobile UGC products and it happens precisely where LMC operates — crowded venues with congested/weak cellular.

**Why it happens:**
Nightlife venues have terrible connectivity (thick walls, basements, thousands of phones on one tower). Naive single-shot uploads have no resilience to backgrounding, network drops, or app kills. Large raw video over a weak uplink is the worst case for a fragile upload.

**How to avoid:**
- **Resumable / chunked uploads** (Mux supports resumable upload; use it) so a dropped connection resumes instead of restarting.
- **Persist the recorded clip locally first**, then upload with **background upload + retry/backoff**, surviving app backgrounding and transient drops. Never hold the only copy in memory.
- **Compress/transcode appropriately on-device** before upload to shrink payload for weak uplinks (short clips help).
- **Clear Scout-side upload status** ("uploading… 60%… retrying…") and don't mark the job done until the server confirms receipt; don't pay until upload + verification succeed.
- **Test on real congested networks**, not office wifi.

**Warning signs:**
- "Filmed but not delivered" gap (clips recorded vs. clips received server-side).
- Upload failure/abandon rate spiking at specific venues (connectivity dead zones).
- Scout complaints that submissions "disappeared."

**Phase to address:**
**Video pipeline phase.** Resumable + background upload is a launch requirement, not an optimization — the operating environment guarantees bad networks.

---

### Pitfall 10: Battery, permissions, and location reliability for Scouts

**What goes wrong:**
A Scout's "online" status depends on location + push being reliable, but: the user grants "while using the app" instead of "always," so they stop receiving in-fence pings when the app backgrounds; aggressive battery optimization (especially Android) kills the background process; iOS throttles background location; the phone is at 8% at midnight and dies. Net effect: Scouts *think* they're available, get no pings, and dispatch sees no supply that's actually there → looks like a liquidity problem but is a reliability bug.

**Why it happens:**
Background location + push reliability across iOS/Android is genuinely hard and OS-version-dependent. Founders test with the app foregrounded and screen on. Real Scouts have the app backgrounded, screen off, battery low.

**How to avoid:**
- **Be explicit about the permission ask** and explain *why* "Always" location matters for getting paid jobs; detect and warn when only "while using" is granted.
- **Use push to wake the app for dispatch** rather than relying solely on continuous background location.
- **Design "online" to be honest** — verify the Scout is actually reachable (recent location heartbeat / push token valid) before counting them as in-fence supply; show them clearly when they've effectively gone offline.
- **Minimize battery drain** (don't poll GPS continuously; geofence triggers / coarse heartbeats).
- Set Scout expectations (keep app open during a shift, charge your phone).

**Warning signs:**
- Scouts marked online but unreachable (stale location heartbeats).
- Pings sent but never delivered/opened (dead push tokens).
- Android Scouts dropping off disproportionately.

**Phase to address:**
**Dispatch / push phase.** Treat Scout availability as "verified reachable," not "tapped a toggle."

---

### Pitfall 11: Scout physical safety — sending real people into nightlife at night

**What goes wrong:**
Scouts are dispatched alone, late at night, into clubs, lines, and dark exteriors, sometimes to film places/people who don't want to be filmed (bouncers, drunk patrons, security). A confrontation, theft, or assault tied to an LMC job is both a human tragedy and an existential PR/legal event for the platform. Gig platforms have a documented pattern of shifting safety burden onto workers who have no support channel when something goes wrong.

**Why it happens:**
The "everyone's already there with a phone" framing hides that you're now *directing* people to point cameras at strangers in charged environments. Filming a bouncer or a club line is exactly the kind of thing that triggers confrontation.

**How to avoid:**
- **Scout right-to-decline any job, no penalty**, plus an in-app SOS/report and a real human support path during operating hours.
- **Guidance + boundaries**: film discreetly, don't film people as subjects, don't enter situations that feel unsafe, no trespassing.
- **Prefer exterior/public-vantage checks** for the beta over confrontational interior filming.
- **Vet Scouts** (ID via Stripe Identity already in stack) and act fast on reports against Scouts *and* about unsafe jobs.
- 18+ enforcement (already a stated constraint) — never minors.

**Warning signs:**
- Scout incident reports.
- Jobs at venues with known security/filming hostility.
- Scouts declining clusters of jobs at specific locations (signal those are unsafe).

**Phase to address:**
**Trust & Safety phase** before public launch. Even beta-grade needs a decline-and-report path and a human on call.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Trust client-reported GPS/location for in-fence eligibility | Fast to build, no server geo | Trivially spoofed → fake clips, broken moat | **Never** for the verification path. OK only for non-trust UX hints (showing nearby venues). |
| Allow camera-roll / imported video for clips | Simpler capture flow | Destroys liveness guarantee; recycled/staged clips | **Never.** In-app capture only, always. |
| Capture payment on Scout acceptance | Simpler payment timing | Charge-for-nothing on failed delivery → refunds/chargebacks | **Never.** Capture on verified delivery. |
| Ship audio with clips by default | "Richer" clip | All-party-consent felony exposure (FL) | **Never** for beta. Video-only default. |
| `setInterval` happy-path flow instead of a real state machine | Already built in prototype | No failure handling → stuck requests, paid-but-undelivered | Acceptable only in the current prototype; **must be replaced** before first paid check. |
| Universal pin-drop "film anywhere" at launch | Matches the grand pitch | No-film-zone + stalking exposure with no T&S to handle it | Defer to post-beta. Beta = curated venue allow-list. |
| Skip mock-location/jailbreak detection for beta | One less integration | Easiest, highest-ROI fraud vector left wide open | **Never** — add it; it's cheap relative to the risk. |
| Universal manual review of every clip to "ensure quality" | Feels safe | Can't meet 7–10 min SLA; doesn't scale; ops burnout | Only as a *targeted* anomaly queue, never blanket. |
| No automated tests on dispatch/payment logic | Faster to ship | Silent money/fraud bugs in the highest-stakes code | **Never** for dispatch, payments, payouts, verification. |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe Connect (Express/destination) | Assuming the Scout's account eats chargebacks | Platform is ultimately liable; capture-on-delivery, hold payouts past a dispute window, collect auto-evidence, run Radar. |
| Stripe Connect onboarding / KYC | Treating it as a checkbox; testing with founder's verified account | Instrument the onboarding funnel; handle `account.updated`/verification webhooks; gate payout (not work) on KYC; test with fresh accounts. |
| Stripe payment capture | Capturing the auth on acceptance | Authorize on request, capture only on verified delivery, void if no clip (well within the 7-day auth window). |
| Mux upload | Single-shot upload assuming good network | Resumable/chunked + background + retry; persist clip locally first; confirm server receipt before marking done/paying. |
| Mux / video | Shipping audio you don't need | Strip audio at capture/transcode for the beta (consent risk + smaller files). |
| Expo Push / notifications | Assuming a token is forever valid; relying on background location alone | Handle token refresh + delivery receipts; use push to wake app for dispatch; treat unreachable = offline. |
| expo-location (background) | Assuming "while using" permission is enough | Require/explain "Always"; detect downgraded permission; don't continuously poll GPS (battery). |
| PostGIS / H3 geofence | Doing in-fence checks on the client | Server-side geo query; never trust client coordinates for eligibility or stamping. |
| Supabase Realtime for dispatch | Using broadcast/optimistic accept without atomic claim | Atomic conditional status update so exactly one Scout wins; idempotent accept endpoint. |
| Supabase RLS / auth | Enforcing Seeker/Scout split only via client route groups (as today) | Enforce role + ownership server-side via RLS; client routing is cosmetic. |
| ipwho.is IP fallback (existing) | Trusting it for the trust path | Fine for a soft city hint only; never for verification/eligibility; VPN spoofs it. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Broadcast-to-all-in-fence dispatch ("thundering herd") | Scouts ignore pings; mass wasted notifications | Tiered/staggered dispatch with short accept windows | As soon as >2–3 Scouts are in one fence (i.e. exactly when liquidity is good). |
| Geo "find Scouts in fence" without spatial index | Dispatch latency climbs, SLA at risk | PostGIS spatial index + H3 cell bucketing | When venues/Scouts grow beyond a few hundred and queries scan full tables. |
| Continuous GPS polling for "online" Scouts | Scout battery dies → false offline | Geofence triggers + coarse heartbeats, push-to-wake | At real shift lengths (hours) on real phones. |
| Manual review of every clip | Review backlog → SLA misses → support load | Targeted anomaly-only review | Past ~a few dozen checks/day per reviewer. |
| Large raw video over venue cellular | Upload stalls/fails, "filmed but not delivered" | On-device compression + resumable upload | Immediately, in any low-signal venue (i.e. most nightlife). |
| Hand-rolled in-memory store listeners (current prototype) | Broad re-renders, subtle bugs as screens grow | Move to real store (Zustand/Jotai) + backend source of truth | As more screens subscribe / data grows. |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting client GPS for verification/payout | Spoofed clips, fraudulent payouts, broken moat | Server-side geo + mock-location/jailbreak detection; sensor + timestamp corroboration. |
| No mock-location / emulator / jailbreak detection | Easiest fraud path wide open | Device-integrity check; block Scout mode on compromised devices. |
| Collecting raw card PAN in the in-app fields (prototype does today) | PCI scope + liability | Stripe PaymentSheet/SDK; card data tokenizes on-device, never hits your servers. |
| Storing video with public/guessable URLs | Privacy leak of people filmed; harassment fuel | Signed, expiring playback URLs; access scoped to the buying Seeker. |
| Retaining clips of identifiable people indefinitely | Privacy/GDPR-style exposure, surveillance dataset risk | Short retention + deletion policy; clear data-handling terms; minimize PII in clips. |
| Role enforcement only in client routing | Scout/Seeker privilege confusion; data access | Server-side RLS on role + record ownership. |
| Auth token in AsyncStorage | Token theft on compromised device | Expo SecureStore for session/token (already the stated plan — enforce it). |
| No abuse rate-limiting on requests | Surveillance/stalking via repeated targeted requests | Rate-limit by location/person pattern; flag repeats; no-film blocklist. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Fake countdown that ignores reality (prototype's `setInterval`) | Seeker stares at a timer while nothing happens; betrayal on miss | Real status from the dispatch state machine; honest "no Scout / late" paths. |
| Hiding the "no Scout available" case | Seeker waits, then churns forever | Honest empty state + "notify me when a Scout arrives" demand capture. |
| Charging before delivery is certain | Refund anger, chargebacks, distrust | Auth now, charge on delivery; never charge for an undelivered clip. |
| Surfacing Scout identity/face/exact path to Seekers | Scout safety + privacy risk; harassment | Minimal Scout info (first name + rating), no precise live tracking exposed to Seekers. |
| Burying the audio/consent + acceptable-use terms | Legal exposure, creepy-use | Clear consent gates and AUP at onboarding (consent gates already prototyped — wire them to real acceptance). |
| Over-promising "7 minutes, anywhere on earth" | Sets an SLA you miss on night one | Promise only what current liquidity supports; under-promise in beta venues. |
| No path to dispute/redo a bad clip | Seeker feels scammed, charges back | One-tap "this clip is wrong" → instant refund/redo, Scout flagged. |

## "Looks Done But Isn't" Checklist

- [ ] **Dispatch:** UI shows "Scout accepted" — verify there's an *atomic* claim so two Scouts can't both win, plus accept-timeout auto-reassign and a no-Scout path.
- [ ] **Video capture:** Recording UI works — verify it's *in-app camera only* (no camera-roll import), audio stripped, and a real clip is produced (not the prototype's boolean timer).
- [ ] **Video upload:** "Submitted" screen shows — verify the clip actually reached the server via resumable/background upload before the job is marked done or the Scout is paid.
- [ ] **Verification:** "GPS Verified" pill appears — verify it reflects a *server-side* GPS/time stamp + mock-location check, not a static UI label.
- [ ] **Payment:** Card form submits — verify it's Stripe-tokenized (no raw PAN to your server) and capture happens on *delivery*, not acceptance.
- [ ] **Payout:** Scout "earnings" update — verify Stripe Connect KYC is complete and a real payout can actually be withdrawn (and is held past a dispute window).
- [ ] **Consent/AUP:** Onboarding consent gates render — verify acceptance is recorded server-side and tied to the account, and audio/no-film policies are enforced.
- [ ] **Location/eligibility:** Nearby venues show — verify in-fence eligibility is computed server-side, not from client-reported coordinates.
- [ ] **No-Scout liquidity:** Demo always finds a Scout — verify behavior when *zero* Scouts are in-fence (the real common case at launch).
- [ ] **Notifications:** "Your check is ready" shows in-app — verify a real push reaches a *backgrounded* device with a possibly-stale token.
- [ ] **Failure states:** Happy path works — verify Scout-cancel, payment-fail, upload-fail, timeout, and off-fence-reject all have real handling.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cold-start / no liquidity at launch | MEDIUM | Pause Seeker marketing; pay guaranteed Scout shifts to manufacture density at top venues; narrow to fewer venues until in-fence supply is reliable. |
| Fake/staged clips slipping through | MEDIUM–HIGH | Instant Seeker refunds; ban offending Scouts; rush mock-location detection + sensor/timestamp corroboration; accelerate AI signage detection if abuse is systemic. |
| Audio-consent incident (FL felony exposure) | HIGH | Immediately ship video-only; legal counsel; pull any audio-bearing clips; document policy change. Cheap to *prevent*, expensive to recover. |
| No-film-zone / stalking incident | HIGH (existential PR/legal) | Disable arbitrary pin-drop, enforce blocklist + allow-list, public response, T&S overhaul. Prevention >> recovery here. |
| Chargebacks eating margin | MEDIUM | Switch to capture-on-delivery; add Radar + auto-evidence; hold payouts; ban friendly-fraud Seekers; watch the ~1% network threshold. |
| KYC friction strangling supply | LOW–MEDIUM | Fix onboarding funnel + webhook status UI; let work precede payout-KYC; proactively reach held-payout Scouts. |
| Double-assignment shipped | MEDIUM | Hotfix atomic claim + idempotent accept; comp the unpaid Scout; add concurrency test. |
| Upload failures at venues | LOW–MEDIUM | Ship resumable/background upload; local-persist + retry; map dead-zone venues and set Scout expectations. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Cold-start / supply liquidity | Pre-launch ops + Dispatch/geo | In-fence Scout count per venue visible; "no Scout" rate tracked; supply-first recruiting done before Seeker marketing. |
| Fake/staged/wrong-place clips | Verification/dispatch (flag for deeper research) | In-app-only capture + mock-location block + server GPS/time stamp + targeted review queue all live before first paid clip. |
| Audio all-party consent (FL) | Video pipeline | Audio stripped by default; legal sign-off; AUP recorded. |
| No-film zones / stalking / creepy-use | Dispatch/geo + Trust & Safety (launch-blocking) | Venue allow-list enforced; no-film blocklist enforced; AUP + decline/report live; request rate-limits. |
| Chargebacks land on platform | Payments | Capture-on-delivery; payout-hold window; Radar + auto-evidence; chargeback rate dashboard. |
| Stripe KYC friction | Payments / payouts | Connect onboarding funnel instrumented; webhook-driven status UI; payout (not work) gated. |
| Scout no-show / SLA / quality | Dispatch + Video (+ Payments for refunds) | Request state machine with failure states; accept-timeout reassignment; reliability scoring; quality gates; SLA-miss refund. |
| Dispatch race / double-assign | Dispatch (flag for deeper research) | Atomic claim + idempotent accept; explicit concurrency test passing. |
| Mobile upload failures | Video pipeline | Resumable + background upload; server-receipt-confirms-done; fail rate by venue tracked. |
| Battery / location / push reliability | Dispatch / push | "Always" permission handled; push-to-wake; unreachable = offline; reachability heartbeats. |
| Scout physical safety | Trust & Safety (pre-launch) | Decline/report + SOS path; human support on call; 18+ + ID vetting enforced. |

## Sources

- Marketplace cold-start / supply-side death: [Reforge — Beat the cold start problem in a marketplace](https://www.reforge.com/guides/beat-the-cold-start-problem-in-a-marketplace), [Two-Sided Marketplace Cold Start 2026 Playbook](https://forkoff.xyz/blog/founder-growth/two-sided-marketplace-cold-start-2026), [Reforge — How Omni Bootstrapped Marketplace Liquidity](https://www.reforge.com/blog/omni-bootstrapped-marketplace-liquidity-growth), [How Uber and Airbnb cracked the marketplace](https://xplainerr.substack.com/p/how-uber-and-airbnb-cracked-the-marketplace) (67% supply-side failure stat attributed to a16z marketplace research).
- Florida all-party audio consent (Statute 934.03; 3rd-degree felony; public-overhearable exception): [Recording Law — Florida Recording Laws 2026](https://www.recordinglaw.com/party-two-party-consent-states/florida-recording-laws/), [Recording Law — Two-Party Consent States 2026](https://www.recordinglaw.com/party-two-party-consent-states/), [Bridge Legal — Florida Video Recording Laws](https://bridgelegal.org/florida-video-recording-laws-consent-penalties-exceptions/). **MEDIUM confidence — confirm with a Florida-licensed attorney before launch.**
- Filming strangers / stalking / privacy as personal data: [Act Now — Is it legal to film people in public for social media?](https://actnowtraining.blog/2026/01/26/is-it-legal-to-film-people-in-public-for-social-media/), [Frankel & Associates — Can You Film in Public Without Permission?](https://www.frankelinsurance.com/can-you-film-in-public-without-permission/) (Cal. Penal Code 646.9 stalking referenced).
- Gig worker safety burden shifted onto workers: [arXiv — Understanding and Challenging Perceptions of Gig Worker Vulnerabilities](https://arxiv.org/pdf/2511.00273), [arXiv — Bystander Attitudes About Mobile Live-Streaming Video](https://arxiv.org/pdf/1902.06671).
- Stripe Connect chargeback liability (platform ultimately liable for Express/destination/separate charges): [Stripe Docs — Disputes on Connect platforms](https://docs.stripe.com/connect/disputes), [Stripe Docs — Risk and liability management with Connect](https://docs.stripe.com/connect/risk-management).
- Project-internal: `.planning/PROJECT.md` (beta-grade verification decision, AI signage deferral, auth-hold model), `.planning/codebase/CONCERNS.md` (no backend, fake timers, raw card fields, missing camera/geo/push, no tests), `docs/BUSINESS-PLAN.md` (6-layer geofence moat, pricing, Miami launch).
- Domain failure-mode knowledge: GPS spoofing / mock-location fraud, mobile resumable-upload reliability, distributed double-assignment concurrency, and friendly-fraud chargeback patterns in instant-delivery digital goods (HIGH confidence, well-established).

---
*Pitfalls research for: on-demand visual-verification gig marketplace (LMC), prototype → live paid product*
*Researched: 2026-06-19*
