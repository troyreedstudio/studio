# Phase 11: Apple Submission Readiness — Research

**Researched:** 2026-06-22
**Domain:** iOS App Store submission, in-app account deletion, growth-screen gating, Stripe vs IAP, EAS build + submit
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 growth screens:** HIDE (feature-flag/route-guard the entry points) for v1, keep the code for fast-follow. NOT delete.
- **D-02 dev blur button:** remove from the shipped build (gate to `__DEV__` or delete the `SHOW_BLUR_TEST` block).
- **D-03 account deletion:** real deletion (delete the auth user + cascade/anonymize their rows) via a server Edge fn, reachable from profile/settings. Required by Apple.
- **D-04 dispatch_timeout reset:** back to 300 (5 min) in market_config before submission.
- **D-05 privacy/terms:** in-app links to hosted URLs (Troy provides/hosts the docs; I wire the link + a placeholder URL to swap).

### Claude's Discretion
- How to gate growth screens (route guard vs hidden nav).
- The account-deletion cascade shape.
- The submission checklist doc format.

### Deferred Ideas (OUT OF SCOPE)
- Android submission (fast-follow after iOS).
- The deferred growth features themselves (memberships, referrals, full search).
</user_constraints>

---

## Summary

Phase 11 is the smallest amount of code between the current build and an App Store submission. It has two buckets: code changes that can be built and shipped now (account deletion, hiding three growth screens, removing dev artifacts, and privacy/terms links), and a human checklist that only Troy can complete in App Store Connect + on his device.

The most common rejection patterns for an app like LMC are: (1) missing in-app account deletion (Apple 5.1.1(v) — hard requirement since June 2022), (2) buttons or screens that appear to do something but don't (Apple 2.1 "Demo mode" / 4.2 "Minimum functionality"), and (3) permission strings that reviewers find vague or don't match what the app actually uses. None of these are architectural problems — they are all fixable in one phase.

Stripe for the check payments (a real-world on-demand service) is explicitly correct under Apple guidelines. IAP is required only for in-app digital goods and subscriptions; real-world services (rides, food delivery, and on-demand video verification) are exempt. Hiding the membership screen for v1 means IAP is not a question Apple will ask at all.

**Primary recommendation:** Execute all code changes in a single wave of tasks (account-deletion Edge fn + migration, growth-screen gating, dev-artifact removal, privacy/terms wiring), then hand the human submission checklist to Troy.

---

## Standard Stack (this phase only)

No new libraries. Everything needed is already installed. [VERIFIED: codebase grep]

| What | How | File |
|------|-----|------|
| Account deletion Edge fn | Deno + `@supabase/supabase-js` service client (already in `_shared/supabase.ts`) — calls `auth.admin.deleteUser(uid)` which cascades via `auth.users ON DELETE CASCADE` | `supabase/functions/delete-account/index.ts` (new) |
| Growth-screen gating | Remove entries from `SETTINGS` array in `profile.tsx` + remove the referral banner `TouchableOpacity` (`/invite`) + add `__DEV__`-only guard on membership route | `app/(seeker)/profile.tsx` |
| Dev blur button | Set `SHOW_BLUR_TEST = false` (or delete the const + block — deletion preferred to avoid confusion) | `app/(scout)/filming.tsx` |
| WF wireframe badges | Two locations: `filming.tsx` (line 408-414) + `membership.tsx` header — remove both `wireframeBadge` blocks | same two files |
| Privacy/terms | `CONTACT_OPTIONS` in `help.tsx` — replace `lmc.app/privacy` / `lmc.app/terms` with real hosted URLs via `Linking.openURL()` | `app/(seeker)/help.tsx` |
| Help dev section | Gate the "DEV · PREVIEW ERROR STATES" section in `help.tsx` behind `if (__DEV__)` | `app/(seeker)/help.tsx` |
| account_deletions table | New migration `0021_account_deletion.sql` — audit row + the `delete_my_account()` SECURITY DEFINER RPC | `supabase/migrations/0021_account_deletion.sql` |
| dispatch_timeout | Already 300 in `0015_sla_deadline.sql` — verify live DB; if a manual override was applied, run `UPDATE public.market_config SET dispatch_timeout_s = 300` | Live DB check |

**No `npm install` needed.** No new pods. No eas.json changes needed.

---

## Architecture Patterns

### A. Account Deletion (Apple 5.1.1(v))

**The requirement (Apple 5.1.1(v)):** Any app that allows account creation must let users initiate account deletion from within the app. The option must be easy to find — not buried. A "deactivate" toggle does not satisfy it. [CITED: developer.apple.com/support/offering-account-deletion-in-your-app/]

**The correct approach for LMC:**

