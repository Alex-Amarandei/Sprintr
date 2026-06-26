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

- [x] ~~**WhatsApp courier ping on accept**~~ — **DROPPED** (superseded by the Glovo LaaS courier integration).
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
- [x] Footer legal section / Terms & Conditions (+ `/terms` page)
- [x] Redesign login page — _branded split layout (brand panel + aurora bg), polished
      login/register cards; consistent header logo/theme toggle_
- [x] **Role badge** in header — show the role you logged in as (customer/shop/admin).
      Shared component, owned here; C3 imports it into the dashboard header
- [x] Adjust toast colors based on theme (global Toaster) — _`ThemedToaster` wraps sonner with the
      Mantine color scheme (auto→system), mounted inside `MantineProvider`._
- [x] Recheck homepage at the end (QA pass)

### Browse

- [x] Make search bar functional — _client-side debounced (250ms) search over
      name/description/address/category/tags via a `SearchProvider` + `ShopResults`_
- [x] Remove filter bar
- [x] Grey out closed stores — _closed `ShopCard`s dim + desaturate the gradient header_
- [x] Check store opening/closing time logic (`isOpenNow`) — _now reads the real DB
      `shops.schedule` on the store page; closed shops gate ordering (add-to-cart allowed,
      checkout blocked with a notice)_

### Store page (`/shop/[id]`)

- [x] Remove button from stores header — _removed the leftover `FavoriteButton` (+ its query/import)._
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
- [x] Checkout: address pin selection — _interactive Leaflet/OSM map (no API key) + "Locația
      curentă" geolocation in the delivery step; picks reverse-geocode (Nominatim) into the address
      field, which also auto-prefills from the browser location on open. Coords flow to place-order
      → frozen on `orders.delivery_lat/lng` (migration `20260531140752`); shop order detail links the
      address to pin-exact Google Maps. All best-effort/additive — manual typing still works if the
      map/geolocation fail. `LocationPicker` is client-only (`dynamic` `ssr:false`); helpers in `lib/geo/geocode.ts`._
- [x] Phone field: numeric-only + validation — _shared `sanitizePhoneInput`/`phoneError`
      (`lib/utils/validation.ts`); checkout + profile phone strip non-numeric chars + validate (≥10 digits, `inputMode="tel"`)_
- [x] Email field: regexp validation — _shared `emailError`; applied to the shop profile email
      (only reachable editable email — customer flow is Google-only). Reusable for future email fields._
- [x] Service-fee / delivery-tax line display ⬅BE — shop storefront shows the delivery fee;
      checkout + order detail break out Subtotal / Reducere / Livrare / Taxă serviciu (2 lei fixed) /
      Total. Delivery fee is per-shop (`shops.delivery_fee`, editable in the profile editor).
- [x] Retrieve client order history + "My orders" analytics check
- [x] Customer-side chat lifecycle UI — active vs. complaint thread ⬅BE 🔗

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
- [x] Add product/service images (multiple; first = main, shown to customers + builder) —
  _UI + data model + storage seam DONE: `images[]` on items, `ItemImages` manager in both
  cards, main image on `AddItemCard` (customer) + builder cards. **Picking = instant local
  preview (blob URLs, "nou" badge); upload happens only on Save/Publish** via
  `persistLocalImage` → so the "storage not configured" error only appears on save. Just
  needs the public **`shop-assets`** bucket to go live (⬅BE)_

### Products / services editors

- [x] Wire product/service editors to the kind split + category select — _unified into the
      kind-scoped CatalogBuilder (ItemCard already has the category select)_

### Offers admin (shop side) ⬅BE 🔗

- [x] Banner color configuration on promos — _`config.bannerColor` (jsonb, preserved in
      `normalizeOfferInput`); `ColorInput` in `PromotionEditor`; the storefront `ShopOffers` banner
      ends in the first configured promo colour (dark start keeps white text readable)._
