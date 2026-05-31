-- Add an "in delivery" order status (delivery fulfilment, between preparing and delivered).
-- Flow: pending → accepted → in_progress → in_delivery → done (+ rejected). Non-terminal, so
-- the orders_set_completed_at trigger still only fires on done|rejected — no change needed there.
alter type public.order_status add value if not exists 'in_delivery' after 'in_progress';
