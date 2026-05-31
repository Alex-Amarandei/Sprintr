-- Shop-wide read state: a conversation is "read" once ANY shop member has read past a
-- message. Unread is computed against the shared read frontier (max last_read_at among
-- non-customer readers for the order), instead of per-employee. markRead still upserts the
-- caller's own row — which advances the shared frontier for the whole shop.

create or replace function public.shop_unread_count()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int
  from public.messages m
  join public.orders o on o.id = m.order_id
  where public.is_shop_member(o.shop_id)
    and m.sender_id = o.customer_id
    and m.created_at > coalesce(
      (select max(r.last_read_at) from public.message_reads r
       where r.order_id = m.order_id and r.profile_id <> o.customer_id),
      'epoch'::timestamptz
    );
$$;

create or replace function public.shop_conversations()
returns table (
  order_id uuid,
  customer_id uuid,
  customer_name text,
  status public.order_status,
  last_body text,
  last_sender uuid,
  last_at timestamptz,
  unread integer
)
language sql stable security definer set search_path = '' as $$
  with my_orders as (
    select o.id, o.customer_id, o.shop_id, o.status
    from public.orders o
    where public.is_shop_member(o.shop_id)
  ),
  ranked as (
    select m.order_id, m.body, m.created_at, m.sender_id,
      row_number() over (partition by m.order_id order by m.created_at desc) as rn
    from public.messages m
    join my_orders mo on mo.id = m.order_id
  )
  select
    mo.id,
    mo.customer_id,
    p.full_name,
    mo.status,
    last.body,
    last.sender_id,
    last.created_at,
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
