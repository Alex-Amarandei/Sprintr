-- Richer analytics: payout/commission totals on shop_stats, a configurable revenue window, and
-- per-status order counts (for a donut). All member-gated.

drop function if exists public.shop_stats(uuid);
create or replace function public.shop_stats(p_shop_id uuid)
returns table (
  revenue_total numeric, revenue_today numeric, payout_total numeric, commission_total numeric,
  orders_total bigint, pending bigint, in_progress bigint, done bigint,
  avg_rating numeric, reviews_count bigint
)
language plpgsql security definer set search_path = '' stable as $$
begin
  if not public.is_shop_member(p_shop_id) then raise exception 'not a member'; end if;
  return query select
    coalesce((select sum(total) from public.orders where shop_id = p_shop_id and status = 'done'), 0),
    coalesce((select sum(total) from public.orders where shop_id = p_shop_id and status = 'done'
              and created_at >= date_trunc('day', now())), 0),
    coalesce((select sum(payout) from public.orders where shop_id = p_shop_id and status = 'done'), 0),
    coalesce((select sum(commission) from public.orders where shop_id = p_shop_id and status = 'done'), 0),
    (select count(*) from public.orders where shop_id = p_shop_id),
    (select count(*) from public.orders where shop_id = p_shop_id and status = 'pending'),
    (select count(*) from public.orders where shop_id = p_shop_id
       and status in ('accepted','in_progress','in_delivery')),
    (select count(*) from public.orders where shop_id = p_shop_id and status = 'done'),
    coalesce((select round(avg(rating), 2) from public.reviews
              where target_type = 'shop' and target_id = p_shop_id::text), 0),
    (select count(*) from public.reviews where target_type = 'shop' and target_id = p_shop_id::text);
end; $$;

drop function if exists public.shop_revenue_daily(uuid);
create or replace function public.shop_revenue_daily(p_shop_id uuid, p_days int default 7)
returns table (day date, revenue numeric)
language plpgsql security definer set search_path = '' stable as $$
begin
  if not public.is_shop_member(p_shop_id) then raise exception 'not a member'; end if;
  return query
  select d::date,
    coalesce((select sum(o.total) from public.orders o
      where o.shop_id = p_shop_id and o.status = 'done'
        and o.created_at >= d and o.created_at < d + interval '1 day'), 0)
  from generate_series(date_trunc('day', now()) - ((greatest(p_days, 1) - 1) || ' days')::interval,
                       date_trunc('day', now()), interval '1 day') d
  order by d;
end; $$;

create or replace function public.shop_status_counts(p_shop_id uuid)
returns table (status public.order_status, count bigint)
language plpgsql security definer set search_path = '' stable as $$
begin
  if not public.is_shop_member(p_shop_id) then raise exception 'not a member'; end if;
  return query
  select o.status, count(*)::bigint from public.orders o
  where o.shop_id = p_shop_id group by o.status;
end; $$;

revoke execute on function public.shop_stats(uuid)              from public, anon;
revoke execute on function public.shop_revenue_daily(uuid, int) from public, anon;
revoke execute on function public.shop_status_counts(uuid)      from public, anon;
grant  execute on function public.shop_stats(uuid)              to authenticated;
grant  execute on function public.shop_revenue_daily(uuid, int) to authenticated;
grant  execute on function public.shop_status_counts(uuid)      to authenticated;
