# Codebase Structure

**Analysis Date:** 2026-06-19

## Directory Layout

The entire app lives in `lmc-app/`. Routing is file-based (Expo Router): every file under `lmc-app/app/` is a screen, and its path is its route.

```
lmc-app/
├── app/                      # Expo Router root — all screens (route = file path)
│   ├── _layout.tsx           # Root Stack: fonts + Mapbox token + dark theme
│   ├── index.tsx             # "/" boot splash (chrome wordmark) → /how-it-works
│   ├── how-it-works.tsx      # Intro/explainer before role choice
│   ├── welcome.tsx           # Welcome / sign-in entry
│   ├── intro.tsx             # Intro screen
│   ├── chrome-splash.tsx     # Alt splash treatment
│   ├── flow-map.tsx          # Dev: visual map of all flows
│   ├── brand-lab.tsx         # Dev: brand exploration
│   ├── font-preview.tsx      # Dev: font preview
│   ├── sound-lab.tsx         # Dev: sound preview
│   ├── (seeker)/             # ROUTE GROUP — Seeker stack (group hidden from URL)
│   │   ├── _layout.tsx       # Seeker Stack (dark, no headers)
│   │   └── *.tsx             # 20+ Seeker screens (one screen per file)
│   ├── (scout)/              # ROUTE GROUP — Scout stack
│   │   ├── _layout.tsx       # Scout Stack (dark, no headers)
│   │   └── *.tsx             # Scout screens
│   ├── onboarding/           # Onboarding wizard (role, country, city, permissions...)
│   ├── auth/                 # sign-in.tsx, sign-up.tsx (mock auth)
│   ├── scout/                # Scout application flow (become, identity, payout, rules, approved)
│   ├── seeker/               # seeker/rules.tsx (Seeker rules screen)
│   ├── legal/                # legal/[doc].tsx (dynamic: terms/privacy/aup/code)
│   ├── data/                 # markets.ts — centralized mock data + geo helpers
│   └── state/                # In-memory session stores (pub/sub modules)
├── assets/                   # App icons, sounds, splash assets
│   ├── sounds/               # boot-deep.wav etc.
│   └── splash-assets/
├── ios/                      # Native iOS project (prebuilt; Pods, xcworkspace)
├── scripts/                  # Utility scripts
├── _archive/                 # Superseded v1 screens (v1-2026-05-27) — reference only
├── package.json              # Expo 54 / RN 0.81.5 / expo-router ~6 deps
└── CLAUDE.md                 # App-level dev guide
```

## Directory Purposes

**`app/` (Expo Router root):**
- Purpose: Every screen in the app. The folder/file structure defines the navigation tree — there is no separate route config.
- Contains: `_layout.tsx` files (Stack navigators), screen files (`*.tsx`), route groups (`(parens)`), and the non-routing helper folders `data/` and `state/`.
- Key files: `app/_layout.tsx` (root), `app/index.tsx` (boot splash).

**`app/(seeker)/`:**
- Purpose: The Seeker journey + account screens, grouped so the group name never appears in the URL.
- Contains: one screen per file.
- Key files: `app/(seeker)/home.tsx`, `app/(seeker)/venue.tsx`, `app/(seeker)/payment.tsx`, `app/(seeker)/finding.tsx`, `app/(seeker)/waiting.tsx`, `app/(seeker)/delivery.tsx`, `app/(seeker)/confirmed.tsx`, `app/(seeker)/cancelled.tsx`, `app/(seeker)/error.tsx`, `app/(seeker)/history.tsx`, `app/(seeker)/saved.tsx`, `app/(seeker)/search.tsx`, `app/(seeker)/recurring.tsx`, `app/(seeker)/recurring-setup.tsx`, `app/(seeker)/notifications.tsx`, `app/(seeker)/payment-methods.tsx`, `app/(seeker)/preferred-cities.tsx`, `app/(seeker)/membership.tsx`, `app/(seeker)/invite.tsx`, `app/(seeker)/report.tsx`, `app/(seeker)/help.tsx`, `app/(seeker)/profile.tsx`.

**`app/(scout)/`:**
- Purpose: The Scout job loop + earnings.
- Contains: one screen per file.
- Key files: `app/(scout)/dashboard.tsx`, `app/(scout)/filming.tsx`, `app/(scout)/submitted.tsx`, `app/(scout)/earnings.tsx`, `app/(scout)/withdraw.tsx`, `app/(scout)/profile.tsx`.

**`app/onboarding/`:**
- Purpose: The first-run wizard between auth and entering a role stack.
- Key files: `app/onboarding/role.tsx` (Seeker/Scout/Both picker), `app/onboarding/personal-info.tsx`, `app/onboarding/country.tsx`, `app/onboarding/city.tsx`, `app/onboarding/permissions.tsx`, `app/onboarding/quick-finish.tsx`, `app/onboarding/payment-checkout.tsx`, `app/onboarding/both-fork.tsx` (Y-fork for Both users), `app/onboarding/welcome-back.tsx` (returning-user role picker).

**`app/auth/`:**
- Purpose: Mock sign-in / sign-up UI.
- Key files: `app/auth/sign-in.tsx`, `app/auth/sign-up.tsx`.

**`app/scout/` (note: NOT the `(scout)` group):**
- Purpose: The Scout *application/onboarding* flow (becoming a Scout), distinct from the in-app Scout stack.
- Key files: `app/scout/become.tsx`, `app/scout/identity.tsx`, `app/scout/payout.tsx`, `app/scout/rules.tsx`, `app/scout/approved.tsx`.

