-- Richer terminal/intermediate statuses: pickup orders gain ready_for_pickup → picked_up;
-- delivery orders gain delivered (after in_delivery). `done` stays as a legacy terminal value.
-- Enum values are added in their own migration because a new value can't be USED in the same
-- transaction that adds it (the trigger/cron updates that reference them land in the next migration).
alter type public.order_status add value if not exists 'ready_for_pickup' after 'in_progress';
alter type public.order_status add value if not exists 'picked_up' after 'in_delivery';
alter type public.order_status add value if not exists 'delivered' after 'picked_up';
