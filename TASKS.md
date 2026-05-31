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
- [x] Add offer banners + **general offers system** — `offers` table + API/repricing
      (table + place-order repricing + `lib/offers/{api,queries,types}.ts`; dashboard/banner UI wiring = C2/C3)
- [x] Promos per product / category / cart — discount engine in the pricing module
      (`lib/catalog/offers.ts`: compounding + best-pick, wired into place-order; client/dashboard UI = C2/C3)
- [x] Verify price calculation logic (`lib/catalog/pricing.ts` ↔ server reprice parity)
      (fixed the `is_quantity` multiplier mismatch; added `is_quantity` to the number-field schema)

### Money & orders
- [x] Fix internal server error when placing order
      (root cause: missing `SUPABASE_SERVICE_ROLE_KEY` in local `.env.local` — env gap, not code)
- [ ] Update 6% tax logic — deferred to the Stripe flow (redirect % to us); untouched for now
- [x] Add delivery tax — per-shop `shops.delivery_fee` (owner-update RLS), applied in place-order
      as `shipping_fee`, configurable via `updateShopProfile`/read via `getMyShop`. (C3: profile form field)
- [x] Add mandatory fixed service fee per order — flat 2 lei `orders.service_fee`, computed in
      place-order, checkout-only display. (C2: checkout line)
- [x] ~~Allow multiple vendor orders~~ — **DESCOPED** (not building): cart is single-shop by
      design (clears on shop switch); an order belongs to exactly one shop. No umbrella/multi-vendor order.
- [x] Add "in delivery" order status 🔗 — `order_status` enum migration
      (`in_delivery` between `in_progress`→`done`; shared token "În livrare"/grape in `ORDER_FLOW`;
      `advanceOrderStatus` accepts it. FE wiring: C3 action button + C2 timeline step.)
- [x] Invoice download + generate invoices/receipts & export — PDF gen + API
      (`GET /api/orders/[orderId]/invoice` → receipt PDF via @react-pdf/renderer + Noto Sans;
      `lib/invoice/*`. On-demand from frozen order; storage-caching deferred. FE download buttons = C2/C3.)

### Storage & data
- [x] Store PDFs in S3 🔗 — uses **Supabase Storage** (S3-compatible), private `order-files` bucket
- [x] Allow multiple PDFs upload — `FileInput multiple` → `order_items.files jsonb` + own-folder
      security; client type-check via `accepted_file_types`. (Deep server-side §8 type/size = partial.)
- [ ] Analytics table for stats (shops, ratings, etc.) — source for both dashboards
- [ ] Filter out-of-stock products/services — needs stock data (inventory, Phase 2) → unblocks C3
- [ ] Chat lifecycle backend 🔗 — gate chat to active orders; on `done`/`rejected` close it
      and open a separate **complaint/report** thread (new policy + `chat_kind`/`complaints`)
