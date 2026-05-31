-- Platform commission, configured per shop (admin-only), deducted from the shop's payout — never
-- paid by or shown to the customer. Each order freezes `commission` (platform keeps) + `payout`
-- (shop gets) so reporting is a column sum, no recompute. Replaces the old +6% customer fee.

alter table public.shops
  add column commission_rate numeric(6,4) not null default 0.0500,  -- 5%
  add column commission_min  numeric(10,2) not null default 2.00;   -- floor, in lei

alter table public.orders
  add column commission numeric(10,2) not null default 0,  -- platform keeps (out of payout)
  add column payout     numeric(10,2) not null default 0;  -- goes to the shop

-- Only admins may change a shop's commission settings. Owners/staff can edit everything else on
-- their shop, but not these. (Allowed when there's no auth context — migrations / service role.)
create or replace function public.shops_guard_commission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.commission_rate is distinct from old.commission_rate
      or new.commission_min is distinct from old.commission_min)
     and (select auth.uid()) is not null
     and not public.is_admin() then
    raise exception 'Doar administratorii pot modifica comisionul platformei';
  end if;
  return new;
end; $$;
create trigger shops_guard_commission before update on public.shops
  for each row execute function public.shops_guard_commission();
