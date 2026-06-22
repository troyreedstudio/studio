# Phase 10: Push Notifications - Research

**Researched:** 2026-06-22
**Domain:** Expo Push Notifications / Supabase Edge Functions / Postgres triggers
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 transport:** Expo Push (expo-notifications + Expo's push service / ExpoPushToken). Standard for Expo; no custom APNs/FCM server code. iOS needs the APNs key configured in EAS credentials (Apple dev account ready) — a setup step, flagged.
- **D-02 token storage:** `device_push_tokens (user_id, token, platform, updated_at)` — one row per device, upserted on app start when permission granted. RLS: a user manages only their own tokens.
- **D-03 triggers (server-owned):** fire from the SAME server transitions that already exist — on `dispatching` (push in-range online scouts via the existing geofence query) and on `delivered` (push the seeker). Best-effort, fire-and-forget (a push failure never blocks the transition — mirror the fraud-eval pattern). Reuse pg triggers / the existing Edge flow or a notify Edge Function called where transitions happen.
- **D-04 prefs:** read notification_prefs (Phase 9). Default all on; a category the user disabled is skipped. If Phase 9's column isn't merged yet, degrade gracefully (push all).
- **D-05 scope of events for v1:** job-nearby (scout) + video-ready (seeker). Accept/earnings/rating pushes = fast-follow.

### Claude's Discretion
- Notification copy
- The exact trigger mechanism (pg trigger + pg_net to an Edge fn vs calling a send-push fn inline in the existing transition paths)
- Batching to Expo (100/req)

### Deferred Ideas (OUT OF SCOPE)
- Rich/actionable notifications
- SMS/email fallback
- Scout cooldown nudges
- Marketing pushes
- Accept/earnings/rating push events
</user_constraints>

---

## Summary

This phase wires Expo Push Notifications end-to-end: a client-side token registration step on sign-in, a server-side `device_push_tokens` table, and two server-initiated fire-and-forget push paths — one for Scouts (when a check enters `dispatching`) and one for the Seeker (when a check enters `delivered`). Everything is New-Arch-safe and buildable offline; live iOS delivery requires one human step (APNs key in EAS credentials).

The recommended trigger mechanism is **inline calls from the existing Edge Function transition points** (not a pg trigger). Specifically: in `transition_check` → no, because that is a SECURITY DEFINER SQL function. Instead, the push fires from the two places that already orchestrate the transitions — `mux-webhook` (for `delivered`, where it currently fires `stripe-capture` and `fraud-eval`) and a new `dispatch-push` step called by whatever calls `transition_check('dispatching')`. A single new `send-push` Edge Function handles the Expo Push API call, looks up tokens, and respects `notification_prefs`. This mirrors the fraud-eval fire-and-forget pattern exactly, keeping the pattern consistent and testable.

**Primary recommendation:** Add `expo-notifications ~0.32.17` to the client, register the push token in a `registerPushToken()` helper called after sign-in, store it in `device_push_tokens`, and call `send-push` fire-and-forget from `mux-webhook` (delivered path) and from `transition_check`'s `dispatching` caller via a pg trigger on `checks.status` → `dispatching`.

---

## Project Constraints (from CLAUDE.md)

These directives from `./CLAUDE.md` and `lmc-app/CLAUDE.md` constrain all planning decisions:

- Files must stay under 500 lines
- Server owns every state transition and secret; client holds no business logic
- `mux-webhook` is the SOLE driver of `delivered` (service role) — the push to the Seeker belongs there, mirroring `stripe-capture` and `fraud-eval`
- New Architecture is ON (`ios.newArchEnabled: true` in `app.config.js`)
- EAS projectId is `59bc5e82-de99-4541-b883-82e09005acfc` — confirmed in `app.config.js` `extra.eas.projectId`
- Bundled config pattern (no `expo-constants` Extra, no `.env`) — push token registration must read projectId via `import { EAS_PROJECT_ID } from './config'` same as `SUPABASE_URL`
- Never commit secrets; `EXPO_ACCESS_TOKEN` (if used) lives in Deno.env only
- `supabase.ts` pattern: `serviceClient()` and `authedClient(req)` — `send-push` uses `serviceClient()`
- All Edge Functions: `import.meta.main` guard so `deno test --allow-env` imports without binding a port
- Deploy mux-webhook and any no-auth Edge Function with `--no-verify-jwt`; user-callable functions with `verify_jwt=true`
- Files <500 lines; split `send-push` into handler + entrypoint if needed

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-notifications | ~0.32.17 | Push token registration + foreground notification handling | SDK-54 tier; New-Arch-safe; all sdk-* tags confirmed [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-device | ~7.0.3 | Detect physical device vs simulator (required before registering) | Used in permission + token flow to skip simulators |
| expo-constants | already installed ~18.0.13 | Access EAS projectId at runtime | Already a dep; `Constants.expoConfig.extra.eas.projectId` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Expo Push Service | Raw APNs + FCM server | Expo handles APNs/FCM routing, no custom certs in code — for a 2-person team this is the right call |
| pg trigger + pg_net to send-push | Inline call in mux-webhook / dispatch path | Both work; inline is simpler (no migration, no net.http_post auth header plumbing), stays with the existing fraud-eval / stripe-capture pattern |

**Installation (Wave 0):**
```bash
cd lmc-app && npx expo install expo-notifications expo-device
```

**Version verification:** [VERIFIED: npm registry — `npm view expo-notifications dist-tags` returns `sdk-54: 0.32.17`]

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
lmc-app/app/lib/
  push.ts                    # registerPushToken(), upsertToken(), token helpers

supabase/
  migrations/
    0018_device_push_tokens.sql   # table + RLS + upsert helper RPC
  functions/
    send-push/
      index.ts               # Expo Push API call, token lookup, prefs check
```

Changes to existing files:
- `app.config.js` — add `expo-notifications` plugin entry
- `app/lib/auth.ts` — call `registerPushToken()` after successful sign-in
- `supabase/functions/mux-webhook/index.ts` — add fire-and-forget `send-push` invoke on `delivered` path (step 8c)
- `supabase/migrations/0012_...sql` — (phase creates a new migration, not modifying existing ones)

### Pattern 1: Client Token Registration (New-Arch-safe)

**What:** Request permission, get `ExpoPushToken`, upsert into `device_push_tokens`.
**When to use:** Called once after every sign-in (Apple or Google). Token can change; upsert is idempotent.

```typescript
// Source: docs.expo.dev/push-notifications/push-notifications-setup/
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function registerPushToken(): Promise<string | null> {
  // Simulators never get real APNs tokens — skip silently.
  if (!Device.isDevice) return null;

  // Android 13+ requires explicit channel before requesting.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  // projectId must come from the bundled config (expo-constants Extra is null in Release).
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) throw new Error('EAS projectId missing from app config');

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return token;  // 'ExponentPushToken[xxxxxx]'
}
```

**New Architecture note:** expo-notifications 0.32.x is fully New-Arch-safe. There is one known SDK-54 caveat: **silent push (content-available) fails in Bridgeless mode on iOS** [CITED: github.com/expo/expo/issues/43104]. LMC only uses standard push messages (title + body), not silent pushes — this caveat does not apply.

### Pattern 2: Token Upsert After Sign-in

**What:** After `signInWithApple()` or `signInWithGoogle()` resolves, call `registerPushToken()` then upsert.
**Where:** End of `signInWithApple` and `signInWithGoogle` in `app/lib/auth.ts`.

```typescript
// In auth.ts — added at the end of each sign-in function
// Source: pattern from mux-webhook inline-invoke (fire-and-forget, non-blocking)
import { registerPushToken, upsertPushToken } from './push';
import { Platform } from 'react-native';

// After supabase.auth.signInWithIdToken succeeds:
registerPushToken()
  .then((token) => {
    if (token) upsertPushToken(token, Platform.OS);
  })
  .catch(() => {/* push registration never blocks sign-in */});
```

### Pattern 3: `send-push` Edge Function

**What:** Receives `{ checkId, event: 'job-nearby' | 'video-ready' }`, looks up recipients + their tokens, checks prefs, batches to Expo Push API.
**Fire-and-forget from:** `mux-webhook` step 8c (video-ready → Seeker), pg trigger step (job-nearby → in-range Scouts).

```typescript
// Source: docs.expo.dev/push-notifications/sending-notifications/ + sla-sweeper pattern
// supabase/functions/send-push/index.ts

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

export async function handleSendPush(
  checkId: string,
  event: 'job-nearby' | 'video-ready',
  svc: Svc,
): Promise<void> {
  // 1. Resolve recipients + tokens
  // For video-ready: seeker_id from checks; check notification_prefs.delivered
  // For job-nearby: use list_open_checks_for_scout pattern to get in-range online scouts
  // then look up their tokens from device_push_tokens

  // 2. Build message batch (max 100 per call)
  // 3. POST to https://exp.host/--/api/v2/push/send — no secret needed for basic sends
  // 4. Log but never throw — push failure never blocks the transition
}
```

No Expo access token is needed for basic sends. [VERIFIED: docs.expo.dev/push-notifications/sending-notifications/ — "By default, access tokens are not required"]

### Pattern 4: Trigger Mechanism (RECOMMENDED: pg trigger on checks → send-push)

**Decision rationale (Claude's Discretion):**

Two valid options:

| Option | Mechanism | Pros | Cons |
|--------|-----------|------|------|
| **A (RECOMMENDED)** | pg trigger on `checks.status = 'dispatching'` calls `send-push` via `net.http_post()` | Fires every time status goes to `dispatching` regardless of which Edge Fn drove it (reset_check_for_redispatch, createCheck path, any future path) | Needs auth header in pg_net call; one new migration |
| B | Inline in mux-webhook for `delivered`, inline in `createCheck`/dispatch path for `dispatching` | No migration for trigger; consistent with fraud-eval pattern | Only covers the explicit code paths — easy to miss re-dispatch path |

**RECOMMENDATION: Option A (pg trigger) for the `dispatching` event; Option B (inline in mux-webhook) for the `delivered` event.**

Rationale: `dispatching` is reached via multiple code paths today (direct `transition_check` from `createCheck`, `reset_check_for_redispatch` on GPS reject). A pg trigger fires unconditionally on any status write — no risk of missing a path. The `delivered` event has exactly one source (mux-webhook) making the inline pattern safe and consistent with the existing fraud-eval step.

The pg trigger pattern:

```sql
-- In migration 0018
CREATE OR REPLACE FUNCTION public.notify_push_on_dispatching()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'dispatching' AND (OLD.status IS DISTINCT FROM 'dispatching') THEN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-push',
      body := jsonb_build_object('checkId', NEW.id, 'event', 'job-nearby'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER checks_push_on_dispatching
  AFTER UPDATE ON public.checks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_push_on_dispatching();
```

Note: `current_setting('app.supabase_url')` and `current_setting('app.service_role_key')` are set via Supabase Vault / database secrets (`ALTER DATABASE ... SET app.supabase_url = ...`). This avoids hardcoding the URL or key in migration SQL.

**Alternative (simpler for dev):** Use Supabase Dashboard → Database Webhooks to create the trigger via UI — same pg_net under the hood, no SQL migration needed. Good for dev; the SQL migration approach is more reproducible and testable with pgTAP.

### Anti-Patterns to Avoid

- **Registering the push token in a `useEffect` on a screen:** Registration must happen after the auth session is confirmed (after sign-in), not on an arbitrary screen mount. A user navigating before sign-in completes will get a null userId and the upsert will fail.
- **Calling `getExpoPushTokenAsync` without a `projectId`:** On Expo SDK 54, this throws. The projectId is `59bc5e82-de99-4541-b883-82e09005acfc` (confirmed in `app.config.js extra.eas.projectId`). [VERIFIED: app.config.js]
- **Throwing on push failure:** Push errors must never propagate to the caller. `send-push` swallows all errors, logs to event_log, and returns 200. Mirror fraud-eval.
- **Exposing the service-role key to the client:** `send-push` runs server-side only; the client never calls the Expo Push API directly.
- **Skipping the `Device.isDevice` check:** `getExpoPushTokenAsync` throws on iOS Simulator. Always guard.
- **Using expo-notifications in Expo Go (SDK 54):** Expo Push does not work in Expo Go from SDK 53+. Must use an EAS dev build or TestFlight build. [CITED: docs.expo.dev/push-notifications/push-notifications-setup/]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| APNs/FCM certificate management | Custom APNs HTTP/2 client | Expo Push Service (exp.host) | Expo manages rotating APNs keys, FCM credentials, and delivery retry — handling these for a 2-person team is weeks of infra work |
| Token format validation | Custom regex on the token string | Trust what `getExpoPushTokenAsync` returns | Expo tokens are always `ExponentPushToken[...]`; the Push API validates them |
| Retry logic on push failure | Custom exponential backoff loop | Fire-and-forget; receipts pattern for observability | Push is best-effort; blocking a delivery transition on push retry is the wrong trade |
| Batching logic | Manual chunking | Split array into 100-item chunks | Expo enforces 100/request; simple `chunk(tokens, 100)` is sufficient |

---

## `device_push_tokens` Table

### Table Shape

```sql
-- Migration 0018
CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text         NOT NULL,
  platform    text         NOT NULL CHECK (platform IN ('ios','android','web')),
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)  -- one row per (user, device); token can move between users on shared devices
);

