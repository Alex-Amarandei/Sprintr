-- Persistent notification feed. Recipient-owned; rows are created only by the triggers below
-- (definer-owned), never directly by clients.
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,                 -- order_status | new_order | message | review
  title      text not null,
  body       text,
  href       text,                          -- deep link
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.notifications;

-- ── Triggers (definer-owned; insert bypasses RLS) ───────────────────────────────
-- Customer ← order status change.
create or replace function public.notify_order_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, type, title, href)
    values (new.customer_id, 'order_status',
      case new.status
        when 'accepted'    then 'Comanda a fost acceptată'
        when 'in_progress' then 'Comanda ta este în pregătire'
        when 'in_delivery' then 'Comanda ta este în livrare'
        when 'done'        then 'Comanda ta este gata'
        when 'rejected'    then 'Comanda a fost respinsă'
        else 'Status comandă actualizat'
      end,
      '/order/' || new.id);
  end if;
  return new;
end; $$;
create trigger orders_notify_status after update of status on public.orders
  for each row execute function public.notify_order_status();

-- Shop members ← new order.
create or replace function public.notify_new_order()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, type, title, href)
  select sp.profile_id, 'new_order', 'Comandă nouă primită', '/dashboard/orders/' || new.id
  from public.shop_permissions sp where sp.shop_id = new.shop_id;
  return new;
end; $$;
create trigger orders_notify_new after insert on public.orders
  for each row execute function public.notify_new_order();

-- The other party ← new chat message.
create or replace function public.notify_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_customer uuid; v_shop uuid;
begin
  select customer_id, shop_id into v_customer, v_shop from public.orders where id = new.order_id;
  if new.sender_id = v_customer then
    insert into public.notifications (user_id, type, title, body, href)
    select sp.profile_id, 'message', 'Mesaj nou de la client', left(new.body, 120),
           '/dashboard/orders/' || new.order_id
    from public.shop_permissions sp
    where sp.shop_id = v_shop and sp.profile_id <> new.sender_id;
  else
    insert into public.notifications (user_id, type, title, body, href)
    values (v_customer, 'message', 'Mesaj nou de la magazin', left(new.body, 120),
            '/order/' || new.order_id);
  end if;
  return new;
end; $$;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_message();

-- Shop members ← new review.
create or replace function public.notify_review()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, type, title, body, href)
  select sp.profile_id, 'review', 'Recenzie nouă', new.rating || '★', '/dashboard/reviews'
  from public.shop_permissions sp where sp.shop_id = new.shop_id;
  return new;
end; $$;
create trigger reviews_notify after insert on public.reviews
  for each row execute function public.notify_review();

-- Trigger-only functions: not callable as RPCs.
revoke execute on function public.notify_order_status() from public, anon, authenticated;
revoke execute on function public.notify_new_order() from public, anon, authenticated;
revoke execute on function public.notify_message() from public, anon, authenticated;
revoke execute on function public.notify_review() from public, anon, authenticated;
