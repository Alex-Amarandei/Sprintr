-- Third-party courier dispatch (e.g. Glovo Logistics-as-a-Service) tracking fields on an order.
-- All nullable + additive: the existing flow is untouched; populated only when a courier provider
-- is enabled and an order is dispatched. Visible to the order's shop + customer via existing RLS.
alter table public.orders
  add column if not exists courier_provider text,      -- 'glovo' (null = own/no external courier)
  add column if not exists courier_ref text,           -- provider's delivery/order id
  add column if not exists courier_status text,         -- provider status string (raw)
  add column if not exists courier_tracking_url text,
  add column if not exists courier_name text,
  add column if not exists courier_phone text;

comment on column public.orders.courier_provider is 'External courier provider for delivery (e.g. glovo); null = none.';
comment on column public.orders.courier_ref is 'External courier provider''s delivery id (for tracking/cancel/webhooks).';
