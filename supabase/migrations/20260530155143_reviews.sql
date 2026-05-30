-- Migration 6: reviews (shop/employee/item) + shop replies; track order handler.
-- Verified-purchase only: you can review the shop you ordered from, the employee who handled
-- your order, or an item that was in it. Rating required, comment optional, not editable
-- (delete-to-retract). Shop members (staff+) can reply.

-- Who handled an order (a shop member sets this when they take it). Employee reviews target it.
alter table public.orders
  add column handled_by uuid references public.profiles(id) on delete set null;

create type public.review_target as enum ('shop','employee','item');

create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,  -- the customer
  shop_id     uuid not null references public.shops(id)    on delete cascade,  -- context
  order_id    uuid not null references public.orders(id)   on delete cascade,  -- verified-purchase proof
  target_type public.review_target not null,
  target_id   text not null,   -- shop: shop_id · employee: profile_id · item: catalog item stable id
  rating      int  not null check (rating between 1 and 5),   -- required
  comment     text,                                           -- optional
  created_at  timestamptz not null default now(),
  unique (author_id, shop_id, target_type, target_id)         -- one per author per target
);
create index on public.reviews (shop_id, target_type);
create index on public.reviews (target_type, target_id);

create table public.review_replies (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references public.reviews(id)  on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,   -- a shop member
  body       text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);
create index on public.review_replies (review_id, created_at);

alter table public.reviews        enable row level security;
alter table public.review_replies enable row level security;

-- Reviews are public to read.
create policy "reviews_select_public" on public.reviews for select using (true);

-- Insert = VERIFIED purchase only: a DONE order of the author, from this shop, justifying the
-- target (the shop itself / the employee who handled it / an item that was in the order).
create policy "reviews_insert_verified" on public.reviews
  for insert to authenticated with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.customer_id = (select auth.uid())
        and o.shop_id = reviews.shop_id
        and o.status = 'done'
        and case reviews.target_type
              when 'shop'     then reviews.target_id = o.shop_id::text
              when 'employee' then o.handled_by is not null and reviews.target_id = o.handled_by::text
              when 'item'     then exists (select 1 from public.order_items oi
                                           where oi.order_id = o.id
                                             and oi.item_id = reviews.target_id)
            end
    )
  );

-- Not editable once published; author may retract their own.
create policy "reviews_delete_own" on public.reviews
  for delete to authenticated using (author_id = (select auth.uid()));

-- Replies: public read; only staff+ of the review's shop post; author may delete own.
create policy "review_replies_select_public" on public.review_replies for select using (true);
create policy "review_replies_insert_staff" on public.review_replies
  for insert to authenticated with check (
    author_id = (select auth.uid())
    and exists (select 1 from public.reviews r where r.id = review_id and public.is_shop_member(r.shop_id))
  );
create policy "review_replies_delete_own" on public.review_replies
  for delete to authenticated using (author_id = (select auth.uid()));
