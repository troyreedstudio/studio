# Scout-Side Audit
_Generated: 2026-06-22_

---

## 1. Summary Table

| Screen / File | Status | Backend needed | Net-new? | Effort |
|---|---|---|---|---|
| `(scout)/dashboard.tsx` | WIRED (Phase 2/5) | Realtime push for incoming job | Partial (push notif net-new) | M |
| `(scout)/filming.tsx` | WIRED (Phase 3/5/6) | SLA deadline enforcement; trouble-report backend | Partial | M |
| `(scout)/submitted.tsx` | WIRED (Phase 3) | Realtime stage advance; earnings credit (Phase 4) | No (Realtime exists); yes (earnings credit) | M |
| `(scout)/earnings.tsx` | MOCK | Real earnings + payout history API | Net-new DB queries + Edge Function | L |
| `(scout)/profile.tsx` | PARTIAL | Real profile data; live availability sync | Existing helpers (auth, scout-location) | S |
| `(scout)/withdraw.tsx` | MOCK | Stripe Connect instant/standard payout initiation | Edge Function exists (stripe-connect-onboard/status); withdraw RPC net-new | M |
| `scout/payout.tsx` | WIRED (Phase 4) | stripe-connect-onboard + stripe-connect-status | No (both deployed) | S |
| `scout/become.tsx` | MOCK (nav shell) | None (entry page to onboarding flow) | No | S |
| `scout/identity.tsx` | MOCK | Stripe Identity (Persona/Stripe hosted) | Net-new | M |
| `scout/approved.tsx` | MOCK | Eligibility gate read from Supabase | Existing (getConnectStatus) | S |
| `scout/rules.tsx` | MOCK (static) | Consent timestamp write | Existing (accepted_scout_code_at in DB) | S |
| `state/scout-earnings.ts` | PARTIAL (in-memory) | Server-side daily/session earnings query | Net-new DB read or Edge Function | M |
| `(seeker)/waiting.tsx` | WIRED (Phase 2/5) | SLA deadline / auto-expire on no-scout | `expire_stale_dispatching` pg_cron (noted blocker) | M |

---

## 2. Screen-by-Screen Detail

### `(scout)/dashboard.tsx` — 789 lines
**What it does:** Online/offline toggle; foreground GPS watch that upserts Scout location every 30 s or 20 m; geo-filtered job list via `list_open_checks_for_scout` RPC; atomic job accept via `accept_check`; incoming-request card with accept/decline; earnings summary from in-memory state; bottom nav.

**Status: WIRED.** Real GPS watch, real Supabase RPCs (`upsertScoutLocation`, `setScoutOffline`, `listOpenChecksForScout`, `acceptCheck`), real race-condition handling ("taken" banner on lost race).

**What's still missing:**
- Push notifications for incoming jobs. Right now the Scout must have the dashboard open and GPS ticking to see a job. Expo Push + a server-side trigger on `dispatching` status is needed so Scouts who aren't actively looking at the app get paged.
- The job list is polled/refreshed on GPS ticks. Without push, a Scout who is stationary won't see a new job until a GPS tick fires (up to 30 s lag).
- "Today's earnings" pulls from the in-memory `scout-earnings` store — resets to zero on app restart (see earnings section below).

**Backend needed:** Expo Push trigger on new `dispatching` check (net-new Edge Function or pg_cron hook).
**Effort: M**

---

### `(scout)/filming.tsx` — 675 lines
**What it does:** Real `react-native-vision-camera` back-camera feed; 30 m pre-flight geofence gate (blocks recording if too far from venue); client-side delivery countdown (7 min priority / 10 min standard); 15 s recording cap with up to 3 retakes; GPS stamp + fraud signals at Record press; `useClipUpload` hook orchestrates upload to Mux; "Trouble Here" escape hatch (4 reasons); transitions check `assigned -> filming` on first Record via `markFilming`.

