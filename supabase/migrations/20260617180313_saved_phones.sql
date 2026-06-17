-- Customer phone book (reused at checkout), mirrors `public.addresses`.
create table public.saved_phones (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  label      text,
  phone      text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.saved_phones (user_id, created_at desc);

alter table public.saved_phones enable row level security;
create policy "saved_phones_rw_own" on public.saved_phones for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
