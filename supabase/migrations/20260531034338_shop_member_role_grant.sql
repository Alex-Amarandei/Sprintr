-- Becoming a shop member implies the "shop" app role (drives the dashboard guard + home
-- redirect). Bump customers → shop on grant; never touch admins. Backfill existing members.

-- add_shop_member: also bump the granted profile's role.
create or replace function public.add_shop_member(p_shop_id uuid, p_email text, p_role public.shop_role)
returns text
language plpgsql security definer set search_path = '' as $$
declare v_profile_id uuid; v_email text := lower(btrim(p_email));
begin
  if not public.is_shop_member(p_shop_id, 'owner') then
    raise exception 'only an owner can manage members';
  end if;
  if v_email = '' then raise exception 'Emailul este obligatoriu'; end if;

  select id into v_profile_id from public.profiles where lower(email) = v_email;
  if v_profile_id is not null then
    insert into public.shop_permissions (shop_id, profile_id, role)
      values (p_shop_id, v_profile_id, p_role)
      on conflict (shop_id, profile_id) do update set role = excluded.role;
    update public.profiles set role = 'shop' where id = v_profile_id and role = 'customer';
    delete from public.shop_invitations where shop_id = p_shop_id and email = v_email;
    return 'added';
  end if;

  insert into public.shop_invitations (shop_id, email, role, invited_by)
    values (p_shop_id, v_email, p_role, (select auth.uid()))
    on conflict (shop_id, email) do update set role = excluded.role;
  return 'invited';
end; $$;

-- handle_new_user: on claim, bump the new profile to 'shop' if it gained membership.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'customer')
  );
  begin
    insert into public.shop_permissions (shop_id, profile_id, role)
      select i.shop_id, new.id, i.role from public.shop_invitations i
      where new.email is not null and lower(i.email) = lower(new.email)
      on conflict (shop_id, profile_id) do update set role = excluded.role;
    delete from public.shop_invitations where new.email is not null and lower(email) = lower(new.email);
    update public.profiles set role = 'shop'
      where id = new.id and role = 'customer'
        and exists (select 1 from public.shop_permissions where profile_id = new.id);
  exception when others then null;
  end;
  return new;
end; $$;

-- Backfill: any existing shop member still tagged 'customer' becomes 'shop'.
update public.profiles p set role = 'shop'
where p.role = 'customer'
  and exists (select 1 from public.shop_permissions sp where sp.profile_id = p.id);