CREATE INDEX IF NOT EXISTS device_push_tokens_user_idx
  ON public.device_push_tokens (user_id);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

-- User manages only own tokens
CREATE POLICY device_push_tokens_own_select ON public.device_push_tokens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY device_push_tokens_own_insert ON public.device_push_tokens
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY device_push_tokens_own_update ON public.device_push_tokens
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY device_push_tokens_own_delete ON public.device_push_tokens
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

### Upsert Helper (client-side via `supabase-js`)

```typescript
// app/lib/push.ts
export async function upsertPushToken(token: string, platform: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await (supabase as any)
    .from('device_push_tokens')
    .upsert(
      { user_id: user.id, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' }
    );
}
```

Note: `device_push_tokens` won't be in `database.types.ts` until types are regenerated after the migration — use `as any` cast (established Phase-5 pattern).

### Token Lifecycle

| Event | Action |
|-------|--------|
| Sign-in | Upsert token |
| Sign-out | Delete token for this device |
| `DeviceNotRegistered` receipt from Expo Push | Delete stale token in `send-push` |
| App reinstall | New token upserted on next sign-in; old token produces `DeviceNotRegistered` and is cleaned up |

---

## `send-push` Edge Function Design

### Responsibilities
1. Receive `{ checkId, event }` from pg trigger (job-nearby) or mux-webhook (video-ready)
2. Resolve recipient user IDs:
   - `job-nearby`: call `list_open_checks_for_scout` — returns in-range online Scouts (the same RPC the dashboard polls). Read `scout_id` set from that result.
   - `video-ready`: read `seeker_id` from `checks` where `id = checkId`
