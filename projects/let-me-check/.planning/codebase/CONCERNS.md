# Codebase Concerns

**Analysis Date:** 2026-06-19

> **Framing:** Let Me Check (`lmc-app/`) is a polished React Native + Expo + TypeScript
> **UI prototype running entirely on mock data**. Almost nothing here is a "bug" in the
> traditional sense — the concerns below describe **what must be built or hardened to ship
> to production**. The upcoming build replaces mocks with real systems (Supabase, Stripe,
> camera, geo, push, the verification moat). Each concern maps to the build wave that should
> address it, per `docs/STACK.md` and the Build Order in the project `CLAUDE.md`.

---

## Tech Debt

### No backend — the entire app is a client-side simulation
- Issue: There is no API layer, database, or server. Every flow (browse, request, pay,
  wait, deliver, accept, film, earn) is faked in-component with local state and timers.
  Auth screens (`lmc-app/app/auth/sign-in.tsx`, `lmc-app/app/auth/sign-up.tsx`) just
  `router.push`/`router.replace` to the next screen — no credential check, no session,
  no token. The "countdown to delivery" in `lmc-app/app/(seeker)/waiting.tsx` is a
  `setInterval`, not a real dispatch lifecycle.
- Files: all of `lmc-app/app/` — notably `lmc-app/app/auth/`, `lmc-app/app/(seeker)/`,
  `lmc-app/app/(scout)/`, `lmc-app/app/onboarding/`.
- Impact: The app cannot do anything real. No two users can interact. Nothing persists.
  This is the core production gap, not a side issue.
- Fix approach: **Build Wave 1** — Supabase backend + auth shell (Sign in with
  Apple/Google + SMS OTP). Introduce a real API/data layer and global state (Zustand/Jotai)
  to replace component-local mocks. Everything else depends on this landing first.

### All data is hard-coded mock data in components
- Issue: Venues, markets, Scouts, earnings, voice-search results, and history are static
  literals. The largest data file is `lmc-app/app/data/markets.ts` (~607 lines of
  countries/cities/venues). Search uses `VOICE_MOCKS` / `PLACEHOLDER_HINTS` arrays in
  `lmc-app/app/(seeker)/search.tsx`. Voice capture is a `setTimeout` that fills the input
  with a random canned query (`startVoiceMock` in `lmc-app/app/(seeker)/home.tsx`).
- Files: `lmc-app/app/data/markets.ts`, `lmc-app/app/(seeker)/search.tsx`,
  `lmc-app/app/(seeker)/home.tsx`, `lmc-app/app/(scout)/dashboard.tsx`,
  `lmc-app/app/(scout)/earnings.tsx`.
- Impact: Content can only change by editing code and rebuilding. No venue onboarding,
  no live Scout availability, no real search.
- Fix approach: **Wave 1–2** — replace literals with API reads. Keep `markets.ts` as a
  seed-data shape reference for the backend schema, then retire it as a runtime source.

### State is ephemeral in-memory module stores — nothing survives a reload
- Issue: The "stores" in `lmc-app/app/state/*.ts` are plain module-level `let` variables
  with a hand-rolled listener/`notify()` pattern (e.g. `let _recents = []` in
  `lmc-app/app/state/recents.ts`, `let _saved = []` in `lmc-app/app/state/saved.ts`,
  location coords in `lmc-app/app/state/location.ts`). There is **no AsyncStorage,
  SecureStore, or backend persistence** — the only `AsyncStorage` mentions in the tree
  are aspirational comments ("would back this with AsyncStorage + Supabase in production").
- Files: `lmc-app/app/state/recents.ts`, `lmc-app/app/state/saved.ts`,
  `lmc-app/app/state/recurring.ts`, `lmc-app/app/state/location.ts`,
  `lmc-app/app/state/payment-method.ts`, `lmc-app/app/state/intended-role.ts`,
  `lmc-app/app/state/scout-earnings.ts`.
- Impact: Saved places, recent checks, chosen role, payment method, and detected location
  all reset to empty on every app restart. The dual-role "welcome back" experience can't
  truly remember the user.
