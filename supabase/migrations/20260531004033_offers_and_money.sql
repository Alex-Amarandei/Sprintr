-- Migration: offers (discount engine) + money model (shipping/service fee + order discount).
-- An offer is a function applied to the cart. Dimensions: type (what), scope (level),
-- trigger (automatic vs typed code), stackable. Banner is DERIVED (not stored): 1 active
-- automatic offer => banner, many => carousel. See CLAUDE.md "Offers — decided approach".

create type public.offer_type    as enum ('percent','fixed','bxgy','free_shipping');
create type public.offer_scope   as enum ('product','category','cart');
create type public.offer_trigger as enum ('automatic','code');

create table public.offers (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  name        text not null,                       -- shown next to the strikethrough price
  description text,                                -- advert copy (banner/carousel card)
  type        public.offer_type    not null,
  scope       public.offer_scope   not null,
  target_id   text,                                -- product/category id from the document; null for cart
  trigger     public.offer_trigger not null default 'automatic',
  code        text,                                -- required when trigger='code'
  config      jsonb not null default '{}'::jsonb,  -- percent:{percent} fixed:{amount} bxgy:{buy,get} free_shipping:{}
  stackable   boolean not null default true,       -- false => exclusive: if chosen, nothing else applies
  starts_at   timestamptz,
  ends_at     timestamptz,
  active      boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  -- Integrity guards (the type<->scope pairings the team agreed on).
  constraint offers_free_shipping_cart_only check (type <> 'free_shipping' or scope = 'cart'),
  constraint offers_bxgy_item_scope         check (type <> 'bxgy' or scope in ('product','category')),
  constraint offers_target_matches_scope    check (
    (scope = 'cart' and target_id is null) or (scope in ('product','category') and target_id is not null)
  ),
  constraint offers_code_present            check (trigger <> 'code' or code is not null)
);
create index on public.offers (shop_id) where active;
-- One live code per shop (case-insensitive), only among code offers.
create unique index offers_unique_code_per_shop
  on public.offers (shop_id, lower(code)) where code is not null;

-- "Currently live" = active and within the optional window.
create or replace function public.offer_is_live(o public.offers)
returns boolean language sql stable as $$
  select o.active
     and (o.starts_at is null or o.starts_at <= now())
     and (o.ends_at   is null or o.ends_at   >= now());
$$;

alter table public.offers enable row level security;

-- Public reads only LIVE AUTOMATIC offers (so typed codes are never exposed to the client).
create policy "offers_select_automatic_public" on public.offers
  for select using (trigger = 'automatic' and public.offer_is_live(offers));
-- Members read all of their shop's offers (incl. codes/expired) to manage them.
create policy "offers_select_member" on public.offers
  for select to authenticated using (public.is_shop_member(shop_id));
-- catalog+ manage offers (matches who owns the catalog & promos).
create policy "offers_write_catalog" on public.offers
  for insert to authenticated with check (public.is_shop_member(shop_id, 'catalog'));
create policy "offers_update_catalog" on public.offers
  for update to authenticated
  using (public.is_shop_member(shop_id, 'catalog')) with check (public.is_shop_member(shop_id, 'catalog'));
create policy "offers_delete_catalog" on public.offers
  for delete to authenticated using (public.is_shop_member(shop_id, 'catalog'));

-- Validate a typed code WITHOUT exposing the shop's code list: SECURITY DEFINER lookup of the
-- single live code offer matching (shop, code). Returns the row (sanitized by the caller) or none.
create or replace function public.validate_offer_code(p_shop_id uuid, p_code text)
returns public.offers
language sql security definer set search_path = '' stable as $$
  select * from public.offers o
  where o.shop_id = p_shop_id
    and o.trigger = 'code'
    and lower(o.code) = lower(p_code)
    and public.offer_is_live(o)
  limit 1;
$$;
revoke execute on function public.validate_offer_code(uuid, text) from public;
grant  execute on function public.validate_offer_code(uuid, text) to anon, authenticated;

-- ── Money model ───────────────────────────────────────────────────────────────
-- Shop-configurable shipping ("shipping tax"); free_shipping offers zero it at checkout.
alter table public.shops
  add column delivery_fee numeric(10,2) not null default 0;

-- Frozen money breakdown on the order. total = subtotal - discount + shipping_fee + service_fee
-- (+ platform fee, handled in the Stripe flow — separate task). service_fee is a flat per-order
-- platform charge shown at checkout only.
alter table public.orders
  add column discount       numeric(10,2) not null default 0,
  add column shipping_fee   numeric(10,2) not null default 0,
  add column service_fee    numeric(10,2) not null default 0,
  add column applied_offers jsonb not null default '[]'::jsonb;  -- frozen: which offers applied + amounts