3. For each recipient: check `notification_prefs` from `profiles` — skip if the relevant category is disabled
4. Look up `device_push_tokens` for each recipient
5. Batch into groups of 100, POST to `https://exp.host/--/api/v2/push/send`
6. On `DeviceNotRegistered` receipt: delete stale token
7. Log `push.sent` / `push.skipped_prefs` to `event_log`; never throw

### `notification_prefs` key mapping (Phase 9 column)
| Push event | `notification_prefs` key | Default if null |
|-----------|--------------------------|----------------|
| video-ready (Seeker) | `delivered` | on |
| job-nearby (Scout) | `job-nearby` (new key, add to notifications.tsx) | on |

Phase 9 adds `notification_prefs jsonb` to `profiles` (migration 0017). If Phase 9 is not yet merged when Phase 10 executes, `send-push` reads `notification_prefs` and gets `null` → treats all categories as enabled (graceful degrade per D-04).

### Copy (Claude's Discretion)

| Event | Title | Body |
|-------|-------|------|
| `job-nearby` | "New check nearby" | "A $X check just dropped near you — tap to claim." |
| `video-ready` | "Your check is ready" | "Your video from [venue] is ready to watch." |

---

## Common Pitfalls

### Pitfall 1: `getExpoPushTokenAsync` without `projectId` throws
**What goes wrong:** On SDK 54, calling `getExpoPushTokenAsync()` with no argument throws `Error: Notification registration error`. Older SDK behavior (auto-detect) was removed.
**Why it happens:** SDK 54 changed the API to require explicit `projectId`.
**How to avoid:** Always pass `{ projectId }` from `app.config.js extra.eas.projectId`. The value is `59bc5e82-de99-4541-b883-82e09005acfc`.
**Warning signs:** Error message "Notification registration error" on first sign-in.

