# Phase 11: Apple Submission Readiness - Context

**Gathered:** 2026-06-22 (the final beta phase. Goal: everything CODE-ready + the submission teed up; the human/account steps + Stripe-live (gated on the Delaware LLC, ~end of week) are the only remainder.)
**Status:** Ready for planning

<domain>
## Phase Boundary
Get the app through Apple App Review (TestFlight + App Store) cleanly. Two buckets:
1. **Code/app changes (buildable now):**
   - HIDE the unfinished growth screens so there are NO dead buttons / placeholders (Apple rejects these): memberships/subscriptions, referrals/invite, and full venue search if still mock. Hide entry points (don't delete the code — just gate them out of v1).
   - REMOVE the dev BLUR test button (filming.tsx SHOW_BLUR_TEST const + the dev block — gate back to __DEV__ or delete).
   - ACCOUNT DELETION (Apple requirement for any app with account creation): an in-app "Delete account" that removes/anonymizes the user's data (Edge fn + a profile/settings entry point).
   - RESET market_config.dispatch_timeout_s back to 300 (it was set to 3600 for testing).
   - A privacy-policy + terms link in-app (Settings) pointing to a hosted URL.
   - Permission strings sanity (Info.plist: camera, location, notifications, photo) — already mostly set.
   - Stability/crash sweep on the core flows.
2. **Human / account steps (checklist for Troy — NOT codeable by me):**
   - App Store Connect: app record, metadata/description, keywords, category, age rating, screenshots, App Privacy "nutrition labels".
   - Privacy policy URL (host the doc), support URL.
   - Demo reviewer account (a seeded login + notes for Apple review).
   - APNs key generation during `eas build` (for push).
   - The actual `eas build -p ios --profile production --auto-submit` + App Store Connect submission.
   - Stripe LIVE flip (gated on the Delaware LLC + EIN — end of week).

Out of scope: Android submission (fast-follow after iOS), the deferred growth features themselves.
</domain>

<decisions>
## Decisions (defaults)
- **D-01 growth screens:** HIDE (feature-flag/route-guard the entry points) for v1, keep the code for fast-follow. NOT delete. ⚠️ confirm which exactly: memberships, referrals, full-search.
- **D-02 dev blur button:** remove from the shipped build (gate to __DEV__ or delete the SHOW_BLUR_TEST block).
- **D-03 account deletion:** real deletion (delete the auth user + cascade/anonymize their rows) via a server Edge fn, reachable from profile/settings. Required by Apple.
- **D-04 dispatch_timeout reset:** back to 300 (5 min) in market_config before submission.
- **D-05 privacy/terms:** in-app links to hosted URLs (Troy provides/host the docs; I wire the link + a placeholder URL to swap).
- **Claude discretion:** how to gate growth screens (route guard vs hidden nav), the account-deletion cascade shape, the submission checklist doc format.
</decisions>

<canonical_refs>
- .planning/COMPLETION-ROADMAP.md (beta-critical vs deferred), .planning/SEEKER-AUDIT.md + SCOUT-AUDIT.md (which screens are the unfinished growth ones — membership/referrals/search), .planning/PROJECT.md, .planning/STATE.md
- .planning/phases/08-*/08-*-SUMMARY (the dev BLUR button SHOW_BLUR_TEST in filming.tsx to remove; the dispatch_timeout=3600 test change to reset)
- app/(seeker)/ membership / invite / search screens (the growth ones to hide), app/(seeker)/profile.tsx + app/(scout) profile (account-deletion entry point), app/_layout.tsx / nav
- supabase/functions/ (pattern for a delete-account Edge fn), supabase/migrations (cascade/RLS for deletion)
- app.config.js (Info.plist permission strings, version/build number for submission), .planning memory: Apple dev account ready; Stripe live gated on Delaware LLC
- ./CLAUDE.md, lmc-app/CLAUDE.md
</canonical_refs>

## ⚠️ Confirm with Troy
1. Which growth screens to hide for v1 (default: memberships, referrals, full venue search).
2. Privacy policy + terms + support URLs (Troy provides; I wire placeholders to swap).
3. He runs the App Store Connect + EAS submission steps (I produce the exact checklist).

---
*Phase 11 — context authored 2026-06-22, 7-day Apple push (final beta phase)*
