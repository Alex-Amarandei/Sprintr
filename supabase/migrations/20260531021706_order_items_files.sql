-- Per-line uploaded files (frozen snapshot): array of { path, name } objects. `path` is an
-- object key in the private `order-files` bucket (uploaded to the customer's own folder); the
-- shop downloads via server-minted signed URLs. Array form supports multiple files per line.
alter table public.order_items
  add column files jsonb not null default '[]'::jsonb;
