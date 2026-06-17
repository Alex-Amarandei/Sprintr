create type public.modification_status as enum ('pending', 'accepted', 'declined', 'cancelled');

-- A shop-proposed change to a placed order, pending the customer's acceptance. `adjustment` is
-- signed: positive = extra charge, negative = reduction. On acceptance the order total/payout move
-- by `adjustment`; an online reduction auto-refunds the difference, an online extra charge is billed
-- via a separate delta PaymentIntent the customer confirms. Writes go through service-role server
-- actions (which enforce who-may-do-what + the Stripe reconciliation); RLS here only gates reads.
create table public.order_modifications (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  adjustment     numeric(10,2) not null,
  reason         text,
  status         public.modification_status not null default 'pending',
  previous_total numeric(10,2) not null,
  new_total      numeric(10,2) not null,
  payment_intent text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz
);
create index on public.order_modifications (order_id, created_at desc);

-- Net of accepted adjustments, frozen onto the order for the breakdown line.
alter table public.orders add column adjustment numeric(10,2) not null default 0;

alter table public.order_modifications enable row level security;
-- Participants (the order's customer or a member of its shop) can read; all writes are service-role.
create policy "order_mods_select" on public.order_modifications for select to authenticated using (
  exists (
    select 1 from public.orders o where o.id = order_id
      and (o.customer_id = (select auth.uid()) or public.is_shop_member(o.shop_id))
  )
);

alter publication supabase_realtime add table public.order_modifications;
