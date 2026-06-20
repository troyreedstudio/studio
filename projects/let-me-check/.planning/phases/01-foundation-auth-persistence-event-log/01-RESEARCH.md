# Phase 1: Foundation (Auth + Persistence + Event Log) - Research

**Researched:** 2026-06-20
**Domain:** Supabase Auth + Postgres persistence + immutable event log behind an existing React Native (Expo SDK 54 / RN 0.81.5) prototype
**Confidence:** HIGH (locked stack confirmed against current Supabase/Stripe docs and the npm registry; the only MEDIUM items are flagged inline)

## Summary

This phase replaces the prototype's seven in-memory module stores (`lmc-app/app/state/*.ts`) with real Supabase-backed identity and persistence, and stands up an immutable event log from the very first write. The front-end is complete — this is brownfield wiring, not a UI rebuild. The dominant shape (locked and validated in `.planning/research/ARCHITECTURE.md`) is a **thin client over a Postgres source-of-truth**: the `checks.status` column *is* the state machine, Row-Level Security (RLS) enforces ownership/role server-side, and a thin client `lib/` data layer calls typed wrappers instead of mutating module globals.

The four pillars of Phase 1: (1) **Supabase Auth** wired into the existing `auth/` and `onboarding/` screens — Sign in with Apple and Google via native idToken handoff, phone OTP routed *through* Supabase Auth to Twilio, with the session persisted in `expo-secure-store` so it survives restarts; (2) a **Postgres schema** for profiles, the dual-role model, saved places, recents, a payment-method placeholder, the `checks` entity + its server-owned state machine, and the event log — with RLS on every table; (3) the **immutable, append-only event log** (DATA-04), designed *before* the entity schemas per the CTO mandate; (4) a **test harness** (Jest via `jest-expo` for the RN app, plus Postgres-level tests against a staging Supabase project) so later money/dispatch phases add tests cheaply.

**Primary recommendation:** Stand up one Supabase project + a local `supabase/` migrations workflow. Design the `event_log` table first (plain append-only table with a BEFORE-UPDATE/DELETE trigger that raises an exception — **defer the Timescale hypertable to a later phase**; it is unnecessary at 500 checks/90 days and adds operational surface). Then build entity tables with RLS, then a thin `lmc-app/app/lib/` data layer (`supabase.ts`, `api.ts`, typed DB types from `supabase gen types`) that the existing screens import in place of the `state/*` stores. Auth uses **native idToken sign-in** for Apple/Google (cleaner than browser redirects on iOS) with browser+deep-link as the documented fallback.

## User Constraints

> No `CONTEXT.md` exists for this phase (no `/gsd-discuss-phase` was run). Constraints below are taken from the orchestrator prompt's **locked stack decisions**, `PROJECT.md`, and the CTO docs. These are authoritative — research HOW, not WHETHER.

### Locked Decisions
- **Supabase** (Postgres + Auth + RLS) is the backend. No second auth provider (no Auth0/Clerk).
- **Auth methods:** Sign in with Apple, Google, and **phone OTP via Twilio wired THROUGH Supabase Auth** (the app calls `supabase.auth.signInWithOtp` / `verifyOtp`; Supabase calls Twilio — not a separate client path). Twilio Verify is supported as a Supabase SMS provider.
- **Email (later phases) = Brevo** (existing account), NOT Resend. *Not needed in Phase 1 — no transactional email here.*
- **One account holds both Seeker + Scout roles** (dual-role); role switch is Uber-style.
- **Immutable event log from day 1 (DATA-04)** is mandatory and must be designed **before** entity schemas. Decide Postgres+Timescale vs plain append-only table and justify.
- **Server owns the check state machine; client never holds secrets or business logic.** Edge Functions own privileged actions. `checks.status` is the workflow; only the server writes it (enforced by RLS).
- **Market-aware / international-ready:** money carries a currency; a market carries country + locale + legal/payout config as data. Do NOT hard-code USD or US-only assumptions even though v1 is US-only.

### Claude's Discretion (recommend in this research)
- Timescale-vs-plain-table decision for the event log (recommended below: **plain table now**).
- Client state approach replacing the module stores (recommended: thin `lib/` data layer + React Query OR keep the existing pub/sub hook shape backed by Supabase — recommended below).
- Test runner choice and harness shape (recommended: `jest-expo` + a staging Supabase project + SQL-level RLS tests).
- Migrations workflow specifics (recommended: Supabase CLI `supabase/migrations/*.sql` + `db push --linked`).

### Deferred Ideas (OUT OF SCOPE for Phase 1)
- Dispatch, geofence, PostGIS queries, Redis online-set (Phase 5). *Note: enable the PostGIS extension and store venue geofence columns now if cheap, but no dispatch logic.*
- Real camera, Mux, video pipeline (Phase 3).
- Stripe payments/payouts/Connect (Phase 4) — Phase 1 stores only a **payment-method placeholder** (brand + last4 shape), no Stripe SDK.
- Predictive AI (Phase 2+). DATA-04 exists *so that* this is possible later — but build none of it now.
- Push notifications (Phase 7).
- Inngest/Trigger.dev durable jobs (first load-bearing at Phase 4).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Sign up / sign in with Apple, Google, or phone+OTP | Supabase Auth: native idToken for Apple/Google (`signInWithIdToken`), `signInWithOtp`/`verifyOtp` for phone via Twilio. Wires into existing `auth/sign-in.tsx`, `auth/sign-up.tsx`. |
| AUTH-02 | Stays signed in across app restarts (persistent session) | `createClient` with a `expo-secure-store` storage adapter + `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: false`; AppState-driven refresh. |
| AUTH-03 | One account, both roles; switch Seeker↔Scout | `profiles.roles` (array or boolean pair) + a `current_role` preference; RLS reads `auth.uid()`. Replaces `state/intended-role.ts`. |
| AUTH-04 | Sign out | `supabase.auth.signOut()` clears SecureStore session; route back to splash/welcome. |
| DATA-01 | Data persists in Supabase, replacing in-memory stores | Tables for profiles, saved_places, recents, payment_method placeholder; thin `lib/api.ts` replaces all 7 `state/*` stores. |
| DATA-02 | Check lifecycle = server-owned state machine; no client business logic/secrets | `checks` table + `status` enum + state-transition RPC/Edge Function; RLS forbids client writes to `status`/`scout_id`. |
| DATA-03 | Core entities persist | Schema: `profiles`, `markets`, `venues`, `checks`, `payment_methods`, `ratings` (+ placeholders for `clips`, `payments`, `payouts` columns/tables to land in later phases). |
| DATA-04 | Immutable event log from day 1 | `event_log` append-only table (timestamp + geo + context jsonb), BEFORE UPDATE/DELETE trigger raising an exception, `insert`-only RLS. Designed before entity schemas. |
| SAFE-02 | 18+/consent/AUP acceptance recorded at onboarding | `consents` table (or `profiles` columns) capturing 18+ attestation + Terms/Privacy/AUP version + timestamp; written during onboarding, also emitted to `event_log`. |
</phase_requirements>

