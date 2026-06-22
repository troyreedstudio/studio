# Phase 7: SLA + Money Integrity - Context

**Gathered:** 2026-06-22 (Troy confirmed beta scope + a 7-day-to-Apple-submission target. Defaults below chosen for speed; flagged ones need a quick Troy confirm but DON'T block research/planning.)
**Status:** Ready for planning

<domain>
## Phase Boundary
Make time + money REAL and trustworthy (today they're cosmetic/fake):
1. **Server-driven delivery deadlines** — a real `deadline_at` on checks; client countdowns read it (no more resettable client timers).
2. **SLA enforcement** — a scheduled job expires stale/late checks: unclaimed → no_scout + release hold; accepted-but-undelivered past deadline → auto-refund + release.
3. **Trouble-Here → real refund** — wire the fake button to the existing Phase-4 refund.
4. **Real Scout earnings + payout** — replace fake earnings numbers + fake withdraw with real ledger + Stripe Connect payout.

Out of scope: blur (Phase 8), verified badge/quick-wins (Phase 9), push (Phase 10), growth (memberships/referrals/search — deferred post-beta).
</domain>

<decisions>
## Decisions (defaults — ⚠️ = confirm with Troy, non-blocking)
- **D-01 deadline windows:** Standard = 10 min, Priority = 7 min (from the pricing model). ⚠️ Clock STARTS at: default = when a Scout ACCEPTS (accepted_at + window) since that's when delivery is actually promised-achievable; the seeker waiting screen shows this real deadline. (Alt: from request — but unclaimed time is covered by D-02.) CONFIRM start-point.
- **D-02 unclaimed timeout:** if no Scout claims within a dispatch window (default 5 min) → `no_scout`, release the card hold (no charge). Reuses the existing `expire_stale_dispatching` groundwork.
- **D-03 late/undelivered:** accepted but not delivered by `deadline_at` → auto-refund/release the Seeker (no capture) + mark missed; the job is freed. ⚠️ CONFIRM.
- **D-04 Scout pay protection (Troy's prior rule):** a Scout who delivered a PASSING clip is ALWAYS paid, even if the Seeker is later refunded (platform absorbs) — never penalize a Scout who did their part. For a LATE miss (no delivery), no Scout pay. Keep this consistent with Phase-4 (Transfer not destination-charge, so refunds don't claw back Scout).
- **D-05 cron mechanism:** Supabase tier has NO pg_cron — use a scheduled Edge Function (or external trigger) to run the expiry sweep every ~1 min. Research picks the most robust option on our plan.
- **D-06 earnings source:** real Scout earnings = sum of delivered+captured checks attributable to the Scout (ledger view or query); payout history from Stripe Connect transfers/payouts. Withdraw = Stripe Connect payout (instant = 2% Scout fee, standard ACH = free — from Phase-4 decisions).
- **Claude discretion:** schema shape (deadline_at, missed reason enums), the earnings query/view, event-log additions.
</decisions>

<canonical_refs>
- .planning/SCOUT-AUDIT.md + SEEKER-AUDIT.md (the fake timers, fake earnings, fake Trouble-Here, the existing expire_stale_dispatching that can't run without cron).
- .planning/COMPLETION-ROADMAP.md (this is Phase 7 of the beta-critical set).
- supabase/migrations/0012* (expire_stale_dispatching + transition_check + dispatch spine), 0011 (payments).
- supabase/functions/stripe-refund, stripe-capture, stripe-connect-* (Phase-4 money rails to reuse for refund + payout).
- lib/checks.ts (transition_check, expireUnmatchedCheck), lib/payments.ts (refund/capture), app/(seeker)/waiting.tsx + app/(scout)/filming.tsx (cosmetic countdowns to make real), app/(scout)/earnings.tsx (fake), app/(scout)/filming.tsx Trouble-Here (fake refund).
- ./CLAUDE.md, lib patterns: server owns transitions+money, event-log everything, Edge holds secrets + REST not Node SDK, files <500 lines, New-Arch-safe.
</canonical_refs>

## ⚠️ Confirm with Troy (non-blocking)
1. Deadline clock start: on Scout-accept (default) vs on request.
2. Auto-refund on a missed deadline (default yes).
3. Scout-still-paid-on-passing-clip even if seeker refunded (default yes — his prior rule).

---
*Phase 07 — context authored 2026-06-22, 7-day Apple-submission push*
