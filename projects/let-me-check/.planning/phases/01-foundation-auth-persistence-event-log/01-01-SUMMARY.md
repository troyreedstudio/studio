---
phase: 01-foundation-auth-persistence-event-log
plan: 01
subsystem: database
tags: [supabase, postgres, rls, event-log, pgtap, vitest, postgis, state-machine, migrations]

# Dependency graph
requires: []
provides:
  - "Immutable append-only event_log (migration 0001) with BEFORE UPDATE/DELETE trigger + log_event() writer"
  - "Dual-role profiles + versioned consents (SAFE-02) schema"
  - "Market-aware catalog (markets/venues) with currency/locale/country as data"
  - "Core entities: checks + check_status enum, saved_places, recents, recurring_checks, payment_methods (placeholder), ratings"
  - "RLS enabled on all 11 tables; checks.status/scout_id unreachable by clients"
  - "transition_check() SECURITY DEFINER — sole server-side writer of checks.status, logs every transition"
  - "seed.sql (102 markets, 156 venues) generated from app/data/markets.ts"
  - "Vitest harness (vitest.config.ts + test/setup.ts makeClient) + npm test/test:db/typecheck scripts"
  - "Three pgTAP security tests (immutability, server-only status, RLS isolation)"
affects: [auth-client-wiring, store-migration, payments, dispatch, verification]

# Tech tracking
tech-stack:
  added: [vitest, "@vitest/coverage-v8", "@supabase/supabase-js", supabase-cli, pgtap, postgis, pgcrypto]
  patterns:
    - "Event log designed FIRST (migration 0001) before any entity table"
    - "Status column as state machine, written only by a SECURITY DEFINER function"
    - "RLS keyed on auth.uid() on every table; deny-by-omission (no UPDATE policy = no client write)"
    - "Catalog seed generated from the existing TS data module (single source of shape)"

key-files:
  created:
    - supabase/migrations/0001_event_log.sql
    - supabase/migrations/0002_profiles_roles_consents.sql
    - supabase/migrations/0003_markets_venues.sql
    - supabase/migrations/0004_core_entities.sql
    - supabase/migrations/0005_rls_policies.sql
    - supabase/migrations/0006_check_state_machine.sql
    - supabase/seed.sql
    - supabase/scripts/gen-seed.mjs
    - supabase/tests/event_log_immutable.test.sql
    - supabase/tests/check_status_server_only.test.sql
    - supabase/tests/rls_isolation.test.sql
    - lmc-app/vitest.config.ts
    - lmc-app/test/setup.ts
    - lmc-app/.env.example
  modified:
    - lmc-app/package.json
    - lmc-app/.gitignore

key-decisions:
  - "Plain append-only event_log table now; Timescale deferred (additive later) — beta scale"
  - "Venue id = market + slugified name (stable key for the seed; client SavedPlace.id stored as place_key)"
  - "currency/locale derived from country code at seed time (US->USD/en-US); schema never hard-codes USD"
  - "checks has NO authenticated UPDATE policy by design (deny-by-omission) — status is server-only"

patterns-established:
  - "Event-log-first migration ordering (0001) is a hard rule for the whole project"
  - "Every new table must enable RLS in the same migration wave it is created"
  - "Seed data is generated, not hand-written, from app/data/markets.ts via gen-seed.mjs"

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04, SAFE-02]

# Metrics
duration: ~8min
completed: 2026-06-20
---

# Phase 1 Plan 01: Supabase Backend Foundation Summary

**Immutable event log (0001) + dual-role/consent schema + market-aware catalog + checks state machine with RLS on all 11 tables, plus a Vitest harness and three pgTAP security tests — all authored and committed; the live-DB push is the one blocking checkpoint.**

## Performance

- **Duration:** ~8 min (offline authoring; live-DB run pending checkpoint)
- **Started:** 2026-06-20T09:58:22Z
- **Completed (offline portion):** 2026-06-20T10:05:52Z
- **Tasks:** 5 of 6 complete (Task 6 = blocking human-action checkpoint)
- **Files created/modified:** 16

## Accomplishments

- **event_log is migration 0001** — append-only, with BEFORE UPDATE/DELETE triggers that raise `event_log is append-only`, GIN+btree indexes, and a `log_event()` SECURITY DEFINER writer (actor_id = auth.uid()).
- **Dual-role profiles + versioned consents** — `profiles` (is_seeker/is_scout/current_role) auto-provisioned via `handle_new_user()`; `consents` table covers age_18plus/terms/privacy/aup/scout_code with doc_version + jurisdiction (SAFE-02).
- **Market-aware catalog + core entities** — markets/venues carry currency/locale/country as data; `check_status` enum + `checks`, plus saved_places/recents/recurring_checks/payment_methods/ratings mirroring the existing client store shapes.
- **State machine lockdown (DATA-02)** — `transition_check()` SECURITY DEFINER is the sole writer of `checks.status`, logging `check.status_changed` to event_log on every transition; clients have no UPDATE policy on checks.
- **RLS on all 11 tables** keyed on auth.uid(); catalog seeded (102 markets, 156 venues) from app/data/markets.ts via a generator.
- **Test harness + security tests** — Vitest green (exit 0); three pgTAP negative tests author the three invariants.

## Task Commits

1. **Task 0: Test harness + scaffolding** - `2259c4c` (chore)
2. **Task 1: event_log FIRST (0001)** - `c01e038` (feat)
3. **Task 2: profiles + dual-role + consents (0002)** - `8c3a6e9` (feat)
4. **Task 3: catalog + core entities + state machine (0003/0004/0006)** - `302919a` (feat)
5. **Task 4: RLS on all tables (0005) + seed** - `81a5a2e` (feat)
6. **Task 5: pgTAP security tests** - `0a0a33f` (test)
7. **Env template (deviation Rule 2)** - `b77f950` (chore)

