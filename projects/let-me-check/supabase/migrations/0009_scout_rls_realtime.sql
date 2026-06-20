-- 0009_scout_rls_realtime.sql
-- LMC Phase 2 — One Real Check: open the narrow Scout read path, secure clips, and
-- enable Realtime on checks.
--
-- Phase 1 RLS (0005) only let a user SELECT checks where auth.uid() = seeker_id, so
-- a Scout could see NOTHING to accept. This migration ADDS two narrow Scout SELECT
-- policies (open + own-assigned) WITHOUT touching the seeker-own policy and WITHOUT
-- introducing any UPDATE policy — status/scout_id stay server-only (accept_check /
-- transition_check, 0007). It also enables Postgres Changes on checks (DISP-04) so a
-- Seeker can watch their own row live, RLS-enforced per event by checks_select_own.

-- 1. Narrow Scout SELECT on checks (ADD; do not replace checks_select_own) -----
-- Open checks: any authenticated Scout can see a dispatching, unclaimed check.
create policy checks_select_open_for_scouts on public.checks
  for select to authenticated
  using (status = 'dispatching' and scout_id is null);

-- Own assigned: a Scout sees the checks they have claimed.
create policy checks_select_assigned_scout on public.checks
  for select to authenticated
  using (auth.uid() = scout_id);

-- Together with checks_select_own (seeker), a Scout sees: open + own-assigned +
-- (if they are also the seeker) their own — but NEVER another seeker's delivered
-- check. There is deliberately NO update/delete policy on checks (DATA-02 holds).

-- 2. clips RLS --------------------------------------------------------------
alter table public.clips enable row level security;

-- Read: the check's seeker OR its assigned scout may read its clips.
create policy clips_select_participant on public.clips
  for select to authenticated
  using (
    exists (
      select 1 from public.checks c
      where c.id = clips.check_id
        and (c.seeker_id = auth.uid() or c.scout_id = auth.uid())
    )
  );

-- Insert: ONLY the assigned scout, and only while the check is in 'filming'
-- (the stub clip is inserted just before transition_check drives 'delivered').
create policy clips_insert_assigned_scout on public.clips
  for insert to authenticated
  with check (
    exists (
      select 1 from public.checks c
      where c.id = clips.check_id
        and c.scout_id = auth.uid() and c.status = 'filming'
    )
  );
-- (no update/delete policy on clips for authenticated)

-- 3. Realtime publication on checks (DISP-04) -------------------------------
-- Postgres Changes requires the table be in the supabase_realtime publication.
-- Version-controlling the toggle here (Pitfall 3). The Seeker subscribes to their
-- own check row (filter id=eq.<checkId>); each event is RLS-checked against
-- checks_select_own before delivery, so a Seeker only receives their own updates.
alter publication supabase_realtime add table public.checks;
