-- Lock down offer_is_live's search_path (security advisor 0011_function_search_path_mutable).
-- now() resolves from pg_catalog regardless, so an empty search_path is safe here.
create or replace function public.offer_is_live(o public.offers)
returns boolean language sql stable set search_path = '' as $$
  select o.active
     and (o.starts_at is null or o.starts_at <= now())
     and (o.ends_at   is null or o.ends_at   >= now());
$$;
