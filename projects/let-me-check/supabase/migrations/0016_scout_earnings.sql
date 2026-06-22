-- 0016_scout_earnings.sql
-- LMC Phase 7 — SLA + Money Integrity: IDOR-safe Scout earnings RPCs.
--
-- Two SECURITY DEFINER functions that expose the Scout's earnings data to
-- the scout-earnings Edge Function. Both enforce that the calling user can
-- ONLY read their own earnings:
--   - The Edge Function derives p_scout_id = callerId from the verified bearer
--     (IDOR-safe at the Edge fn layer).
--   - These SQL functions add a SECOND defence-in-depth ownership check:
--     if p_scout_id differs from auth.uid() (and the caller is authenticated),
--     they raise 'forbidden'. Service role (auth.uid()=null) is allowed because
--     the Edge Function already verified identity at the Edge layer.
--
-- Tables read: checks (scout_id, updated_at), payments (scout_amount, status, check_id)
-- Counts: payments.status IN ('transferred','captured') — captured-but-not-yet-
-- transferred still counts as earned (Scout did the work; transfer is in-flight).
--
-- Plan 04 pushes this migration unconditionally.

-- ── scout_earnings_weekly ──────────────────────────────────────────────────────
-- Returns daily earnings for the calling Scout over the past 7 days.
-- Rows: (day date, cents bigint). Days with no earnings produce no row.
-- p_scout_id must equal auth.uid() unless caller is service role (auth.uid()=null).

create or replace function public.scout_earnings_weekly(p_scout_id uuid)
returns table(day date, cents bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- IDOR guard: reject if a non-null authenticated caller tries to read another scout's data.
  if p_scout_id is distinct from auth.uid() and auth.uid() is not null then
    raise exception 'forbidden';
  end if;

  return query
    select
      date_trunc('day', c.updated_at)::date as day,
      sum(p.scout_amount)::bigint            as cents
    from public.checks c
    join public.payments p on p.check_id = c.id
    where c.scout_id = p_scout_id
      and p.status in ('transferred', 'captured')
      and c.updated_at >= now() - interval '7 days'
    group by 1
    order by 1;
end;
$$;

comment on function public.scout_earnings_weekly(uuid) is
  'Phase 7 D-06: daily earnings for the past 7 days for a Scout. '
  'SECURITY DEFINER + IDOR guard: p_scout_id must equal auth.uid() unless service role. '
  'Counts payments with status IN (''transferred'',''captured'').';

-- ── scout_earnings_totals ──────────────────────────────────────────────────────
-- Returns all-time totals for the calling Scout.
-- Single row: (total_cents bigint, total_clips bigint).
-- p_scout_id must equal auth.uid() unless caller is service role (auth.uid()=null).

create or replace function public.scout_earnings_totals(p_scout_id uuid)
returns table(total_cents bigint, total_clips bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- IDOR guard: reject if a non-null authenticated caller tries to read another scout's data.
  if p_scout_id is distinct from auth.uid() and auth.uid() is not null then
    raise exception 'forbidden';
  end if;

  return query
    select
      coalesce(sum(p.scout_amount), 0)::bigint as total_cents,
      count(*)::bigint                          as total_clips
    from public.checks c
    join public.payments p on p.check_id = c.id
    where c.scout_id = p_scout_id
      and p.status in ('transferred', 'captured');
end;
$$;

comment on function public.scout_earnings_totals(uuid) is
  'Phase 7 D-06: all-time earnings total + clip count for a Scout. '
  'SECURITY DEFINER + IDOR guard: p_scout_id must equal auth.uid() unless service role. '
  'Counts payments with status IN (''transferred'',''captured'').';
