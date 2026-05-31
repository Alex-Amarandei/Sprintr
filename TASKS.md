# SprintR — Task Split (3 computers)

Work is divided along the codebase's existing folder boundaries so the three of us can work
in parallel with minimal merge conflicts. Lanes match the team: 1 backend + 2 frontend
(customer side + shop side).

| Lane                     | Owns these paths                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **C1 — Backend & Infra** | `supabase/migrations/*`, `app/api/*`, `lib/orders/{actions,queries}.ts`, `lib/catalog/{pricing,answers,schema,shops}.ts`, storage                      |
| **C2 — Customer App**    | `app/(customer)/*`, `app/page.tsx`, `app/(auth)/*`, `components/cart/*`, `components/shop/*`, customer-side `components/order/*`, global header/footer |
| **C3 — Shop Dashboard**  | `app/dashboard/*`, `components/dashboard/*`, `components/catalog/*`, shop-side `components/order/*`                                                    |

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
- [x] Analytics table for stats (shops, ratings, etc.) — source for both dashboards. _Done as
      aggregation-on-read RPCs (`shop_stats`, `shop_revenue_daily`, `shop_status_counts`,
      `shop_top_items`, `customer_stats`) — data is tiny + indexed, no rollup table needed._
- [x] Platform commission / payout — per-shop `shops.commission_rate` (owner-immutable via
      `shops_guard_commission`, admin-only), frozen `orders.commission`/`orders.payout` at
      placement; 5% of goods, no charge below 2 lei. Invisible to customer; shown to shop only
      on its own order breakdown.
- [x] Robust export modal — period (week/month/year/all) × status filter (default Finalizată),
      CSV with Total client / Comision / Încasări + TOTAL row (`exportShopOrders` Server Action).
- [x] Top sellers per service/product — `shop_top_items` (qty, orders, revenue, rating) on
      dashboard + analytics.
- [x] Filter out-of-stock products/services — lightweight `in_stock` flag on items (not full
      Phase-2 inventory): "În stoc" switch in the catalog builder; `getShopCatalog` hides OOS;
      place-order rejects ordering them (409).
- [x] Chat lifecycle backend 🔗 — gate chat to active orders + complaint thread on close
      (`messages.kind` enum order|complaint; RLS posts order-kind while active, complaint-kind
      once done/rejected; ChatPanel tab on closed orders; inbox + both detail pages split threads)
- [x] Owner: add users/employees — `/dashboard/members` (Echipă): add by email (existing → granted;
      no account → pending invite auto-claimed on first Google login via `handle_new_user`),
      promote/demote, remove; last-owner guard; becoming a member grants `role='shop'`. RPCs:
      `add_shop_member`/`list_shop_members`/`set_shop_member_role`/`remove_shop_member`/
      `list_shop_invitations`/`cancel_shop_invitation`. (No invite _email_ — pre-auth only.)

### Gaps from CLAUDE.md audit (added 2026-05-31)

Backend items the CLAUDE.md notes flag as unbuilt/`TODO(BE)` that weren't in the split above.

- [ ] **WhatsApp courier ping on accept** 🔗 — CORE scope, currently only an `orders.whatsapp_sent`
      column exists (migration 5); no send code. Server-side send to the courier group on shop
      accept, then set `whatsapp_sent` (creds server-only; real API vs `wa.me` fallback TBD).
- [x] **Server-side validation parity** — place-order reprice now byte-matches `lib/catalog/pricing.ts`
      (per_unit unanswered → 0 not ×1; quantity `|| 1`), guards a missing `item.fields` (was a 500),
      and validates `accepted_file_types` by extension. swatch (display-only single_select),
      `categories`/`category_id` and multi-file `line.files` were already tolerated.
- [x] **Uploaded files end-to-end** 🔗 — upload at checkout (`lib/storage/orderFiles.ts`) → freeze
      `{path,name}[]` into `order_items.files` → signed-URL endpoint `GET /api/orders/[id]/files`
      (service role) wired to the shop's `DownloadButton`. (Customer-side re-download still TODO.)
- [x] **Shop → customer identity (RLS)** — `profiles_select_shop_customer` policy + SECURITY DEFINER
      `can_read_customer(uuid)` lets a shop member read `full_name`/`phone`/`email` of any customer
      who ordered at their shop. `getShopOrders`/`getOrderDetail` surface name/phone/email.
- [x] **Order ETA** — `orders.eta_minutes` (per-order, shop-editable, visible both sides) seeded
      from new `shops.default_eta_minutes` at placement. `setOrderEta` action + ETA in reads;
      default configurable in the profile editor. (FE: shop ETA edit control + customer display = C3/C2.)
- [x] **Shop profile persistence** — `updateShopProfile` now saves `schedule`, `email`
      (new `shops.email`) + `default_eta_minutes`; profile editor wired (email + ETA fields).
- [x] **(minor) Product SKU + unit** — added optional `sku`/`unit` to the item JSON schema
      (backward-compatible, no migration; pricing ignores them). Editor capture UI = C3.

---

