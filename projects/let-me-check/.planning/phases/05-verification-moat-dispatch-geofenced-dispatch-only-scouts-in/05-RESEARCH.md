# Phase 5: Verification Moat + Dispatch — Research

**Researched:** 2026-06-21
**Domain:** PostGIS geo dispatch, GPS clip verification, Supabase Edge Functions, Google Vision API, Realtime
**Confidence:** HIGH (schema/code verified from codebase); MEDIUM (Google Vision integration); HIGH (PostGIS patterns)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Broadcast `dispatching` check to ALL eligible Scouts in dispatch radius. First to accept wins. Existing atomic `accept_check` prevents double-booking.
- **D-02:** Dispatch radius default ~1.5 km, MUST be tunable (config-driven). Wide and lenient at launch. Do not confuse with the tight film-fence.
- **D-03:** A Scout may hold only ONE active job at a time. Enforce server-side in the accept path.
- **D-04:** Submitted clip GPS must be within the film-fence: 20-30 m of the venue. HARD MAX 30 m. Sensible GPS-wobble margin sits under the cap.
- **D-05:** Off-fence clip auto-rejected. No human review. Seeker not charged, Scout not paid, job re-dispatched. Only hard auto-reject gate.
- **D-06:** Signage AI NEVER auto-rejects. Advisory only. Records "couldn't confirm sign" when unable to read the venue name (GPS passed). GPS is the hard gate. Tunable strictness.
- **D-07:** Reference-photo-before-filming DROPPED.
- **D-08:** No cooldown at launch.
- **D-09:** Every check is a fresh 15-second capture, GPS- and time-stamped. Never reused.

### Claude's Discretion

- Tunable config values: dispatch radius default = 1500 m; film-fence target ~25 m with hard reject > 30 m. Store as tunable config (DB row or typed constant), not magic numbers.
- Geo implementation: use EXISTING PostGIS `geography(point,4326)` columns with `ST_DWithin` for both dispatch eligibility and film-fence verification.
- Scout location source: how a Scout's current location is captured while "online" — propose during planning.
- Dispatch delivery: geo-filtered dashboard list for v1 vs Expo Push — planner decides.
- Signage AI provider: Google Vision per prior project decisions unless research finds better.

### Deferred Ideas (OUT OF SCOPE)

