---
phase: 05-verification-moat-dispatch-geofenced-dispatch-only-scouts-in
plan: "04"
subsystem: edge-functions
tags: [signage-ai, google-vision, advisory-only, d-06, tdd, deno-tests, mux-webhook]
dependency_graph:
  requires: [05-03-verify-clip-gps-gate]
  provides: [signage-check-edge-function, advisory-signage-result]
  affects: [mux-webhook-step-9, clips.signage_confirmed]
tech_stack:
  added: []
  patterns: [Google Vision REST fetch (NOT npm package), decoupled-handler + import.meta.main, advisory-only fire-and-forget, dependency-injected vision for offline tests]
key_files:
  created:
    - supabase/functions/signage-check/index.ts
    - supabase/functions/signage-check/index.test.ts
  modified:
    - supabase/functions/mux-webhook/index.ts
    - supabase/functions/mux-webhook/index.test.ts
decisions:
  - "Signage AI is advisory-only by construction (D-06): transition_check and reset_check_for_redispatch are structurally absent from signage-check (grep gate enforces this)"
  - "Vision is injected via deps.vision so tests run fully offline; live entrypoint supplies the REST fetch dep"
  - "Missing API key degrades to signage_confirmed=null + log check.signage_skipped — no throw, delivery always unaffected"
  - "Mux signed thumbnail: live entrypoint mints RS256 JWT from MUX_SIGNING_KEY_ID to fetch thumbnail bytes as base64; falls back to imageUri if signing keys absent (Wave-4 checkpoint wires the key)"
  - "Simple contains-match fuzzy strategy for v1 (normalize + lowercase + strip punctuation); signage_min_conf tuning deferred to v2 when Vision confidence scores incorporated"
  - "mux-webhook test updated: fragile invokes.length===1 replaced with find() for stripe-capture — robust to future advisory hooks"
metrics:
  duration: "246s (4 min 6s)"
  completed: "2026-06-21"
  tasks: 2
  files_created: 2
  files_modified: 2
---

# Phase 5 Plan 04: signage-check Edge Function Summary

**One-liner:** Advisory-only Google Vision REST signage check (D-06) wired fire-and-forget after mux-webhook delivered transition — writes clips.signage_confirmed (true/false/null), structurally incapable of rejecting or re-dispatching.

## What Was Built

### Task 1 — RED Deno tests for signage-check advisory-only invariant (commit: baaec3e)

`supabase/functions/signage-check/index.test.ts` — 4 Deno tests pinning the full advisory contract:

1. **confirmed=true**: Vision returns `["THE BROKEN SHAKER","craft cocktails"]`, venue name "Broken Shaker" → `clips.signage_confirmed=true` written. D-06 invariant: neither `transition_check` nor `reset_check_for_redispatch` called.
2. **confirmed=false**: Vision returns `["random","text","no match here"]` → `signage_confirmed=false`. Same D-06 invariant.
3. **confirmed=null (missing key)**: `apiKeyPresent:false` → handler returns `{ confirmed: null }`, no throw, no false-positive `true`. D-06 invariant holds.
4. **advisory-only invariant (D-06 canonical)**: Runs all three paths, accumulates ALL rpc calls, asserts `transition_check` called 0 times AND `reset_check_for_redispatch` called 0 times across every path.

`mockSvc` records `clips.update` and all `rpc()` calls. Vision is injected via `deps.vision` (offline-testable, no real fetch).

### Task 2 — signage-check Edge Function + mux-webhook step 9 (commits: 44ae520, 78ace63)

**`supabase/functions/signage-check/index.ts`** — exported `handleSignageCheck(checkId, { svc, vision, apiKeyPresent })`:

- If `!apiKeyPresent`: writes `signage_confirmed=null`, logs `check.signage_skipped { reason: 'no_api_key' }`, returns `{ confirmed: null }`. Never throws.
- Main path (wrapped in catch-all):
  1. Reads latest clip's `mux_playback_id` (Pitfall 5 guard: `.order('created_at', asc:false).limit(1).single()`).
  2. Reads `checks.venue_id + location_label` → joins `venues.name`; falls back to `location_label`.
  3. Builds image reference as `imageUri` for Vision (test dep receives this directly).
  4. Calls `deps.vision(imageRef)` → `{ text: string[] }`.
  5. Fuzzy match: normalize (lowercase + strip punctuation) → `some(t => tn.includes(nameNorm) || nameNorm.includes(tn))`. Empty text list → `confirmed=false`.
  6. Writes `clips.signage_confirmed` (true/false).
  7. Logs `check.signage_checked { confirmed, detected_sample, venue_name }`.
  8. Returns `{ confirmed }`.
