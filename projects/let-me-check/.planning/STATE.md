---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 09-01-PLAN.md (migration 0017 + RED pgTAP)
last_updated: "2026-06-22T12:38:57.006Z"
last_activity: 2026-06-22
progress:
  total_phases: 9
  completed_phases: 4
  total_plans: 42
  completed_plans: 31
  percent: 74
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-19)

**Core value:** A Seeker can pay for, and reliably receive, a genuine, recent, location-true 15-second clip of a real place — fast.
**Current focus:** Phase 9 — Verified badge + scout identity + reconnects

## Current Position

Phase: 9 (Verified badge + scout identity + reconnects) — EXECUTING
Plan: 2 of 4
Status: Ready to execute
Last activity: 2026-06-22

Progress: [█████████░] 91% (30 of 33 plans complete)

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P02 | 9 | 3 tasks | 12 files |
| Phase 01 P03 | 8 | 3 tasks | 16 files |
| Phase 02-one-real-check P01 | 25 | 4 tasks | 6 files |
| Phase 02 P03 | 4m | 3 tasks | 4 files |
| Phase 02 P05 | 3m | 3 tasks | 3 files |
| Phase 02 P04 | 5m | 3 tasks | 4 files |
| Phase 03 P02 | 16 | 3 tasks | 6 files |
| Phase 03 P03 | 17m | 4 tasks | 9 files |
| Phase 04-payments P01 | 5 | 3 tasks | 4 files |
| Phase 04-payments P02 | 4m | 3 tasks | 4 files |
| Phase 04 P03 | 7 | 2 tasks | 4 files |
| Phase 04-payments-stripe-connect-express-card-hold-at-request-capture P04 | 4m | 2 tasks | 4 files |
| Phase 04-payments-stripe-connect-express-card-hold-at-request-capture P05 | 35 | 4 tasks | 3 files |
| Phase 04-payments-stripe-connect-express-card-hold-at-request-capture P06 | 15 | 3 tasks | 6 files |
| Phase 04-payments-stripe-connect-express-card-hold-at-request-capture P07 | 6 | 3 tasks | 5 files |
| Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in P01 | 3m | 2 tasks | 2 files |
| Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in P02 | 4m | 3 tasks | 2 files |
| Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in P03 | 219 | 3 tasks | 4 files |
| Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in P04 | 246 | 2 tasks | 4 files |
| Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in P05 | 7m | 3 tasks | 9 files |
| Phase 06-privacy-anti-fraud-hardening-on-device-face-plate-blur-befor P01 | 5m | 3 tasks | 5 files |
| Phase 06-privacy-anti-fraud-hardening-on-device-face-plate-blur-befor P02 | 4m | 3 tasks | 3 files |
| Phase 06-privacy-anti-fraud-hardening-on-device-face-plate-blur-befor P03 | 6m | 3 tasks | 6 files |
| Phase 06-privacy-anti-fraud-hardening-on-device-face-plate-blur-befor P04 | 12 | 3 tasks | 2 files |
| Phase 06-privacy-anti-fraud-hardening-on-device-face-plate-blur-befor P05 | 20 | 2 tasks | 6 files |
| Phase 07 P01 | 15 | 2 tasks | 3 files |
| Phase 07 P02 | 7 | 3 tasks | 8 files |
| Phase 07 P03 | 3 | 2 tasks | 4 files |
| Phase 07-sla-money-integrity-real-server-driven-delivery-deadlines-de P04 | 8 | 2 tasks | 5 files |
| Phase 08 P01 | 1 | 3 tasks | 7 files |
| Phase 08 P02 | 1 | 2 tasks | 4 files |
| Phase 08 P03 | 1 | 3 tasks | 7 files |
| Phase 08 P05 | 1 | 3 tasks | 7 files |
| Phase 09-verified-badge-scout-identity-quick-win-reconnects-surface-r P01 | 2 | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Foundation: Event log is immutable and decided before schemas are drawn (DATA-04) — adding it retroactively loses irrecoverable training data
- Foundation: Server owns every state transition and secret; client holds no business logic (enforced by RLS, not client routing)
- Money: Capture-on-delivery, not on acceptance (no charge for an undelivered clip; fewer chargebacks)
- Verification: Full per-clip AI verification (signage auto-reject + AI Verdict) is in V1; only PREDICTIVE AI is deferred to Phase 2+
- [Phase 01]: Phone-OTP deferred behind PHONE_AUTH_ENABLED flag (Twilio + A2P not live); Apple+Google are the live sign-in methods this wave
- [Phase 01]: Stores keep synchronous mutator signatures (optimistic cache + background persist) so importing screens need no changes
- [Phase 01]: EAS env vars pulled via per-profile environment key (no secret literals in eas.json)
- [Phase 02-one-real-check]: Added no_scout terminal enum value distinct from cancelled/expired (honest no-Scout outcome)
- [Phase 02-one-real-check]: clips as a first-class table so Phase-3 Mux columns slot in additively
- [Phase 02-one-real-check]: is_valid_check_transition compares enum on ::text so 0007 pushes safely before 0008's no_scout enum-add
- [Phase 02]: Scout dashboard accepts checks via atomic acceptCheck; lost race shows 'taken' + refreshes (no double-booking)
- [Phase 02]: Scout delivery uses a stub clip (markDelivered) with no earnings credit; real camera is Phase 3, payouts Phase 4
- [Phase 02]: Seeker confirm creates the real check now; Stripe hold is a documented TODO(phase-4) seam, no money in Phase 2
- [Phase 02]: All seeker navigation off a check is driven by the real status row only; fake countdown + prototype skip link deleted
- [Phase 03]: Mux secrets live only in Edge Functions (Deno.env); no helper returns a secret to a caller
- [Phase 03]: mux-webhook is the SOLE driver of delivered (service role) — client cannot fake delivery
- [Phase 03]: Client CANNOT mark delivered: markDelivered retired from checks.ts + filming.tsx; webhook owns delivered
- [Phase 03]: vision-camera pinned to v4.7.x (v5 ships no Expo config plugin)
- [Phase 04-payments]: Stripe secrets live only in Deno.env (_shared/stripe.ts); verifyStripeSignature mirrors mux.ts pattern (v1-only, 300s replay, native Web Crypto)
- [Phase 04-payments]: payments/refund_requests/scout_stripe_accounts have no client INSERT/UPDATE/DELETE policy — service role writes only; currency column NOT NULL with no default (enforces market config supply)
- [Phase 04-payments]: pricing.ts is the sole source of tier amounts; no hard-coded cent values anywhere else
- [Phase 04-payments]: transfer_group deferred to stripe-capture edge (check id not available at PI creation time)
- [Phase 04-payments]: import.meta.main guard on Deno.serve so tests pass with --allow-env only
- [Phase 04-payments]: payments.ts is interface-first: requestRefund/startConnectOnboarding/getConnectStatus delivered as typed contracts before their Edge Functions ship
- [Phase 04-payments]: stripe-capture uses separate charges+transfers (never destination charges); source_transaction on normal path; D-09 funds Transfer from platform balance without source_transaction
- [Phase 04-payments]: stripe-webhook mirrors mux-webhook exactly: raw body -> verify -> JSON.parse; import.meta.main guard on Deno.serve; disputes never reverse Transfer (D-08)
- [Phase 04-payments-stripe-connect-express-card-hold-at-request-capture]: stripe-connect-onboard is the SOLE write path for payout_speed (D-05); RLS bars client writes to scout_stripe_accounts
- [Phase 04-payments-stripe-connect-express-card-hold-at-request-capture]: go-online eligibility = live charges_enabled && payouts_enabled from accounts.retrieve (never from deep-link return — Pitfall 5, T-04-19)
- [Phase 04-payments-stripe-connect-express-card-hold-at-request-capture]: accepted_scout_code_at stamped server-side when stripe-connect-onboard called — AUTHORIZE checkbox in payout.tsx is consent (SCOUT-02)
- [Phase 04-payments-stripe-connect-express-card-hold-at-request-capture]: Capture-on-delivery wired into mux-webhook (fault-tolerant service-role invoke of stripe-capture, D-03)
- [Phase 04-payments-stripe-connect-express-card-hold-at-request-capture]: Phase 4 live in Stripe TEST mode: 0011 applied, 6 Edge Functions deployed, webhook registered with whsec, forged event 401
- [Phase 04-payments-stripe-connect-express-card-hold-at-request-capture]: Webhooks deployed --no-verify-jwt; user/service functions keep Supabase JWT; stripe-refund deferred to Plan 07 (its code is a Plan 07 deliverable)
- [Phase 04-payments-stripe-connect-express-card-hold-at-request-capture]: STRIPE_PUBLISHABLE_KEY in config.ts with hardcoded pk_test fallback — same release-safe pattern as SUPABASE_URL/MAPBOX_TOKEN, never via expo-constants
- [Phase 04-payments-stripe-connect-express-card-hold-at-request-capture]: New Architecture stays OFF: @stripe/stripe-react-native 0.50.3 lacks New Arch support
- [Phase 04-payments-stripe-connect-express-card-hold-at-request-capture]: stripe-refund Edge Function deployed with verify_jwt=true; refunds.create NEVER sets reverse_transfer (D-08: Scout keeps pay); evaluateRefund pure rule gates auto-approve vs manual-review
- [Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in]: [Phase 05-01]: market_config holds TWO DISTINCT distances (dispatch_radius_m=1500 wide vs film_fence_max_m=30 tight) — never conflate
- [Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in]: [Phase 05-01]: transition_check dispatching branch relaxed with v_uid is not null so service role can drive re-dispatch without breaking human-seeker invariant
- [Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in]: [Phase 05-01]: reset_check_for_redispatch is the sole deliberate exception to accept_check being the only scout_id writer — it CLEARS, accept SETS
- [Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in]: [Phase 05-02]: list_open_checks_for_scout SECURITY DEFINER RPC falls back from checks.coord to venues.coord — legacy rows never block dispatch
- [Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in]: [Phase 05-02]: accept_check geo gate skips when checks.coord is null — honest Scout never hard-blocked by missing geometry on legacy row
- [Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in]: [Phase 05-02]: expire_stale_dispatching pg_cron schedule wrapped in exception-swallowing DO block — migration is safe on free-tier plans without pg_cron
- [Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in]: [Phase 05-03]: verify-clip returns { passed, distance_m } but does NOT call reset_check_for_redispatch — mux-webhook orchestrates that so the gate is exactly between step 6 (finalize) and step 7 (delivered)
- [Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in]: [Phase 05-03]: missing/NaN filmed GPS logged as check.gps_unverifiable and passes (honest-Scout-friendly); gps_verified left null, never set to true on missing-GPS path
- [Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in]: [Phase 05-03]: mockSvc verifyClipPassed defaults to undefined (gate no-op) so all 5 pre-existing mux-webhook tests stay green
- [Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in]: [Phase 05-04]: signage-check is advisory-only by construction — transition_check structurally absent (grep gate); degrades to signage_confirmed=null on missing key/error (D-06)
- [Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in]: [Phase 05-04]: Google Vision called via REST fetch (NOT npm:@google-cloud/vision which times out in Deno); Mux thumbnail fetched server-side as base64 via RS256 JWT to avoid signed-URL 401 from Vision (Pitfall 2/7)
- [Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in]: [Phase 05-05]: as-any casts on scout_locations/list_open_checks_for_scout/is_in_no_film_zone — Phase-5 tables/RPCs not in database.types.ts; regen is Wave-4 live step after db push
- [Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in]: [Phase 05-05]: setScoutOffline upserts is_online=false WITHOUT coord — preserves last known coord in DB for rapid re-online
- [Phase 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in]: [Phase 05-05]: SAFE-01 client-side guard in createCheck via is_in_no_film_zone RPC; authoritative enforcement is server-side PostGIS polygon; follow-up can move fully server-side
- [Phase 06]: blur_enabled DEFAULT FALSE (D-07 dormant gate — activate per-market when on-device blur confirmed)
- [Phase 06]: blur_review entry edge is filming->blur_review (gate fires before uploaded/processing chain, while check is still in filming)
- [Phase 06]: blur_check_failed -> action=pass (fail-open): only confirmed faces trigger hold, not infra errors (D-03)
- [Phase 06]: TELEPORT_MPS_THRESHOLD=55.5 m/s (200 km/h); fraud score weights v1: teleport=60, accuracy_is_exact=25, simulated=50 capped at 100
- [Phase 06]: fraud-eval auto-reject enforcement explicitly deferred (D-04 flag-only launch); strictness=hold/reject only flags, never transitions check state
- [Phase 06]: blur gate (step 6c) fires filming->blur_review BEFORE uploaded/processing/delivered — face-blur-check fail-open on error (BLUR-05)
- [Phase 06]: fraud-eval is fire-and-forget advisory AFTER stripe-capture (step 8b) — never blocks delivery at launch (D-04 flag-only)
- [Phase 06]: ADD CONSTRAINT IF NOT EXISTS replaced with DO block guard on pg_constraint — Supabase db push rejects PG15+ syntax even on PG17
- [Phase 06]: mux-webhook redeployed verify_jwt=false confirmed; face-blur-check + fraud-eval verify_jwt=true (service-to-service); dormant invariant: 0 markets blur_enabled=true, all 102 fraud_strictness=flag
- [Phase 06]: react-native-vision-camera-face-detector pinned to v1.10.2 (v2.x requires vision-camera v5+; we are on v4.7.x)
- [Phase 06]: react-native-vision-camera-skia has no v4 version (all v5.x — A3 false); blur overlay uses plain Skia Canvas positioned absolutely over Camera
- [Phase 06]: BLUR_NATIVE_ENABLED=false default; babel.config.js worklets-core plugin required before enabling; Task 3 EAS build deferred to orchestrator
- [Phase 07]: deadline_at derived server-side in accept_check from checks.tier — client cannot influence it (T-07-01, D-01)
- [Phase 07]: assigned->no_scout and filming->no_scout edges added to is_valid_check_transition (BLOCKER-1 fix for expire_stale_filming + Plan 02 trouble-report)
- [Phase 07]: dispatch_timeout_s updated to 300 s (5-min unclaimed window, D-02)
- [Phase 07]: trouble-report drives check to no_scout (NOT cancelled) — BLOCKER-1: null uid cannot pass v_uid-is-distinct-from-v_seeker guard on cancelled transition
- [Phase 07]: NOFAULT_CENTS=300 (.00 flat) as named module-top constant — single-line change if Troy sends updated value (D-04)
- [Phase 07]: paymentIntents.cancel used for uncaptured holds (not refunds.create) — refunds.create fails on authorized PIs (Pitfall 4)
- [Phase 07]: 0016 RPCs are plpgsql (not pure-sql) to support IDOR guard raise inside SECURITY DEFINER
- [Phase 07]: instant payout rejects if amount > net_available (400) rather than silent clamp — prevents overdraw (Pitfall 5)
- [Phase 07]: log_event payment.payout_initiated called BEFORE payouts.create — audit-first, double-payout mitigation (T-07-07)
- [Phase 07]: waiting.tsx left untouched — already status-driven with no fixed Seeker countdown (D-01 satisfied)
- [Phase 07]: Trouble-Here awaits reportTrouble() server confirm before showing REPORTED state — prevents false refund claim (T-07-12)
- [Phase 07]: withdraw.tsx available balance from route params not hardcoded; requestPayout replaces setTimeout fake
- [Phase 07]: sla-sweeper is the SOLE caller of expire_stale_filming (BLOCKER-3)
- [Phase 07]: No-time-window hold query in sla-sweeper: authorized-filter is the idempotency guard
- [Phase 08]: lmc-blur is iOS-only this step (Android deferred fast-follow, TODO in index.ts); podspec pinned to iOS 15.5 to match app target
- [Phase 08]: blurFaces no-op returns status 'no_faces' (never 'blurred') so a passthrough cannot be mistaken for a real blur (Pitfall 5); plain AsyncFunction = no worklet/JSI bridge
- [Phase 08]: [Phase 08-02]: detection confidence threshold 0.3 (D-05 discretion); faceCount = max faces in any single sampled frame; export uses HighestQuality preset, video-only (VID-02), 0-byte output -> status failed
- [Phase 08]: [Phase 08-02]: detection failure non-fatal (logged, count=0); only EXPORT failure -> status failed (export is the framework-link gate); blurFaces still status no_faces (no pixels changed, Pitfall 5)
- [Phase 08]: [Phase 08-03]: Core Image blur via CIBlendWithMask (blur whole frame once + white-on-black face-rect mask, +20% padding); blurFaces now returns 'blurred'/'no_faces'(original untouched)/'failed'(any error, never sharp-as-blurred)
- [Phase 08]: [Phase 08-03]: Vision normalized rects -> CI pixels with NO Y-flip (both bottom-left); per-frame rect lookup = nearest sampled detection (no per-frame Vision, Pitfall 3); post-record radius=22 gaussian default
- [Phase 08]: Post-record blur wired into submit() behind BLUR_POST_RECORD_ENABLED (default TRUE for beta); blur runs before upload, uploads the blurred file, deletes the raw on success
- [Phase 08]: Blur failure (after retry->pixelate) never uploads the raw as a normal delivery; routes to the dormant server hold + Scout retake (D-07)
- [Phase 08]: Face-blur mask is now a soft feathered OVAL (not a square censor box); privacy coverage unchanged
- [Phase 09-verified-badge-scout-identity-quick-win-reconnects-surface-r]: get_check_scout_public inlines clip_count — never calls scout_earnings_totals (IDOR self-trap when auth.uid=Seeker != Scout)
- [Phase 09-verified-badge-scout-identity-quick-win-reconnects-surface-r]: No RLS widening in 0017: profiles_update_own (0005) row-level policy covers new notification_prefs/preferred_cities columns automatically