## 🖥️ C2 — Customer App

### Homepage / branding / auth

- [x] Modify logo + SprintR homepage — _animated aurora gradient bg (shared `PageBackground`),
      fancy floating logo hero, scroll-reveal step cards, header logo + theme toggle_
- [x] Remove order-configuration box → replace with logo
- [x] Remove fake/mock data from homepage — _dropped "12+ magazine / <60 min / 4.9★" stats_
- [x] "From the app in a few minutes" text change
- [x] Remove "Order now" button from navbar
- [ ] Footer legal section / Terms & Conditions (+ `/terms` page)
- [x] Redesign login page — _branded split layout (brand panel + aurora bg), polished
      login/register cards; consistent header logo/theme toggle_
- [ ] **Role badge** in header — show the role you logged in as (customer/shop/admin).
      Shared component, owned here; C3 imports it into the dashboard header
- [ ] Adjust toast colors based on theme (global Toaster)
- [ ] Recheck homepage at the end (QA pass)

### Browse

- [x] Make search bar functional — _client-side debounced (250ms) search over
      name/description/address/category/tags via a `SearchProvider` + `ShopResults`_
- [x] Remove filter bar
- [x] Grey out closed stores — _closed `ShopCard`s dim + desaturate the gradient header_
- [x] Check store opening/closing time logic (`isOpenNow`) — _now reads the real DB
      `shops.schedule` on the store page; closed shops gate ordering (add-to-cart allowed,
      checkout blocked with a notice)_

### Store page (`/shop/[id]`)

- [ ] Remove button from stores header
- [x] Remove share & favorite buttons
- [x] Make address clickable → Google Maps
- [x] Make phone number clickable → native dial — _`tel:` links on store page + order detail_
- [x] Move promotion above schedule; fill freed space with services/products — _promo + schedule
      now full-width stacked; catalog spans full width (3-col grid)_
- [x] Replace service/product pills with icon + tooltip — _kind shown as a tinted icon
      (FileText/Package) with a tooltip on each catalog card_
- [x] Display products per category on each store — _catalog grouped into `document.categories`
      sections (count badge + divider); degrades to one grid when a shop has no categories_
- [x] Active offers per store in banner — _`getActiveOffers(shopId)` (live automatic only) →
      `<ShopOffers>` promo banner on the store page (above schedule); hidden when empty._
- [x] Offers: strikethrough old price, render the new one beside it — _cart computes a live
      discount preview: `CartContext` loads the shop's live automatic offers, runs the shared
      `applyOffers` engine, and exposes `discount`/`payable`/`freeShipping`/`lineFinal`. `CartBar`
      strikes through each discounted line (orig → discounted in brand) and shows
      Subtotal / Reducere / Livrare gratuită / Total. Matches the server reprice at placement._
- [x] Rating & Reviews per store — customer display + post-purchase review — _BE already had
      the `reviews` table (verified-purchase RLS, public read). Added `lib/reviews/queries.ts`:
      `getShopRatings` (avg+count from `shop`-target reviews → wired into `getShops`/`getShopView`,
      shows on the card + store header), `getShopReviews` (store-page "Recenzii" section via
      `ShopReviews`), `getMyShopReview`. Post-purchase `ReviewForm` (Rating + comment) on a `done`
      customer order inserts client-side under RLS; one review/shop (23505 handled). No migration
      needed. NOTE: reviewers render as "Client verificat" — real names need the `profiles` RLS
      gap (shop→customer identity) on C1._

### Cart / checkout / orders

