# Architecture

**Analysis Date:** 2026-06-19

## Pattern Overview

**Overall:** File-based-routed React Native (Expo Router) UI prototype, organized as two role-based navigation stacks over a shared mock-data layer.

**Key Characteristics:**
- **File-based routing** — every screen is a file under `lmc-app/app/`. The file path IS the route. No central route table.
- **Two role stacks as route groups** — `app/(seeker)/` and `app/(scout)/` are Expo Router groups: they share one account but present separate flows. The `(parens)` keep the folder out of the URL path.
- **Mock-data prototype, no backend** — all venue/market data is centralized in `app/data/markets.ts`; everything else is local component state or a handful of module-level in-memory stores in `app/state/`. There is no API, database, auth server, payment processor, camera capture, or geolocation dispatch wired up. Those are UI mockups.
- **Inter-screen data via route params** — screens pass data forward with `router.push({ pathname, params })` and read it with `useLocalSearchParams()`. This is the primary "data bus" between screens.
- **Cross-cutting shared state via in-memory stores** — a small custom pub/sub pattern in `app/state/*.ts` holds data that must survive across screens (chosen role, resolved location, saved card, recents, saved places, recurring checks, scout earnings).
- **Dark theme baked in at every layout** — root and both group `_layout.tsx` set `backgroundColor: '#000000'` and `headerShown: false`.

## Layers

**Root navigation shell:**
- Purpose: Loads ~30 Google fonts, sets the Mapbox access token, renders the root `Stack` with the dark theme.
- Location: `app/_layout.tsx`
- Contains: `RootLayout()` — gates render on `useFonts(...)`, then renders `<Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000000' } }} />`.
- Depends on: `expo-router`, `@rnmapbox/maps` (token init), `@expo-google-fonts/*`.
- Used by: Expo Router automatically as the app entry layout.

**Route group: Seeker (`app/(seeker)/`):**
- Purpose: The full Seeker journey — browse, request, pay, wait, watch, rate, plus account utilities.
- Location: `app/(seeker)/` with its own `app/(seeker)/_layout.tsx` (a plain dark `Stack`).
- Contains: 20+ screens (`home.tsx`, `venue.tsx`, `payment.tsx`, `finding.tsx`, `waiting.tsx`, `confirmed.tsx`, `delivery.tsx`, `cancelled.tsx`, `error.tsx`, `history.tsx`, `saved.tsx`, `recurring.tsx`, `recurring-setup.tsx`, `search.tsx`, `notifications.tsx`, `payment-methods.tsx`, `preferred-cities.tsx`, `membership.tsx`, `invite.tsx`, `report.tsx`, `help.tsx`, `profile.tsx`).
- Depends on: `app/data/markets.ts`, `app/state/*`, route params.
- Used by: Reached after onboarding lands on `/(seeker)/home`.

**Route group: Scout (`app/(scout)/`):**
- Purpose: The Scout job loop — go online, accept a request, film, submit, view earnings, withdraw.
- Location: `app/(scout)/` with `app/(scout)/_layout.tsx` (plain dark `Stack`).
- Contains: `dashboard.tsx`, `filming.tsx`, `submitted.tsx`, `earnings.tsx`, `withdraw.tsx`, `profile.tsx`.
- Depends on: `app/state/scout-earnings.ts`, route params.
- Used by: Reached via `/(scout)/dashboard` from the role picker / welcome-back / profile toggle.

**Pre-app flow (un-grouped, top-level files):**
- Purpose: Boot splash, onboarding, auth, scout application, legal, and developer/lab screens.
- Location: top-level `app/*.tsx` plus `app/onboarding/`, `app/auth/`, `app/scout/`, `app/seeker/`, `app/legal/`.
- Contains: `index.tsx` (boot splash), `how-it-works.tsx`, `welcome.tsx`, `intro.tsx`, the `onboarding/` wizard, `auth/sign-in.tsx` + `auth/sign-up.tsx`, the `scout/` application screens, `seeker/rules.tsx`, and `legal/[doc].tsx` (dynamic).
- Depends on: `app/state/intended-role.ts`, `app/state/location.ts`, `app/data/markets.ts`.
- Used by: The entry boot sequence before a role stack is entered.

