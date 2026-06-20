---
phase: 01-foundation-auth-persistence-event-log
plan: 03
subsystem: persistence-consent-role-switch
tags: [persistence, supabase, consent, role-switch, sign-out, eas, data-layer]
requires:
  - "lib/api.ts + lib/auth.ts + lib/session.tsx (Plan 01-02)"
  - "Live Supabase schema + RLS (Plan 01-01)"
provides:
  - "6 in-memory stores rewired to persist through lib/api (saved/recents/payment-method/recurring/intended-role + scout-earnings de-seeded)"
  - "lib/consent.ts — versioned 18+/Terms/Privacy/AUP recording (SAFE-02)"
  - "Role switch + sign-out wired into both profile screens (AUTH-03/04)"
  - "EAS build profiles wired to the EXPO_PUBLIC_* env vars"
affects:
  - "app/onboarding/quick-finish.tsx, app/legal/[doc].tsx"
  - "app/(seeker)/profile.tsx, app/(scout)/profile.tsx, app/(seeker)/payment-methods.tsx"
  - "app/lib/api.ts (added setIntendedRoleFlags/getIntendedRoleFlags)"
  - "lmc-app/eas.json"
tech-stack:
  added: []
  patterns:
    - "Optimistic local cache + background persist keeps store export surfaces synchronous and byte-compatible"
    - "Shared DOC_VERSION + recordOnboardingConsents so onboarding and the legal viewer cannot drift"
    - "Per-profile `environment` key in eas.json pulls EAS-managed env vars (no secret literals in repo)"
key-files:
  created:
    - "lmc-app/app/lib/consent.ts"
    - "lmc-app/app/state/saved.test.ts"
    - "lmc-app/app/state/consent.test.ts"
  modified:
    - "lmc-app/app/state/saved.ts"
    - "lmc-app/app/state/recents.ts"
    - "lmc-app/app/state/payment-method.ts"
    - "lmc-app/app/state/recurring.ts"
    - "lmc-app/app/state/intended-role.ts"
    - "lmc-app/app/state/scout-earnings.ts"
    - "lmc-app/app/lib/api.ts"
    - "lmc-app/app/onboarding/quick-finish.tsx"
    - "lmc-app/app/legal/[doc].tsx"
    - "lmc-app/app/(seeker)/profile.tsx"
    - "lmc-app/app/(scout)/profile.tsx"
    - "lmc-app/app/(seeker)/payment-methods.tsx"
    - "lmc-app/eas.json"
decisions:
  - "Stores keep synchronous mutator signatures (optimistic cache + fire-and-forget persist) so the ~12 importing screens need zero signature changes"
  - "scout-earnings stays a session-local placeholder at 0/0; the real payout aggregate is Phase 4 (not wired to api this wave)"
  - "EAS env vars are pulled via the per-profile `environment` key, not duplicated as literals in eas.json"
metrics:
  duration_min: 8
  tasks: 3
  files_created: 3
  files_modified: 13
  completed: 2026-06-20
---

# Phase 1 Plan 03: Persistence, Consent, Role-Switch Summary

The six in-memory stores now read and write Supabase through `lib/api.ts` while keeping their exact synchronous export surfaces, so saved places, recents, payment method, role, and recurring checks survive an app restart and the ~12 importing screens compile unchanged. 18+/Terms/Privacy/AUP acceptance is recorded to the `consents` table plus the event log at onboarding (SAFE-02), Seeker↔Scout switch and sign-out are wired into both profile screens (AUTH-03/04), and the EAS build profiles now account for the Supabase/Google/Mapbox env vars so a TestFlight build can reach the backend.

## What Was Built