### Pitfall 2: Token registration in Expo Go
**What goes wrong:** `getExpoPushTokenAsync` throws inside Expo Go on SDK 53+.
**Why it happens:** Expo Go no longer proxies APNs in SDK 53+. The token returned is not a real APNs token.
**How to avoid:** Always test push in an EAS dev build or TestFlight. `npx expo start` won't work for this feature.

### Pitfall 3: pg trigger fires before transaction commits → net.http_post fires, but Edge Fn reads old status
**What goes wrong:** The `AFTER UPDATE` trigger fires inside the transaction; `net.http_post` is async and deferred until commit. The Edge Function is typically called after the transaction commits. But if `send-push` reads the `checks` row immediately, it may race with the commit.
**Why it happens:** `net.http_post` queues the request; the HTTP call happens after the function returns but the timing is immediate-post-commit.
**How to avoid:** `send-push` for `job-nearby` doesn't need to re-read `checks.status` — it receives `checkId` in the payload and calls `list_open_checks_for_scout` which is the in-range Scout query, not a status check. This sidesteps the race.

### Pitfall 4: Scout on-device token ≠ active Scout online
**What goes wrong:** A Scout who has gone offline still receives a push because their token is in `device_push_tokens`.
**Why it happens:** Token table doesn't reflect online status; that's `scout_locations.is_online`.
**How to avoid:** For `job-nearby`, resolve recipient IDs from `list_open_checks_for_scout` (which already filters `is_online = true`) before looking up their tokens. Token table is only used for token lookup — it never dictates audience.

