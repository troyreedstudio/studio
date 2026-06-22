# Phase 9: Verified badge + Scout identity + quick-win reconnects - Context

**Gathered:** 2026-06-22 (beta-critical, 7-day Apple push. Build to defaults; flagged items non-blocking.)
**Status:** Ready for planning

<domain>
## Phase Boundary
Make the seeker-facing surface REAL (the audits found it largely mock). Two buckets:
1. **The value-prop made real on the delivery screen:** the "✓ Verified" badge reflects the REAL gps_verified result; the Scout card shows the REAL scout (name/rating), not "Jake C."; the fake "AI Verdict" + "Crowd Report" tags are REMOVED (that AI feature doesn't exist — honesty + Apple-review-safety).
2. **Quick-win reconnects (backend already exists — just rewire the screens off in-memory state to the DB):** saved places, recurring checks (+ setup), payment-method cards (last4 / confirmed+cancelled), notification preferences persistence, seeker profile stats, preferred cities.

Out of scope (deferred to growth/Phase 11): memberships/subscriptions, referrals/invite, full venue search, real scout dots on the map (nice-to-have), recurring-check SCHEDULER execution (the UI + storage can land; actually firing recurring checks can be a fast-follow).
</domain>

<decisions>
## Decisions (defaults)
- **D-01 Verified badge:** show "✓ Verified" ONLY when the clip's gps_verified = true; otherwise show a neutral state (no false "Verified"). Optionally surface signage advisory if present. Source from the existing clips row already loaded on delivery.tsx.
- **D-02 Scout identity:** show the real Scout's display name + rating/stats on the delivery screen. Needs an IDOR-safe public-scout-profile read (the Seeker may see the scout of THEIR OWN delivered check only) — a SECURITY DEFINER RPC or a narrow RLS view. Avatar = initial or photo if available.
- **D-03 Fake AI/crowd:** REMOVE the "AI Verdict" + "Crowd Report" hardcoded tags from delivery.tsx (don't fake a feature). ⚠️ confirm vs keeping a placeholder — default REMOVE.
- **D-04 Reconnects:** wire saved places, recurring (+setup), payment-methods, notification prefs, profile stats, preferred cities to their existing backend (the SEEKER-AUDIT says the backend mostly exists; research confirms exact tables/RPCs). If any needs a small net-new table (e.g. saved_places), add it minimally.
- **D-05 Recurring checks:** land the UI + persistence now; the actual SCHEDULER that fires them can be fast-follow (note it, don't block beta).
- **Claude discretion:** exact RPC/view shapes, avatar handling, empty/loading states.
</decisions>

<canonical_refs>
- .planning/SEEKER-AUDIT.md (the authoritative inventory: which screens are mock/partial + what backend each needs — READ FIRST), .planning/COMPLETION-ROADMAP.md
- app/(seeker)/delivery.tsx (mock Verified badge line ~197, fake "Jake C." scout card ~191-198, fake AI verdict ~171-174 + crowd tags ~176-179; real video player + rating + refund already wired)
- app/(seeker)/ saved-places / recurring / payment-methods / notifications / profile screens (the reconnect targets — find exact files)
- lib/checks.ts (getCheck, getCheckClip, listMyChecks; CheckRow/ClipRow incl gps_verified, signage_confirmed, scout_id), lib/payments.ts, lib/api.ts, lib/supabase.ts
- supabase/migrations (profiles table for scout identity; existing tables for saved/recurring/payment-methods if present)
- ./CLAUDE.md, lmc-app/CLAUDE.md (server owns data; RLS; files <500 lines; New-Arch-safe; no fake data; copy now uses "video" not "clip")
</canonical_refs>

## ⚠️ Confirm (non-blocking)
1. Remove the fake AI-verdict / crowd-report tags on delivery (default: remove) vs keep as a "coming soon".

---
*Phase 09 — context authored 2026-06-22, 7-day Apple push*