- [x] Persist cart in localStorage — _cart (lines + shop) saved to `localStorage`
      (`sprintr.cart.v1`), rehydrated after mount (empty SSR → no hydration mismatch).
      Attached `files` are in-memory File objects → stripped on persist + normalized to `[]`
      on load (they can't survive a reload; re-attach at checkout)._
- [x] ~~Multi-vendor cart UX~~ — **DESCOPED** (not building): the cart stays single-shop (clears on shop switch)
- [ ] Checkout: address pin selection
- [x] Phone field: numeric-only + validation — _shared `sanitizePhoneInput`/`phoneError`
      (`lib/utils/validation.ts`); checkout + profile phone strip non-numeric chars + validate (≥10 digits, `inputMode="tel"`)_
- [x] Email field: regexp validation — _shared `emailError`; applied to the shop profile email
      (only reachable editable email — customer flow is Google-only). Reusable for future email fields._
- [x] Service-fee / delivery-tax line display ⬅BE — shop storefront shows the delivery fee;
      checkout + order detail break out Subtotal / Reducere / Livrare / Taxă serviciu (2 lei fixed) /
      Total. Delivery fee is per-shop (`shops.delivery_fee`, editable in the profile editor).
- [ ] Retrieve client order history + "My orders" analytics check
- [ ] Customer-side chat lifecycle UI — active vs. complaint thread ⬅BE 🔗

---

## 🖥️ C3 — Shop Dashboard

### Catalog builder

- [x] Split services vs products — **remove the `kind`/type field**; services-only in
      Services, products-only in Products — _CatalogBuilder is now kind-scoped; mounted on
      both pages; Tip select removed; the old non-persisting ProductEditor flow deleted_
- [x] Add categories on products — _shared category manager now applies to the Produse page_
- [x] "Add product on top" from catalog — _new items prepend to the top of their section_
- [x] Fix: field collapses on key change
- [x] View-only mode on catalog when in read role (`staff`) — _role threaded via
      loadCatalogEditor → canEdit; staff see read-only, no edit/publish/switch actions_
- [~] Add product/service images (multiple; first = main, shown to customers + builder) —
  _UI + data model + storage seam DONE: `images[]` on items, `ItemImages` manager in both
  cards, main image on `AddItemCard` (customer) + builder cards. **Picking = instant local
  preview (blob URLs, "nou" badge); upload happens only on Save/Publish** via
  `persistLocalImage` → so the "storage not configured" error only appears on save. Just
  needs the public **`shop-assets`** bucket to go live (⬅BE)_

### Products / services editors

- [x] Wire product/service editors to the kind split + category select — _unified into the
      kind-scoped CatalogBuilder (ItemCard already has the category select)_

### Offers admin (shop side) ⬅BE 🔗

- [ ] Banner color configuration on promos
- [ ] Promo config UI (per product/category/cart) — admin face of C1's engine

### Profile & store

- [x] Profile status with real data — _loadShopProfile() drives a live completeness % +
      checklist (logo/banner/description/schedule/products/phone). Also wired the weekly
      **schedule editor to load + persist** to `shops.schedule` (was hardcoded)_
- [ ] "Deactivate store temporarily" button logic (needs `shops.is_active` ⬅BE)
- [ ] Make the Change-Logo button work (upload ⬅BE)
- [ ] Select shop when a user owns multiple shops
- [ ] **Owner role: create / add users & employees** — owner-only members UI
      (add teammate, assign `staff`/`catalog`/`owner`) ⬅BE 🔗
- [ ] Generate/export invoices & receipts — shop-side view ⬅BE

### Dashboard & orders

- [x] Shop analytics — dedicated `/dashboard/analytics` page: KPI StatCards (venit/încasări/
  comision/AOV/rating), 30-day revenue area chart + status donut (`@mantine/charts`, recharts 3),
  top-sellers. Dashboard 7-day revenue chart now real (`shop_revenue_daily`).
- [ ] Shop-side "in delivery" status + order actions ⬅BE 🔗
- [ ] Shop-side chat lifecycle + review replies / complaint handling ⬅BE 🔗

### ⛔ Remaining C3 work is blocked on C1 — exact unblock asks

Everything left needs a schema/bucket/RPC I can't create on the shared DB without C1. Precise asks:

- **Item images** + **Change-Logo/banner** → a **public Storage bucket** (e.g. `shop-assets`)
  - RLS (shop members write own `shops/<id>/…`, public read). Then ItemCard/ProfileEditor get upload UI.
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

- **C2 (Customer) is the heaviest lane.** If we want to balance load, move _Footer/Terms_,
  _toast colors_, and _reviews-display_ to whoever frees up first.
- Already done: **live chat (base)** is wired to Supabase Realtime — the lifecycle/complaint
  split above builds on top of it.

---

## 🔮 Future tasks (to distribute)

Captured here as they come up; not yet assigned to a lane.

- [~] Warn before cart loss — the cart is single-shop client state that's wiped on a full
  reload and cleared when switching shops. Warn the user before they lose it: a
  `beforeunload` prompt on refresh/back-navigation + a confirm dialog when switching shops.
  _DONE: cross-shop confirm dialog ("Există deja produse în coș de la {magazin}" →
  Anulează / Golește coșul) before adding from another shop. TODO: `beforeunload` prompt
  on refresh/back; persist cart in localStorage (see Cart/checkout above)._

### 🅿️ Parking lot — header / nav / shop-identity polish (C2/C3 UI; BE ready)

- [ ] **Multi-shop switcher** — dropdown to switch active shop when an owner belongs to several
  shops. BE: `getMyShop`/`getShopOrders` pick the first membership today; needs an active-shop
  cookie helper for C3's switcher (see C1 unblock note above).
- [ ] **Profile-icon dropdown** (customer header) — clicking the profile icon opens a menu with an
  account preview + avatar before going to orders; if the user also has a shop role, offer
  "Switch to shop view".
- [ ] **Profile icon in shop view** — show the same profile icon/menu inside the dashboard too.
- [ ] **Shop greeting → employee name** — the "Bună ziua/Bună seara" greeting in the dashboard
  should use the logged-in employee's name, not the shop name.
- [ ] **Company-name badge** — a badge with the shop's full name (e.g. "Pim Copy") visible on all
  shop/dashboard pages.
- [ ] **Role badge** — next to the company-name badge, show the role you hold at the shop
  (staff/catalog/owner).
- [ ] **Account/avatar** — profile pictures (needs an `avatar_path` on `profiles` + public bucket
  read; BE follow-up if we want real uploads).
