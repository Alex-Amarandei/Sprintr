# SprintR — Task Split (3 computers)

Work is divided along the codebase's existing folder boundaries so the three of us can work
in parallel with minimal merge conflicts. Lanes match the team: 1 backend + 2 frontend
(customer side + shop side).

| Lane | Owns these paths |
|------|------------------|
| **C1 — Backend & Infra** | `supabase/migrations/*`, `app/api/*`, `lib/orders/{actions,queries}.ts`, `lib/catalog/{pricing,answers,schema,shops}.ts`, storage |
| **C2 — Customer App** | `app/(customer)/*`, `app/page.tsx`, `app/(auth)/*`, `components/cart/*`, `components/shop/*`, customer-side `components/order/*`, global header/footer |
| **C3 — Shop Dashboard** | `app/dashboard/*`, `components/dashboard/*`, `components/catalog/*`, shop-side `components/order/*` |

**Legend:** 🔗 = cross-cutting, agree the contract first (see bottom) · ⬅BE = consumes
something C1 builds (build against a stub until it lands).

---

## 🖥️ C1 — Backend, Data & Infra

### Offers system (foundation) 🔗
- [ ] Add offer banners + **general offers system** — `offers` table + API/repricing
- [ ] Promos per product / category / cart — discount engine in the pricing module
- [ ] Verify price calculation logic (`lib/catalog/pricing.ts` ↔ server reprice parity)

### Money & orders
- [ ] Fix internal server error when placing order
- [ ] Update 6% tax logic
- [ ] Add delivery tax
- [ ] Add mandatory fixed service fee per order
- [ ] Allow multiple vendor orders 🔗 — orders/placement data model
- [ ] Add "in delivery" order status 🔗 — `order_status` enum migration
- [ ] Invoice download + generate invoices/receipts & export — PDF gen + storage + API

### Storage & data
- [ ] Store PDFs in S3 🔗
- [ ] Allow multiple PDFs upload — schema (`file` field → multi) + §8 validation + storage 🔗
- [ ] Analytics table for stats (shops, ratings, etc.) — source for both dashboards
- [ ] Filter out-of-stock products/services — needs stock data (inventory, Phase 2) → unblocks C3
- [ ] Chat lifecycle backend 🔗 — gate chat to active orders; on `done`/`rejected` close it
      and open a separate **complaint/report** thread (new policy + `chat_kind`/`complaints`)
- [ ] Owner: add users/employees — RPC/helper to resolve a profile by email and insert a
      `shop_permissions` row (backs C3's members UI) 🔗

---

## 🖥️ C2 — Customer App

### Homepage / branding / auth
- [ ] Modify logo + SprintR homepage
- [ ] Remove order-configuration box → replace with logo
- [ ] Remove fake/mock data from homepage
- [ ] "From the app in a few minutes" text change
- [ ] Remove "Order now" button from navbar
- [ ] Footer legal section / Terms & Conditions (+ `/terms` page)
- [ ] Redesign login page
- [ ] **Role badge** in header — show the role you logged in as (customer/shop/admin).
      Shared component, owned here; C3 imports it into the dashboard header
- [ ] Adjust toast colors based on theme (global Toaster)
- [ ] Recheck homepage at the end (QA pass)

### Browse
- [ ] Make search bar functional
- [ ] Remove filter bar
- [ ] Grey out closed stores
- [ ] Check store opening/closing time logic (`isOpenNow`)

### Store page (`/shop/[id]`)
- [ ] Remove button from stores header
- [ ] Remove share & favorite buttons
- [ ] Make address clickable → Google Maps
- [ ] Make phone number clickable → native dial
- [ ] Move promotion above schedule; fill freed space with services/products
- [ ] Replace service/product pills with icon + tooltip
- [ ] Display products per category on each store
- [ ] Active offers per store in banner ⬅BE 🔗
- [ ] Offers: strikethrough old price, render the new one beside it ⬅BE 🔗
- [ ] Rating & Reviews per store — customer display + post-purchase review

### Cart / checkout / orders
- [ ] Persist cart in localStorage
- [ ] Multi-vendor cart UX 🔗 (pairs with C1's order model)
- [ ] Checkout: address pin selection
- [ ] Phone field: numeric-only + validation
- [ ] Service-fee / delivery-tax line display ⬅BE
- [ ] Retrieve client order history + "My orders" analytics check
- [ ] Customer-side chat lifecycle UI — active vs. complaint thread ⬅BE 🔗

---

## 🖥️ C3 — Shop Dashboard

### Catalog builder
- [ ] Split services vs products — **remove the `kind`/type field**; services-only in
      Services, products-only in Products
- [ ] Add categories on products
- [ ] "Add product on top" from catalog
- [ ] Fix: field collapses on key change
- [ ] View-only mode on catalog when in read role (`staff`)
- [ ] Add product/service images — upload UI (storage ⬅BE) 🔗

### Products / services editors
- [ ] Wire product/service editors to the kind split + category select

### Offers admin (shop side) ⬅BE 🔗
- [ ] Banner color configuration on promos
- [ ] Promo config UI (per product/category/cart) — admin face of C1's engine

### Profile & store
- [ ] Profile status with real data
- [ ] "Deactivate store temporarily" button logic (needs `shops.is_active` ⬅BE)
- [ ] Make the Change-Logo button work (upload ⬅BE)
- [ ] Select shop when a user owns multiple shops
- [ ] **Owner role: create / add users & employees** — owner-only members UI
      (add teammate, assign `staff`/`catalog`/`owner`) ⬅BE 🔗
- [ ] Generate/export invoices & receipts — shop-side view ⬅BE

### Dashboard & orders
- [ ] Shop analytics from the new stats table ⬅BE
- [ ] Shop-side "in delivery" status + order actions ⬅BE 🔗
- [ ] Shop-side chat lifecycle + review replies / complaint handling ⬅BE 🔗

---

## ⚠️ Contracts to agree BEFORE splitting (the 🔗 items)

Pin the data shape first so the two frontends can build against a stub while C1 builds the
real thing.

1. **Offers** — `offers` table + `config jsonb` shape, and how repricing returns discounted
   lines (drives store banner, strikethrough prices, shop admin UI).
2. **Chat lifecycle / complaints** — how order close flips chat off and what the new
   complaint thread looks like (drives both frontends' chat UI).
3. **Multi-vendor orders** — one order per shop vs. one umbrella order (drives cart + placement).
4. **Statuses & fees** — final `order_status` values (incl. "in delivery") and the
   fee/tax breakdown fields on `orders`.
5. **Storage** — S3 path convention + multi-file `answers` shape (drives upload widgets +
   image uploads).
6. **Membership** — how an owner adds an employee (email lookup → `shop_permissions` insert),
   given there's no self-serve signup (drives C3's members UI + C2's role badge source).

---

## Notes
- **C2 (Customer) is the heaviest lane.** If we want to balance load, move *Footer/Terms*,
  *toast colors*, and *reviews-display* to whoever frees up first.
- Already done: **live chat (base)** is wired to Supabase Realtime — the lifecycle/complaint
  split above builds on top of it.