## Standard Stack

### Core (client — installed into `lmc-app/`)
| Library | Version (SDK-54 aligned) | Purpose | Why Standard |
|---------|--------------------------|---------|--------------|
| `@supabase/supabase-js` | **^2.108.x** `[VERIFIED: npm 2.108.2]` | DB, auth, realtime, storage client | The single client for the whole backend; ties every row to `auth.uid()` for RLS |
| `expo-secure-store` | **~14.2.x** for SDK 54 `[VERIFIED: npm — 14.2.4 latest in 14.x; 56.x is SDK56]` | Encrypted Keychain/Keystore storage for the auth session | Sessions are secrets → never AsyncStorage. Install with `npx expo install` so the SDK-54 version resolves |
| `expo-apple-authentication` | **~7.2.x** for SDK 54 `[VERIFIED: npm — 7.2.x is SDK54; 8.x is SDK56]` | Sign in with Apple (mandatory on iOS when offering other social logins) | Native idToken → `signInWithIdToken`, no browser |
| `@react-native-google-signin/google-signin` | **^16.x** `[VERIFIED: npm 16.1.2]` | Native Google sign-in | Returns idToken for `signInWithIdToken`; requires a dev build (already your reality) |
| `react-native-mmkv` | **^3.3.x** `[VERIFIED: npm — 3.3.3 stable; 4.x is newer, 3.x is the proven New-Arch line]` | Fast local cache for non-secret durable values (recents cache, role pref, flags) | Discord-grade k-v; replaces the pub/sub module globals' persistence need |
| `react-hook-form` + `zod` | **^7.80.x** / **^3.x** `[VERIFIED: npm rhf 7.80.0; zod 3.x is the ecosystem-stable line, 4.x exists but verify peer support before adopting]` | Form state + boundary validation (onboarding, OTP, consent) | Input validation at boundaries per project CLAUDE.md |

### Supporting (server-side / dev — NOT in the RN bundle)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase CLI | latest | Local DB, migrations, type generation | `supabase init`, `supabase migration new`, `supabase db push`, `supabase gen types typescript` |
| `@supabase/supabase-js` (Edge Functions, Deno) | ^2.108.x | Edge Function runtime client (service role) for privileged writes (`status` transitions, event-log writes that must bypass RLS) | When a state transition must be server-only |
| `jest-expo` + `@testing-library/react-native` | **^56.x** `[VERIFIED: npm jest-expo 56.0.5 — use the SDK-aligned major; with SDK54 install via expo]` | RN unit/component test harness | Phase 1 stands up the runner per the roadmap testing strategy |

> **Note on `jest-expo` version:** the npm `latest` (56.x) tracks the newest SDK. For SDK 54, run `npx expo install jest-expo` to get the SDK-54-aligned major rather than pinning 56.x by hand. `[VERIFIED: npm; CITED: expo install resolves SDK-compatible versions]`

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `expo-secure-store` for session | AsyncStorage / MMKV | Works but stores the refresh token in plaintext — **reject** for a money/identity app. SecureStore uses Keychain/Keystore. |
| Native idToken sign-in (Apple/Google) | Browser OAuth + deep link (`signInWithOAuth` + `makeRedirectUri`) | Browser flow is the documented Expo fallback `[CITED: supabase.com/docs/guides/auth/native-mobile-deep-linking]` and works, but native idToken is smoother on iOS and avoids scheme/redirect setup. Recommend native; keep deep-link as fallback for edge cases. |
| Plain append-only `event_log` table | Timescale hypertable | Timescale shines at high-ingest time-series scale; at ~500 checks / 90 days it is premature operational surface. **Recommend plain table now**, with the schema shaped so a Timescale migration is a later, non-breaking change. |
| React Query data layer | Keep the existing `use*()` pub/sub hook shape, backed by Supabase | Both fine. Keeping the hook shape minimizes screen churn (brownfield); React Query adds caching/refetch ergonomics. Recommend a small typed `api.ts` + React Query for server reads; retain `use*` hook names as thin wrappers so screens change minimally. |

**Installation (client):**
```bash
cd lmc-app
npx expo install expo-secure-store expo-apple-authentication
npm install @supabase/supabase-js @react-native-google-signin/google-signin react-native-mmkv react-hook-form zod
# dev/test
npx expo install jest-expo
npm install -D @testing-library/react-native @testing-library/jest-native
```
> Apple/Google native sign-in + MMKV all require an **EAS dev build** (not Expo Go) — already true for Mapbox, so no new pain.

**Version verification done:** `@supabase/supabase-js` 2.108.2, `expo-secure-store` 14.2.x (SDK54 line), `expo-apple-authentication` 7.2.x (SDK54 line), `@react-native-google-signin/google-signin` 16.1.2, `react-native-mmkv` 3.3.3, `react-hook-form` 7.80.0, `jest-expo` 56.x latest (use expo-resolved for SDK54), `zod` 3.x stable / 4.x exists. All `[VERIFIED: npm registry, 2026-06-20]`.

