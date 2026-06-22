---
phase: 11-apple-submission-readiness
plan: 02
subsystem: client-ui
tags: [apple-submission, dead-buttons, dev-artifacts, seeker, scout, search, filming]
dependency_graph:
  requires: []
  provides: [no-dead-buttons-seeker-profile, no-dead-buttons-scout-profile, wired-location-button, dev-blur-removed, wf-badges-removed]
  affects: [app/(seeker)/profile.tsx, app/(scout)/profile.tsx, app/(seeker)/search.tsx, app/(scout)/filming.tsx, app/(seeker)/membership.tsx]
tech_stack:
  added: []
  patterns: [requestUserLocation-on-tap, __DEV__-gate-for-fake-ui, entry-point-removal-not-screen-deletion]
key_files:
  modified:
    - app/(seeker)/profile.tsx
    - app/(scout)/profile.tsx
    - app/(seeker)/search.tsx
    - app/(scout)/filming.tsx
    - app/(seeker)/membership.tsx
decisions:
  - Hide growth screens by removing nav entry points only; screen files (membership.tsx, invite.tsx) preserved for fast-follow
  - Voice mic gated with __DEV__ ternary (renders null in Release) plus mock-fill useEffect guarded with if (!__DEV__) return
  - Location button calls requestUserLocation() then router.replace to home on granted; keeps screen open on denied
  - Dev blur JSX block deleted entirely (not __DEV__-gated) because SHOW_BLUR_TEST was force-true in Release — full deletion is safer
metrics:
  duration_seconds: 196
  completed_date: "2026-06-22"
  tasks_completed: 3
  files_modified: 5
---

# Phase 11 Plan 02: Dead Button Removal + Dev Artifact Cleanup Summary

Remove every dead button, placeholder entry point, and developer artifact reachable in the shipped build to pass Apple review rules 2.1 (App Completeness) and 4.2 (Minimum Functionality).

## What Was Built

Surgical removal across five files, zero new features introduced:

**Seeker profile (app/(seeker)/profile.tsx):**
- Removed `LMC Plus / Pro` entry from SETTINGS array (no longer routes to membership screen)
- Removed `Invite Friends` entry from SETTINGS array (no longer routes to invite screen)
- Removed the `Give $5, Get $5` referral banner block (second entry point to /invite)
- Screen files `membership.tsx` and `invite.tsx` are untouched — unreachable in normal nav, ready to wire back in a fast-follow

**Scout profile (app/(scout)/profile.tsx):**
- Removed the `Refer a Scout — $50` referral banner block that routed to `/(seeker)/invite`

**Search screen (app/(seeker)/search.tsx):**
- Imported `requestUserLocation` from `../state/location`
- Wired `onPress` on "Use my current location" button: calls `requestUserLocation()`, on `granted` replaces to `/(seeker)/home` (home re-centres on `getUserCoords()` on load), on `denied` keeps search screen open for manual typing
- Gated voice mic `TouchableOpacity` behind `__DEV__ ? (...) : null` — invisible in Release builds
- Guarded mock-fill `useEffect` body with `if (!__DEV__) return` — no fake query ever injected in Release

**Filming screen (app/(scout)/filming.tsx):**
- Deleted the entire DEV-ONLY import block (`VideoView`, `useVideoPlayer`, `blurFaces`, `BlurResult`, `BlurMode`)
- Deleted `SHOW_BLUR_TEST` const and its TEMP comment
- Deleted `devBlurBusy`, `devBlurResult`, `devPlayer` state and the `runDevBlur` async function
- Deleted WF wireframe badge `TouchableOpacity` (`router.push('/flow-map')`) from the header
- Deleted the `{SHOW_BLUR_TEST && (...)}` JSX block (DEV blur buttons + VideoView preview) from the decision card

**Membership screen (app/(seeker)/membership.tsx):**
- Deleted WF wireframe badge `TouchableOpacity` (`router.push('/flow-map')`) from the header
- Wireframe badge styles left in StyleSheet (harmless dead styles, per plan)

## Deviations from Plan

### filming.tsx line count: 695 lines (not under 500)

**Found during:** Task 3
**Issue:** The plan stated "Confirm filming.tsx is now under 500 lines." The file was 799 lines before this plan. After removing all dev artifacts (~104 lines deleted), it is now 695 lines. The remaining lines are entirely production HUD/steps/trouble-report UI — the same code the Phase-7 TODO comment flagged for extraction: `// TODO(phase-7): extract the HUD/steps/trouble UI out of filming.tsx`. The dev blur block was not the source of the bulk; the production scroll content is.
**Impact:** None on Apple submission readiness. All dev artifacts are removed; the line count is a code quality metric, not a review criterion.
**Deferred:** Extract HUD/steps/trouble into `_filming-hud.tsx` or similar — that refactor belongs in a Phase-12 housekeeping plan, not here.

No other deviations. All dead buttons confirmed removed.

## Verification

```
T1 grep: no /(seeker)/membership or /(seeker)/invite in seeker profile.tsx  → 0 ✓
T1 grep: no /(seeker)/invite in scout profile.tsx                           → 0 ✓
T2 grep: requestUserLocation present in search.tsx                          → FOUND ✓
T2 grep: __DEV__ present in search.tsx                                      → FOUND ✓
T3 grep: no SHOW_BLUR_TEST/runDevBlur/devBlur/flow-map in filming.tsx       → 0 ✓
T3 grep: no flow-map in membership.tsx                                      → 0 ✓
tsc --noEmit                                                                → clean ✓
filming.tsx line count                                                      → 695 (see deviation above)
```

## Known Stubs

- `handleUpgrade` in membership.tsx still shows `Alert.alert('In production this would open the Apple/Google subscription flow.')` — but this screen is now unreachable in normal nav (no entry points), so this is not a reachable placeholder. No action needed here.
- Scout profile stats row (Earned/Checks/Rating) shows hardcoded mock values — pre-existing, out of scope for this plan.

## Threat Flags

None. This plan only removes reachable surfaces; it does not add any new network endpoints, auth paths, file access patterns, or schema changes.

## Self-Check: PASSED

- All 5 modified files exist and were committed across 3 per-task commits
- Commits: 5472fb9 (T1), 228601d (T2), 088730d (T3)
- No dead entry points to membership, invite, or /flow-map remain reachable via normal in-app navigation
- filming.tsx: 695 lines (dev artifacts fully removed; production HUD code is the remaining bulk — documented deviation)
- tsc clean
