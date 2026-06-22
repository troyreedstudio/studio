# Seeker-Side Screen Audit

Read-only audit of every screen in `lmc-app/app/(seeker)/`.
Date: 2026-06-22. No code was changed.

---

## 1. Summary Table

| Screen | File | Status | Backend Needed | Net-new infra? | Effort |
|--------|------|--------|---------------|----------------|--------|
| Home | home.tsx | PARTIAL | Real-time scout supply + venue DB | Yes — scouts table, venues table | L |
| Search | search.tsx | MOCK | Venue/place search API, saved places from DB | No new tables (reuse above) | M |
| Venue | venue.tsx | MOCK | Venue record from DB, real sample clip | No new tables | S |
| Payment | payment.tsx | PARTIAL (core wired, recurring mock) | Recurring: DB persist | Yes — recurring_checks table | S |
| Finding | finding.tsx | WIRED | None (reads live check row via Realtime) | No | — |
| Waiting | waiting.tsx | PARTIAL | Real scout GPS | Yes — location broadcast channel | M |
| Delivery | delivery.tsx | PARTIAL (video+rating wired, 4 fields hardcoded) | Scout profile, AI verdict, GPS badge | Partial (scout profiles exist, AI verdict is new) | S |
| Confirmed | confirmed.tsx | PARTIAL | addRecent() still hits in-memory state | No (api.ts has real fn) | XS |
| Cancelled | cancelled.tsx | PARTIAL | Cancellation fee/refund amounts from Stripe record | No new tables | XS |
| History | history.tsx | WIRED | None | No | — |
| Profile | profile.tsx | PARTIAL | Real user data (name, stats, avatar) | No (profiles table exists) | S |
| Saved Places | saved.tsx | MOCK | Wire to DB via api.ts getSavedPlaces() | No (api.ts + saved_places table exist) | XS |
| Recurring | recurring.tsx | MOCK | Wire to DB via api.ts getRecurring() | No (api.ts + recurring_checks table exist) | XS |
| Recurring Setup | recurring-setup.tsx | MOCK | Wire to DB via api.ts addRecurring() | No | XS |
| Payment Methods | payment-methods.tsx | MOCK | Wire to DB via api.ts getPaymentMethods() | No (api.ts + payment_methods table exist) | XS |
| Notifications | notifications.tsx | MOCK | Save prefs to profiles table | No new tables | XS |
| Preferred Cities | preferred-cities.tsx | MOCK | Save to profiles table; real scout counts | No new tables | XS |
| Invite | invite.tsx | MOCK | Referral code from DB; real stats; share sheet | Yes — referrals table | M |
| Membership | membership.tsx | MOCK | Apple/Google IAP subscription flow | Yes — subscriptions table | L |
| Help | help.tsx | MOCK | Contact links only; dev preview section to remove | No | XS |
| Report Issue | report.tsx | MOCK | Wire submit to real Edge Function or Supabase row | Yes — reports table (or use existing) | S |
| Error | error.tsx | STATIC | None (routes only) | No | — |

**Status key**
- WIRED — reads/writes real backend data end-to-end
- PARTIAL — core path wired, but specific fields or sub-features still hardcoded/in-memory
- MOCK — UI is complete but all data is hardcoded; zero backend calls
- STATIC — purely presentational, no data needs

---

## 2. Per-Screen Detail

### 2.1 Home (`home.tsx`) — PARTIAL

**What it does**: The main map view. Shows a Mapbox satellite map, real GPS location, real market detection (`nearestLiveMarket()`), and a "you're out of coverage" waitlist banner when the user is somewhere LMC doesn't operate.

**What's real**
- Real GPS via `getUserCoords()` + `getUserCity()`
- Real market detection from `lib/geo`
- Mapbox satellite tiles (real)
- Out-of-coverage detection and waitlist CTA