**Mock data layer:**
- Purpose: Single source of truth for countries, markets (cities), and venues, plus geo helpers.
- Location: `app/data/markets.ts` (607 lines).
- Contains: typed datasets (`COUNTRIES`, `COUNTRY_DIAL_CODES`, `MARKETS`, `VENUES`) and pure helpers (`getMarketById`, `getMarketsForCountry`, `getLiveMarkets`, `getVenuesForMarket`, `getVenueByName`, `isPartnerVenue`, `getVenueFilmingPolicy`, `searchInMarket`, `distanceKm`, `nearestLiveMarket`).
- Depends on: nothing (pure data + functions).
- Used by: Seeker screens, search, onboarding city/country pickers, location resolution.

**In-memory state stores:**
- Purpose: Hold data that must persist across screens within a session (the closest thing to global state).
- Location: `app/state/` — see "Key Abstractions" below.
- Depends on: only `react` (`useState`/`useEffect` for the subscription hook).
- Used by: Screens that need shared, cross-route data.

## Data Flow

**Seeker request flow (the core money path):**

1. `app/(seeker)/home.tsx` — Seeker browses venues for the resolved market (data from `markets.ts`, filtered by location). Tapping a venue does `router.push({ pathname: '/(seeker)/venue', params })`.
2. `app/(seeker)/venue.tsx` — venue detail + tier selection (Standard/Priority, optional +interior for partner venues). Pushes forward to payment with the chosen tier as params.
3. `app/(seeker)/payment.tsx` — order summary + fee breakdown; reads the saved card from `app/state/payment-method.ts`; on confirm `router.replace({ pathname: '/(seeker)/finding' / '/waiting', params })`.
4. `app/(seeker)/finding.tsx` / `app/(seeker)/waiting.tsx` — countdown + dispatch/progress steps (mocked timers). On completion records the check via `addRecent(...)` and routes to delivery/confirmed.
5. `app/(seeker)/delivery.tsx` — video player + 5-star rating + Scout info.
- Branch states: `confirmed.tsx`, `cancelled.tsx`, `error.tsx` cover the non-happy paths, each reached via `router.replace` with params.

**Scout job flow:**

1. `app/(scout)/dashboard.tsx` — online/offline toggle + incoming requests; reads live earnings via `useScoutEarnings()`. Accepting a request does `router.push({ pathname: '/(scout)/filming', params })`.
2. `app/(scout)/filming.tsx` — recording UI + countdown + GPS badge (all mock). On submit calls into the earnings store and `router.replace('/(scout)/submitted')`.
3. `app/(scout)/submitted.tsx` — confirmation + clip stats; earnings incremented via `addClipEarning(amount)` in `app/state/scout-earnings.ts`.
4. `app/(scout)/earnings.tsx` / `app/(scout)/withdraw.tsx` — weekly chart, payout history, withdraw mock.

**State Management:**
- **Local component state** (`useState`) is the default for everything screen-local.
- **Route params** (`useLocalSearchParams`) carry data forward between screens (used in ~19 screens).
- **In-memory stores** (`app/state/*.ts`) carry data that outlives a single screen but lives only for the session — lost on app restart. No persistence layer (no AsyncStorage, no backend) is wired up yet.

## Key Abstractions

**In-memory store (module-level pub/sub):**
- Purpose: A minimal global-state primitive. Each store is a `.ts` module holding private module-scoped variables, a `_listeners` array, a `notify()` fan-out, plain getters/setters, and a `use*()` React hook that subscribes via `useEffect` and forces re-render with a `useState` counter.
- Examples:
  - `app/state/intended-role.ts` — role chosen at `/onboarding/role` (`'seeker' | 'scout' | 'both' | null`); forks the end of onboarding.
  - `app/state/location.ts` — resolved device location with a GPS → IP → manual ladder (`LocationStatus`, `Coords` as `[lon, lat]`, `LocationSource`); never defaults to a hard-coded city.
  - `app/state/payment-method.ts` — saved card (`SavedCard` brand/last4 only; no raw card data).
  - `app/state/recents.ts` — recent checks, newest-first, de-duped, capped at 10; drives the home "RECENT" list.
  - `app/state/saved.ts` — Seeker's saved places.
  - `app/state/recurring.ts` — recurring scheduled checks.
  - `app/state/scout-earnings.ts` — today's earnings + clips delivered, incremented on clip acceptance.
