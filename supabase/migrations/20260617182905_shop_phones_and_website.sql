-- Shops can list multiple contact numbers (e.g. order line + personalizare line) and
-- carry a website URL. Expand-only: add `phones`/`website_url`, backfill from the old
-- single `phone`, but KEEP `phone` for now so the currently-deployed app keeps working.
-- A follow-up migration drops `phone` once the new code is live on main.
alter table public.shops add column if not exists phones text[] not null default '{}';
alter table public.shops add column if not exists website_url text;

update public.shops
set phones = array[btrim(phone)]
where phone is not null and btrim(phone) <> '' and coalesce(array_length(phones, 1), 0) = 0;
