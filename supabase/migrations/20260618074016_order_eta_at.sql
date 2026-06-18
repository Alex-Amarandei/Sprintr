-- Per-order ETA as an absolute target timestamp (the moment the order is estimated to be ready),
-- so the UI can show a live "time remaining" countdown instead of a static minutes label. The shop
-- still inputs a duration; the action stores now() + minutes here.
alter table public.orders add column eta_at timestamptz;