## Architecture Patterns

### Recommended Project Structure
Net-new backend lives in a `supabase/` directory at the project root (`projects/let-me-check/supabase/`). The client gains a thin `lib/` layer; the `state/` stores are rewired, not deleted wholesale.

```
projects/let-me-check/
├── supabase/                       # NET-NEW — version-controlled backend
│   ├── migrations/
│   │   ├── 0001_event_log.sql      # FIRST — append-only log + immutability trigger
│   │   ├── 0002_profiles_roles.sql # profiles, dual-role, consents (SAFE-02)
│   │   ├── 0003_markets_venues.sql # market-aware data (currency/country/locale)
│   │   ├── 0004_core_entities.sql  # checks + status enum, saved_places, recents, payment_methods, ratings
│   │   ├── 0005_rls_policies.sql   # RLS on every table
│   │   └── 0006_state_machine.sql  # check transition fn (server-only writes to status)
│   ├── functions/                  # Edge Functions (privileged actions; minimal in P1)
│   │   └── check-transition/       # the one server-owned state writer (DATA-02 seed)
│   ├── seed.sql                    # markets/venues seed (ported from app/data/markets.ts)
│   └── config.toml
└── lmc-app/app/
    ├── lib/                        # NET-NEW thin client data layer
    │   ├── supabase.ts             # createClient + SecureStore adapter + AppState refresh
    │   ├── database.types.ts       # generated by `supabase gen types typescript`
    │   ├── auth.ts                 # signInWithApple/Google/Otp, signOut, session hook
    │   └── api.ts                  # typed wrappers: getRecents, saveplace, getProfile, recordConsent...
    └── state/                      # EXISTING stores — rewired to read from lib/api.ts
                                    # location.ts stays client-side; others become thin caches over Supabase
```

### Pattern 1: Supabase client with SecureStore session persistence (AUTH-02)
**What:** A single `createClient` configured with a SecureStore-backed storage adapter so the refresh token is encrypted at rest and the session survives restarts. AppState drives token auto-refresh.
**When to use:** Once, at app boot. Every screen imports this client.
```typescript
// lib/supabase.ts — Source: composed from Supabase RN docs + expo-secure-store
// [CITED: supabase.com/docs/guides/auth/quickstarts/react-native — uses a storage adapter + persistSession/autoRefreshToken]
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

const SecureStoreAdapter = {
  getItem: (k: string) => SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
  removeItem: (k: string) => SecureStore.deleteItemAsync(k),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // RN has no URL bar
  }},
);

// Refresh tokens while foregrounded, stop while backgrounded
AppState.addEventListener('change', (s) =>
  s === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh(),
);
```
> **SecureStore size caveat `[CITED: expo docs]`:** SecureStore values are capped (~2KB on iOS). Supabase sessions are normally fine, but if a session ever exceeds it, chunk the value across keys — a known community pattern. Flag for the planner to test on-device.

### Pattern 2: Native idToken sign-in for Apple/Google (AUTH-01)
**What:** Get a native idToken from the platform SDK, hand it to `supabase.auth.signInWithIdToken`. No browser, no redirect scheme.
**When to use:** Apple + Google on iOS. Phone uses the OTP pattern (Pattern 3).
```typescript
// lib/auth.ts — Apple
// [CITED: expo-apple-authentication + supabase signInWithIdToken]
import * as AppleAuthentication from 'expo-apple-authentication';
const cred = await AppleAuthentication.signInAsync({
  requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL],
});
await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken! });
```
**Fallback:** browser OAuth via `supabase.auth.signInWithOAuth({ provider, options:{ redirectTo: makeRedirectUri() }})` + a deep-link handler calling `setSession` — the documented Expo path `[CITED: supabase.com/docs/guides/auth/native-mobile-deep-linking]`. Requires `scheme` in `app.json` and the redirect URL allow-listed in Supabase.

### Pattern 3: Phone OTP through Supabase → Twilio (AUTH-01)
**What:** The app never talks to Twilio. It calls Supabase Auth; Supabase calls the Twilio (or Twilio Verify) provider configured in the dashboard.
**When to use:** Phone sign-in / SMS OTP path in onboarding.
```typescript
await supabase.auth.signInWithOtp({ phone: '+1...' });          // Supabase → Twilio sends SMS
await supabase.auth.verifyOtp({ phone: '+1...', token: '123456', type: 'sms' });
```
> `[VERIFIED: supabase.com/docs/guides/auth/phone-login/twilio — "Supported providers include ... Twilio, Twilio Verify"; app uses supabase.auth methods, Supabase manages Twilio internally]`. Twilio Account SID + Auth Token (+ Message Service / Verify SID) go in Supabase Auth settings, **not** the client.

### Pattern 4: Status column as state machine, server-only writes (DATA-02)
**What:** One `checks` row carries the job through named states; only the server writes `status`. Clients call a transition function/Edge Function and react to the row.
```sql
-- 0004 + 0006
create type check_status as enum
  ('requested','authorized','dispatching','assigned','filming',
   'uploaded','processing','delivered','rated','cancelled','expired');

-- RLS: a Seeker can SELECT their own check, but CANNOT update status/scout_id.
-- Transitions go through a SECURITY DEFINER function or an Edge Function (service role).
```
> In Phase 1 the transition surface can be minimal (just enough to prove the spine + log every transition to `event_log`). Phase 2 exercises it for real. The key Phase-1 deliverable is that **the client physically cannot write `status`** (RLS proves DATA-02).

### Pattern 5: Thin client data layer replacing module globals (DATA-01)
**What:** `lib/api.ts` exposes typed functions (`getRecents`, `savePlace`, `getProfile`, `setCurrentRole`, `recordConsent`). The existing `use*()` hooks in `state/*.ts` become thin wrappers that call these + cache in MMKV, preserving the screens' import surface.
**When to use:** Each store migration. See "Runtime State Inventory" for the per-store map.