- Fix approach: **Wave 1** — move durable state to the backend (user profile, saved
  places, history) and use SecureStore for the auth session/token. Local caches can use
  AsyncStorage. The module-store pattern is fine as an in-session view layer, but must
  read from a persistent source.

### Very large screen files mixing UI, data, and faux-logic
- Issue: Several screens are 600–1700 lines with inline `StyleSheet`, mock data, and
  simulated logic all in one file: `lmc-app/app/(seeker)/home.tsx` (~1705 lines),
  `lmc-app/app/(scout)/filming.tsx` (~1248), `lmc-app/app/(seeker)/payment.tsx` (~949),
  `lmc-app/app/(seeker)/waiting.tsx` (~853), `lmc-app/app/auth/sign-up.tsx` (~831).
- Files: as above.
- Impact: Hard to test, hard to wire to real services cleanly, easy to introduce
  regressions when mocks are swapped for APIs.
- Fix approach: As each screen is wired to real data (Wave 1–3), split out data hooks,
  extract shared style tokens (the design-system extraction is already a known backlog
  item), and keep screen files under the studio's 500-line guideline.

### No design-token file — colours duplicated inline across every screen
- Issue: The dark theme (`#000`, `#22c55e`, `#f59e0b`, text greys, borders) is repeated
  in each screen's `StyleSheet.create()`. There is no central theme module.
- Files: every screen under `lmc-app/app/`.
- Impact: Colour drift and inconsistent accents (the studio memory already flags a
  retired light-blue `#88B4FF` accent that still needs sweeping out of `search.tsx`).
- Fix approach: Extract a tokens/theme module early in **Wave 1** before the codebase
  grows further; sweep remaining off-palette colours.

---

## Security Considerations

### No authentication or authorization anywhere
- Risk: Anyone reaching any screen has full "access" because there is no identity. There
  is no concept of a logged-in user, no session, no role enforcement (the Seeker/Scout
  split is purely navigational).
- Files: `lmc-app/app/auth/sign-in.tsx`, `lmc-app/app/auth/sign-up.tsx`,
  `lmc-app/app/onboarding/`.
- Current mitigation: None — it's a prototype.
- Recommendations: **Wave 1** — Sign in with Apple/Google + SMS OTP via Supabase Auth;
  store the session token in Expo SecureStore (never AsyncStorage); enforce role on the
  server, not just the client route group.

### Payment card fields are raw text inputs with no processor
- Risk: `lmc-app/app/(seeker)/payment.tsx` renders card-number / expiry / CVC text inputs
  as a mockup. If this UI were shipped as-is and ever wired to a naive backend, it would
  put the app in scope for handling raw PAN data (a PCI compliance and liability problem).
- Files: `lmc-app/app/(seeker)/payment.tsx`.
- Current mitigation: It's non-functional (no Stripe SDK installed).
- Recommendations: **Wave 3** — never collect raw card numbers in-app. Use the Stripe
  React Native SDK / PaymentSheet so card data tokenizes on-device and never touches your
  servers. Use Stripe Connect Express for Scout payouts.

### IP-geolocation call to a third-party endpoint with no validation/rate-limit
- Risk: `detectCityByIP()` in `lmc-app/app/state/location.ts` fetches `https://ipwho.is/`
  and trusts the JSON response shape directly. Acceptable for a prototype fallback, but
  it's an unauthenticated third-party dependency in the trust path, and a VPN trivially
  spoofs it.
- Files: `lmc-app/app/state/location.ts`.
- Current mitigation: Wrapped in try/catch, returns null on failure (degrades gracefully).
- Recommendations: **Wave 2** — do location resolution server-side and return nearby
  Scouts/venues from the backend rather than trusting client-reported location, which is
  also a prerequisite for the geofence moat (below).

