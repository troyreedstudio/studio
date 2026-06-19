# Coding Conventions

**Analysis Date:** 2026-06-19

Scope: the LMC app at `lmc-app/`. React Native 0.81.5 + Expo 54 + TypeScript 5.9 (strict), Expo Router file-based routing. There is no ESLint or Prettier config in the repo, so the conventions below are extracted from the actual code, not enforced by tooling. Follow them by hand.

## Naming Patterns

**Route files (kebab-case):**
- Every screen is one file per route, named kebab-case: `home.tsx`, `payment-methods.tsx`, `recurring-setup.tsx`, `welcome-back.tsx`.
- Dynamic routes use bracket syntax: `app/legal/[doc].tsx`.
- Route group folders are parenthesised: `app/(seeker)/`, `app/(scout)/`. Non-grouped feature folders are plain: `app/auth/`, `app/onboarding/`, `app/scout/`, `app/seeker/`, `app/legal/`.

**Components:**
- One default-exported function component per screen file, named PascalCase describing the screen: `export default function ScoutDashboard()` (`app/(scout)/dashboard.tsx`), `export default function RootLayout()` (`app/_layout.tsx`). All 58 `.tsx` files use `export default function`.

**Functions / handlers:**
- Event handlers are `const`-bound arrow functions, camelCase, prefixed `handle`: `handleAccept`, `handleContinue`, `handleApplePay`, `handlePickCity`, `handleCapture` (seen across `app/(scout)/dashboard.tsx`, `app/(seeker)/*`).
- Store/helper functions in `app/state/` and `app/data/` are camelCase verbs: `getSaved`, `savePlace`, `toggleSaved`, `requestUserLocation`, `detectCityByIP`, `getVenuesForMarket`.

**Variables:**
- camelCase for locals and state. Module-level mutable store state is prefixed with underscore: `let _saved`, `let _listeners`, `let _status`, `let _coords` (`app/state/saved.ts`, `app/state/location.ts`).
- Module-level constants are UPPER_SNAKE_CASE: `MARKETS`, `DEFAULT_MARKET_ID`, `MIAMI_CENTER`, `REQUEST_POOL`, `DEMO_BY_MARKET`.

**Types:**
- `type` aliases (not `interface`) in PascalCase, declared at top of file: `type IncomingRequest`, `type SavedPlace`, `type Market`, `type Venue`, `type DemoMarket`.
- String-literal unions for enums-by-convention: `type MarketStatus = 'live' | 'soon' | 'waitlist'`, `type LocationStatus = 'unknown' | 'granted' | 'approx' | 'denied'`, `tier: 'standard' | 'priority'`.

## Code Style

**Formatting (no Prettier, observed house style):**
- 2-space indentation.
- Single quotes for strings and imports.
- Semicolons terminated.
- Trailing commas in multi-line object/array literals.
- Comments are full-sentence, explaining intent and the prototype-vs-production gap (e.g. `// Prototype only — would back this with AsyncStorage + Supabase in production.`).

**Linting:**
- None configured. No `.eslintrc`, `eslint.config.*`, `.prettierrc`, or `biome.json` exists.
- TypeScript `strict: true` (`lmc-app/tsconfig.json` extends `expo/tsconfig.base`) is the only static check. Honour it: no implicit `any`, handle `null`/`undefined` explicitly. The location store uses optional chaining + nullish coalescing for this reason (`place?.city || place?.subregion`).

## Import Organization

Observed order (top of `app/(seeker)/home.tsx`, `app/(scout)/dashboard.tsx`):
1. `react-native` primitives (`View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ...`).
2. Third-party / Expo packages (`@rnmapbox/maps`, `expo-linear-gradient`, `expo-router`, `@expo/vector-icons`).
3. React hooks (`useEffect, useRef, useState` from `react`).
4. Local modules via relative paths (`../data/markets`, `../state/saved`, `../state/location`).

**Path aliases:**
- None. All local imports are relative (`../`). No `@/` alias configured.

**Fonts (special case in `app/_layout.tsx`):**
- Every Google font weight is imported individually and registered once in `useFonts({...})` in the root layout. Add new weights there before using them in a screen.

## Error Handling

- Async store functions are written to **never throw** — they wrap in `try/catch` and return a safe fallback (`null` coords / city). See `cityFromCoords`, `requestUserLocation`, `detectCityByIP` in `app/state/location.ts`. Callers branch on the returned status, not on exceptions.
- Screens guard against missing data with early returns: `if (!request) return;` (`app/(scout)/dashboard.tsx`).
- No global error boundary yet; no toast/error-reporting layer. The `app/(seeker)/error.tsx` screen is a static mock state, not a runtime handler.

## Logging

- No logging framework. No `console.log` left in shipped paths as a pattern. Keep it that way — do not introduce stray `console.log` in screens.

## Comments

**When to comment:**
- File-top block comments explain the module's purpose and call out the prototype boundary (what would change with a real backend). See the headers of `app/state/location.ts`, `app/state/saved.ts`, `app/data/markets.ts`.
- Inline comments explain non-obvious data shape, e.g. `// Mapbox uses [longitude, latitude] order` and `coord: [number, number]; // [lon, lat]`.

**JSDoc/TSDoc:**
- Used selectively on exported store functions and type fields where behaviour is subtle: `/** Best-effort reverse geocode → human city name. Never throws. */`, and field-level docs on `Venue.filmingPolicy` / `Venue.partner` in `app/data/markets.ts`. Not required on every function.

## Copy Rules (user-facing text)