**What's mock**
- `MIAMI_DEMO` and `NYC_DEMO` arrays: hardcoded `[lng, lat][]` scout dot positions, animated with `setInterval` jitter — not real scout locations
- Venue pins: hardcoded coordinate arrays per market
- Scout count in the location pill ("14 Scouts") comes from local `data/markets`, not the DB
- Saved places: uses `useSavedPlaces()` from `app/state/saved` (in-memory, not DB)
- Recents: uses `useRecents()` from `app/state/recents` (in-memory)
- Search: calls `searchInMarket(marketId, query)` from local `data/markets` module (static data)
- Voice search: mocked — always fills in the first venue after 1.5s

**Backend needed**
- Real-time scout presence (location updates, online/offline status)
- Venue/place data from a `venues` or `markets` table
- `saved_places` and `recents` wired through `api.ts` instead of in-memory state

**Net-new infra**: Scouts need a location broadcast channel (Supabase Realtime presence channel or a `scout_locations` table with short TTL). Venue data needs a DB table or seeded JSON served from Supabase Storage.

**Effort**: Large — real-time supply layer is architectural.

---

### 2.2 Search (`search.tsx`) — MOCK

**What it does**: Full-screen search over places. Shows recents, saved places, and a searchable list of 84 hardcoded places across 11 categories spanning Miami, NYC, LA, London, Dubai.

**What's mock**
- `ALL_PLACES`: 84-item hardcoded array with name, address, category, scout count, market ID, and coords
- `RECENTS`: hardcoded 3-item array (not connected to `state/recents` or `api.ts`)
- "SAVED PLACES" section always shows empty (not wired to `useSavedPlaces()` even though the hook exists)
- Voice search: fills with a random `VOICE_MOCKS` item after 2.5s (no speech-to-text)
- "Use my current location" button: `TouchableOpacity` with no `onPress` — dead button

**Backend needed**
- Venue/place search by query + market (could be a Supabase full-text search on the venues table)
- Real recents and saved places from DB via `api.ts` (the functions exist — just need to be called)

**Net-new infra**: None beyond the venues table already needed by home.tsx. The `api.ts` functions (`getSavedPlaces`, `getRecents`) already exist. The "current location" button needs a `onPress` handler pointing to the map.

**Effort**: Medium — replace the hardcoded data layer, wire the two state hooks.

---

### 2.3 Venue (`venue.tsx`) — MOCK

**What it does**: Venue detail page showing a sample clip, tier picker (Standard/Priority), scout count, partner venue badge, and CTA to proceed to payment.

**What's mock**
- Video preview: plays `assets/scout-sample.mov` (local file), not a real Mux clip
- Tier price: `basePrice = selectedTier === 'standard' ? 15 : 20` (hardcoded)
- Scout count: from local `market.scouts` data
- Partner venue check: from local `isPartnerVenue()` (static lookup)
- All venue metadata (name, category, hours) from route params only — no DB lookup

**Backend needed**
- Optional but valuable: fetch a real recent clip for this venue from the DB (most recent delivered clip with `venue_id`)
- Scout count at this venue from a real-time count query
- Partner venue status from a `venues.is_partner` column

**Net-new infra**: None if the venues table exists. The sample clip could be replaced by the most recent real clip for that venue (a DB query, no new tables).

**Effort**: Small — the pricing is intentionally hardcoded (matches the model), the main lift is the sample clip query.

---

### 2.4 Payment (`payment.tsx`) — PARTIAL

**What it does**: Order summary, Stripe payment sheet, and optional recurring check toggle.

**What's real**
- `createPaymentHold(tier)` → `stripe-create-payment-intent` Edge Function
- `initPaymentSheet()` + `presentPaymentSheet()` via `@stripe/stripe-react-native`
- `createCheck()` with real location + market data on success
- Routing to `/(seeker)/finding` with the real `checkId` on success
- Decline/cancel: blocks booking (Uber-style, no free retries)

**What's mock**
- Recurring toggle: calls `addRecurring()` from `app/state/recurring` (in-memory, not persisted)
- Fee display: hardcoded `fee = isPriority ? '$2.00' : '$1.50'` (acceptable — matches the model)
- Payment method display: from `usePaymentMethod()` in `app/state/payment-method` (in-memory)

