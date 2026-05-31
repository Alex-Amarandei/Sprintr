-- Pre-add employees who don't have an account yet: an owner "invites" by the Google email they'll
-- sign in with; the invite is claimed into a shop_permissions row when that person first logs in
-- (handle_new_user). Email/password login is deferred — the OAuth email is the link key.

create table public.shop_invitations (
  shop_id    uuid not null references public.shops(id) on delete cascade,
  email      text not null,                 -- stored lower-cased
  role       public.shop_role not null default 'staff',
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (shop_id, email)
);
-- RLS auto-enabled by the event trigger; we add NO client policies → all access is through the
-- SECURITY DEFINER functions below (direct client queries are denied).

-- add_shop_member: 'added' (account exists → granted now) or 'invited' (pending until first login).
drop function if exists public.add_shop_member(uuid, text, public.shop_role);
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
    delete from public.shop_invitations where shop_id = p_shop_id and email = v_email;
    return 'added';
  end if;

  insert into public.shop_invitations (shop_id, email, role, invited_by)
    values (p_shop_id, v_email, p_role, (select auth.uid()))
    on conflict (shop_id, email) do update set role = excluded.role;
  return 'invited';
end; $$;

-- Pending invitations for the roster UI (member-gated).
create or replace function public.list_shop_invitations(p_shop_id uuid)
returns table (email text, role public.shop_role, created_at timestamptz)
language plpgsql security definer set search_path = '' stable as $$
begin
  if not public.is_shop_member(p_shop_id) then raise exception 'not a member'; end if;
  return query select i.email, i.role, i.created_at from public.shop_invitations i
    where i.shop_id = p_shop_id order by i.created_at;
end; $$;

-- Cancel a pending invite (owner only).
create or replace function public.cancel_shop_invitation(p_shop_id uuid, p_email text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_shop_member(p_shop_id, 'owner') then raise exception 'only an owner can manage members'; end if;
  delete from public.shop_invitations where shop_id = p_shop_id and email = lower(btrim(p_email));
end; $$;

-- Claim invitations on signup: extend handle_new_user (never block signup if claiming fails).
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
  exception when others then null;
  end;
  return new;
end; $$;

revoke execute on function public.add_shop_member(uuid, text, public.shop_role)  from public, anon;
revoke execute on function public.list_shop_invitations(uuid)                    from public, anon;
revoke execute on function public.cancel_shop_invitation(uuid, text)             from public, anon;
revoke execute on function public.handle_new_user()                              from public, anon, authenticated;
grant  execute on function public.add_shop_member(uuid, text, public.shop_role)  to authenticated;
grant  execute on function public.list_shop_invitations(uuid)                    to authenticated;
grant  execute on function public.cancel_shop_invitation(uuid, text)             to authenticated;