### Roadmap Evolution

- Phase 4 added (2026-06-21): Payments — Stripe Connect Express, card hold at request + capture-on-delivery, Scout payouts, refunds/disputes, instant-payout (2% fee), tax/KYC via Connect onboarding. Buildable in Stripe test mode; real money gated on US entity + EIN at launch. Currency/market-aware.
- Phase 5 added (2026-06-21): Verification moat + dispatch — geofenced dispatch (only Scouts inside a ~30-50m fence pinged; atomic accept, no double-assignment), reference-photo confirm before filming, GPS-stamped clips auto-rejected off-fence, AI signage detection auto-reject, 20-min Scout cooldown per venue. Replaces interim manual dispatch.

### Pending Todos

None yet.

### Blockers/Concerns

Carried from research — to resolve at the relevant phase, not now:

- Open business decisions to confirm with Troy before their phase ships: audio policy (video-only), venue allow-list vs film-anywhere for beta, Scout-protection refund policy, capture timing (all defaulted in PROJECT.md — confirm intentionally)
- Florida / NYC legal review (audio consent, no-film zones, filming/privacy law) before launch — cross-cutting, surfaces by Phase 6/7
- Phases flagged for deeper research at planning time: Phase 5 (atomic dispatch / double-assignment concurrency), Phase 6 (anti-fraud / iOS mock-location detection), Phase 4 (capture-timing + chargeback + Connect onboarding edges)
- Repo housekeeping before next commit: gitignore .claude-flow/.swarm/.mcp.json/*.db/SECURITY_*.json; drop unused react-native-maps; avoid retired ffmpeg-kit; fix RN version note

**ACTIVE (Plan 05-06 — on-device walk-through, the ONLY open Phase-5 item):**

- 05-06 autonomous deploy DONE: 0012 + 20260621000002 (was 0012b) live; markets seeded (102 rows); 4 Edge Functions deployed --no-verify-jwt (verify-clip, signage-check, mux-webhook, mux-upload-url); GOOGLE_VISION_API_KEY secret set; database.types.ts regenerated; tsc clean. pg_cron unavailable on this tier — expire_stale_dispatching() needs a Supabase Edge cron schedule before launch (one-time ops task).
- 05-06 Task 3 on-device geo walk-through STILL UNVERIFIED (human-verify): needs an EAS dev build + two sessions (Seeker + Scout) with real GPS. Must confirm: nearby Scout gets job / far Scout doesn't; off-fence clip auto-rejected + re-dispatched, Seeker not charged; on-site clip delivers; signage advisory recorded but never blocks; event_log captures every dispatch/verification event. Reply "approved" when all five pass. Do NOT mark Phase 5 complete until this passes.

**Carried-over (older checkpoints — confirm still relevant):**

- 01-02 human checkpoint: create Google OAuth client, enable Apple/Google providers in Supabase, run on-device dev build to test sign-in + session-survives-restart
- 02-04 Task 4 on-device live-status walk-through: now folds into the 05-06 on-device walk-through (live Supabase + two sessions are both ready).

## Session Continuity

Last session: 2026-06-22T12:38:57.003Z
Stopped at: Completed 09-01-PLAN.md (migration 0017 + RED pgTAP)
Resume file: None
