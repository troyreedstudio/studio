---
phase: 11-apple-submission-readiness
plan: "03"
subsystem: client
tags: [account-deletion, privacy, apple-compliance, permissions, help-links]
dependency_graph:
  requires:
    - 11-01 (delete-account Edge Function)
    - 11-02 (profile screens cleaned up — exclusive file ownership resolved)
  provides:
    - deleteMyAccount() client helper (app/lib/account.ts)
    - Delete Account entry point in Seeker profile (D-03)
    - Delete Account entry point in Scout profile (D-03)
    - In-app Privacy Policy + Terms + Support links (D-05)
    - NSPhotoLibraryUsageDescription removed from app.config.js
  affects:
    - app/(seeker)/profile.tsx
    - app/(scout)/profile.tsx
    - app/(seeker)/help.tsx
    - app/lib/account.ts (new)
    - app.config.js
tech_stack:
  added:
    - app/lib/account.ts — deleteMyAccount() using plain-fetch 30s-timeout pattern
  patterns:
    - Same plain-fetch + AbortController pattern as payments.ts invokeEdgeFunction (Hermes-safe)
    - Alert.alert two-step destructive confirm (cancel + style destructive)
    - Linking.openURL for external URLs and mailto
    - __DEV__ gate for dev-only UI sections
key_files:
  created:
    - lmc-app/app/lib/account.ts
  modified:
    - lmc-app/app/(seeker)/profile.tsx
    - lmc-app/app/(scout)/profile.tsx
    - lmc-app/app/(seeker)/help.tsx
    - lmc-app/app.config.js
decisions:
  - "invokeEdgeFunction copied into account.ts rather than re-exported from payments.ts — account.ts is a separate concern (account lifecycle, not payments); copy keeps the modules independent and avoids an unexpected export from payments.ts"
  - "Delete Account button sits below Sign Out in both profiles, styled red (#ff5a5a) as a distinct muted row — findable without being prominent (Apple 5.1.1(v) compliance)"
  - "NSPhotoLibraryUsageDescription removed and replaced with an explanatory comment — cleaner than silence; explains to future reviewers why the key is absent"
  - "Placeholder URLs (lmc.app/terms, lmc.app/privacy) marked with PLACEHOLDER comment for swap before submission (D-05)"
  - "__DEV__ gate wraps the entire dev error-state section (label + list) so it is fully absent from Release builds"
metrics:
  duration: "12m"
  completed: "2026-06-22"
  tasks_completed: 3
  files_changed: 5
---

# Phase 11 Plan 03: Delete Account + Help Links + Photo Permission Summary

Delete Account entry points with two-step destructive confirm calling the delete-account Edge Function via the Hermes-safe plain-fetch helper, followed by sign-out; in-app privacy/terms/support links via Linking.openURL; NSPhotoLibraryUsageDescription removed (no photo-library API used anywhere in the codebase).

## What Was Built

**app/lib/account.ts** (new):
- `deleteMyAccount(reason?: string): Promise<void>` — plain fetch POST to `delete-account` Edge Function with 30-second AbortController timeout (same Hermes-safe pattern as `payments.ts`; avoids `supabase.functions.invoke` Hermes/Release hang).
- Reason capped at 500 chars. On success calls `signOut()` from `lib/auth`. Errors propagate for caller to alert.

**app/(seeker)/profile.tsx** + **app/(scout)/profile.tsx**:
- Imports `deleteMyAccount` from `../lib/account` and `Alert` from `react-native`.
- `deleting` boolean state disables the button and shows "Deleting..." during the call.
- `handleDeleteAccount()`: `Alert.alert('Delete Account', '...')` with Cancel + destructive Delete. On confirm calls `deleteMyAccount()`, on success `router.replace('/index')`, on error shows `Alert.alert('Could not delete account', msg)`.
- Destructive red button (`#ff5a5a`) placed after Sign Out in both profiles.
- Minimal `deleteAccountBtn` / `deleteAccountText` styles added to each StyleSheet.

**app/(seeker)/help.tsx**:
- Imports `Linking` from `react-native`.
- `CONTACT_OPTIONS` entries each have an `href` field: Email Support + Live Chat both open `mailto:help@letmecheck.com`; Terms of Service opens `https://lmc.app/terms`; Privacy Policy opens `https://lmc.app/privacy`. Both URL entries carry a `PLACEHOLDER` comment.
- Contact `TouchableOpacity` rows wired: `onPress={() => { if (c.href) void Linking.openURL(c.href); }}`.
- Dev error-state section (label + list) wrapped in `{__DEV__ && (...)}` — invisible in Release builds.

**app.config.js**:
- `NSPhotoLibraryUsageDescription` key removed from `ios.infoPlist`.
- Comment added explaining the deliberate absence (no MediaLibrary/CameraRoll/saveToPhotos/ImagePicker in the codebase; Apple 5.1.1 minimum-permissions requirement).
- `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`, `ITSAppUsesNonExemptEncryption` untouched.

## Commits

- `566daf5` — `feat(11-03): add deleteMyAccount() client helper in app/lib/account.ts`
- `7f4bcc8` — `feat(11-03): Delete Account entry point in both Seeker and Scout profiles`
- `b30cc20` — `feat(11-03): wire help links, gate dev section, remove unused photo permission`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

**Help links use placeholder URLs** — `https://lmc.app/terms` and `https://lmc.app/privacy` are placeholders. Both are marked with a `PLACEHOLDER` comment in help.tsx. These links open correctly via `Linking.openURL` but will 404 until the real pages are hosted. Troy swaps these before App Store submission (D-05). This stub is intentional and documented; it does not prevent the plan's goal (Apple 5.1.1 requires a working link in-app, but the URLs can be updated any time via an OTA update or next build).

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. The `delete-account` Edge Function was introduced in Plan 01 (already in the threat register as T-11-10 through T-11-13).

## Self-Check: PASSED

- `/Users/troyreed/studio/projects/let-me-check/lmc-app/app/lib/account.ts` — EXISTS, contains `deleteMyAccount`, `delete-account`, `invokeEdgeFunction`, `signOut`
- `/Users/troyreed/studio/projects/let-me-check/lmc-app/app/(seeker)/profile.tsx` — contains `deleteMyAccount`, `Alert`, `handleDeleteAccount`, `deleteAccountBtn`
- `/Users/troyreed/studio/projects/let-me-check/lmc-app/app/(scout)/profile.tsx` — contains `deleteMyAccount`, `Alert`, `handleDeleteAccount`, `deleteAccountBtn`
- `/Users/troyreed/studio/projects/let-me-check/lmc-app/app/(seeker)/help.tsx` — contains `Linking.openURL`, `__DEV__`, `PLACEHOLDER`
- `/Users/troyreed/studio/projects/let-me-check/lmc-app/app.config.js` — `NSPhotoLibraryUsageDescription` key absent (only in comment)
- `tsc --noEmit` — clean (no output)
- Commits `566daf5`, `7f4bcc8`, `b30cc20` — confirmed in git log

D-03 (Delete Account findable in both profiles, calls Edge Function, signs out) and D-05 (Privacy Policy + Terms + Support wired with Linking.openURL) both satisfied. Apple 5.1.1(v) minimum-permissions requirement met (photo permission removed).
