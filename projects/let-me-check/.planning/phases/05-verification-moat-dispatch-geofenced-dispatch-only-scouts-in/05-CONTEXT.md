# Phase 5: Verification Moat + Dispatch - Context

**Gathered:** 2026-06-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the interim MANUAL dispatch (any Scout sees any open check) with real geofenced dispatch, and add the on-submit clip verification that proves a clip is genuine and on-location. This is the competitive moat.

In scope: geofenced dispatch (radius-based, broadcast, first-accept, one-active-job), GPS-stamp verification of the submitted clip against a tight film-fence (auto-reject off-fence), signage AI as an advisory (non-rejecting) signal, freshness guarantees.

Out of scope: mock-GPS / location-spoofing anti-fraud (Phase 6), cooldown/anti-monopolization fairness rules (future), reference-photo confirm (dropped), push-notification infra (use existing dashboard surface for v1 unless the planner finds it trivial).
</domain>

<decisions>
## Implementation Decisions

### Dispatch
- **D-01:** A new `dispatching` check is broadcast to ALL eligible Scouts in the area; **first to accept wins** (the existing atomic `accept_check` already prevents double-booking).
- **D-02:** Dispatch radius ≈ **1.5 km**, and **MUST be tunable** (config-driven, not hard-coded) — lenient at launch (drivers/scooters/bikes travel in within the 7-10 min window), tightenable as Scout density grows. Do NOT confuse this with the film-fence; dispatch is wide, the film-fence is tight.
- **D-03:** A Scout may hold only **ONE active job at a time** — cannot accept multiple concurrent checks (prevents a camper from grabbing many jobs and bottlenecking Seekers). Enforced server-side in the accept path.

### Clip verification (film-fence)
- **D-04:** The submitted clip's GPS stamp must be within the **film-fence: 20-30 m of the venue, HARD MAX 30 m**. Kept tight so clips are clear, close, high-quality. A sensible GPS-wobble margin sits UNDER the 30 m cap so an honest on-site Scout passes, but nothing beyond 30 m ever passes.
- **D-05:** Off-fence clip → **auto-reject** (no human review): Seeker not charged, Scout not paid, job re-dispatched. Ties to Phase-4 capture-on-delivery + the "bad clip = no pay" rule. This is the ONLY hard auto-reject gate.

### Signage AI
- **D-06:** Signage AI **NEVER auto-rejects.** It runs as an advisory signal: when it can't read the venue name/sign it records "couldn't confirm sign" (as long as GPS passed). GPS is the hard gate. Built **tunable** so it can be tightened as the AI gets more accurate. (Refines the earlier PROJECT.md "signage auto-reject in v1" note — Troy explicitly downgraded it to advisory to avoid punishing honest Scouts for AI misreads.)

### Reference photo & cooldown
- **D-07:** Reference-photo-before-filming is **DROPPED** — GPS fence + signage AI cover location; the extra step isn't needed.
- **D-08:** **No cooldown at launch** — first-come, no per-venue/per-Scout re-film restriction. A Scout who camps a popular venue and delivers instantly is a BENEFIT (faster fulfillment; unlike Uber, Scouts can stay put). Revisit fairness/anti-monopolization later if one Scout starves others.

### Freshness
- **D-09:** Every check = a brand-new **15-second** capture, GPS- and time-stamped. Clips are **NEVER reused**; we charge for every check. (Fresh-capture is already enforced from Phase 3 — Phase 5 adds the GPS/time verification on submit.)

