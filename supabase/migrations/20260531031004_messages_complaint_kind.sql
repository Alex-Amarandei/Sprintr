-- Per-order chat now carries two thread KINDS: 'order' (normal coordination, open while the
-- order is active) and 'complaint' (opens once the order is done/rejected, so a customer can
-- still report a problem after delivery). See CLAUDE.md "Chat lifecycle".
create type public.message_kind as enum ('order', 'complaint');
alter table public.messages add column kind public.message_kind not null default 'order';

-- Posting rules by kind: 'order' only while active (not done/rejected, not archived);
-- 'complaint' only once the order is terminal (done/rejected). Reading is unchanged
-- (participants read all kinds, any status).
drop policy "messages_insert_participant" on public.messages;
create policy "messages_insert_participant" on public.messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.customer_id = (select auth.uid()) or public.is_shop_member(o.shop_id))
        and (
          (kind = 'order'     and o.status not in ('done', 'rejected') and o.archived_at is null)
          or
          (kind = 'complaint' and o.status in ('done', 'rejected'))
        )
    )
  );
