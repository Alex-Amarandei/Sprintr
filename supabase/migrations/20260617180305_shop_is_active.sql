-- Hard on/off visibility flag for a shop, distinct from the temporary `schedule_overrides`
-- pause. Inactive shops are hidden from the public storefront and unreachable by direct URL;
-- their own members + admins can still read them (to reactivate from the dashboard).
alter table public.shops add column is_active boolean not null default true;

-- Public read sees only active shops. Pure column predicate so anon (which has no EXECUTE on
-- the SECURITY DEFINER helpers) can evaluate it. Members get a second, authenticated-only
-- policy so they can still read (and reactivate) their own deactivated shop; admins are
-- already covered by the existing `shops_admin_all` policy.
drop policy "shops_select_public" on public.shops;
create policy "shops_select_public" on public.shops
  for select using (is_active);
create policy "shops_select_member" on public.shops
  for select to authenticated
  using (public.is_shop_member(id));