**Status: WIRED (Phase 3/5/6).** Real camera, real GPS fence, real Mux upload, real fraud-signal collection, real check state transition.

**What's still missing:**
- **Delivery countdown is purely client-side** — initialized from `totalSeconds` (420 or 600 s) at screen mount, counting down in a `setInterval`. If the Seeker's check row has a `deadline_at` timestamp this isn't read. When the countdown hits 0 nothing happens to the check server-side; no auto-refund or SLA enforcement fires from filming.tsx.
- **"Trouble Here" is UI-only.** Selecting a reason sets local state (`setTroubleReason`) and shows "REPORTED · SEEKER REFUNDED" on-screen, but no API call is made. No server-side refund is triggered, no check is cancelled, no Scout "no-fault pay" is credited. The message to the Scout ("You'll still be paid for travel") is false — there is no such payment yet.
- **No SLA escalation.** If the Scout never submits, nothing auto-expires the check server-side while it is in `filming` status (the `expire_stale_dispatching` cron covers `dispatching` but not `filming`).

**Backend needed:**
- `reportTrouble(checkId, reason)` → transition_check to `cancelled` + trigger refund + credit Scout no-fault pay ($3). Net-new Edge Function or RPC.
- SLA enforcement on `filming` status (pg_cron or Edge Function scheduler). Net-new.

**Effort: M**

---

### `(scout)/submitted.tsx` — 742 lines
**What it does:** Post-upload confirmation screen. Shows a 4-step timeline (clip received → getting ready → sent to Seeker → you get paid). Reads real check status from Supabase (`getCheck`) then subscribes to `subscribeToCheck` (Realtime) to advance `stage` state: `processing → delivered → accepted`. Shows rejected state if check flips to `dispatching/no_scout/cancelled` after upload (i.e., the verify-clip gate rejected it). Shows earnings card with PENDING/CLEARED badge. Fake "4:32" delivery time stat is hardcoded.

**Status: WIRED (Phase 3) for the upload/stage flow. Earnings are read-only from in-memory store.**

**What's still missing:**
- The `stage === 'accepted'` toast says "$payout cleared" and shows today's earnings, but `addClipEarning()` is never called anywhere on this screen. Earnings only increment if the caller of filming.tsx increments them (which it doesn't). The "CLEARED" state is purely cosmetic.
- Realtime for `delivered` is wired and working. The `accepted` state transition (Seeker rates → `rated` DB status) is subscribed correctly, but the DB status is `rated` not `accepted` — the `apply()` function handles this (`else if (status === 'rated') setStage('accepted')`). This looks correct.
- "4:32" delivery time in the CLIP DETAILS stats row is hardcoded mock data. Should come from `accepted_at - assigned_at` or similar timestamp diff off the check row.
- Push notification to Scout when Seeker rates: currently silent (Seeker interaction is visible only if the Scout has the submitted screen open).

**Backend needed:** `addClipEarning()` hook call driven by real Supabase event (Phase 4 earnings credit). Net-new trigger or handled in Phase 4 payout flow.
**Effort: M**

---

### `(scout)/earnings.tsx` — 591 lines
**What it does:** Weekly bar chart (Mon–Sun), all-time stats, recent payouts list, available balance + withdraw button.

**Status: MOCK.** `BAR_DATA` and `PAYOUTS` are hardcoded arrays. `monthTotal` is `220 + earnings.earningsToday` where 220 is a hardcoded constant. Available balance equals `earnings.earningsToday` (session-only, resets on restart). Withdraw button fires a placeholder `Alert`.

**Backend needed (all net-new DB queries):**
- Weekly clip earnings by day (aggregate over `payments` or `event_log`).
- Payout history from `scout_stripe_accounts` / Stripe payouts API.
- Available balance = sum of `captured` payments not yet paid out (server-side query).
- Initiate payout: `stripe-connect-payout` Edge Function (net-new; withdraw.tsx also needs this).