**Backend needed**
- `addRecurring()` should call `api.ts` instead of `state/recurring.ts`
- Payment method display should read from `payment_methods` table after a successful payment (Stripe webhook populates this)

**Net-new infra**: None — `recurring_checks` table and `api.ts` functions already exist.

**Effort**: Small — swap in-memory recurring call for the real `api.ts` one.

---

### 2.5 Finding (`finding.tsx`) — WIRED

**What it does**: The dispatch-wait screen shown between payment confirmation and Scout assignment. Shows a radar animation while the system pings nearby Scouts.

**What's real**
- Fetches the live check row via `getCheck(checkId)` on mount
- Subscribes to real-time updates via `subscribeToCheck(checkId, ...)`
- Routes based on real `check.status`: `assigned/filming/delivered` → waiting, `no_scout/expired` → error, `cancelled` → cancelled
- Cancel calls real `cancelCheck(checkId)` RPC
- Client-side dispatch timeout (`expireUnmatchedCheck`) as an interim until Phase 5's server-side expiry lands

**What's mock**
- Status copy ("Pinging Scouts inside the venue", "3 Scouts nearby") is cosmetic only — not driven by actual scout count
- Elapsed timer is cosmetic, does not drive navigation

**Net-new infra**: None needed. Phase 5's server-side dispatch engine will own expiry properly.

**Effort**: Complete for now. Phase 5 server-side dispatch will make client expiry unnecessary.

---

### 2.6 Waiting (`waiting.tsx`) — PARTIAL

**What it does**: The live check-tracking screen. Shows a map with the user, scout, and venue while the Scout films.

**What's real**
- Calls `getCheck(checkId)` + `subscribeToCheck()` for live status
- Routes on real status: `delivered` → delivery, `cancelled` → cancelled, `no_scout`/`expired` → error
- Re-fetches on `AppState` foreground event
- Cancel calls real `cancelCheck()` RPC

**What's mock**
- `SCOUT_BASE`: hardcoded Miami coordinates `[-80.1918, 25.7617]`
- `USER_COORD`: hardcoded Miami coordinates
- `SCOUTS[]`: hardcoded array of ambient scout dots around the hardcoded base
- Map jitter interval: animates scout dots on a random walk (not real GPS)

**Backend needed**
- Real scout GPS broadcast: the assigned Scout's location as they travel to and film the venue. Needs either a Supabase Realtime presence channel (Scout publishes location, Seeker subscribes) or a `scout_locations` table polled every few seconds.
- Real Seeker location for the "you are here" pin (already available via `getUserCoords()` from home.tsx)

**Net-new infra**: Scout location broadcast (Realtime presence channel or short-TTL table). This is the same piece needed for home.tsx's live supply layer.

**Effort**: Medium — the channel infrastructure is shared with home.tsx, but wiring it into waiting.tsx specifically is a focused task.

---

### 2.7 Delivery (`delivery.tsx`) — PARTIAL

**What it does**: Shows the delivered clip, lets the Seeker rate it, and offers a refund/report path.

**What's real**
- `getCheck(checkId)` + `getCheckClip(checkId)` + `getPlaybackToken(checkId)` — all real
- Video: `https://stream.mux.com/${clip.mux_playback_id}.m3u8?token=${token}` — real signed Mux HLS
- `filmedLine`: computed from real `clip.filmed_at` timestamp
- Rating: `rateCheck(checkId, star)` — real Supabase write
- Refund: `requestRefund(checkId, reasonCode, note)` — real Edge Function call

