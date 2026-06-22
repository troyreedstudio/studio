# Phase 9: Verified Badge + Scout Identity + Quick-Win Reconnects — Research

**Researched:** 2026-06-22
**Domain:** React Native / Supabase data wiring; SECURITY DEFINER RPC design; profiles schema
**Confidence:** HIGH — all findings verified directly against source code and migration SQL

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 Verified badge:** show "✓ Verified" ONLY when `clip.gps_verified = true`; otherwise neutral state. Optionally surface signage advisory if present. Source from the existing clips row already loaded on delivery.tsx.
- **D-02 Scout identity:** show the real Scout's display name + rating/stats on the delivery screen. Needs IDOR-safe public-scout-profile read (the Seeker may see the scout of THEIR OWN delivered check only) — a SECURITY DEFINER RPC or a narrow RLS view. Avatar = initial or photo if available.
- **D-03 Fake AI/crowd:** REMOVE the "AI Verdict" + "Crowd Report" hardcoded tags from delivery.tsx. Default REMOVE (not a coming-soon placeholder).
- **D-04 Reconnects:** wire saved places, recurring (+setup), payment-methods, notification prefs, profile stats, preferred cities to their existing backend.
- **D-05 Recurring checks:** land the UI + persistence now; the actual SCHEDULER that fires them can be fast-follow.
- **Claude discretion:** exact RPC/view shapes, avatar handling, empty/loading states.

### Claude's Discretion
- Exact RPC/view shapes for scout identity
- Avatar initial derivation vs photo support
- Loading/empty state patterns for reconnected screens

### Deferred Ideas (OUT OF SCOPE)
- Referrals/Invite system (needs net-new table)
- Memberships/Subscriptions (RevenueCat, IAP)
- Real scout dots on the seeker map (architectural)
- AI Verdict + Crowd Report (content-production feature, not Phase 9)
- Recurring-check SCHEDULER execution (fast-follow)
- Scout counts per city in preferred-cities (needs supply data)
</user_constraints>

---

## Summary

Phase 9 is purely a wiring and cleanup phase. The audit claims "the backend mostly exists" — this research verifies that claim against actual code and SQL. The verdict: **the audit is correct for saved places, recurring, payment-method listing, and profiles. The SEEKER-AUDIT was wrong about one item: notification_prefs and preferred_cities columns do NOT exist on profiles yet — they need a small migration (0017). Everything else is fully wired or is a client-only change.**

The delivery screen (delivery.tsx) has four hardcoded items: the `✓ Verified` badge always shows, "Jake C." is a string literal, "⭐ 4.9 · 247 videos" is a string literal, and the AI Verdict + Crowd Report tags are static constants. Three of these (D-01, D-02, D-03) are pure client changes once a SECURITY DEFINER RPC for scout identity is added. The fourth (D-03) is a deletion.

The state modules (`app/state/saved.ts`, `app/state/recurring.ts`, `app/state/payment-method.ts`) are NOT in-memory-only as the original audit description implied — they were already upgraded in Phase 1/2 to call through to `lib/api.ts` with an optimistic local cache. The screens that import them are therefore already persisting. The remaining issue is that `notifications.tsx` and `preferred-cities.tsx` use raw `useState` with no persistence layer at all.

**Primary recommendation:** Ship one small migration (0017) that adds two columns to profiles, write one SECURITY DEFINER RPC (`get_check_scout_public`), remove three blocks from delivery.tsx, add a `useEffect` to profile.tsx, and add a save-on-change call to notifications.tsx and preferred-cities.tsx. No new tables needed for any of the six reconnect items.

---

## Verified State of Each In-Scope Item

### D-01: Verified Badge

**Verification:** [VERIFIED: database.types.ts line 126]

`clips.gps_verified` is type `boolean | null` in the generated types — the column exists in the live DB (added by migration `0012_dispatch_verification_spine.sql`, section 4, "clips advisory columns"). The `verify-clip` Edge Function already writes `gps_verified` to the clips row (confirmed by STATE.md: "Phase 05-03: verify-clip returns `{ passed, distance_m }` and missing/NaN GPS is logged as `check.gps_unverifiable`, `gps_verified` left null, never set to true on missing-GPS path").

`delivery.tsx` already calls `getCheckClip(checkId)` and stores the result in `clip` state. The clip object is a full `ClipRow` which includes `gps_verified`.

**Current hardcode:** Lines 197-198 of delivery.tsx — `<View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Verified</Text></View>` — this always renders regardless of `clip.gps_verified`.

**Fix (client-only, no backend needed):**
```typescript
// delivery.tsx — replace always-on badge with conditional render
{clip?.gps_verified === true && (
  <View style={styles.verifiedBadge}>
    <Text style={styles.verifiedText}>✓ Verified</Text>
  </View>
)}
```