### Anti-Patterns to Avoid
- **Client orchestrates the workflow / writes `status`.** A buggy or malicious client could skip steps or self-assign. Enforce server-only `status` writes via RLS. (From `.planning/research/ARCHITECTURE.md` Anti-Pattern 1.)
- **Storing the session in AsyncStorage/MMKV.** Plaintext refresh token. Use SecureStore.
- **Building the event log as a mutable table.** It must be append-only with an immutability trigger, or DATA-04's "immutable" promise is hollow.
- **Hard-coding USD / US-only.** Markets carry currency + country + locale as data from the first migration (MKT-01 is Phase 7, but the *schema shape* must not block it).
- **Talking to Twilio directly from the app.** Route OTP through Supabase Auth.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session persistence + refresh | Custom token store + refresh timer | Supabase Auth + SecureStore adapter + AppState | Token rotation, expiry, refresh races are solved |
| Phone OTP | Custom Twilio integration + code store + rate-limit | `supabase.auth.signInWithOtp`/`verifyOtp` → Twilio provider | Supabase owns delivery, expiry, throttling |
| Apple/Google sign-in | OAuth dance by hand | Native SDK idToken → `signInWithIdToken` | Apple's nonce/token validation is fiddly |
| Authorization / ownership | Client-side role gating | Postgres RLS keyed on `auth.uid()` | Client routing is not security; RLS is |
| Immutability | App-level "don't update" discipline | BEFORE UPDATE/DELETE trigger that RAISEs | Discipline fails; the DB must refuse |
| DB types in TS | Hand-written interfaces | `supabase gen types typescript` | Schema drift caught at compile time (strict TS) |
| Global state primitive | Extend the bespoke `_listeners` pub/sub | React Query (server) + MMKV (cache) | The hand-rolled pattern re-renders broadly and is easy to get subtly wrong (see CONCERNS.md) |

**Key insight:** Nearly every Phase-1 problem (auth, session, OTP, authz, immutability) is a *solved* problem inside Supabase/Expo. The team's job is wiring and schema design, not building identity infrastructure.

## Runtime State Inventory

> This is a brownfield migration phase. A grep finds files; it does NOT find runtime state. Below is the per-store migration map plus the non-obvious runtime state to handle.

### The 7 in-memory stores → Supabase target

| Store file | Current shape | Supabase target | Migration type | Notes |
|------------|---------------|-----------------|----------------|-------|
| `state/intended-role.ts` | `'seeker'\|'scout'\|'both'\|null` | `profiles.roles` + `profiles.current_role` | code edit (reads/writes profile) | AUTH-03. Replaces the fork logic in onboarding. |
| `state/saved.ts` | `SavedPlace[]` (id, name, coord, marketId, savedAt) | `saved_places` table (FK user) | code + data (none to migrate — empty on restart today) | DATA-01/03 |
| `state/recents.ts` | `RecentCheck[]` (name, city, ts) | derived from `checks` history OR a `recents` table | code edit | DATA-01. Prefer deriving from `checks` once they exist; a `recents` table is the simpler Phase-1 step. |
| `state/payment-method.ts` | `SavedCard` (brand, last4, savedAt) | `payment_methods` placeholder table (brand, last4) | code edit | DATA-03. **No Stripe in P1** — keep brand+last4 shape; Stripe customer/token columns land in Phase 4. |
| `state/recurring.ts` | `RecurringCheck[]` | `recurring_checks` table | code edit | DATA-03. Persist now; wiring to real dispatch is Phase 7 (REC-01). |
| `state/scout-earnings.ts` | `{earningsToday, clipsDelivered}` (hard-coded 127.0 / 12) | derived from `checks`/`payouts` later; placeholder columns now | code edit | Remove the fake seed values. Real aggregate is Phase 4. |
| `state/location.ts` | resolved GPS/IP/manual coords | **STAYS CLIENT-SIDE** | none | Confirmed by `.planning/research/ARCHITECTURE.md`: coords pushed to server only when a Scout is online (Phase 5). Leave as-is in P1. |

### Other runtime-state categories

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None yet — app is all in-memory; nothing persists today. No data to migrate, only schema to create. | Create tables; no backfill. |
| Live service config | **NET-NEW** Supabase project: Auth providers (Apple service ID + key, Google OAuth client IDs, Twilio SID/token/Verify SID) configured in the **Supabase dashboard**, not in git. | Document these as setup steps; they are config, not code. Troy provides accounts. |
| OS-registered state | None (no scheduled tasks, no native services). Apple Sign In requires the **Sign In with Apple capability** enabled on the App ID + an EAS dev build. | Add capability via Expo config plugin / Apple Developer portal. |
| Secrets / env vars | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (client, public-safe), Google iOS client ID. Edge Function secrets (service role key) live in Supabase, never client. **Lesson from CONCERNS.md:** every runtime value must be set as an **EAS env var**, not just local `.env`, or it resolves null in TestFlight builds (the Mapbox blank-map bug). | Add to `lmc-app/.env` AND register in EAS dashboard. Anon key is RLS-protected and safe to ship; never ship the service-role key. |
| Build artifacts | EAS dev build must be regenerated when native auth modules (Apple/Google sign-in, MMKV) are added. | Budget one dev-build cycle when these deps land. |

**The canonical question — after every file is updated, what runtime state remains?** A net-new Supabase project's dashboard config (auth providers, RLS, secrets) is the runtime state that does NOT live in git. It must be documented as explicit setup steps for Troy.

## Event Log Design (DATA-04 — design this FIRST)

**Recommendation: a single plain append-only `event_log` table now. Defer Timescale.**

**Justification for a small team at beta scale:** Timescale's hypertable partitioning, compression, and continuous aggregates pay off at high-ingest, long-retention time-series workloads (millions of rows). At ~500 checks over 90 days — a few thousand events — a plain Postgres table with a btree index on `(created_at)` and a GIN index on the `context` jsonb is faster to build, has zero extra operational surface, and is a clean source of truth. The schema is shaped so that converting it to a Timescale hypertable later is a **non-breaking, additive migration** (no column changes). This satisfies the CTO mandate ("decide before schemas") with a documented decision, and preserves every byte of training data DATA-04 is meant to protect. `[ASSUMED: relative build/ops cost at this scale — see Assumptions A1]`

