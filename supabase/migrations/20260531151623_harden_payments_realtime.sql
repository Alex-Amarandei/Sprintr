-- Idempotency log for Stripe webhook events. RLS auto-enables (deny-all to clients); the
-- webhook uses the service role which bypasses RLS. (orders already broadcasts via realtime.)
create table public.stripe_events (
  id           text primary key,        -- Stripe event id (evt_…)
  type         text not null,
  processed_at timestamptz not null default now()
);

-- Server-enforced upload limits on the private order-files bucket (previously client-only):
-- 25 MiB cap + an allow-list matching the catalog's accepted file types.
update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg', 'image/png',
      'text/csv', 'application/csv'
    ]
where id = 'order-files';