Optional signage advisory (D-01 discretion): `clip?.signage_confirmed === false` (advisory null = no verdict, false = signage check ran and found nothing) can show a neutral "Signage advisory" tag — but since signage is advisory-only and the column is null on most clips at launch, recommend omitting for now and keeping the badge binary.

**Confidence:** HIGH [VERIFIED: database.types.ts, STATE.md decisions, delivery.tsx source]

---

### D-02: Scout Identity (IDOR-safe)

**Verification:** [VERIFIED: database.types.ts lines 428-465, 0002_profiles_roles_consents.sql, delivery.tsx source]

**What exists in the DB:**
- `profiles` table: `id`, `display_name text` (nullable), `is_seeker`, `is_scout`, `current_role`, `created_at`, `updated_at`, `phone`, `stripe_customer_id`, `blocked_from_booking`
- No `avatar_url`, no `avg_rating`, no `clip_count` columns on profiles — these are NOT in any migration
- `scout_earnings_totals(p_scout_id uuid)` RPC exists (migration 0016) and returns `(total_cents, total_clips)` — clip count is computable
- `ratings` table has per-check star ratings from Seekers — avg rating is computable via aggregate
- `checks.scout_id` gives the scout's `auth.user.id` for a delivered check

**What delivery.tsx currently has:**
- `check.scout_id` is available via the already-loaded `CheckRow` (field confirmed in database.types.ts line 54)
- No join to profiles is performed — "Jake C." is a hardcoded string literal at line 194
- "⭐ 4.9 · 247 videos" is a hardcoded string literal at line 195

**IDOR threat model:**
A Seeker must NOT be able to call `profiles.select('*').eq('id', anyArbitraryScoutId)` — that would be an open profile directory. They should only be able to see the scout of a check they OWN and that has been DELIVERED.

**Recommended solution: SECURITY DEFINER RPC `get_check_scout_public(p_check_id uuid)`**

This is the right pattern — it mirrors the existing `list_open_checks_for_scout` and `accept_check` patterns in this codebase. A narrow RLS view would require exposing the profiles table with a policy that joins through checks, which is harder to reason about and audit.

The RPC:
1. Verifies `auth.uid() = checks.seeker_id` for the given `check_id`
2. Verifies `checks.status IN ('delivered','rated')` (only delivered checks expose a scout)
3. Reads `profiles.display_name` for the `checks.scout_id`
4. Computes `avg_rating` from `ratings` where `check_id IN (SELECT id FROM checks WHERE scout_id = ...)` — or more efficiently, from delivered+rated checks where the scout was the assigned scout
5. Reads `total_clips` from `scout_earnings_totals(scout_id).total_clips`
6. Returns `{ display_name, avg_rating, clip_count }` — nothing else

**Why not a join in the client:** Supabase JS client `.select('*, scout:profiles(*)')` on the checks table would require an RLS policy that exposes profiles to any authenticated user doing a join on checks — that policy is very hard to scope correctly and could leak other scouts' profiles. The SECURITY DEFINER RPC is authoritative and auditable.

**Migration needed:** Yes — a new function `get_check_scout_public` in migration `0017_phase9_surface_reconnects.sql`.

```sql
-- get_check_scout_public: IDOR-safe scout profile for Seeker delivery screen.
-- The caller must own the check AND the check must be delivered/rated.
create or replace function public.get_check_scout_public(p_check_id uuid)
returns table(display_name text, avg_rating numeric, clip_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scout_id uuid;
  v_seeker_id uuid;
  v_status text;
begin
  select scout_id, seeker_id, status::text
    into v_scout_id, v_seeker_id, v_status
  from public.checks
  where id = p_check_id;

  if not found then
    raise exception 'check not found';
  end if;
  if v_seeker_id is distinct from auth.uid() then
    raise exception 'not your check';
  end if;
  if v_status not in ('delivered', 'rated') then
    raise exception 'check not yet delivered';
  end if;
  if v_scout_id is null then
    raise exception 'no scout assigned';
  end if;

  return query
    select
      p.display_name,
      round(avg(r.stars)::numeric, 1)              as avg_rating,
      coalesce(et.total_clips, 0)                   as clip_count
    from public.profiles p
    left join public.checks sc on sc.scout_id = p.id
    left join public.ratings r  on r.check_id = sc.id
                                and sc.status in ('delivered','rated')
    left join lateral (
      select total_clips from public.scout_earnings_totals(p.id) limit 1
    ) et on true
    where p.id = v_scout_id
    group by p.display_name, et.total_clips;
end;
$$;
```

**Avatar:** Use first letter of `display_name` as the initial (current "J" avatar pattern already exists). No photo column exists; if `display_name` is null, default to "S" (Scout). This is Claude's discretion (D-02).

