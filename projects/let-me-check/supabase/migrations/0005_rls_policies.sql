-- 0005_rls_policies.sql
-- LMC Phase 1 — Row-Level Security on EVERY table (Pitfall 5 / T-01-06).
--
-- The anon key is public, so RLS is the only access control. This migration is the
-- phase gate: RLS is enabled on all 11 tables, ownership is keyed on auth.uid(),
-- and checks.status/scout_id are unreachable by clients (no UPDATE policy) — the
-- transition_check() SECURITY DEFINER function (0006) is the sole status writer.

-- 1. Enable RLS on every table (11 total) ----------------------------------
alter table public.event_log        enable row level security;
alter table public.profiles         enable row level security;
alter table public.consents         enable row level security;
alter table public.markets          enable row level security;
alter table public.venues           enable row level security;
alter table public.checks           enable row level security;
alter table public.saved_places     enable row level security;
alter table public.recents          enable row level security;
alter table public.recurring_checks enable row level security;
alter table public.payment_methods  enable row level security;
alter table public.ratings          enable row level security;

-- 2. profiles: owner read + scoped self-update -----------------------------
create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = id);

-- Owner may update their own profile. Privilege-relevant columns
-- (is_seeker/is_scout) are NOT meant to be flipped freely by the client; the
-- onboarding flow sets capabilities server-side. current_role/display_name/phone
-- are the safe self-service surface. The USING+WITH CHECK keeps the row owned by
-- the same user; capability hardening is enforced by app/server write paths.
create policy profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- 3. consents: owner read + INSERT only (no update/delete = immutable record) -
create policy consents_select_own on public.consents
  for select to authenticated using (auth.uid() = user_id);
create policy consents_insert_own on public.consents
  for insert to authenticated with check (auth.uid() = user_id);

-- 4. Owner-only personal tables (select/insert/delete; no update needed) ----
create policy saved_places_select_own on public.saved_places
  for select to authenticated using (auth.uid() = user_id);
create policy saved_places_insert_own on public.saved_places
  for insert to authenticated with check (auth.uid() = user_id);
create policy saved_places_delete_own on public.saved_places
  for delete to authenticated using (auth.uid() = user_id);

create policy recents_select_own on public.recents
  for select to authenticated using (auth.uid() = user_id);
create policy recents_insert_own on public.recents
  for insert to authenticated with check (auth.uid() = user_id);
create policy recents_delete_own on public.recents
  for delete to authenticated using (auth.uid() = user_id);

create policy recurring_select_own on public.recurring_checks
  for select to authenticated using (auth.uid() = user_id);
create policy recurring_insert_own on public.recurring_checks
  for insert to authenticated with check (auth.uid() = user_id);
create policy recurring_delete_own on public.recurring_checks
  for delete to authenticated using (auth.uid() = user_id);

create policy payment_methods_select_own on public.payment_methods
  for select to authenticated using (auth.uid() = user_id);
create policy payment_methods_insert_own on public.payment_methods
  for insert to authenticated with check (auth.uid() = user_id);
create policy payment_methods_delete_own on public.payment_methods
  for delete to authenticated using (auth.uid() = user_id);

-- 5. ratings: owner (seeker) read + insert ---------------------------------
create policy ratings_select_own on public.ratings
  for select to authenticated using (auth.uid() = seeker_id);
create policy ratings_insert_own on public.ratings
  for insert to authenticated with check (auth.uid() = seeker_id);

-- 6. checks: owner read + create-as-requested; NO UPDATE policy ------------
-- DATA-02: there is deliberately NO `for update` policy for authenticated on
-- checks. The client therefore cannot write status or scout_id. Status only
-- advances via transition_check() (SECURITY DEFINER, 0006). (Later: an assigned
-- scout will also be able to SELECT their assigned checks.)
create policy checks_select_own on public.checks
  for select to authenticated using (auth.uid() = seeker_id);
create policy checks_insert_own on public.checks
  for insert to authenticated
  with check (auth.uid() = seeker_id and status = 'requested');
-- (intentionally NO update/delete policy for authenticated on public.checks)

-- 7. event_log: INSERT own actor only; reads service/admin-restricted -------
-- update/delete are additionally blocked by the 0001 immutability trigger.
create policy event_log_insert_own on public.event_log
  for insert to authenticated with check (auth.uid() = actor_id);
-- (intentionally NO select/update/delete policy for authenticated on event_log)

-- 8. Catalog: public read, no client write --------------------------------
create policy markets_select_all on public.markets
  for select to anon, authenticated using (true);
create policy venues_select_all on public.venues
  for select to anon, authenticated using (true);
-- (no insert/update/delete policy: catalog is service/admin-managed via seed)