**What's hardcoded (the 4 specific items)**
1. **AI Verdict** (line 174): `"Short line · ~30 inside · medium energy"` — static string; should come from `clip.ai_verdict` or a `check.ai_summary` column populated by the `verify-clip` Edge Function
2. **Crowd Report tags** (line 10): `TAGS = ['Busy Tonight', 'Short Line', 'Worth It']` — static array; should come from the same AI analysis pipeline
3. **Scout name** (line 193): `"Jake C."` — should be `check.scout?.display_name` (requires a join or denormalized column)
4. **Scout stats** (line 194): `"⭐ 4.9 · 247 clips"` — should be `scout.avg_rating` + `scout.clip_count` from the `profiles` table
5. **Verified badge** (lines 197-198): hardcoded JSX — should read `clip.gps_verified === true`

**Backend needed**
- `clip.ai_verdict` or `check.ai_summary` — the `verify-clip` Edge Function needs to write this back (it currently calls signage-check + face-blur-check but may not write a human-readable verdict back to the row)
- AI crowd tags — same pipeline
- Scout profile data: join on `checks.scout_id → profiles` to get `display_name`, `avg_rating`, `clip_count`
- `clip.gps_verified` column populated by the `verify-clip` Edge Function

**Net-new infra**: `clip.ai_verdict` and `clip.ai_tags[]` columns (or stored in `check.ai_summary` JSONB). Scout profile denormalization or a DB join.

**Effort**: Small per item. Four targeted fixes once the verify-clip Edge Function writes the verdict back.

---

### 2.8 Confirmed (`confirmed.tsx`) — PARTIAL

**What it does**: Success animation shown after payment. Shows a receipt and routes to waiting.

**What's mock**
- Calls `addRecent({ name: venue, city })` — but this hits the in-memory `state/recents.ts` module, not `api.ts addRecent()`
- "Payment: Visa •••• 4242" — hardcoded last4 (should come from the Stripe PaymentMethod object stored after payment)

**Backend needed**: Replace `state/recents.ts` call with `api.ts addRecent()`. Pull last4 from the payment context passed from payment.tsx.

**Effort**: Extra-small.

---

### 2.9 Cancelled (`cancelled.tsx`) — PARTIAL

**What it does**: Confirmation screen shown when a check is cancelled. Shows a refund breakdown.

**What's real**: Receives `fee`, `refund`, `total` via route params (populated by the Stripe refund response in waiting.tsx).

**What's mock**
- "Visa •••• 4242" — hardcoded card last4 (should come from the payment method record)
- Default param values (`venue='Komodo'`, `fee='5.00'`, etc.) are fallbacks — the real values are passed as params

**Net-new infra**: None. Just replace the hardcoded last4 with the real value from payment method state.

**Effort**: Extra-small.

---

### 2.10 History (`history.tsx`) — WIRED

**What it does**: Lists all of the Seeker's past checks with status, price, date, and rating. Stats row shows total checks, total spent, and avg rating.

**What's real**: Everything. Calls `listMyChecks()` (real Supabase query, RLS-scoped). Handles all check statuses. Stats computed from real data. Tapping a delivered/rated check navigates to delivery.tsx with the real `checkId`.

**What's hardcoded**: `TIER_PRICE = { standard: 16.5, priority: 22 }` — intentional, matches the pricing model.

**Effort**: Complete. No action needed.

---

### 2.11 Profile (`profile.tsx`) — PARTIAL

**What it does**: Account hub with stats, settings list, and role-switch / sign-out CTAs.

**What's real**
- Role switch: `switchRole('scout')` → `router.replace('/(scout)/dashboard')`
- Sign out: `signOut()` → `router.replace('/index')`

**What's hardcoded**
- Avatar initials: "TR" (should be first letters of `profile.display_name`)
- Name: "Troy R." (should be from `profiles.display_name`)
- "Member since January 2026" (should be from `profiles.created_at`)
- Stats: "14 CHECKS / $245 SPENT / 4.8★" (should be computed from real `listMyChecks()` data — same query as history.tsx)

**Settings routes**: All 9 are present: history, membership, saved, recurring, payment-methods, notifications, preferred-cities, invite, help.

**Backend needed**: Read `profiles` row for name + created_at. Reuse the `listMyChecks()` query for stats (or add a `profile_stats` computed view).