### Pitfall 5: `send-push` throws and blocks the `delivered` transition in mux-webhook
**What goes wrong:** Seeker never receives their clip because `send-push` threw and the calling code propagated it.
**Why it happens:** Not wrapping the `invoke('send-push')` call in try/catch.
**How to avoid:** Same pattern as fraud-eval and signage-check in `mux-webhook` — wrap in try/catch, swallow all errors. Push is advisory.

### Pitfall 6: Duplicate `DeviceNotRegistered` tokens accumulate
**What goes wrong:** Table grows with stale tokens; push attempts to invalid tokens slow delivery.
**Why it happens:** Not cleaning up on `DeviceNotRegistered` receipts.
**How to avoid:** After POSTing to Expo Push API, check the ticket objects in the response for `status === 'error'` and `details.error === 'DeviceNotRegistered'`. Delete those tokens in `send-push`. [CITED: docs.expo.dev/push-notifications/sending-notifications/]

### Pitfall 7: `app.config.js` not including the expo-notifications plugin
**What goes wrong:** iOS build runs, push permission is granted, but APNs entitlement is missing → no push delivery on device.
**Why it happens:** The `expo-notifications` config plugin must be in the `plugins` array to add the APNs entitlement to the iOS binary. Without it, tokens register but APNs rejects delivery.
**How to avoid:** Add `'expo-notifications'` (or `['expo-notifications', { ...opts }]`) to `plugins` in `app.config.js`. SDK 54 deprecates the old `notification` config key in favour of this plugin.

---

## APNs / iOS Credential Step (human action required)

**This is the ONLY step that blocks live iOS push delivery and requires a human action outside code.**

What is needed:
1. In EAS Build credentials (`eas.json`), an **APNs Authentication Key** (a `.p8` file from Apple Developer) must be registered against the bundle ID `Com.BlackMalibuinc.letmecheck`.
2. When Troy runs `eas build -p ios` for the first time after Phase 10 is coded, EAS CLI will prompt: "Would you like to generate an Apple Push Notifications service key?" → answer **yes**. EAS handles this automatically using the Apple Developer account.
3. No code change is needed for this step — it is a credential configuration, not a code change.

**What is buildable without this step:**
- The entire token registration flow (code, table, RLS)
- The `send-push` Edge Function (testable with deno test)
- The pg trigger migration (testable with pgTAP)
- The `mux-webhook` inline invoke (testable with existing test harness)
- TypeScript type checks

**What requires the APNs key:**
- Real push delivery on a physical iOS device (TestFlight or Release build)

**Action item for Troy:** When running the next EAS build after Phase 10 is merged, answer "yes" when EAS asks about APNs key setup. That's all.

---

## Runtime State Inventory