- [x] Promo config UI (per product/category/cart) — admin face of C1's engine

### Profile & store

- [x] Profile status with real data — _loadShopProfile() drives a live completeness % +
      checklist (logo/banner/description/schedule/products/phone). Also wired the weekly
      **schedule editor to load + persist** to `shops.schedule` (was hardcoded)_
- [x] "Deactivate store temporarily" — **no `is_active` column**; implemented as a temporary
      pause via `schedule_overrides` (closes the shop through a picked date). `setShopPause` action
      writes/clears `null` day-entries; `isOpenNow` already honours them, so the open/closed badge +
      checkout gating ("Magazin închis") flip automatically. Profile editor: date picker + pause/resume.
- [x] Make the Change-Logo button work (upload ⬅BE)
- [x] Select shop when a user owns multiple shops
- [x] **Owner role: create / add users & employees** — owner-only members UI
      (add teammate, assign `staff`/`catalog`/`owner`) ⬅BE 🔗
- [x] Generate/export invoices & receipts — shop-side view ⬅BE — _added `DownloadReceiptButton`
      (existing invoice API) to the shop order detail header, enabled once terminal._

### Dashboard & orders

- [x] Shop analytics — dedicated `/dashboard/analytics` page: KPI StatCards (venit/încasări/
  comision/AOV/rating), 30-day revenue area chart + status donut (`@mantine/charts`, recharts 3),
  top-sellers. Dashboard 7-day revenue chart now real (`shop_revenue_daily`).
- [x] Shop-side "in delivery" status + order actions ⬅BE 🔗
- [x] Shop-side chat lifecycle + review replies / complaint handling ⬅BE 🔗

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

### 🅿️ Parking lot — header / nav / shop-identity polish

- [x] **Multi-shop switcher** — active-shop cookie (`sprintr.active_shop`) + `getActiveShopId`/
  `getActiveMembership` (`lib/shop/active.ts`); all shop-scoped reads honor it; `setActiveShop`
  action; switcher dropdown in the dashboard topbar (shown when you belong to >1 shop).
- [x] **Profile-icon dropdown** (customer header) — `ProfileMenu`: avatar (Google photo → initials)
  + name/email, "Comenzile mele", and "Panou magazin" when the user holds a shop role; sign out.
- [x] **Profile icon in shop view** — dashboard topbar account menu ("Vezi ca client" + sign out).
- [x] **Shop greeting → employee name** — greeting now uses the logged-in person's first name
  (`getViewerIdentity().firstName`), not the shop name.
- [x] **Company-name badge** + **Role badge** — dashboard topbar shows the active shop's name +
  your role (Angajat/Catalog/Proprietar) on every dashboard page.
- [x] **Account/avatar** — Google OAuth picture (`user_metadata.avatar_url`) with an initials
  fallback; no schema/upload (chosen over a custom `avatar_path` for now).
- [x] **Pending-orders badge** — `getShopOrderCounts` → two badges on the Comenzi nav item (new
  =brand, in-progress=cyan; sidebar + mobile drawer), mirroring the Mesaje unread badge.
- [x] **Comenzi search** — search box on `/dashboard/orders` (matches #order, customer
  name/email/phone, item titles) in `ShopOrderQueue` (full page only).
- [x] **Comenzi lazy loading** — silent infinite scroll (IntersectionObserver, fixed 25-row batch)
  revealing the already-loaded list to keep the DOM light + an "X din Y" counter. No user knob:
  data is fetched server-side in one go, so a "load N" control would be misleading. (Full page
  only; dashboard preview keeps its `limit`. True server-side paging deferred until volume needs it.)
- [~] **Refunds + cancel order** — ✅ DONE: auto-refund a paid online order when the shop rejects it
  (`lib/orders/refund.ts` + `charge.refunded` webhook → `payment_status='refunded'`). See "🚀 Production
  launch" below. Still parked: a **customer-initiated** cancel/refund UI/flow.
