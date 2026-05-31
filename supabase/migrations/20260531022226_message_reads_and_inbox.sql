-- Per-(order, user) read marker so the shop can track unread chat messages.
create table public.message_reads (
  order_id     uuid not null references public.orders(id)   on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (order_id, profile_id)
);
-- (RLS auto-enabled by the ensure_rls event trigger; policies below.)

-- A user manages only their OWN read markers.
create policy "message_reads_select_own" on public.message_reads
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "message_reads_insert_own" on public.message_reads
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "message_reads_update_own" on public.message_reads
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- Count of unread CUSTOMER messages across the caller's shop orders → the sidebar dot.
create function public.shop_unread_count()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::int
  from public.messages m
  join public.orders o on o.id = m.order_id
  left join public.message_reads r
    on r.order_id = m.order_id and r.profile_id = (select auth.uid())
  where public.is_shop_member(o.shop_id)
    and m.sender_id = o.customer_id
    and (r.last_read_at is null or m.created_at > r.last_read_at);
$$;
revoke execute on function public.shop_unread_count() from public, anon;
grant execute on function public.shop_unread_count() to authenticated;

-- One row per order that has messages, for the inbox list: last message + unread count
-- + the customer's name (SECURITY DEFINER bypasses the profiles RLS that hides it).
create function public.shop_conversations()
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
      left join public.message_reads r
        on r.order_id = m2.order_id and r.profile_id = (select auth.uid())
      where m2.order_id = mo.id
        and m2.sender_id = mo.customer_id
        and (r.last_read_at is null or m2.created_at > r.last_read_at)
    )
  from my_orders mo
  join ranked last on last.order_id = mo.id and last.rn = 1
  left join public.profiles p on p.id = mo.customer_id
  order by last.created_at desc;
$$;
revoke execute on function public.shop_conversations() from public, anon;
grant execute on function public.shop_conversations() to authenticated;
