-- 0023 — Referral qualify hook
-- Completes the referral loop: when a referred user's check reaches 'delivered',
-- credit their referrer (amounts come from referral_config; default 0 until set).
-- Covers BOTH sides: a referred SEEKER completing a paid check, and a referred
-- SCOUT completing their first delivery. Idempotent via qualify_referral()
-- (which sets status='qualified' + has a unique(referral_id, reason) credit guard),
-- and the status-transition guard below (only fires on the transition into delivered).

create or replace function public.qualify_referrals_on_delivery()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if new.status = 'delivered' and (old.status is distinct from 'delivered') then
    -- Referred SEEKER qualifies on a delivered (paid) check.
    for r in
      select id from public.referrals
      where referred_id = new.seeker_id and status = 'pending'
    loop
      perform public.qualify_referral(r.id);
    end loop;

    -- Referred SCOUT qualifies on completing a delivery.
    if new.scout_id is not null then
      for r in
        select id from public.referrals
        where referred_id = new.scout_id and status = 'pending'
      loop
        perform public.qualify_referral(r.id);
      end loop;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_qualify_referrals_on_delivery on public.checks;
create trigger trg_qualify_referrals_on_delivery
  after update on public.checks
  for each row
  execute function public.qualify_referrals_on_delivery();

comment on function public.qualify_referrals_on_delivery() is
  'Credits a referrer when their referred seeker/scout first reaches a delivered check. Amounts from referral_config (default 0). Idempotent.';