**Effort**: Small — one `useEffect` to fetch the profile row on mount.

---

### 2.12 Saved Places (`saved.tsx`) — MOCK

**What it does**: Lists the Seeker's bookmarked places with a one-tap "CHECK" CTA that routes back to home.tsx with the place pinned.

**What's mock**: Reads from `useSavedPlaces()` in `app/state/saved` (in-memory, resets on reload).

**Backend needed**: Replace `app/state/saved` with `api.ts getSavedPlaces()` on mount and `api.ts removeSavedPlace()` on remove. The table and API functions already exist.

**Net-new infra**: None. `saved_places` table and all CRUD in `api.ts` already exist.

**Effort**: Extra-small — swap the state module for the real API calls.

---

### 2.13 Recurring (`recurring.tsx`) — MOCK

**What it does**: Lists the Seeker's scheduled recurring checks with toggle (active/inactive) and delete.

**What's mock**: Reads from `useRecurring()` in `app/state/recurring` (in-memory).

**Backend needed**: Replace with `api.ts getRecurring()` + `toggleRecurring()` + `removeRecurring()`. All functions exist.

**Net-new infra**: None.

**Effort**: Extra-small.

---

### 2.14 Recurring Setup (`recurring-setup.tsx`) — MOCK

**What it does**: Frequency + time picker for scheduling a new recurring check at a given place.

**What's mock**: Calls `addRecurring()` from `app/state/recurring` on save.

**Backend needed**: Replace with `api.ts addRecurring()`.

**Net-new infra**: None.

**Effort**: Extra-small.

---

### 2.15 Payment Methods (`payment-methods.tsx`) — MOCK

**What it does**: Shows a saved card and offers Add/Remove. Currently hard-codes a "Visa 4242" placeholder card.

**What's mock**
- Reads from `usePaymentMethod()` in `app/state/payment-method` (in-memory)
- "ADD NEW CARD" button calls `save('Visa', '4242')` — inserts the hardcoded placeholder
- No real Stripe setup intent or card element

**Backend needed**
- Read from `api.ts getPaymentMethods()` on mount
- Add New Card: open a Stripe `AddToWalletButton` or a minimal Stripe `CardField` + `createSetupIntent` to tokenise and save a real card
- Remove: call `api.ts removePaymentMethod()` + `stripe.detachPaymentMethod`

**Net-new infra**: New Edge Function `stripe-setup-intent` (or reuse existing payment intent flow for card setup). `payment_methods` table exists.

**Effort**: Small to Medium — the list read is trivial; the "Add card" flow requires a new Stripe setup intent path.

---

### 2.16 Notifications (`notifications.tsx`) — MOCK

**What it does**: Toggle panel for 6 notification types: Check Delivered, Scout Assigned, Re-check Reminders, Trending Near You, Promotions, LMC Updates.

**What's mock**: `values` state is local `useState` only — never persisted anywhere.

**Backend needed**
- Store preferences in `profiles.notification_prefs JSONB` (or a dedicated `notification_prefs` table)
- Register/deregister the device's Expo Push token when the "Check Delivered" or "Scout Assigned" toggles change

**Net-new infra**: `profiles.notification_prefs` column (or new table). Expo Push token registration is already needed for the core check delivery flow.

**Effort**: Extra-small for the persistence piece; Medium overall when Expo Push is wired.

---

### 2.17 Preferred Cities (`preferred-cities.tsx`) — MOCK

**What it does**: Multi-select list of 8 cities. Selected cities determine which "Trending Near You" notifications the Seeker receives.

**What's mock**
- `selected` is local `useState` — not persisted
- Scout counts (142, 318, etc.) are hardcoded integers per city — not from DB

**Backend needed**
- Persist `selected` to `profiles.preferred_cities text[]`
- Real scout counts per market from a count query on `profiles` where `current_role = 'scout'` and `market_id = ?`