- [ ] **Shop ops — deferred** (parked): bulk order actions (multi-select accept/advance),
  printable packing slip, analytics date-range selector + MoM/YoY deltas, consumables inventory
  (stock table + per-item consumption + decrement-on-order + low-stock).
- [ ] **Make the repo private** (it's a public fork now). GitHub can't flip a fork to private —
  must detach + remirror into a fresh private repo:
  1. Audit git history for committed secrets (`.env.local` is gitignored — verify no keys/PII landed
     in any commit; if so, rotate them).
  2. Create a new **empty private** repo (e.g. `Alex-Amarandei/sprintr`), no README.
  3. Mirror history: `git clone --bare <current-url> tmp.git && cd tmp.git && git push --mirror <new-private-url>`
     (or GitHub → "Import repository").
  4. Re-point everyone's `origin`: `git remote set-url origin <new-private-url>`; re-invite the 3 collaborators.
  5. Reconnect integrations: **Vercel** project → new repo (redeploy); GitHub secrets/Actions if any.
     Supabase + the MCP are unaffected (DB is separate). Update any hardcoded repo URLs.
  6. Archive/delete the old public fork. Note: stars/PRs/issues don't carry over.

---

## 🚀 Production launch — Stripe (the last mile)

> Goal: make **payments** production-ready — the last big step before launch. Most of the code
> already exists; the blockers are real accounts/keys + a couple of finishing pieces.
> **Legend: 👤 = a human does it** (accounts, keys, dashboard config) · **⌨️ = code to write.**
> _Courier integration (**Glovo**) was **DROPPED**. Delivery uses the shop's flat `delivery_fee` + the
> 12 km radius. The gated `lib/delivery/*` code stays dormant in the repo; no further work planned._

### ✅ Already built (the baseline you're finishing)
- **Stripe:** PaymentIntent at place-order (RON, `amount×100`, idempotency key `pi_<orderId>`, order is
  rolled back if PI creation fails), `/api/stripe-webhook` (raw-body signature verify + `stripe_events`
  idempotency; handles `payment_intent.succeeded` → paid and `payment_intent.payment_failed` → failed),
  and a `confirmOrderPayment` client fallback (`lib/orders/payment.ts`). Running on **test keys**.

### 🔑 Decisions — DECIDED (MVP = easiest path, 2026-06-03)
- [x] **Payouts → Option 1 (Manual).** Platform collects the full amount; shops are paid by bank transfer
  periodically using the CSV export (Total / Comision / Încasări). **No payment-splitting code.** Stripe
  Connect (Option 2 — Express accounts, `transfer_data` + `application_fee_amount`, onboarding +
  `account.updated` webhooks) is the scale path, **deferred**. ⚠️ Confirm the EU/RO regulatory implications
  of redistributing collected funds before real volume (Connect offloads this).
- [x] **Auto-refund a paid online order on reject → YES.** ✅ Built (see ⌨️ STRIPE below).

### 👤 STRIPE — you do
- [ ] Finish the Stripe account: business verification, RON bank account, statement descriptor, tax/VAT.
- [ ] Get **live** keys (`sk_live_…`, `pk_live_…`).
- [ ] Stripe Dashboard → create a **live webhook** → `https://<prod-domain>/api/stripe-webhook`; enable
  `payment_intent.succeeded`, `payment_intent.payment_failed`, and (for refunds) `charge.refunded`. Copy
  the **live `whsec_…`**.
- [ ] Set in **Vercel** env: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (server-only) and
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

### ⌨️ STRIPE — code
- [x] **Refunds — DONE.** `refundOrder` (`lib/orders/refund.ts`, service role, idempotency key
  `refund_<orderId>`) auto-refunds a paid online order when the shop **rejects** it (wired in
  `advanceOrderStatus`); the **`charge.refunded` webhook branch** also catches refunds issued manually from
  the Stripe dashboard → `payment_status='refunded'`. No migration (the `refunded` enum already existed).
  Best-effort: a failed auto-refund logs + is recoverable via a manual Stripe refund (the webhook then flips
  the status). **Still NOT built:** customer-initiated cancel/refund (parked).
- [x] **Payouts = manual → no code needed.** The CSV export is the settlement record. A per-order
  "paid out" marker / payout-tracker is **deferred** until volume needs it.
- [ ] _Deferred:_ **Stripe Connect (Option 2)** — Express onboarding, `shops.stripe_account_id`,
  `transfer_data` + `application_fee_amount`, `account.updated` webhook, payout view. _(large; do at scale)_
- [ ] _Deferred (optional):_ graceful UI for PI `requires_action`/`processing` + the 3DS `/orders?paid=…`
  return; Apple/Google Pay domain-association file; create the order AFTER payment (no orphaned `pending` rows).

### Pre-launch checklist
- [ ] Vercel env: Supabase (url / anon / **service role**), Stripe (live sk / pk / whsec), `NEXT_PUBLIC_SITE_URL`.
- [ ] Stripe webhook registered at the prod domain + verified (Stripe "send test event").
- [ ] Refund path tested (reject a paid order → customer is refunded).
- [ ] One real end-to-end: online-pay delivery (paid → done) + pickup/cash.

---

## 📝 TODO — 2026-06-17 (review feedback)

### Copy / formatting / small UI
- [x] **Romanian-count pluralization** for shop counts — "0 de magazine" is wrong; use `roCount`
      everywhere (1 magazin / 0 magazine / 2 magazine / 20 de magazine).
      _Fixed `roCount` (`lib/utils/format.ts`): 0 now → "0 magazine" (no "de"); every shop count
      already routes through it._
- [x] **Dashboard KPI icons** (the 4) should be **right-aligned**.
      _`StatCard` top row → `justify="flex-end"`; optional delta chip kept left via `mr="auto"`._
- [x] **Schedule time inputs** auto-format 4 digits → time (`2359` → `23:59`).
      _New `formatTimeInput` (`lib/utils/format.ts`) wired `onBlur` on the schedule fields in `ProfileEditor`._
- [x] **"Implicită" button** is non-intuitive → rename to "Setează ca implicită" / "Fă implicită".
      _`AddressesManager` action button → "Setează ca implicită" (the default-badge stays "Implicită")._
- [x] **Order status next to the order number** in the shop view (e.g. "#1a2b · În așteptare").
      _Order detail header: `StatusBadge` now beside "Comanda #…"; removed the duplicate badge from
      `ShopOrderActions` (kept the action buttons)._
- [x] **Drop Klarna** from the payment options.
      _PaymentIntent now `automatic_payment_methods: { enabled: true, allow_redirects: "never" }` —
      drops Klarna (redirect method), keeps card + wallets + Link._

### Shop visibility
- [x] **`shops.is_active` column** (default `true`). Inactive shops are **hidden from browse** AND
      **inaccessible by direct URL** (`/shop/[id]` → notFound / blocked). Distinct from the temporary
      pause (`schedule_overrides`) — this is a hard on/off.
      _Migration `20260617180305_shop_is_active` (column + RLS: public sees `is_active` only,
      members/admins still read own). Owner-toggleable via a "Magazin activ" switch in the profile
      editor (`setShopActive`). Customer reads filtered (`getShops`/`getShopView`/`getShopCatalog`/
      `findNearbyShops`/`quoteDelivery`/sitemap); place-order rejects inactive (service role = explicit check)._

### Profile / address / phone autofill
- [x] **"Profilul meu"** entry — first item in the customer menu. _`ProfileMenu` → `/account`._
- [x] My-Profile page holds all autofill data for delivery (addresses, phones, etc.).
      _New `/account` page consolidating profile header + addresses + phones; `/addresses` redirects to it._
- [x] **Save-a-location** flow should let me add a **nickname** (label) for the address.
      _Already in `addresses.label` + `AddressesManager`; now surfaced on the `/account` page._
- [x] **Saved phone numbers** — autofill / dropdown of saved phones / "add new" in the order modal.
      _New `saved_phones` table (migration `20260617180313`) mirroring addresses; `lib/phones/*` +
      `PhonesManager` on `/account`; checkout shows a "Telefon salvat" picker + "save for next time"._
- [x] **Phone prefix** = selectable dropdown **with country flags**.
      _New reusable `components/ui/PhoneInput` (flag + dial-code Select, searchable by country name,
      RO default) wired into the checkout contact phone + the `/account` PhonesManager. Stores the full
      "+40 7XX…" string._
- [x] **"Adresă salvată" vs "Adresă de livrare"** can differ → confusing. Selecting a saved address
      should fill (or grey out) the delivery-address field, not coexist as two different values.

### Discounts
- [x] **Discount-code field in the cart side-drawer** (basket view), **persisted** through to the order modal.
      _`CartBar` promo input → `CartContext.applyPromo` (validates via `validate_offer_code`, folds the
      offer into the live discount preview); `promoCode` prefills the checkout modal's code field._
- [x] **Validate discount codes** + show clearly when a code doesn't exist.
      _On apply: valid → "Cod aplicat: {name}" + discount preview updates; invalid → inline "Codul nu
      există sau a expirat" error on the field._

### Chat / notifications / unread
- [x] **Highlight unread conversations** more clearly in the shop messages view.
      _Unread rows get a brand-tinted background + left accent bar + a count badge (was just a dot)._
- [x] **Chat box full height** — extend downward to fill available space.
      _Messages pane fills `calc(100dvh − 150px)`; `ChatPanel` accepts `height="100%"` (order detail keeps px)._
- [x] **Sidebar unread-messages badge not updating in real time** — fix.
      _`message_reads` added to the Realtime publication; `UnreadProvider` now also subscribes to it so a
      read in another tab drops the badge instantly (on top of the existing `messages`-INSERT + focus refresh)._
- [x] **Client notifications: more detail** than the current generic message.
      _`notify_order_status` now writes a body: "Comanda #abcdef12 · {shop name}" (was null)._
- [x] **Client notifications not real-time** — fix (subscribe on the customer side too).
      _Already real-time: `NotificationBell` subscribes to `notifications` INSERT filtered by `user_id`
      (chime on new order). Verified — no change needed._

### Orders / statuses / financials
- [x] **More order statuses**: ready-for-pickup, picked-up, in-delivery, delivered.
      _Migrations `20260618074734` (enum values) + `…074810` (completed_at trigger + notify cases +
      archive cron). Pickup: in_progress → `ready_for_pickup` → `picked_up`; delivery: in_delivery →
      `delivered` (`done` kept as legacy terminal). Status tokens + `isTerminalStatus`/`isCompletedStatus`
      helpers; `advanceOrderStatus` VALID_PREV; shop advance buttons (`ShopOrderActions`/`ShopOrderQueue`);
      fulfilment-aware `StatusTimeline`; chat-close / reviews / reorder / analytics / Finalizate tab /
      export / reject / modify all updated to the new terminals._
- [x] **Financial displays = post-commission amount** (what the shop actually receives) — current
      figure can mislead.
- [x] **ETA → "Estimat de completare a comenzii"** (rename "~50 min"). Store it as a **timestamp**
      set at the moment, and just show `selected_ts − now` as a live countdown (the duration is
      syntactic sugar — no stored computation, only the diff).
      _Migration `20260618074016` (`orders.eta_at`). `setOrderEta` stores `now() + minutes`; new
      `EtaCountdown` client component renders `eta_at − now` live (30s tick); header + `StatusTimeline`
      relabelled "Estimat de completare", falling back to the static minutes for legacy orders._
- [x] **Partial item rejection** — reject only some lines (e.g. accept 3 cups, reject 2 OOS pens)
      rather than the whole order.
      _Migration `20260618071118` (`order_items.rejected` + atomic `reject_order_lines` RPC that marks
      lines + reduces subtotal/total/payout in one txn, idempotent). `rejectOrderLines` action
      (`lib/orders/actions.ts`): membership + order-active check, partial-refunds paid online orders
      FIRST, then the atomic reduce; keeps ≥1 line; notifies the customer. Shop UI `RejectLinesControl`
      (line checkboxes + refund preview); rejected lines struck-through + "Indisponibil" badge on both
      order details._
- [x] **Shop-side order modification** — let the shop change an order (charge extra/less) and request
      the customer's acceptance; auto-refund the difference if less; an optional free-form **extra-charges
      (RON)** field the shop can fill when modifying.
      _Migration `20260617183739_order_modifications` (`order_modifications` table + `modification_status`
      enum + `orders.adjustment` + RLS read-only for participants + Realtime). Primitive = signed adjustment
      (+ extra / − reduction) + reason. Flow (`lib/orders/modifications.ts`): shop `proposeModification`
      → customer `respondToModification` (accept/decline). On accept: cash → recorded; online reduction →
      auto **partial-refund** the difference; online extra → a **delta PaymentIntent** the customer confirms
      with a card (`CustomerModificationCard` Stripe Element) → webhook (`kind:'modification'`) + client
      `confirmModificationPayment` finalize idempotently. Shop UI `ShopModificationControl` (propose/cancel);
      breakdown "Ajustare" line both sides; customer notified on propose, shop on response. Webhook also
      fixed so a **partial** refund no longer marks the whole order `refunded`. Needs Stripe test keys to
      exercise the card delta-charge end-to-end._
      _**Hardened after an adversarial multi-agent review** (migration `20260617190808`): finalize is now an
      atomic `finalize_order_modification` RPC (CAS flip + apply in one txn) so the webhook + client fallback
      can't double-apply; `respondToModification` re-checks the order is still modifiable before accepting;
      `advanceOrderStatus` cancels pending mods (+ their unconfirmed delta PIs) when an order goes terminal;
      an online reduction only finalizes after the partial refund SUCCEEDS; `cancelModification` cancels the
      delta PI; a partial unique index enforces one-pending-per-order; and the webhook-only helpers moved to
      `modifications-internal.ts` so `finalizeModificationById` is no longer a client-callable action._

### Bugs
- [x] **Reorder ("Comandă din nou") file types** — from the basket view I can attach **any** file
      type, bypassing the shop's `accepted_file_types` restriction. Enforce the shop's allowed types.
      _`CartLine` now carries `acceptedFileTypes` (populated in `buildCartLine` + `getReorderPayload`/
      `ReorderButton`); the `CartBar` re-attach `FileButton` sets `accept` AND rejects a disallowed file
      with a toast (`fileAllowed`). Server-side parity check already enforced at placement._

### More small UI (added later 2026-06-17)
- [x] **"Disponibil" switch** → use `cursor: pointer` on hover.
      _Global `Switch` theme config (`theme.ts`): pointer cursor on track/input/label — applies to every switch._
- [x] **"RON" everywhere instead of "lei"** — replace the currency suffix app-wide (use `formatPrice`).
      _Swapped the `" lei"` suffix → `" RON"` across all customer + shop money displays (order details,
      breakdowns, dashboard, analytics, offers chips, invoice PDF, modification cards). Legal terms line
      ("în lei (RON)") left intact._

---

## 📝 TODO — 2026-06-26 (review feedback)

> New batch from Pelin + Alex (WhatsApp). Lane hints in brackets. Some may already be partially
> covered by the work just merged in `90c0cda` (`PhoneInput`, `EtaCountdown`, status colors) — verify
> before building.

### Pricing / configurator
- [x] **Configurator total is wrong** [C1/C2] — when configuring a product, the computed total amount
      is incorrect. _Root cause: with `min_quantity > 1` and no quantity field, the line was priced ×min
      while the breakdown only showed the per-unit base (no visible multiplier). Fixed alongside built-in
      quantity: the configurator now shows a quantity stepper + an explicit "Cantitate × N" line so the
      total reconciles. Client/server reprice stay byte-equivalent._
- [x] **"De la" price = per unit** [C2] — the "De la …" teaser price should be the **per-unit** base
      price, not `min_quantity × min_cost`. Fix the storefront/catalog-card "from" price computation.
      _`AddItemCard` divides the quantity back out of `computeItemPrice().total`._
- [x] **Quantity is a built-in, not a shop-configured field** [C1/C3] — every product/service should
      have a default quantity input out of the box; the shop should NOT have to add a quantity field
      manually in the builder. Make quantity intrinsic to the item. _New reserved `QUANTITY_KEY` ("__qty")
      in `pricing.ts`: when no explicit is_quantity field exists, the intrinsic quantity drives the line
      multiplier (client + server). `defaultAnswers` seeds it to min_quantity; simple products get an
      inline −/+ stepper on the card (quick-add), configurable ones get a Cantitate field in the modal.
      An explicit is_quantity field still wins (backward-compatible)._
- [x] **Catalog builder: min-quantity field alignment** [C3] — "Cantitate minimă / Comanda minimă
      (ex. 100 buc.)" spans 2 rows; align the row as if every field had a subtitle (consistent heights).
      _Gave Titlu + Preț de bază a `description` so all three inputs align in `ItemCard`._
- [x] **New category appears at the top** [C3] — adding a category should prepend it to the top of the
      list (mirror the "add item on top" behaviour). _`addCategory` prepends; category `sort_order`
      normalized on save._

### Auth / cart
- [x] **Logged-out checkout → login** [C2] — clicking "Finalizează comanda" while logged out should
      route to the login page (not silently fail / show the modal). _`CartBar.startCheckout` checks
      `auth.getUser()`; logged-out → `/login?next=<cart path>`; login page forwards `next` to the callback._
- [x] **Persist cart across login** [C2] — after logging in (from the checkout redirect), the cart
      contents should still be there. _Cart already lives in `localStorage`; the `next` round-trip returns
      to the same page so the cart rehydrates. (In-memory attached files still need re-attach — known.)_

### Checkout
- [x] **Phone picker in the checkout modal** [C2] — the details step should offer a dropdown of the
      account's saved phone numbers AND allow free-text entry (combobox). _Already shipped in `90c0cda`:
      "Telefon salvat" `Select` fills the field + free-text `PhoneInput` (with country-flag prefix) +
      "save for next time" opt-in. Verified._

### Orders / financials
- [x] **Platform commission wrong on order page** [C1] — "Comision platformă" on the order detail is
      not computed correctly. _Not a code bug: the place-order calc + frozen display were correct. The
      symptom was **legacy data** — 8 pre-commission-system orders frozen with `commission/payout = 0`
      (showing shops "Încasezi 0.00 RON"). Resolved by deleting the stale PrintHaus test orders (39 rows,
      cascaded) at Alex's request; 0 broken rows remain._
- [x] **Dashboard shows wrong data** [C1/C3] — dashboard figures are not correctly computed. _Real bug:
      `shop_stats` + `shop_revenue_daily` counted only `status='done'`, but the flow now also has
      `picked_up`/`delivered` as completed (and `ready_for_pickup` was in no bucket) — so revenue/payout/
      commission/done undercounted, disagreeing with the dashboard's JS StatCards. Migration
      `20260626183825_fix_shop_stats_completed_statuses` widens the completed set to
      `done|picked_up|delivered` and adds `ready_for_pickup` to the in-progress bucket._

### Order status UI / colors
- [x] **"Trimite la livrare" button color** [C2/C3] — off-palette; use a brand/palette token via the
      design system, not a hardcoded weird color. _Action buttons inherit the target status token, so
      changed the `in_delivery` token grape→`indigo` (a cool "in transit" tone); button + pill + donut
      all follow._
- [x] **"Livrată" status pill too dark** [C2/C3] — the delivered status pill renders super dark; fix
      the token in `lib/design/status.ts`. _Dropped the `badgeColor: "teal.7"` override on
      `delivered`/`picked_up` → standard light teal tint._
- [x] **Finished order shouldn't look orange** [C2/C3] — a `done`/Livrată order still shows orange,
      implying something pending; give a terminal/neutral color so it reads as complete. _The timeline's
      current step now renders as done (teal + check) once `isCompletedStatus`, not the brand-orange dot._
- [x] **Hide ETA when In livrare / Livrată** [C2] — "Estimat de completare a comenzii" should be hidden
      once the order is in delivery or delivered (already complete). _New `isEtaActive` (pending/accepted/
      in_progress only) gates the ETA header + timeline countdown on both order pages + hides the shop ETA
      editor once it's out for delivery/done._

### Chat
- [x] **Send photos in chat** [C1/C2/C3] — allow image attachments in both chat threads (order +
      complaint). _Migration `20260626185832_chat_media_attachments`: `messages.attachments jsonb` +
      private `chat-media` bucket (own-folder upload RLS). Upload via `lib/storage/chatMedia.ts`; read via
      `GET /api/orders/[id]/chat-media?path=` (order-participant + path-belongs-to-order checked → 1-day
      signed URL). `ChatPanel` gains a paperclip image picker + pending previews + in-bubble image render,
      working on both order & complaint threads, customer + shop side. Unit tests still green._

### Infra
- [x] **Register `sprintr.shop` OAuth callback** [C1 👤] — production Google login on `sprintr.shop`. ✅ WORKING.
      _Config (Supabase → Auth → URL Configuration): Site URL = `https://sprintr.shop`; Redirect URLs allow-list
      `https://sprintr.shop/auth/callback` + `https://sprintr.shop/**` (the early bounce to sprintr-dev was
      Supabase falling back to the Site URL when the redirect_to wasn't allow-listed). Google OAuth client keeps
      the Supabase callback `https://qborcngytmztfucjuwgw.supabase.co/auth/v1/callback`; consent App name set to
      "Sprintr". **ROOT CAUSE of the final "PKCE code verifier not found" / works-on-2nd-try:** Vercel served
      BOTH `www.sprintr.shop` and apex `sprintr.shop` as separate origins with no redirect → the verifier is a
      host-only cookie, so when the flow started on one host and the callback resolved on the other, the cookie
      was lost. **Fix: removed `www.sprintr.shop` in Vercel → single apex origin.** Code hardening pushed along
      the way (kept): `proxy.ts` forwards a stray `?code=` from `/` → `/auth/callback`; the callback now surfaces
      the real Supabase error instead of a generic `auth_failed`. App auth was already domain-agnostic
      (`window.location.origin` + `@supabase/ssr` cookies on client & server)._
- [ ] **Vanity auth domain (consent-screen polish)** [C1 👤, deferred — pre-launch] — the Google consent
      screen still shows the raw `qborcngytmztfucjuwgw.supabase.co` redirect host. To make it read
      `sprintr.shop`, enable Supabase **Custom Domains** (Pro add-on, ~$10/mo): set up `auth.sprintr.shop`
      (CNAME), then add `https://auth.sprintr.shop/auth/v1/callback` to the Google OAuth client's authorized
      redirect URIs. Pure branding polish — defer until closer to public launch.
- [x] **(minor) `NEXT_PUBLIC_SITE_URL` on Vercel** — set to `https://sprintr.shop` (Production) by Alex.