```sql
-- 0001_event_log.sql — created BEFORE any entity table (CTO §6 mandate)
create table event_log (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),     -- timestamp
  actor_id     uuid references auth.users(id),          -- who (nullable for system events)
  event_type   text not null,                           -- see catalog below
  subject_type text,                                    -- 'check' | 'profile' | 'consent' | ...
  subject_id   uuid,                                    -- the row this concerns
  geo          geography(point, 4326),                  -- geo (PostGIS point; nullable)
  context      jsonb not null default '{}'::jsonb        -- context (free-form, indexed)
);
create index event_log_created_at_idx on event_log (created_at);
create index event_log_type_idx on event_log (event_type, created_at);
create index event_log_subject_idx on event_log (subject_type, subject_id);
create index event_log_context_gin on event_log using gin (context);

-- IMMUTABILITY: refuse all UPDATE/DELETE at the database level
create or replace function event_log_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'event_log is append-only: % not allowed', tg_op;
end $$;
create trigger event_log_no_update before update on event_log
  for each row execute function event_log_immutable();
create trigger event_log_no_delete before delete on event_log
  for each row execute function event_log_immutable();

-- RLS: clients may INSERT their own events; nobody may UPDATE/DELETE;
-- reads are restricted (admin/service only) so the log isn't a data-leak surface.
alter table event_log enable row level security;
-- (insert-only policy for authenticated users writing their own actor_id;
--  privileged server writes via service role for system/transition events)
```

**Event-type catalog to capture in Phase 1** (the CTO §6 list, scoped to what exists by end of P1):
- `auth.signed_up`, `auth.signed_in`, `auth.signed_out`, `auth.role_switched`
- `consent.accepted` (18+/Terms/Privacy/AUP — SAFE-02), with version + jurisdiction in `context`
- `profile.updated`
- `saved_place.added` / `saved_place.removed`
- `payment_method.added` (placeholder)
- `check.created`, `check.status_changed` (from→to in `context`) — even if transitions are manual in P1
- `recurring.created` / `recurring.toggled`

> Later phases append their own types (dispatch pings, GPS pings every 30s, clip events, payment auth/capture/refund/payout). The table shape does not change — that is the point of designing it first. `[CITED: docs/BACKEND-KICKOFF.md §6]`

**Where events are written:** privileged/system events (status changes, payouts later) are written **server-side** (Edge Function with service role) so they can't be forged. User-action events (consent, saved-place) can be written client-side under insert-only RLS, but anything that gates money/trust must be server-written. Recommend a single `log_event(...)` SQL helper + a thin `lib/api.ts` `logEvent()` wrapper for the client-safe subset.

## SAFE-02: 18+ / Consent / AUP Acceptance

**Where it happens:** during onboarding (existing screens `onboarding/quick-finish.tsx`, `onboarding/personal-info.tsx`, and the `legal/[doc].tsx` viewer already render terms/privacy/aup/code). Phase 1 makes the acceptance *real and recorded*.

**Schema:** a `consents` table (preferred — auditable, versioned) rather than booleans on `profiles`:
```sql
create table consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  consent_type text not null,        -- 'age_18plus' | 'terms' | 'privacy' | 'aup' | 'scout_code'
  doc_version text not null,         -- which version they accepted
  accepted_at timestamptz not null default now(),
  jurisdiction text                  -- market/country at acceptance (international-ready)
);
```
Each acceptance also emits `consent.accepted` to `event_log`. The Scout-specific `scout_code` consent (SCOUT-02) is Phase 4, but the table shape covers it now. `[CITED: docs/BACKEND-KICKOFF.md §8 — Seeker = 18+ attestation + Terms/Privacy/AUP consent]`

## Migrations Workflow (non-interactive friendly)

Supabase CLI, version-controlled SQL in `supabase/migrations/`:
```bash
supabase init                                  # one-time: creates supabase/ + config.toml
supabase link --project-ref <ref>              # link to the staging/prod project
supabase migration new event_log               # creates timestamped 000x_event_log.sql
# ... write SQL ...
supabase db push --linked                      # apply migrations to the linked project (non-interactive)
supabase gen types typescript --linked > lmc-app/app/lib/database.types.ts
```
- For **local dev/test** without touching the cloud: `supabase start` runs a local Postgres + Studio in Docker; `supabase db reset` re-applies all migrations + `seed.sql` clean.
- **CI / non-interactive:** `supabase db push` honors `SUPABASE_ACCESS_TOKEN` + `--linked`; no prompts. Use a separate **staging** project ref for tests, the **prod** ref for release.
- Port the venue/market seed from `app/data/markets.ts` into `seed.sql` (it is already a clean typed dataset). `markets.ts` then becomes a shape reference and is retired as a runtime source (per CONCERNS.md).

> `[ASSUMED: exact CLI flag names current as of 2026-06 — verify `supabase db push --help` at build time; the CLI evolves. Core workflow (init/link/migration new/db push/gen types) is stable.]` — A2.

## RLS Policy Approach

| Table | Read policy | Write policy |
|-------|-------------|--------------|
| `profiles` | owner (`auth.uid() = id`) | owner may update own profile fields; **not** roles-enforcement-sensitive columns server-controls |
| `saved_places`, `recents`, `recurring_checks`, `payment_methods`, `consents` | owner only | owner insert/delete own rows; `consents` insert-only |
| `checks` | Seeker sees own checks; (later) assigned Scout sees assigned checks | client may INSERT a `requested` check; **client may NOT update `status`/`scout_id`** — server-only |
| `event_log` | service/admin only | insert-only (own actor for client-safe events; service role for system events); update/delete blocked by trigger |
| `markets`, `venues` | public read (catalog) | service/admin write only |