**Client wiring in delivery.tsx:**
```typescript
// New state + fetch alongside existing getCheck/getCheckClip calls
const [scoutProfile, setScoutProfile] = useState<{
  display_name: string | null;
  avg_rating: number | null;
  clip_count: number | null;
} | null>(null);

useEffect(() => {
  if (!checkId) return;
  // Fires after check is confirmed delivered — scout_id exists by then
  supabase.rpc('get_check_scout_public', { p_check_id: checkId })
    .then(({ data }) => { if (data?.[0]) setScoutProfile(data[0]); })
    .catch(() => {});
}, [checkId]);

// In render — replace hardcoded scout card:
const scoutInitial = scoutProfile?.display_name?.[0]?.toUpperCase() ?? 'S';
const scoutName = scoutProfile?.display_name ?? 'Your Scout';
const scoutRating = scoutProfile?.avg_rating != null
  ? `⭐ ${scoutProfile.avg_rating}`
  : null;
const scoutClips = scoutProfile?.clip_count != null
  ? `${scoutProfile.clip_count} videos`
  : null;
const scoutMeta = [scoutRating, scoutClips].filter(Boolean).join(' · ');
```

**Confidence:** HIGH [VERIFIED: database.types.ts, 0002/0016 migrations, delivery.tsx, STATE.md]

---

### D-03: Remove Fake AI/Crowd Tags

**Verification:** [VERIFIED: delivery.tsx source read]

**Exact lines to delete:**

1. **Top-of-file constant** (line 10): `const TAGS = ['Busy Tonight', 'Short Line', 'Worth It'];` — delete entirely.

2. **AI Verdict row** (lines 171-174):
```tsx
<View style={styles.aiVerdictRow}>
  <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>✦ AI VERDICT</Text></View>
  <Text style={styles.aiVerdictText}>Short line · ~30 inside · medium energy</Text>
</View>
```
Delete all four lines. Also remove `styles.aiVerdictRow`, `styles.aiBadge`, `styles.aiBadgeText`, `styles.aiVerdictText` from the StyleSheet to keep the file clean.

3. **Crowd Report section** (lines 176-179):
```tsx
<Text style={styles.sectionLabel}>CROWD REPORT</Text>
<View style={styles.tagRow}>
  {TAGS.map((tag) => <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>)}
</View>
```
Delete all four lines. Also remove `styles.tagRow`, `styles.tag`, `styles.tagText` from the StyleSheet (note: `styles.sectionLabel` is ALSO used for "RATE YOUR CHECK" and "RATE YOUR SCOUT" labels — do NOT delete it).

**No backend changes. Client-only deletion.**

**Confidence:** HIGH [VERIFIED: delivery.tsx source]

---

## Per-Screen Reconnect Table (D-04)

| Screen | File | Current State | Backend Exists? | Net-new needed? | Wiring |
|--------|------|--------------|-----------------|-----------------|--------|
| Saved Places | saved.tsx | Uses `useSavedPlaces()` from `state/saved` | YES (VERIFIED) | No | State module already calls `api.ts getSavedPlaces()` — screen is already persistent. Screen render is correct. DONE. |
| Recurring | recurring.tsx | Uses `useRecurring()` from `state/recurring` | YES (VERIFIED) | No | State module already calls `api.ts getRecurring/toggleRecurring/removeRecurring()`. DONE. |
| Recurring Setup | recurring-setup.tsx | Calls `addRecurring()` from `state/recurring` | YES (VERIFIED) | No | State module already calls `api.ts addRecurring()` with background persist. DONE. |
| Payment Methods (list) | payment-methods.tsx | Uses `usePaymentMethod()` from `state/payment-method` | YES (VERIFIED) | No for list; YES for "Add Card" | State module calls `api.ts getPaymentMethod()` — list is already real. ADD CARD remains a placeholder (calls `save('Visa','4242')`) — Phase 9 scopes to wiring the list read only. |
| Notifications | notifications.tsx | Pure `useState` — never persisted | NO — columns missing from profiles | YES — add `notification_prefs jsonb` column to profiles (migration 0017) | On toggle change: `supabase.from('profiles').update({ notification_prefs: values }).eq('id', uid)`. Load on mount via `getProfile()`. |
| Preferred Cities | preferred-cities.tsx | Pure `useState` — never persisted | NO — column missing from profiles | YES — add `preferred_cities text[]` column to profiles (migration 0017) | On toggle change: `supabase.from('profiles').update({ preferred_cities: Array.from(selected) }).eq('id', uid)`. Load on mount via `getProfile()`. |
| Profile stats | profile.tsx | Hardcoded "TR", "Troy R.", "January 2026", "14/\$245/4.8★" | YES (VERIFIED) | No | `getProfile()` exists in `api.ts`; `listMyChecks()` for stats. Add `useEffect` on mount. |
| Profile name/date | profile.tsx | Same as above | YES (VERIFIED) | No | Same `getProfile()` call covers `display_name` + `created_at`. |

