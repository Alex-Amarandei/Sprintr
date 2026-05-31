-- Top-selling catalog items for a shop (services + products), aggregated from order_items across
-- all non-rejected orders. Returns units sold, distinct orders, revenue, and the item's avg rating.
create or replace function public.shop_top_items(p_shop_id uuid, p_limit int default 5)
returns table (
  item_id text, title text, kind public.item_kind,
  qty bigint, orders bigint, revenue numeric, avg_rating numeric
)
language plpgsql security definer set search_path = '' stable as $$
begin
  if not public.is_shop_member(p_shop_id) then raise exception 'not a member'; end if;
  return query
  select oi.item_id,
         max(oi.item_title)            as title,
         oi.kind,
         sum(oi.quantity)::bigint      as qty,
         count(distinct oi.order_id)::bigint as orders,
         round(sum(oi.line_total), 2)  as revenue,
         coalesce((select round(avg(r.rating), 2) from public.reviews r
                   where r.target_type = 'item' and r.target_id = oi.item_id), 0) as avg_rating
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.shop_id = p_shop_id and o.status <> 'rejected'
  group by oi.item_id, oi.kind
  order by revenue desc, qty desc
  limit greatest(p_limit, 1);
end; $$;
revoke execute on function public.shop_top_items(uuid, int) from public, anon;
grant  execute on function public.shop_top_items(uuid, int) to authenticated;