- Pattern: each exposes `getX()`, mutators that call `notify()`, and a `useX()` hook. Every store header documents the production replacement (Supabase / Stripe / AsyncStorage).

**Centralized typed dataset (`app/data/markets.ts`):**
- Purpose: Single editable source for the whole geography + venue catalog. Adding a country/city/venue is a data edit only — no code changes.
- Examples: `COUNTRIES`, `MARKETS`, `VENUES`, plus `getVenueFilmingPolicy()` (green/yellow/red filming policy with per-venue and per-category defaults) and `isPartnerVenue()`.
- Pattern: data tables + pure helper functions; `[lon, lat]` ordering matches Mapbox.

## Entry Points

**`app/_layout.tsx` (root layout):**
- Location: `app/_layout.tsx`
- Triggers: Expo Router loads this first for the whole app.
- Responsibilities: Set Mapbox token from `EXPO_PUBLIC_MAPBOX_TOKEN`, block render until fonts load, render the dark root `Stack`.

**`app/index.tsx` (boot splash):**
- Location: `app/index.tsx`
- Triggers: The `/` route — first screen rendered inside the root Stack.
- Responsibilities: Animated chrome "LET ME CHECK" wordmark + boot chime, then `router.replace('/how-it-works')` after ~3.8s.

**Boot → role routing sequence:**
- `index.tsx` → `how-it-works.tsx` → `welcome.tsx` / `onboarding/role.tsx` → `auth/sign-up.tsx` → onboarding wizard (`onboarding/personal-info`, `country`, `city`, `permissions`, `quick-finish`, `payment-checkout`) → fork on intended role:
  - seeker → `/(seeker)/home`
  - scout → `/scout/become` → scout application screens → `/(scout)/dashboard`
  - both → `onboarding/both-fork.tsx` (Y-fork picker)
- Returning users hit `onboarding/welcome-back.tsx`, which routes directly to `/(seeker)/home` or `/(scout)/dashboard`.

## Error Handling

**Strategy:** UI-state error screens, not exception handling. The flow has dedicated terminal screens (`app/(seeker)/error.tsx`, `app/(seeker)/cancelled.tsx`) reached by `router.replace` with params describing what failed. Async/native calls that can fail in the prototype (e.g. the boot chime in `index.tsx`) are wrapped in defensive `try/catch` that silently skips.

**Patterns:**
- Dedicated error/cancelled route screens instead of inline error banners.
- `router.canGoBack()` guards before `router.back()` (e.g. `how-it-works.tsx`) so navigation never dead-ends.
- Defensive `try/catch` around optional native calls.

## Cross-Cutting Concerns

**Logging:** None — no logger, no analytics, no error reporting wired in.
**Validation:** Minimal, screen-local (form fields in onboarding/auth). No schema/boundary validation layer (there is no backend boundary yet).
**Authentication:** Mock only — `app/auth/sign-in.tsx` and `app/auth/sign-up.tsx` are UI; no real auth provider. Planned: Sign in with Apple/Google + SMS OTP via Supabase.

## Planned (Not Yet Built) Backend

The verification/dispatch moat is entirely unbuilt — every layer below is a UI mockup today and is the first work item when the backend phase starts:

- **Dispatch + geofence:** 30–50m GPS geofence per venue; only Scouts inside get pinged; 20-min per-venue Scout cooldown. Today `app/state/location.ts` resolves the device's own location client-side only; there is no server-side nearby-Scout matching. Planned: PostGIS + H3 + Mapbox.
- **Reference photo confirmation:** Scout confirms the right place before filming — not implemented.
- **GPS-stamped clip + off-fence auto-reject:** clip carries GPS proof, rejected if outside the fence — not implemented (`filming.tsx` GPS badge is decorative).
- **AI signage detection:** ML check that the clip shows the venue signage — not implemented.
- **Video pipeline:** capture → upload → transcode → CDN — not implemented (`filming.tsx` has no real camera; `delivery.tsx` plays a placeholder). Planned: vision-camera + Mux.
- **Payments + payouts:** Seeker charge + Scout payout — mocked in `payment.tsx` and `app/state/scout-earnings.ts`. Planned: Stripe + Stripe Connect Express. The card store deliberately holds only brand + last4.
- **Persistence + auth + push:** no database, no auth server, no push. In-memory stores reset on restart. Planned: Supabase + Expo Push.

---

*Architecture analysis: 2026-06-19*