### Claude's Discretion
- Exact tunable values: dispatch radius default = 1500 m; film-fence target ~25 m with hard reject > 30 m (margin under the cap). Store as tunable config (DB row or typed constant), not magic numbers scattered in code.
- Geo implementation: use the EXISTING PostGIS `geography(point,4326)` columns (`venues.coord`, `checks.coord`) with `ST_DWithin` for both dispatch eligibility and film-fence verification. No new geo extension needed; H3 stays deferred (per STACK.md).
- Scout location source: how a Scout's current location is captured while "online" (needed to compute who's within the dispatch radius) — propose during planning.
- Dispatch delivery mechanism: geo-filtered dashboard list for v1 vs Expo Push notification — planner decides; push may be a thin add or deferred.
- Signage AI provider: Google Vision (per prior project decisions) unless research finds better.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Verification & dispatch decisions
- `.planning/PROJECT.md` — verification stack, capture-on-delivery, market-aware (no hard-coded radii/USD), the "signage auto-reject" note that D-06 refines
- `CLAUDE.md` (project root) — the 6-layer verification moat (geofence, only-nearby pinged, GPS-stamp auto-reject, signage AI, cooldown) and "Build Order Wave 1" item 2/4
- `docs/STACK.md` — PostGIS + Mapbox; H3 DEFERRED; signage = Google Vision; Expo Push
- `.planning/phases/04-payments-stripe-connect-express-card-hold-at-request-capture/04-CONTEXT.md` — capture-on-delivery + "bad clip = no pay" that the auto-reject (D-05) ties into

### Existing code & schema to extend
- `supabase/migrations/0003_markets_venues.sql`, `0004_core_entities.sql` — existing `geography(point,4326)` columns on `venues.coord` and `checks.coord` (geo foundation already in place)
- `lmc-app/app/lib/checks.ts` — `createCheck` (sets requested_lat/lng), `listOpenChecks` (NO geo filter yet — add ST_DWithin + scout location), `accept_check` (atomic; extend for one-active-job + geo eligibility)
- `lmc-app/app/(scout)/dashboard.tsx` — where dispatched jobs surface (online toggle exists; needs scout-location capture)
- `lmc-app/app/(scout)/filming.tsx` — already captures `capturedGps` at film time (Phase 3); Phase 5 verifies it on submit
- `supabase/functions/` — Edge Function pattern for any server-side verification (e.g. signage AI call)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- PostGIS `geography(point,4326)` columns already exist on `venues.coord` + `checks.coord` — use `ST_DWithin` for dispatch radius + film-fence checks (no schema overhaul needed).
- `accept_check` RPC is already atomic (Phase 2) — extend it to enforce geo-eligibility + one-active-job.
- `capturedGps` is already captured at film time in filming.tsx (Phase 3) — wire it into the submit/verification path.
- Mux webhook owns the `delivered` transition (Phase 3) — the GPS/signage verification gate must run BEFORE delivered (a failed clip never becomes delivered → never captured/paid).

### Established Patterns
- Server owns all state transitions + secrets (RLS); verification logic belongs server-side (Edge Function / RPC), not the client.
- Event-log every dispatch + verification event (pinged, accepted, gps_verified, gps_rejected, signage_flagged).
- Tunable config, not hard-coded radii (market-aware per PROJECT.md).

### Integration Points
- Dispatch: `listOpenChecks` → geo-filtered by scout location + dispatch radius; `accept_check` → add one-active-job + eligibility.
- Verification: on clip submit (the Phase-3 upload path) → server checks GPS vs film-fence BEFORE allowing delivered; signage AI runs advisory.
</code_context>

<specifics>
## Specific Ideas

- Two DISTINCT distances — keep them separate in code/config: **dispatch radius (wide, ~1.5 km, tunable)** vs **film-fence (tight, 20-30 m, hard max 30 m)**.
- Build everything tunable so dispatch radius, film-fence, GPS margin, and signage strictness can be adjusted as Scout density and AI accuracy improve — without a rewrite.
- "First to accept wins" + "one active job per Scout" is the whole dispatch fairness model for v1.
</specifics>

<deferred>
## Deferred Ideas

- Mock-GPS / location-spoofing / anti-fraud detection → Phase 6 (per project notes).
- Cooldown + anti-monopolization fairness (if one Scout starves others) → future.
- Reference-photo-before-filming → dropped (could revisit).
- Push notifications for dispatch (if not trivially included) → future / planner's call.
- Nearest-first or reputation-weighted dispatch → future (v1 is pure first-come).

</deferred>

---

*Phase: 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in*
*Context gathered: 2026-06-21*