### Critical Finding: State Modules Are NOT Pure In-Memory

The SEEKER-AUDIT described saved.tsx, recurring.tsx, and payment-methods.tsx as "MOCK" with "reads from in-memory state." **This is outdated — those state modules were already upgraded in Phase 1/2.**

Code confirmed [VERIFIED: app/state/saved.ts, app/state/recurring.ts, app/state/payment-method.ts]:
- `state/saved.ts` calls `api.ts getSavedPlaces()` / `addSavedPlace()` / `removeSavedPlace()` — optimistic local cache, real DB writes
- `state/recurring.ts` calls `api.ts getRecurring()` / `addRecurring()` / `toggleRecurring()` / `removeRecurring()` — same pattern
- `state/payment-method.ts` calls `api.ts getPaymentMethod()` / `savePaymentMethod()` — same pattern

All three modules hydrate from the DB on first mount (`if (!_hydrated) void hydrate...()`). The screens that import them are already reading from Supabase.

**This means saved.tsx, recurring.tsx, and recurring-setup.tsx are already wired.** The screens themselves need no changes for basic persistence.

### What IS Still Mock in payment-methods.tsx

`payment-methods.tsx` line 51: `onPress={() => save(PLACEHOLDER_CARD.brand, PLACEHOLDER_CARD.last4)}` — "ADD NEW CARD" still writes the hardcoded `Visa 4242` placeholder. The `payment_methods` table has no `stripe_payment_method_id` column (confirmed via migration search). The Stripe `stripe-create-payment-intent` Edge Function creates/reuses a Stripe customer, but no webhook writes a real card's last4 to `payment_methods` after a successful payment.

**Phase 9 scope (per D-04):** Wire the list read (already done via state module). The real "Add Card" flow (Stripe SetupIntent) is out of scope for Phase 9 per CONTEXT.md's deferred list. The Add button can show an informational alert ("Card management via Stripe coming soon") or simply do nothing for beta.

### Confirmed Net-New Migration Needed

`profiles` table (verified against 0002 and 0011 migrations and database.types.ts) does NOT have:
- `notification_prefs jsonb` — not in any migration, not in database.types.ts
- `preferred_cities text[]` — not in any migration, not in database.types.ts

These need a migration `0017_phase9_surface_reconnects.sql`:

```sql
-- 0017_phase9_surface_reconnects.sql
-- Phase 9: Verified badge + Scout identity + seeker quick-win reconnects.
-- (1) Profiles: notification_prefs + preferred_cities storage.
-- (2) SECURITY DEFINER RPC: get_check_scout_public — IDOR-safe scout identity.

alter table public.profiles
  add column if not exists notification_prefs   jsonb,
  add column if not exists preferred_cities     text[];

comment on column public.profiles.notification_prefs is
  'Phase 9: Seeker notification toggle state. Keyed by notification id (e.g. delivered, scout-assigned). NULL = no prefs saved (use defaults).';

comment on column public.profiles.preferred_cities is
  'Phase 9: Market IDs the Seeker follows for trending notifications. NULL = all cities.';

-- get_check_scout_public: SECURITY DEFINER RPC.
-- Returns display_name / avg_rating / clip_count for the scout of a delivered check.
-- The caller MUST own the check AND the check must be delivered/rated.
create or replace function public.get_check_scout_public(p_check_id uuid)
returns table(display_name text, avg_rating numeric, clip_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scout_id  uuid;
  v_seeker_id uuid;
  v_status    text;
begin
  select scout_id, seeker_id, status::text
    into v_scout_id, v_seeker_id, v_status
  from public.checks
  where id = p_check_id;

  if not found then
    raise exception 'get_check_scout_public: check % not found', p_check_id;
  end if;
  if v_seeker_id is distinct from auth.uid() then
    raise exception 'get_check_scout_public: caller does not own check %', p_check_id;
  end if;
  if v_status not in ('delivered', 'rated') then
    raise exception 'get_check_scout_public: check % not yet delivered (status=%)', p_check_id, v_status;
  end if;
  if v_scout_id is null then
    return; -- empty result; delivery.tsx falls back to generic "Your Scout"
  end if;

  return query
    select
      p.display_name,
      coalesce(round(avg(r.stars)::numeric, 1), null) as avg_rating,
      coalesce(et.total_clips, 0)                      as clip_count
    from public.profiles p
    left join public.checks sc on sc.scout_id = p.id
                               and sc.status::text in ('delivered', 'rated')
    left join public.ratings r  on r.check_id = sc.id
    left join lateral (
      select tc.total_clips
      from public.scout_earnings_totals(p.id) tc
      limit 1
    ) et on true
    where p.id = v_scout_id
    group by p.display_name, et.total_clips;
end;
$$;

comment on function public.get_check_scout_public(uuid) is
  'Phase 9: IDOR-safe scout identity for Seeker delivery screen. Caller must own the '
  'delivered/rated check. Returns (display_name, avg_rating, clip_count). '
  'SECURITY DEFINER: never exposes any profile outside the check-ownership gate.';
```

