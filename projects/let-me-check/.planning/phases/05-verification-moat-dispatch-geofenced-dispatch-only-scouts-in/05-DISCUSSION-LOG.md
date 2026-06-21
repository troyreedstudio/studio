# Phase 5: Verification Moat + Dispatch - Discussion Log

> **Audit trail only.** Decisions are captured in CONTEXT.md.

**Date:** 2026-06-21
**Phase:** 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in
**Areas discussed:** Geofence & dispatch, Clip GPS check, Signage AI, Reference photo + cooldown

---

## Geofence & who gets pinged

**User's framing:** 50 m was conflated — you can't expect Scouts to already be at the venue, especially if recruiting Uber drivers / fleets nearby. With a 7-10 min window, a scooter/bike Scout could be ~1 km away and still make it. Be lenient early when Scouts are scarce.

**Resolved:** TWO distances. Dispatch radius ≈ **1.5 km, tunable** (widen/tighten with Scout density). Dispatch model: **broadcast to everyone in the area, first to accept wins** (atomic accept already prevents double-booking). Added guardrail: **one active job per Scout** (a camper shouldn't grab many jobs and bottleneck Seekers).

---

## Clip GPS check strictness (film-fence)

**User's choice:** Auto-reject off-fence, with a sensible margin. Refined the film-fence to **20-30 m, hard max 30 m** (keep clips clear, close, high quality). GPS-wobble margin sits UNDER the 30 m cap so honest on-site Scouts pass; nothing beyond 30 m passes. Off-fence → auto-reject (Seeker not charged, Scout not paid, re-dispatch).

---

## Signage AI strictness

**User's choice:** **Never auto-reject.** Signage AI states "couldn't confirm sign" as a flag as long as GPS passes verification. GPS is the hard gate. Build it tunable to tighten as the tech improves. (Downgrades the original PROJECT.md "signage auto-reject in v1" to advisory.)

---

## Reference photo + cooldown

**User's choice:** **Drop the reference photo** — GPS fencing + signage AI cover location. **No cooldown at launch** — lean Scout economy; first-come, no re-film restriction. A Scout camping a popular spot and delivering instantly is a platform benefit (unlike Uber, Scouts can stay put). Revisit fairness later. Agreed to the **one-active-job** guardrail and reaffirmed **freshness**: every check = a fresh 15-second clip, GPS + time-stamped, never reused, charged every time.

## Claude's Discretion
- Tunable values (radius 1500 m, film-fence ~25 m / hard 30 m), PostGIS ST_DWithin on existing geography columns, scout-location source, dispatch delivery (geo-filtered dashboard vs push), signage provider (Google Vision).

## Deferred Ideas
- Mock-GPS anti-fraud (Phase 6), cooldown/anti-monopolization (future), reference photo (dropped), push notifications (planner's call), nearest-first/reputation dispatch (future).