**Core RLS rule:** every policy keys off `auth.uid()`. Role/ownership is enforced *here*, not in client route groups — that is success-criterion #2 and DATA-02. Write an explicit test that a Seeker token cannot read another user's rows and cannot write `checks.status`.

## Brownfield: Which Files Get Touched vs Net-New

### Net-new (create)
- `supabase/` (entire directory: migrations, functions, seed, config)
- `lmc-app/app/lib/supabase.ts`, `lib/auth.ts`, `lib/api.ts`, `lib/database.types.ts`
- `lmc-app/app/lib/session.tsx` or a context/provider for current-session + role
- Test config: `jest.config.js` / `jest-expo` preset, `__tests__/` for RN, SQL test files for RLS

### Existing files to touch (wire real services behind unchanged UI)
- `lmc-app/app/auth/sign-in.tsx`, `auth/sign-up.tsx` — replace `router.push` mocks with real `supabase.auth.*` calls
- `lmc-app/app/onboarding/role.tsx` — write role to `profiles`, not `intended-role.ts`
- `lmc-app/app/onboarding/personal-info.tsx`, `quick-finish.tsx` — persist profile; record consent (SAFE-02)
- `lmc-app/app/onboarding/welcome-back.tsx` — read real persisted role + session
- `lmc-app/app/legal/[doc].tsx` — already renders docs; hook "accept" to `consents` write
- `lmc-app/app/state/*.ts` (6 of 7) — rewire `get*`/mutators/`use*` to call `lib/api.ts`; **keep the export surface** so the ~19 screens that import them change minimally. `location.ts` untouched.
- `lmc-app/app/(seeker)/profile.tsx`, `(scout)/profile.tsx` — wire role switch + sign-out (AUTH-03/04)
- `lmc-app/app/(seeker)/payment-methods.tsx` — read/write the `payment_methods` placeholder table
- `lmc-app/app/_layout.tsx` — add a session/auth gate that routes signed-in vs signed-out at boot
- `lmc-app/package.json` — add deps + test/typecheck/lint scripts (currently none)
- `lmc-app/.env` + EAS env vars — Supabase URL/anon key, Google client ID

### Cleanups to fold in (from CONCERNS.md, cheap to do now)
- Remove `react-native-maps` (dead dep) — not Phase-1-critical but flagged.
- Remove fake seed values in `scout-earnings.ts` (127.0 / 12) when rewiring.

## Common Pitfalls

### Pitfall 1: Session not surviving restart (AUTH-02 silently fails)
**What goes wrong:** Session stored in memory or AsyncStorage; works in dev, fails to persist or leaks the token.
**Why:** Missing/incorrect storage adapter, or `persistSession`/`autoRefreshToken` not set.
**How to avoid:** SecureStore adapter + `persistSession: true` + `autoRefreshToken: true` + AppState refresh. **Test by killing and relaunching the app on a real device.**
**Warning signs:** User logged out after force-quit; token visible in plaintext storage.

### Pitfall 2: EAS env vars not set → null in TestFlight (the Mapbox bug, again)
**What goes wrong:** Supabase URL/anon key present in local `.env`, absent in the cloud build → app can't reach the backend in TestFlight.
**Why:** `.env` is local-only; EAS needs env vars registered in the dashboard/`eas.json`.
**How to avoid:** Register every `EXPO_PUBLIC_*` value as an EAS env var. This exact class of bug already bit the project (CONCERNS.md).