Phase 10 is additive (new table, new Edge Function, new trigger). No renames or data migrations. Explicit answers per category:

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | No existing push token records (table doesn't exist yet) | None — table is new |
| Live service config | No existing push-related Edge Functions deployed | New `send-push` deploy required |
| OS-registered state | None — push tokens are managed by Apple/Expo, not OS task registration | None |
| Secrets/env vars | No `EXPO_ACCESS_TOKEN` needed (basic sends require no secret) [VERIFIED: docs.expo.dev] | None required for basic sends |
| Build artifacts | `expo-notifications` not yet installed; `app.config.js` plugin not yet added | `npx expo install expo-notifications expo-device`; add plugin to app.config.js; new EAS build needed for APNs entitlement |

---

## Code Examples

### `app.config.js` plugin addition

```javascript
// Source: docs.expo.dev/push-notifications/push-notifications-setup/
// Add to the plugins array in app.config.js
[
  'expo-notifications',
  {
    // No icon/color/sounds needed for v1 — all optional
    // enableBackgroundRemoteNotifications defaults to false (correct for LMC)
  }
]
```

### Expo Push API call (inside `send-push`)

```typescript
// Source: docs.expo.dev/push-notifications/sending-notifications/
const response = await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  body: JSON.stringify(messages),  // array of up to 100 message objects
});
const { data: tickets } = await response.json();

// Check for DeviceNotRegistered
for (let i = 0; i < tickets.length; i++) {
  if (tickets[i].status === 'error' &&
      tickets[i].details?.error === 'DeviceNotRegistered') {
    // Delete messages[i].to token from device_push_tokens
  }
}
```

### `mux-webhook` step 8c addition (video-ready → Seeker push)

```typescript
// Appended after the existing step 8b (fraud-eval) in mux-webhook/index.ts
// Source: existing mux-webhook fraud-eval pattern (lines 196-199 of index.ts)
try {
  await deps.svc.functions.invoke('send-push', {
    body: { checkId, event: 'video-ready' }
  });
} catch (_e) { /* advisory — D-03, push never blocks delivery */ }
```

### Chunk helper (no external dep needed)

```typescript
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}
// Usage: chunk(messages, 100).forEach(batch => sendBatch(batch));
```

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| expo-notifications | Client token registration | Not installed | — (install needed) | None — new dependency |
| expo-device | Physical device check | Not installed | — (install needed) | None — required |
| Expo Push Service (exp.host) | Push delivery | Cloud service, no install | Always available | None needed |
| APNs key in EAS credentials | Live iOS push delivery | Not configured (human step) | — | Token registration works; delivery fails silently until configured |
| pg_net extension | pg trigger → send-push | Confirmed enabled in Phase 7 (sla-sweeper uses it via pg_cron + pg_net) | Enabled | Dashboard Webhook (UI) |
| Supabase Vault (for pg trigger secrets) | Auth header in net.http_post | Available on all plans | — | Hard-code SUPABASE_URL as a migration constant (less ideal) |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pgTAP (DB) + Deno test (Edge Fn) + vitest (client helpers) |
| Config file | `supabase/tests/` (pgTAP), `supabase/functions/send-push/index.test.ts` (Deno), `lmc-app/` (vitest) |
| Quick run command (DB) | `cd lmc-app && npm run test:db` |
| Quick run command (Edge Fn) | `cd supabase/functions && deno test send-push/index.test.ts --allow-env` |
| Full suite | `npm run test:db && deno test supabase/functions --allow-env && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PUSH-01 | `device_push_tokens` table exists + RLS allows own-user insert/select | unit (pgTAP) | `npm run test:db` | No — Wave 0 |
| PUSH-02 | Upsert is idempotent (same token, same user = 1 row) | unit (pgTAP) | `npm run test:db` | No — Wave 0 |
| PUSH-03 | RLS blocks cross-user token read | unit (pgTAP) | `npm run test:db` | No — Wave 0 |
| PUSH-04 | `send-push` resolves Seeker for video-ready and sends to Expo endpoint | unit (Deno, mock fetch) | `deno test send-push/` | No — Wave 0 |
| PUSH-05 | `send-push` resolves in-range online Scouts for job-nearby | unit (Deno, mock svc) | `deno test send-push/` | No — Wave 0 |
| PUSH-06 | `send-push` skips user when `notification_prefs.delivered = false` | unit (Deno) | `deno test send-push/` | No — Wave 0 |
| PUSH-07 | `send-push` degrades gracefully when `notification_prefs` is null | unit (Deno) | `deno test send-push/` | No — Wave 0 |
| PUSH-08 | `send-push` deletes stale token on `DeviceNotRegistered` receipt | unit (Deno, mock fetch) | `deno test send-push/` | No — Wave 0 |
| PUSH-09 | `send-push` never throws (caught errors return 200) | unit (Deno) | `deno test send-push/` | No — Wave 0 |
| PUSH-10 | pg trigger fires on `checks.status = 'dispatching'` (UPDATE) | integration (pgTAP) | `npm run test:db` | No — Wave 0 |
| PUSH-11 | `mux-webhook` smoke test still passes after step 8c addition | unit (Deno) | `deno test mux-webhook/` | Yes (existing) |
| PUSH-12 | `registerPushToken()` skips on non-device and returns null | unit (vitest, mock Device) | `npm test` | No — Wave 0 |
| PUSH-13 | `upsertPushToken()` calls supabase upsert with correct shape | unit (vitest, mock supabase) | `npm test` | No — Wave 0 |

### Sampling Rate
- Per task commit: `npm run test:db` (pgTAP, 30 s) + `deno test send-push/` (Deno, <10 s)
- Per wave merge: full suite (`npm run test:db && deno test supabase/functions --allow-env && npm test`)
- Phase gate: Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `supabase/tests/0018_push_tokens.test.sql` — PUSH-01, PUSH-02, PUSH-03, PUSH-10
- [ ] `supabase/functions/send-push/index.test.ts` — PUSH-04 through PUSH-09
- [ ] `lmc-app/app/lib/push.test.ts` — PUSH-12, PUSH-13

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Push tokens are user-scoped (RLS `auth.uid() = user_id`); token upsert requires authenticated session |
| V3 Session Management | no | Push tokens survive session expiry by design (user wants pushes even when not actively using app) |
| V4 Access Control | yes | `send-push` uses `serviceClient()` (service role); RLS prevents cross-user token reads |
| V5 Input Validation | yes | `checkId` validated as UUID before any DB query; `event` is an enum literal |
| V6 Cryptography | no | No new cryptographic operations; Expo Push API is HTTPS |

### Known Threat Patterns for Push Notifications

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR: pushing another user's token | Tampering | RLS: `user_id = auth.uid()` on all client-side operations; `send-push` derives recipient from `checkId` (server-side), not from client input |
| Push spam: triggering many dispatching transitions to flood Scouts | Denial | Existing `createCheck` rate limits + payment requirement; each push requires a real $15-20 payment |
| Stale token accumulation: invalid tokens slow delivery | Denial | `send-push` cleans `DeviceNotRegistered` tokens inline |
| Token hijack: user A registers user B's token | Tampering | RLS `WITH CHECK (auth.uid() = user_id)` on INSERT — a user can only insert tokens under their own user_id |
| Exposing service-role key in client | Information Disclosure | `send-push` is server-only; the client calls `upsertPushToken` via the authenticated Supabase client (anon key + RLS), never the Expo Push API directly |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| expo-notifications in Expo Go | Requires EAS Dev Build (SDK 53+) | SDK 53 (2024) | All push testing must use an EAS build — affects QA workflow |
| `notification` config key in app.config.js | `expo-notifications` config plugin | SDK 54 | The old key is deprecated; use the plugin |
| `getExpoPushTokenAsync()` no args | Must pass `{ projectId }` | SDK 52+ | Mandatory projectId parameter |

**Deprecated/outdated:**
- Passing `experienceId` instead of `projectId` to `getExpoPushTokenAsync` — removed in SDK 52.
- `Notifications.getDevicePushTokenAsync()` — this returns the raw APNs/FCM token, NOT an Expo token. Use `getExpoPushTokenAsync` for the Expo Push Service.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `notification_prefs` column on `profiles` will exist when Phase 10 executes (from Phase 9 migration 0017) | send-push prefs check | Low — `send-push` degrades gracefully to push-all if column is null (D-04 explicit) |
| A2 | `list_open_checks_for_scout` RPC returns the correct in-range online Scout set for the `job-nearby` audience | send-push audience | Medium — this is the same RPC the dashboard uses; if it has bugs they're already in production |
| A3 | Supabase Vault / `current_setting()` is available to set URL + service-role key for the pg trigger `net.http_post` headers | pg trigger auth | Medium — alternative is Supabase Database Webhook UI (which sets headers automatically) |

**If A3 is wrong:** Use the Supabase Dashboard → Database Webhooks instead of a manual SQL trigger. Same outcome, no migration needed for the trigger.

---

## Open Questions

1. **Scout `notification_prefs` key name**
   - What we know: Phase 9 adds `notification_prefs jsonb` to profiles with keys like `delivered`, `scout-assigned`, etc. from `notifications.tsx`
   - What's unclear: The Scout job-nearby key doesn't exist in the current `notifications.tsx` SETTINGS array (which is Seeker-focused). A Scout notification settings UI may be needed, or the `job-nearby` key can be a new addition.
   - Recommendation: Add `{ id: 'job-nearby', label: 'Job Alerts', sub: 'New checks nearby', defaultValue: true }` to a Scout notifications screen. Default on. Planner should include this as a sub-task.

2. **pg trigger vs Supabase Database Webhook**
   - What we know: Both use pg_net; Database Webhook is UI-configurable and sets auth headers automatically.
   - What's unclear: Whether Database Webhooks survive a `supabase db reset` in local dev (they live in the dashboard, not in migration SQL).
   - Recommendation: Use the SQL migration trigger (reproducible, testable with pgTAP). Include `SUPABASE_URL` and the service-role key as migration-time constants or use `current_setting()` with Vault.

---

## Sources

### Primary (HIGH confidence)
- `npm view expo-notifications dist-tags` — confirmed `sdk-54: 0.32.17` [VERIFIED: npm registry]
- `app.config.js` — confirmed `extra.eas.projectId: '59bc5e82-de99-4541-b883-82e09005acfc'` and `newArchEnabled: true` [VERIFIED: codebase]
- `supabase/functions/mux-webhook/index.ts` — confirmed `delivered` transition point and fire-and-forget pattern (fraud-eval, step 8b) [VERIFIED: codebase]
- `supabase/functions/sla-sweeper/index.ts` — confirmed pg_net / pg_cron are enabled (sla-sweeper uses them) [VERIFIED: codebase]
- [docs.expo.dev/push-notifications/sending-notifications/](https://docs.expo.dev/push-notifications/sending-notifications/) — confirmed no access token for basic sends; 100/batch limit; `DeviceNotRegistered` cleanup [CITED]
- [docs.expo.dev/push-notifications/push-notifications-setup/](https://docs.expo.dev/push-notifications/push-notifications-setup/) — confirmed `getExpoPushTokenAsync({ projectId })` signature; APNs key via EAS [CITED]
- [supabase.com/docs/guides/database/extensions/pg_net](https://supabase.com/docs/guides/database/extensions/pg_net) — confirmed `net.http_post()` signature and async-after-commit behavior [CITED]

### Secondary (MEDIUM confidence)
- [github.com/expo/expo/issues/43104](https://github.com/expo/expo/issues/43104) — SDK 54 silent push caveat in Bridgeless mode (does not affect LMC — we use standard push) [CITED]
- [expo.dev/changelog/sdk-54](https://expo.dev/changelog/sdk-54) — expo-notifications deprecated exports removed; config plugin replaces `notification` key [CITED]
- [supabase.com/docs/guides/database/webhooks](https://supabase.com/docs/guides/database/webhooks) — Database Webhook as alternative to manual trigger [CITED]

### Tertiary (LOW confidence — for context)
- Various community posts on DeviceNotRegistered cleanup patterns — aligned with official Expo docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `expo-notifications ~0.32.17` confirmed from npm registry; SDK-54 tag exact
- Architecture: HIGH — trigger mechanism, mux-webhook inline, table shape all derived from verified codebase patterns
- Pitfalls: HIGH — confirmed from official Expo docs and existing codebase decisions (New Arch, projectId requirement)
- APNs credential step: HIGH — confirmed via EAS docs; the human action is clear and well-scoped

**Research date:** 2026-06-22
**Valid until:** 2026-09-22 (expo-notifications minor versions; SDK-55 will introduce new changes but SDK-54 tag is stable)

---

## RESEARCH COMPLETE

**Phase:** 10 - Push Notifications
**Confidence:** HIGH

### Key Findings

- `expo-notifications ~0.32.17` is the SDK-54-tagged version (confirmed from npm registry); it is New-Arch-safe. The only New-Arch caveat (silent push in Bridgeless mode) does not apply — LMC uses standard push only.
- The EAS `projectId` (`59bc5e82-de99-4541-b883-82e09005acfc`) is already in `app.config.js extra.eas.projectId`; token registration uses `Constants.expoConfig?.extra?.eas?.projectId` — no new config needed.
- Recommended trigger mechanism: **pg trigger (AFTER UPDATE on checks) for the `dispatching` event** (catches all paths including GPS re-dispatch); **inline `mux-webhook` step 8c for the `delivered` event** (single path, mirrors fraud-eval).
- `send-push` Edge Function is fire-and-forget, no Expo access token required, handles token cleanup on `DeviceNotRegistered`, respects `notification_prefs`, deploys `--no-verify-jwt`.
- The APNs credential step is one human action: answer "yes" during the next `eas build -p ios` when prompted. No code change.
- `expo-notifications` is NOT yet in `package.json`; `expo-device` is also not installed. Both need `npx expo install` in Wave 0.
- Push does not work in Expo Go on SDK 54 — all push testing must use an EAS dev build or TestFlight.

### File Created
`.planning/phases/10-push-notifications-expo-push-device-tokens-table-notify-scou/10-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | npm registry confirms version; New-Arch compat confirmed |
| Architecture | HIGH | Trigger mechanism derived from existing codebase patterns |
| Pitfalls | HIGH | Official Expo docs + codebase analysis |
| APNs credential step | HIGH | EAS docs explicit; human action is one prompt |

### Open Questions
- Scout notification prefs UI (job-nearby toggle) may need a small addition to the notifications screen or a separate Scout notifications screen.
- pg trigger auth header approach (Vault vs constants) — Supabase Database Webhook UI is a valid fallback.

### Ready for Planning
Research complete. Planner can now create PLAN.md files.
