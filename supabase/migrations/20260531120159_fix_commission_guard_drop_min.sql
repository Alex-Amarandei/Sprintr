-- The simplify_commission migration dropped shops.commission_min, but the
-- shops_guard_commission trigger still referenced new/old.commission_min, so every
-- UPDATE on shops threw "record new has no field commission_min". Redefine the guard
-- to only watch commission_rate.
create or replace function public.shops_guard_commission()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if new.commission_rate is distinct from old.commission_rate
     and (select auth.uid()) is not null
     and not public.is_admin() then
    raise exception 'Doar administratorii pot modifica comisionul platformei';
  end if;
  return new;
end; $$;

revoke execute on function public.shops_guard_commission() from public, anon, authenticated;
