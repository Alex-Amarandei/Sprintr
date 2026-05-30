-- Migration 5: per-order chat (messages) + Realtime.
-- Participants = the order's customer + shop members (staff+). Courier is not involved.
-- Messages are immutable; clients insert directly (RLS-guarded), Realtime delivers them.

create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id)   on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);
create index on public.messages (order_id, created_at);

alter table public.messages enable row level security;

-- Read history if you're a participant (the order's customer OR a shop member) — any status.
create policy "messages_select_participant" on public.messages
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id
            and (o.customer_id = (select auth.uid()) or public.is_shop_member(o.shop_id)))
  );

-- Post only while the order is still active: NOT done/rejected and not archived.
create policy "messages_insert_participant" on public.messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.status not in ('done','rejected')
        and o.archived_at is null
        and (o.customer_id = (select auth.uid()) or public.is_shop_member(o.shop_id))
    )
  );
-- (no update/delete policies → messages are immutable)

alter publication supabase_realtime add table public.messages;