1. A "Delete Account" row in the seeker profile settings list (and a matching row in the scout profile settings list — one account, two hubs, both need the entry point).
2. Tapping it shows a two-step confirmation (a `Alert.alert` with a clearly-labelled destructive button is sufficient — Apple does not require a separate screen, just a confirmation step).
3. Confirmation calls a new Edge Function `delete-account` which:
   - Verifies the caller's JWT (authed client) to get `auth.uid()` — never trust a client-supplied user ID.
   - Inserts a row in `account_deletions` for the audit trail (timestamp, uid, reason).
   - Cancels any in-flight checks (transitions to `cancelled`; the SLA sweeper handles holds if they're still authorized).
   - Calls `supabase.auth.admin.deleteUser(uid)` via the service client — this cascades ON DELETE to `profiles`, `consents`, `checks` (as seeker), `saved_places`, `recents`, `recurring_checks`, `payment_methods`, `ratings`, `device_push_tokens`, `scout_locations`, `scout_stripe_accounts`.
4. On success, the client calls `signOut()` and routes to `/index`.

**What about payments data?** `payments` and `refund_requests` reference `checks.id`, and `checks` references `auth.users(id)`. If `checks` cascade-deletes on user delete, the payment rows become orphaned (foreign key violation) unless the payments table also cascades or the FK is set to `SET NULL`. [ASSUMED: the existing FK shape on `payments` — needs verification before writing the migration.]

**Safe approach:** Before calling `deleteUser`, anonymize the user's `checks.seeker_id` (set to a sentinel `DELETED_USER_ID` uuid) for any check with a payment record (status = delivered/rated/cancelled with a Stripe PI). This preserves Stripe financial records for reconciliation while removing PII. Checks in open states (dispatching, assigned, filming) should be transitioned to `cancelled` first. [ASSUMED: anonymize-then-delete is the right approach for financial-record retention — confirm with Troy before execution.]

**The data shape:**

```sql
-- 0021_account_deletion.sql (sketch — planner verifies FK shape first)
create table if not exists public.account_deletions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,          -- NOT a FK — user is being deleted
  reason     text,
  deleted_at timestamptz not null default now()
);

-- SECURITY DEFINER RPC: callable by the authenticated user, runs as service role.
-- Steps: cancel open checks -> anonymize paid checks -> delete auth user.
create or replace function public.delete_my_account(p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- 1. Audit row
  insert into public.account_deletions(user_id, reason) values (v_uid, p_reason);
  -- 2. Cancel any open checks (dispatching/assigned/filming)
  -- (planner fills in the transition calls)
  -- 3. Anonymize checks with payment records (delivered/rated)
  -- (planner fills in the sentinel-id approach)
  -- 4. Delete the auth user (cascades profiles, consents, etc.)
  perform auth.admin.deleteUser(v_uid::text);  -- or via Edge fn service client
end;
$$;
```

The actual `auth.admin.deleteUser` call is only available via the Supabase Admin API (service role), so the real implementation must be an Edge Function (not a plain PLPGSQL function). The RPC above is the pattern; the Edge Function calls the JS Admin API. See the existing `serviceClient()` helper in `_shared/supabase.ts` — the pattern is already established. [VERIFIED: codebase — `_shared/supabase.ts` has `serviceClient()` which uses `SUPABASE_SERVICE_ROLE_KEY`]

**Edge Function pattern:**
```typescript
// supabase/functions/delete-account/index.ts
import { authedClient, serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const client = authedClient(req);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const uid = user.id;
  const svc = serviceClient();

  // 1. Audit row
  await svc.from("account_deletions").insert({ user_id: uid });

  // 2. Cancel open checks
  // ... transition calls (planner fills in)

  // 3. Anonymize financial-linked checks
  // ... sentinel update (planner fills in)

  // 4. Delete auth user (cascades profiles, etc.)
  const { error: delErr } = await svc.auth.admin.deleteUser(uid);
  if (delErr) return new Response(JSON.stringify({ error: delErr.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
```

Deploy: `supabase functions deploy delete-account --no-verify-jwt` — because the caller IS authenticated but the function needs service-role privileges internally. Wait — actually this should use `verify-jwt=true` (the caller must be authenticated; we verify them via `authedClient`). Use the same pattern as `stripe-refund` (verify_jwt=true). [VERIFIED: codebase pattern — `stripe-refund` uses verify_jwt=true]

**Entry points in profile screens:**
- `app/(seeker)/profile.tsx` — add "Delete Account" row to `SETTINGS` array, styled in the danger zone below the sign-out button (not in the main settings list — put it as a standalone destructive row after the sign-out button, in red/muted styling).
- `app/(scout)/profile.tsx` — add matching "Delete Account" entry in `ACCOUNT_ITEMS` array.

---

### B. Growth-Screen Gating (Apple 2.1 / 4.2)

**The risk:** Apple guideline 4.2 ("Minimum Functionality") and 2.1 ("App Completeness") reject apps with buttons that appear to do something but don't. The three growth screens all have this problem:

| Screen | The problem | Apple's concern |
|--------|-------------|-----------------|
| `membership.tsx` | Upgrade CTAs show an `Alert.alert("In production this would open...") ` — literally says it doesn't work | 2.1 / 4.2 — incomplete feature |
| `invite.tsx` | COPY button has no `onPress`. Share buttons have no `onPress`. Stats are hardcoded (4/3/$15). | 2.1 — dead buttons |
| `search.tsx` (partial) | "Use my current location" button has no `onPress`. Voice search fakes a result. 84 hardcoded places. | 2.1 — dead button |

**Gating approach (D-01: hide, not delete):**

The cleanest approach is to remove the navigation entry points in `profile.tsx`, leaving the screen files untouched for fast-follow. This is one edit per screen:

1. **Membership:** Remove `{ icon: 'star-outline', label: 'LMC Plus / Pro', route: '/(seeker)/membership' }` from the `SETTINGS` array in `profile.tsx`. Also remove the "WF" wireframe badge from `membership.tsx` itself (belt and suspenders — the route still exists for __DEV__ testing).

2. **Invite / Referrals:** Remove `{ icon: 'people-outline', label: 'Invite Friends', route: '/(seeker)/invite' }` from the `SETTINGS` array. Also remove the "Give $5, Get $5" referral banner `TouchableOpacity` (lines 191-198 in `profile.tsx`) — this is a second entry point to `invite.tsx` that lives separately from the SETTINGS list.

3. **Search (full-text / voice):** Search is accessible from `home.tsx`. The dead "Use my current location" button and fake voice search are the issues. Options: (a) remove the `TouchableOpacity` wrapper from "Use my current location" and make it a static label, or (b) wire it to `getUserCoords()` (already available in `lib/geo.ts`) — this is a tiny fix and preferred. For voice search: gate the voice icon behind `__DEV__` or replace it with a standard keyboard-only search UX. The 84 hardcoded places are acceptable for a v1 beta if they are clearly seeded data — Apple's concern is dead buttons, not seeded content. Fix the dead button, and search is passable.

**What NOT to do:** Do not delete the screen files. Do not add a `router.replace` redirect from the screen itself — that causes a visible flash. Simply remove the entry points.

---

### C. Dev Artifact Removal

**`SHOW_BLUR_TEST` in `filming.tsx`:** [VERIFIED: codebase]
- Line 52: `const SHOW_BLUR_TEST = true;`
- Line 609: `{SHOW_BLUR_TEST && (` — the block runs to line 652.
- The block renders two buttons ("BLUR (GAUSSIAN)" / "BLUR (PIXELATE)") and a video player in the decision card after recording.
- **Fix:** Delete lines 29-35 (the DEV-ONLY import block for `VideoView`, `useVideoPlayer`, `blurFaces`, `BlurResult`, `BlurMode`), delete the `SHOW_BLUR_TEST` const on line 52, delete the `devBlurBusy` / `devBlurResult` / `devPlayer` state variables, delete the `runDevBlur` function, and delete the JSX block at lines 606-652. Also delete the `__DEV__`-comment imports at the top. This is a surgical deletion — do NOT touch the surrounding `decisionCard` JSX or the submit/retake buttons.
- Also on line 408-414: the "WF" wireframe badge (`router.push('/flow-map')`) in filming.tsx. Remove it.

**`help.tsx` dev section:** [VERIFIED: codebase]
- Lines 67-85: the "DEV · PREVIEW ERROR STATES" section with 4 error-state nav buttons.
- **Fix:** Gate with `{__DEV__ && (...)}`  or delete entirely. Recommend gate with `__DEV__` — Troy may want it for testing dev builds.
- Also wire the contact `TouchableOpacity` rows (lines 51-64) to `Linking.openURL()` — they currently have no `onPress`, which is a dead-button pattern.

**`dispatch_timeout_s`:** [VERIFIED: codebase]
- `0015_sla_deadline.sql` already contains `UPDATE public.market_config SET dispatch_timeout_s = 300`. [VERIFIED]
- The 3600 value mentioned in the CONTEXT.md is not in any migration file — it may have been a manual SQL console change during testing. Before submission, verify the live value: `SELECT dispatch_timeout_s FROM public.market_config LIMIT 1;` via the Supabase dashboard SQL editor. If it shows 3600, run the UPDATE. This is a human step (Troy runs the SQL check), not a code change.

---

### D. Privacy and Terms Links

**Current state in `help.tsx`:** [VERIFIED: codebase]
- `CONTACT_OPTIONS` array has `lmc.app/privacy` and `lmc.app/terms` as string values (displayed as subtitles, never opened).
- The contact rows are `TouchableOpacity` but have no `onPress` — dead buttons.

**Fix:**
```typescript
import { Linking } from 'react-native';

// In onPress for the relevant rows:
await Linking.openURL('https://lmc.app/privacy');
await Linking.openURL('https://lmc.app/terms');
await Linking.openURL('mailto:help@letmecheck.com');
```

**The URLs themselves:** Troy must host the actual privacy policy and terms documents before submission. Apple requires a working privacy policy URL in App Store Connect (the metadata field) AND a working in-app link. A Google Doc set to "anyone with link can view" is acceptable during TestFlight; a real hosted page is required for App Store. Placeholder URLs (`lmc.app/privacy`) can be wired in code now and swapped when Troy hosts the docs.

**Apple's requirement for the privacy policy:** It must describe what data you collect (email/name from Apple/Google sign-in, location, device push token, payment method), why you collect it, and who you share it with (Supabase, Stripe, Mux, Expo). This is not a legal question for this phase — it is a checkbox item Troy completes. [CITED: developer.apple.com/app-store/app-privacy-details/]

---

### E. Stripe vs IAP — The Critical Ruling

**Bottom line:** LMC's check payments are 100% Stripe-correct under Apple guidelines. [CITED: developer.apple.com/app-store/review/guidelines/ §3.1.3]

Apple guideline 3.1.3 explicitly exempts "services or physical products acquired outside of the app." On-demand videography (a Scout films a real place and delivers the clip) is a real-world service — the same category as Uber, DoorDash, and TaskRabbit. Apple has never required IAP for this category. Using Stripe is not only permitted, it is the correct choice.

**The IAP question disappears entirely for v1** because the membership screen is being hidden. Apple only scrutinizes IAP when the app offers in-app subscriptions or digital goods that benefit the app experience. With membership hidden, the only money flow in the app is Seeker → Scout check payments (Stripe, real-world service) and Scout → bank withdrawals (Stripe Connect). Both are exempt.

**Post-v1 (when memberships launch):** LMC Plus / LMC Pro (recurring monthly subscriptions) WILL require Apple IAP (StoreKit 2 or RevenueCat) because they are in-app digital benefits (more checks, better support, etc.). This is a Phase C item per the roadmap. Do not use Stripe for subscriptions — Apple enforces this strictly. [CITED: developer.apple.com/app-store/review/guidelines/ §3.1.1]

---

### F. Permission Strings (Info.plist) — Already Set

Current `app.config.js` `infoPlist` keys: [VERIFIED: codebase]

| Permission | Current string | Assessment |
|------------|----------------|------------|
| `NSLocationWhenInUseUsageDescription` | "Let Me Check uses your location to find nearby Scouts and verified venues." | Good — specific |
| `NSCameraUsageDescription` | "Let Me Check uses your camera to film verification clips." | Good — specific |
| `NSPhotoLibraryUsageDescription` | "Let Me Check uses your photo library to save your past check videos." | Acceptable — though LMC doesn't currently save to camera roll; if this permission isn't exercised Apple may flag it. Recommend removing if not used, or changing to "to select reference photos." |
| Microphone | Intentionally absent (`enableMicrophonePermission: false`) | Correct — audio-off is a legal requirement |
| Push notifications | Added via `expo-notifications` plugin | Correct — prompt triggers at runtime when user taps into notifications.tsx |
| `ITSAppUsesNonExemptEncryption` | `false` | Correct — no custom encryption |

**Recommendation:** Remove `NSPhotoLibraryUsageDescription` from `infoPlist` if the app does not actually use it. vision-camera is configured with `enableMicrophonePermission: false` and the photo library string was likely added preemptively. If the app requests a permission it doesn't use, Apple may reject it (guideline 5.1.1 — request only the minimum necessary). [ASSUMED: verify whether the app actually exercises photo library access before removing]

---

### G. Common Apple Rejection Reasons for Apps Like LMC

Based on the category (on-demand marketplace, camera, location, push, two-sided roles): [CITED: developer.apple.com/app-store/review/guidelines/; VERIFIED via search]

| Reason | Guideline | How LMC is affected | Mitigation |
|--------|-----------|---------------------|------------|
| Missing account deletion | 5.1.1(v) | LMC creates accounts — HARD BLOCKER | Phase 11 code task |
| Dead/placeholder buttons | 2.1, 4.2 | invite.tsx COPY/share, membership CTAs, search location button | Phase 11 code task |
| Vague camera/location permission strings | 5.1.1 | Currently reasonable, but "save past check videos" (photo library) may not match actual usage | Remove if unused |
| Dev artifacts visible | 2.1 | WF badge in filming.tsx and membership.tsx; dev error-state section in help.tsx | Phase 11 code task |
| Privacy policy not linked in-app | 5.1.1 | Links exist in help.tsx but are dead TouchableOpacity with no onPress | Phase 11 code task |
| No demo account / reviewer can't test core flow | 2.1 | Reviewer needs a Seeker account to request a check AND a Scout account to accept it — on a single device, this is a challenge | Human checklist (demo notes) |
| Filming other people without consent | 5.1.1 | LMC Scouts film public spaces — legal, but Apple reviewers notice camera apps | Need clear privacy policy + in-app consent note |
| Stripe payments (reviewer may flag as IAP violation) | 3.1.3 | The real-world service exemption applies; reviewer notes must explain this | Review notes in App Store Connect |
| App does nothing without a location/Scout | 4.2 | In Miami-only beta, reviewer in Cupertino is "out of coverage" and sees the waitlist banner | Demo account must have a seeded check; explain in review notes |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Account deletion cascade | Manual DELETE statements per table | `auth.admin.deleteUser(uid)` — Supabase cascades ON DELETE to all tables with `references auth.users(id) on delete cascade` (profiles, consents, recents, etc.) |
| In-app privacy/terms rendering | A native rendered PDF or embedded text | `Linking.openURL()` to a hosted webpage — simpler, always up to date |
| Membership (when it ships) | A custom Stripe subscription flow | RevenueCat (wraps StoreKit 2 + Google Play Billing) — Apple will reject a Stripe subscription |

---

## Common Pitfalls

### Pitfall 1: Reviewer Can't See Anything
**What goes wrong:** The Apple reviewer opens the app in Cupertino, CA. LMC only shows active venues in Miami. The home screen shows "No coverage in your area." The reviewer sees a map, a waitlist banner, and nothing to do. They reject under 4.2.

**Why it happens:** Two-sided marketplace cold-start problem. The reviewer can't go to Miami.

**How to avoid:** In Review Notes, provide a pre-seeded Seeker account login that already has a past check in "delivered" status. This lets the reviewer navigate: Home → History → tap a delivered check → watch the video on the delivery screen. For the Scout side, provide a Scout account login and explain the flow in review notes. Tell Apple explicitly: "This is a location-dependent on-demand service. To test the full flow, please use the seeded demo account — it has a completed check you can replay. A real-time check requires a second physical device in our coverage area."

### Pitfall 2: The "WF" Wireframe Badge Gets Rejected
**What goes wrong:** The wireframe "WF" badge in `filming.tsx` (line 408) and `membership.tsx` (header) routes to `/flow-map`. A reviewer taps it, sees a developer flow map, and immediately rejects: "The app contains non-user-facing developer artifacts."

**How to avoid:** Delete both WF badges in Phase 11. They are already identified in the code.

### Pitfall 3: Account Deletion Doesn't Actually Delete
**What goes wrong:** The account deletion calls `supabase.auth.signOut()` but leaves the auth user record and all data in place. On next app open, signing in with the same Apple/Google ID re-creates the session. Apple tests this — they try to sign back in after deleting.

**How to avoid:** The Edge Function must call `auth.admin.deleteUser(uid)` via the service client. Signing out is NOT deletion.

### Pitfall 4: Payments Rows Cascade-Delete and Stripe Records Are Lost
**What goes wrong:** `payments` table has `check_id uuid references checks(id)` — if `checks` cascade-deletes when the user is deleted, `payments` rows cascade too. Stripe records become unreconcilable.

**How to avoid:** Before calling `deleteUser`, check the FK chain. If `payments` would cascade, anonymize `checks.seeker_id` (and `checks.scout_id` if it's the same user) for any check with a payment row, rather than deleting them. The planner must verify the FK cascade chain from `payments` → `checks` → `auth.users` before writing the migration. [ASSUMED: FK chain needs verification — see migration 0011_payments.sql]

### Pitfall 5: `NSPhotoLibraryUsageDescription` Triggers a Permission Prompt for Unused Feature
**What goes wrong:** iOS prompts for photo library access when the app is launched (if the permission string is declared). If the user grants it and then revokes it in Settings, nothing breaks — but if Apple's automated testing triggers it and the reviewer never sees the feature that uses it, they may reject under "collects data not needed for the app's functionality" (5.1.1).

**How to avoid:** Remove the `NSPhotoLibraryUsageDescription` key from `infoPlist` if the app does not actually save clips to the camera roll. The comment in `app.config.js` says "save your past check videos" — verify whether `react-native-vision-camera` is configured to save to the camera roll (it is not in the current config: `enableMicrophonePermission: false` and no `saveToPhotos` option is set). [ASSUMED: verify before removing]

---

## CODE Work (Buildable — what Guy does)

These are the tasks that result in code commits:

| Task | Files | Effort |
|------|-------|--------|
| C-01 Account deletion Edge fn | `supabase/functions/delete-account/index.ts` (new), `supabase/migrations/0021_account_deletion.sql` (new) | M |
| C-02 Delete Account entry point (seeker) | `app/(seeker)/profile.tsx` — add row below sign-out | XS |
| C-03 Delete Account entry point (scout) | `app/(scout)/profile.tsx` — add row to ACCOUNT_ITEMS | XS |
| C-04 Hide membership nav entry | `app/(seeker)/profile.tsx` — remove from SETTINGS array | XS |
| C-05 Hide invite/referral nav entry | `app/(seeker)/profile.tsx` — remove from SETTINGS array + remove referral banner | XS |
| C-06 Fix search dead button | `app/(seeker)/search.tsx` — wire "Use my current location" onPress or remove button; gate voice search with __DEV__ | S |
| C-07 Remove SHOW_BLUR_TEST block | `app/(scout)/filming.tsx` — delete const, imports, state, function, JSX block (lines 29-35, 52, SHOW_BLUR_TEST usages, 606-652) | S |
| C-08 Remove WF badges | `app/(scout)/filming.tsx` (lines 408-414), `app/(seeker)/membership.tsx` (header block) | XS |
| C-09 Gate help.tsx dev section | `app/(seeker)/help.tsx` — wrap DEV section with `{__DEV__ && ...}` | XS |
| C-10 Wire help.tsx contact links | `app/(seeker)/help.tsx` — add `Linking.openURL()` to each contact row | XS |
| C-11 Add in-app privacy/terms links | `app/(seeker)/help.tsx` — real URLs (Troy provides; placeholder `https://lmc.app/privacy` etc.) | XS |
| C-12 Verify dispatch_timeout_s | Human SQL check (Troy runs `SELECT dispatch_timeout_s FROM public.market_config LIMIT 1` in Supabase dashboard) — code change only if it shows 3600 | XS |
| C-13 version / buildNumber bump | `app.config.js` — bump `version` to `1.0.0`, `buildNumber` is managed by EAS (`autoIncrement: true` in eas.json) — no change needed | — |
| C-14 Remove NSPhotoLibraryUsageDescription | `app.config.js` — only if confirmed unused | XS |

---

## HUMAN Checklist (Troy does — not codeable by Guy)

These require Troy's Apple Developer account, App Store Connect access, and his device.

### H-01: App Store Connect — App Record
Troy navigates to [App Store Connect](https://appstoreconnect.apple.com) → My Apps → Let Me Check (App ID 6764298662, already registered per `eas.json`).

Checklist:
- [ ] App name confirmed: "Let Me Check"
- [ ] Bundle ID confirmed: `Com.BlackMalibuinc.letmecheck` (note: capital C — matches `app.config.js`)
- [ ] Primary language: English (US)
- [ ] Primary category: **Utilities** or **Lifestyle** — recommend Lifestyle (real-world on-demand service). Secondary: Navigation (location-centric).
- [ ] Age rating: Fill out the questionnaire. Answers for LMC: No mature/suggestive content, No real gambling, No simulated gambling, No alcohol/tobacco/drugs, Medical info = No, Contests/sweepstakes = No. This will result in **4+** or **9+** rating. LMC likely gets **4+**.
- [ ] Privacy policy URL: Enter the hosted privacy policy URL (Troy creates/hosts this — see H-05).
- [ ] Support URL: Enter `https://lmc.app/support` or Troy's email-based support URL.

### H-02: App Store Connect — Metadata
- [ ] Description (up to 4000 chars): Write compelling copy. Key points: "Know Before You Go" tagline, what a Seeker does (pay, wait, watch), what a Scout earns, the verification stack (GPS, AI signage check). Must NOT mention features that aren't in the app (no membership pricing, no referrals).
- [ ] Keywords (100 chars max): `venue check,scout,live video,location check,nightlife,restaurant queue,real-time,on demand,verification`
- [ ] Promotional text (170 chars, changeable without re-review): "Real eyes on the ground. Know what's happening before you go."
- [ ] What's New (first release — leave blank or write "First release of Let Me Check — visual verification on demand.")
- [ ] Copyright: `© 2026 Black Malibu Inc.` (or Troy's entity name)

### H-03: Screenshots
Apple requires screenshots at specific sizes. You only need to upload **one size** (the largest) and App Store Connect scales it. [CITED: developer.apple.com/help/app-store-connect/reference/screenshot-specifications/]

**Minimum required:**
- **6.9-inch iPhone (iPhone 16 Pro Max):** 1320 × 2868 px portrait — this one set covers all iPhones.
- Upload 3-10 screenshots showing the core flow: home screen (map + venues), the venue detail screen, the payment screen, the waiting/dispatch screen, the delivery screen with video.

**How:** Run the app on an iPhone 16 Pro Max simulator at full resolution (or use Simulator → File → Take Screenshot). Repeat in iOS Simulator for each screen.

**Do NOT include the WF badge or dev sections in screenshots** — code changes (C-08, C-09) must be done first, then take new screenshots.

### H-04: App Privacy "Nutrition Labels"
In App Store Connect → App Privacy, answer the questionnaire for every data type LMC collects:

| Data Type | Collected? | Used for | Linked to User? |
|-----------|------------|---------|-----------------|
| Name | Yes (from Apple/Google sign-in) | Account Management | Yes |
| Email | Yes | Account Management | Yes |
| User ID | Yes (Supabase UUID) | App Functionality | Yes |
| Precise Location | Yes | App Functionality (dispatch) | Yes |
| Coarse Location | No | — | — |
| Device ID | Yes (Expo push token) | Notifications | No (token, not IDFA) |
| Payment info | No (Stripe handles it; never touches LMC servers) | — | — |
| Videos | Yes (clips filmed and uploaded) | App Functionality | Yes |
| Crash data | No (no crash reporter configured) | — | — |

**Note:** Stripe owns the payment card data — LMC never sees it. Do not declare payment info as collected by LMC. [ASSUMED: verify Stripe's data handling in their iOS SDK privacy manifest]

### H-05: Host the Privacy Policy + Terms
Troy needs to write and host:
- A privacy policy at a public URL (e.g., `lmc.app/privacy` or a Notion page, or a hosted HTML page).
- Terms of service at `lmc.app/terms`.
- A support page or email at `lmc.app/support` or `help@letmecheck.com`.

The privacy policy must cover: account data (name, email), location data, video data, push tokens, Stripe payment processing (which is handled by Stripe, not LMC). This is NOT a legal review task for this phase — it just needs to exist and be accessible to Apple.

### H-06: Demo Reviewer Account + Review Notes
Apple cannot test a two-sided marketplace from a single device in Cupertino. The review notes must address this.

**Provide two sets of credentials:**
- Seeker login: `reviewer@letmecheck.demo` / `[password]` — this account has at least 1 delivered check in history that the reviewer can replay on the delivery screen.
- Scout login: `scout.reviewer@letmecheck.demo` / `[password]` — this account has Stripe Connect onboarded (or at minimum can navigate through the Scout dashboard UI).

**How to seed these:** Troy creates both accounts in the app (Apple or Google sign-in — if using email, phone OTP is still disabled so use Apple/Google). For the Seeker account, manually insert a delivered check row in the Supabase dashboard. For the Scout account, complete the payout onboarding with Stripe test-mode credentials.

**Review notes text (draft):**
```
Let Me Check is an on-demand visual verification marketplace — Seekers pay for a 
15-second video of any location filmed by a nearby Scout (independent contractor).

DEMO ACCESS
Seeker (to browse and see a delivered check): 
  Email: reviewer@letmecheck.demo  Password: [FILL IN]
  → Sign in with email/Google, navigate to History, tap any delivered check to 
  watch the video on the Delivery screen.

Scout (to view Scout dashboard and earnings):
  Email: scout.reviewer@letmecheck.demo  Password: [FILL IN]
  → Sign in, tap "I'm a Scout" on the splash, view dashboard.

PAYMENT NOTES
Seeker-to-Scout payments are processed by Stripe (real-world service, not IAP).
This is an on-demand physical service similar to Uber or TaskRabbit. Per App Store
guideline 3.1.3, IAP is not required for real-world services.

LOCATION NOTE
The app is location-dependent — active coverage is in Miami and New York. The demo 
Seeker account has a pre-completed check in history so you can see the full delivery 
experience without needing to be in a covered area.
```

### H-07: APNs Key
The APNs key is already configured in `eas.json`:
```json
"ascApiKeyPath": "/Users/troyreed/.private_keys/AuthKey_XPS8JFNPFY.p8"
```
This key handles App Store Connect API authentication for `eas submit`. The APNs push key (for sending push notifications) is configured inside the Supabase dashboard (Vault: `lmc_service_role_key`), NOT in `eas.json`. **No action needed here** — Phase 10 wired this already. [VERIFIED: STATE.md — Phase 10 complete, Vault credentials set]

### H-08: EAS Build + Submit
Once all code changes are committed and Troy has completed H-01 through H-07:

```bash
# From lmc-app/ directory:

# Build for production (auto-increments build number via eas.json autoIncrement:true)
eas build -p ios --profile production

# Wait for build to complete (Expo build server, ~15-20 min)
# Then submit to App Store Connect:
eas submit -p ios --profile production --latest
```

The `submit.production.ios` block in `eas.json` is already configured with:
- `appleId`: `blackmalibuinc@gmail.com`
- `ascAppId`: `6764298662`
- `appleTeamId`: `YNCLWQN2B8`
- `ascApiKeyPath` / `ascApiKeyId` / `ascApiKeyIssuerId` — all present

Troy does not need to enter credentials manually. EAS uses the `.p8` API key file at the path listed.

After `eas submit`, the build appears in App Store Connect → TestFlight within minutes. Troy then submits it for App Review from the App Store Connect web interface.

### H-09: TestFlight First (Recommended)
Before submitting to App Review, distribute via TestFlight to Troy and 2-3 friends. This catches:
- Missing permissions that only show on a real device (camera prompt, location prompt, push prompt).
- Any crash on launch that the simulator didn't catch.
- The "out of coverage" waitlist flow works as expected.

TestFlight does not require Apple's review — it goes live in minutes.

### H-10: Stripe LIVE Mode Flip (Gated on Delaware LLC)
This is the only submission item that is blocked on an external dependency. Stripe requires a legal US entity + EIN before enabling live mode for real money. Until the Delaware LLC is incorporated:
- The app ships to TestFlight in Stripe **test mode** (test cards work, real cards don't).
- App Store submission can happen in test mode — Apple reviewers will use the seeded demo account (which has no live payment flow anyway).
- When the LLC is ready, flip `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` from test to live in Supabase Vault and EAS environment variables. No code changes needed.

**This means the App Review submission can proceed in test mode.** The only "live money" blocker is for the public launch after review approval.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | No automated test runner configured in lmc-app/ (confirmed — no jest.config, no test scripts in package.json) |
| Config file | None — tests are manual or pgTAP (Supabase SQL tests) |
| Quick run command | `tsc --noEmit` (TypeScript check, run from `lmc-app/`) |
| Full suite command | `supabase db test` (pgTAP, SQL-only) |

### Phase Requirements → Test Map

| ID | Behavior | Test Type | Automated Command | Notes |
|----|----------|-----------|-------------------|-------|
| D-01 (hide growth) | Membership/invite not navigable from profile | Manual | — | Tap profile on device/simulator, confirm rows absent |
| D-02 (blur button) | SHOW_BLUR_TEST block absent from filming.tsx | Automated | `grep -c "SHOW_BLUR_TEST" lmc-app/app/\(scout\)/filming.tsx` → must return 0 | |
| D-03 (delete account) | Delete account Edge fn returns 200 and user is deleted | Manual + curl | `curl -X POST https://cawqasszfbzvbtunamda.supabase.co/functions/v1/delete-account -H "Authorization: Bearer <jwt>"` | |
| D-03 (cascade) | `profiles`, `saved_places`, `recents` rows gone after delete | Manual SQL | `SELECT * FROM profiles WHERE id = '<uid>'` → 0 rows | |
| D-03 (financial rows) | `payments` rows survive after user delete (anonymized) | Manual SQL | `SELECT * FROM payments WHERE ...` | |
| D-04 (dispatch_timeout) | `market_config.dispatch_timeout_s = 300` in live DB | Automated | `supabase db query "SELECT dispatch_timeout_s FROM public.market_config LIMIT 1;" --linked` | |
| D-05 (privacy links) | `Linking.openURL` called for privacy/terms rows in help.tsx | Manual | Tap rows in help screen on simulator | |

### Sampling Rate
- **Per task commit:** `cd lmc-app && npx tsc --noEmit`
- **Per wave merge:** tsc + manual walk through profile screen on simulator (confirm hidden rows, confirm delete-account row present)
- **Phase gate:** Full manual checklist pass before `eas build`

### Wave 0 Gaps
- [ ] No automated test for the delete-account Edge Function — a smoke-test curl script would be helpful but is not blocking.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Supabase Auth (already wired). Delete account must verify caller identity before deletion. |
| V3 Session Management | Yes | On successful delete, client calls `signOut()` to clear the local session. |
| V4 Access Control | Yes | Delete-account Edge Function uses `authedClient(req)` to resolve the caller's uid — never trust a client-supplied uid parameter. |
| V5 Input Validation | Yes (reason field) | Sanitize the optional `reason` text before inserting into `account_deletions` — max 500 chars, no injection risk via Supabase parameterized client but truncate defensively. |
| V6 Cryptography | No | Not applicable to this phase. |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User deletes another user's account (IDOR) | Tampering | Edge fn resolves uid from JWT via `auth.getUser()` — never accept uid from request body |
| User deletes account mid-active-check | Tampering / Denial of Service | Cancel open checks before deletion; Stripe hold released by sla-sweeper if not already captured |
| Replay: user signs back in after deletion | Spoofing | `auth.admin.deleteUser` invalidates the auth user; Apple/Google id_token → Supabase rejects (no matching user) |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `payments` table FK to `checks` may cascade-delete on user delete | Account Deletion / Pitfall 4 | Financial records lost; Stripe reconciliation breaks |
| A2 | `NSPhotoLibraryUsageDescription` is not exercised by the app | Permission Strings | If the app does exercise it (e.g., vision-camera saveToPhotos), removing the key causes a crash |
| A3 | dispatch_timeout_s was manually set to 3600 in the live DB during testing | dispatch_timeout section | If it's still 300 (from 0015 migration), this is a no-op and the note in CONTEXT.md was precautionary |
| A4 | The Stripe privacy manifest in `stripe-react-native` is correctly declared and does not require additional App Store Connect privacy declarations for payment data | Privacy Labels | If Stripe's SDK collects data LMC must declare, Apple will ask about it in review |

---

## Open Questions

1. **FK cascade chain from payments → checks → auth.users**
   - What we know: `payments` references `checks.id`; `checks` references `auth.users(id)`.
   - What's unclear: Does `payments` have `ON DELETE CASCADE`? Does `refund_requests`? The planner must read 0011_payments.sql in full to determine this before writing the delete-account migration.
   - Recommendation: Read the FK definitions in 0011 and 0004, then choose cascade vs anonymize accordingly.

2. **Seeker demo account with pre-seeded delivered check**
   - What we know: We need a delivered check that the reviewer can replay.
   - What's unclear: Troy needs to manually create this in the Supabase dashboard (or via a seed script).
   - Recommendation: Create a seed script (`scripts/seed-demo-account.ts`) as a task in the plan — Guy writes the script, Troy runs it once.

3. **Privacy policy content**
   - What we know: Troy must write and host it.
   - What's unclear: Whether Troy has already written one or needs a template.
   - Recommendation: Include a template privacy policy draft as a task output (Guy writes a draft, Troy approves and hosts it).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| EAS CLI | H-08 build + submit | Must verify | `eas --version` | n/a — required |
| Supabase CLI | C-01 Edge fn deploy | Must verify | `supabase --version` | n/a — required |
| App Store Connect API key | H-08 `eas submit` | Yes — `.p8` key exists at path in eas.json | — | Manual upload via ASC web UI |
| Active Apple Developer account | H-01-H-08 | Yes (per memory: Apple dev account ready) | — | — |
| Stripe LIVE mode | H-10 | Not yet — gated on Delaware LLC | — | Ship in test mode; flip when LLC ready |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: codebase] — `lmc-app/app/(seeker)/profile.tsx`, `app/(seeker)/membership.tsx`, `app/(seeker)/invite.tsx`, `app/(seeker)/help.tsx`, `app/(seeker)/search.tsx` (SEEKER-AUDIT.md), `app/(scout)/filming.tsx`, `app.config.js`, `eas.json`, `supabase/functions/_shared/supabase.ts`, `supabase/migrations/0015_sla_deadline.sql`
- [CITED: developer.apple.com/support/offering-account-deletion-in-your-app/] — Apple 5.1.1(v) account deletion requirement
- [CITED: developer.apple.com/app-store/review/guidelines/ §3.1.3] — Real-world services exempt from IAP
- [CITED: developer.apple.com/help/app-store-connect/reference/screenshot-specifications/] — Screenshot size requirements

### Secondary (MEDIUM confidence)
- [CITED: adapty.io/blog/can-you-use-stripe-for-in-app-purchases/] — Stripe for real-world services analysis (cross-verified with Apple guidelines §3.1.3)
- [CITED: developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/] — Demo account and review notes guidance

### Tertiary (LOW confidence — flagged)
- [ASSUMED] claims in Assumptions Log above — all flagged individually

---

## Metadata

**Confidence breakdown:**
- Code changes (C-01 through C-14): HIGH — all changes are visible in the codebase, verified by file reads
- Account deletion pattern: HIGH — Supabase admin API pattern is established; FK cascade needs verification (A1)
- Apple submission guidelines: HIGH — verified against official Apple docs
- Screenshot sizes: HIGH — verified against official Apple ASC docs (1320x2868 for 6.9-inch)
- Stripe vs IAP: HIGH — explicitly stated in Apple guideline §3.1.3 and widely verified
- dispatch_timeout current live value: MEDIUM — migration sets 300 but live DB override is possible (A3)

**Research date:** 2026-06-22
**Valid until:** 2026-07-22 (Apple guidelines rarely change mid-year; EAS CLI versions are stable)
