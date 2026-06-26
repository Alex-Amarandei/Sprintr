-- Customer-initiated cancellation needs its own terminal status (distinct from shop "rejected").
-- Only adds the enum value; the cancelOrder server action (service role) performs the transition.
alter type order_status add value if not exists 'cancelled';
