-- Drop the just-added min_order (feature removed) and commission_min (floor removed). Commission
-- is now simply rate × goods, with NO commission charged on tiny orders (goods < 2 lei) — that
-- threshold lives as a constant in the place-order code, not a column.
alter table public.shops drop column if exists min_order;
alter table public.shops drop column if exists commission_min;
