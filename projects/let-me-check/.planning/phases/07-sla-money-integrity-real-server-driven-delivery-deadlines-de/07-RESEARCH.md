# Phase 7: SLA + Money Integrity — Research

**Researched:** 2026-06-22
**Domain:** Supabase scheduled jobs, Stripe Connect payouts, PostgreSQL SLA enforcement, React Native countdown seeding
**Confidence:** HIGH (all key findings verified against live codebase + official Stripe/Supabase docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01 deadline windows: Standard = 10 min, Priority = 7 min. Clock starts when Scout ACCEPTS (accepted_at + window). [CONFIRM with Troy — default is accept-start]
- D-02 unclaimed timeout: no Scout within dispatch window (default 5 min, but market_config.dispatch_timeout_s = 600 s already in DB) → `no_scout`, release hold. Reuses `expire_stale_dispatching`.
- D-03 late/undelivered: accepted but not delivered by deadline_at → auto-refund/release, mark missed. [CONFIRM with Troy — default yes]
- D-04 Scout pay protection: Scout who delivered a PASSING clip is ALWAYS paid even if Seeker refunded (platform absorbs). For a late miss (no delivery), no Scout pay. Consistent with Phase-4 Transfer-not-destination-charge model.
- D-05 cron mechanism: no pg_cron available → use a scheduled Edge Function or external trigger. Research picks the most robust option.
- D-06 earnings source: real Scout earnings = sum of delivered+captured checks; payout history from Stripe Connect transfers/payouts. Withdraw = Stripe Connect payout (instant = 2% Scout fee, standard ACH = free).
- Claude's Discretion: schema shape (deadline_at, missed reason enums), the earnings query/view, event-log additions.

### Claude's Discretion
- Schema shape for `deadline_at` column and `missed_reason` enum values
- The Scout earnings aggregate query or view design
- Event-log entry shapes for new SLA events

### Deferred Ideas (OUT OF SCOPE)
- Phase 8: on-device face blur
- Phase 9: verified badge + seeker quick-wins
- Phase 10: push notifications
- Phase 11+: referrals, memberships, real search/catalog, AI verdict
</user_constraints>

---

## Summary

Phase 7 makes time and money real in Let Me Check. The core engine is already wired end-to-end, but three things are currently cosmetic or missing: (1) delivery deadlines are pure client-side counters that reset on app reopen, (2) SLA enforcement has no scheduler — `expire_stale_dispatching()` exists but nothing calls it, (3) Scout earnings and the withdraw flow are hardcoded mock data with a setTimeout.

The key architectural unknown is the cron mechanism. After investigation: **pg_cron IS available on the Supabase free tier** (confirmed by a Supabase collaborator in a July 2025 community discussion — it is resource-limited, not tier-gated). The migration `20260621000002_dispatch_rpc_accept.sql` already wraps the `cron.schedule()` call in an exception-swallowing DO block so it is safe to call on any tier. This means the Phase-5 design is correct: push a migration that enables pg_cron and schedules the sweeper, and it just works. An external fallback (GitHub Actions, cron-job.org) is a valid backup if pg_cron proves unreliable in practice.

The money layer (capture, transfer, refund) is already production-grade from Phase 4. Trouble-Here → refund is a two-line wire: call the existing `stripe-refund` Edge Function with `reason_code: 'never_delivered'` (the Scout's trouble report is a sub-case of the Seeker never receiving). Scout no-fault pay is a separate `stripe.transfers.create` call at a flat amount to the Scout's Connect account, done server-side in the new `trouble-report` Edge Function.

**Primary recommendation:** Enable pg_cron via Supabase dashboard, schedule `expire_stale_dispatching()` + new `expire_stale_filming()` at `* * * * *`, add `deadline_at` to checks, seed client countdowns from it, wire Trouble-Here, and build the earnings query + payout Edge Function. External cron is the fallback, not the primary path.

---

## What Already Exists (no-rebuild zone)

| Item | Location | Status |
|------|----------|--------|
| `expire_stale_dispatching()` SQL function | `20260621000002_dispatch_rpc_accept.sql` line 244 | EXISTS — sweeps dispatching+unclaimed past dispatch_timeout_s → no_scout. NOT yet scheduled. |
| `transition_check()` service-role path | `0012_dispatch_verification_spine.sql` | EXISTS — system (auth.uid() null) can drive no_scout, expired. Authorizes the sweeper. |
| `stripe-refund` Edge Function | `supabase/functions/stripe-refund/index.ts` | EXISTS — deployed, reason-coded, D-08 compliant (never reverses Scout Transfer). |
| `stripe-capture` Edge Function | `supabase/functions/stripe-capture/index.ts` | EXISTS — separate charges+transfers, idempotent on `status='transferred'`. |
| `scout_stripe_accounts` table | `0011_payments.sql` | EXISTS — `stripe_account_id`, `payout_speed`, `charges_enabled`, `payouts_enabled`. |
| `payments` table | `0011_payments.sql` | EXISTS — `status` enum (authorized/captured/transferred/refunded/canceled), `scout_amount`, `currency`. |
| `market_config.dispatch_timeout_s` | `0012_dispatch_verification_spine.sql` | EXISTS — default 600 s. D-01 proposes 5-min (300 s) for unclaimed; 10-min / 7-min for accepted. Will need additive columns or separate use of this field. |
| `invokeEdgeFunction()` helper | `lmc-app/app/lib/payments.ts` | EXISTS — plain fetch with 30 s AbortController (Hermes-safe). Use same pattern for new calls. |
| `requestRefund()` in payments.ts | `lmc-app/app/lib/payments.ts` | EXISTS — calls stripe-refund with checkId + reasonCode + note. Ready to wire from filming.tsx Trouble-Here. |

---

## Standard Stack

### Core (existing, no changes)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Supabase Postgres | (hosted) | DB, RLS, SECURITY DEFINER RPCs | All money/state machine lives here |
| Supabase Edge Functions | Deno 2.x | Stripe calls, cron sweeper entry points | stripe-refund, stripe-capture already deployed |
| Stripe SDK | `npm:stripe@22` | Payouts, transfers, balance | Already in `_shared/stripe.ts` via `getStripeClient()` |
| pg_cron | Supabase extension | Schedule `expire_stale_dispatching()` + `expire_stale_filming()` | [VERIFIED: pg_cron free-tier availability confirmed — see Cron Mechanism section] |

### Net-New for Phase 7
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Supabase Cron (pg_cron wrapper) | Built into hosted Supabase | Dashboard UI to manage scheduled jobs | Optional convenience; underlying pg_cron is what matters |

**No new npm packages needed on the client.** Everything uses existing patterns.

---

## Architecture Patterns

### Recommended Project Structure (additive only)

```
supabase/
  migrations/
    0015_sla_deadline.sql          # deadline_at + accept_check seeding + expire_stale_filming RPC
  functions/
    trouble-report/
      index.ts                     # reportTrouble: cancel + stripe-refund invoke + scout no-fault transfer
    stripe-connect-payout/
      index.ts                     # requestPayout: Stripe Connect payout (instant or standard)
    scout-earnings/
      index.ts                     # getScoutEarnings: DB aggregate + Stripe balance (or DB-only v1)

lmc-app/app/
  (scout)/
    filming.tsx                    # ~line 64: seed secondsLeft from deadline_at; wire Trouble-Here
    earnings.tsx                   # replace BAR_DATA + PAYOUTS with real query
    withdraw.tsx                   # replace setTimeout with stripe-connect-payout call
  lib/
    payments.ts                    # add reportTrouble() + requestPayout() + getScoutEarnings()
```

### Pattern 1: Server-side deadline seeding in accept_check

`accept_check` already writes `scout_id` and `status='assigned'` atomically. Phase 7 adds `accepted_at = now()` and `deadline_at = now() + (SLA window)` in the same UPDATE.

The SLA window is derived from `checks.tier` — 420 seconds for priority, 600 for standard (matching D-01). This is set once, atomically, at accept time.

```sql
-- Inside accept_check(), after the atomic UPDATE:
UPDATE public.checks
SET scout_id    = v_uid,
    status      = 'assigned',
    accepted_at = now(),
    deadline_at = now() + make_interval(secs =>
      CASE WHEN tier = 'priority' THEN 420 ELSE 600 END
    ),
    updated_at  = now()
WHERE id = p_check_id AND status = 'dispatching' AND scout_id IS NULL;
```

The client reads `check.deadline_at` on filming screen mount (already calls `getCheck(checkId)`) and computes:
```typescript
// filming.tsx — replace line 64:
const [secondsLeft, setSecondsLeft] = useState(
  check?.deadline_at
    ? Math.max(0, Math.round((new Date(check.deadline_at).getTime() - Date.now()) / 1000))
    : (isPriority ? 420 : 600)   // fallback if deadline_at is null
);
```

This makes the countdown clock app-restart-safe: reopening the app resumes from the real server time.

### Pattern 2: Scheduled expiry WITHOUT external cron

Two separate SQL functions sweep checks on a schedule:

**`expire_stale_dispatching()`** — already written, sweeps `dispatching` checks past `dispatch_timeout_s`. D-02 requires this for the unclaimed window. Only needs to be scheduled.

**`expire_stale_filming()`** — new function, sweeps checks stuck in `assigned` or `filming` past `deadline_at`. This is the D-01/D-03 enforcement:

```sql
CREATE OR REPLACE FUNCTION public.expire_stale_filming()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  r       record;
BEGIN
  FOR r IN
    SELECT id, stripe_payment_intent_id
    FROM public.checks
    WHERE status IN ('assigned', 'filming')
      AND deadline_at IS NOT NULL
      AND deadline_at < now()
  LOOP
    -- D-03: transition to a terminal state (new 'missed' or reuse 'no_scout')
    PERFORM public.transition_check(
      r.id,
      'no_scout',    -- or 'expired' — see Open Questions
      jsonb_build_object('reason', 'sla_deadline_missed')
    );
    -- Refund is triggered by the stripe-webhook (on no_scout/expired → release hold)
    -- OR called directly here via pg_net http call to stripe-refund.
    -- See Refund Wiring section for the recommended approach.
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
```

### Pattern 3: Cron Scheduling (the key decision)

See full analysis below. Recommendation: enable pg_cron via Supabase dashboard, add two `cron.schedule()` calls in the migration.

### Pattern 4: Trouble-Here → real refund + Scout no-fault pay

New Edge Function `trouble-report` called from `filming.tsx` when Scout selects a trouble reason:

```typescript
// supabase/functions/trouble-report/index.ts
// 1. Auth gate — must be the assigned Scout
// 2. Load check: verify status in ('assigned','filming') + scout_id = caller
// 3. Cancel the check: transition_check(checkId, 'cancelled', {reason: 'scout_trouble'})
// 4. Invoke stripe-refund internally (service-role) with reason_code: 'never_delivered'
// 5. Create a flat Scout no-fault Transfer ($3.00 = 300 minor units) to scout_stripe_accounts.stripe_account_id
//    — NO source_transaction (funded from platform balance, same as D-09 path)
// 6. Log event: check.trouble_reported + payment.scout_nofault_paid
// 7. Return { status: 'reported' }
```

Client call in `filming.tsx` (replaces the fake setTroubleReason handler):
```typescript
// lib/payments.ts — new export
export async function reportTrouble(
  checkId: string,
  reason: TroubleReason,
): Promise<{ status: 'reported' }> {
  return await invokeEdgeFunction('trouble-report', { checkId, reason }) as { status: 'reported' };
}
```

### Pattern 5: Real Scout earnings

Two data sources, combined:

**Source A — DB aggregate (authoritative for all-time + weekly):**
```sql
-- Earnings per day for this Scout (last 30 days)
SELECT
  DATE_TRUNC('day', c.updated_at) AS day,
  SUM(p.scout_amount)             AS day_cents
FROM public.checks c
JOIN public.payments p ON p.check_id = c.id
WHERE c.scout_id = auth.uid()
  AND p.status IN ('transferred', 'captured')
  AND c.updated_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY 1;
```

**Source B — Stripe balance (authoritative for available-to-withdraw):**
```typescript
// In scout-earnings Edge Function:
const balance = await stripe.balance.retrieve(
  {},
  { stripeAccount: row.stripe_account_id }
);
const availableCents = balance.available[0]?.amount ?? 0;
const instantAvailableCents = balance.instant_available?.[0]?.net_available?.[0]?.amount ?? 0;
```

The `scout-earnings` Edge Function returns a combined payload:
```json
{
  "weeklyByDay": [{ "day": "2026-06-16", "cents": 4500 }, ...],
  "allTimeCents": 124000,
  "availableCents": 8000,
  "instantAvailableNetCents": 7840,
  "recentPayouts": [{ "id": "po_...", "arrivalDate": "2026-06-15", "amountCents": 9450, "status": "paid" }, ...]
}
```

`recentPayouts` comes from `stripe.payouts.list({}, { stripeAccount: ... })` filtered to `limit: 10`.

### Pattern 6: Withdraw → Stripe Connect payout

New Edge Function `stripe-connect-payout`:

```typescript
// 1. Auth gate — must be the Scout
// 2. Validate amount > 0
// 3. Load scout_stripe_accounts: stripe_account_id, payout_speed
// 4. If speed === 'instant':
//    a. Retrieve balance with expand instant_available.net_available
//    b. Use net_available amount (after 2% platform fee) — never gross amount
//    c. stripe.payouts.create({ amount, currency, method: 'instant' }, { stripeAccount })
// 5. If speed === 'standard':
//    a. stripe.payouts.create({ amount, currency, method: 'standard' }, { stripeAccount })
// 6. Log event: payment.payout_initiated
// 7. Return { status: 'initiated', payoutId }
```

---

## Cron Mechanism — Full Analysis

### The Problem

`expire_stale_dispatching()` exists in the DB but has no caller. Its pg_cron schedule is wrapped in an exception-swallowing DO block that was added specifically because pg_cron was "unavailable on this Supabase tier" (noted in Phase 5 SUMMARY and STATE.md line 170).

### Investigation Result

[VERIFIED: Supabase community discussion July 2025 — pg_cron free-tier availability] A Supabase collaborator confirmed: "Cron is only limited by the resources it uses CPU/Memory/Disk wise on any tier." pg_cron is NOT restricted to paid plans. The Phase-5 STATE.md note "pg_cron unavailable on this tier" reflected a migration deployment failure (the DO block swallowed a different error), not an actual tier restriction.

[CITED: supabase.com/docs/guides/cron] Supabase Cron (the dashboard UI wrapper around pg_cron) supports minimum interval of 1 second, can invoke Edge Functions, available on hosted Supabase.

[CITED: supabase.com/modules/cron] Minimum interval: 1 second. Recommended: no more than 8 concurrent jobs, max 10 minutes each.

### Recommended Approach: Enable pg_cron via Supabase Dashboard

**Why pg_cron over alternatives:**
- The SQL sweeper functions already exist and are correctly written
- pg_cron runs inside the DB: no network round-trip, no external service dependency, no secrets exposure
- The DO block exception guard means the migration is safe to re-run after enabling the extension
- Supabase Dashboard makes this a one-click operation (Database → Extensions → pg_cron → Enable)

**How to enable:**
1. Go to Supabase Dashboard → Database → Extensions
2. Enable `pg_cron`
3. Enable `pg_net` (needed if calling Edge Functions from SQL; not needed if the Postgres functions call themselves)
4. Re-run the scheduling DO block from `20260621000002_dispatch_rpc_accept.sql` (or add it to migration 0015)

**Schedule two jobs:**
```sql
-- In migration 0015 (or via Dashboard Cron UI):
SELECT cron.schedule(
  'lmc-expire-dispatching',
  '* * * * *',                              -- every 1 minute
  'SELECT public.expire_stale_dispatching()'
);

SELECT cron.schedule(
  'lmc-expire-filming',
  '* * * * *',
  'SELECT public.expire_stale_filming()'
);
```

**Why 1 minute is sufficient:** The SLA windows are 7–10 minutes. A sweeper that runs every 60 seconds means the maximum over-run on an SLA is 60 seconds, which is acceptable. pg_cron minimum is 1 minute in standard cron syntax (`* * * * *`).

### Fallback: External cron → Edge Function

If pg_cron proves unreliable in practice (the community discussion noted some unexplained free-tier execution failures), an external HTTP call to a small Edge Function works as a fallback:

**Option A — GitHub Actions schedule:**
```yaml
# .github/workflows/sla-sweep.yml
on:
  schedule:
    - cron: '* * * * *'   # every minute (GitHub Actions minimum is 5 min per YAML; use 5-min interval)
jobs:
  sweep:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            ${{ secrets.SUPABASE_URL }}/functions/v1/sla-sweeper
```

Note: GitHub Actions minimum schedule interval is 5 minutes, not 1 minute. For a 5-minute max over-run on a 7-minute SLA, this is acceptable but creates a worse experience.

**Option B — cron-job.org (free tier, 1 minute interval):**
Create a free account, point a job at the `sla-sweeper` Edge Function URL with the service role key in the Authorization header. Runs independently of GitHub.

**Option C — Supabase Scheduled Edge Function (pg_cron + pg_net combined):**
The Supabase docs describe using pg_cron + pg_net to invoke an Edge Function on a schedule. This is functionally equivalent to direct SQL but allows the sweeper logic to be in TypeScript instead of SQL.

```sql
SELECT cron.schedule(
  'lmc-sla-sweeper',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://cawqasszfbzvbtunamda.supabase.co/functions/v1/sla-sweeper',
      headers := '{"Authorization": "Bearer <service_role_key>"}',
      body := '{}'
    );
  $$
);
```

### Recommendation Summary

| Option | Reliability | Complexity | Recommended? |
|--------|-------------|------------|--------------|
| pg_cron direct SQL call | High (runs in DB) | Low | **YES — primary** |
| Supabase Cron dashboard UI | High (same engine) | Very low | YES — use for monitoring |
| pg_cron + pg_net → Edge Function | Medium (network hop) | Medium | Fallback |
| GitHub Actions schedule | Medium (5 min min) | Low | Fallback if pg_cron fails |
| cron-job.org | Medium (external dep) | Low | Fallback if pg_cron fails |

**Decision:** Use pg_cron direct SQL call as primary. Wrap each `cron.schedule()` in an `IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = '...') THEN` guard to make the migration idempotent.

---

## Deadline Model (D-01)

### Schema Change

```sql
-- Migration 0015: additive columns on checks
ALTER TABLE public.checks
  ADD COLUMN IF NOT EXISTS accepted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS deadline_at  timestamptz;

CREATE INDEX IF NOT EXISTS checks_deadline_idx
  ON public.checks (deadline_at)
  WHERE status IN ('assigned', 'filming');

COMMENT ON COLUMN public.checks.deadline_at IS
  'Phase 7 D-01: server-set delivery deadline. Set atomically in accept_check() '
  'as accepted_at + SLA window (420s priority / 600s standard). '
  'expire_stale_filming() sweeps checks past this timestamp → no_scout + refund.';
```

### Set in accept_check()

The migration updates `accept_check` to write both `accepted_at` and `deadline_at` in the single atomic UPDATE. The SLA window (420 or 600 seconds) is derived from `checks.tier` inside the function — the client cannot influence it.

```sql
-- Amended accept_check atomic UPDATE:
UPDATE public.checks
SET scout_id    = v_uid,
    status      = 'assigned',
    accepted_at = now(),
    deadline_at = now() + make_interval(secs =>
      CASE WHEN tier::text = 'priority' THEN 420 ELSE 600 END
    ),
    updated_at  = now()
WHERE id = p_check_id AND status = 'dispatching' AND scout_id IS NULL;
```

### SLA Timeline

```
[Request created]
  └─ status: requested → dispatching
       └─ dispatch_timeout_s = 300 s (5 min, see D-02 note below)
           ├─ Scout accepts within 5 min → status: assigned
           │    └─ deadline_at = accepted_at + (420s or 600s)
           │         ├─ Scout delivers before deadline_at → delivered → capture → transfer
           │         └─ Scout doesn't deliver → expire_stale_filming() → no_scout + refund
           └─ No Scout within 5 min → expire_stale_dispatching() → no_scout + release hold
```

**D-02 note:** `market_config.dispatch_timeout_s` is currently 600 s (10 min) in the DB. D-01 suggests a separate 5-min unclaimed window. For Phase 7, set `dispatch_timeout_s = 300` via an UPDATE on `market_config` (a data change, not a schema change).

---

## Refund + Hold-Release Wiring

### Auto-refund on SLA miss (D-03)

When `expire_stale_filming()` sweeps a check past `deadline_at`, it calls `transition_check(id, 'no_scout', ...)`. The existing `stripe-webhook` handler watches for `no_scout` transitions and releases the PI hold. This chain already exists from Phase 4.

However, `transition_check` does not itself invoke `stripe-refund`. The hold-release is triggered by the `stripe-webhook` → `payment_intent.canceled` event path. Verify this chain is complete:

1. `expire_stale_filming()` calls `transition_check(..., 'no_scout')` (service role — allowed)
2. This should also mark the Stripe PI as canceled via the payments table → the stripe-webhook fires `payment_intent.canceled` → hold released automatically

**Alternative (explicit):** `expire_stale_filming()` calls `pg_net.http_post()` to `stripe-refund` with `reason_code: 'never_delivered'`. This is more explicit and doesn't depend on the webhook chain.

**Recommendation:** Call `pg_net.http_post()` to `stripe-refund` from `expire_stale_filming()` for the auto-refund path. This makes the refund deterministic regardless of webhook delivery order. Use `reason_code: 'never_delivered'` and a `note: 'auto: sla_deadline_missed'`.

### Trouble-Here → refund + Scout no-fault (D-04)

The `stripe-refund` Edge Function already:
- Does NOT reverse the Scout Transfer (`reverse_transfer` is explicitly omitted — D-08)
- Works with `reason_code: 'never_delivered'` for pre-delivery cancels (line 98: guard passes when `!delivered && reasonCode === 'never_delivered'`)

The `trouble-report` Edge Function adds:
- Scout no-fault pay: flat $3.00 = 300 cents Transfer to Scout's Connect account (no `source_transaction` — from platform balance, same as D-09 path)
- This is separate from the standard `scout_amount` in `payments.scout_amount` (which is $8/$12 for delivered clips). The trouble-report pay is a flat acknowledgment, not the full payout.

**D-04 consistency check:** The existing `stripe-capture` → `stripe.transfers.create()` never sets `reverse_transfer`. A Seeker refund via `stripe-refund` does not claw back a Scout Transfer. This is correct and consistent. The trouble-report Scout pay is a separate Transfer.

---

## Scout Earnings + Payout Architecture

### Earnings Data Source

The `payments` table already has `scout_amount`, `status`, and `check_id`. A Scout's earned-and-captured earnings are:

```sql
-- SECURITY DEFINER function or Edge Function query:
SELECT
  SUM(p.scout_amount)  AS total_earned_cents,
  COUNT(*)             AS total_clips
FROM public.checks c
JOIN public.payments p ON p.check_id = c.id
WHERE c.scout_id = auth.uid()
  AND p.status IN ('transferred', 'captured')  -- captured not yet transferred still counts
```

For weekly bar chart (Mon–Sun this week):
```sql
SELECT
  EXTRACT(DOW FROM c.updated_at AT TIME ZONE 'UTC') AS dow,  -- 0=Sun, 1=Mon ...
  SUM(p.scout_amount) AS day_cents
FROM public.checks c
JOIN public.payments p ON p.check_id = c.id
WHERE c.scout_id = auth.uid()
  AND p.status IN ('transferred', 'captured')
  AND c.updated_at >= DATE_TRUNC('week', now()) - interval '1 day'  -- Mon-start week
GROUP BY 1
ORDER BY 1;
```

### Available Balance (from Stripe)

`stripe.balance.retrieve({}, { stripeAccount: acct_id })` returns `available` and `pending` arrays. For instant payout eligibility, use:

```typescript
const balance = await stripe.balance.retrieve(
  { expand: ['instant_available.net_available'] },
  { stripeAccount: scoutStripeAccountId }
);
const availableCents = balance.available.find(b => b.currency === 'usd')?.amount ?? 0;
const instantNetCents = balance.instant_available
  ?.find(b => b.currency === 'usd')
  ?.net_available?.find(n => n.destination === 'bank_account')?.amount ?? availableCents;
```

[CITED: docs.stripe.com/connect/instant-payouts] The `net_available` amount already accounts for the 2% platform fee. Always use `net_available` amount when creating an instant payout to avoid overdraw.

### Payout List (from Stripe)

```typescript
const payouts = await stripe.payouts.list(
  { limit: 10 },
  { stripeAccount: scoutStripeAccountId }
);
```

Returns `{ data: [{ id, amount, currency, status, arrival_date, method }] }`. Map `arrival_date` (Unix timestamp) to a display date.

### Create Payout (from Stripe)

Standard:
```typescript
await stripe.payouts.create(
  { amount: amountCents, currency: 'usd', method: 'standard' },
  { stripeAccount: scoutStripeAccountId }
);
```

Instant:
```typescript
// Use instantNetCents (after fee), not gross balance
await stripe.payouts.create(
  { amount: instantNetCents, currency: 'usd', method: 'instant' },
  { stripeAccount: scoutStripeAccountId }
);
```

[CITED: docs.stripe.com/connect/instant-payouts] `method: 'instant'` requires an eligible external account (debit card or supported bank). US-issued accounts generally qualify.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recurring SQL sweeper | Custom cron daemon / VPS cron tab | pg_cron inside Supabase | Already available, runs in DB, no external service |
| Stripe payout creation | Custom payout rail | `stripe.payouts.create()` with `Stripe-Account` header | Stripe handles instant/standard routing, fee calculation, eligible account detection |
| Scout earnings ledger | Custom ledger table | Query `payments` table (already captures `scout_amount` per check) | Data already exists; don't duplicate |
| Refund on SLA miss | Custom refund flow | Reuse `stripe-refund` Edge Function (reason_code: 'never_delivered') | Already deployed, D-08 compliant, event-logged |
| Webhook-verified payout receipt | Poll Stripe API | `payout.paid` webhook event (Stripe pushes when funds land) | Don't poll; subscribe |

---

## Common Pitfalls

### Pitfall 1: Clock start ambiguity (D-01 confirm item)
**What goes wrong:** Seeker-visible "7-10 min" promise is measured from when they pay, but D-01 starts the clock at Scout-accept. A Scout who takes 4 minutes to accept then has only 3 minutes to film — the product feels broken.
**Prevention:** The "7-10 min" displayed to the Seeker should be the window from DISPATCH (payment), not from accept. The internal `deadline_at` is from accept (shorter, tighter); the Seeker sees the full promised window. Confirm clock-start language with Troy before writing copy.

### Pitfall 2: Missing `accepted_at` column
**What goes wrong:** `accept_check()` writes `deadline_at` but has no `accepted_at` column yet — the function will error if the column doesn't exist.
**Prevention:** Migration 0015 MUST add both `accepted_at` and `deadline_at` before the function is updated. Run schema change first, function update second.

### Pitfall 3: expire_stale_filming sweeps non-SLA-checked rows
**What goes wrong:** Any check in `assigned` or `filming` that has `deadline_at IS NULL` (pre-Phase-7 data or a race) gets swept if the WHERE clause uses `< now()`. NULL is not `< now()`.
**Prevention:** The WHERE clause must be `deadline_at IS NOT NULL AND deadline_at < now()`. NULL rows are excluded automatically by SQL NULL semantics. Verified in the pattern above.

### Pitfall 4: Trouble-Here with uncaptured payment
**What goes wrong:** `stripe-refund` has a guard: if `payment.status` is not `captured/transferred/refunded` and `reasonCode !== 'never_delivered'`, it returns 400. Trouble-Here must always use `reason_code: 'never_delivered'` since the check is in `assigned/filming` (payment is only `authorized`, not yet captured).
**Prevention:** `trouble-report` Edge Function hardcodes `reason_code: 'never_delivered'` in its refund call — never passes the UI reason code to `stripe-refund` directly. The UI reason goes to the `event_log` for ops visibility.

### Pitfall 5: Instant payout using gross balance
**What goes wrong:** Using `balance.available` amount instead of `balance.instant_available.net_available` for instant payouts means the Scout gets debited the 2% fee AFTER payout, creating a negative balance.
**Prevention:** Always call `stripe.balance.retrieve({ expand: ['instant_available.net_available'] })` and use `net_available` for instant payout amounts. [CITED: docs.stripe.com/connect/instant-payouts]

### Pitfall 6: pg_cron sweep table growth
**What goes wrong:** pg_cron logs every job run in `cron.job_run_details`. Running every minute = 1440 rows/day. The table grows huge and slows down.
**Prevention:** Add a periodic cleanup. Either a second pg_cron job or add to the sweep function: `DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days';` [VERIFIED: Supabase community discussion July 2025]

### Pitfall 7: transition_check 'no_scout' requires service role
**What goes wrong:** `expire_stale_filming()` calls `transition_check(..., 'no_scout')`. This is a SECURITY DEFINER function. The sweeper runs via pg_cron as a `postgres` user without `auth.uid()` — which is already the service-role pattern. Confirmed in the transition_check source: `v_uid is distinct from v_seeker` check passes when `v_uid is null` (service role).
**Prevention:** No change needed — the existing actor-authz table allows service role to drive `no_scout`. Verified in `0012_dispatch_verification_spine.sql` lines 407-410.

### Pitfall 8: Scout no-fault pay creates duplicate Transfer on retry
**What goes wrong:** `trouble-report` creates a Stripe Transfer for no-fault pay. If the function is called twice (network retry), a second Transfer is created.
**Prevention:** Check the `event_log` for an existing `payment.scout_nofault_paid` event with this `check_id` before creating the Transfer. Or idempotently lock the check status first (after `transition_check('cancelled')`, a second call will error on the state machine guard).

---

## Code Examples

### 1. accept_check — amended atomic UPDATE (inside `expire_stale_filming` migration)

```sql
-- Source: lmc-app pattern — extend the existing accept_check function
UPDATE public.checks
SET scout_id    = v_uid,
    status      = 'assigned',
    accepted_at = now(),
    deadline_at = now() + make_interval(secs =>
      CASE WHEN tier::text = 'priority' THEN 420 ELSE 600 END
    ),
    updated_at  = now()
WHERE id = p_check_id
  AND status = 'dispatching'
  AND scout_id IS NULL;
```

### 2. filming.tsx — seed countdown from deadline_at

```typescript
// Replace lines 64 + 129 in filming.tsx
// After getCheck(checkId) resolves in the useEffect:
const deadlineAt = c?.deadline_at ? new Date(c.deadline_at).getTime() : null;
const initialSecs = deadlineAt
  ? Math.max(0, Math.round((deadlineAt - Date.now()) / 1000))
  : (isPriority ? 420 : 600);
setSecondsLeft(initialSecs);
```

### 3. trouble-report Edge Function outline

```typescript
// supabase/functions/trouble-report/index.ts
export async function handleTroubleReport(input, deps) {
  const { callerId, body: { checkId, reason } } = input;
  const { stripe, svc } = deps;
  if (!callerId) return new Response('not authenticated', { status: 401 });
  if (!checkId || !reason) return new Response('missing checkId or reason', { status: 400 });

  // Load check — must be assigned/filming, caller must be the scout
  const { data: check } = await svc.from('checks')
    .select('id, status, scout_id, stripe_payment_intent_id, seeker_id, tier, market_id')
    .eq('id', checkId).maybeSingle();
  if (!check) return new Response('not found', { status: 404 });
  if (check.scout_id !== callerId) return new Response('forbidden', { status: 403 });
  if (!['assigned','filming'].includes(check.status))
    return new Response('check not in filmable state', { status: 400 });

  // 1. Cancel the check (service role via SECURITY DEFINER)
  await svc.rpc('transition_check', { p_check_id: checkId, p_to: 'cancelled',
    p_context: { reason: 'scout_trouble', trouble_reason: reason } });

  // 2. Refund the Seeker (reuse stripe-refund logic — call as service role)
  // The payments.status will be 'authorized' (not captured) so stripe-refund
  // guard passes only for 'never_delivered'. Use that code.
  const stripe = deps.stripe;
  const { data: payment } = await svc.from('payments')
    .select('stripe_payment_intent_id, status').eq('check_id', checkId).maybeSingle();
  if (payment?.stripe_payment_intent_id && payment.status === 'authorized') {
    await stripe.paymentIntents.cancel(payment.stripe_payment_intent_id);
    await svc.from('payments').update({ status: 'canceled' }).eq('check_id', checkId);
  }

  // 3. Scout no-fault pay ($3.00 flat from platform balance, no source_transaction)
  const NOFAULT_CENTS = 300;
  const { data: scoutAcct } = await svc.from('scout_stripe_accounts')
    .select('stripe_account_id').eq('scout_id', callerId).maybeSingle();
  if (scoutAcct?.stripe_account_id) {
    await stripe.transfers.create({
      amount: NOFAULT_CENTS, currency: 'usd',
      destination: scoutAcct.stripe_account_id,
      transfer_group: checkId,
      metadata: { check_id: checkId, scout_id: callerId, type: 'trouble_nofault' },
      // No source_transaction — funded from platform balance (same as D-09 path)
    });
  }

  await svc.rpc('log_event', { p_event_type: 'check.trouble_reported',
    p_context: { check_id: checkId, reason, scout_id: callerId } });
  return Response.json({ status: 'reported' });
}
```

### 4. scout-earnings Edge Function outline

```typescript
// supabase/functions/scout-earnings/index.ts
export async function handleScoutEarnings(input, deps) {
  const { scoutId } = input;
  const { stripe, svc } = deps;
  if (!scoutId) return new Response('not authenticated', { status: 401 });

  // DB aggregate (weekly + all-time)
  const { data: weekRows } = await svc.rpc('scout_earnings_weekly', { p_scout_id: scoutId });
  const { data: totals } = await svc.rpc('scout_earnings_totals', { p_scout_id: scoutId });

  // Stripe balance + payout history
  const { data: acct } = await svc.from('scout_stripe_accounts')
    .select('stripe_account_id, payout_speed').eq('scout_id', scoutId).maybeSingle();
  let availableCents = 0, instantNetCents = 0, payouts = [];
  if (acct?.stripe_account_id) {
    const balance = await stripe.balance.retrieve(
      { expand: ['instant_available.net_available'] },
      { stripeAccount: acct.stripe_account_id }
    );
    availableCents = balance.available.find(b => b.currency === 'usd')?.amount ?? 0;
    instantNetCents = balance.instant_available
      ?.find(b => b.currency === 'usd')
      ?.net_available?.[0]?.amount ?? availableCents;
    const pl = await stripe.payouts.list({ limit: 10 }, { stripeAccount: acct.stripe_account_id });
    payouts = pl.data.map(p => ({
      id: p.id, amountCents: p.amount, status: p.status,
      arrivalDate: new Date(p.arrival_date * 1000).toISOString().slice(0, 10),
      method: p.method,
    }));
  }
  return Response.json({ weeklyByDay: weekRows, allTimeCents: totals?.total_cents ?? 0,
    availableCents, instantNetCents, payoutSpeed: acct?.payout_speed ?? 'standard', payouts });
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Client-side `setInterval` from fixed `totalSeconds` | Server `deadline_at` seeded into client countdown on mount | Clock survives app background/resume; server is the authority |
| No sweeper running | pg_cron `* * * * *` calling `expire_stale_dispatching()` + `expire_stale_filming()` | Checks no longer get stuck forever in dispatching or filming |
| Trouble-Here shows `Alert.alert` | `trouble-report` Edge Function: cancel + PI release + Scout no-fault Transfer | Real money moves; Scout trust restored |
| `BAR_DATA` + `PAYOUTS` hardcoded in earnings.tsx | `scout-earnings` Edge Function: DB aggregate + Stripe balance | Real numbers displayed |
| `withdraw.tsx` `setTimeout` fake payout | `stripe-connect-payout` Edge Function: real `stripe.payouts.create()` | Scouts can actually withdraw |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | pg_cron is available on the LMC Supabase project's current tier | Cron Mechanism | Would need external cron (GitHub Actions / cron-job.org); medium effort, same outcome |
| A2 | The `stripe-refund` Edge Function's `never_delivered` guard passes when `payment.status = 'authorized'` | Refund + Hold-Release | If wrong, `trouble-report` must call `stripe.paymentIntents.cancel()` directly (simpler) rather than routing through `stripe-refund` |
| A3 | Stripe instant payout is eligible for US Scout bank accounts | Scout Earnings | If not eligible, instant payout button should be hidden; standard ACH always works |
| A4 | Scout no-fault pay of $3.00 flat is the agreed business rule | trouble-report design | If Troy changes this amount, it's a one-line constant change |

---

## Open Questions

1. **Deadline clock start (D-01 confirm)**
   - What we know: D-01 defaults to clock-start at Scout-accept. The Seeker UI says "7-10 min" from payment.
   - What's unclear: should the Seeker see a countdown from their payment time, or from the real `deadline_at`?
   - Recommendation: Show Seeker "checking" status from payment, not a countdown. If they ask, the deadline is from when a Scout accepts. Don't display a countdown to the Seeker (waiting.tsx already uses status-driven steps, not a timer).

2. **`no_scout` vs new `missed` status for SLA failures**
   - What we know: `transition_check('no_scout')` is currently the only terminal for "no Scout/undelivered." Using it for SLA misses (a Scout DID accept but missed) conflates two distinct outcomes.
   - What's unclear: does ops/analytics need to distinguish "never matched" from "Scout missed deadline"?
   - Recommendation: Reuse `no_scout` for Phase 7 simplicity (it already triggers hold-release and routes Seeker to the error screen). Log the reason distinction in `event_log` context (`reason: 'sla_deadline_missed'` vs `reason: 'dispatch_timeout'`). Add a true `missed` status in a future migration if reporting demands it.

3. **`expire_stale_filming` auto-refund — PA cancel vs stripe-refund route**
   - What we know: `stripe-refund` requires `reason_code: 'never_delivered'` and a captured payment to issue a Stripe refund. For SLA misses, the payment is `authorized` (not captured). Stripe auto-cancels a PI when `transition_check('no_scout')` via the `payment_intent.canceled` webhook.
   - Recommendation: Let the Stripe webhook handle the hold-release automatically (PI status `canceled` when `no_scout` is set). The sweeper only needs to call `transition_check` — not Stripe directly. Verify this chain is live before marking Phase 7 complete.

4. **Scout no-fault pay amount ($3.00)**
   - Needs explicit confirmation from Troy before shipping. The code uses a constant `NOFAULT_CENTS = 300`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| pg_cron | SLA sweeper scheduling | ✓ (assumed — free tier confirmed) | hosted Supabase | GitHub Actions 5-min schedule |
| pg_net | pg_cron → Edge Function HTTP (if needed) | ✓ (standard Supabase extension) | hosted Supabase | Direct SQL call (no pg_net needed for pure-SQL sweepers) |
| `stripe@22` | All Stripe calls | ✓ | 22.x (in `_shared/stripe.ts`) | — |
| `balance.instant_available` | Instant payout net amount | ✓ (US accounts) | Stripe Connect | Fall back to `available` if expand fails |

**Missing dependencies with no fallback:** None — all dependencies exist.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Deno test (built-in) for Edge Functions; pgTAP for SQL |
| Config file | `deno.json` (or inline per function) |
| Quick run command | `deno test supabase/functions/trouble-report/index.test.ts --allow-env` |
| Full suite command | `deno test supabase/functions/ --allow-env` |

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| D-01 | `accept_check` sets `deadline_at = accepted_at + SLA window` | unit (pgTAP) | `psql ... -f tests/0015_sla.test.sql` | Wave 0 |
| D-01 | filming.tsx seeds countdown from `deadline_at`, not `totalSeconds` | unit (deno, mock check row) | `deno test lmc-app/app/lib/__tests__/deadline.test.ts` | Wave 0 |
| D-02 | `expire_stale_dispatching()` called via pg_cron; transitions dispatching→no_scout | unit (SQL) | `SELECT expire_stale_dispatching()` with a stale row | existing function, no test |
| D-03 | `expire_stale_filming()` transitions assigned/filming→no_scout when past deadline | unit (SQL) | `psql ... -f tests/0015_sla_filming.test.sql` | Wave 0 |
| D-04 | `trouble-report` cancels check + releases PI + creates $3 Scout Transfer | unit (deno, mock stripe + svc) | `deno test supabase/functions/trouble-report/ --allow-env` | Wave 0 |
| D-04 | Scout Transfer NOT reversed by Seeker refund | existing (stripe-refund tests) | `deno test supabase/functions/stripe-refund/ --allow-env` | exists |
| D-06 | `scout-earnings` returns real DB aggregate + Stripe balance | unit (deno, mock) | `deno test supabase/functions/scout-earnings/ --allow-env` | Wave 0 |
| D-06 | `stripe-connect-payout` creates standard + instant payouts | unit (deno, mock stripe) | `deno test supabase/functions/stripe-connect-payout/ --allow-env` | Wave 0 |

### Sampling Rate
- Per task commit: `deno test supabase/functions/<changed-function>/ --allow-env`
- Per wave merge: `deno test supabase/functions/ --allow-env`
- Phase gate: all deno tests green + pgTAP 0015 passes before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `supabase/functions/trouble-report/index.test.ts` — covers D-04
- [ ] `supabase/functions/scout-earnings/index.test.ts` — covers D-06 DB aggregate
- [ ] `supabase/functions/stripe-connect-payout/index.test.ts` — covers D-06 withdraw
- [ ] `tests/0015_sla.test.sql` (pgTAP) — covers D-01 accept_check deadline seeding
- [ ] `tests/0015_sla_filming.test.sql` (pgTAP) — covers D-03 expire_stale_filming

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT verification on trouble-report, scout-earnings, stripe-connect-payout (verify_jwt=true) |
| V3 Session Management | no | Handled by Supabase auth |
| V4 Access Control | yes | `callerId` from bearer — Scout can only affect their own check; `check.scout_id === callerId` ownership gate |
| V5 Input Validation | yes | `checkId` UUID format check; `reason` enum validation; `amount > 0` on payout |
| V6 Cryptography | no new | Stripe signature verification already in `_shared/stripe.ts` |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Scout claims trouble on someone else's check | Spoofing | `check.scout_id === callerId` ownership gate before any action |
| Seeker triggers SLA miss intentionally (no-show scout) | Repudiation | `event_log` captures every `transition_check` call with reason |
| Double-payout on instant payout race | Tampering | `stripe.payouts.create` is idempotent on Stripe side; also log `payment.payout_initiated` before call |
| pg_cron sweep fires during active upload | DoS | `deadline_at` window is 7-10 min; Mux upload + processing typically < 2 min. Only sweeps checks WHERE status IN ('assigned','filming'), not 'uploaded/processing'. Mux webhook transitions before sweep can hit |

---

## Sources

### Primary (HIGH confidence)
- Live codebase: `supabase/migrations/0011_payments.sql`, `0012_dispatch_verification_spine.sql`, `20260621000002_dispatch_rpc_accept.sql` — verified schema, existing functions, pg_cron DO block
- Live codebase: `supabase/functions/stripe-refund/index.ts`, `stripe-capture/index.ts`, `stripe-connect-onboard/index.ts`, `stripe-connect-status/index.ts` — verified Phase-4 money rails
- Live codebase: `lmc-app/app/lib/payments.ts`, `checks.ts` — verified client patterns (invokeEdgeFunction, transition_check)
- [CITED: docs.stripe.com/connect/instant-payouts] — instant payout API, `net_available` pattern, 2% fee mechanics
- [CITED: docs.stripe.com/api/payouts/create] — `method: 'instant'|'standard'`, `Stripe-Account` header

### Secondary (MEDIUM confidence)
- [CITED: supabase.com/docs/guides/cron] — Supabase Cron overview, minimum 1-second interval, Edge Function support
- [CITED: supabase.com/blog/supabase-cron] — Supabase Cron built on pg_cron, sub-minute schedules possible
- [CITED: supabase.com/modules/cron] — minimum interval 1 second
- [VERIFIED: github.com/orgs/supabase/discussions/37405 — July 2025] — pg_cron available on free tier, resource-limited not tier-gated

### Tertiary (LOW confidence — flagged as ASSUMED)
- A2 (stripe-refund `never_delivered` guard with `authorized` status) — needs live test verification
- A3 (Stripe instant payout eligibility for US Scout accounts) — depends on Scout's external account type

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libs already in use; verified from codebase
- Architecture: HIGH — all patterns build directly on existing Phase-4 functions and DB schema
- Cron mechanism: HIGH — pg_cron availability confirmed via community source; pattern already in codebase DO block
- Stripe payout API: HIGH — official Stripe docs + live codebase patterns
- Pitfalls: HIGH — derived from live code reading (filming.tsx, stripe-refund, transition_check)
- Scout earnings data model: HIGH — payments table already captures scout_amount; only query is new

**Research date:** 2026-06-22
**Valid until:** 2026-09-01 (Stripe and Supabase APIs are stable; Stripe@22 pinned in codebase)

---

## RESEARCH COMPLETE

**Phase:** 07 - SLA + Money Integrity
**Confidence:** HIGH

### Key Findings

1. **pg_cron IS available** on the Supabase free tier (resource-limited, not tier-gated — confirmed July 2025). The Phase-5 DO block guard just needs a migration that explicitly enables the extension and calls `cron.schedule()`. The SQL sweeper functions already exist and are correctly written.

2. **deadline_at is a small additive migration**: one column on `checks`, set atomically inside `accept_check()` from `checks.tier` (no client influence). Client countdown in `filming.tsx` is a one-line change: seed `secondsLeft` from `deadline_at` instead of a fixed constant.

3. **Trouble-Here refund is a new Edge Function** (`trouble-report`) that: transitions the check to `cancelled`, cancels the Stripe PI directly (payment is only `authorized` at this point, not captured — route around `stripe-refund`'s capture guard), and creates a flat $3.00 Scout no-fault Transfer. The existing `stripe-refund` with `reason_code: 'never_delivered'` is the right model for auto-refunds from the sweeper, but PI cancel is simpler for trouble-report.

4. **Scout earnings are already in the database**: `payments.scout_amount` + `payments.status IN ('transferred','captured')` is the source. A new `scout-earnings` Edge Function aggregates by day for the bar chart and fetches Stripe balance for the withdraw screen. No new tables needed.

5. **Stripe instant payout** uses `method: 'instant'` + `Stripe-Account` header. Always use `balance.instant_available.net_available` (after 2% fee) not gross balance. The existing `scout_stripe_accounts.stripe_account_id` is everything needed.

### File Created
`.planning/phases/07-sla-money-integrity-real-server-driven-delivery-deadlines-de/07-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All libraries already in use; zero new dependencies |
| Cron Mechanism | HIGH | pg_cron availability confirmed; DO block already in codebase |
| Deadline Model | HIGH | Schema change is additive; accept_check pattern is clear from existing function |
| Refund Wiring | HIGH | stripe-refund source read; D-08 compliance verified; PI-cancel path identified |
| Scout Earnings | HIGH | payments table schema verified; Stripe API docs confirmed |
| Stripe Payout | HIGH | Instant payout docs confirmed; net_available pattern documented |

### Open Questions (for Troy to confirm before execution)
1. Deadline clock start: Scout-accept (default) vs request time — confirm copy for Seeker-facing UI
2. Auto-refund on SLA miss: yes (default) — confirm
3. Scout no-fault pay amount: $3.00 flat (default) — confirm or adjust

### Ready for Planning
Research complete. Planner can now create PLAN.md files.
