-- Migration 8: admins get root access everywhere (app-level), matching the project's
-- Supabase collaborators. A permissive "admin can do anything" policy is added to every
-- table + storage; permissive policies OR together, so admins bypass all ownership/role
-- gating (read/insert/update/delete anything).

create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = '' stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

create policy "profiles_admin_all" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "shops_admin_all" on public.shops
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "shop_permissions_admin_all" on public.shop_permissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "shop_legal_admin_all" on public.shop_legal
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "catalog_versions_admin_all" on public.catalog_versions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "orders_admin_all" on public.orders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "order_items_admin_all" on public.order_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "messages_admin_all" on public.messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "reviews_admin_all" on public.reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "review_replies_admin_all" on public.review_replies
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Storage: admins manage all objects in all buckets.
create policy "storage_admin_all" on storage.objects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