**`app/seeker/`:**
- Purpose: Seeker rules screen shown during onboarding.
- Key files: `app/seeker/rules.tsx`.

**`app/legal/`:**
- Purpose: Legal documents via one dynamic route.
- Key files: `app/legal/[doc].tsx` — `[doc]` is a route param resolving to `terms | privacy | aup | code`.

**`app/data/`:**
- Purpose: Centralized typed mock data + pure geo helpers. NOT a route (no default-exported component).
- Key files: `app/data/markets.ts`.

**`app/state/`:**
- Purpose: Module-level in-memory session stores (pub/sub). NOT routes.
- Key files: `app/state/intended-role.ts`, `app/state/location.ts`, `app/state/payment-method.ts`, `app/state/recents.ts`, `app/state/saved.ts`, `app/state/recurring.ts`, `app/state/scout-earnings.ts`.

## Key File Locations

**Entry Points:**
- `app/_layout.tsx`: Root Stack navigator — fonts, Mapbox token, dark theme.
- `app/index.tsx`: `/` boot splash, auto-advances to `/how-it-works`.

**Configuration:**
- `package.json`: Expo 54 / React Native 0.81.5 / expo-router ~6.0.23 / TypeScript. No test/lint/build scripts configured.
- `app.json` / `app.config.*` (repo root of `lmc-app/`): Expo app config.
- `EXPO_PUBLIC_MAPBOX_TOKEN`: env var read in `app/_layout.tsx` (referenced by name only; value lives in `.env`, never commit).

**Core Logic:**
- `app/data/markets.ts`: all venue/market/country data + `searchInMarket`, `nearestLiveMarket`, `getVenueFilmingPolicy`, `distanceKm`.
- `app/state/*.ts`: cross-screen session state.

**Testing:**
- None. No test runner, no test files, no `__tests__/`.

## Naming Conventions

**Files:**
- Screens: lowercase-kebab `.tsx`, one screen per file (`payment-methods.tsx`, `recurring-setup.tsx`).
- Layouts: `_layout.tsx` (leading underscore = Expo Router special file, not a route).
- Dynamic routes: square brackets — `legal/[doc].tsx` (`[doc]` becomes a param).
- Non-route helpers: `data/*.ts` and `state/*.ts` are `.ts` (no JSX, no default-export component) so Expo Router does not treat them as screens.

**Directories:**
- Route groups: `(parens)` — `(seeker)`, `(scout)`. The name is hidden from the URL but groups screens under one `_layout.tsx`.
- Feature folders: lowercase plain — `onboarding/`, `auth/`, `scout/`, `seeker/`, `legal/`.

**Components / code inside files:**
- Default-exported screen component is PascalCase (`HomeScreen`, `BootSplash`, `SeekerLayout`).
- Store exports: `getX()` / mutators / `useX()` hook; types PascalCase (`SavedCard`, `RecurringCheck`, `LocationStatus`).
- Coordinates are always `[lon, lat]` (Mapbox order) — keep this consistent.

## Where to Add New Code

**New Seeker screen:**
- Create `app/(seeker)/your-screen.tsx` with a default-exported PascalCase component. It is reachable at `/(seeker)/your-screen`. Navigate to it with `router.push('/(seeker)/your-screen')`.

**New Scout screen:**
- Create `app/(scout)/your-screen.tsx`. Reachable at `/(scout)/your-screen`.

**New onboarding / auth / legal step:**
- Add the file to the matching folder (`app/onboarding/`, `app/auth/`, `app/legal/`). Legal docs can extend the `[doc]` map inside `app/legal/[doc].tsx` rather than adding a file.

**New mock data (city, venue, country):**
- Edit `app/data/markets.ts` only — add a row to `COUNTRIES`, `MARKETS`, or `VENUES` with a matching `marketId`. No other code changes needed (the file's header documents this).

**New cross-screen shared state:**
- Add a `.ts` module to `app/state/` following the existing pub/sub pattern: private module var(s), `_listeners` array, `notify()`, getters, mutators that call `notify()`, and a `useX()` hook. Keep it `.ts` (no JSX) so Expo Router ignores it. Document the production replacement in the file header (the convention here).

**Shared utilities / helpers:**
- Pure helpers that belong with data go in `app/data/markets.ts` (e.g. `distanceKm`). There is no general `app/lib/` or `app/utils/` yet — create one only if a helper does not belong to data or state.

## Special Directories

**`app/(seeker)/` and `app/(scout)/`:**
- Purpose: Role-based route groups; the parens hide the segment from the URL.
- Generated: No. Committed: Yes.

**`app/data/`, `app/state/`:**
- Purpose: Non-route TypeScript modules co-located under `app/` for import convenience.
- Generated: No. Committed: Yes.

**`ios/`:**
- Purpose: Native iOS project from Expo prebuild (Pods, xcworkspace, build output).
- Generated: Yes (prebuild). Committed: partially (build artifacts under `ios/build/` should not be).

**`_archive/v1-2026-05-27/`:**
- Purpose: Superseded v1 screens kept for reference.
- Generated: No. Committed: Yes. Do not edit — reference only.

**`assets/`:**
- Purpose: App icons, splash assets, and sounds (`assets/sounds/boot-deep.wav` is the boot chime used by `app/index.tsx`).
- Generated: No. Committed: Yes.

---

*Structure analysis: 2026-06-19*