**Effort: L** (most work is in the data model + Edge Functions, not the UI)

---

### `(scout)/profile.tsx` — 427 lines
**What it does:** Avatar (hardcoded "TR" initials + "Troy R." name + hardcoded scout ID "SCT-7K4M-X9P"), availability toggle (local state only, not synced to `scout_locations`), hardcoded stats ($1,240 / 87 checks / 4.9★), settings list linking to earnings/payout/identity/rules, role switch (calls real `switchRole`), sign out (calls real `signOut`).

**Status: PARTIAL.** Auth actions are real. Everything display-side is hardcoded mock. The profile's availability toggle is disconnected from the dashboard's — toggling online here does not call `upsertScoutLocation` or `setScoutOffline`.

**Backend needed:**
- Read real profile: `auth.getUser()` + profiles table (first/last name, avatar).
- Read real stats: aggregate query over `checks` + `ratings`.
- Sync availability toggle: reuse `upsertScoutLocation`/`setScoutOffline` (existing helpers).

These are all existing tables/helpers. Effort: S.

---

### `(scout)/withdraw.tsx` — 345 lines
**What it does:** Amount input with quick presets, bank destination display (hardcoded "Chase Checking ···· 6193"), withdraw button fakes a 2 s delay then shows success with `setTimeout`.

**Status: MOCK.** `AVAILABLE = 137.0` is hardcoded. The withdraw flow uses `setTimeout` to fake processing. No Stripe call is made.

**Backend needed:** `stripe-connect-payout` Edge Function to initiate instant or standard payout via Stripe Connect. The `startConnectOnboarding` + `getConnectStatus` patterns exist in `payments.ts`; a `requestPayout(amount, speed)` function needs to be added. Net-new Edge Function.
**Effort: M**

---

### `scout/payout.tsx` — 577 lines
**What it does:** Stripe Connect Express onboarding: choose payout speed, authorize, opens `startConnectOnboarding()` → Stripe hosted URL in WebBrowser, then verifies eligibility via `getConnectStatus()`. Routes to `scout/rules` on success.

**Status: WIRED (Phase 4).** Real `payments.ts` helpers, real Stripe flow, real eligibility check.

**Gap:** The availability/go-online gate in dashboard.tsx does NOT call `getConnectStatus()` to verify `charges_enabled` before letting a Scout go online. This gate was planned (T-04-19 / Pitfall 5) but the dashboard's online toggle currently has no Stripe eligibility check — a Scout with a blocked account can appear online.
**Effort: S** (add one check in dashboard)

---

### `scout/become.tsx` — 217 lines
**What it does:** Landing page for Scout onboarding. Lists 4 steps (identity, payout, rules, approved) with tap-to-preview navigation. CTA routes to `scout/identity`.

**Status: MOCK (nav shell only).** No backend calls. This is purely a UI entry point.
**Effort: S** (no changes needed until identity is wired)

---

### `scout/identity.tsx` — exists in file list but not read; inferred from `become.tsx` to be a Stripe Identity / gov ID flow.
**Status: MOCK** (the `STEPS` in `become.tsx` point to `/scout/identity` with "Photo of your gov ID + selfie. Handled by Stripe Identity"). Real Stripe Identity integration is net-new.
**Effort: M**

---

### `scout/approved.tsx` — exists; inferred as the "You're approved" confirmation step.
**Status: MOCK.** Should read `getConnectStatus()` to confirm eligibility before rendering. Existing helper available.
**Effort: S**

---

### `scout/rules.tsx` + `seeker/rules.tsx` — static legal copy + consent checkbox.
**Status: PARTIAL.** UI exists. The `accepted_scout_code_at` timestamp is written server-side by `stripe-connect-onboard` (Phase 4 decision). The rules screen itself needs no additional backend.
**Effort: S**

---

### `state/scout-earnings.ts`
**What it is:** In-memory module-level store. Increments via `addClipEarning(amount)`. Resets to zero on app restart. `useScoutEarnings()` hook used by dashboard and submitted.