### Secrets handling — Mapbox tokens via env, blank-maps-on-TestFlight pitfall
- Risk: A `lmc-app/.env` file exists and holds Mapbox tokens (referenced by **name only**:
  the runtime token `EXPO_PUBLIC_MAPBOX_TOKEN` and the build-time
  `MAPBOX_DOWNLOAD_TOKEN`). `lmc-app/.env` is correctly covered by
  `lmc-app/.gitignore` (`.env`, `.env.*`). The runtime token is read in
  `lmc-app/app/_layout.tsx` via `Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? null)`,
  and the download token is consumed in `lmc-app/app.config.js`
  (`RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN`). `lmc-app/eas.json`
  defines no env block — so for cloud builds the tokens **must** be wired as EAS
  environment variables/secrets in the Expo dashboard, not just present in the local
  `.env`.
- Files: `lmc-app/.env` (gitignored, contents not read), `lmc-app/app/_layout.tsx`,
  `lmc-app/app.config.js`, `lmc-app/eas.json`.
- Known pitfall (now fixed): maps rendered **blank on TestFlight** because the runtime
  Mapbox token was present locally but not injected into the EAS production build, so
  `EXPO_PUBLIC_MAPBOX_TOKEN` resolved to null in the shipped binary. Resolution: register
  the token as an EAS env var so it's baked into cloud builds. Keep this in mind for every
  future env-driven value.
- Recommendations: Treat **every** runtime secret as "must be set in EAS env, not just
  `.env`." Note `lmc-app/eas.json` also references an App Store Connect API key path
  (`ascApiKeyPath` → a local `.p8` outside the repo) — keep that key off the repo (it is)
  and rotate if ever exposed. Run a secret scan before each release.

---

## Fragile Areas

### The simulated dispatch/timer flows assume the happy path
- Files: `lmc-app/app/(seeker)/waiting.tsx`, `lmc-app/app/(scout)/filming.tsx`,
  `lmc-app/app/(scout)/dashboard.tsx`.
- Why fragile: Countdowns and "Scout accepted / filming / delivered" transitions are
  `setInterval`-driven scripts, not state machines reacting to real events. There is no
  handling for: no Scout available, Scout cancels, payment fails, upload fails, timeout,
  or app backgrounding mid-flow.
- Safe modification: When wiring real-time (Supabase Realtime / push), model the request
  lifecycle as an explicit state machine with failure states before deleting the timer
  mocks, so the UI has somewhere to go when the real world misbehaves.
- Test coverage: None (see below).

### In-memory store listener pattern leaks if misused
- Files: `lmc-app/app/state/*.ts`.
- Why fragile: Each store pushes/filters a global `_listeners` array in `useEffect`.
  It's correct today, but it's hand-rolled and unmemoized; as more screens subscribe and
  the data grows, this re-renders broadly and is easy to get subtly wrong.
- Safe modification: Replace with a real store library (Zustand/Jotai) when global state
  lands in Wave 1, rather than extending the bespoke pattern.

---

## Missing Critical Features

### The 6-layer verification "moat" is entirely UNBUILT
- Problem: The competitive moat described in the project `CLAUDE.md` and
  `docs/STACK.md` does not exist in code. Specifically:
  1. **30–50m GPS geofence** around the venue — not implemented.
  2. **Only Scouts inside the fence get pinged** — dispatch is mocked; no geo query.
  3. **Reference-photo confirmation before filming** — no photo step.
  4. **GPS-stamped clip + off-fence auto-reject** — no real clip, no stamp, no check.
  5. **AI signage detection on the clip** — no ML, no clip.
  6. **20-minute Scout cooldown per venue** — no cooldown enforcement.
- Files: `lmc-app/app/(scout)/filming.tsx` shows a **static** "GPS Verified — you're at
  the right place" pill and a "VERIFYING GPS + SIGNAGE" label that are pure UI; there is
  no `expo-camera`/vision-camera dependency in `lmc-app/package.json`, so filming itself
  is simulated with timers. `expo-location` is installed and used only for the onboarding
  city step in `lmc-app/app/state/location.ts`.
- Blocks: This IS the product's trust guarantee. Without it, a "check" can't be proven
  real, which is the whole value proposition.
