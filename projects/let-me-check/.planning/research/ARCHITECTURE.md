# Architecture Research

**Domain:** Real-time, location-based on-demand gig marketplace (visual verification) — RN+Expo client, Supabase + Stripe + Mux + Mapbox managed-service backend
**Researched:** 2026-06-19
**Confidence:** HIGH (core integration flows verified against Stripe, Mux, and Supabase official docs; dispatch/geo patterns verified against PostGIS docs + marketplace case studies)

## Standard Architecture

The standard shape for an Uber-style on-demand marketplace on managed services is a **thin server orchestrator over a Postgres source-of-truth**, where:

- **Postgres (Supabase) is the single source of truth** for every entity and every state transition. A `check` row's `status` column IS the workflow.
- **Realtime is a read-side notification channel, not the brain.** Clients subscribe to "the rows that concern me"; they never drive dispatch logic.
- **A small set of server endpoints (Supabase Edge Functions) own every privileged action** — money moves, dispatch decisions, state transitions, webhook handling. The client never talks to Stripe/Mux secret APIs directly; it only ever gets short-lived tokens (a Stripe client secret, a Mux upload URL) handed to it by the server.
- **A durable job runner (Inngest/Trigger.dev) owns anything that must survive a crash or run later** — dispatch timeouts, payout release, signage AI, push fan-out.

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENT (RN + Expo)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Seeker flow  │  │  Scout flow  │  │  Realtime    │                  │
│  │ browse→pay→  │  │ online→accept│  │  subscriber  │                  │
│  │ wait→watch   │  │ →film→submit │  │ (my check /  │                  │
│  └──────┬───────┘  └──────┬───────┘  │  my jobs)    │                  │
│         │                 │          └──────┬───────┘                  │
│   vision-camera +   Core Location /         │ (WebSocket)              │
│   Mux upload URL    Fused Location          │                          │
└─────────┼─────────────────┼─────────────────┼──────────────────────────┘
          │ HTTPS (RPC)      │ HTTPS (RPC)     │
┌─────────┴─────────────────┴─────────────────┴──────────────────────────┐
│              SERVER ORCHESTRATION  (Supabase Edge Functions)            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ checks   │ │ dispatch │ │ payments │ │  media   │ │  webhooks    │  │
│  │ create / │ │ match /  │ │ auth-hold│ │ upload   │ │ Stripe / Mux │  │
│  │ cancel   │ │ accept   │ │ capture/ │ │ url /    │ │ (verify sig) │  │
│  │          │ │          │ │ payout   │ │ finalize │ │              │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘  │
└───────┼────────────┼────────────┼────────────┼─────────────┼──────────┘
        │            │            │            │             │
┌───────┴────────────┴────────────┴────────────┴─────────────┴──────────┐
│                        DATA + STATE LAYER                              │
│  ┌────────────────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │ Postgres + PostGIS     │  │ Upstash Redis │  │ Job runner       │  │
│  │ (Supabase)             │  │ online scouts │  │ (Inngest /       │  │
│  │ users, scouts, venues  │  │ geofence hot  │  │  Trigger.dev)    │  │
│  │ (polygon), checks,     │  │ set, cooldown │  │ timeouts, payout │  │
│  │ payments, clips,       │  │ TTL keys      │  │ release, signage │  │
│  │ ratings — SOURCE OF    │  │               │  │ AI, push fan-out │  │
│  │ TRUTH + Realtime feed  │  └───────────────┘  └──────────────────┘  │
│  └────────────────────────┘                                           │
└────────────────────────────────────────────────────────────────────────┘
        │                         │                         │
