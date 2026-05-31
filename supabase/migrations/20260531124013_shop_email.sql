-- Shop contact email — persisted from the profile editor alongside the existing
-- name/description/phone/address/schedule fields.
alter table public.shops add column email text;
comment on column public.shops.email is 'Public contact email for the storefront.';