### Pitfall 3: Apple Sign In rejected by App Review if Google/phone offered without it
**What goes wrong:** App Store rejection.
**Why:** Apple requires Sign in with Apple when other third-party logins are offered.
**How to avoid:** Implement Apple sign-in as a first-class option (it's locked anyway). Enable the capability on the App ID.

### Pitfall 4: Event log retrofitted, not built first
**What goes wrong:** Entity tables built, logging bolted on later → gaps, lost early data.
**Why:** Ignoring the CTO §6 "design before schemas" mandate.
**How to avoid:** Migration `0001` IS the event log. Every subsequent feature emits events as it's built.

### Pitfall 5: RLS too permissive (or forgotten) → data leak / client writes status
**What goes wrong:** A table ships with RLS disabled or a policy of `using (true)`; any user reads everyone's data, or a client writes `checks.status`.
**Why:** RLS is opt-in per table; easy to forget on a new table.
**How to avoid:** A migration that enables RLS on **every** table + an automated test asserting cross-user isolation and that `status` is server-only. Treat "RLS enabled on all tables" as a phase gate.

### Pitfall 6: SecureStore 2KB limit on large sessions
**What goes wrong:** A large session string silently fails to store on iOS.
**Why:** SecureStore per-key size cap.
**How to avoid:** Test session storage on-device; if needed, use the community chunked-SecureStore adapter. `[CITED: expo docs SecureStore limits]`

## Code Examples

### Sign-out (AUTH-04)
```typescript
// lib/auth.ts
export async function signOut() {
  await supabase.auth.signOut();   // clears SecureStore session
  // route caller back to /welcome or /index
}
```

### Role switch (AUTH-03)
```typescript
// lib/api.ts — current_role is a profile preference; both roles always available
export async function setCurrentRole(role: 'seeker' | 'scout') {
  const { error } = await supabase.from('profiles')
    .update({ current_role: role }).eq('id', (await supabase.auth.getUser()).data.user!.id);
  if (!error) await logEvent('auth.role_switched', { to: role });
}
```

### Record consent (SAFE-02)
```typescript
export async function recordConsent(type: string, docVersion: string, jurisdiction?: string) {
  const uid = (await supabase.auth.getUser()).data.user!.id;
  await supabase.from('consents').insert({ user_id: uid, consent_type: type, doc_version: docVersion, jurisdiction });
  await logEvent('consent.accepted', { type, docVersion, jurisdiction });
}
```

## Validation Architecture

> `nyquist_validation` is `true` in config — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **Jest via `jest-expo`** (RN unit/component) + **SQL tests against a staging Supabase** (RLS/policy/state-machine). `[VERIFIED: jest-expo is the standard RN/Expo runner]` |
| Config file | none yet — **Wave 0 creates** `jest.config.js` + `jest-expo` preset; `supabase/tests/` for SQL |
| Quick run command | `npm test` (after adding the script) |
| Full suite command | `npm test && supabase db reset && <run SQL/RLS tests against local supabase start>` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-02 | Session persists across restart | integration (device/E2E) + unit on adapter | `npm test -- session` (adapter unit); manual on-device for true restart | ❌ Wave 0 |
| AUTH-03 | Role switch updates profile + logs event | unit (mock supabase) | `npm test -- role` | ❌ Wave 0 |
| AUTH-04 | Sign-out clears session | unit | `npm test -- signout` | ❌ Wave 0 |
| DATA-01 | `lib/api` reads/writes persist (saved_places round-trip) | integration vs local supabase | SQL/integration test | ❌ Wave 0 |
| DATA-02 | Client CANNOT write `checks.status`; server transition works | **RLS SQL test** (negative) | `supabase test db` | ❌ Wave 0 |
| DATA-03 | Core tables exist + FK integrity | migration/schema test | `supabase db reset` (migrations apply clean) | ❌ Wave 0 |
| DATA-04 | `event_log` rejects UPDATE/DELETE; INSERT works | **SQL test** (expect exception on update/delete) | `supabase test db` | ❌ Wave 0 |
| SAFE-02 | Consent row + event written at onboarding | unit + integration | `npm test -- consent` | ❌ Wave 0 |
| (RLS) | Seeker A cannot read Seeker B's rows | **RLS SQL test** (negative) | `supabase test db` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` (fast unit) + `tsc --noEmit`
- **Per wave merge:** full suite incl. `supabase db reset` + SQL/RLS tests against local Supabase
- **Phase gate:** full suite green + "RLS enabled on all tables" assertion + on-device restart-session check before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `jest.config.js` + `jest-expo` preset; `npm test`/`typecheck`/`lint` scripts in `package.json` (none exist today)
- [ ] `supabase/tests/` — SQL tests for event-log immutability, `checks.status` server-only, cross-user RLS isolation (`supabase test db` / pgTAP)
- [ ] A **staging Supabase project** (separate from prod) + local `supabase start` for hermetic tests
- [ ] Test fixtures: two authenticated test users (Seeker A, Seeker B) for isolation tests
- [ ] `@testing-library/react-native` setup for the wired auth/onboarding screens

## Security Domain

> `security_enforcement` not disabled in config → included.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | **yes** | Supabase Auth (Apple/Google idToken, phone OTP via Twilio); no passwords stored by us |
| V3 Session Management | **yes** | Supabase session in SecureStore (Keychain/Keystore); auto-refresh; `signOut` invalidates |
| V4 Access Control | **yes** | Postgres RLS keyed on `auth.uid()`; server-only `status` writes; least-privilege anon key |
| V5 Input Validation | **yes** | `zod` + react-hook-form at form boundaries; Postgres types/enums at DB boundary |
| V6 Cryptography | partial | Never hand-roll: SecureStore (OS keystore) for tokens; Supabase manages auth crypto. No app-level crypto in P1. |
| V7 Logging | **yes** | `event_log` is the audit trail; read-restricted so it isn't a leak surface; no secrets/PII-beyond-needed in `context` |

### Known Threat Patterns for Supabase + RN
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged/skipped state transition (client self-assigns or marks delivered) | Tampering / Elevation | Server-only `status` writes via RLS + Edge Function; never trust client assertions |
| Cross-tenant data read (Seeker A reads B) | Information Disclosure | RLS `using (auth.uid() = user_id)` on every table; negative tests |
| Refresh token theft from device storage | Information Disclosure | SecureStore (encrypted), not AsyncStorage/MMKV |
| Service-role key shipped in app | Information Disclosure / Elevation | Only the **anon** key is in the client; service role lives in Edge Functions/secrets |
| Event-log tampering to hide fraud | Repudiation | Append-only trigger blocks UPDATE/DELETE; server-written for trust-critical events |
| Forged consent / underage bypass | Repudiation / Compliance | `consents` row + immutable event with version + timestamp; server-recorded |
| OTP brute force / SMS pumping | DoS / Spoofing | Supabase + Twilio provider throttling/expiry (don't hand-roll); monitor |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AsyncStorage for Supabase session (old RN quickstart) | SecureStore adapter for the session (secrets), AsyncStorage/MMKV only for non-secret cache | ongoing best practice | Token at rest is encrypted |
| Browser OAuth + deep link for all providers | Native idToken (`signInWithIdToken`) for Apple/Google; browser only as fallback | Supabase idToken sign-in maturity | Smoother iOS UX, less redirect config |
| `ffmpeg-kit-react-native` | retired/archived 2025 — not used in P1 anyway | early 2025 | Don't add it |
| Resend (earlier docs) | **Brevo** for transactional email | project decision | Not in P1; relevant Phase 7 |
| Timescale assumed for event log | Plain append-only table at beta scale, Timescale deferred | this research | Less ops surface now; non-breaking upgrade later |

**Deprecated/outdated:** docs/CLAUDE.md still say RN 0.83.2 — **actual is RN 0.81.5 / Expo SDK 54** (trust `package.json`). All Expo package versions must be SDK-54-aligned via `npx expo install`, not npm `latest` (which tracks SDK 56).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Plain append-only table beats Timescale at this team's beta scale (build + ops cost) | Event Log Design | LOW — if ingest unexpectedly explodes, the table converts to a hypertable additively. CTO mandate satisfied either way; surface to Troy as the documented decision. |
| A2 | Supabase CLI flags (`db push --linked`, `gen types --linked`, `test db`) are current as of 2026-06 | Migrations Workflow | LOW — core workflow is stable; verify exact flags with `--help` at build time. |
| A3 | `expo-apple-authentication` 7.2.x / `expo-secure-store` 14.2.x are the SDK-54-correct lines (8.x/56.x track SDK 56) | Standard Stack | LOW — `npx expo install` resolves the correct version regardless; versions stated for planning visibility. |
| A4 | `zod` 3.x is the safer ecosystem choice over 4.x for RHF peer compatibility right now | Standard Stack | LOW — verify RHF resolver peer support if choosing zod 4. |
| A5 | Native idToken Apple/Google sign-in is fully supported with Supabase on Expo SDK 54 dev builds | Architecture Pattern 2 | LOW — browser+deep-link is the documented fallback if a provider's native path snags. |

## Open Questions

1. **Staging vs prod Supabase projects — one or two?**
   - Known: tests need a non-prod target; CLI supports multiple linked refs.
   - Unclear: whether Troy wants to pay for two Pro projects or run staging on free tier + local Docker.
   - Recommendation: **local `supabase start` (Docker) for CI/dev tests + one cloud project** for the dev build/TestFlight to point at. Add a second cloud project only at real beta.

2. **Recents: table vs derived from `checks`?**
   - Known: today it's an ephemeral `RecentCheck[]`.
   - Unclear: whether Phase 1 already has enough `checks` to derive recents, or needs a standalone `recents` table.
   - Recommendation: a thin `recents` table in P1 (simplest, matches current shape); switch to deriving from `checks` once Phase 2 makes checks real.

3. **How much of the check state machine to build in Phase 1 vs Phase 2?**
   - Known: DATA-02 requires the *server-owned* machine to exist + the client to be unable to write `status`.
   - Recommendation: Phase 1 builds the table, enum, RLS lockout, one transition function, and logs `check.status_changed`. Phase 2 exercises the full lifecycle with Realtime. Confirm this split with the planner.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase account + project | All persistence/auth | ✗ (must create) | — | none — blocking; Troy provisions |
| Twilio account (Verify) | Phone OTP via Supabase | ✗ (must create) | — | Apple/Google still work without it; phone OTP blocked until set |
| Apple Developer + Sign In capability | Apple sign-in | partial (Troy has Apple Dev from Pink Pineapple) | — | none for Apple path |
| Google OAuth client IDs | Google sign-in | ✗ (must create in Google Cloud) | — | other auth methods still work |
| Supabase CLI | Migrations/types/local tests | ✗ on this machine (verify) | — | Supabase Studio web SQL editor (worse — lose version control) |
| Docker (for `supabase start` local) | Hermetic local tests | unverified on Troy's MacBook | — | run tests against a cloud staging project instead |
| EAS dev build pipeline | Native auth + MMKV modules | ✓ (Build 9 shipped) | — | — |

**Missing dependencies with no fallback (blocking, Troy provisions):** Supabase project, Google OAuth client, (Twilio for phone path only).
**Missing with fallback:** Supabase CLI/Docker (can fall back to cloud staging + web SQL editor, but lose local hermetic tests — recommend installing the CLI).

## Project Constraints (from CLAUDE.md)

From `projects/let-me-check/CLAUDE.md`, `lmc-app/CLAUDE.md`, and studio/global CLAUDE.md — the planner must honor these:
- **Managed services over custom infra** (Supabase/Stripe/Mux) — no hand-rolled servers.
- **No secrets on the client; never commit `.env` or credentials.** Anon key only in client; service role in Edge Functions/EAS secrets.
- **Validate input at system boundaries** (zod at forms, Postgres types/enums at DB).
- **Files under 500 lines**; the large screen files (home.tsx ~1705, payment.tsx ~949) should have data hooks extracted as they're wired (don't grow them further).
- **File org:** source under app code dirs, tests under a tests dir, never save working files/tests/docs to repo root.
- **Sanitize file paths / no directory traversal** — relevant if any Edge Function handles file paths.
- **Sibling studio projects are READ-ONLY** — touch only `projects/let-me-check/`.
- **iOS-first, React Native + Expo, no rewrite.**
- **Don't auto-push; propose commit messages for approval** (Troy's git preference).
- **Market-aware schema:** never hard-code USD / US-only tax/payout assumptions.