**Net-new infra**: `profiles.preferred_cities` column. Scout count query is a view or RPC.

**Effort**: Extra-small for persistence. Scout counts can wait until supply is real.

---

### 2.18 Invite (`invite.tsx`) — MOCK

**What it does**: Referral screen. Shows the user's code, referral stats (4 invited, 3 joined, $15 earned), and iMessage/Email/More share buttons.

**What's mock**
- `referralCode = 'TROY-LMC5'` — hardcoded string literal
- Stats (4 invited, 3 joined, $15 earned) — hardcoded
- Share buttons: `TouchableOpacity` with no `onPress` — dead buttons
- "COPY" button: no `onPress` handler

**Backend needed**
- Generate/store a unique referral code per user in `profiles.referral_code`
- `referrals` table: track who used the code, credit state
- Real stats query: count referrals, sum credits earned
- Wire share buttons to `Share.share()` (React Native built-in)
- Wire COPY to `Clipboard.setString()`

**Net-new infra**: `referrals` table (or `referral_code` column on profiles + join). Credits system (either a `credits` column on profiles or a `credit_ledger` table).

**Effort**: Medium — requires new DB design plus the credit application logic at checkout.

---

### 2.19 Membership (`membership.tsx`) — MOCK

**What it does**: Tiered pricing screen: Pay-as-you-go (free), LMC Plus ($29/mo), LMC Pro ($79/mo). Tapping an upgrade tier shows an `Alert.alert` placeholder.

**What's mock**
- Upgrade CTA calls `Alert.alert(...)` — no real IAP
- Current plan is always "Pay-as-you-go" — no subscription state read
- Has a "WF" wireframe badge in the header (dev artifact — remove before launch)

**Backend needed**
- Apple/Google subscription via RevenueCat or native StoreKit 2 / Google Play Billing
- `subscriptions` table or `profiles.subscription_tier` column
- Entitlement enforcement (e.g. recurring checks gate-kept behind Plus+)

**Net-new infra**: Subscription infrastructure is a major new piece. Either RevenueCat (SaaS) or native StoreKit 2 + server-side receipt validation. New `subscriptions` table.

**Effort**: Large — most complex new work on the seeker side.

---

### 2.20 Help (`help.tsx`) — MOCK

**What it does**: FAQ list (8 questions, static content) + contact options (email, chat, terms, privacy). Also has a DEV section to trigger the 4 error states — this needs to be removed before public launch.

**What's mock**: All content is hardcoded. Contact buttons have no `onPress` handlers.

**Backend needed**: None strictly needed. Contact links should open mail/URL. DEV section should be behind a `__DEV__` flag or removed entirely.

**Effort**: Extra-small (wire contact taps, remove dev section for launch).

---

### 2.21 Report Issue (`report.tsx`) — MOCK

**What it does**: Issue report form with 6 reasons (wrong place, bad quality, no-show, late, privacy, other) and an optional text field.

**What's mock**: `handleSubmit` does `setTimeout(1200)` then shows a success state. No real submission.

**Backend needed**
- Submit to a `reports` table (or reuse the refund Edge Function which already handles `requestRefund`)
- Link the report to the `check_id` (currently only `venue` is passed via route params — no `checkId`)
- Delivery.tsx's `ReportSheet` already calls `requestRefund()` for the refund path; this standalone report.tsx is a separate flow for non-refund issues

**Net-new infra**: `reports` table (or extend the existing refund Edge Function to accept a report-only path). `check_id` needs to be passed to this screen.

**Effort**: Small.

---

### 2.22 Error (`error.tsx`) — STATIC

**What it does**: Parameterised error screen handling 4 types: `no-scouts`, `payment-declined`, `connection`, `missed-window`. Routes user to a primary action (retry / new card / home) or secondary dismiss.

**What's mock**: None — it's purely presentational. Routes are all real.

**Effort**: Complete. No action needed.

---

## 3. Net-New Backend Rollup

These are the pieces of infrastructure that don't yet exist and need to be built:

### New Tables / Columns

| Item | Purpose | Notes |
|------|---------|-------|
| `scouts` location broadcast | Real-time scout positions for home.tsx and waiting.tsx | Supabase Realtime presence channel, or `scout_locations` table with short TTL |
| `clip.ai_verdict text` | Human-readable AI summary on delivery screen | Written by `verify-clip` Edge Function |
| `clip.ai_tags text[]` | Crowd Report tags on delivery screen | Same pipeline |
| `clip.gps_verified bool` | Powers the "✓ Verified" badge | Already in verify-clip logic; needs to be written to the clip row |
| `profiles.notification_prefs jsonb` | Persist notification toggle state | Merge into existing profiles table |
| `profiles.preferred_cities text[]` | Preferred cities for trending notifications | Merge into existing profiles table |
| `profiles.referral_code text` | Unique referral code per user | Merge into existing profiles table |
| `referrals` table | Track who used a code, credit state | New table |
| `subscriptions` table | Subscription tier + entitlement state | New table (or RevenueCat webhook updates profiles) |

### New / Updated Edge Functions

| Function | Purpose |
|----------|---------|
| `verify-clip` update | Add `ai_verdict`, `ai_tags`, `gps_verified` writes back to clip row |
| `stripe-setup-intent` | Tokenise and save a card from Payment Methods screen |
| `referral-apply` | Apply a referral code at signup, credit both parties |

### Existing Infrastructure to Wire (no new backend needed)

These are cases where the backend already exists but the screens still call in-memory state modules:

| Screen | In-memory call | Real call to use |
|--------|---------------|-----------------|
| saved.tsx | `useSavedPlaces()` from `state/saved` | `api.ts getSavedPlaces()`, `removeSavedPlace()` |
| recurring.tsx | `useRecurring()` from `state/recurring` | `api.ts getRecurring()`, `toggleRecurring()`, `removeRecurring()` |
| recurring-setup.tsx | `addRecurring()` from `state/recurring` | `api.ts addRecurring()` |
| payment-methods.tsx | `usePaymentMethod()` from `state/payment-method` | `api.ts getPaymentMethods()`, `removePaymentMethod()` |
| payment.tsx (recurring toggle) | `addRecurring()` from `state/recurring` | `api.ts addRecurring()` |
| confirmed.tsx | `addRecent()` from `state/recents` | `api.ts addRecent()` |
| home.tsx | `useSavedPlaces()`, `useRecents()` from state modules | `api.ts getSavedPlaces()`, `getRecents()` |

---

## 4. What's Missing from the Roadmap

Cross-referencing `ROADMAP.md` and `PROJECT.md` against the audit findings:

### Not Mentioned in ROADMAP at All

| Feature | Where in App | Why It Matters |
|---------|-------------|---------------|
| Scout profile on delivery screen | delivery.tsx lines 193-194 | Seeker sees "Jake C. ⭐ 4.9 · 247 clips" — needs real data |
| AI Verdict + Crowd Report tags | delivery.tsx line 174, line 10 | Core UX of the delivery screen; verify-clip needs to write back |
| GPS Verified badge | delivery.tsx lines 197-198 | Part of the verification moat; currently always shows |
| Saved Places wiring | saved.tsx | Table and API exist but screen is disconnected |
| Recurring checks wiring | recurring.tsx, recurring-setup.tsx, payment.tsx | Table and API exist but screens are disconnected |
| Payment Methods screen | payment-methods.tsx | Needs a Stripe setup intent path for adding real cards |
| Notification preferences persistence | notifications.tsx | 6 toggle types, none persisted |
| Preferred Cities persistence | preferred-cities.tsx | Drives trending notifications, not persisted |
| Referrals / Invite system | invite.tsx | DB, code generation, credits, share sheet all unbuilt |
| Membership / Subscriptions | membership.tsx | Apple/Google IAP, entitlement gating — largest unplanned piece |
| Help screen contact wiring | help.tsx | Dead buttons; DEV section needs removal |
| Report Issue wiring | report.tsx | `handleSubmit` is a setTimeout, not a real API call |