- **No em-dash (—) separators in user-facing copy.** Use commas or clean grammar instead. Compound hyphens like `15-sec`, `6-digit`, `+$5 interior` are fine.
- Note: em-dashes currently appear in **code comments** and in the internal dev screen `app/flow-map.tsx` (a developer map, not shipped UI) — those are acceptable. The rule binds on Seeker/Scout-facing strings only.
- Brand: render the full "Let Me Check" wordmark on splash/welcome; "LMC" is shorthand for inside-app contexts only.

## Function & Module Design

**Function size:** Small and single-purpose. Store modules expose one verb per export (`getSaved`, `savePlace`, `removeSaved`, `toggleSaved`).

**State pattern (the house pattern — reuse it):**
- Shared cross-screen state lives in `app/state/*.ts` as a **module-level in-memory store**, not React Context or a global library. The shape is consistent:
  1. Module-level `let _value` + `let _listeners: (() => void)[]`.
  2. A `notify()` that calls every listener.
  3. Plain getter/setter functions that mutate `_value` then `notify()`.
  4. A `useXxx()` hook that subscribes on mount with `useState(0)` + force-rerender and unsubscribes on unmount.
- Existing stores: `saved.ts`, `location.ts`, `intended-role.ts`, `scout-earnings.ts`, `recurring.ts`, `recents.ts`, `payment-method.ts`. Copy this exact shape for any new shared state.
- All store state is in-memory only (lost on reload) — this is intentional for the prototype. Production would back these with AsyncStorage + Supabase (noted in the file headers).

**Per-screen local state:**
- Within a single screen, use local `useState` / `useRef`. Inter-screen data passes via Expo Router params: `router.push({ pathname: '/(scout)/filming', params: { venue, payout, tier } })` and is read with `useLocalSearchParams`. Numbers are stringified across the param boundary (`payout: String(request.payout)`).

**Mock data placement:**
- Reusable reference data (countries, markets, venues) is centralised in `app/data/markets.ts` with a documented "add a row, no other code changes" pattern.
- Screen-specific demo/mock data lives as UPPER_SNAKE constants at the top of that screen (`REQUEST_POOL` in `dashboard.tsx`, `MIAMI_DEMO`/`NYC_DEMO` in `home.tsx`).

**Exports / barrel files:**
- No barrel (`index.ts`) re-export files. Import directly from the module that owns the symbol.

## Styling Approach

**Per-screen StyleSheet, no theme file:**
- Each screen defines its own `StyleSheet.create({...})` at the bottom of the file (55 of 58 `.tsx` files). There is no shared theme/token module — colours and spacing are inline literals repeated per screen. Extracting tokens is a known backlog item; until then, match the values below exactly.

**Dark theme palette (from `lmc-app/CLAUDE.md` and screen styles):**

```
Background        #000000   black (root contentStyle + per screen)
Card backgrounds  #111111, #0d0d0d, #0d1a0d (green-tinted)
Text primary      #ffffff
Text secondary    #888888
Text tertiary     #555555
Borders/dividers  #1e1e1e, #333333
```

**Colour system (semantic — apply by meaning, not decoration):**

| Colour | Hex | Meaning |
|--------|-----|---------|
| Green | `#22c55e` | action / active / live / money (CTAs, success, online state) |
| Gold / amber | `#f59e0b` | reward / premium / ratings (priority tier, star ratings, payouts) |
| Deep blue | (selected-surface only) | the background of a currently-selected option, not an accent |
| Muted white | `#888888` | section labels |

- **Retire the legacy light-blue accent `#88B4FF`.** It still appears ~6 times (notably in `app/(seeker)/search.tsx`); sweep it to the semantic system when touching those files. Do not add new light-blue accents.

**Layout primitives:**
- `SafeAreaView` (from `react-native-safe-area-context`) wraps screens; `StatusBar style="light"` at root.
- Buttons: rounded 12-16px corners, high contrast, `activeOpacity` 0.7-0.85 on `TouchableOpacity`.
- Cards: dark rounded containers with 1-2px borders.

## Font Usage

Fonts are registered in `app/_layout.tsx` and referenced by exact family-weight string in `fontFamily`. Three families carry the brand; keep usage within them:

| Role | Family | Usage |
|------|--------|-------|
| UI text (default) | **Inter** | Body, labels, buttons. By far the most used: `Inter_700Bold` (~389), `Inter_400Regular` (~152), `Inter_500Medium` (~108), plus `300Light` / `600SemiBold`. |
| Numbers / data | **JetBrains Mono** | Prices, countdowns, stats, monetary figures: `JetBrainsMono_700Bold`, `JetBrainsMono_500Medium`. |
| Logo / wordmark | **Orbitron** | "Let Me Check" mark and brand chrome: `Orbitron_700Bold`, `Orbitron_900Black`, `Orbitron_500Medium`. |

- Other families (Playfair, Cormorant, Cinzel, Manrope, Sora, GFS Didot, etc.) are loaded but used only in the design-exploration lab screens (`brand-lab.tsx`, `font-preview.tsx`, `sound-lab.tsx`). Do not introduce them into production Seeker/Scout screens — stick to Inter / JetBrains Mono / Orbitron.
- Always reference the precise registered weight string; an unregistered weight renders as a fallback.

## File Organization

- `app/` — all routed screens (one file per route) + non-routed `state/` and `data/` folders.
- `app/(seeker)/`, `app/(scout)/` — role-grouped route stacks, each with its own `_layout.tsx`.
- `app/state/` — module-level in-memory stores (shared cross-screen state).
- `app/data/` — centralised reference data (`markets.ts`).
- `app/_layout.tsx` — root Stack, font loading, dark theme.
- `assets/` — icons, splash, media.
- `_archive/` — superseded versions; do not import from here.
- Project rule (studio-wide): never save working files, tests, or docs to the repo root. Keep new code under `app/` (screens/state/data), not at root.

---

*Convention analysis: 2026-06-19*