- [ ] Owner: add users/employees — RPC/helper to resolve a profile by email and insert a
      `shop_permissions` row (backs C3's members UI) 🔗

### Gaps from CLAUDE.md audit (added 2026-05-31)
Backend items the CLAUDE.md notes flag as unbuilt/`TODO(BE)` that weren't in the split above.
- [ ] **WhatsApp courier ping on accept** 🔗 — CORE scope, currently only an `orders.whatsapp_sent`
      column exists (migration 5); no send code. Server-side send to the courier group on shop
      accept, then set `whatsapp_sent` (creds server-only; real API vs `wa.me` fallback TBD).
- [ ] **Server-side validation parity** — the place-order reprice/validator must accept the FE
      schema extensions or it rejects valid carts: option `swatch`, `categories` + item
      `category_id`, item `accepted_file_types`, and multi-file `file` answers. **Likely the cause
      of "Fix internal server error when placing order" above** — check first.
- [x] **Uploaded files end-to-end** 🔗 — upload at checkout (`lib/storage/orderFiles.ts`) → freeze
      `{path,name}[]` into `order_items.files` → signed-URL endpoint `GET /api/orders/[id]/files`
      (service role) wired to the shop's `DownloadButton`. (Customer-side re-download still TODO.)
- [ ] **Shop → customer identity (RLS)** — `profiles` only has `profiles_select_own`; add a policy
      so shop members can read `full_name`/`phone` of customers who placed an order at their shop
      (queue/detail currently fall back to "Client").
- [ ] **Order ETA** — no column/source; FE omits the ETA text/timeline until one exists. Decide
      shop-set vs computed estimate and add the column.
- [ ] **Shop profile persistence** — extend `updateShopProfile` to save `schedule` (weekly-hours
      jsonb) + email; today only name/description/phone/address persist (backs C3 profile editor).
- [ ] **(minor) Product SKU + unit** — no schema columns; the simple product editor drops them.
      Add columns only if SKU/unit must survive.

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
- [x] ~~Multi-vendor cart UX~~ — **DESCOPED** (not building): the cart stays single-shop (clears on shop switch)
- [ ] Checkout: address pin selection
- [ ] Phone field: numeric-only + validation
- [ ] Service-fee / delivery-tax line display ⬅BE
- [ ] Retrieve client order history + "My orders" analytics check
- [ ] Customer-side chat lifecycle UI — active vs. complaint thread ⬅BE 🔗

---

## 🖥️ C3 — Shop Dashboard

### Catalog builder
- [x] Split services vs products — **remove the `kind`/type field**; services-only in
      Services, products-only in Products — *CatalogBuilder is now kind-scoped; mounted on
      both pages; Tip select removed; the old non-persisting ProductEditor flow deleted*
- [x] Add categories on products — *shared category manager now applies to the Produse page*
- [x] "Add product on top" from catalog — *new items prepend to the top of their section*
- [x] Fix: field collapses on key change
- [x] View-only mode on catalog when in read role (`staff`) — *role threaded via
      loadCatalogEditor → canEdit; staff see read-only, no edit/publish/switch actions*
- [~] Add product/service images (multiple; first = main, shown to customers + builder) —
      *UI + data model + storage seam DONE: `images[]` on items, `ItemImages` manager in both
      cards, main image on `AddItemCard` (customer) + builder cards. **Picking = instant local
      preview (blob URLs, "nou" badge); upload happens only on Save/Publish** via
      `persistLocalImage` → so the "storage not configured" error only appears on save. Just
      needs the public **`shop-assets`** bucket to go live (⬅BE)*

### Products / services editors
- [x] Wire product/service editors to the kind split + category select — *unified into the
      kind-scoped CatalogBuilder (ItemCard already has the category select)*

### Offers admin (shop side) ⬅BE 🔗
- [ ] Banner color configuration on promos
- [ ] Promo config UI (per product/category/cart) — admin face of C1's engine

### Profile & store
- [x] Profile status with real data — *loadShopProfile() drives a live completeness % +
      checklist (logo/banner/description/schedule/products/phone). Also wired the weekly
      **schedule editor to load + persist** to `shops.schedule` (was hardcoded)*
- [ ] "Deactivate store temporarily" button logic (needs `shops.is_active` ⬅BE)
- [ ] Make the Change-Logo button work (upload ⬅BE)
- [ ] Select shop when a user owns multiple shops
- [ ] **Owner role: create / add users & employees** — owner-only members UI
      (add teammate, assign `staff`/`catalog`/`owner`) ⬅BE 🔗
- [ ] Generate/export invoices & receipts — shop-side view ⬅BE

### Dashboard & orders
- [~] Shop analytics — *StatCards + Top services already aggregate from REAL orders. Only
      the 7-day revenue chart is a placeholder: needs raw order timestamps (C1's getShopOrders
      formats `created_at` → relative string, so it can't be bucketed by day)*
- [ ] Shop-side "in delivery" status + order actions ⬅BE 🔗
- [ ] Shop-side chat lifecycle + review replies / complaint handling ⬅BE 🔗

### ⛔ Remaining C3 work is blocked on C1 — exact unblock asks
Everything left needs a schema/bucket/RPC I can't create on the shared DB without C1. Precise asks:
- **Item images** + **Change-Logo/banner** → a **public Storage bucket** (e.g. `shop-assets`)
  + RLS (shop members write own `shops/<id>/…`, public read). Then ItemCard/ProfileEditor get upload UI.
- **Deactivate store** → `shops.is_active boolean default true` column (+ have customer reads honor it).
- **Offers admin** (banner color + promo config) → the `offers` table + `config jsonb` shape (contract #1).
- **Owner: add employees** → an RPC `add_shop_member(shop_id, email, role)` (owner-only; resolves
  email→profile_id server-side, since `profiles` RLS is select-own so the client can't look it up).
- **Invoices/receipts** → C1 PDF-gen + storage endpoint; C3 adds the "Descarcă factură" button.
- **In-delivery status** → add `in_delivery` to the `order_status` enum (contract #4).
- **Chat lifecycle / complaints** → contract #2 (close chat on done/rejected + complaint thread).
- **Select shop (multi-shop)** → C1's `getMyShop`/`getShopOrders` must honor an active-shop selection
  (cookie helper) for consistency; C3 builds the switcher once that lands.
- **7-day revenue chart** → add raw `created_at` (or a daily-revenue aggregate) to the shop orders read.

---

## ⚠️ Contracts to agree BEFORE splitting (the 🔗 items)

Pin the data shape first so the two frontends can build against a stub while C1 builds the
real thing.

1. **Offers** — `offers` table + `config jsonb` shape, and how repricing returns discounted
   lines (drives store banner, strikethrough prices, shop admin UI).
2. **Chat lifecycle / complaints** — how order close flips chat off and what the new
   complaint thread looks like (drives both frontends' chat UI).
3. ~~**Multi-vendor orders**~~ — **DECIDED: single-shop only.** One order = one shop; the cart is
   single-shop (clears on shop switch). No umbrella/multi-vendor order. (Nothing to build.)
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

---

## 🔮 Future tasks (to distribute)
Captured here as they come up; not yet assigned to a lane.
- [ ] Warn before cart loss — the cart is single-shop client state that's wiped on a full
      reload and cleared when switching shops. Warn the user before they lose it: a
      `beforeunload` prompt on refresh/back-navigation + a confirm dialog when switching shops.
