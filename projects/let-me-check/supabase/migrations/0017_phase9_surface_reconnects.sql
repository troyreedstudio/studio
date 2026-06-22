-- 0017_phase9_surface_reconnects.sql
-- LMC Phase 9 — Verified badge + Scout identity + quick-win reconnects.
--
-- Two changes:
--   (1) profiles: add notification_prefs (jsonb) + preferred_cities (text[]) for
--       the two un-persisted reconnect screens (D-04). The existing
--       profiles_update_own RLS policy (0005, row-level: auth.uid() = id) covers
--       these columns automatically — no RLS widening needed.
--   (2) SECURITY DEFINER RPC get_check_scout_public(p_check_id uuid): IDOR-safe
--       read that returns (display_name, avg_rating, clip_count) for the Scout of a
--       delivered check. The caller must OWN the check AND the check must be in
--       'delivered' or 'rated' status.
--
-- ⚠️  DO NOT call scout_earnings_totals() from inside this RPC. That function
--     has its own IDOR guard: it raises 'forbidden' when auth.uid() (the Seeker)
--     differs from p_scout_id (the Scout). Calling it for a different user from a
--     SECURITY DEFINER context where auth.uid() is the Seeker would self-trap.
--     clip_count is inlined instead (see below).
--
-- Plan 04 (Wave 3) pushes this migration to the live DB and re-runs pgTAP.
-- Plan 01 (this file) authors only — does NOT push.

-- ── (1) Profile storage columns ───────────────────────────────────────────────

alter table public.profiles
  add column if not exists notification_prefs jsonb,
  add column if not exists preferred_cities   text[];

comment on column public.profiles.notification_prefs is
  'Phase 9 D-04: Seeker notification toggle state, keyed by notification id '
  '(e.g. ''delivered'', ''scout-assigned''). NULL = no saved prefs (use client defaults).';

comment on column public.profiles.preferred_cities is
  'Phase 9 D-04: market/city IDs the Seeker has opted to follow for trending '
  'notifications. NULL = all cities. Stored as a text array of market.id values.';

-- ── (2) IDOR-safe scout identity RPC ─────────────────────────────────────────

-- get_check_scout_public: returns the Scout's public profile for a Seeker's OWN
-- delivered check. The function raises an exception if any of these hold:
--   • the check does not exist
--   • auth.uid() is not the check's seeker_id  ← THE IDOR GATE
--     (handles anon too: auth.uid()=null is distinct from any non-null seeker_id)
--   • the check is not yet delivered (status not in 'delivered' | 'rated')
-- If v_scout_id is null (edge case: orphaned delivered check), returns empty (0 rows).
-- avg_rating: computed from ratings joined through checks (may be null for fresh Scout).
-- clip_count: INLINED count of this Scout's delivered/rated checks — never calls
--             scout_earnings_totals (see ⚠️ above).

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
  -- Resolve the check row
  select
    c.scout_id,
    c.seeker_id,
    c.status::text
  into v_scout_id, v_seeker_id, v_status
  from public.checks c
  where c.id = p_check_id;

  if not found then
    raise exception 'get_check_scout_public: check % not found', p_check_id;
  end if;

  -- IDOR gate: caller must be the seeker of this check.
  -- `is distinct from` handles the anon case (auth.uid() = null) correctly:
  -- null IS DISTINCT FROM any non-null seeker_id → raises, so anon is denied.
  if v_seeker_id is distinct from auth.uid() then
    raise exception 'get_check_scout_public: caller does not own check %', p_check_id;
  end if;

  -- Status gate: scout is only visible once the check is delivered or rated.
  if v_status not in ('delivered', 'rated') then
    raise exception
      'get_check_scout_public: check % not yet delivered (status=%)',
      p_check_id, v_status;
  end if;

  -- Null scout guard: orphaned delivered check — return 0 rows so client falls back.
  if v_scout_id is null then
    return;
  end if;

  -- Return the scout's public profile.
  -- avg_rating: aggregate over all delivered/rated checks for this scout via ratings.
  -- clip_count: INLINED count — not via scout_earnings_totals (IDOR self-trap).
  return query
    select
      p.display_name,
      (
        select round(avg(r.stars)::numeric, 1)
          from public.ratings r
          join public.checks rc on rc.id = r.check_id
         where rc.scout_id = v_scout_id
           and rc.status::text in ('delivered', 'rated')
      ) as avg_rating,
      (
        select count(*)::bigint
          from public.checks c2
         where c2.scout_id = v_scout_id
           and c2.status::text in ('delivered', 'rated')
      ) as clip_count
    from public.profiles p
    where p.id = v_scout_id;
end;
$$;

comment on function public.get_check_scout_public(uuid) is
  'Phase 9 D-02: IDOR-safe scout identity for the Seeker delivery screen. '
  'Caller must own the check (checks.seeker_id = auth.uid()) AND the check must be '
  'in ''delivered'' or ''rated'' status. Returns (display_name, avg_rating, clip_count). '
  'SECURITY DEFINER — never exposes a scout profile outside the check-ownership gate. '
  'avg_rating may be null for a fresh Scout. clip_count is inlined (not via '
  'scout_earnings_totals — that function has a conflicting IDOR guard for cross-user calls).';
