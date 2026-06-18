-- Stamp completed_at on the new terminal statuses (picked_up / delivered) too.
create or replace function public.orders_set_completed_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status in ('done','rejected','picked_up','delivered')
     and old.status is distinct from new.status
     and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end; $$;

-- Customer notifications for the new statuses.
create or replace function public.notify_order_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_shop_name text;
begin
  if new.status is distinct from old.status then
    select name into v_shop_name from public.shops where id = new.shop_id;
    insert into public.notifications (user_id, type, title, body, href)
    values (new.customer_id, 'order_status',
      case new.status
        when 'accepted'         then 'Comanda a fost acceptată'
        when 'in_progress'      then 'Comanda ta este în pregătire'
        when 'ready_for_pickup' then 'Comanda ta este gata de ridicare'
        when 'in_delivery'      then 'Comanda ta este în livrare'
        when 'picked_up'        then 'Comanda ta a fost ridicată'
        when 'delivered'        then 'Comanda ta a fost livrată'
        when 'done'             then 'Comanda ta este gata'
        when 'rejected'         then 'Comanda a fost respinsă'
        else 'Status comandă actualizat'
      end,
      'Comanda #' || substr(new.id::text, 1, 8) || coalesce(' · ' || v_shop_name, ''),
      '/order/' || new.id);
  end if;
  return new;
end; $$;
revoke execute on function public.notify_order_status() from public, anon, authenticated;

-- Auto-archive cron includes the new terminal statuses.
select cron.schedule('archive-completed-orders', '0 * * * *', $$
  update public.orders set archived_at = now()
  where archived_at is null and status in ('done','rejected','picked_up','delivered')
    and completed_at is not null and completed_at < now() - interval '1 day'
$$);
