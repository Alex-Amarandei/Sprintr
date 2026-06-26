-- Analytics RPCs counted only status='done' as completed, but the order flow now also has
-- 'picked_up' (pickup) and 'delivered' (delivery) as successful terminal statuses
-- (app uses isCompletedStatus = done|picked_up|delivered). Revenue/payout/commission/done-count
-- therefore undercounted pickup + delivery orders, disagreeing with the dashboard's JS StatCards.
-- Also 'ready_for_pickup' fell into no in-progress bucket.

create or replace function public.shop_stats(p_shop_id uuid)
 returns table(revenue_total numeric, revenue_today numeric, payout_total numeric, commission_total numeric, orders_total bigint, pending bigint, in_progress bigint, done bigint, avg_rating numeric, reviews_count bigint)
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
begin
  if not public.is_shop_member(p_shop_id) then raise exception 'not a member'; end if;
  return query select
    coalesce((select sum(total) from public.orders where shop_id = p_shop_id and status in ('done','picked_up','delivered')), 0),
    coalesce((select sum(total) from public.orders where shop_id = p_shop_id and status in ('done','picked_up','delivered')
              and created_at >= date_trunc('day', now())), 0),
    coalesce((select sum(payout) from public.orders where shop_id = p_shop_id and status in ('done','picked_up','delivered')), 0),
    coalesce((select sum(commission) from public.orders where shop_id = p_shop_id and status in ('done','picked_up','delivered')), 0),
    (select count(*) from public.orders where shop_id = p_shop_id),
    (select count(*) from public.orders where shop_id = p_shop_id and status = 'pending'),
    (select count(*) from public.orders where shop_id = p_shop_id
       and status in ('accepted','in_progress','in_delivery','ready_for_pickup')),
    (select count(*) from public.orders where shop_id = p_shop_id and status in ('done','picked_up','delivered')),
    coalesce((select round(avg(rating), 2) from public.reviews
              where target_type = 'shop' and target_id = p_shop_id::text), 0),
    (select count(*) from public.reviews where target_type = 'shop' and target_id = p_shop_id::text);
end; $function$;

create or replace function public.shop_revenue_daily(p_shop_id uuid, p_days integer default 7)
 returns table(day date, revenue numeric)
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
begin
  if not public.is_shop_member(p_shop_id) then raise exception 'not a member'; end if;
  return query
  select d::date,
    coalesce((select sum(o.total) from public.orders o
      where o.shop_id = p_shop_id and o.status in ('done','picked_up','delivered')
        and o.created_at >= d and o.created_at < d + interval '1 day'), 0)
  from generate_series(date_trunc('day', now()) - ((greatest(p_days, 1) - 1) || ' days')::interval,
                       date_trunc('day', now()), interval '1 day') d
  order by d;
end; $function$;

revoke execute on function public.shop_stats(uuid) from public, anon;
revoke execute on function public.shop_revenue_daily(uuid, integer) from public, anon;
