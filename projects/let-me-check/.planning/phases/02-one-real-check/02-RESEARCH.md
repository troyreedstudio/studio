# Phase 2: One Real Check (no money, no dispatch) - Research

**Researched:** 2026-06-20
**Domain:** Postgres-as-state-machine + Supabase Realtime spine behind an existing RN/Expo prototype — a genuine check created server-side, transitioned through real states (incl. failure paths), watched live by the Seeker, manually accepted by a Scout, then watched + rated.
**Confidence:** HIGH (builds directly on the Phase-1 schema/RLS/state-machine that already exists in `supabase/migrations/`; Realtime + RLS behavior verified against current Supabase docs; supabase-js 2.108.2 verified on the npm registry; the few judgment calls are flagged in the Assumptions Log)

## Summary

Phase 1 already shipped the hard part of the spine: a `checks` table with an 11-value `check_status` enum, a `transition_check()` SECURITY DEFINER function that is the *sole* writer of `status`, RLS on all 11 tables (clients have **no** UPDATE policy on `checks`), an immutable `event_log` that `transition_check` writes to on every transition, a `ratings` table, and a typed `lib/api.ts` + `lib/supabase.ts` client. Phase 2 is therefore **not** about building a state machine from scratch — it's about (a) hardening `transition_check` with valid-transition + actor-authorization enforcement, (b) letting a Scout *see and atomically claim* an open check (which Phase-1 RLS deliberately does not yet allow), (c) wiring the existing prototype screens (`waiting.tsx`, `dashboard.tsx`, `filming.tsx`, `submitted.tsx`, `delivery.tsx`) off real rows and a Realtime subscription instead of fake `setInterval` countdowns and a `REQUEST_POOL` mock array, and (d) proving the honest failure paths (no-Scout, cancelled, timed-out) that the prototype currently fakes.

The central technical decision — already locked by `.planning/research/ARCHITECTURE.md` and confirmed here — is **Postgres Changes** (not Broadcast) for the Seeker watching ONE check. The Seeker subscribes to a single filtered channel (`checks` UPDATE where `id=eq.<checkId>`); each `status` write by `transition_check` flips the row and pushes the new status to the client. This is the correct tool for a single user watching one row's status: it is RLS-enforced (the Seeker only receives events for their own check), needs no extra infra, and the volume is trivially low. Broadcast is reserved for Phase 5 dispatch (high-frequency pings to many Scouts), where Postgres Changes' single-threaded fan-out would bottleneck. The seam to Phase 5 must be kept clean: this phase's Scout-side "list open checks" is a simple SELECT + a manual accept, explicitly **not** a Realtime firehose, so swapping in geofenced server-driven dispatch later replaces the *query*, not the *subscription model*.

**Primary recommendation:** Extend the existing `transition_check()` to enforce a valid-transition table + actor authorization, add a separate `accept_check()` SECURITY DEFINER function doing the atomic first-wins claim (guarded `UPDATE ... WHERE status='dispatching'`), open a *narrow* Scout RLS read path to open + assigned checks, add a `clips` placeholder column/table so a Scout can mark `delivered` with a stub clip reference (the real Mux clip slots in at Phase 3 with no schema change), add `requested_location` columns to `checks` for CHECK-01 (lat/lng + label, the seam Google Places fills later), wire the five screens to real rows via a new `lib/checks.ts` + `lib/realtime.ts`, and persist the Seeker's rating to the existing `ratings` table. Use the `markets`/`venues` catalog (already seeded) for location-picking now; treat Google Places Autocomplete as a documented follow-on that needs the Places API enabled on the Google Cloud project — do **not** block this phase on it.

<user_constraints>
## User Constraints

> **No `CONTEXT.md` exists for this phase** (no `/gsd-discuss-phase` was run). The constraints below are the binding scope signals from the orchestrator prompt, `PROJECT.md`, `ROADMAP.md`, and the Phase-1 deliverables. They are authoritative — research HOW within these lines, not WHETHER.

### Locked Decisions (from PROJECT.md, ROADMAP.md, additional_context)
- **NO money this phase.** No Stripe, no card hold, no charge. A check is created without payment. (Money is Phase 4.) The prototype's `payment.tsx` fee breakdown stays as display-only; do not wire a real PaymentIntent.
- **NO geo-dispatch this phase.** Scout assignment is MANUAL/simple: a Scout sees open checks and accepts; first-accept sets `scout_id` + `status`. No geofence, no `ST_DWithin` eligibility, no online-set, no targeted push. (Dispatch + geofence is Phase 5.)
- **NO real video this phase.** A check reaches `delivered` WITHOUT real camera capture/upload. The Scout marks delivered with a **placeholder/stub clip reference**. (Real in-app camera + Mux is Phase 3 — `CHECK-04` is owned by Phase 3, not here.)
- **Build ON Phase 1, do not rebuild.** The `checks` table, `check_status` enum, `transition_check()`, `event_log`, `ratings` table, RLS, and the `lib/` data layer already exist and are committed. Extend them.
- **Server owns the state machine; client holds no business logic or secrets** (DATA-02, already enforced — clients have no UPDATE policy on `checks`). Keep it that way.
- **Supabase Realtime** is the live-status transport (per ROADMAP Products & technology, Phase 2 row).
- **Market-aware / international-ready:** `checks.currency` already exists; never hard-code USD. Location/market data stays as data.
- **Stay on React Native + Expo, iOS-first. No rewrite.** Wire behind the existing screens.

