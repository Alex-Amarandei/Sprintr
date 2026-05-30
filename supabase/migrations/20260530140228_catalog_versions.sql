-- Migration 3: versioned catalog documents.
-- A shop's catalog is a series of immutable JSON snapshots (catalog_versions); the live
-- one is shops.active_version_id. Edit drafts, publish/switch/revert = move the pointer.
-- Keep the last 10 per shop. See CLAUDE.md "Catalog & product builder — spec for the UI team".

create type public.catalog_version_status as enum ('draft', 'published', 'archived');

create table public.catalog_versions (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops(id) on delete cascade,
  version      int  not null,
  label        text,
  status       public.catalog_version_status not null default 'draft',
  document     jsonb not null default jsonb_build_object('schema_version', 1, 'items', jsonb_build_array()),
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  published_at timestamptz,
  unique (shop_id, version)
);
create index on public.catalog_versions (shop_id);

-- Live pointer (nullable: a shop may have no published catalog yet). Circular FK is fine.
alter table public.shops
  add column active_version_id uuid references public.catalog_versions(id) on delete set null;

alter table public.catalog_versions enable row level security;

-- Read: anyone reads the version that is some shop's ACTIVE one; members read all versions.
create policy "catalog_versions_select_active_public" on public.catalog_versions
  for select using (
    exists (select 1 from public.shops s where s.active_version_id = catalog_versions.id)
  );
create policy "catalog_versions_select_member" on public.catalog_versions
  for select to authenticated using (public.is_shop_member(shop_id));

-- Drafts: catalog+ can create/edit/delete versions.
create policy "catalog_versions_write_catalog" on public.catalog_versions
  for insert to authenticated with check (public.is_shop_member(shop_id, 'catalog'));
create policy "catalog_versions_update_catalog" on public.catalog_versions
  for update to authenticated
  using (public.is_shop_member(shop_id, 'catalog')) with check (public.is_shop_member(shop_id, 'catalog'));
create policy "catalog_versions_delete_catalog" on public.catalog_versions
  for delete to authenticated using (public.is_shop_member(shop_id, 'catalog'));

-- Clone the live version into a fresh draft (version = max+1). Returns the new row.
create or replace function public.create_catalog_draft(p_shop_id uuid, p_label text default null)
returns public.catalog_versions
language plpgsql security definer set search_path = '' as $$
declare v_next int; v_doc jsonb; v_row public.catalog_versions;
begin
  if not public.is_shop_member(p_shop_id, 'catalog') then
    raise exception 'insufficient permission for shop %', p_shop_id;
  end if;
  select coalesce(max(version), 0) + 1 into v_next
    from public.catalog_versions where shop_id = p_shop_id;
  select cv.document into v_doc
    from public.shops s join public.catalog_versions cv on cv.id = s.active_version_id
    where s.id = p_shop_id;
  v_doc := coalesce(v_doc, jsonb_build_object('schema_version', 1, 'items', jsonb_build_array()));
  insert into public.catalog_versions (shop_id, version, label, status, document, created_by)
    values (p_shop_id, v_next, p_label, 'draft', v_doc, (select auth.uid()))
    returning * into v_row;
  return v_row;
end; $$;

-- Publish / switch / revert: point the shop at a version (and mark it published).
-- SECURITY DEFINER so the catalog role can flip the pointer without owning shops UPDATE
-- (that stays owner-only); the function checks catalog membership itself.
create or replace function public.set_active_catalog_version(p_version_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_shop_id uuid;
begin
  select shop_id into v_shop_id from public.catalog_versions where id = p_version_id;
  if v_shop_id is null then raise exception 'version % not found', p_version_id; end if;
  if not public.is_shop_member(v_shop_id, 'catalog') then
    raise exception 'insufficient permission for shop %', v_shop_id;
  end if;
  update public.catalog_versions
    set status = 'published', published_at = coalesce(published_at, now())
    where id = p_version_id;
  update public.shops set active_version_id = p_version_id where id = v_shop_id;
end; $$;

-- Keep only the last 10 versions per shop (never delete the active one).
create or replace function public.prune_catalog_versions()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.catalog_versions cv
  where cv.shop_id = new.shop_id
    and cv.id not in (
      select id from public.catalog_versions
      where shop_id = new.shop_id order by version desc limit 10)
    and cv.id is distinct from (select active_version_id from public.shops where id = new.shop_id);
  return null;
end; $$;
create trigger catalog_versions_prune after insert on public.catalog_versions
  for each row execute function public.prune_catalog_versions();

-- Lock down the RPCs (anon never needs them; authenticated calls, gated internally).
revoke execute on function public.create_catalog_draft(uuid, text)      from public, anon;
revoke execute on function public.set_active_catalog_version(uuid)       from public, anon;
revoke execute on function public.prune_catalog_versions()              from public, anon, authenticated;
grant  execute on function public.create_catalog_draft(uuid, text)      to authenticated;
grant  execute on function public.set_active_catalog_version(uuid)      to authenticated;
