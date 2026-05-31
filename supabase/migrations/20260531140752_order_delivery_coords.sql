-- Precise delivery coordinates captured from the checkout map / geolocation.
-- Nullable + additive: existing orders and the place-order flow are unaffected when absent.
-- Helps the shop + courier navigate to the exact drop-off point.
alter table public.orders
  add column if not exists delivery_lat double precision,
  add column if not exists delivery_lng double precision;

comment on column public.orders.delivery_lat is 'Customer-selected delivery latitude (checkout map/geolocation), nullable.';
comment on column public.orders.delivery_lng is 'Customer-selected delivery longitude (checkout map/geolocation), nullable.';
