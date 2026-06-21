---
phase: 5
slug: verification-moat-dispatch-geofenced-dispatch-only-scouts-in
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-21
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Detailed validation architecture lives in 05-RESEARCH.md; this is the execution contract. The planner fills the Per-Task Verification Map.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pgTAP (PostGIS RPCs: dispatch radius, accept eligibility, one-active-job, re-dispatch transitions) + Deno test (verify-clip / signage Edge Functions) + vitest/tsc (app/lib geo + scout-location helpers) |
| **Config file** | supabase/tests (pgTAP); supabase/functions (deno); lmc-app (vitest/tsc) |
| **Quick run command** | `deno test --allow-env supabase/functions/_shared/` |
| **Full suite command** | `deno test --allow-env supabase/functions/ && cd lmc-app && npx tsc --noEmit` |
| **Estimated runtime** | ~30-45 seconds |

---

## Sampling Rate

- **After every task commit:** run that task's `<automated>` command (pgTAP for geo RPCs, deno test for Edge Functions, tsc for client).
- **After every plan wave:** full suite + the spatial pgTAP suite.
- **Before `/gsd-verify-work`:** full suite green + on-device geo walk-through (Scout within radius gets the job; clip filmed off-fence is auto-rejected; signage flag recorded but never blocks).
- **Max feedback latency:** 45 seconds.

---

## Per-Task Verification Map

*Filled by the planner — every auto task maps to an automated check. Special attention: a pgTAP test MUST assert ST_DWithin uses (longitude, latitude) order (the silent lat/lng-swap bug from research), and that the film-fence hard-rejects > 30 m while passing an on-site point with GPS-margin.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | DISP/SAFE | T-05-xx | geofence RPC + GiST index, lng/lat order | pgTAP | `grep -q "ST_DWithin" supabase/migrations/0012_*.sql` | ❌ task creates | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] pgTAP spatial test stubs (dispatch radius, film-fence boundary at exactly 30 m, lng/lat order) created inside the TDD tasks
- [ ] Deno test harness for verify-clip + signage Edge Functions (mirror Phase 3/4 function tests)
- [ ] Google Vision API key provisioned as an Edge secret (TEST/dev) — human checkpoint, like the Stripe/Mux keys

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scout-in-radius receives job | DISP | Needs 2 devices/locations | Online Scout within 1.5 km sees the job; one outside does not |
| Off-fence clip auto-rejected | Verify | Needs real GPS on device | Film > 30 m from venue → clip rejected, Seeker not charged, check re-dispatched |
| Signage flag is advisory | Verify | Needs real clip + Vision | A clip where the sign isn't readable still delivers (GPS passed), flagged "couldn't confirm sign" |
| Google Vision key | Wave 0 | Needs Troy's GCP key | Provide Vision API key for the signage Edge secret |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
