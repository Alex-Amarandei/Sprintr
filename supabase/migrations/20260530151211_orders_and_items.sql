-- Migration 4: orders + order_items + payment + upload bucket + auto-archive.
-- Orders are a mixed cart (services + products), each line a FROZEN snapshot. Orders are
-- inserted ONLY by the Edge Function (service role) after it recomputes/validates price —
-- clients never insert (tamper-proof). See CLAUDE.md "Pricing, orders & offers".

create type public.order_status    as enum ('pending','accepted','rejected','in_progress','done');
create type public.fulfilment_type as enum ('delivery','pickup');
create type public.item_kind       as enum ('service','product');
create type public.payment_method  as enum ('cash_in_store','cash_on_delivery','online');
create type public.payment_status  as enum ('pending','paid','failed','refunded');

create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  customer_id        uuid not null references public.profiles(id) on delete restrict,
  shop_id            uuid not null references public.shops(id)    on delete restrict,
  catalog_version_id uuid references public.catalog_versions(id)  on delete set null, -- provenance
  status             public.order_status    not null default 'pending',
  fulfilment         public.fulfilment_type not null default 'delivery',
  delivery_address   text,          -- required when fulfilment='delivery' (Edge Fn enforces)
  contact_phone      text,
  notes              text,
  subtotal           numeric(10,2) not null default 0,
  total              numeric(10,2) not null default 0,   -- = subtotal until offers land
  payment_method     public.payment_method  not null default 'cash_on_delivery',
  payment_status     public.payment_status  not null default 'pending',
  payment_ref        text,          -- Stripe PaymentIntent / receipt id (online only)
  paid_at            timestamptz,
  whatsapp_sent      boolean not null default false,
  completed_at       timestamptz,   -- set when status -> done|rejected
  archived_at        timestamptz,   -- set ~1 day after completed_at by cron
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on public.orders (customer_id);
create index on public.orders (shop_id, status) where archived_at is null;

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  kind            public.item_kind not null,
  item_id         text not null,     -- catalog item's stable id in the document (frozen)
  item_title      text not null,     -- frozen
  quantity        integer not null default 1,
  answers         jsonb not null default '{}'::jsonb,   -- frozen; file fields hold storage paths
  price_breakdown jsonb not null default '{}'::jsonb,   -- frozen
  line_total      numeric(10,2) not null default 0,
  created_at      timestamptz not null default now()
);
create index on public.order_items (order_id);

create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- stamp completed_at when an order reaches a terminal status (done or rejected)
create or replace function public.orders_set_completed_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status in ('done','rejected')
     and old.status is distinct from new.status
     and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end; $$;
create trigger orders_completed_at before update on public.orders
  for each row execute function public.orders_set_completed_at();

-- RLS: customer sees own; shop members see their shop's; NO client insert (Edge Fn/service role).
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

create policy "orders_select_customer" on public.orders
  for select to authenticated using (customer_id = (select auth.uid()));
create policy "orders_select_shop" on public.orders
  for select to authenticated using (public.is_shop_member(shop_id));
create policy "orders_update_shop" on public.orders
  for update to authenticated
  using (public.is_shop_member(shop_id)) with check (public.is_shop_member(shop_id));

create policy "order_items_select" on public.order_items
  for select to authenticated using (
    exists (select 1 from public.orders o where o.id = order_id
            and (o.customer_id = (select auth.uid()) or public.is_shop_member(o.shop_id)))
  );

-- Private bucket for customer uploads (PDFs/images/docs); own-folder access (order-files/{uid}/…).
-- Shops view files via server-generated signed URLs (no shop storage policy needed).
insert into storage.buckets (id, name, public) values ('order-files','order-files', false)
  on conflict (id) do nothing;
create policy "order_files_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id='order-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "order_files_select_own" on storage.objects
  for select to authenticated
  using (bucket_id='order-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Auto-archive ~1 day after completion (hourly cron).
create extension if not exists pg_cron;
select cron.schedule('archive-completed-orders', '0 * * * *', $$
  update public.orders set archived_at = now()
  where archived_at is null and status in ('done','rejected')
    and completed_at is not null and completed_at < now() - interval '1 day'
$$);
