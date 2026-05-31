-- Owner-managed shop membership. profiles is own-read-only by RLS, so resolving a teammate by
-- email + reading member names/emails runs SECURITY DEFINER (each function gates the caller).
-- No self-serve signup/invites this weekend → the person must already have an account.

-- Roster with names/emails (any member can view).
create or replace function public.list_shop_members(p_shop_id uuid)
returns table (profile_id uuid, email text, full_name text, role public.shop_role, created_at timestamptz)
language plpgsql security definer set search_path = '' stable as $$
begin
  if not public.is_shop_member(p_shop_id) then
    raise exception 'not a member of shop %', p_shop_id;
  end if;
  return query
    select sp.profile_id, p.email, p.full_name, sp.role, sp.created_at
    from public.shop_permissions sp
    join public.profiles p on p.id = sp.profile_id
    where sp.shop_id = p_shop_id
    order by sp.role desc, p.email;
end; $$;

-- Add a teammate by email, or change their role. Owner only.
create or replace function public.add_shop_member(p_shop_id uuid, p_email text, p_role public.shop_role)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_profile_id uuid;
begin
  if not public.is_shop_member(p_shop_id, 'owner') then
    raise exception 'only an owner can manage members';
  end if;
  select id into v_profile_id from public.profiles where lower(email) = lower(btrim(p_email));
  if v_profile_id is null then
    raise exception 'Niciun cont cu acest email' using errcode = 'no_data_found';
  end if;
  insert into public.shop_permissions (shop_id, profile_id, role)
    values (p_shop_id, v_profile_id, p_role)
    on conflict (shop_id, profile_id) do update set role = excluded.role;
  return v_profile_id;
end; $$;

-- Remove a member. Owner only; refuse to remove the last owner (lockout guard).
create or replace function public.remove_shop_member(p_shop_id uuid, p_profile_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_shop_member(p_shop_id, 'owner') then
    raise exception 'only an owner can manage members';
  end if;
  if (select role from public.shop_permissions where shop_id = p_shop_id and profile_id = p_profile_id) = 'owner'
     and (select count(*) from public.shop_permissions where shop_id = p_shop_id and role = 'owner') <= 1 then
    raise exception 'Nu poți elimina ultimul proprietar';
  end if;
  delete from public.shop_permissions where shop_id = p_shop_id and profile_id = p_profile_id;
end; $$;

revoke execute on function public.list_shop_members(uuid)                          from public, anon;
revoke execute on function public.add_shop_member(uuid, text, public.shop_role)    from public, anon;
revoke execute on function public.remove_shop_member(uuid, uuid)                   from public, anon;
grant  execute on function public.list_shop_members(uuid)                          to authenticated;
grant  execute on function public.add_shop_member(uuid, text, public.shop_role)    to authenticated;
grant  execute on function public.remove_shop_member(uuid, uuid)                   to authenticated;
