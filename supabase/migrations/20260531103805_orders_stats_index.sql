-- Make the dashboard analytics index scans (not seq scans) as the table grows: covers shop_stats
-- revenue/counts (all done orders incl. archived) and shop_revenue_daily's created_at range. The
-- existing (shop_id, status) index is partial (archived_at is null) and lacks created_at.
-- (At current volume the planner still seq-scans 1 page — this is for when data grows.)
create index if not exists orders_shop_status_created_idx
  on public.orders (shop_id, status, created_at);
