-- Shop geographic coordinates, used to enforce a delivery radius (block orders from shops too
-- far from the customer) and to suggest nearby shops. Nullable + additive: orders/reads are
-- unaffected when absent, and the distance check degrades to "allowed" without coordinates.
alter table public.shops
  add column if not exists lat double precision,
  add column if not exists lng double precision;

comment on column public.shops.lat is 'Shop latitude (owner-set via profile map), nullable.';
comment on column public.shops.lng is 'Shop longitude (owner-set via profile map), nullable.';
