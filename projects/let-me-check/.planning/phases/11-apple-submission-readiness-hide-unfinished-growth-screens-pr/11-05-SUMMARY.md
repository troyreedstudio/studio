---
phase: 11-apple-submission-readiness
plan: "05"
subsystem: docs
tags: [apple-submission, privacy-policy, terms, demo-account, seed-script, checklist, legal]
dependency_graph:
  requires:
    - 11-01 (account deletion code + growth screens hidden)
    - 11-02 (dev artifacts removed, help.tsx links wired)
    - 11-03 (client deleteMyAccount() helper)
    - 11-04 (0021 live, delete-account deployed, dispatch_timeout=300)
  provides:
    - APPLE-SUBMISSION-CHECKLIST.md (H-01..H-10, Troy's complete submission guide)
    - .planning/legal/PRIVACY-POLICY-DRAFT.md (reviewable privacy policy)
    - .planning/legal/TERMS-DRAFT.md (reviewable terms of service)
    - scripts/seed-demo-account.sql (demo reviewer account + delivered check)
  affects:
    - .planning/APPLE-SUBMISSION-CHECKLIST.md (created)
    - .planning/legal/PRIVACY-POLICY-DRAFT.md (created)
    - .planning/legal/TERMS-DRAFT.md (created)
    - scripts/seed-demo-account.sql (created)
tech_stack:
  added: []
  patterns:
    - Idempotent SQL seed with DO block + ON CONFLICT DO NOTHING + fixed UUIDs
    - Guard clause that blocks execution if placeholder UIDs are not replaced
    - Mux playback ID OPTION A (real clip) vs OPTION B (NULL placeholder) documented inline
key_files:
  created:
    - .planning/APPLE-SUBMISSION-CHECKLIST.md
    - .planning/legal/PRIVACY-POLICY-DRAFT.md
    - .planning/legal/TERMS-DRAFT.md
    - scripts/seed-demo-account.sql
  modified: []
decisions:
  - "Seed script uses a DO block (not psql \\set meta-commands) for compatibility with the Supabase dashboard SQL editor, which does not support psql-specific commands"
  - "Fixed UUIDs (aaaaaaaa-000X...) for the seeded rows make the script idempotent and easy to reference in verification queries"
  - "Terms draft included alongside privacy policy -- both are required by Apple and referenced in the checklist"
  - "Mux playback ID left as OPTION A/B in the seed script because Troy may or may not have a real clip to use as the demo asset; the app delivers the Delivery screen UI either way"
  - "Privacy policy omits microphone (app is audio-off, VID-02) and photo library (removed in Phase 11 from infoPlist)"
metrics:
  duration: "4m"
  completed: "2026-06-22"
  tasks_completed: 3
  files_changed: 4
---

# Phase 11 Plan 05: Apple Submission Package

Produced the complete human submission package for Troy: a step-by-step App Store checklist (H-01..H-10) with exact EAS commands, screenshot sizes, App Privacy labels, and a verbatim Stripe 3.1.3 review-notes block; a privacy policy and terms of service draft covering camera/location/video/push/payment data and all third-party processors; and an idempotent SQL seed script that gives the Apple reviewer a demo Seeker with a delivered check plus a demo Scout.

## What Was Done

### Task 1: Demo-account seed script

Created `scripts/seed-demo-account.sql`. The script runs as a privileged caller
via the Supabase dashboard SQL Editor, which bypasses the client-only transition
guard that prevents normal users from writing `status = 'delivered'` directly.

Key design decisions:
- Uses a `DO $$...$$` PL/pgSQL block for full compatibility with the Supabase
  dashboard SQL editor (no psql backslash commands).
- A guard clause at the top raises an exception if Troy forgets to replace
  `PASTE-SEEKER-UUID-HERE` or `PASTE-SCOUT-UUID-HERE`, preventing silent seeding
  against the wrong accounts.
- Fixed UUIDs (`aaaaaaaa-000X-...`) for the seeded rows make every insert
  `ON CONFLICT DO NOTHING` idempotent. Troy can re-run it safely.
- Inserts: one `checks` row (status=delivered, market=mia, tier=standard), one
  `clips` row (status=ready, mux_playback_id as OPTION A/B), one `payments` row
  (status=transferred, 1650 cents / 800 scout_amount).
- Includes commented verification queries at the bottom for Troy to confirm.

Resolves open-Q 2 from 11-RESEARCH.md (demo account with pre-seeded delivered
check).

### Task 2: Privacy policy and terms of service drafts

Created `.planning/legal/PRIVACY-POLICY-DRAFT.md` and
`.planning/legal/TERMS-DRAFT.md`.

Privacy policy covers:
- Account data (name + email from Apple/Google sign-in)
- Precise location (Seeker dispatch, Scout job matching)
- Videos (Scout-filmed clips, face-blurred before delivery)
- Push notification tokens
- Payment data handled entirely by Stripe (LMC never receives card details)
- Third-party processors: Supabase, Mux, Stripe, Expo
- Account deletion mechanism (Delete Account button in Profile, removes PII,
  anonymizes financial records for legal retention)
- No microphone (VID-02, audio-off), no photo library access

Both documents are clearly marked DRAFT with a prominent legal-review reminder.
Effective date fields are left blank for Troy to fill before publishing.

Resolves open-Q 3 from 11-RESEARCH.md (privacy policy content).

### Task 3: Apple submission checklist

Created `.planning/APPLE-SUBMISSION-CHECKLIST.md`.

Structured as 10 numbered steps with checkboxes, in plain English:

- Opens with a "what the code team already did for you" summary covering Plans
  01-04 outcomes, so Troy knows the code side is complete.
- Explains the three-login distinction (Apple Developer / Expo / GitHub) up
  front to prevent the "I pushed to GitHub, why isn't my app updated?" confusion.
- H-01: App Store Connect record setup (bundle ID, category, age rating
  questionnaire answers that result in 4+ rating).
- H-02: Ready-to-edit description draft, keyword string, promo text, copyright.
- H-03: Screenshot instructions (1320x2868 for 6.9-inch iPhone 16 Pro Max,
  covers all iPhones), which screens to capture, warning to take after code
  changes (no WF badge, no dev sections).
- H-04: App Privacy nutrition labels table (what LMC collects vs what Stripe
  owns; payment info NOT declared as collected by LMC).
- H-05: How to host privacy + terms (Google Doc option for TestFlight vs real
  domain for final submission), links to the draft docs.
- H-06: Full verbatim review-notes text block ready to paste into App Store
  Connect, including:
  - Demo Seeker and Scout credentials (with `[FILL IN]` placeholders for
    passwords so nothing sensitive goes in the repo)
  - Location-dependent service explanation
  - Stripe 3.1.3 real-world-service exemption paragraph (the precise defense
    against an IAP rejection)
- H-07: APNs key already configured (no action needed, confirmed from eas.json).
- H-08: Exact EAS commands in a clearly labelled code block:
  `eas build -p ios --profile production` then
  `eas submit -p ios --profile production --latest`
- H-09: TestFlight-first recommendation with a mini-checklist of what to verify
  on a real device (camera prompt, location prompt, push prompt, delete account).
- H-10: Stripe live flip gated on Delaware LLC, with exact steps (Supabase
  Vault + EAS env var + rebuild) and the key note that App Review can proceed
  in test mode.

## Commits

- `0bf7104` -- `chore(11-05): add demo reviewer account seed script`
- `34bceaf` -- `chore(11-05): add privacy policy + terms of service drafts`
- `817cc92` -- `chore(11-05): add Apple submission checklist (H-01 through H-10)`

## Deviations from Plan

None. Plan executed exactly as written. The plan mentioned a possible
`.planning/PRIVACY-POLICY-DRAFT.md` path but the legal/ subdirectory is a
cleaner home; the checklist references the actual paths.

## Known Stubs

The seed script has two intentional stubs:

1. **UID placeholders** (`PASTE-SEEKER-UUID-HERE`, `PASTE-SCOUT-UUID-HERE`) -- by
   design; a guard clause prevents running without replacing them.
2. **Mux playback ID** (`NULL`) -- documented as OPTION A (use a real clip ID) vs
   OPTION B (leave NULL, the delivery UI still shows). This is the only component
   that requires a real end-to-end test delivery to fully resolve.

These do not prevent the plan's goal from being achieved. The reviewer can see
the Delivery screen UI with OPTION B; a real video requires OPTION A which Troy
fills in.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: credentials_in_review_notes | APPLE-SUBMISSION-CHECKLIST.md | The review notes block includes `[FILL IN]` password placeholders. The checklist explicitly instructs Troy to enter passwords only in App Store Connect and never commit them to the repo. T-11-17 mitigated. |

## Self-Check: PASSED

Files exist:
- `.planning/APPLE-SUBMISSION-CHECKLIST.md`: FOUND
- `.planning/legal/PRIVACY-POLICY-DRAFT.md`: FOUND
- `.planning/legal/TERMS-DRAFT.md`: FOUND
- `scripts/seed-demo-account.sql`: FOUND

Checklist verification:
- `eas submit`: FOUND in checklist
- `1320`: FOUND in checklist (screenshot size)
- `3.1.3`: FOUND in checklist (Stripe exemption)
- `seed-demo-account`: FOUND in checklist (H-06 reference)

Privacy policy verification:
- `Stripe`: FOUND
- `delete`: FOUND

Seed script verification:
- `delivered`: FOUND
- `payments`: FOUND

Commits confirmed in git log: `0bf7104`, `34bceaf`, `817cc92`.