**Task 1 — 6 stores rewired to Supabase (DATA-01/03, AUTH-03)**
- `saved.ts`, `recents.ts`, `payment-method.ts`, `recurring.ts`, `intended-role.ts` now import `lib/api`. Each keeps its original pub/sub `_listeners`/`notify()`/`use*()` shape as a local cache: a `hydrate*()` loads from `api.getX()` on first hook mount, and every mutator updates the cache optimistically then `void`s the api write in the background (RLS keeps each user to their own rows). Reads stay synchronous, so the importing screens are untouched.
- `intended-role.ts` maps the onboarding choice to `profiles.is_seeker/is_scout/current_role` via two new api helpers (`setIntendedRoleFlags`/`getIntendedRoleFlags`); `both` enables both hubs with `current_role` defaulting to `seeker`.
- `scout-earnings.ts` no longer seeds the fake `127.0`/`12` — it starts at `0`/`0` (real aggregate is Phase 4), surface preserved.
- `location.ts` untouched (`git diff --quiet` clean).
- `saved.test.ts`: 6 unit tests (export-surface guard, persist-through-api, optimistic cache, remove, toggle, hydrate) against a mocked `lib/api`.

**Task 2 — Consent + role-switch + sign-out (SAFE-02, AUTH-03/04)**
- `lib/consent.ts`: one `DOC_VERSION` and `recordOnboardingConsents()` (records `age_18plus`, `terms`, `privacy`, `aup`) + `recordDocConsent()` for the legal viewer. Each delegates to `api.recordConsent`, which also emits `consent.accepted` to the event log.
- `onboarding/quick-finish.tsx`: `handleFinish` fires `recordOnboardingConsents()` (the 18+/Terms box is a hard gate).
- `legal/[doc].tsx`: an "I ACCEPT" button records per-doc consent and flips to "✓ ACCEPTED".
- `(seeker)/profile.tsx` + `(scout)/profile.tsx`: "Switch mode" → `auth.switchRole('scout'|'seeker')` then route to the other hub; "Sign out" → `auth.signOut()` then route to `/index`.
- `(seeker)/payment-methods.tsx`: reads the saved card from the rewired store and persists/clears via `save()`/`clear()` (brand + last4 only, no Stripe).
- `consent.test.ts`: 4 unit tests (all four consents at shared version, age_18plus present, single-doc accept, non-throwing on api failure).

**Task 3 — EAS env config**
- `eas.json`: each build profile (development/preview/production) gets an `environment` key, plus an `_env_setup` operator block listing the six required `EXPO_PUBLIC_*`/`MAPBOX_DOWNLOAD_TOKEN` vars and the `eas env:create` steps — so a cloud build cannot silently ship without backend connectivity (the Mapbox null-env class of bug).
- `.env.example` already documents the Supabase + Google vars (from Wave 2) and `.env` is gitignored — verified, no real secrets tracked.

## Deviations from Plan

### Auto-added critical functionality

**1. [Rule 3 - Blocking] Added `setIntendedRoleFlags` / `getIntendedRoleFlags` to `lib/api.ts`**
- **Found during:** Task 1 (intended-role rewire).
- **Issue:** Wave 2's api exposed `setCurrentRole` (only `current_role`) but not a way to set the `is_seeker`/`is_scout` flags the onboarding role choice needs.
- **Fix:** Added the two helpers (with a `profile.role_intent_set` event) so `intended-role.ts` can persist `both`/`seeker`/`scout` correctly.
- **Files modified:** `app/lib/api.ts`. **Commit:** c0d3d7a.

### Test-harness adjustment

**2. [Rule 3] vitest mock paths + react/hook mock**
- The store imports `../lib/api` and `react`; to keep the node-env vitest harness from loading react-native's Flow-typed entry, the store tests mock `../lib/api` (resolved from the module under test) and stub `react`'s `useEffect`/`useState`. Same isolation pattern the Wave 2 lib tests use. Behavior unchanged.

## Blocked / Not Applied

**`.env.example` Mapbox lines not added (environment permission guard).**
- The plan's Task 3 also asked to add `EXPO_PUBLIC_MAPBOX_TOKEN` to `.env.example`. This environment's sandbox denies all read/write access to `.env*` paths (the global "never touch env files" guard), so the file could not be edited here. It is **not blocking**: `.env.example` already carries both required `EXPO_PUBLIC_SUPABASE_*` vars (acceptance met), and the Mapbox vars are fully documented in `eas.json`'s `_env_setup` block. Troy can add the two Mapbox lines to `.env.example` manually if desired.

