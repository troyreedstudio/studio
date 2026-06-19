# Testing Patterns

**Analysis Date:** 2026-06-19

## Honest Summary: No Automated Test Suite

**There is no automated testing in `lmc-app/` today.** This is a known gap, not an oversight to work around silently. Specifically:

- No test runner installed. `package.json` `devDependencies` contains only `@types/react` and `typescript` — no Jest, Vitest, `jest-expo`, or `@testing-library/react-native`.
- No `test` script. `package.json` `scripts` are only `start`, `android`, `ios`, `web`. There is no `test`, `lint`, or `build` script.
- No test files. A search for `*.test.*` / `*.spec.*` under `lmc-app/` (excluding `node_modules`) returns nothing.
- No test config. No `jest.config.*`, `vitest.config.*`, `.eslintrc*`, or `.prettierrc*` in the repo.

`lmc-app/CLAUDE.md` states this directly: *"No test, lint, or build scripts are configured yet."* Treat that as accurate.

## De-facto Quality Gate: TypeScript

The only automated correctness check available is the TypeScript compiler in strict mode.

**Run it:**
```bash
cd lmc-app
npx tsc --noEmit        # type-check the whole app, no output files
```

- `tsconfig.json` extends `expo/tsconfig.base` with `"strict": true`.
- This catches type errors, null/undefined misuse, bad route params, and wrong store signatures — but it does **not** test runtime behaviour, navigation flows, timers, or UI.
- Make `npx tsc --noEmit` clean before considering any change done. It is the closest thing to CI the project has.

## How the App Is Actually Verified Today

All verification is **manual**:

1. **Expo dev server + simulator/device.**
   ```bash
   cd lmc-app
   npm start          # Expo dev server (interactive)
   npm run ios        # iOS simulator
   npm run android    # Android emulator
   npm run web        # browser
   ```
   Walk the Seeker flow (Splash -> Home -> Venue -> Payment -> Waiting -> Delivery) and the Scout flow (Dashboard -> Filming -> Submitted -> Earnings) by hand.

2. **TestFlight builds** for on-device QA. The app ships to TestFlight via EAS:
   ```bash
   eas build -p ios --profile production --auto-submit
   ```
   (`eas.json` / `app.config.js` hold the EAS config. Apple, Expo, and GitHub are three separate logins — pushing to GitHub does not produce a TestFlight build.)

Because all data is mock and stores are in-memory (`app/state/*.ts`), state resets on reload — manual testing always starts from a clean slate, which is convenient but means there are no persisted-state regressions to catch.

## Test Framework

- **Runner:** None installed.
- **Assertion library:** None.
- **Coverage:** None enforced, none measurable.

## What a Future Test Setup Should Cover (build-phase gap)

When the backend phase begins, this is where automated tests would pay off most. Recorded here so the build phase can prioritise it:

**Unit-testable now (pure logic, no UI):**
- `app/state/saved.ts` — `savePlace` / `removeSaved` / `toggleSaved` / `isSaved` dedupe and ordering.
- `app/state/location.ts` — the resolution ladder (GPS -> IP -> manual), `cityFromCoords` fallback chain, and the never-throws contract. `detectCityByIP` hits `https://ipwho.is/` and should be tested with a mocked `fetch`.
- `app/state/scout-earnings.ts`, `recurring.ts`, `recents.ts`, `payment-method.ts`, `intended-role.ts` — the shared store/listener pattern.
- `app/data/markets.ts` — `getMarketById`, `getVenuesForMarket`, `searchInMarket`, `nearestLiveMarket`, `getVenueByName`, filming-policy resolution.

**Flow/UI tests (need a renderer):**
- Seeker happy path and Scout happy path navigation.
- Timer/countdown logic in `app/(seeker)/waiting.tsx` and `app/(scout)/filming.tsx`.
- Route-param round-trips (numbers stringified across `router.push` params, e.g. `payout: String(...)`).

**Suggested stack when added:** `jest-expo` preset + `@testing-library/react-native` for components, plain Jest for the `state/` and `data/` modules. Add a `test` script to `package.json` and wire `npx tsc --noEmit` + tests into CI at the same time. None of this exists yet.

## Mocking, Fixtures, Coverage

- **Mocking:** Not applicable (no test framework). The closest analogue in the codebase is the embedded mock data itself — `REQUEST_POOL` (`app/(scout)/dashboard.tsx`), `MIAMI_DEMO`/`NYC_DEMO` (`app/(seeker)/home.tsx`), and `app/data/markets.ts`. These would become fixtures for future tests.
- **Fixtures/factories:** None as test artifacts. Reference data in `app/data/markets.ts` is the de-facto fixture source.
- **Coverage:** Not measured.

---

*Testing analysis: 2026-06-19*