---

## Architecture Patterns

### Pattern 1: SECURITY DEFINER for IDOR-safe cross-table reads

**What:** A SECURITY DEFINER plpgsql function runs with elevated (definer) privileges, so it can read from `profiles` even though the calling user has no SELECT policy on profiles for other users' rows. The function performs the ownership check itself and raises an exception on violation.

**Why this project uses it:** Already established in this codebase for `list_open_checks_for_scout`, `accept_check`, `reset_check_for_redispatch`, `scout_earnings_totals`. Adding `get_check_scout_public` is consistent with the existing pattern. [VERIFIED: database.types.ts Functions section]

**Key constraint:** `set search_path = public` is required (mirrors all other SECURITY DEFINER functions in this codebase). [VERIFIED: 0007, 0010, 0012, 0016 migrations]

### Pattern 2: Optimistic hydrate-on-first-mount cache

**What:** `state/*.ts` modules keep a module-level cache array + listeners. On first `useX()` call they call the corresponding `api.ts` function to hydrate, then notify all subscribers. Mutations update the cache optimistically and persist in the background.

**When to use:** The saved/recurring/payment-method stores already use this pattern. Notification prefs and preferred cities do NOT need this pattern — they are simple profile fields, not lists, so a direct `supabase.from('profiles').update()` on toggle change is sufficient.

### Pattern 3: Profile fetch on mount for profile.tsx

**What:** Call `getProfile()` from `api.ts` in a `useEffect` on mount. Derive display name initials, format `created_at` as "Member since Month YYYY". Reuse `listMyChecks()` for stats (same data history.tsx already fetches).

**Concern:** profile.tsx currently has zero `useEffect` calls. Adding one is the only change needed. [VERIFIED: profile.tsx source]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IDOR-safe cross-table read | Client-side join logic or RLS with complex join policy | SECURITY DEFINER RPC | Ownership check is authoritative in PL/pgSQL; cannot be spoofed by the client |
| Scout avg rating | Column on profiles maintained by triggers | Live aggregate in the RPC query | Profiles have no avg_rating column; computing in the RPC on demand is correct for now; avoids denormalization drift |
| Profile stats (checks, spent, rating) | Separate count/sum RPCs | Reuse `listMyChecks()` and compute client-side | `listMyChecks()` is already called on history.tsx with the same data; compute stats from the returned array |

---

## Common Pitfalls

### Pitfall 1: Deleting `styles.sectionLabel` when removing Crowd Report

**What goes wrong:** The `CROWD REPORT` label uses `styles.sectionLabel`. But `styles.sectionLabel` is also used for `RATE YOUR CHECK` on line 181. Deleting it breaks the rating label.
**How to avoid:** Only delete the `<Text style={styles.sectionLabel}>CROWD REPORT</Text>` JSX line, not the style definition itself. Remove only the tag-specific styles: `tagRow`, `tag`, `tagText`, `aiVerdictRow`, `aiBadge`, `aiBadgeText`, `aiVerdictText`. [VERIFIED: delivery.tsx source]

### Pitfall 2: Calling `get_check_scout_public` before the check is delivered

**What goes wrong:** The RPC raises an exception if status is not `delivered` or `rated`. Delivery.tsx already has the `clip` loaded — the check is delivered by the time this screen renders. But a race (screen loads while status is still `processing`) could cause a spurious error.
**How to avoid:** Wrap in try/catch in the `useEffect` (already the pattern in delivery.tsx for the other calls). Show the scout card with generic "Your Scout" if the RPC returns empty or errors.

### Pitfall 3: `notification_prefs` not in `database.types.ts` until regen

**What goes wrong:** After pushing migration 0017, `database.types.ts` won't have `notification_prefs` or `preferred_cities` on the profiles Row type until the type file is regenerated (`supabase gen types typescript`). The TypeScript compiler will error on `.update({ notification_prefs: values })`.
**How to avoid:** Cast the update payload to `any` with a comment (same pattern used for Phase 5 `scout_locations` and `coord` columns — see checks.ts line 104). Regen the types as a Wave 4 live step after migration push. [VERIFIED: checks.ts pattern]

### Pitfall 4: `preferred_cities` text[] vs Set on the client

**What goes wrong:** `preferred-cities.tsx` uses `useState<Set<string>>` internally. Writing `Array.from(selected)` to Supabase and reading back a `string[]` will work, but loading the saved value requires converting the `string[]` back to a `Set`.
**How to avoid:** On mount, fetch profile and call `setSelected(new Set(profile.preferred_cities ?? []))`. On toggle, write `Array.from(next)` to the DB.