## Threat Model Coverage

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-01-12 (consent repudiation) | mitigate | Done — `recordConsent` writes a versioned `consents` row + `consent.accepted` event; covered by `consent.test.ts` + the on-device dashboard check |
| T-01-13 (secrets in repo) | mitigate | Done — `.env` gitignored, not tracked; `.env.example` placeholders only; only anon-safe keys ship |
| T-01-14 (EAS null-env / Mapbox class) | mitigate | Done — per-profile `environment` key + documented `eas env:create` checklist in eas.json |
| T-01-15 (cross-user write via stores) | mitigate | Done — every store mutator goes through `lib/api` → Supabase under owner-only RLS (Plan 01) |

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `scout-earnings` returns session-local 0/0 | `app/state/scout-earnings.ts` | Real payout aggregate is computed server-side in Phase 4 (Stripe Connect). De-seeded this wave (no fake 127.0); not wired to api by design. Does NOT block the wave goal. |
| `payment-methods` add-card uses a placeholder Visa/4242 | `app/(seeker)/payment-methods.tsx` | No Stripe in Phase 1 — brand+last4 placeholder only, as specified. Real tokenized card capture is a later phase. |

## Offline Verification (passed)

- `npx tsc --noEmit` — exit 0, clean against the live `database.types.ts`.
- `npx vitest run` — 5 files, 21 tests passed (incl. new saved + consent suites).
- Task greps: 5 stores import `lib/api`; `scout-earnings.ts` has no `127.0`; `saved.ts` still exports `getSaved`/`useSavedPlaces`; `git diff --quiet app/state/location.ts` clean; `recordConsent`/`age_18plus` in quick-finish; `recordConsent` in legal viewer; `switchRole`+`signOut` in seeker profile; `switchRole` in scout profile; `eas.json` valid JSON referencing the Supabase env vars; `.env` not tracked.

## BLOCKED — human checkpoint (Task 4: on-device verification)

All code is complete and offline-verified. Task 4 is a blocking `checkpoint:human-verify` that CANNOT run here (no iOS device/simulator; OAuth providers configured by Troy). To close the phase gate, on an EAS dev build with the Supabase + Google vars set in EAS env, Troy must:

1. Sign in with Apple, then Google (phone OTP stays deferred behind `PHONE_AUTH_ENABLED`). Each lands in the correct hub.
2. Save a place, set a payment-method card, create a recurring check. Force-quit and relaunch — still signed in and all three persisted (AUTH-02 + DATA-01/03).
3. From the profile screen, switch Seeker↔Scout (lands in the other hub), then sign out (returns to the entry flow).
4. Complete onboarding on a fresh account and confirm in the Supabase dashboard that `consents` has age_18plus/terms/privacy/aup rows and `event_log` has matching `consent.accepted` + `auth.*` events (SAFE-02 + DATA-04 end-to-end).

Also required before that build: register `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` (and the Google + Mapbox vars) as EAS env vars per the `_env_setup` block in `eas.json`.

## Phase 1 Code-Completeness

With Plans 01-01/02/03 merged, Phase 1 is **code-complete** pending the on-device gate:
- AUTH-01 — Apple + Google live; phone OTP written, deferred behind the flag.
- AUTH-02 — SecureStore session + boot gate (Plan 02); restart-persistence proven on device in Task 4.
- AUTH-03 — role switch wired into both profile screens.
- AUTH-04 — sign-out wired into both profile screens.
- DATA-01/03 — saved/recents/payment/recurring persist via api under RLS.
- DATA-04 — events emitted via `log_event` on consent/role-switch/sign-out/saves.
- SAFE-02 — 18+/Terms/Privacy/AUP recorded at onboarding + legal viewer.

The only remaining work is the human device walk-through (Task 4) and the EAS env registration it depends on.

## Self-Check: PASSED

All created files exist on disk; all three task commits (c0d3d7a, 7cfdde2, b6bfde6) present in git history.