- Fix approach: **Wave 2 (geo/dispatch core)** for layers 1–2 (PostGIS + H3 + Mapbox,
  server-side geo query). **Wave 3 (video + payments)** to add the real camera and clip
  pipeline (vision-camera + Mux). **Wave 4 (verification stack)** for photo confirm, GPS
  stamping, signage AI, cooldown, and rating end-to-end.

### No real camera / video pipeline
- Problem: Recording is faked. No `expo-camera` or `react-native-vision-camera` dependency;
  `lmc-app/app/(scout)/filming.tsx` toggles a `recording` boolean and counts seconds.
  `expo-video` is installed but used for playback placeholders (e.g. the trailer frame in
  `lmc-app/app/how-it-works.tsx`).
- Blocks: Scouts can't actually film; Seekers can't actually watch a real delivered clip.
- Fix approach: **Wave 3** — vision-camera for capture, Mux for upload/transcode/CDN.

### No push notifications
- Problem: No `expo-notifications`/Expo Push integration. Request-accepted and
  delivery-ready events are in-app only.
- Blocks: The 7–10 minute "your check is ready" moment can't reach a backgrounded user.
- Fix approach: **Wave 1–3** — Expo Push wired to the dispatch lifecycle.

---

## Test Coverage Gaps

### Zero automated tests and no lint/build scripts
- What's not tested: Everything. There are **no** `*.test.*` / `*.spec.*` files anywhere
  in `lmc-app/`, and `lmc-app/package.json` defines only `start` / `ios` / `android` /
  `web` — **no `test`, `lint`, `typecheck`, or `build` scripts**. (The app-level
  `lmc-app/CLAUDE.md` explicitly notes "No test, lint, or build scripts are configured yet.")
  TypeScript strict mode is the only safety net, and even `tsc --noEmit` isn't wired as a
  script.
- Files: `lmc-app/package.json` (scripts block), absence of any test directory.
- Risk: Once real money, payouts, and the verification moat land, untested logic can fail
  silently and cost real cash or deliver fraudulent checks.
- Priority: **Medium now (prototype), High the moment Wave 1 backend logic lands.**
- Fix approach: Add `lint` (ESLint), `typecheck` (`tsc --noEmit`), and `test`
  (Jest + React Native Testing Library) scripts during Wave 1. Per the studio's TDD
  preference, write tests alongside the backend/dispatch/payment logic, not after.

---

## Repo Housekeeping / Cruft

### Tooling artifacts in the working tree that should be gitignored
- Issue: RuFlo/agent tooling and scan artifacts have appeared at the project root and the
  studio root and show as untracked in `git status`:
  - `.claude-flow/` (and nested copies, e.g. `lmc-app/.claude-flow/`,
    `lmc-app/app/.claude-flow/`)
  - `.swarm/`
  - `.mcp.json`
  - `ruvector.db` (~1.5 MB binary vector DB)
  - `SECURITY_ANALYSIS.json`, `SECURITY_AUDIT.json` (scan output, **not read** here —
    may contain sensitive findings; keep out of git)
  - stray `-oldCLAUDE.md` at the studio root
- Files: project root `/Users/troyreed/studio/projects/let-me-check/` and studio root
  `/Users/troyreed/studio/`. Note: **the studio repo root currently has no `.gitignore`**,
  which is why this cruft is surfacing as untracked everywhere.
- Impact: Risk of committing large binaries and scan output into the monorepo; noisy
  `git status`; potential to accidentally commit a `SECURITY_*.json` that contains
  findings or paths you'd rather not publish.
- Fix approach: Add a `.gitignore` at the **studio repo root** covering `.claude-flow/`,
  `.swarm/`, `.mcp.json`, `*.db`/`ruvector.db`, `SECURITY_*.json`, and `.claude/` working
  dirs. Confirm `lmc-app/.gitignore` already correctly excludes `.env*`, `*.jks`, `*.p8`,
  `*.p12`, `*.key`, `*.pem` (it does). This is housekeeping, not a build wave — do it
  before the next commit.

---

*Concerns audit: 2026-06-19*