### Claude's Discretion (recommend in this research)
- Exact valid-transition table + which actor (Seeker vs assigned Scout vs system) may drive each transition.
- Postgres Changes vs Broadcast for the single-Seeker live watch (recommended below: **Postgres Changes**).
- Whether the Scout "open checks" list is a one-shot SELECT, a pull-to-refresh, or a (scoped) Realtime subscription (recommended: scoped SELECT + light Realtime on the Scout's own assigned check; NOT a global open-jobs firehose).
- The `clips` placeholder shape (column on `checks` vs a `clips` table) so Phase 3 slots in cleanly (recommended: a `clips` table now, FK to `checks` — matches DATA-03's named `clips` entity and the ARCHITECTURE doc).
- Location entry path for CHECK-01: catalog-only, catalog + free-text, or Google Places now (recommended: catalog + free-text/`saved_places` now; Places documented as a follow-on with setup notes).
- No-Scout / timed-out mechanism: client-side timer vs a server function. (Recommended: a manual/test-triggered transition this phase, since the durable job runner — Inngest/Trigger.dev — is first stood up in Phase 4. The *state* and *UI path* must be real; the *automatic timer* is a Phase 5 concern.)

### Deferred Ideas (OUT OF SCOPE for Phase 2)
- Geofence, `ST_DWithin`, online-Scout set, targeted dispatch push, atomic-claim *hardening at scale*, dispatch timeout *automation* — Phase 5.
- Stripe auth-hold, capture, payouts, refunds — Phase 4.
- Real camera (vision-camera), Mux upload/transcode/CDN playback, audio-strip — Phase 3.
- AI signage detection, AI Verdict, reference-photo confirm, GPS-stamp verification — Phase 6. (The `delivery.tsx` "AI VERDICT" line and crowd tags stay as static placeholder UI.)
- Push notifications (Scout job alerts, Seeker delivery alert) — Phase 7. This phase relies on the in-app Realtime subscription for live status; no APNs/FCM.
- Durable job runner (Inngest/Trigger.dev) — first load-bearing Phase 4. Don't build a server-side timer here.
- Google Places Autocomplete *wiring* — note the seam + setup, but the phase works on the catalog without it.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support (how this phase satisfies it) |
|----|-------------|------------------------------------------------|
| **CHECK-01** | A Seeker can request a check at a chosen location (tier: Standard/Priority) | Add `requested_lat`/`requested_lng`/`location_label` columns to `checks`; a new `createCheck()` in `lib/checks.ts` INSERTs a `requested` row (RLS already allows Seeker insert-as-`requested`). Location picked from the seeded `markets`/`venues` catalog or `saved_places` + free-text now; Google Places is the documented follow-on. Tier already a `checks.tier` column. |
| **CHECK-02** | The request is dispatched to an eligible nearby Scout | **Partially, manually.** This phase does the *transition* into a discoverable state (`requested → dispatching`) and a Scout's manual accept, NOT eligibility/geofence. Full DISP-01/02 (geofence + atomic-claim hardening) is Phase 5. Research note: implement `accept_check()` with the guarded first-wins UPDATE now so the seam is correct; just don't gate on geofence. |
| **CHECK-03** | A Scout can accept a request and is guided to film it | `accept_check()` SECURITY DEFINER sets `scout_id` + `status='assigned'` atomically; a narrow Scout RLS read path lists open checks; accept routes the Scout into `filming.tsx` (simulated capture) → `submitted.tsx` → marks `delivered` with a stub clip. |
| **CHECK-05** | A Seeker can watch the delivered check and see its details (when/where filmed) | `delivery.tsx` reads the real check row + the `clips` placeholder (filmed_at, location) + derives "when/where" from `event_log` transition timestamps. Real video playback is Phase 3; this phase shows the placeholder clip + true metadata. |
| **CHECK-06** | A Seeker can rate the delivered check | `delivery.tsx` star tap calls `rateCheck()` → INSERT into the existing `ratings` table (RLS: `auth.uid() = seeker_id` already in place) + transition `delivered → rated`. |
| **DISP-04** | The Seeker sees live status (finding → accepted → filming → delivered) | `lib/realtime.ts` subscribes to `checks` UPDATE filtered `id=eq.<checkId>` (Postgres Changes, RLS-enforced); `waiting.tsx` drives its status/steps off the real row instead of the fake `setInterval` countdown, including the honest no-Scout / cancelled / timed-out terminal states. |
</phase_requirements>

## Standard Stack

This phase adds **almost no new dependencies** — it is wiring + SQL on top of Phase 1's stack. The Realtime client is already part of `@supabase/supabase-js` (already installed).

### Core (already installed — confirm versions hold)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | **^2.108.2** `[VERIFIED: npm registry 2026-06-20]` | DB reads/writes, RPC calls (`transition_check`, `accept_check`, `log_event`), **Realtime channels** | One client already wired in `lib/supabase.ts`; Realtime ships inside it — no separate package. |
| `expo-router` | ~6.0.23 (installed) | Existing file-based routing between the five screens | Already the app's router; this phase reroutes screens off real data. |
| `expo-video` | **56.1.4** for SDK 54 line (installed; `venue.tsx` already uses `useVideoPlayer`) `[VERIFIED: npm]` | Plays the placeholder/sample clip in `delivery.tsx` | Already in use for the venue sample; the real Mux HLS source slots in at Phase 3. |
| `@rnmapbox/maps` | ^10.3.1 (installed, working) | The `waiting.tsx` live map | Already wired; this phase swaps the fake jittering scout positions for the real check's status-driven UI. |

### Supporting (server-side SQL — net-new migrations, no npm)
| Artifact | Purpose | When to Use |
|----------|---------|-------------|
| Migration `0007_check_transitions.sql` | Harden `transition_check`: valid-transition table + actor authorization; add `accept_check()` atomic-claim fn | The core of this phase's server work |
| Migration `0008_clips_location.sql` | `clips` placeholder table (FK to `checks`) + `checks.requested_lat/lng/location_label` columns | CHECK-01 location + CHECK-05 "where/when filmed" + Phase-3 clip seam |
| Migration `0009_scout_rls.sql` | Narrow Scout RLS: SELECT open (`dispatching`) checks + own assigned checks; enable Realtime publication on `checks` | CHECK-03 (Scout sees + claims) + DISP-04 (Realtime) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| **Postgres Changes** (Seeker watches one check) | **Broadcast** | Broadcast is <50ms and DB-independent — right for Phase-5 high-frequency dispatch pings to many Scouts. For ONE Seeker watching ONE row's status at human pace, Postgres Changes is simpler, RLS-enforced automatically, and needs no server-side `.send()` plumbing. **Recommend Postgres Changes now; Broadcast is the Phase-5 tool.** `[CITED: supabase.com/docs/guides/realtime/postgres-changes — "every change event must be checked to see if the subscribed user has access"]` |
| **`clips` table** (placeholder) | A `clip_ref`/`clip_url` column on `checks` | A column is fewer objects, but DATA-03 names `clips` as a first-class entity and ARCHITECTURE.md's schema has a `clips (mux_asset_id, playback_id, status)` table. A `clips` table now (with stub values) means Phase 3 adds `mux_asset_id`/`playback_id` columns rather than migrating a column into a table. **Recommend the `clips` table.** |
| **Catalog + free-text location** (CHECK-01) | **Google Places Autocomplete** now | Places gives "any location" (the universal promise) but needs the Places API enabled + billing + an API key + result caching to control cost (ARCHITECTURE.md flags caching). The seeded catalog + `saved_places` + free-text label covers the *state-flow proof* this phase needs. **Recommend catalog/free-text now; Places is a clean follow-on** (it only changes how `requested_lat/lng/location_label` get populated, not the check flow). |
| **Manual/test-triggered timeout** | A durable job (Inngest/Trigger.dev) auto-timeout | The job runner is first stood up in Phase 4; building it here is out-of-phase. The *no_scout/timed_out states and the Seeker UI for them* must be real and reachable this phase; the *automatic timer that fires them* is Phase 5. **Recommend a server function reachable for test now, automated later.** |

**Installation:** No new npm packages required for the core path. (If location free-text needs nothing beyond a `TextInput`, there is genuinely zero install.) Google Places, if pursued as the follow-on, would be a server-side fetch from an Edge Function (keep the key server-side) — no client SDK.

**Version verification done:** `@supabase/supabase-js` 2.108.2 (matches `lib/supabase.ts`), `expo-video` 56.1.4 — both `[VERIFIED: npm registry, 2026-06-20]`.

## What Phase 1 Already Built (the foundation to extend, NOT rebuild)

> Critical for the planner: these exist and are committed. Tasks must **extend** them. Re-reading the live artifacts:

| Asset | Where | Phase-2 relevance |
|-------|-------|-------------------|
| `checks` table | `0004_core_entities.sql`; types in `lib/database.types.ts` | Columns: `id, seeker_id, scout_id (nullable), venue_id, market_id, tier, currency, status, created_at, updated_at`. **Phase 2 adds** `requested_lat/lng`, `location_label`. |
| `check_status` enum (11 values) | `requested, authorized, dispatching, assigned, filming, uploaded, processing, delivered, rated, cancelled, expired` | Phase 2 uses a **subset** + needs a `no_scout` terminal state (see Open Q1). `authorized` is a money state (skip this phase). `uploaded`/`processing` are video states (Phase 3 — this phase can go `filming → delivered` directly with the stub clip). |
| `transition_check(p_check_id, p_to, p_context)` | `0006_check_state_machine.sql` | SECURITY DEFINER, sole `status` writer, logs `check.status_changed` to `event_log`. **Currently has NO valid-transition guard and NO actor authorization** — Phase 2 hardens this (see Pitfall 1). |
| RLS on `checks` | `0005_rls_policies.sql` | Seeker can SELECT/INSERT-as-`requested` their own checks. **NO UPDATE policy** (status is server-only — keep it). **A Scout currently cannot SELECT any check that isn't theirs as seeker** — Phase 2 must add a narrow Scout read path. |
| `ratings` table + RLS | `0004` + `0005` | `check_id, seeker_id, stars`; RLS `auth.uid() = seeker_id` for select+insert. CHECK-06 uses this as-is. |
| `event_log` + `log_event()` | `0001` | Immutable; `transition_check` already writes every transition. Phase 2's "when/where filmed" can read transition timestamps from here. |
| `lib/supabase.ts` | client | SecureStore session, `autoRefreshToken`. **Realtime note:** the client is created with a session; for RLS-enforced Postgres Changes the realtime auth token must track the session (see Pitfall 4). |
| `lib/api.ts` | data layer | Typed wrappers; `logEvent` via RPC. **Phase 2 adds `lib/checks.ts`** (createCheck, getCheck, listOpenChecks, acceptCheck, markFilming, markDelivered, rateCheck, cancelCheck) + **`lib/realtime.ts`** (subscribeToCheck). Keep `api.ts` for user-owned rows; checks get their own module. |
| `transition_check` typed in client | `database.types.ts` Functions | `supabase.rpc('transition_check', {...})` is already type-safe. |

## Architecture Patterns

### Recommended file structure (net-new vs wired)
```
supabase/migrations/
├── 0007_check_transitions.sql   # NET-NEW: valid-transition guard + actor authz + accept_check()
├── 0008_clips_location.sql      # NET-NEW: clips placeholder table + checks location columns
└── 0009_scout_rls_realtime.sql  # NET-NEW: narrow Scout RLS + enable Realtime publication on checks
supabase/tests/
├── check_transitions.test.sql   # NET-NEW pgTAP: valid/invalid transition matrix
├── accept_check_atomic.test.sql # NET-NEW pgTAP: two-scout race → exactly one wins
└── scout_rls.test.sql           # NET-NEW pgTAP: Scout sees open + own; NOT others' delivered
lmc-app/app/lib/
├── checks.ts                    # NET-NEW: typed check lifecycle wrappers (create/get/list/accept/mark/rate/cancel)
├── realtime.ts                  # NET-NEW: subscribeToCheck(checkId, onStatus) — Postgres Changes
├── checks.test.ts               # NET-NEW: unit (mocked supabase) for the wrappers
lmc-app/app/(seeker)/
├── home.tsx        # WIRE: "request a check" creates a real `requested` row (CHECK-01)
├── venue.tsx       # WIRE: tier/location selection feeds createCheck()
├── payment.tsx     # WIRE (lightly): confirm = createCheck() (NO real payment) → route to waiting with real checkId
├── waiting.tsx     # WIRE: drive status/steps off subscribeToCheck() not setInterval; honest failure states (DISP-04)
├── delivery.tsx    # WIRE: real check row + clips metadata + rateCheck() (CHECK-05/06)
└── (cancelled/error already exist as terminal screens — route to them off real terminal states)
lmc-app/app/(scout)/
├── dashboard.tsx   # WIRE: replace REQUEST_POOL mock with listOpenChecks(); accept = acceptCheck() (CHECK-03)
├── filming.tsx     # WIRE: simulated capture; on "submit" markDelivered() with stub clip
└── submitted.tsx   # WIRE: reflects the real delivered check (no fake earnings credit — money is Phase 4)
```

### Pattern 1: Hardened server-owned transition (valid-transition + actor authz)
**What:** Extend `transition_check` so it (a) rejects illegal transitions against a fixed table and (b) checks the *caller* (`auth.uid()`) is allowed to drive that specific transition. SECURITY DEFINER runs as owner, so the function must check authorization **itself** (RLS doesn't protect a definer function's internal writes).
**When to use:** Every status change except the atomic accept (which gets its own function for the guarded UPDATE).
```sql
-- 0007 — illustrative shape (Source: composed from 0006 + ARCHITECTURE.md state machine)
-- valid transitions for THIS phase (money/video states omitted):
--   requested  -> dispatching            (seeker's own check; system makes it discoverable)
--   dispatching-> assigned               (handled by accept_check, not here)
--   assigned   -> filming                (assigned scout only)
--   filming    -> delivered              (assigned scout only; requires a clip row to exist)
--   delivered  -> rated                  (owning seeker only)
--   requested/dispatching -> cancelled   (owning seeker)
--   dispatching-> no_scout / expired     (system/test; terminal, no charge)
create or replace function public.transition_check(
  p_check_id uuid, p_to check_status, p_context jsonb default '{}'::jsonb
) returns check_status language plpgsql security definer set search_path = public as $$
declare v_from check_status; v_seeker uuid; v_scout uuid; v_uid uuid := auth.uid();
begin
  select status, seeker_id, scout_id into v_from, v_seeker, v_scout
    from public.checks where id = p_check_id for update;
  if not found then raise exception 'check % not found', p_check_id; end if;

  -- 1. valid-transition guard (reject illegal jumps)
  if not public.is_valid_check_transition(v_from, p_to) then
    raise exception 'illegal transition % -> %', v_from, p_to;
  end if;

  -- 2. actor authorization (who may drive THIS transition)
  if p_to = 'rated' and v_uid is distinct from v_seeker then
     raise exception 'only the seeker may rate';
  elsif p_to in ('filming','delivered') and v_uid is distinct from v_scout then
     raise exception 'only the assigned scout may drive %', p_to;
  elsif p_to = 'cancelled' and v_uid is distinct from v_seeker then
     raise exception 'only the seeker may cancel';
  end if;
  -- (system transitions like dispatching/no_scout: gate to seeker-owner or service role)

  -- 3. guard: deliver requires a clip row (no deliver-without-clip — even a stub)
  if p_to = 'delivered' and not exists (select 1 from public.clips where check_id = p_check_id) then
     raise exception 'cannot deliver without a clip';
  end if;

  update public.checks set status = p_to, updated_at = now() where id = p_check_id;
  perform public.log_event('check.status_changed','check',p_check_id,
    jsonb_build_object('from',v_from,'to',p_to) || coalesce(p_context,'{}'::jsonb));
  return p_to;
end $$;
```
> The valid-transition table itself lives in a small `is_valid_check_transition(from,to) returns boolean` helper (a `CASE`/lookup) so it's testable and Phase 3/4/5 extend it additively.

### Pattern 2: Atomic first-wins accept (the seam to Phase-5 dispatch)
**What:** A separate `accept_check()` SECURITY DEFINER does the guarded claim. The `WHERE status='dispatching'` predicate makes it impossible for two Scouts to both win — the second UPDATE matches zero rows.
**When to use:** Scout taps "accept". This is the *only* place `scout_id` is set.
```sql
-- 0007 (Source: ARCHITECTURE.md Pattern 1 — atomic claim, adapted to a definer fn)
create or replace function public.accept_check(p_check_id uuid)
returns check_status language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_updated int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  update public.checks
     set scout_id = v_uid, status = 'assigned', updated_at = now()
   where id = p_check_id and status = 'dispatching' and scout_id is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
     raise exception 'check % already taken or not open', p_check_id;  -- client shows "taken"
  end if;
  perform public.log_event('check.accepted','check',p_check_id,
    jsonb_build_object('scout_id', v_uid));
  return 'assigned';
end $$;
```
> Phase 5 adds the *eligibility* (geofence + online-set) *before* this call and wraps it in targeted dispatch — but the atomic-claim primitive is correct from now. `[CITED: ARCHITECTURE.md "dispatch-accept: first-wins assignment must be atomic"]`

### Pattern 3: Seeker watches ONE check via Postgres Changes (DISP-04)
**What:** A single filtered channel; RLS guarantees the Seeker only receives events for their own check. Drive `waiting.tsx` off `onStatus`.
```typescript
// lib/realtime.ts (Source: supabase.com/docs/guides/realtime/postgres-changes)
import { supabase } from './supabase';
import type { Database } from './database.types';
type CheckRow = Database['public']['Tables']['checks']['Row'];

export function subscribeToCheck(
  checkId: string,
  onStatus: (row: CheckRow) => void,
  onError?: () => void,
) {
  const channel = supabase
    .channel(`check:${checkId}`)
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'checks', filter: `id=eq.${checkId}` },
      (payload) => onStatus(payload.new as CheckRow))
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onError?.();
    });
  return () => { supabase.removeChannel(channel); };
}
```
**Reconnection:** the `.subscribe(status => ...)` callback surfaces `SUBSCRIBED | CHANNEL_ERROR | TIMED_OUT | CLOSED`. On error/timeout, **re-fetch the current check row once** (`getCheck`) to catch any transition missed while disconnected, then let the client auto-rejoin. Because the row is the source of truth, a missed event is never fatal — a re-fetch reconciles. Always pair the subscription with an initial `getCheck()` so the screen shows correct state even if the first event predates the subscription.

### Pattern 4: Scout lists open checks (scoped SELECT, NOT a firehose)
**What:** The Scout dashboard replaces the `REQUEST_POOL` mock with `listOpenChecks()` — a SELECT of `status='dispatching'` checks the *narrow* Scout RLS policy now permits. Refresh on focus / pull-to-refresh. The Scout subscribes via Realtime only to **their own assigned check** after accepting, not to the open pool.
**Why not subscribe to the whole open pool:** ARCHITECTURE.md Anti-Pattern 2 — a global open-jobs Postgres Changes subscription evaluates every change against every Scout on one thread and leaks jobs to ineligible Scouts. Keep the pool a query; make dispatch server-driven in Phase 5.
```typescript
// lib/checks.ts
export async function listOpenChecks() {
  const { data, error } = await supabase
    .from('checks').select('*').eq('status', 'dispatching')
    .order('created_at', { ascending: true });
  if (error) throw error; return data ?? [];
}
export async function acceptCheck(checkId: string) {
  const { error } = await supabase.rpc('accept_check', { p_check_id: checkId });
  if (error) throw error; // "already taken" surfaces here
}
```

### Pattern 5: Mark delivered with a stub clip (the Phase-3 seam)
**What:** Before transitioning `filming → delivered`, insert a `clips` row with stub values (`status='stub'`, no `mux_asset_id`). Phase 3 replaces the insert with a real Mux upload + webhook-set `playback_id`; the check flow and `delivery.tsx` read path don't change.
```typescript
// lib/checks.ts — Scout submit (simulated capture this phase)
export async function markDelivered(checkId: string, filmedAt: string, loc?: {lat:number; lng:number}) {
  await supabase.from('clips').insert({
    check_id: checkId, status: 'stub', filmed_at: filmedAt,
    filmed_lat: loc?.lat ?? null, filmed_lng: loc?.lng ?? null,
  });
  await supabase.rpc('transition_check', { p_check_id: checkId, p_to: 'delivered' });
}
```

### Anti-Patterns to Avoid
- **Driving status from the client.** Already impossible (no UPDATE policy) — keep it. All transitions go through `transition_check`/`accept_check`.
- **Keeping the fake countdown.** `waiting.tsx` currently `setInterval`s to a fake delivery and even has a "Skip ahead · prototype" link. Replace the timer with the Realtime status; success criterion #2 is explicitly "replacing the prototype's fake countdown."
- **Global open-jobs Realtime subscription on the Scout side.** Use a scoped SELECT (Pattern 4).
- **Letting `transition_check` accept any transition.** Without the valid-transition guard (Pattern 1), a Scout could `delivered`-jump a check skipping `filming`, or re-rate. Add the guard + actor authz this phase.
- **Faking the Scout earnings credit on submit.** `submitted.tsx` currently calls `earnings.addClipEarning()`. Money is Phase 4 — do not credit earnings on delivery here; reflect the delivered state only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Live status push to the Seeker | A polling loop hitting `getCheck` every 2s | Supabase Realtime Postgres Changes (RLS-enforced) | Polling wastes battery/quota and lags; the channel pushes on the actual write. |
| Two-Scout double-booking guard | Client-side "is it taken?" check then update | `accept_check()` guarded `UPDATE ... WHERE status='dispatching'` | Only the DB can make first-wins atomic; a client check has a TOCTOU race. |
| Transition legality | `if (status === ...)` scattered in screens | `is_valid_check_transition` + `transition_check` server guard | Business rules belong server-side (DATA-02); client copies drift. |
| Authorization (who can rate/film/cancel) | Client route-group gating | Actor checks inside the SECURITY DEFINER fn + RLS | Route gating is UX, not security; a definer fn must self-authorize. |
| "When/where filmed" provenance | A client-computed timestamp | `event_log` transition rows + `clips.filmed_at/lat/lng` | The immutable log is the audit truth; client clocks lie. |
| Reconnect-after-drop correctness | A bespoke event buffer | Initial `getCheck()` + re-fetch on `CHANNEL_ERROR` | The row is source-of-truth; a re-fetch reconciles any missed event. |

**Key insight:** Phase 2 is a *wiring + a few SQL guards* phase. The state machine, immutability, RLS, and the Realtime transport are all solved primitives already in the repo or inside supabase-js. The risk is in the *guards* (valid transitions, actor authz, atomic accept) and in *honestly* replacing the fake countdown — not in building infrastructure.

## Runtime State Inventory

> Phase 2 is partly a brownfield re-wire (screens off mocks) and partly net-new SQL. A grep finds the mock arrays; it does not find the live backend state. Below is the inventory.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | `checks` rows already creatable (Phase 1 INSERT policy). No Phase-2 data exists yet — nothing to migrate. The `markets`/`venues` catalog is seeded (102 markets / 156 venues). | Create `clips` table + `checks` location columns (migration 0008). No backfill. |
| **Live service config** | **Realtime publication must be enabled on `checks`** in the Supabase project — Postgres Changes requires the table be added to the `supabase_realtime` publication (Project → Publications, or `alter publication supabase_realtime add table public.checks`). This is project/runtime config, not just code. `[CITED: supabase docs — "under supabase_realtime, toggle on the tables you want to listen to"]` | Add `checks` to the publication via migration 0009 (`alter publication ... add table`) so it's version-controlled, and confirm in the dashboard. |
| **OS-registered state** | None (no scheduled tasks; the no-Scout timeout is NOT an OS timer this phase — see Open Q3). | None. |
| **Secrets / env vars** | No new client secrets. Realtime uses the existing anon key + the user session (already in SecureStore). If Google Places is pursued as the follow-on, its API key is **server-side only** (Edge Function), never `EXPO_PUBLIC_`. | None for the core path; document the Places-key-server-side rule if/when Places lands. |
| **Build artifacts** | `database.types.ts` is generated; the new `clips` table + `accept_check`/`is_valid_check_transition` functions + location columns mean **types must be regenerated** (`supabase gen types typescript`) after migrations push, or the new client code won't type-check. | Regenerate `database.types.ts` after 0007–0009 are applied (a Phase-1-style human-checkpoint: push migrations, regen types). |

**The canonical question — after every file is updated, what runtime state remains?** Two things: (1) the Realtime **publication** on `checks` (a project-level toggle, captured in 0009), and (2) **regenerated `database.types.ts`** after the new SQL objects land. Both are explicit checkpoints, not code the agent can fully self-verify offline (same Docker/live-project constraint Phase 1 hit).

## Common Pitfalls

### Pitfall 1: `transition_check` accepts ANY transition (current state)
**What goes wrong:** As shipped in `0006`, `transition_check` updates `status` to whatever `p_to` is passed, with no legality check and no actor check. A Scout (or a Seeker) could jump `requested → delivered`, re-rate, or self-deliver.
**Why it happens:** Phase 1 deliberately built the *minimal* writer ("Phase 1 only needs this writer to exist… Phase 2 exercises the full lifecycle"). The guard was always Phase 2's job.
**How to avoid:** Migration 0007 adds the valid-transition table + actor authorization (Pattern 1). **Write the pgTAP test matrix first** (every illegal transition raises; every legal one with the wrong actor raises).
**Warning signs:** A test that calls `transition_check(id, 'delivered')` on a `requested` check succeeds — it must fail.

### Pitfall 2: Scout cannot SEE open checks (current RLS)
**What goes wrong:** `0005` only lets a user SELECT checks where `auth.uid() = seeker_id`. A Scout querying `status='dispatching'` gets **zero rows** — they can't see anything to accept.
**Why it happens:** Phase 1 had no Scout-side read need.
**How to avoid:** Migration 0009 adds a narrow Scout SELECT policy: open (`dispatching`, `scout_id is null`) checks visible to any authenticated Scout, plus checks where `auth.uid() = scout_id` (their assigned ones). Do **not** open all checks — only open + own. Test it (Scout sees open + own; NOT another Seeker's delivered check).
**Warning signs:** `listOpenChecks()` returns `[]` even when an open check exists.

### Pitfall 3: Realtime fires but the Seeker gets nothing (publication / RLS / auth-token)
**What goes wrong:** The subscription connects (`SUBSCRIBED`) but `onStatus` never fires on a real transition. Three causes: (a) `checks` not in the `supabase_realtime` publication; (b) RLS denies the row to the subscribed user; (c) the realtime client's auth token wasn't set to the session, so RLS evaluates as anon and filters everything out.
**Why it happens:** Postgres Changes checks **every** event against the subscriber's access; `[CITED: supabase docs — "every change event must be checked to see if the subscribed user has access"]` and the token must be set after instantiating the client and before connecting.
**How to avoid:** (a) enable the publication (0009); (b) confirm the Seeker's `checks_select_own` RLS lets them read their own row (it does); (c) ensure the session token propagates to Realtime — supabase-js wires this from the auth session, but verify on-device that a logged-in Seeker receives events. Add an initial `getCheck()` so the screen is correct even before the first event.
**Warning signs:** Status updates only appear after a manual screen refresh, not live.

### Pitfall 4: Missed transition during a network drop
**What goes wrong:** The Seeker backgrounds the app or loses signal during `assigned → filming`; the event is missed; the UI is stuck on "assigned".
**Why it happens:** Realtime is best-effort; events during a disconnect aren't replayed.
**How to avoid:** On `CHANNEL_ERROR`/`TIMED_OUT` and on app-foreground (`AppState` 'active'), re-fetch the row with `getCheck()` and reconcile. The row is source-of-truth, so reconciliation is always correct.
**Warning signs:** Status lags reality after the phone is locked/unlocked.

### Pitfall 5: Delivering without a clip / faking the countdown
**What goes wrong:** A check reaches `delivered` with no `clips` row, so `delivery.tsx` has nothing real to show; or `waiting.tsx` still runs its fake `setInterval` and "Skip ahead" link, so "live status" is theater.
**Why it happens:** Carrying prototype shortcuts forward.
**How to avoid:** The `delivered` transition guard (Pattern 1) requires a `clips` row. Delete the `setInterval` countdown + "Skip ahead · prototype" link in `waiting.tsx`; the countdown becomes derived display only (optional), status comes from Realtime.
**Warning signs:** "Skip ahead · prototype" still visible; `delivery.tsx` shows hard-coded "Filmed 2 min ago".

### Pitfall 6: Crediting Scout earnings on delivery (out of phase)
**What goes wrong:** `submitted.tsx` credits `addClipEarning(payout)` — real money UX with no real money.
**Why it happens:** Prototype behavior.
**How to avoid:** Money is Phase 4. Show the delivered confirmation; do not credit earnings (Phase 1 already de-seeded earnings to 0/0). Leave a clear `// TODO(phase-4)` at the credit site.

## Code Examples

### createCheck (CHECK-01)
```typescript
// lib/checks.ts (Source: composed from lib/api.ts patterns + checks Insert types)
import { supabase } from './supabase';
export async function createCheck(input: {
  tier: 'standard' | 'priority';
  locationLabel: string; lat?: number; lng?: number;
  venueId?: string; marketId?: string; currency?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('checks').insert({
    seeker_id: u.user!.id, tier: input.tier, status: 'requested',
    location_label: input.locationLabel,
    requested_lat: input.lat ?? null, requested_lng: input.lng ?? null,
    venue_id: input.venueId ?? null, market_id: input.marketId ?? null,
    currency: input.currency ?? 'USD',
  }).select('id').single();
  if (error) throw error;
  // make it discoverable to scouts (manual dispatch this phase)
  await supabase.rpc('transition_check', { p_check_id: data.id, p_to: 'dispatching' });
  return data.id;
}
```

### rateCheck (CHECK-06)
```typescript
export async function rateCheck(checkId: string, stars: number) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('ratings')
    .insert({ check_id: checkId, seeker_id: u.user!.id, stars });
  if (error) throw error;
  await supabase.rpc('transition_check', { p_check_id: checkId, p_to: 'rated' });
}
```

### Driving waiting.tsx off real status (DISP-04)
```typescript
// inside WaitingScreen — replaces the setInterval countdown
const [check, setCheck] = useState<CheckRow | null>(null);
useEffect(() => {
  getCheck(checkId).then(setCheck);                       // initial state
  const unsub = subscribeToCheck(checkId, setCheck, () => getCheck(checkId).then(setCheck));
  return unsub;
}, [checkId]);
// map check.status -> step UI; on terminal states route:
useEffect(() => {
  if (!check) return;
  if (check.status === 'delivered' || check.status === 'rated')
    router.replace({ pathname: '/(seeker)/delivery', params: { checkId } });
  if (check.status === 'cancelled') router.replace({ pathname: '/(seeker)/cancelled', params: { checkId } });
  if (check.status === 'no_scout' || check.status === 'expired')
    router.replace({ pathname: '/(seeker)/error', params: { reason: check.status } });
}, [check?.status]);
```

## State of the Art

| Old Approach (prototype) | Current Approach (this phase) | Impact |
|--------------------------|-------------------------------|--------|
| `waiting.tsx` fake `setInterval` countdown + "Skip ahead" | Real `checks.status` via Postgres Changes subscription | Live status is genuine (DISP-04); failure paths are honest |
| `dashboard.tsx` `REQUEST_POOL` mock array | `listOpenChecks()` SELECT of real `dispatching` checks | Scout accepts a real row (CHECK-03) |
| `delivery.tsx` hard-coded "Filmed 2 min ago" / "J" scout | Real `clips.filmed_at` + check row + `event_log` provenance | "when/where filmed" is true (CHECK-05) |
| `transition_check` accepts any `p_to` | Valid-transition table + actor authz + deliver-needs-clip guard | The state machine is actually safe |
| `submitted.tsx` credits fake earnings | Delivered state only; earnings deferred | No fake money (Phase 4 owns money) |

**Deprecated/outdated for this phase:** the "Skip ahead · prototype" link and the `setInterval` jitter in `waiting.tsx`; the `REQUEST_POOL` constant in `dashboard.tsx`; the `earnings.addClipEarning` call in `submitted.tsx`. All are prototype scaffolding to retire as the screens are wired.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A `no_scout` terminal enum value should be added (the current enum has `cancelled`/`expired` but no explicit no-Scout state); reusing `expired` for "no scout accepted" is acceptable if a new value is unwanted | Open Q1 / requirements map | LOW — either a new enum value (additive migration) or reuse `expired`; both reachable. Surface to planner to pick. |
| A2 | Postgres Changes (not Broadcast) is correct for a single Seeker watching one check at human pace | Standard Stack / Pattern 3 | LOW — verified against Supabase docs; Broadcast remains the documented Phase-5 tool. If RLS-on-Postgres-Changes has a surprising gap on-device, Broadcast is the fallback (server `.send()` on transition). |
| A3 | The no-Scout / timed-out transition can be **manually/test-triggered** this phase (no durable job runner until Phase 4); the state + Seeker UI are real, the *auto-timer* is deferred | User Constraints / Open Q3 | MEDIUM — if Troy expects an automatic real-world timeout now, a minimal client-initiated or pg_cron timeout is needed. Confirm scope: "is a real automatic no-Scout timeout in-scope for Phase 2, or just the state + UI?" |
| A4 | Catalog + free-text location satisfies CHECK-01 for this phase; Google Places is a follow-on | Standard Stack / Alternatives | LOW — Places only changes how location columns are populated, not the flow. Confirm Troy is fine proving the loop on the catalog first. |
| A5 | A `clips` table (vs a column) is the right placeholder shape for the Phase-3 seam | Architecture / Pattern 5 | LOW — matches DATA-03 + ARCHITECTURE.md schema; if a column is preferred, trivially swapped. |
| A6 | The Realtime publication on `checks` is not yet enabled (Phase 1 didn't need it) | Runtime State Inventory / Pitfall 3 | LOW — verified by absence in Phase-1 migrations; 0009 enables it explicitly. |

## Open Questions

1. **Add a `no_scout` enum value, or reuse `expired`?**
   - Known: the enum has `cancelled` + `expired`; success criteria name "no-Scout / cancelled / timed-out" as distinct honest paths.
   - Unclear: whether Troy wants three visibly-distinct terminal states or two (cancelled vs a single "didn't happen").
   - Recommendation: add `no_scout` for clarity (additive enum migration, cheap), keep `expired` for the future auth-hold-expiry/timeout, and `cancelled` for Seeker-cancel. The `error.tsx`/`cancelled.tsx` screens already exist to land them.

2. **Where does the Seeker pick the location for CHECK-01 — `home.tsx`, `venue.tsx`, or a new entry?**
   - Known: `home.tsx` browses catalog venues; `venue.tsx` selects tier; `payment.tsx` confirms. The universal promise is "any location," but this phase can prove the loop on catalog venues.
   - Recommendation: this phase uses the existing browse→venue→confirm path to set `location_label`/`venue_id`/`market_id`; add a simple free-text "or enter any place" affordance feeding `location_label` (no Places yet). Confirm with planner whether a dedicated "request anywhere" entry is wanted now or deferred to the Places follow-on.

3. **Is an automatic no-Scout timeout in-scope, or just the state + UI?** (See A3.)
   - Recommendation: scope Phase 2 to the **state + Seeker UI + a test-reachable transition**; defer the *automatic* timer to Phase 5 (with the job runner). If Troy wants a real timeout now, the lightest option is `pg_cron` flipping stale `dispatching` checks to `no_scout` after N minutes — note this is a small, isolated add if requested.

4. **Should the Scout-side get a light Realtime subscription on their assigned check, or poll?**
   - Recommendation: after accept, subscribe to the Scout's own check (`scout_id=eq.me` or `id=eq.checkId`) so a Seeker cancel reflects live on the Scout's filming screen. Reuse `subscribeToCheck`. Cheap and symmetric; confirm it's wanted (it improves the honest cancel path).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Live Supabase project (Phase-1 migrations pushed) | Everything | ⚠ pending Phase-1 Task-6 human checkpoint (migrations authored, live push was blocked) | — | none — Phase 2 SQL can be authored offline, but live verification needs the project pushed |
| `checks` in `supabase_realtime` publication | DISP-04 live status | ✗ (not yet enabled) | — | none — 0009 enables it; must be confirmed in dashboard |
| Supabase CLI + Docker (local pgTAP / gen types) | transition + RLS tests, type regen | unverified on this machine (Phase 1 noted no Docker / CLI not logged in) | — | cloud staging project + dashboard SQL editor (loses local hermetic tests) |
| `supabase gen types typescript` after 0007–0009 | client type-check of new objects | ✗ until migrations applied | — | none — required before `lib/checks.ts` compiles against `accept_check`/`clips` |
| EAS dev build | on-device Realtime + Mapbox `waiting.tsx` | ✓ (Build 9 shipped; Mapbox needs dev build) | — | — |
| Google Places API (Places enabled + key) | CHECK-01 "any location" follow-on ONLY | ✗ (not set up) | — | catalog + free-text covers this phase without it |

**Missing dependencies with no fallback (blocking live verification):** the live Supabase push (Phase-1 Task-6 checkpoint), the Realtime publication toggle, and a types regen after the new migrations. These mirror Phase 1's pattern: SQL + client code can be authored and offline-verified (tsc, vitest, pgTAP files), but the live run is a human checkpoint (push migrations → enable publication → regen types → on-device walk-through).
**Missing with fallback:** Supabase CLI/Docker (cloud staging fallback); Google Places (catalog/free-text fallback — recommended for this phase regardless).

## Validation Architecture

> `nyquist_validation` is enabled (Phase-1 config; not disabled) — this section is required so a VALIDATION.md can be derived.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **Vitest** (client unit, already configured: `lmc-app/vitest.config.ts`, `test/setup.ts`) + **pgTAP** SQL tests (`supabase/tests/*.test.sql`, run via `supabase test db`) — both stood up in Phase 1 |
| Config file | `lmc-app/vitest.config.ts` (exists); `supabase/tests/` (exists, 3 Phase-1 tests) |
| Quick run command | `cd lmc-app && npm test` (Vitest) + `npx tsc --noEmit` |
| Full suite command | `npm test` + `supabase db reset` (applies 0001–0009 + seed) + `supabase test db` (pgTAP) against local Supabase |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHECK-01 | Seeker INSERTs a `requested` check; cannot set `status` to anything else on insert | integration (RLS) | `supabase test db` | ❌ Wave 0 |
| CHECK-03 | `accept_check` first-wins: two scouts, exactly one `assigned` | **pgTAP concurrency** | `supabase test db` (accept_check_atomic.test.sql) | ❌ Wave 0 |
| CHECK-03 | Scout SELECT sees open + own assigned, NOT others' delivered | **pgTAP RLS** | `supabase test db` (scout_rls.test.sql) | ❌ Wave 0 |
| CHECK-05 | `delivered` requires a `clips` row (no deliver-without-clip) | pgTAP (negative) | `supabase test db` | ❌ Wave 0 |
| CHECK-06 | Rating persists; only the owning seeker may rate; `delivered → rated` | pgTAP + unit | `supabase test db` + `npm test -- rate` | ❌ Wave 0 |
| DISP-04 | `transition_check` rejects illegal jumps; valid ones log to event_log | **pgTAP transition matrix** | `supabase test db` (check_transitions.test.sql) | ❌ Wave 0 |
| DISP-04 | `subscribeToCheck` calls onStatus with the new row on UPDATE; reconnect re-fetches | unit (mock realtime) + on-device | `npm test -- realtime`; manual on-device for true live | ❌ Wave 0 |
| (authz) | Non-assigned scout cannot drive `filming`/`delivered`; non-owner cannot `cancel`/`rate` | pgTAP (negative) | `supabase test db` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` (fast Vitest) + `npx tsc --noEmit`
- **Per wave merge:** full suite incl. `supabase db reset` + `supabase test db` (pgTAP) against local Supabase
- **Phase gate:** full pgTAP suite green (transition matrix + accept-race + Scout RLS + deliver-needs-clip) **and** an on-device walk-through of the live loop (create → watch status flip live → Scout accept → deliver → watch + rate) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `supabase/tests/check_transitions.test.sql` — full valid/invalid transition matrix + actor authz (DISP-04, authz)
- [ ] `supabase/tests/accept_check_atomic.test.sql` — two-scout race → exactly one wins (CHECK-03)
- [ ] `supabase/tests/scout_rls.test.sql` — Scout sees open + own, not others' (CHECK-03)
- [ ] `lmc-app/app/lib/checks.test.ts` — unit for create/accept/markDelivered/rate (mocked supabase)
- [ ] `lmc-app/app/lib/realtime.test.ts` — unit for subscribeToCheck onStatus + error→refetch
- [ ] Two test users with the scout capability (Seeker A, Scout B) as pgTAP fixtures (extends Phase-1's A/B fixtures)
- [ ] (No new framework install — Vitest + pgTAP already configured in Phase 1.)

## Security Domain

> `security_enforcement` not disabled → included.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | **yes** | Narrow Scout RLS (open + own only); actor authorization *inside* the SECURITY DEFINER functions (definer fns must self-authorize — RLS doesn't cover their internal writes); first-wins atomic claim |
| V5 Input Validation | **yes** | `check_status` enum + valid-transition table reject illegal states at the DB boundary; tier constrained; location label length-checked client-side (zod) |
| V7 Logging | **yes** | `event_log` records every transition + `check.accepted`; immutable (Phase-1 trigger); provenance for "when/where filmed" |
| V1 Architecture | **yes** | Server-owned state machine preserved; client holds no business logic (DATA-02); Realtime is read-side only |

### Known Threat Patterns for this phase
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Scout self-assigns / steals an already-claimed check | Tampering / Elevation | `accept_check` guarded `UPDATE ... WHERE status='dispatching' AND scout_id IS NULL`; second tap matches 0 rows |
| Client jumps the state machine (e.g. `requested → delivered`) | Tampering | valid-transition guard in `transition_check`; no client UPDATE policy on `checks` |
| Non-assigned user drives a transition (rates someone else's check, marks delivered) | Elevation | actor authz inside the definer fn (`auth.uid()` vs seeker_id/scout_id) |
| Seeker reads another Seeker's check via Realtime | Information Disclosure | Postgres Changes is RLS-checked per event; `checks_select_own` confines it; realtime auth token = session |
| Scout enumerates all checks via the open-list query | Information Disclosure | RLS exposes only `dispatching && scout_id IS NULL` + own assigned — not delivered/other checks |
| Deliver without a clip (empty/fake delivery) | Tampering | `delivered` transition guard requires a `clips` row |
| Event-log tampering to hide a bad transition | Repudiation | Phase-1 append-only immutability trigger; transitions server-written |

## Project Constraints (from CLAUDE.md)

From `projects/let-me-check/CLAUDE.md`, `lmc-app/CLAUDE.md`, `studio/CLAUDE.md`, global `~/CLAUDE.md` — the planner must honor these:
- **Managed services over custom infra** — Supabase Realtime, not a hand-rolled WebSocket server; no server to babysit.
- **Server owns state/secrets; thin client; no business logic on the client** — all transitions via `transition_check`/`accept_check`; client never writes `status`/`scout_id`.
- **Files under 500 lines** — `waiting.tsx` (854 lines) and `payment.tsx` (~949) are already over; extract the new data/subscription logic into `lib/checks.ts` + `lib/realtime.ts` and small hooks rather than growing the screens. Do not add bulk to over-limit files.
- **Validate input at boundaries** — zod on the location free-text / tier at the form; enum + transition guard at the DB.
- **File org** — SQL in `supabase/`, client lib in `app/lib/`, tests in `supabase/tests/` + `app/lib/*.test.ts`; never save working files/tests/docs to repo root.
- **Market-aware** — use `checks.currency`; never hard-code USD; location stays data.
- **Sibling studio projects are READ-ONLY** — touch only `projects/let-me-check/`.
- **Don't auto-push; propose commit messages for approval** (Troy's git preference).
- **Don't commit secrets** — if Google Places lands later, its key is server-side only, never `EXPO_PUBLIC_`.
- **iOS-first, RN + Expo, no rewrite** — wire behind the existing screens.

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/0004_core_entities.sql`, `0005_rls_policies.sql`, `0006_check_state_machine.sql` (live, committed) — exact `checks` schema, RLS, and the current `transition_check` (no guard yet) — project canon, read this session
- `lmc-app/app/lib/api.ts`, `lib/database.types.ts` (live) — typed data layer, `transition_check` already typed, `ratings`/`clips`(absent)/`check_status` shapes — project canon, read this session
- `.planning/research/ARCHITECTURE.md` — Postgres-as-state-machine, atomic first-wins accept, Postgres-Changes-vs-Broadcast, per-user subscription, build-order — project canon
- `.planning/research/STACK.md` — Realtime Broadcast-for-dispatch vs Postgres-Changes, 500-conn ceiling (irrelevant at this scale), confirmed stack
- `.planning/phases/01-*/01-RESEARCH.md` + 01-01/02/03 SUMMARY — what Phase 1 built (schema, RLS, transition fn, lib layer, test harness)
- `supabase.com/docs/guides/realtime/postgres-changes` — channel `.on('postgres_changes', {filter:'id=eq.X'})` API; **RLS-enforced** ("every change event must be checked to see if the subscribed user has access"); publication required; auth token must be set before subscribing `[CITED, fetched 2026-06-20]`
- npm registry, 2026-06-20 — `@supabase/supabase-js` 2.108.2, `expo-video` 56.1.4 `[VERIFIED]`

### Secondary (MEDIUM confidence)
- Realtime reconnection: the `.subscribe(status => ...)` callback surfaces `SUBSCRIBED|CHANNEL_ERROR|TIMED_OUT|CLOSED`; reconcile via re-fetch — ecosystem-standard pattern (the doc excerpt didn't cover reconnection explicitly; re-fetch-on-error is the safe, source-of-truth-backed approach)

### Tertiary (LOW confidence)
- Exact Supabase CLI flags for `supabase test db` / `gen types` — verify with `--help` at build time (Phase-1 A2 still applies)

## Metadata

**Confidence breakdown:**
- Foundation/what-exists: HIGH — read the live migrations + client this session
- State machine hardening (valid transitions + actor authz + atomic accept): HIGH on shape — composed from the existing `transition_check` + ARCHITECTURE.md's atomic-claim pattern; the exact transition table is a Claude's-discretion call surfaced in Open Q1
- Realtime (Postgres Changes for single-Seeker watch): HIGH — verified RLS-enforcement + API shape against current Supabase docs
- Location/CHECK-01 path: MEDIUM — catalog/free-text recommended now, Places deferred (A4); confirm the entry point with the planner
- No-Scout timeout automation: MEDIUM — state + UI in-scope, auto-timer deferred (A3) — needs a one-line scope confirmation from Troy
- Pitfalls: HIGH — several derived directly from gaps in the live Phase-1 SQL (no transition guard, no Scout read path, publication not enabled)

**Research date:** 2026-06-20
**Valid until:** ~2026-07-20 (30 days; re-verify supabase-js version + CLI flags + Realtime API at build time)