┌───────┴─────────┐   ┌───────────┴────────┐   ┌────────────┴──────────┐
│  Stripe         │   │  Mux               │   │  Mapbox / Google      │
│  PaymentIntents │   │  direct upload →   │   │  Places / Geocoding   │
│  Connect Express│   │  transcode → HLS   │   │  Expo Push (APNs/FCM) │
│  Identity       │   │  CDN playback      │   │  Twilio Verify, Resend│
└─────────────────┘   └────────────────────┘   └───────────────────────┘
```

### Component Responsibilities

| Component | Responsibility (what it owns) | Typical Implementation |
|-----------|-------------------------------|------------------------|
| **Client (Seeker/Scout)** | UI, capture device location + video, hold short-lived tokens, subscribe to "my" rows. Owns **no** business logic or secrets. | RN + Expo (already built); vision-camera; Mapbox SDK; Supabase Realtime client |
| **`checks` service** | Create a check, validate venue/filming-policy, transition status, cancel. The check row is the workflow. | Edge Function + Postgres RPC; row-level security (RLS) so Seekers see only their checks |
| **`dispatch` service** | Given a check, find eligible Scouts (geofence + online + not-cooled-down), ping them, handle accept (first-wins assignment), re-ping on timeout/decline. | Edge Function reading Redis online-set + PostGIS query; Inngest for timeout/fallback waves |
| **`payments` service** | Create auth-hold PaymentIntent, capture on accept, cancel on no-Scout, trigger Connect payout on delivery. Never trusts client amounts. | Edge Function calling Stripe server SDK; amounts computed server-side from tier |
| **`media` service** | Mint Mux direct-upload URL tied to a check (`passthrough`), finalize playback ID when asset ready. | Edge Function calling Mux server SDK; Mux webhooks update the clip row |
| **`webhooks` handler** | Verify Stripe + Mux signatures, translate external events into authoritative state changes. The async backbone. | Edge Function per provider; **must** verify signature before trusting payload |
| **Postgres + PostGIS** | Source of truth; geofence polygons + Scout positions; emits Realtime change events. | Supabase Postgres, PostGIS extension on Day 1, RLS everywhere |
| **Redis (Upstash)** | Hot, ephemeral state: online-Scout set, last-known positions, cooldown TTL keys (`scout:venue` → 20 min). | Upstash serverless Redis |
| **Job runner** | Durable timers + retries: dispatch timeouts, payout release, signage AI, push fan-out, recurring checks. | Inngest or Trigger.dev |

## Recommended Project Structure

The client already exists (`lmc-app/`). This is the structure for the **new backend** (a `supabase/` directory in the repo root for the project) plus the thin client-side data layer that replaces the in-memory `app/state/*` stores.

```
supabase/
├── migrations/                 # SQL schema (source of truth, version-controlled)
│   ├── 0001_core_tables.sql    # users, scouts, venues(geofence polygon), checks
│   ├── 0002_payments.sql       # payment_intents, payouts, ledger
│   ├── 0003_media.sql          # clips (mux_asset_id, playback_id, status)
│   ├── 0004_rls_policies.sql   # row-level security per role
│   └── 0005_postgis_indexes.sql# GiST index on venue geofence + scout location
├── functions/                  # Edge Functions (the server orchestrator)
│   ├── checks-create/          # validate + insert check, kick off dispatch
│   ├── checks-cancel/
│   ├── dispatch-match/         # geofence query → eligible scouts → ping
│   ├── dispatch-accept/        # first-wins assignment (atomic)
│   ├── payments-authorize/     # create PaymentIntent (manual capture)
│   ├── payments-capture/       # on accept
│   ├── payouts-release/        # on delivery, Connect transfer
│   ├── media-upload-url/       # mint Mux direct upload
│   ├── webhook-stripe/         # signature-verified
│   └── webhook-mux/            # signature-verified
└── jobs/                       # durable workflows (Inngest/Trigger.dev)
    ├── dispatch-timeout.ts     # no accept in N sec → re-ping / widen / fail
    ├── auth-hold-expiry.ts     # safety net before 7-day Stripe expiry
    ├── signage-ai.ts           # post-beta
    └── push-fanout.ts

lmc-app/app/
├── lib/
│   ├── supabase.ts             # client + auth session
│   ├── api.ts                  # typed wrappers around Edge Function calls
│   └── realtime.ts             # subscribe to my-check / my-jobs channels
└── state/                      # existing stores, now backed by Supabase + MMKV
                                # (location.ts stays client-side; others gain persistence)
```

### Structure Rationale

- **`migrations/`:** Schema is the contract. Every state machine lives in the `checks.status` column; reviewing one SQL file shows the whole domain. PostGIS index lives here so geo queries are fast from Day 1.
- **`functions/` one folder per privileged action:** Keeps each endpoint small, independently deployable, and easy to reason about for a small team. Secrets (Stripe/Mux keys) live only here, never in the client.
- **`jobs/` separate from `functions/`:** Edge Functions are request/response and short-lived; anything with a timer, retry, or delay belongs in the durable job runner. Mixing the two is the classic cause of "the payout never went out because the function timed out."
- **Client `lib/` thin:** The client calls named server endpoints and subscribes to Realtime. It never reconstructs business rules. This is the single biggest reliability lever for a non-technical-led team.

## Architectural Patterns

### Pattern 1: Status column as state machine (the check lifecycle)

**What:** One `checks` row carries the entire job through named states. Every transition is a server write; clients react to the change.
**When to use:** Always, for the core loop. This is the spine of the system.
**Trade-offs:** Simple, auditable, Realtime-friendly. Requires discipline that **only the server** writes `status` (enforced by RLS) so clients can't skip steps.

```
requested → authorized → dispatching → assigned → filming
   → uploaded → processing → delivered → rated
                    �‖ (any failure / no-scout)
                  cancelled / expired   (auth-hold released, no charge)
```

```typescript
// dispatch-accept: first-wins assignment must be atomic
// (two scouts tapping "accept" at the same instant)
const { data, error } = await supabase
  .from('checks')
  .update({ status: 'assigned', scout_id: me, assigned_at: now })
  .eq('id', checkId)
  .eq('status', 'dispatching')   // <-- guard: only succeeds if still open
  .select()
  .single();
// if no row returned, someone else got it → show "taken"
```

### Pattern 2: Server-driven dispatch, client-driven status subscription

**What:** The server decides who to ping (geo query + online set). Scouts do **not** each open a Realtime firehose of all jobs. Instead, the server sends a **targeted push** + writes a `job_offer` row the chosen Scout subscribes to; the Seeker subscribes only to their own check row.
**When to use:** Any time more than a handful of Scouts are online. This is the key scaling decision.
**Trade-offs:** Verified limitation — Supabase Postgres Changes checks every change against every subscriber on a single thread, so "every Scout subscribes to all jobs" does not scale. Server-driven dispatch + per-user subscriptions avoids that. Slightly more server logic, far better scale and control over fairness/timeouts.

```typescript
// Seeker subscribes ONLY to their check (filtered, cheap)
supabase.channel(`check:${checkId}`)
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'checks',
      filter: `id=eq.${checkId}` },
    ({ new: row }) => setStatus(row.status))   // dispatching→assigned→delivered
  .subscribe();
```

### Pattern 3: Token-handoff for third-party direct access

**What:** The client never holds Stripe/Mux secrets. The server mints a single-use, scoped token (Stripe PaymentIntent client secret; Mux resumable upload URL) and hands it over. The client uses it directly with the vendor; the vendor's webhook tells the server what happened.
**When to use:** Every payment and every video upload.
**Trade-offs:** Secrets stay server-side; large uploads/payment UIs talk straight to the vendor (no proxying gigabytes through your server). Cost: you must handle webhooks idempotently and verify signatures — out-of-order/duplicate webhooks are normal.

```typescript
// media-upload-url: tie the Mux upload to the check via passthrough,
// so the webhook can find the right row regardless of event ordering
const upload = await mux.video.uploads.create({
  cors_origin: '*',
  new_asset_settings: { playback_policy: ['signed'],
    passthrough: checkId },            // <-- correlation key
});
return { uploadUrl: upload.url, uploadId: upload.id };
```

## Data Flow

### One check, end to end (the core money path)

```
SEEKER taps "Check this venue"
  │
  ▼
[checks-create]  insert check(status=requested), compute price server-side
  │
  ▼
[payments-authorize]  Stripe PaymentIntent (capture_method=manual)
  │   → status=authorized   (funds held, NOT charged — Visa CIT hold ≈ 7 days)
  ▼
[dispatch-match]  status=dispatching
  │   ├ Redis: online scouts near venue
  │   ├ PostGIS: ST_DWithin(scout.loc, venue.geofence) AND not in cooldown
  │   └ push to eligible scouts; start dispatch-timeout job
  ▼
SCOUT accepts  →  [dispatch-accept]  atomic guard → status=assigned, scout_id set
  │
  ▼
[payments-capture]  capture the PaymentIntent  (now the Seeker is charged)
  │   (Decision: capture on ACCEPT per PROJECT.md auth-hold model)
  ▼
SCOUT confirms reference photo → films 15s (vision-camera) → status=filming
  │   clip carries GPS stamp; server checks it falls inside the geofence
  ▼
[media-upload-url] → client uploads to Mux directly → status=uploaded
  │
  ▼
Mux transcodes → webhook-mux (video.asset.ready) → status=processing→delivered
  │   set clip.playback_id; push "Your check is ready" to Seeker
  ▼
SEEKER watches (Mux signed HLS) + rates  → status=rated
  │
  ▼
[payouts-release]  Stripe Connect transfer to Scout; set venue cooldown TTL (Redis)
```

### Failure / no-Scout branch (why auth-hold matters)

```
dispatching → (no eligible accept after timeout waves) → expired/cancelled
  → CANCEL the PaymentIntent → hold released → Seeker never charged
  (This is the entire reason for manual capture: no charge-then-refund.)
```

### State management (client)

```
Postgres row  ──(Realtime UPDATE on my check)──►  client subscriber
     ▲                                                 │
     │ (only server writes status, enforced by RLS)    ▼
  Edge Function  ◄──── client calls named RPC ──── UI action (tap)
```

The existing in-memory `app/state/*` stores become thin caches over Supabase (with MMKV for offline persistence of things like the saved card brand/last4 and recents). `location.ts` stays client-side; its resolved coords get **pushed to the server** only while a Scout is online (to feed dispatch).

### Key data flows

1. **Dispatch eligibility:** Redis online-set (fast membership) ∩ PostGIS `ST_DWithin` geofence query (correctness) ∩ cooldown TTL check. Redis narrows the candidate set; PostGIS confirms geometry. H3 hex bucketing is an optimization layer for later scale, not required for beta.
2. **Money:** authorize (hold) → capture (on accept) → transfer (on delivery). Three distinct server actions, each idempotent, each driven by a state transition — never by the client asserting "I paid."
3. **Video:** server mints upload URL → client uploads to Mux → Mux webhook flips clip to ready → push to Seeker. Correlate via `passthrough=checkId` so webhook ordering never matters.

## Scaling Considerations

| Scale | Architecture adjustments |
|-------|--------------------------|
| **0–1k checks/mo (Miami beta)** | Everything above as-is. Supabase free/Pro, single region. Postgres Changes fine for per-user check subscriptions. Redis optional but recommended for online-set + cooldown. PostGIS `ST_DWithin` with a GiST index is plenty fast. |
| **1k–100k checks/mo** | Move ALL dispatch fan-out to server-driven push (never client firehose). Add H3 hex bucketing so position updates check zone membership at cell level instead of point-in-polygon per ping. Put Realtime only on per-check / per-offer channels. Consider Realtime **Broadcast** (not Postgres Changes) for high-frequency live Scout location, since Broadcast doesn't hit the DB. |
| **100k+ checks/mo** | Dedicated dispatch service (out of Edge Functions) holding online state in memory/Redis; treat Postgres as system-of-record only. Regional sharding by market (Miami, then city N). Mux + Stripe already scale; your dispatch matching is the thing you'll own. |

### Scaling priorities

1. **First bottleneck — Realtime fan-out.** If every Scout subscribes to every job via Postgres Changes, the single-threaded change-checking saturates. Fix (designed in from Day 1): server-driven targeted dispatch + per-user subscriptions only.
2. **Second bottleneck — geo query under live position churn.** Thousands of position updates/sec doing point-in-polygon is expensive. Fix: H3 hex bucket the venue geofences and Scout positions; check cell membership first, exact geometry only for candidates.

## Anti-Patterns

### Anti-Pattern 1: Client orchestrates the workflow

**What people do:** Let the app call Stripe to charge, then tell the server "I'm assigned now," then mark itself delivered.
**Why it's wrong:** A malicious or buggy client can skip payment, self-assign, or fake delivery; race conditions assign one job to two Scouts. With real money and real people on the ground, this is the failure that loses trust.
**Do this instead:** Server owns every state transition. The client only requests actions and reacts to authoritative state changes. Enforce with RLS so clients literally cannot write `status` or `scout_id`.

### Anti-Pattern 2: Every Scout subscribes to a global "open jobs" Realtime feed

**What people do:** Have the Scout app subscribe to all `checks WHERE status=dispatching` and filter client-side.
**Why it's wrong:** Verified — Supabase Postgres Changes evaluates every change against every subscriber on a single thread; this becomes the bottleneck quickly and leaks jobs to ineligible Scouts.
**Do this instead:** Server runs the geofence/eligibility query and pushes a targeted offer (push notification + a `job_offer` row the chosen Scout subscribes to). Subscriptions are always scoped to "rows about me."

### Anti-Pattern 3: Charge first, refund if no Scout

**What people do:** Capture the Seeker's card immediately on request, refund if nobody accepts.
**Why it's wrong:** Refund fees, chargeback risk, bad UX, and accounting noise — for a job that may never happen.
**Do this instead:** `capture_method=manual`. Authorize (hold) on request; capture only when a Scout accepts; cancel the PaymentIntent (release the hold, no charge) if dispatch fails. Visa customer-initiated holds last ~7 days — vastly longer than the 7–10 min job needs.

### Anti-Pattern 4: Trusting webhooks without signature verification or idempotency

**What people do:** Accept any POST to `/webhook-stripe` and apply it; assume each event arrives once, in order.
**Why it's wrong:** Spoofable; Stripe and Mux both retry and can deliver duplicates/out-of-order. Applying a duplicate `payout` could pay a Scout twice.
**Do this instead:** Verify the signature on every webhook; make handlers idempotent (dedupe on event id; use `passthrough`/correlation keys so order doesn't matter).

### Anti-Pattern 5: Running timers inside Edge Functions

**What people do:** `setTimeout` for the dispatch timeout or "release the hold in 10 minutes" inside the function.
**Why it's wrong:** Edge Functions are short-lived; the timer dies with the request. The timeout never fires; jobs hang forever.
**Do this instead:** Schedule durable jobs (Inngest/Trigger.dev) for every delayed action: dispatch re-ping waves, no-Scout failure, payout release, auth-hold safety expiry.

## Integration Points

### External Services

| Service | Integration pattern | Notes / gotchas |
|---------|---------------------|-----------------|
| **Stripe Payments** | Server creates PaymentIntent `capture_method=manual`; client confirms with client secret (Apple/Google Pay). Webhook confirms. | Capture once; partial capture releases remainder. Hold expiry ~7 days (Visa CIT) — set a safety job well before. |
| **Stripe Connect Express** | Scout onboards via Express onboarding link; transfer on delivery. | Requires Stripe Identity (KYC) before payout; tax via Stripe Tax. Payout is a separate action from capture. |
| **Mux** | Server mints direct (resumable) upload URL with `passthrough=checkId`; client `PUT`s file; webhooks `video.asset.created`/`video.asset.ready` flip clip state. | Use `passthrough` to correlate — webhooks arrive out of order. Use signed playback policy so only the paying Seeker can watch. |
| **Mapbox** | Client renders maps + Scout position; geofence math via Turf.js client-side for UX, authoritative check via PostGIS server-side. | UX-side geofence is a hint; the **server** geofence decision is the one that counts. |
| **Google Places / Geocoding** | Venue autocomplete + name→GPS + reference photo source. | Cache results in Supabase Storage to limit per-call cost and rate limits. |
| **Expo Push (APNs/FCM)** | Server sends targeted pushes: job offers to Scouts, "ready" to Seekers. | Fan-out belongs in the job runner, not inline in the request. |
| **Twilio Verify / Resend** | SMS OTP and transactional email, server-triggered. | — |

### Internal Boundaries

| Boundary | Communication | Considerations |
|----------|---------------|----------------|
| Client ↔ server | HTTPS RPC to named Edge Functions + Realtime subscription back | Client holds no secrets, no business rules; only short-lived vendor tokens |
| Edge Functions ↔ Postgres | SQL / RPC with service role; RLS for client-scoped reads | Status transitions are server-only writes |
| Edge Functions ↔ Redis | Online-set membership, cooldown TTL, last-known position | Ephemeral; Postgres remains source of truth |
| Edge Functions ↔ job runner | Enqueue durable jobs (timeouts, payout, AI, push) | Anything delayed/retried lives here, never in a function timer |
| Webhooks ↔ state | Verified vendor events → authoritative status changes | Idempotent, signature-checked, correlation-keyed |

## Build-Order Implications (for the roadmap)

Dependencies dictate the order. Each layer is usable before the next exists.

1. **Auth + persistence foundation** — Supabase project, schema (`users`, `scouts`, `venues` with PostGIS polygons, `checks`), RLS, real auth (Apple/Google/OTP). *Nothing else can be real until rows persist and identity is real.* Replaces in-memory stores.
2. **One real check, no money, no dispatch** — `checks-create` + manual server status transitions + the client subscribing to its own check row. Proves the Postgres-as-state-machine + Realtime spine.
3. **Video pipeline** — `media-upload-url` + vision-camera capture + Mux upload + `webhook-mux` → playable clip in `delivery`. Independent of payments/dispatch; can be built in parallel with step 4. Delivers the visible "wow."
4. **Payments** — `payments-authorize` (hold) → `payments-capture` → Connect payout + Identity. Slots onto the existing check state machine at `authorized`/`assigned`/`delivered`. Needs the job runner for hold-expiry safety.
5. **Real-time dispatch + geofence** — Redis online-set + PostGIS `ST_DWithin` eligibility + targeted push + atomic accept + dispatch-timeout jobs + cooldown. This is the highest-complexity, highest-risk layer; build it once the loop and money are proven so it has a real pipeline to plug into.
6. **Beta-grade verification** — reference-photo confirm, GPS-stamp-inside-fence check, manual review queue, rating → payout gate. Layers onto dispatch + media. (AI signage detection deferred per PROJECT.md.)
7. **Push, recurring, polish, launch** — full Expo Push fan-out via job runner, recurring checks scheduler, Sentry/PostHog, Miami beta.

**Roadmap note — parallelizable:** steps 3 (video) and 4 (payments) are independent of each other and both only depend on steps 1–2. Step 5 (dispatch) is the critical-path long pole and benefits from the loop already working end-to-end. The job runner (Inngest/Trigger.dev) first becomes load-bearing at step 4 (hold expiry) and step 5 (timeouts), so stand it up at step 4.

## Sources

- [Stripe — Place a hold on a payment method (manual capture, hold durations)](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method) — HIGH (official)
- [Mux — Upload files directly (direct upload + webhook flow, passthrough)](https://www.mux.com/docs/guides/upload-files-directly) — HIGH (official)
- [Supabase — Realtime Postgres Changes (filters + single-thread scale limit)](https://supabase.com/docs/guides/realtime/postgres-changes) — HIGH (official)
- [PostGIS — ST_DWithin (indexed radius query)](https://postgis.net/docs/ST_DWithin.html) — HIGH (official)
- [PostGIS — Spatial queries / GiST indexing](https://postgis.net/docs/using_postgis_query.html) — HIGH (official)
- [Location indexing guide: Geohash, Quadtree, S2, Uber H3](https://joudwawad.medium.com/location-indexing-complete-guide-36a143569555) — MEDIUM (corroborating, dispatch-vs-analytics H3 split)
- LMC `docs/STACK.md` (locked stack), `.planning/PROJECT.md` (auth-hold model, scope), `.planning/codebase/ARCHITECTURE.md` (current prototype) — project canon

---
*Architecture research for: real-time location-based on-demand visual-verification marketplace*
*Researched: 2026-06-19*
