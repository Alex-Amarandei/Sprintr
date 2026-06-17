-- Shop inbox + unread badge were scoped by membership (is_shop_member over ALL the viewer's
-- shops), so a multi-shop owner saw every shop's conversations at once. Add shop-scoped
-- overloads that filter to ONE shop (still authz'd via is_shop_member). The old no-arg
-- versions stay for now so the currently-deployed app keeps working until the new code lands;
-- a follow-up migration drops them.

create or replace function public.shop_conversations(p_shop_id uuid)
returns table(order_id uuid, customer_id uuid, customer_name text, status public.order_status,
              last_body text, last_sender uuid, last_at timestamptz, unread integer)
language sql stable security definer set search_path to '' as $$
  with my_orders as (
    select o.id, o.customer_id, o.shop_id, o.status
    from public.orders o
    where o.shop_id = p_shop_id and public.is_shop_member(p_shop_id)
  ),
  ranked as (
    select m.order_id, m.body, m.created_at, m.sender_id,
      row_number() over (partition by m.order_id order by m.created_at desc) as rn
    from public.messages m
    join my_orders mo on mo.id = m.order_id
  )
  select
    mo.id, mo.customer_id, p.full_name, mo.status, last.body, last.sender_id, last.created_at,
    (
      select count(*)::int
      from public.messages m2
      where m2.order_id = mo.id
        and m2.sender_id = mo.customer_id
        and m2.created_at > coalesce(
          (select max(r.last_read_at) from public.message_reads r
           where r.order_id = mo.id and r.profile_id <> mo.customer_id),
          'epoch'::timestamptz
        )
    )
  from my_orders mo
  join ranked last on last.order_id = mo.id and last.rn = 1
  left join public.profiles p on p.id = mo.customer_id
  order by last.created_at desc;
$$;

create or replace function public.shop_unread_count(p_shop_id uuid)
returns integer language sql stable security definer set search_path to '' as $$
  select count(*)::int
  from public.messages m
  join public.orders o on o.id = m.order_id
  where o.shop_id = p_shop_id
    and public.is_shop_member(p_shop_id)
    and m.sender_id = o.customer_id
    and m.created_at > coalesce(
      (select max(r.last_read_at) from public.message_reads r
       where r.order_id = m.order_id and r.profile_id <> o.customer_id),
      'epoch'::timestamptz
    );
$$;

revoke execute on function public.shop_conversations(uuid) from public, anon;
revoke execute on function public.shop_unread_count(uuid) from public, anon;
grant execute on function public.shop_conversations(uuid) to authenticated;
grant execute on function public.shop_unread_count(uuid) to authenticated;