_TDD note: Tasks 1 and 5 are marked tdd in the plan; the RED/GREEN database runs are blocked without Docker/login, so the SQL + pgTAP files were authored in full and the run is deferred to the Task 6 checkpoint._

## Files Created/Modified

- `supabase/migrations/0001_event_log.sql` - append-only event_log + immutability trigger + log_event()
- `supabase/migrations/0002_profiles_roles_consents.sql` - dual-role profiles, handle_new_user, consents
- `supabase/migrations/0003_markets_venues.sql` - market-aware catalog (currency/locale/country)
- `supabase/migrations/0004_core_entities.sql` - check_status enum, checks, and 5 store-backed tables
- `supabase/migrations/0005_rls_policies.sql` - RLS on all 11 tables; checks deny-by-omission
- `supabase/migrations/0006_check_state_machine.sql` - transition_check() server-only status writer
- `supabase/seed.sql` - generated catalog seed (102 markets / 156 venues)
- `supabase/scripts/gen-seed.mjs` - regenerates seed.sql from app/data/markets.ts
- `supabase/tests/*.test.sql` - three pgTAP security tests
- `lmc-app/vitest.config.ts`, `lmc-app/test/setup.ts` - Vitest harness + makeClient helper
- `lmc-app/.env.example` - Supabase URL + anon key placeholders (no secrets)
- `lmc-app/package.json` - test/test:watch/typecheck/test:db scripts
- `lmc-app/.gitignore` - un-ignore .env.example only

## Decisions Made

- **Plain append-only event_log** (Timescale deferred) per research A1 — non-breaking to upgrade later.
- **Generated seed** from the TS catalog rather than hand-transcribing ~120 markets / ~90 venues — avoids drift and transcription error; `gen-seed.mjs` documents the derivation.
- **currency/locale by country mapping** at seed time keeps the schema market-aware without inventing per-market money columns in the source TS.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vitest exits 1 on an empty suite**
- **Found during:** Task 0 (harness)
- **Issue:** Vitest 4 exits code 1 with "No test files found", which would fail a CI `npm test` before any suites exist.
- **Fix:** Added `passWithNoTests: true` to vitest.config.ts and a wave-0 smoke test (`test/harness.test.ts`) so the runner is provably green.
- **Files modified:** lmc-app/vitest.config.ts, lmc-app/test/harness.test.ts
- **Verification:** `npm test` exits 0 with 2 passing tests.
- **Committed in:** 2259c4c

**2. [Rule 2 - Missing Critical] .env.example template absent**
- **Found during:** Post-task verification (secrets/config surface)
- **Issue:** The client env surface (EXPO_PUBLIC_SUPABASE_URL/ANON_KEY) had no committed template; Plan 03 T3 expects `.env.example`, and `.env.*` was ignoring it.
- **Fix:** Added `lmc-app/.env.example` with placeholders only and a `!.env.example` negation in .gitignore; real `.env` stays ignored.
- **Files modified:** lmc-app/.env.example, lmc-app/.gitignore
- **Verification:** `git check-ignore` confirms .env.example is committable and real .env stays ignored; no secrets committed.
- **Committed in:** b77f950

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both necessary for a green harness and a clean secrets posture. No scope creep.

## Issues Encountered

- **No Docker, CLI not logged in** (environment): `supabase start`, `db reset`, `db push`, and `test db` cannot run here. All files were authored in full and validated offline (tsc, vitest, grep acceptance, migration ordering, secret scan). The live run is the Task 6 checkpoint.
- **Reading `lmc-app/.env` was sandbox-denied** — correct guardrail; verified the file is untracked + gitignored without reading its contents.

## Offline Verification (passed)

- `npx tsc --noEmit` in lmc-app — exit 0, clean.
- `npm test` (Vitest) — 2 passed, exit 0.
- All per-task acceptance greps (EVENTLOG_OK, PROFILES_OK, ENTITIES_OK, RLS_COUNT_OK=11, SQLTESTS_OK, HARNESS_OK).
- Migration order: 0001_event_log is the lowest-numbered migration (event-log-first).
- No `.env`/key files tracked; no secret-shaped strings in `supabase/`.

## BLOCKED on live-DB checkpoint (Task 6 — human-action)

The following require a live Supabase project + access token and Docker (for the local hermetic run). They are NOT done:

1. `supabase start && supabase db reset` (apply 0001-0006 + seed locally) then `supabase test db` (run the 3 pgTAP tests) — needs Docker.
2. `supabase link --project-ref <ref>` + `SUPABASE_ACCESS_TOKEN=... supabase db push --linked` — needs Troy's project + token.
3. `supabase gen types typescript --linked > lmc-app/app/lib/database.types.ts` — produces the client types Plan 02 consumes.

**Next-step guide for Troy:** create one Supabase project, copy the project ref + an access token (Dashboard > Account > Access Tokens) + the anon key, then run `supabase login`, `supabase link`, `supabase db push`. Reply "pushed" once migrations are applied and database.types.ts is generated, or paste any error.

## Next Phase Readiness

- Schema, RLS, state machine, seed, and tests are version-controlled and offline-verified.
- Plan 02 (client auth + lib layer) is unblocked on code once the live push + gen-types complete.
- Plan 02/03 also need Google OAuth client + Twilio (later waves) — not required for this plan.

## Self-Check: PASSED

All 14 created files verified present on disk; all 7 task commits verified in git history. No missing items. (Live-DB acceptance — pgTAP run + remote migration list + database.types.ts — remains blocked on the Task 6 human-action checkpoint, as documented above.)
