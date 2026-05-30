-- Migration 1: shops (public storefront) + shop_permissions (access control) + shop_legal (fiscal data).
-- See CLAUDE.md "Build order suggestion" step 1 and the "Shops, access control & legal data" section.

-- Roles within a shop. Declared in power order so RLS can use `role >= 'x'`.
create type public.shop_role as enum ('staff', 'catalog', 'owner');   -- staff < catalog < owner

-- shops — public, browsable identity. No owner_id (ownership lives in shop_permissions).
-- Everything past `name` is nullable for fast seeding.
create table public.shops (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  description        text,
  logo_path          text,        -- storage path, not URL
  banner_path        text,        -- storage path, not URL
  phone              text,
  address            text,        -- display address, e.g. "Str. Lăpușneanu 12, Iași"
  schedule           jsonb,       -- recurring weekly hours
  schedule_overrides jsonb,       -- date-specific exceptions
  created_at         timestamptz not null default now()
);

-- shop_permissions — who can act on a shop and at what level. One role per person per shop.
create table public.shop_permissions (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid not null references public.shops(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role       public.shop_role not null default 'staff',
  created_at timestamptz not null default now(),
  unique (shop_id, profile_id)
);
create index on public.shop_permissions (profile_id);
create index on public.shop_permissions (shop_id);

-- shop_legal — sensitive fiscal/tax identity, 1:1 with shop (PK = FK). Romanian fields.
create table public.shop_legal (
  shop_id       uuid primary key references public.shops(id) on delete cascade,
  legal_name    text,        -- denumire (e.g. "PIM COPY S.R.L.")
  legal_form    text,        -- SRL / PFA / SA …
  fiscal_code   text,        -- CUI / CIF
  vat_payer     boolean not null default false,   -- plătitor de TVA
  vat_number    text,        -- cod TVA (RO…); null if not a VAT payer
  reg_com       text,        -- Nr. Reg. Comerțului (e.g. "J22/1234/2010")
  legal_address text,        -- sediu social (may differ from shops.address)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Membership/role helper. SECURITY DEFINER => bypasses RLS inside (no recursion on
-- shop_permissions policies); only ever checks the CALLER's own membership.
create or replace function public.is_shop_member(p_shop_id uuid, p_min_role public.shop_role default 'staff')
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.shop_permissions sp
    where sp.shop_id = p_shop_id
      and sp.profile_id = (select auth.uid())
      and sp.role >= p_min_role          -- enum order gives us the hierarchy
  );
$$;
-- Supabase default-privileges grant EXECUTE to PUBLIC/anon/authenticated on new public
-- functions. RLS needs `authenticated` to call this; `anon` must not (it never needs to —
-- public reads use `true`). Revoke the broad grants, keep only authenticated.
revoke execute on function public.is_shop_member(uuid, public.shop_role) from public, anon;
grant  execute on function public.is_shop_member(uuid, public.shop_role) to authenticated;

-- Reusable updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger shop_legal_set_updated_at
  before update on public.shop_legal
  for each row execute function public.set_updated_at();

-- RLS (rls_auto_enable already flips it on at CREATE; explicit here for portability).
alter table public.shops            enable row level security;
alter table public.shop_permissions enable row level security;
alter table public.shop_legal       enable row level security;

-- shops: anyone browses; owners manage; no public insert (admin-provisioned).
create policy "shops_select_public" on public.shops
  for select using (true);
create policy "shops_update_owner" on public.shops
  for update to authenticated
  using (public.is_shop_member(id, 'owner')) with check (public.is_shop_member(id, 'owner'));
create policy "shops_delete_owner" on public.shops
  for delete to authenticated
  using (public.is_shop_member(id, 'owner'));

-- shop_permissions: members see the roster; owners manage it.
create policy "shop_permissions_select_member" on public.shop_permissions
  for select to authenticated using (public.is_shop_member(shop_id));
create policy "shop_permissions_insert_owner" on public.shop_permissions
  for insert to authenticated with check (public.is_shop_member(shop_id, 'owner'));
create policy "shop_permissions_update_owner" on public.shop_permissions
  for update to authenticated
  using (public.is_shop_member(shop_id, 'owner')) with check (public.is_shop_member(shop_id, 'owner'));
create policy "shop_permissions_delete_owner" on public.shop_permissions
  for delete to authenticated using (public.is_shop_member(shop_id, 'owner'));

-- shop_legal: owner only, every action.
create policy "shop_legal_select_owner" on public.shop_legal
  for select to authenticated using (public.is_shop_member(shop_id, 'owner'));
create policy "shop_legal_insert_owner" on public.shop_legal
  for insert to authenticated with check (public.is_shop_member(shop_id, 'owner'));
create policy "shop_legal_update_owner" on public.shop_legal
  for update to authenticated
  using (public.is_shop_member(shop_id, 'owner')) with check (public.is_shop_member(shop_id, 'owner'));
create policy "shop_legal_delete_owner" on public.shop_legal
  for delete to authenticated using (public.is_shop_member(shop_id, 'owner'));
