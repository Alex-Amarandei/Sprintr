-- Promote/demote a member by profile id (owner only). Won't demote the last owner (lockout guard).
create or replace function public.set_shop_member_role(p_shop_id uuid, p_profile_id uuid, p_role public.shop_role)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_shop_member(p_shop_id, 'owner') then
    raise exception 'only an owner can manage members';
  end if;
  if p_role <> 'owner'
     and (select role from public.shop_permissions where shop_id = p_shop_id and profile_id = p_profile_id) = 'owner'
     and (select count(*) from public.shop_permissions where shop_id = p_shop_id and role = 'owner') <= 1 then
    raise exception 'Nu poți retrograda ultimul proprietar';
  end if;
  update public.shop_permissions set role = p_role
    where shop_id = p_shop_id and profile_id = p_profile_id;
end; $$;
revoke execute on function public.set_shop_member_role(uuid, uuid, public.shop_role) from public, anon;
grant  execute on function public.set_shop_member_role(uuid, uuid, public.shop_role) to authenticated;