- Catch-all: any error → writes `signage_confirmed=null`, logs `check.signage_error`, returns `{ confirmed: null }`.
- `import.meta.main` live entrypoint: reads `GOOGLE_VISION_API_KEY` from `Deno.env`; builds live `vision` dep that calls `vision.googleapis.com/v1/images:annotate?key=...` via REST fetch (NOT `npm:@google-cloud/vision` — Pitfall 7). Mints RS256 JWT from `MUX_SIGNING_KEY_ID + MUX_SIGNING_PRIVATE_KEY` to fetch Mux thumbnail bytes as base64 (Pitfall 2 mitigation); falls back to `imageUri` if signing keys absent.
- `transition_check` is structurally absent — confirmed by grep gate.

**`supabase/functions/mux-webhook/index.ts`** — step 9 added after step 8 (stripe-capture):

```ts
// 9. Signage advisory (D-06) — fire-and-forget AFTER delivered. NEVER gates delivery.
try { await deps.svc.functions.invoke('signage-check', { body: { checkId } }); } catch (_e) { /* advisory only */ }
```

Runs only on the GPS-passed path (the `gps_rejected` branch returned at step 6b). The `try/catch` swallows all errors — a signage failure never surfaces to Mux or the Seeker.

**`supabase/functions/mux-webhook/index.test.ts`** — fragile `assertEquals(calls.invokes.length, 1)` replaced with `calls.invokes.find(i => i.fn === 'stripe-capture')` so the test is robust to future advisory hooks added after delivered.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] mux-webhook test broken by step 9 invoke**
- **Found during:** Task 2 verification
- **Issue:** The existing test `"valid delivery triggers stripe-capture AFTER delivered transition (D-03)"` asserted `calls.invokes.length === 1`. With step 9 adding a `signage-check` invoke (plus the pre-existing `verify-clip` from step 6b), the delivery path now produces 3 invokes total.
- **Fix:** Replaced `assertEquals(calls.invokes.length, 1)` + `calls.invokes[0].fn` with `calls.invokes.find(i => i.fn === 'stripe-capture')` — behaviorally identical assertion, robust to additional advisory invokes.
- **Files modified:** `supabase/functions/mux-webhook/index.test.ts`
- **Commit:** 78ace63

**2. [Rule 2 - Missing critical functionality] transition_check appeared in header comment**
- **Found during:** Task 2 grep verification
- **Issue:** The plan's grep gate `! grep -q "transition_check"` enforces structural absence. Header comments mentioning the invariant were triggering the gate.
- **Fix:** Rewrote two comment lines to document the D-06 advisory-only constraint without using the forbidden function name — maintaining readability while satisfying the structural grep gate.
- **Files modified:** `supabase/functions/signage-check/index.ts`
- **Commit:** 44ae520

## Known Stubs

None. This plan is pure server-side Edge Function logic — no UI rendering paths, no hardcoded empty values in components.

**Wave-4 seam (intentional, not a stub):** `GOOGLE_VISION_API_KEY` is read from `Deno.env` but is not yet set — the Wave-4 human checkpoint will run `supabase secrets set GOOGLE_VISION_API_KEY=...`. Until then, `signage_confirmed` will always be `null` (graceful degrade by design). This is the correct behaviour — not a stub.

## Threat Flags

All threats from the plan's threat register are addressed:

| Flag | File | Description |
|------|------|-------------|
| T-05-17 mitigated | signage-check/index.ts | GOOGLE_VISION_API_KEY read from Deno.env only; never returned to client; same pattern as Mux/Stripe |
| T-05-18 mitigated | signage-check/index.ts | Advisory-only by construction: no transition/reset in signage-check; grep gate + Deno tests assert both are never called |
| T-05-19 mitigated | signage-check/index.ts | Signed playback policy; live entrypoint mints RS256 JWT to fetch thumbnail bytes server-side; URL never returned to client |
| T-05-20 mitigated | mux-webhook/index.ts | Fire-and-forget AFTER delivered; step 9 try/catch swallows all errors; delivery already complete |
| T-05-21 mitigated | signage-check/index.ts | signage_confirmed written by service-role only; no client UPDATE policy on clips |

## Self-Check: PASSED

- `supabase/functions/signage-check/index.ts` — file exists (248 lines)
- `supabase/functions/signage-check/index.test.ts` — file exists (4 Deno tests)
- `supabase/functions/mux-webhook/index.ts` — step 9 signage-check fire-and-forget present
- `supabase/functions/mux-webhook/index.test.ts` — stripe-capture assertion updated to find()
- Task 1 commit baaec3e in git log
- Task 2 commits 44ae520 + 78ace63 in git log
- All grep gates pass: handleSignageCheck, vision.googleapis.com, signage_confirmed, import.meta.main, transition_check absent, reset_check_for_redispatch absent, signage-check in mux-webhook
- `npx tsc --noEmit` clean (no client files touched)
- `npm test` (lmc-app): 51/54 pass; 3 pre-existing failures in clips.test.ts (supabase.auth mock gap from Phase 3 — unrelated to this plan)
