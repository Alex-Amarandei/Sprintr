-- Public bucket for shop storefront assets: logos, banners, catalog item images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-assets', 'shop-assets', true, 5242880,
  array['image/png','image/jpeg','image/webp','image/gif','image/avif','image/svg+xml']
)
on conflict (id) do nothing;

-- Shop members manage objects under their own shop's folder: shops/<shop_id>/…
-- Public read is served by the public bucket URL, so only write policies are needed.
-- (storage.objects already has RLS on + an admin_all policy from migration 8.)
do $$ begin
  create policy "shop_assets_insert" on storage.objects
    for insert to authenticated with check (
      bucket_id = 'shop-assets'
      and (storage.foldername(name))[1] = 'shops'
      and public.is_shop_member(((storage.foldername(name))[2])::uuid)
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "shop_assets_update" on storage.objects
    for update to authenticated using (
      bucket_id = 'shop-assets'
      and (storage.foldername(name))[1] = 'shops'
      and public.is_shop_member(((storage.foldername(name))[2])::uuid)
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "shop_assets_delete" on storage.objects
    for delete to authenticated using (
      bucket_id = 'shop-assets'
      and (storage.foldername(name))[1] = 'shops'
      and public.is_shop_member(((storage.foldername(name))[2])::uuid)
    );
exception when duplicate_object then null; end $$;
