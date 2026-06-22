# Phase 10: Push Notifications - Context

**Gathered:** 2026-06-22 (beta-critical, 7-day Apple push. Build to defaults.)
**Status:** Ready for planning

<domain>
## Phase Boundary
Scouts can't be expected to stare at the app — they need a push when a nearby job appears. Seekers need a push when their video is ready. Scope:
1. **Push infra:** expo-notifications + a `device_push_tokens` table (per-user tokens, multi-device), permission request + token registration on login.
2. **Scout dispatch push:** when a check enters `dispatching`, push the in-range online Scouts ("New check nearby — $X").
3. **Seeker delivery push:** when a check transitions to `delivered`, push the Seeker ("Your video is ready").
4. **Respect preferences:** honor the notification_prefs the Phase-9 profile column stores (don't push a category the user turned off).
5. A server-owned Edge Function that sends via the Expo Push API (holds no secret beyond the service role; Expo push needs no API key for basic sends).

Out of scope (fast-follow): rich/actionable notifications, SMS/email, scout cooldown nudges, marketing pushes.
</domain>

<decisions>
## Decisions (defaults)
- **D-01 transport:** Expo Push (expo-notifications + Expo's push service / ExpoPushToken). Standard for Expo; no custom APNs/FCM server code. iOS needs the APNs key configured in EAS credentials (Apple dev account ready) — a setup step, flagged.
- **D-02 token storage:** `device_push_tokens (user_id, token, platform, updated_at)` — one row per device, upserted on app start when permission granted. RLS: a user manages only their own tokens.
- **D-03 triggers (server-owned):** fire from the SAME server transitions that already exist — on `dispatching` (push in-range online scouts via the existing geofence query) and on `delivered` (push the seeker). Best-effort, fire-and-forget (a push failure never blocks the transition — mirror the fraud-eval pattern). Reuse pg triggers / the existing Edge flow or a notify Edge Function called where transitions happen.
- **D-04 prefs:** read notification_prefs (Phase 9). Default all on; a category the user disabled is skipped. If Phase 9's column isn't merged yet, degrade gracefully (push all).
- **D-05 scope of events for v1:** job-nearby (scout) + video-ready (seeker). Accept/earnings/rating pushes = fast-follow.
- **Claude discretion:** notification copy, the exact trigger mechanism (pg trigger + pg_net to an Edge fn vs calling a send-push fn inline in the existing transition paths), batching to Expo (100/req).
</decisions>

<canonical_refs>
- .planning/SCOUT-AUDIT.md (notes "scouts must stare at the app — needs push before beta"), .planning/COMPLETION-ROADMAP.md, .planning/PROJECT.md, .planning/STATE.md
- supabase/migrations/0012* (dispatch geofence query list_open_checks_for_scout — the in-range scout set to push), mux-webhook (the delivered transition — seeker push), accept_check / transition_check
- supabase/functions/_shared/ + existing Edge fns (pattern for a send-push fn; pg_cron/pg_net are enabled from Phase 7 for trigger->edge calls)
- app/lib/ (auth/session — where to register the push token on login), app/(seeker)/notifications screen + Phase-9 notification_prefs column
- app.config.js (expo-notifications plugin + iOS push entitlement / APNs via EAS), ./CLAUDE.md, lmc-app/CLAUDE.md (New-Arch-safe; server owns sends; files <500)
</canonical_refs>

## ⚠️ Setup dependency (flag for Troy)
iOS push requires an APNs key in EAS credentials (uses the Apple dev account — already have it). The token-registration + send pipeline is fully buildable now; live push delivery on a Release device needs that APNs credential configured (EAS handles it at build/submit). Note in SUMMARY.

---
*Phase 10 — context authored 2026-06-22, 7-day Apple push*