### Pitfall 5: `getPaymentMethod` vs `getPaymentMethods` naming

**What goes wrong:** `api.ts` exposes `getPaymentMethod()` (singular, returns the most recent one) — not `getPaymentMethods()` (plural). The `state/payment-method.ts` correctly calls the singular version. The SEEKER-AUDIT referenced a plural `getPaymentMethods()` function that does NOT exist.
**How to avoid:** Use `getPaymentMethod()` (singular) from `api.ts`. For Phase 9, the screen already shows one card; showing multiple is deferred. [VERIFIED: api.ts lines 243-253]

### Pitfall 6: avg_rating lateral join on a new Scout (zero clips)

**What goes wrong:** If the Scout has no delivered checks yet (fresh Scout), `avg(r.stars)` returns null and `scout_earnings_totals` returns 0 clips. The COALESCE handles the 0-clip case but the rating will be null.
**How to avoid:** The client should handle `avg_rating === null` gracefully — don't render the star row if null. In the scout card, show only `{clip_count} videos` if rating is unavailable.

---

## Code Examples

### Verified badge render (D-01)
```typescript
// delivery.tsx — replace lines 197-198
// Source: D-01 decision + clips.gps_verified in database.types.ts
{clip?.gps_verified === true ? (
  <View style={styles.verifiedBadge}>
    <Text style={styles.verifiedText}>✓ Verified</Text>
  </View>
) : (
  // gps_verified null = not yet checked (unlikely on delivery screen)
  // gps_verified false = GPS check ran and rejected (shouldn't reach delivery, but be safe)
  null
)}
```

### Scout identity fetch (D-02)
```typescript
// delivery.tsx — add to useEffect block
// Source: get_check_scout_public RPC (migration 0017)
useEffect(() => {
  if (!checkId) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any)
    .rpc('get_check_scout_public', { p_check_id: checkId })
    .then(({ data }: { data: { display_name: string | null; avg_rating: number | null; clip_count: number | null }[] | null }) => {
      if (data?.[0]) setScoutProfile(data[0]);
    })
    .catch(() => {/* scout card shows generic fallback */});
}, [checkId]);
```

### Profile stats wiring (profile.tsx)
```typescript
// Source: api.ts getProfile() + checks.ts listMyChecks()
useEffect(() => {
  Promise.all([getProfile(), listMyChecks()]).then(([profile, checks]) => {
    if (profile) {
      setDisplayName(profile.display_name ?? null);
      setMemberSince(new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    }
    if (checks.length > 0) {
      const totalSpent = checks.filter(c => c.status !== 'cancelled' && c.status !== 'no_scout')
        .length * (/* avg from tier — or sum from payments */ 0);
      // Simpler: compute from listMyChecks() data
      const ratedChecks = checks.filter(c => c.status === 'rated');
      // rating data needs a separate ratings query — or use the check count only for now
      setStats({ count: checks.length });
    }
  }).catch(() => {});
}, []);
```

**Note on profile stats accuracy:** `listMyChecks()` returns `CheckRow[]` which does NOT include the rating stars (those are in the separate `ratings` table). For the count and spent fields: use `checks.length` and sum from tier pricing. For avg rating: either add a join or accept that profile stats show count+spent only for now (avg rating is already on history.tsx which goes deeper). [VERIFIED: database.types.ts, checks.ts]

### Notification prefs persistence (notifications.tsx)
```typescript
// Source: api.ts getProfile() + supabase.from('profiles').update()
// On mount — load saved prefs:
useEffect(() => {
  getProfile().then(profile => {
    if (profile?.notification_prefs) {
      setValues(prev => ({ ...prev, ...profile.notification_prefs as Record<string, boolean> }));
    }
  }).catch(() => {});
}, []);

// On toggle:
const handleToggle = (id: string, v: boolean) => {
  const next = { ...values, [id]: v };
  setValues(next);
  // Persist; ignore errors (offline-safe optimistic)
  const uid = supabase.auth.getUser().then(({ data }) => data.user?.id);
  uid.then(id => {
    if (!id) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('profiles').update({ notification_prefs: next }).eq('id', id).then(() => {});
  }).catch(() => {});
};
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pgTAP (SQL unit tests in `supabase/tests/`) |
| Config file | `supabase/config.toml` (standard Supabase CLI) |
| Quick run command | `supabase test db` (runs pgTAP suite) |
| Full suite command | `supabase test db` |
| TypeScript check | `cd lmc-app && npx tsc --noEmit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| D-01 | Verified badge shows only when `gps_verified=true` | unit (pgTAP: verify clip flag) | `supabase test db` (clips_mux.test.sql covers clip row) | Partially — clips_mux.test.sql exists; needs D-01 specific assertion |
| D-02 | `get_check_scout_public` enforces IDOR (non-owner gets exception) | unit (pgTAP) | `supabase test db` | No — new test file needed |
| D-02 | RPC returns correct display_name/avg_rating/clip_count | unit (pgTAP) | `supabase test db` | No — new test file needed |
| D-03 | AI verdict + crowd tags deleted from delivery.tsx | tsc | `npx tsc --noEmit` | — (TAGS constant removal makes it a compile error if referenced) |
| D-04 notifications | `notification_prefs` column exists + can UPDATE | unit (pgTAP) | `supabase test db` | No — new test file needed |
| D-04 cities | `preferred_cities` column exists + can UPDATE | unit (pgTAP) | `supabase test db` | No — new test file needed |
| D-04 profile | `getProfile()` returns real `display_name` + `created_at` | manual on-device | — | — |

