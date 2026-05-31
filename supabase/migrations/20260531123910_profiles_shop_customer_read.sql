-- Shop members must see who they're serving. profiles is otherwise select-own, so the
-- queue/detail fell back to "Client". Allow a shop member to read the profile (name/phone/
-- email) of any customer who has placed an order at a shop they belong to.
-- SECURITY DEFINER helper avoids re-applying orders RLS inside the policy (no recursion).
create or replace function public.can_read_customer(p_customer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.customer_id = p_customer
      and public.is_shop_member(o.shop_id)
  );
$$;

revoke execute on function public.can_read_customer(uuid) from public, anon;

create policy "profiles_select_shop_customer"
  on public.profiles for select
  to authenticated
  using (public.can_read_customer(id));
