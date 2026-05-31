-- Customer delivery address book (reused at checkout).
create table public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  label      text,
  address    text not null,
  lat        double precision,
  lng        double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.addresses (user_id, created_at desc);

alter table public.addresses enable row level security;
create policy "addresses_rw_own" on public.addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Saved/favourite shops.
create table public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  shop_id    uuid not null references public.shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, shop_id)
);
create index on public.favorites (user_id);

alter table public.favorites enable row level security;
create policy "favorites_rw_own" on public.favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
