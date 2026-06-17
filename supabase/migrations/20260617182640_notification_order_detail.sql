-- Give the customer's order-status notification more detail: the order reference + shop name
-- in the body (was null → generic title only).
create or replace function public.notify_order_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_shop_name text;
begin
  if new.status is distinct from old.status then
    select name into v_shop_name from public.shops where id = new.shop_id;
    insert into public.notifications (user_id, type, title, body, href)
    values (new.customer_id, 'order_status',
      case new.status
        when 'accepted'    then 'Comanda a fost acceptată'
        when 'in_progress' then 'Comanda ta este în pregătire'
        when 'in_delivery' then 'Comanda ta este în livrare'
        when 'done'        then 'Comanda ta este gata'
        when 'rejected'    then 'Comanda a fost respinsă'
        else 'Status comandă actualizat'
      end,
      'Comanda #' || substr(new.id::text, 1, 8) || coalesce(' · ' || v_shop_name, ''),
      '/order/' || new.id);
  end if;
  return new;
end; $$;
revoke execute on function public.notify_order_status() from public, anon, authenticated;