**Status: PARTIAL.** This is explicitly a placeholder (`"Phase 1 starts at zero — the real payout aggregate is computed server-side in Phase 4"`). Phase 4 is complete (payments table + Stripe Connect), but no screen currently calls `addClipEarning()` when a clip is accepted. The store is wired to the UI but never incremented by real events.

**Backend needed:** A Realtime subscription on the `payments` table or `event_log` that fires `addClipEarning(amount)` when a payment is captured server-side. Or replace the store with a server query in dashboard.tsx. Net-new wiring.
**Effort: S** (the data exists; it's a hookup)

---

## 3. Time/SLA Mechanics

### Current state: ALL timers are client-side cosmetic clocks

**filming.tsx — Scout delivery countdown**
```
const totalSeconds = isPriority ? 420 : 600;   // 7 min or 10 min
const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
// driven by setInterval on mount
```
This clock starts fresh every time the filming screen mounts. It is not seeded from a `deadline_at` field on the check row. If the Scout backgrounds the app and returns, the clock resets. If they navigate away and back, it resets. The countdown reaching zero has zero backend effect — nothing auto-cancels or escalates the check.

**filming.tsx — 15 s recording cap**
```
if (recordSecs >= 15) { camera.current?.stopRecording()... }
```
This is a pure client-side enforcer. The server does not validate clip duration. A Scout could theoretically upload a shorter clip. Mux would still accept it.

**(seeker)/waiting.tsx — delivery ETA**
No countdown is shown (the screen was upgraded from a fake timer to a real Realtime subscription on check status). The Seeker sees step-based progress driven by check.status transitions (`assigned` → `filming` → `delivered`). There is no "7 minutes remaining" display on the Seeker side — this is actually correct behavior since the status IS real.

**The SLA enforcement gap is entirely server-side:**

| State | Timer needed | Current state | Gap |
|---|---|---|---|
| `dispatching` → `no_scout` | Expire after N min if no Scout accepts | `expire_stale_dispatching()` SQL function exists (migration 0012b) but pg_cron unavailable on this Supabase tier | **BLOCKER: needs Edge cron schedule** |
| `assigned` → escalate | Auto-escalate if Scout accepted but never went to `filming` | No timer or scheduler exists | Net-new |
| `filming` → auto-cancel | Auto-cancel if Scout started filming but never submitted | No timer or scheduler exists | Net-new |
| `uploading/processing` → timeout | Handle Mux transcoding hang | No client timeout; Mux has its own internal timeouts | Low risk |

**What backend would make timers real:**

1. **`deadline_at` column on `checks` table** — set at `dispatching` transition (`NOW() + interval '10 min'` for standard, `7 min` for priority). This is the authoritative SLA timestamp. The client countdown should read this value and count down from it, not from a fresh `totalSeconds` constant. This prevents clock drift on app background/resume.

2. **Supabase Edge cron schedule for `expire_stale_dispatching()`** — the SQL function already exists but pg_cron is unavailable on the current tier. A Supabase Edge Function scheduled via the dashboard (cron trigger) can call `supabase.rpc('expire_stale_dispatching')` every minute. Net-new (cron setup, not code).

3. **`expire_stale_filming()` RPC + cron** — equivalent to `expire_stale_dispatching` but for the `filming` state. Checks that have been `filming` for more than 15 min (generous margin for upload) get re-dispatched or cancelled, Seeker refunded. Net-new SQL + cron.

4. **Client countdown seeded from `deadline_at`** — `filming.tsx` should read `check.deadline_at` (once check row is fetched) and set `secondsLeft = Math.max(0, (deadline_at - Date.now()) / 1000)` instead of hardcoding 420/600. Net-new client wiring (small change once `deadline_at` exists).

5. **Trouble report backend** — when a Scout reports "trouble here", server should: transition check to `cancelled`, trigger partial refund to Seeker, credit Scout no-fault pay ($3 flat, a business decision). Net-new Edge Function or RPC.

---

## 4. Net-New Backend Rollup

| Item | Type | Priority |
|---|---|---|
| Push notifications for incoming Scout job alerts | Expo Push + trigger Edge Function or pg_cron hook | High (core Scout UX — without this, Scouts must be staring at the app) |
| `deadline_at` column on `checks` (set at dispatching) | DB migration | High (unblocks real SLA enforcement + client clock seeding) |
| Edge cron for `expire_stale_dispatching()` | Supabase cron schedule | High (function exists; just needs scheduling — the `dispatching` expiry is already written) |
| `expire_stale_filming()` RPC + cron | New SQL function + cron | Medium |
| `reportTrouble(checkId, reason)` — cancel + refund + Scout no-fault pay | Edge Function or RPC | Medium |
| Real Scout earnings query (daily/weekly breakdown) | DB aggregate query | Medium |
| Payout history from Stripe | Edge Function wrapping Stripe payouts list | Medium |
| `requestPayout(amount, speed)` — initiate Stripe Connect payout | New Edge Function | Medium |
| Seed `filming.tsx` countdown from `deadline_at` | Client change (small) | Medium (once deadline_at exists) |
| `addClipEarning()` driven by real Realtime event | Client Realtime hookup | Low (cosmetic but fixes false "today's earnings" display) |
| Real Scout profile data (name, avatar, stats) | DB reads (existing tables) | Low |
| `scout/identity.tsx` — Stripe Identity integration | New Edge Function + UI | Low (not needed for Phase 7 launch gate) |
| Availability gate: `getConnectStatus()` before go-online | Client change in dashboard.tsx | Low |

---

## 5. Suggested Phase Breakdown

### Phase 7A — SLA & Dispatch Reliability (pre-launch blocker)
Goal: checks that don't get a Scout, or stall mid-filming, are automatically handled. Seekers never get stuck waiting forever.

1. Add `deadline_at` to `checks` table (migration). Set in `transition_check` at `dispatching` edge.
2. Schedule the existing `expire_stale_dispatching()` as a Supabase Edge cron (every 60 s). No new SQL needed.
3. Write + schedule `expire_stale_filming()` for checks stuck in `filming` > 15 min.
4. Seed `filming.tsx` client countdown from `deadline_at` (read via `getCheck`, already called on mount).
5. Wire `reportTrouble`: add RPC/Edge Function, make the "Trouble Here" UI fire it, add Scout no-fault pay ($3) credit.

### Phase 7B — Scout Earnings & Payouts (monetization)
Goal: real earnings visible in the app; Scouts can withdraw.

1. `addClipEarning()` driven by Realtime on `payments` table (or event_log).
2. Real daily/weekly earnings query replacing `BAR_DATA` and `PAYOUTS` mock arrays.
3. Available balance = server query on `payments` (captured, not yet paid out).
4. `requestPayout(amount, speed)` Edge Function.
5. Wire `withdraw.tsx` to it.

### Phase 7C — Push Notifications
Goal: Scouts get paged when a job arrives, not dependent on having the app open.

1. Register Expo push tokens on Scout sign-in (`expo-notifications`).
2. Store token in `profiles` or `scout_locations`.
3. Edge Function or pg_cron hook: when a check transitions to `dispatching`, push to all eligible online Scouts within dispatch radius.

### Phase 7D — Profile & Onboarding Polish
Goal: real names/stats in profile, Stripe eligibility gate on go-online, `scout/identity` wired.

1. Read real profile from Supabase auth + profiles table.
2. Real stats aggregate (clips delivered, avg rating, total earned).
3. `getConnectStatus()` check before allowing online toggle in dashboard.
4. Wire `scout/identity.tsx` to Stripe Identity (or defer to post-launch).

---
_End of audit._