## Sources

### Primary (HIGH confidence)
- `supabase.com/docs/guides/auth/phone-login/twilio` — Twilio + Twilio Verify are Supabase SMS providers; app uses `supabase.auth.*`, Supabase manages Twilio internally `[VERIFIED]`
- `supabase.com/docs/guides/auth/native-mobile-deep-linking` — browser OAuth + deep link fallback pattern (`makeRedirectUri`, `setSession`, scheme config) `[CITED]`
- `supabase.com/docs/guides/auth/quickstarts/react-native` — RN auth quickstart (storage adapter + persistSession/autoRefreshToken pattern) `[CITED]`
- npm registry, 2026-06-20 — all library versions `[VERIFIED]`
- `.planning/research/ARCHITECTURE.md` + `.planning/research/STACK.md` — locked, validated target architecture (thin-server-over-Postgres, anti-patterns, payment flow) — project canon
- `docs/BACKEND-KICKOFF.md` §6 (event-collection mandate), §8 (KYC/consent split) — project canon
- `.planning/codebase/*` — exact prototype structure, the 7 state stores, CONCERNS (EAS env-var bug, no tests)

### Secondary (MEDIUM confidence)
- Expo SecureStore size limit (~2KB iOS) and chunking workaround — community pattern `[CITED: expo docs + community]`
- jest-expo as the standard RN/Expo test runner — ecosystem consensus

### Tertiary (LOW confidence)
- Exact current Supabase CLI flag names — verify with `--help` at build time (A2)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against npm; SDK-54 alignment noted
- Auth architecture: HIGH — Twilio-through-Supabase and session persistence confirmed against official docs
- Event log design: HIGH on shape/immutability, MEDIUM on the Timescale-defer recommendation (a justified judgment call, flagged A1)
- Schema/RLS: HIGH — follows locked architecture canon
- Pitfalls: HIGH — several drawn from the project's own CONCERNS.md (real, already-hit bugs)

**Research date:** 2026-06-20
**Valid until:** ~2026-07-20 (30 days; Supabase/Expo move fast — re-verify CLI flags + SDK-aligned versions at build time)