- Mock-GPS / location-spoofing / anti-fraud detection (Phase 6)
- Cooldown + anti-monopolization fairness (future)
- Reference-photo-before-filming (dropped)
- Push notifications for dispatch (planner's call; deferred if not trivial)
- Nearest-first or reputation-weighted dispatch (future, v1 is first-come)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISP-01 | Only Scouts inside the location's geofence are pinged for a request | PostGIS ST_DWithin on scout_locations vs checks.coord; dispatch_radius from market_config |
| DISP-02 | A request is claimed atomically — two Scouts can never be assigned the same job | accept_check already atomic (0007 WHERE scout_id IS NULL); extend with geo + one-active-job guard |
| DISP-03 | If no Scout accepts within the window, the request times out gracefully (release hold / refund, notify Seeker) | dispatch_timeout from market_config; Edge Function or DB background worker sets no_scout + cancels PI |
| SCOUT-03 | A Scout can go online / set availability and receive nearby jobs | scout_locations table; foreground expo-location watchPositionAsync; geo-filtered listOpenChecks |
| VER-01 | Capture is GPS-geofenced and the clip is GPS-stamped (recorded at the right place/time) | film-fence ST_DWithin in verify-clip Edge Function; filmed_lat/lng already on clips table |
| VER-03 | Scout cooldown per location (D-08: not at launch) | No-op at launch; column reserved for future |
| VER-05 | Location integrity hardened — maximize GPS accuracy; detect/reject spoofed GPS | Phase 5 scope: GPS hard fence (30 m max). Anti-spoof deferred to Phase 6 per CONTEXT.md |
| SAFE-01 | No-film zones auto-blocked (hospitals, schools, courts, police, private residences) | Server-side check against no_film_zones table at createCheck time |
</phase_requirements>

---

## Summary

Phase 5 replaces the interim manual dispatch (any Scout sees any open check) with two complementary server-side systems: (1) a geo-filtered dispatch mechanism that only surfaces checks to Scouts within a tunable dispatch radius, and (2) a GPS verification gate that auto-rejects any clip submitted from more than 30 m outside the venue before it can ever reach `delivered`.

The existing codebase already has the correct foundation: PostGIS `geography(point,4326)` columns on `venues.coord` (0003), a `filmed_lat`/`filmed_lng` pair on `clips` (0008), an atomic `accept_check` RPC that prevents double-booking (0007), and a transition guard that requires a `ready` clip before `delivered` is allowed (0010). Phase 5 extends these with: a `scout_locations` table (lat/lng + updated_at per online Scout), a geo-filtered `list_open_checks_for_scout` RPC, two new guards inside `accept_check` (geo-eligibility + one-active-job), a `verify-clip` Edge Function that does the GPS fence check before the Mux webhook can transition to `delivered`, a `signage-check` Edge Function that runs advisory Google Vision TEXT_DETECTION and records results without gating delivery, tunable config rows in `market_config`, and `no_film_zones` as a PostGIS polygon table for SAFE-01.

The Mux webhook (mux-webhook/index.ts) must NOT transition to `delivered` until `verify-clip` has cleared the GPS fence. The cleanest hook point is in the mux-webhook itself: it calls `verify-clip` (or an internal RPC `verify_clip_gps`) before driving the `delivered` transition. If GPS fails, the clip is marked `rejected`, the check returns to `dispatching`, and the Stripe hold is kept alive (Seeker not charged, re-dispatch instead).

**Primary recommendation:** Store dispatch radius and film-fence radius in a `market_config` table (one row per market_id), query them server-side in RPCs and Edge Functions. Never hard-code numeric distances in client code.

---

## Standard Stack

### Core (already in repo — confirmed from migrations and package.json)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostGIS | bundled with Supabase | Geography radius queries, ST_DWithin | Only standard Postgres spatial extension; already enabled in 0001 [VERIFIED: 0001_event_log.sql] |
| expo-location | latest SDK 54 | Scout foreground GPS capture | Already in Expo SDK 54 bundle; foreground watchPositionAsync is appropriate for dispatch [VERIFIED: filming.tsx uses Location.getCurrentPositionAsync] |
| Supabase Edge Functions (Deno) | Supabase-hosted Deno | GPS verify gate, signage AI call | Existing pattern for mux-webhook, stripe-capture; service-role client available [VERIFIED: functions/_shared/supabase.ts] |
| Google Vision API (REST) | v1 | Signage TEXT_DETECTION advisory | Locked in STACK.md; ~$1.50/1000 images at launch scale is effectively free [CITED: cloud.google.com/vision/pricing] |

### New Schema Needed

| Object | Type | Purpose |
|--------|------|---------|
| `scout_locations` | Table | One row per online Scout, lat/lng/updated_at; GiST indexed; RLS: Scout writes own row |
| `market_config` | Table | Tunable dispatch_radius_m, film_fence_m, signage_min_confidence, dispatch_timeout_s per market_id |
| `no_film_zones` | Table | PostGIS polygon shapes for SAFE-01 auto-block |
| `clips.signage_confirmed` | Column (additive) | Boolean/null advisory result from Google Vision; null = not-yet-run |
| `clips.gps_verified` | Column (additive) | Boolean: true = GPS fence passed; false = rejected; null = pending verify |
| `verify-clip` | Edge Function | Runs GPS fence check + optional SAFE-01 re-check; drives rejection or clearance |
| `signage-check` | Edge Function | Calls Google Vision; records result in clips.signage_confirmed; never gates delivery |
| `list_open_checks_for_scout` | RPC (SECURITY DEFINER) | Returns dispatching checks within dispatch radius of the calling Scout's last known location |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Scout location in Postgres table | Supabase Realtime Presence | Presence is transient (memory only), not queryable by SQL dispatch RPC. Postgres table wins for dispatch radius queries. [ASSUMED] |
| Google Vision TEXT_DETECTION | AWS Rekognition DetectText | Both ~$1.50/1000; Google Vision already decided in STACK.md. Use REST, NOT the NPM client library (Deno timeout issue confirmed). [VERIFIED: GitHub discussion #36182] |
| Polling in dashboard.tsx for open checks | Realtime Postgres Changes on checks | Polling is simpler and already works. Realtime broadcast of dispatching checks is a Phase 7 enhancement. |

**Installation (new dep — none needed):** All dependencies already installed. expo-location is in the SDK. The Google Vision call is a plain `fetch()` in Deno.

---

## Architecture Patterns

### Recommended Project Structure (new files)

```
supabase/
  migrations/
    0012_scout_locations.sql         # scout_locations table + GiST index + RLS
    0012_market_config.sql           # OR combined: market_config + no_film_zones tables
    0012_dispatch_config.sql         # dispatch/film-fence config values
    0012_clip_verification.sql       # additive columns: clips.gps_verified, clips.signage_confirmed
    0012_accept_check_v3.sql         # extend accept_check: geo + one-active-job guard
    0012_dispatch_rpc.sql            # list_open_checks_for_scout geo-filtered RPC
    0012_state_machine_v3.sql        # extend is_valid_check_transition: dispatching->dispatching (re-dispatch)
  functions/
    verify-clip/
      index.ts                       # GPS fence + (optional) no-film-zone re-check; updates clips.gps_verified
      index.test.ts                  # Wave-0 Deno tests
    signage-check/
      index.ts                       # Google Vision TEXT_DETECTION advisory; updates clips.signage_confirmed
      index.test.ts

lmc-app/app/
  lib/
    scout-location.ts                # updateScoutLocation() — upserts scout_locations row
    dispatch.ts                      # listOpenChecksForScout(lat, lng) RPC wrapper
  (scout)/
    dashboard.tsx                    # ADD: expo-location watchPositionAsync; pass lat/lng to dispatch RPC
```

### Pattern 1: Scout Location Upsert (scout_locations table)

**What:** When a Scout goes online and while they remain online, the app upserts a row in `scout_locations` with their current lat/lng every ~30 seconds (foreground watchPositionAsync).

**When to use:** Dispatch query needs a queryable lat/lng for each online Scout. Realtime Presence is ephemeral and not SQL-queryable. A simple table with a GiST index is the right answer at this scale.

```sql
-- Source: PostGIS docs ST_DWithin geography pattern [CITED: postgis.net/docs/ST_DWithin.html]
create table public.scout_locations (
  scout_id   uuid primary key references auth.users(id),
  coord      geography(point, 4326) not null,    -- lon,lat
  is_online  boolean not null default true,
  updated_at timestamptz not null default now()
);
create index scout_locations_coord_gix on public.scout_locations using gist (coord);
-- RLS: each Scout writes their own row only; no other client reads raw locations
```

```typescript
// Source: expo-location docs [CITED: docs.expo.dev/versions/latest/sdk/location/]
// In dashboard.tsx — foreground watch while online
import * as Location from 'expo-location';

const sub = await Location.watchPositionAsync(
  { accuracy: Location.Accuracy.High, distanceInterval: 20 }, // only re-emit after 20m movement
  async (pos) => {
    await upsertScoutLocation(pos.coords.latitude, pos.coords.longitude);
  }
);
// Remove sub when Scout goes offline or screen unmounts
```

### Pattern 2: Geo-Filtered Dispatch RPC

**What:** A SECURITY DEFINER RPC that accepts the Scout's current lat/lng and returns only `dispatching` checks whose venue or requested coord is within the dispatch radius.

```sql
-- Source: PostGIS ST_DWithin geography (units = meters) [CITED: postgis.net/docs/ST_DWithin.html]
create or replace function public.list_open_checks_for_scout(
  p_scout_lat double precision,
  p_scout_lng double precision
)
returns setof public.checks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispatch_radius_m double precision;
  v_scout_coord geography;
begin
  -- Get tunable radius from market_config (default 1500 m per D-02)
  select dispatch_radius_m into v_dispatch_radius_m
  from public.market_config
  limit 1;   -- Phase 5: single-market; Phase 7 adds per-market lookup

  v_scout_coord := ST_SetSRID(ST_MakePoint(p_scout_lng, p_scout_lat), 4326)::geography;

  return query
    select c.*
    from public.checks c
    left join public.venues v on v.id = c.venue_id
    where c.status = 'dispatching'
      and c.scout_id is null
      -- Dispatch filter: venue coord OR requested coord within radius
      and (
        (v.coord is not null and ST_DWithin(v.coord, v_scout_coord, v_dispatch_radius_m))
        or
        (c.coord is not null and ST_DWithin(c.coord, v_scout_coord, v_dispatch_radius_m))
      )
    order by c.created_at asc;
end;
$$;
```

**Key insight:** `ST_DWithin` with `geography(point,4326)` uses meters for the distance parameter — no unit conversion needed. [VERIFIED: postgis.net/docs/ST_DWithin.html]

**Note on `checks.coord`:** The existing `checks` table has `requested_lat`/`requested_lng` columns (0008) but NOT a `geography` column. Phase 5 should add `coord geography(point,4326)` to `checks` (populated by `createCheck`) so the dispatch RPC can use ST_DWithin with an index. Alternatively, cast on the fly: `ST_SetSRID(ST_MakePoint(c.requested_lng, c.requested_lat), 4326)::geography` — but this is not index-assisted. The migration should ADD `checks.coord` and populate it. [VERIFIED: 0008_clips_location.sql — lat/lng exist but no geography column]

### Pattern 3: Hardened accept_check (geo + one-active-job)

**What:** Extend the existing atomic `accept_check` RPC (0007) to enforce two new pre-conditions BEFORE the guarded UPDATE.

```sql
-- Extends 0007 accept_check — two new guards:
-- (a) geo-eligibility: Scout's last known coord is within dispatch radius of the check
-- (b) one-active-job: Scout has no other checks in dispatching/assigned/filming status
create or replace function public.accept_check(p_check_id uuid)
returns check_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid               uuid := auth.uid();
  v_dispatch_radius_m double precision;
  v_scout_coord       geography;
  v_check_coord       geography;
  v_active_jobs       int;
  v_updated           int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  -- (a) geo-eligibility: Scout must be within dispatch radius of the check
  select dispatch_radius_m into v_dispatch_radius_m from public.market_config limit 1;
  select coord into v_scout_coord from public.scout_locations where scout_id = v_uid;
  if v_scout_coord is null then
    raise exception 'accept_check: Scout location unknown; go online to set location';
  end if;
  select coord into v_check_coord from public.checks where id = p_check_id;
  if v_check_coord is not null
     and not ST_DWithin(v_scout_coord, v_check_coord, v_dispatch_radius_m) then
    raise exception 'accept_check: Scout is outside the dispatch radius for this check';
  end if;

  -- (b) one-active-job: block a second concurrent accept
  select count(*) into v_active_jobs
  from public.checks
  where scout_id = v_uid
    and status in ('assigned', 'filming', 'uploaded', 'processing');
  if v_active_jobs > 0 then
    raise exception 'accept_check: Scout already has an active job';
  end if;

  -- Original atomic first-wins UPDATE (unchanged guard: status='dispatching' AND scout_id IS NULL)
  update public.checks
  set scout_id = v_uid, status = 'assigned', updated_at = now()
  where id = p_check_id and status = 'dispatching' and scout_id is null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'check % already taken or not open', p_check_id;
  end if;

  perform public.log_event('check.accepted', 'check', p_check_id,
    jsonb_build_object('scout_id', v_uid));
  return 'assigned';
end;
$$;
```

**Race safety:** The `FOR UPDATE` implicit in the guarded UPDATE preserves the original race-proof guarantee. The one-active-job check is a snapshot read inside the same transaction — a Scout can't accept a second job concurrently because the first UPDATE locks the row. [ASSUMED — the pattern is standard but cross-row snapshot isolation means a very tight concurrent race window exists; the WHERE scout_id=v_uid count read is not locked. For v1 at beta scale this is acceptable; the worst case is two near-simultaneous accepts for two different checks by the same Scout — both succeed, but the second job's accept would fail if the first had already committed. This is a known limitation of optimistic concurrency; a full solution requires serializable isolation or a Scout-level advisory lock, which is over-engineering for v1.]

### Pattern 4: GPS Verification Gate in mux-webhook

**What:** The mux-webhook (which owns the `delivered` transition) must call `verify-clip` BEFORE driving `delivered`. The GPS check runs using the `filmed_lat`/`filmed_lng` already stored on the `clips` row (set during upload via the existing `useClipUpload` flow).

**Verification flow:**

```
mux-webhook receives video.asset.ready
  → finalize clip row (mux_asset_id, playback_id, status='ready')  [existing step 6]
  → NEW: invoke verify-clip Edge Function (checkId)
      → verify-clip reads clips.filmed_lat/filmed_lng + checks.coord from DB
      → ST_DWithin(clip_coord, venue_coord, film_fence_m)
          → TRUE:  update clips.gps_verified = true; log gps_verified event
                   → mux-webhook proceeds to transition_check('delivered')
                   → stripe-capture fires (existing step 8)
          → FALSE: update clips.gps_verified = false, clips.status = 'rejected'
                   log gps_rejected event
                   → mux-webhook calls transition_check('dispatching') to RE-DISPATCH
                   → Stripe hold NOT captured (Seeker not charged)
                   → Scout not paid
```

**Where the GPS coord comes from:** `films.tsx` already calls `stampGps()` and stores `capturedGps.current`. The `useClipUpload.submit()` function accepts a `_gps` parameter but currently ignores it (Phase 3 left verification to Phase 5). Phase 5 must: (a) send the GPS in the upload request to `mux-upload-url` so it can be written to `clips.filmed_lat`/`filmed_lng`, OR (b) have the client call a new `upsert-clip-gps` Edge Function after the upload PUT succeeds. Option (a) is cleaner: modify `mux-upload-url` to accept and persist `filmed_lat`/`filmed_lng` from the request body. The Scout client sends `capturedGps.current` with the upload request.

**The `checks.coord` seam:** `verify-clip` needs to compare the clip's GPS against the venue/check location. The check has `requested_lat`/`requested_lng` (from 0008) and the venue has `venues.coord`. Phase 5 should add `checks.coord geography(point,4326)` populated at `createCheck` time from `venue_id → venues.coord` or from `requested_lat/lng`.

### Pattern 5: signage-check Edge Function (advisory only)

**What:** After GPS verification passes, mux-webhook invokes `signage-check` asynchronously (non-blocking for `delivered` — runs in parallel or as a fire-and-forget after the `delivered` transition). It calls Google Vision TEXT_DETECTION on a Mux thumbnail URL.

```typescript
// Source: Google Vision REST API [CITED: cloud.google.com/vision/docs/reference/rest]
// In signage-check/index.ts (Deno Edge Function)
const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.png?time=5`;
// Source: Mux thumbnail docs [CITED: mux.com/docs/guides/get-images-from-a-video]
// NOTE: signed playback IDs require a signed thumbnail URL. For advisory only,
// use a short-lived JWT or fetch the thumbnail server-side after minting a token.

const visionRes = await fetch(
  `https://vision.googleapis.com/v1/images:annotate?key=${Deno.env.get('GOOGLE_VISION_API_KEY')}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        image: { source: { imageUri: thumbnailUrl } },
        features: [{ type: 'TEXT_DETECTION', maxResults: 10 }],
      }],
    }),
  }
);
// Parse detected text; check if venue name appears (fuzzy match)
// Record clips.signage_confirmed = true/false/null
// NEVER reject delivery based on this result (D-06)
```

**Critical: use REST, NOT the @google-cloud/vision NPM package.** The NPM package consistently times out in Deno Edge Functions due to an environment-specific issue. The REST API via `fetch()` works reliably. [VERIFIED: GitHub orgs/supabase/discussions/36182]

**Signed playback thumbnails:** If the Mux asset has a signed playback policy (which LMC uses per 0010 — `mux_playback_policy: 'signed'`), the thumbnail URL at `image.mux.com/{playbackId}/thumbnail.png` also requires signing. The `signage-check` Edge Function already has the Mux signing key (from `_shared/mux.ts`), so it can mint a short-lived thumbnail JWT. Alternatively, download the first frame via the Mux API using the service token and pass the bytes as base64 to Vision — this avoids signed URL issues and the "do not depend on externally-hosted images" caution in Vision docs. [CITED: cloud.google.com/vision/docs/request — recommends base64 or Cloud Storage for production]

### Pattern 6: market_config Table (tunable radii)

```sql
create table public.market_config (
  market_id           text primary key references public.markets(id),
  dispatch_radius_m   double precision not null default 1500,   -- D-02: ~1.5 km
  film_fence_m        double precision not null default 25,      -- D-04: target ~25m
  film_fence_max_m    double precision not null default 30,      -- D-04: hard max 30m (never pass)
  dispatch_timeout_s  int              not null default 600,     -- 10 min; DISP-03
  signage_min_conf    double precision not null default 0.5      -- D-06: tunable, advisory only
);
-- Seed: one row per market ('nyc', 'mia') with the defaults above.
```

**Naming note:** Use `film_fence_m` as the target and `film_fence_max_m` as the hard cap. `verify-clip` uses `film_fence_max_m` as the rejection threshold; `film_fence_m` is informational/logging.

### Pattern 7: Re-dispatch on GPS rejection

When `verify-clip` determines a clip's GPS is out of fence:

1. Update `clips.gps_verified = false`, `clips.status = 'rejected'`.
2. Log `check.gps_rejected` event.
3. Update `checks.scout_id = NULL` (service role — the scout_id must be clearable for re-dispatch).
4. Call `transition_check(checkId, 'dispatching')` as service role.

**State machine extension needed:** `is_valid_check_transition` must allow `filming -> dispatching` (re-dispatch) and `uploaded -> dispatching` (if GPS check runs after upload). These edges are NOT currently in the legal-edge table (0010). Migration 0012 must add them. [VERIFIED: 0010_clips_mux.sql — no re-dispatch edge exists]

**scout_id nullability on re-dispatch:** `accept_check` (0007) is the sole writer of `scout_id`. For re-dispatch, the service role (in `verify-clip`) must null out `scout_id`. Add a service-role-only `reset_check_for_redispatch(p_check_id uuid)` RPC that: nulls `scout_id`, sets status back to `dispatching`, and logs the event. This keeps the "sole writer of scout_id" invariant explicit.

### Anti-Patterns to Avoid

- **Performing GPS check client-side:** The client supplies `capturedGps` — it must be verified server-side. Never trust the client's reported GPS. [VERIFIED: CONTEXT.md "Server owns all state transitions + secrets (RLS)"]
- **Hard-coding 30 m or 1500 m in client or Edge Function code:** Always read from `market_config`. Enforcement belongs in the server function; the client just sends coordinates.
- **Using the @google-cloud/vision NPM package in Deno:** Consistent timeout. Use REST fetch. [VERIFIED: GitHub supabase discussion #36182]
- **Letting mux-webhook transition to `delivered` before GPS passes:** If GPS fails after `delivered`, the Seeker already has the clip and is charged. The gate MUST run before the `delivered` transition.
- **Blocking `delivered` on signage AI:** Signage AI is advisory. Do not await the signage result before transitioning `delivered`. [LOCKED: D-06]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Geo radius filtering | Custom Haversine JS | `ST_DWithin(geography, geography, meters)` in Postgres RPC | ST_DWithin uses GiST spatial index; Haversine in JS means full table scan on every dispatch refresh |
| Scout online tracking | Realtime Presence or Redis TTL | `scout_locations` Postgres table + GiST index | Presence is not SQL-queryable for dispatch; Redis needs a separate service; simple table wins at v1 scale |
| Image analysis for signage | Custom ML model | Google Vision TEXT_DETECTION via REST | ~$1.50/1000 = effectively $0 at launch; high accuracy on signs/text |
| Dispatch timeout | `setInterval` on the client | `dispatch_timeout_s` in market_config + server-side transition to `no_scout` | Client can disconnect; server job (Edge Function on schedule or DB trigger) is reliable |
| One-active-job enforcement | Client-side check | Server-side guard in `accept_check` SECURITY DEFINER function | Client can lie; server guard is the only honest gate |

---

## Common Pitfalls

### Pitfall 1: ST_MakePoint argument order (lon, lat — NOT lat, lon)

**What goes wrong:** PostGIS `ST_MakePoint(x, y)` takes longitude as the first argument and latitude as the second — the opposite of how React Native/expo-location returns `{ latitude, longitude }`.

**Why it happens:** GPS APIs return `(lat, lng)` in human-readable order; PostGIS follows the GeoJSON/mathematical convention of `(x=longitude, y=latitude)`.

**How to avoid:** In every RPC and Edge Function, always write `ST_MakePoint(longitude, latitude)`. In TypeScript, always pass `lng` first.

**Warning signs:** Dispatch radius appears to work but scouts in Australia show as "nearby" a New York venue, or no scouts are ever within radius despite being present.

```sql
-- CORRECT
ST_SetSRID(ST_MakePoint(p_scout_lng, p_scout_lat), 4326)::geography
-- WRONG
ST_SetSRID(ST_MakePoint(p_scout_lat, p_scout_lng), 4326)::geography
```

### Pitfall 2: Mux thumbnail requires signing when playback policy is 'signed'

**What goes wrong:** `signage-check` constructs `https://image.mux.com/{playbackId}/thumbnail.png` and passes it to Vision API, but Vision gets a 401 from Mux because the playback ID requires a signed JWT.

**Why it happens:** LMC uses `mux_playback_policy: 'signed'` (confirmed in mux-webhook and 0010 comment). Public image URLs work only with public playback IDs.

**How to avoid:** Either (a) fetch the thumbnail bytes server-side with a Mux service token and send as base64 to Vision, or (b) mint a short-lived image JWT using `_shared/mux.ts`. Option (a) is safer for Vision (avoids the "do not depend on externally-hosted images" warning in Vision docs).

### Pitfall 3: GPS accuracy on mobile can exceed 30 m indoors

**What goes wrong:** A Scout standing directly outside a venue's door gets an honest GPS reading of 35 m due to urban canyon / building interference, gets auto-rejected, and can't complete the check.

**Why it happens:** iOS and Android report GPS accuracy via `coords.accuracy` (radius in meters, 68% confidence). In dense urban areas or indoors, accuracy can be 50-100 m even when the Scout is physically at the venue.

**How to avoid:** (a) Use `Location.Accuracy.Highest` in filming.tsx to maximize fix quality. (b) In `verify-clip`, read `coords.accuracy` sent alongside the filmed_lat/lng. If `accuracy > film_fence_max_m`, the reading itself is unreliable — consider passing with a warning log rather than hard-rejecting (or require accuracy < 50 m as a secondary threshold). (c) Document: the 30 m cap is the venue-to-clip distance, not the GPS accuracy tolerance; GPS wobble margin is built into the 25 m target vs 30 m cap. The planner must decide: reject if GPS accuracy > 30 m, or accept with signage fallback note? [ASSUMED — this is a calibration question needing a decision]

### Pitfall 4: Re-dispatch breaks the payment hold timing

**What goes wrong:** A clip is GPS-rejected and the check re-dispatches to a new Scout. The Stripe hold (PaymentIntent) is still alive on the Seeker's card. The new Scout delivers and the hold captures correctly.

**Why it happens:** Re-dispatch is designed to keep the hold alive so the Seeker eventually gets their clip without needing to re-authorize. This is correct behavior per D-05 ("Seeker not charged" = capture doesn't happen for the rejected clip, NOT that the hold is released).

**How to avoid:** Ensure `verify-clip` does NOT invoke `stripe-capture` on rejection. Only the `delivered` transition invokes `stripe-capture` (from mux-webhook step 8). The hold remains authorized and times out per Stripe's rules (~7 days) if re-dispatch also fails. DISP-03 (dispatch timeout) must cancel the PI if no Scout ever delivers.

### Pitfall 5: Multiple dispatching clips for one check (if re-dispatch is not idempotent)

**What goes wrong:** On GPS rejection, the check is set back to `dispatching`. If a new Scout submits before verification is complete, you could get two `clips` rows for the same `check_id`.

**Why it happens:** The `clips` table has no UNIQUE constraint on `check_id` — it allows multiple rows (for retakes). A second Scout submitting a clip would insert a second row.

**How to avoid:** `verify-clip` must query `clips WHERE check_id = ? ORDER BY created_at DESC LIMIT 1` to verify the LATEST clip. The `mux-webhook` idempotency check (`if existing?.status === 'ready'`) already prevents duplicate processing — extend this to check for the latest clip by mux_asset_id. Additionally, ensure the reset_check_for_redispatch RPC marks the previous clip as `rejected` before resetting the check to `dispatching`.

### Pitfall 6: No GiST index on checks.coord (if added)

**What goes wrong:** The dispatch RPC is slow because `ST_DWithin` on `checks.coord` cannot use an index.

**Why it happens:** `checks` currently has `requested_lat`/`requested_lng` as plain double-precision columns with no `geography` column and no spatial index. If Phase 5 adds `checks.coord geography`, it must also add a GiST index.

**How to avoid:** `create index checks_coord_gix on public.checks using gist (coord)` in the migration. Similarly for `scout_locations.coord` (the dispatch query joins scout location against check location).

### Pitfall 7: @google-cloud/vision NPM package times out in Deno

**What goes wrong:** Using `import { ImageAnnotatorClient } from 'npm:@google-cloud/vision'` in a Supabase Edge Function causes consistent timeouts.

**Why it happens:** Known Deno environment issue — the gRPC transport the NPM library uses behaves differently in Deno than Node.js. [VERIFIED: GitHub orgs/supabase/discussions/36182]

**How to avoid:** Use direct REST `fetch()` to `https://vision.googleapis.com/v1/images:annotate?key=...`. Pattern confirmed to work in Deno.

---

## Code Examples

### Dispatch: geo-filtered listOpenChecks in TypeScript

```typescript
// Source: Supabase docs — rpc() pattern [CITED: supabase.com/docs/guides/database/extensions/postgis]
// lmc-app/app/lib/dispatch.ts (new file)
export async function listOpenChecksForScout(
  lat: number,
  lng: number
): Promise<CheckRow[]> {
  const { data, error } = await supabase.rpc('list_open_checks_for_scout', {
    p_scout_lat: lat,
    p_scout_lng: lng,
  });
  if (error) throw error;
  return data ?? [];
}
```

### Scout location upsert (RLS: Scout writes own row only)

```typescript
// lmc-app/app/lib/scout-location.ts (new file)
export async function upsertScoutLocation(lat: number, lng: number): Promise<void> {
  const uid = await requireUserId();
  const { error } = await supabase
    .from('scout_locations')
    .upsert({
      scout_id: uid,
      coord: `POINT(${lng} ${lat})`,   // WKT: lon first
      is_online: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'scout_id' });
  if (error) throw error;
}
```

**Note:** Supabase JS client accepts WKT strings for geography columns. [ASSUMED — verify with Supabase JS client docs before implementation; alternatively cast in SQL via RPC]

### verify-clip Edge Function (skeleton)

```typescript
// supabase/functions/verify-clip/index.ts
import { serviceClient } from '../_shared/supabase.ts';

export async function handleVerifyClip(
  checkId: string,
  deps: { svc: typeof serviceClient }
): Promise<{ passed: boolean; distance_m: number | null }> {
  const svc = deps.svc();

  // Read clip GPS + venue/check coord
  const { data: clip } = await svc.from('clips')
    .select('filmed_lat, filmed_lng')
    .eq('check_id', checkId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  const { data: check } = await svc.from('checks')
    .select('coord, venue_id')
    .eq('id', checkId)
    .single();

  if (!clip?.filmed_lat || !check?.coord) {
    // No GPS data — log and pass (can't reject what we can't verify)
    return { passed: true, distance_m: null };
  }

  // Server-side distance calculation via PostGIS RPC
  const { data: dist } = await svc.rpc('distance_m', {
    lat1: clip.filmed_lat, lng1: clip.filmed_lng,
    geog2: check.coord,
  });

  // Read film_fence_max_m from market_config
  const { data: cfg } = await svc.from('market_config').select('film_fence_max_m').limit(1).single();
  const maxFence = cfg?.film_fence_max_m ?? 30;

  const passed = dist <= maxFence;
  await svc.from('clips').update({ gps_verified: passed }).eq('check_id', checkId);
  await svc.rpc('log_event', {
    p_event_type: passed ? 'check.gps_verified' : 'check.gps_rejected',
    p_subject_type: 'check',
    p_subject_id: checkId,
    p_context: { distance_m: dist, film_fence_max_m: maxFence },
  });
  return { passed, distance_m: dist };
}
```

### mux-webhook extension (GPS gate before delivered)

```typescript
// In handleMuxWebhook, BETWEEN step 6 (finalize clip) and step 7 (transition_check):
// NEW: GPS verification gate
const verifyResult = await deps.svc.functions.invoke('verify-clip', { body: { checkId } });
if (verifyResult.data?.passed === false) {
  // GPS rejected — reset check to dispatching, do NOT deliver, do NOT capture
  await deps.svc.rpc('reset_check_for_redispatch', { p_check_id: checkId });
  return new Response('gps_rejected', { status: 200 });
}
// Existing step 7: transition_check uploaded -> processing -> delivered
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Any Scout sees any open check (manual dispatch) | Geo-filtered dispatch via ST_DWithin | Phase 5 | Scouts only see checks within ~1.5 km radius |
| GPS stamp collected but not verified (Phase 3) | GPS verified server-side against film-fence | Phase 5 | Hard auto-reject for off-site clips |
| Signage AI auto-rejects (original STACK.md) | Signage AI is advisory only (D-06) | CONTEXT.md gather | Honest Scouts not punished for AI misreads |
| H3 hexagonal indexing (STACK.md) | PostGIS ST_DWithin only — H3 deferred | STACK.md note | Simpler, already enabled, adequate for v1 |

**Deprecated/outdated:**
- "Signage auto-reject in V1" from PROJECT.md: Refined by D-06 — signage is advisory, never gates delivery.
- The filming.tsx `_gps` parameter ignored in `useClipUpload.submit()`: Phase 5 must wire it through to the server.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase JS client accepts WKT `'POINT(lon lat)'` strings for geography columns in upsert | Scout location upsert example | Upsert fails; workaround: use an RPC that casts internally |
| A2 | One-active-job snapshot read inside accept_check is safe enough at beta scale despite tight concurrent race window | accept_check guard | Two Scouts could theoretically both pass the check for two different jobs simultaneously; in practice at v1 Scout density this is acceptable |
| A3 | Mux signed playback thumbnails require signed JWT for image.mux.com requests | Signage check Pattern 5 | Signage check fails silently (401 from Mux); advisory result stays null, no delivery blocked |
| A4 | Calling `verify-clip` synchronously from mux-webhook before the `delivered` transition adds acceptable latency (< 2 s) at v1 scale | mux-webhook extension | If verify-clip is slow, the webhook response delays; Mux may retry; idempotency guard covers this |
| A5 | `reset_check_for_redispatch` can null out `scout_id` and set status back to `dispatching` using an additive state machine edge | Re-dispatch pattern | If is_valid_check_transition doesn't allow the new edges, the re-dispatch will throw and the check gets stuck |
| A6 | GPS accuracy metadata (`coords.accuracy` in meters) can be passed as an additional field alongside `filmed_lat`/`filmed_lng` in the mux-upload-url request | GPS pitfall note | If accuracy is not captured, verify-clip cannot distinguish "on-site with poor fix" from "off-site with good fix" |

---

## Open Questions

1. **Does `checks` need a `coord geography` column, or should the dispatch RPC cast `requested_lat`/`requested_lng` on the fly?**
   - What we know: 0008 adds `requested_lat`/`requested_lng` as plain floats; no geography column on checks.
   - What's unclear: Cast-on-the-fly is simpler but not index-assisted, meaning a dispatch query must scan all `dispatching` checks (likely < 100 at beta scale, so acceptable).
   - Recommendation: Add `checks.coord geography(point,4326)` in Phase 5 migration for future-proofing. Populate via trigger or at createCheck time from venue.coord or lat/lng.

2. **Should the dispatch timeout (DISP-03) run as a Deno scheduled function or a Postgres cron job?**
   - What we know: STACK.md lists Inngest/Trigger.dev for background jobs; these are not yet set up.
   - What's unclear: pg_cron is simpler (no new service) but the Supabase free tier may have limitations on pg_cron.
   - Recommendation: For v1, a simple server-side Edge Function on a schedule (Supabase cron via pg_cron or Inngest) that queries `dispatching` checks past their timeout and transitions them to `no_scout`. The planner should decide if pg_cron is available on the Supabase plan.

3. **Should the GPS from the Scout client be sent to `mux-upload-url` (at upload time) or as a separate call?**
   - What we know: `capturedGps.current` is available in filming.tsx when submit is tapped; `useClipUpload.submit()` accepts `gps` but ignores it.
   - What's unclear: If GPS is sent to `mux-upload-url`, that Edge Function writes it to `clips.filmed_lat/lng` before the upload begins, which is clean. Alternatively a separate `upsert-clip-gps` call after the PUT is also workable.
   - Recommendation: Modify `mux-upload-url` request body to include `{ checkId, filmed_lat, filmed_lng, filmed_accuracy_m }` and write these to the clips row at upload-URL-creation time (before the file is even PUT). This is the cleanest single-seam approach.

4. **What happens to the Stripe hold if re-dispatch also fails (no Scout ever accepts)?**
   - What we know: The hold times out per Stripe (~7 days). DISP-03 requires graceful timeout handling.
   - Recommendation: `dispatch_timeout_s` (market_config) gates the no_scout transition, which the existing stripe-webhook/cancel flow handles (cancel PI, release hold). The GPS-rejection re-dispatch resets the timeout clock — the re-dispatched check starts a new window.

5. **No-film zones (SAFE-01): polygon data source?**
   - What we know: Hospitals, schools, courts, police, private residences should be auto-blocked at createCheck.
   - What's unclear: Where does the polygon data come from? OpenStreetMap (Overpass API) is the obvious answer but requires data acquisition and maintenance.
   - Recommendation: For Phase 5 MVP, a `no_film_zones` table with a small manually-seeded set of obvious zones per launch market (hardcoded polygon for each hospital/school in NYC/Miami). Full OSM integration is Phase 6 or later. The planner should scope SAFE-01 accordingly.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|---------|
| Node.js | Vitest test runner | Yes | v22.22.0 | — |
| Supabase CLI | DB migrations, Edge Function deploy | Yes | 2.107.0 | — |
| Deno | Edge Function unit tests (local) | No | — | Skip local Deno tests; deploy to Supabase and test via curl (matches existing pattern) |
| expo-location | Scout foreground GPS | Yes (SDK 54 bundle) | SDK 54 | — |
| PostGIS | Geo dispatch queries | Yes (Supabase, enabled in 0001) | Supabase-managed | — |
| Google Vision API | Signage advisory check | Not yet configured | — | Skip signage-check in Phase 5 if API key unavailable; add GOOGLE_VISION_API_KEY secret via `supabase secrets set` |
| Mux (thumbnail) | Signage check image source | Yes (deployed in Phase 3) | Phase 3 live | — |

**Missing dependencies with no fallback:** None that block core dispatch or GPS verification.

**Missing dependencies with fallback:**
- Deno CLI: All Edge Function tests already use `deno test --allow-env` via the Supabase-hosted runtime. Pattern is to write tests that can be run on deploy (matching mux-webhook/index.test.ts pattern). No local Deno needed for Wave-0 scaffolds.
- Google Vision API key: The signage-check Edge Function can be deployed without a key and return `{ confirmed: null }` gracefully. The key should be added as a Supabase secret before enabling signage advisory.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (client); Deno test (Edge Functions); pgTAP (SQL) |
| Config file | `lmc-app/vitest.config.ts` |
| Quick run command | `cd lmc-app && npm test` |
| Full suite command | `cd lmc-app && npm test && supabase test db` |

**Note:** 3 existing tests in `clips.test.ts` currently fail (supabase.auth mock gap from Phase 3). Phase 5 should not introduce further test failures. The failing tests are pre-existing and unrelated to this phase.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISP-01 | `list_open_checks_for_scout` returns only checks within dispatch radius | SQL pgTAP | `supabase test db` | No — Wave 0 gap |
| DISP-02 | `accept_check` with one-active-job guard rejects second accept | SQL pgTAP | `supabase test db` | No — Wave 0 gap |
| DISP-02 | `accept_check` geo-eligibility guard rejects out-of-radius Scout | SQL pgTAP | `supabase test db` | No — Wave 0 gap |
| DISP-03 | Timeout transition to `no_scout` fires correctly | SQL pgTAP | `supabase test db` | No — Wave 0 gap |
| VER-01 | `verify-clip` passes a clip within film-fence | Deno unit | `deno test verify-clip/index.test.ts` | No — Wave 0 gap |
| VER-01 | `verify-clip` rejects a clip outside film-fence | Deno unit | `deno test verify-clip/index.test.ts` | No — Wave 0 gap |
| VER-01 | mux-webhook does NOT deliver when GPS rejected | Deno unit (extend existing mux-webhook test) | `deno test mux-webhook/index.test.ts` | Yes (extend existing) |
| D-06 | signage-check never gates delivery (advisory only) | Deno unit | `deno test signage-check/index.test.ts` | No — Wave 0 gap |
| SAFE-01 | createCheck rejects a coord inside a no_film_zone polygon | SQL pgTAP | `supabase test db` | No — Wave 0 gap |
| D-03 | One active job blocks second accept by same Scout | SQL pgTAP | `supabase test db` | No — extend accept_check_atomic.test.sql |
| SCOUT-03 | dispatch.ts / scout-location.ts call shapes | Vitest unit | `cd lmc-app && npm test` | No — Wave 0 gap |

### Sampling Rate

- **Per task commit:** `cd lmc-app && npm test` (vitest, < 30 s)
- **Per wave merge:** `cd lmc-app && npm test && supabase test db`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `supabase/tests/0012_dispatch_rls.test.sql` — covers DISP-01, DISP-02 (geo-eligibility), DISP-03
- [ ] `supabase/tests/accept_check_v3.test.sql` — covers D-03 (one-active-job guard), geo-eligibility
- [ ] `supabase/functions/verify-clip/index.test.ts` — covers VER-01 (pass + reject paths)
- [ ] `supabase/functions/signage-check/index.test.ts` — covers D-06 advisory-only invariant
- [ ] `lmc-app/app/lib/dispatch.test.ts` — covers `listOpenChecksForScout` call shape
- [ ] `lmc-app/app/lib/scout-location.test.ts` — covers `upsertScoutLocation` call shape
- [ ] `supabase/tests/safe01_no_film_zones.test.sql` — covers SAFE-01

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | Yes | RLS: Scout writes own scout_locations row only; no_film_zones is service-role-managed; market_config is read-only for authenticated |
| V5 Input Validation | Yes | `filmed_lat`, `filmed_lng`, `p_scout_lat`, `p_scout_lng` validated as double-precision; non-finite values (NaN, Infinity) must be rejected server-side in RPCs |
| V6 Cryptography | No new crypto — existing Mux/Stripe signing patterns reused | — |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Scout sends fake GPS coords claiming to be at venue | Spoofing | GPS hard fence (30 m) is enforced server-side in `verify-clip`; client cannot bypass. Anti-spoof (Phase 6) adds OS-level detection. |
| Scout rapidly accepts/declines to prevent rivals from getting jobs | Tampering | One-active-job guard in `accept_check`; decline is client-local only (no server state), so no server impact |
| Client sends `filmed_lat`/`filmed_lng` as NaN or null to bypass GPS check | Tampering | `verify-clip` must treat null/NaN coords as "no GPS data" and log with warning rather than silently pass |
| Race: two Scouts simultaneously pass one-active-job check | Elevation of Privilege | Acceptable at v1 scale (see A2 in Assumptions Log). Full mitigation = Scout-level advisory lock or SERIALIZABLE isolation — deferred |
| Google Vision API key exposed in client | Information Disclosure | Key in `Deno.env` only (Supabase secret). Never returned to client. Same pattern as Mux/Stripe keys. |
| Mux thumbnail of another Scout's check accessed | Information Disclosure | Thumbnails require signed JWT (mux_playback_policy: 'signed'). signage-check is service-role only and never returns the thumbnail URL to client. |

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: migrations 0001–0011, filming.tsx, clips.ts, checks.ts, mux-webhook/index.ts — verified directly [VERIFIED: files read in this session]
- PostGIS ST_DWithin docs [CITED: https://postgis.net/docs/ST_DWithin.html] — geography units in meters confirmed
- expo-location docs [CITED: https://docs.expo.dev/versions/latest/sdk/location/] — Accuracy.High, watchPositionAsync API confirmed
- Mux thumbnail docs [CITED: https://www.mux.com/docs/guides/get-images-from-a-video] — URL format and signed playback ID requirement confirmed

### Secondary (MEDIUM confidence)
- Google Vision API pricing [CITED: https://cloud.google.com/vision/pricing] — $1.50/1000 images, first 1000 free/month
- Google Vision REST vs NPM timeout issue [VERIFIED: GitHub supabase discussion #36182] — use REST fetch, not NPM package in Deno
- Supabase PostGIS guide [CITED: https://supabase.com/docs/guides/database/extensions/postgis] — GiST index pattern
- Supabase Realtime Broadcast docs [CITED: https://supabase.com/docs/guides/realtime/broadcast] — Broadcast for high-frequency, Postgres Changes for row-level

### Tertiary (LOW confidence)
- Supabase JS client WKT string for geography upsert — [ASSUMED], not directly verified; confirm before implementing
- One-active-job race window analysis — [ASSUMED] based on PostgreSQL MVCC semantics and v1 Scout density expectations

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core tech verified from existing migrations and lock file
- Architecture: HIGH for PostGIS patterns (cited from official docs); MEDIUM for Edge Function integration patterns (Google Vision REST workaround confirmed)
- Pitfalls: HIGH for lon/lat order and Vision NPM timeout (both confirmed); MEDIUM for GPS accuracy caveat (known industry problem)

**Research date:** 2026-06-21
**Valid until:** 2026-07-21 (PostGIS/Supabase stable; Google Vision pricing stable)
