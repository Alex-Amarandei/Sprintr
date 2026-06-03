-- An order only counts as "placed" (and worth notifying the shop about) when it's real:
--   • cash orders (cash_in_store / cash_on_delivery) — paid on handover → placed on insert;
--   • online orders — an incomplete checkout sits as payment_status='pending' → NOT placed.
-- So: notify on insert only for non-online (or already-paid) orders, and notify on the
-- payment paid-flip for online orders. This stops "Comandă nouă primită" firing before the
-- customer finishes paying. (FE getShopOrders/getShopOrderCounts apply the same visibility rule.)

create or replace function public.notify_new_order()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.payment_method <> 'online' or new.payment_status = 'paid' then
    insert into public.notifications (user_id, type, title, href)
    select sp.profile_id, 'new_order', 'Comandă nouă primită', '/dashboard/orders/' || new.id
    from public.shop_permissions sp where sp.shop_id = new.shop_id;
  end if;
  return new;
end; $function$;

-- Notify the shop when an online order's payment succeeds (webhook or client confirmation
-- flips payment_status → 'paid'). That's the moment an online order becomes a placed order.
create or replace function public.notify_paid_order()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.payment_method = 'online'
     and new.payment_status = 'paid'
     and old.payment_status is distinct from 'paid' then
    insert into public.notifications (user_id, type, title, href)
    select sp.profile_id, 'new_order', 'Comandă nouă primită', '/dashboard/orders/' || new.id
    from public.shop_permissions sp where sp.shop_id = new.shop_id;
  end if;
  return new;
end; $function$;

drop trigger if exists orders_notify_paid on public.orders;
create trigger orders_notify_paid
  after update of payment_status on public.orders
  for each row execute function public.notify_paid_order();

revoke execute on function public.notify_paid_order() from public, anon, authenticated;