### In ROADMAP but Blocking or Incomplete

| Roadmap Item | Status | Notes |
|-------------|--------|-------|
| 03-04 Video (client) | Unchecked — BLOCKING | On-device camera + EAS test blocked on provisioning |
| 03-05 Delivery screen signed player | Unchecked — BLOCKING | Mux signed player wired but pending real clip from 03-04 |
| 05-06 Dispute resolution | Unchecked — BLOCKING | The refund flow exists but the dispute/escalation path does not |

---

## 5. Suggested Phase Breakdown

Given the audit, seeker-side work naturally falls into three phases:

### Phase A — Quick Wiring (1-2 sprints, low risk)
*All of these use backend that already exists. Zero new infrastructure.*

1. Swap all in-memory `state/` module calls for real `api.ts` calls:
   - saved.tsx, recurring.tsx, recurring-setup.tsx, payment.tsx (recurring toggle), confirmed.tsx, home.tsx (recents + saved)
2. Wire payment-methods.tsx list view to `api.ts getPaymentMethods()` (read-only for now)
3. Profile.tsx: fetch real user name + created_at from `profiles` table
4. Profile stats: reuse `listMyChecks()` to compute total checks, total spent, avg rating
5. Notifications.tsx: persist `values` to `profiles.notification_prefs`
6. Preferred-cities.tsx: persist `selected` to `profiles.preferred_cities`
7. Help.tsx: wire contact taps, add `__DEV__` guard on the error state preview section
8. Report.tsx: wire `handleSubmit` to a real Supabase insert (pass `checkId` from delivery.tsx)
9. Delivery.tsx: read `clip.gps_verified` for the Verified badge; read Scout name/stats from profiles join

**Why first**: All backend exists. These are wiring tasks, not architecture. Each is a 1-4 hour change.

---

### Phase B — New Backend Pieces (2-4 sprints, medium risk)
*Requires new columns, tables, or Edge Function updates.*

1. **AI Verdict + Crowd Report tags**: Update `verify-clip` Edge Function to write `ai_verdict` and `ai_tags` back to the clip row. Wire delivery.tsx to read them.
2. **Real scout supply on home.tsx**: Supabase Realtime presence channel for scout locations. Replace `MIAMI_DEMO`/`NYC_DEMO` arrays.
3. **Real scout GPS on waiting.tsx**: Subscribe the Seeker to the assigned Scout's location broadcast.
4. **Search.tsx real data**: Replace 84-item hardcoded array with a query against the venues table. Wire "current location" button.
5. **Referrals**: `referrals` table + `profiles.referral_code` column + credits logic at checkout. Wire invite.tsx share buttons and COPY.
6. **Payment Methods — Add Card**: New `stripe-setup-intent` Edge Function. Wire the "ADD NEW CARD" flow in payment-methods.tsx.

---

### Phase C — Major New Infrastructure (4+ sprints, high risk)
*Architectural new work; not blocked on anything in Phase A or B.*

1. **Membership / Subscriptions**: RevenueCat or StoreKit 2 + Google Play Billing. New `subscriptions` table. Entitlement gating for Plus/Pro features (recurring gate, saved places limit, priority dispatch). Remove the WF wireframe badge.
2. **Preferred Cities + Trending Notifications**: Expo Push token registration wired to toggles. Push event triggers from server when scout counts spike in a followed market.
3. **Venue sample clips**: Replace `assets/scout-sample.mov` on venue.tsx with a real recent clip query for that venue.

---

### Summary Recommendation

Do Phase A first — it's the highest-leverage / lowest-risk work: 10+ screens become real with zero new infrastructure, just connecting wires that are already there. Phase B is the right follow-on once supply is needed for real operations. Phase C (subscriptions) is a standalone track that can run in parallel with B once the product is live and generating data.

---

*Audit complete. No files were modified.*