### Sampling Rate
- **Per task commit:** `cd lmc-app && npx tsc --noEmit`
- **Per wave merge:** `supabase test db`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `supabase/tests/0017_phase9_reconnects.test.sql` — covers `get_check_scout_public` IDOR assertions + column existence for `notification_prefs` + `preferred_cities`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | YES — scout profile read | SECURITY DEFINER RPC with ownership gate; not client-side routing |
| V5 Input Validation | YES | `p_check_id uuid` type enforced by PostgreSQL; no string injection vector |
| V2 Authentication | Partial — caller identity | `auth.uid()` from Supabase JWT; `is distinct from` semantics handle null (unauthenticated) correctly |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on scout profile | Elevation of Privilege | SECURITY DEFINER RPC validates `checks.seeker_id = auth.uid()` before returning any profile data |
| Unauthenticated RPC call | Spoofing | `auth.uid()` returns null for anon callers; `is distinct from v_seeker_id` will be true (v_seeker_id is never null), raising exception |
| Client writes `notification_prefs` for another user | Tampering | RLS `profiles_update_own` policy (migration 0005 line 28 pattern) — update only where `id = auth.uid()` |

**Verify before implementing:** Confirm `profiles` has an UPDATE policy scoped to own row. [ASSUMED — 0005 migration comment references `current_role/display_name/phone` as user-writable but the exact UPDATE policy needs confirmation. The pattern is consistent with existing UPDATE calls in `api.ts` which all use `.eq('id', uid)`.]

---

## State of the Art

| Old Assumption | Reality (verified) | Impact |
|----------------|-------------------|--------|
| "saved.tsx reads in-memory state" | `state/saved.ts` already calls `api.ts` + DB | saved.tsx needs NO wiring changes |
| "recurring.tsx is MOCK" | `state/recurring.ts` already calls `api.ts` + DB | recurring.tsx / recurring-setup.tsx need NO wiring changes |
| "payment-methods.tsx is MOCK" | List read is already via DB; only Add Card is fake | Only Add Card placeholder is out of scope for Phase 9 |
| "notification_prefs exists on profiles" | NOT in any migration or database.types.ts | Migration 0017 REQUIRED |
| "preferred_cities exists on profiles" | NOT in any migration or database.types.ts | Migration 0017 REQUIRED |
| "clip.gps_verified needs new infrastructure" | Column exists since migration 0012 | D-01 is a client-only change |
| "scout avg_rating is a profiles column" | No such column; compute via aggregate in RPC | get_check_scout_public must compute it |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `profiles` UPDATE RLS policy allows user to write `notification_prefs` and `preferred_cities` columns (existing `profiles_update_own` policy is broad enough) | Security Domain | If the policy is column-specific (not `*`), the update silently fails. Fix: verify in 0005 migration; add column-level or widen the policy in 0017. |
| A2 | `scout_earnings_totals(p_scout_id)` can be called from within a SECURITY DEFINER function without a separate SECURITY DEFINER grant | Code Examples | If the function is restricted, the lateral join in `get_check_scout_public` will fail with a permissions error. Fix: either inline the count query or confirm the function is accessible to definer context. |

---

## Open Questions

1. **Profile UPDATE policy scope**
   - What we know: `api.ts setCurrentRole()` and `setIntendedRoleFlags()` both call `.update({...}).eq('id', uid)` successfully, confirming some UPDATE policy exists.
   - What's unclear: Whether the policy uses `WITH CHECK (id = auth.uid())` on all columns or is column-restricted.
   - Recommendation: Read migration 0005 `profiles` UPDATE policy before writing notification/city update code. If column-restricted, add explicit column grants in 0017.

