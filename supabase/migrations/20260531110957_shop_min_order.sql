-- (Reverted by 20260531111320_simplify_commission.) A per-shop minimum order amount — feature
-- was dropped before shipping; kept here only to keep the migration ledger consistent.
alter table public.shops add column min_order numeric(10,2) not null default 0;
