-- Order ETA: a per-order estimate (minutes), decided per order but seeded from a per-shop
-- default. Visible to both the customer and the shop. The shop can edit it per order.
alter table public.shops
  add column default_eta_minutes integer
  check (default_eta_minutes is null or default_eta_minutes between 0 and 100000);

alter table public.orders
  add column eta_minutes integer
  check (eta_minutes is null or eta_minutes between 0 and 100000);

comment on column public.shops.default_eta_minutes is
  'Default order ETA in minutes; seeds orders.eta_minutes at placement.';
comment on column public.orders.eta_minutes is
  'Estimated time to ready/deliver in minutes; per-order, defaults from shop, shop-editable.';