2. **Profile stats: avg rating without joining ratings**
   - What we know: `listMyChecks()` returns `CheckRow[]` — no stars in CheckRow.
   - What's unclear: The cleanest way to show avg rating on profile.tsx without a second DB round-trip.
   - Recommendation: For Phase 9, show only check count + total spent on profile.tsx. Avg rating requires either a second query to `ratings` or a DB view — defer to the planner to decide.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 9 has no new external dependencies. All tooling (Supabase CLI, TypeScript, Expo) is already in use on this project.

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: delivery.tsx] — Exact hardcoded lines confirmed by reading the source file
- [VERIFIED: database.types.ts] — `clips.gps_verified boolean | null`, `profiles` columns, all RPCs in Functions section
- [VERIFIED: api.ts] — `getProfile()`, `getSavedPlaces()`, `getPaymentMethod()` (singular), `getRecurring()` all exist with correct signatures
- [VERIFIED: state/saved.ts, state/recurring.ts, state/payment-method.ts] — All three already call `api.ts`; they are NOT pure in-memory
- [VERIFIED: 0002_profiles_roles_consents.sql] — `profiles` base columns; no `notification_prefs` or `preferred_cities`
- [VERIFIED: 0004_core_entities.sql] — `payment_methods` table: `brand text`, `last4 text`, no `stripe_payment_method_id`
- [VERIFIED: 0010_clips_mux.sql, 0012_dispatch_verification_spine.sql] — `gps_verified` and `signage_confirmed` on clips
- [VERIFIED: 0016_scout_earnings.sql] — `scout_earnings_totals(p_scout_id)` returns `(total_cents, total_clips)`
- [VERIFIED: STATE.md decisions] — Phase 05-03: `gps_verified` write behaviour confirmed; Phase 05-04: `signage_confirmed` is advisory-only
- [VERIFIED: notifications.tsx] — Pure `useState`, no persistence
- [VERIFIED: preferred-cities.tsx] — Pure `useState`, no persistence
- [VERIFIED: profile.tsx] — Zero `useEffect` calls; all data is hardcoded strings

### Secondary (MEDIUM confidence)
- [CITED: Supabase SECURITY DEFINER documentation pattern] — Consistent with all existing RPCs in this codebase

---

## Metadata

**Confidence breakdown:**
- D-01 Verified badge: HIGH — column confirmed, client change only
- D-02 Scout identity: HIGH — RPC design matches existing codebase patterns, column existence confirmed
- D-03 Remove AI/crowd: HIGH — exact lines confirmed in delivery.tsx
- D-04 Reconnects (saved/recurring/payment list): HIGH — state modules already call api.ts; confirmed by reading source
- D-04 Reconnects (notifications/preferred-cities): HIGH — both confirmed as pure useState with no persistence
- D-04 Migration 0017 columns needed: HIGH — absent from all migrations and database.types.ts

**Research date:** 2026-06-22
**Valid until:** 2026-07-22 (stable schema; only new migrations would invalidate)

---

## RESEARCH COMPLETE

**Phase:** 9 — Verified badge + Scout identity + quick-win reconnects
**Confidence:** HIGH

### Key Findings

1. **The SEEKER-AUDIT overstated how mock the reconnect screens are.** `saved.tsx`, `recurring.tsx`, `recurring-setup.tsx`, and `payment-methods.tsx` (list read) are already wired to the real DB via the state modules. Zero wiring work needed for those four screens — they were done in Phase 1/2.

2. **D-01 (Verified badge) is a one-line client change.** `clip.gps_verified` has been in the DB since migration 0012 (Phase 5). No backend work needed.

3. **D-02 (Scout identity) needs one new SECURITY DEFINER RPC.** No existing function exposes scout profile data to a Seeker safely. `get_check_scout_public(p_check_id)` must be added in migration 0017. Design is specified above.

4. **D-03 (Remove AI/crowd) is a deletion — three blocks in delivery.tsx.** No backend. Be careful not to delete `styles.sectionLabel` which is shared.

5. **Notifications + preferred cities need a small migration.** `notification_prefs jsonb` and `preferred_cities text[]` do not exist on profiles. Migration 0017 adds both. The screen changes are then straightforward.

6. **Profile stats are partially computable from existing data.** `getProfile()` covers name + member-since. `listMyChecks()` covers check count + spend. Avg rating on the profile screen requires a separate ratings query — recommend Phase 9 ships count+spend only and defers avg-rating to the planner's decision.

### File Created
`.planning/phases/09-verified-badge-scout-identity-quick-win-reconnects-surface-r/09-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Delivery screen hardcodes | HIGH | Read source directly, line numbers confirmed |
| DB column existence | HIGH | Verified against database.types.ts + all migration SQL |
| State module wiring status | HIGH | Read app/state/*.ts directly — all three already call api.ts |
| RPC design (get_check_scout_public) | HIGH | Follows exact pattern of 4 existing SECURITY DEFINER RPCs |
| Migration 0017 scope | HIGH | Negative confirmed — columns absent from all migrations |

### Open Questions
- Does the profiles UPDATE RLS policy cover new columns automatically (no restriction) or does it need widening?
- Should profile.tsx show avg rating (needs separate ratings query) or count+spent only for Phase 9?

### Ready for Planning
Research complete. Planner can now create PLAN.md files.
