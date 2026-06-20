# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-19)

**Core value:** A Seeker can pay for, and reliably receive, a genuine, recent, location-true 15-second clip of a real place — fast.
**Current focus:** Phase 1 — Foundation (Auth + Persistence + Event Log)

## Current Position

Phase: 1 of 7 (Foundation — Auth + Persistence + Event Log)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-06-19 — Roadmap created (7 phases, all v1 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Foundation: Event log is immutable and decided before schemas are drawn (DATA-04) — adding it retroactively loses irrecoverable training data
- Foundation: Server owns every state transition and secret; client holds no business logic (enforced by RLS, not client routing)
- Money: Capture-on-delivery, not on acceptance (no charge for an undelivered clip; fewer chargebacks)
- Verification: Full per-clip AI verification (signage auto-reject + AI Verdict) is in V1; only PREDICTIVE AI is deferred to Phase 2+

### Pending Todos

None yet.

### Blockers/Concerns

Carried from research — to resolve at the relevant phase, not now:
- Open business decisions to confirm with Troy before their phase ships: audio policy (video-only), venue allow-list vs film-anywhere for beta, Scout-protection refund policy, capture timing (all defaulted in PROJECT.md — confirm intentionally)
- Florida / NYC legal review (audio consent, no-film zones, filming/privacy law) before launch — cross-cutting, surfaces by Phase 6/7
- Phases flagged for deeper research at planning time: Phase 5 (atomic dispatch / double-assignment concurrency), Phase 6 (anti-fraud / iOS mock-location detection), Phase 4 (capture-timing + chargeback + Connect onboarding edges)
- Repo housekeeping before next commit: gitignore .claude-flow/.swarm/.mcp.json/*.db/SECURITY_*.json; drop unused react-native-maps; avoid retired ffmpeg-kit; fix RN version note

## Session Continuity

Last session: 2026-06-19
Stopped at: ROADMAP.md and STATE.md written; REQUIREMENTS.md traceability filled
Resume file: None
