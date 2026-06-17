# SprintR — Working Context

> Condensed source of truth. Full history (superseded decisions, design rationale, the
> complete catalog/builder spec) lives in **`CONTEXT_HISTORY.md`** — consult it when you need
> the why or the full §-numbered spec. This file = what's currently true.

## Product
Delivery-style app for **stationery / printing** (not food). Customer uploads a file, configures
a print/binding job, picks it up or gets it delivered; a shop receives the order, accepts, advances
status; live per-order chat. First (only) market: **Iași, Romania** (hardcoded — no city column).

Roles: **customer** (buyer), **shop** (vendor, admin-pre-created), **courier** (not an app user —
gets a WhatsApp ping, later), **admin** (full app + DB root access).

## Stack
- **Next.js 16** (App Router, Turbopack) · React 19 · TypeScript 6. Run from `web/`.
- **UI: Mantine v9** — theme tokens + components only, **no Tailwind, no custom CSS / className
  utilities**. Theme in `web/src/lib/theme.ts` (design system "Slate · Ink · Ember", brand = ember
  orange). Status tokens in `lib/design/status.ts` — use `<StatusBadge>`, never hardcode.
- **Supabase** (Postgres 17.6 + Auth + Storage + Realtime). Two clients: `web/src/lib/supabase/{client,server}.ts`.
- **Hosting: Vercel.** Custom server logic = **Server Actions** (UI mutations) + **Route Handlers**
  (`app/api/*`, for webhooks/external). No Supabase Edge Functions (the deployed ones are unused).
- **Package manager: Bun** (`bun install`, `bun run dev`, `bunx`). Not npm.
- **Auth: Google OAuth only.** `signInWithOAuth` → `/auth/callback`. Role routing centralised at `/`
  (logged-in → `/dashboard` if `shop`/`admin`, else `/browse`). OAuth users default to `customer`.

## Conventions
- **Commits:** single gitmoji subject line, no body.
- **Backend owns schema.** `supabase/migrations/*.sql` is authoritative — no ad-hoc DB changes.
  Apply via MCP `apply_migration`, commit the `.sql`, regenerate + commit TS types. Teammates
  `git pull` migrations/types; they never apply migrations (shared DB). Announce before applying.
  After applying, rename the local file to match the MCP-stamped version from `list_migrations`.
- **Run `get_advisors` after every migration.** Lock down functions with `revoke execute … from
  public, anon` (grants arrive via `PUBLIC` — revoking one role isn't enough).
- **Trunk-based git.** `main` stays demoable. Branches: `migrations`, `backend-dev`, `feat/shop-*`,
  `feat/customer-*`. Repo is fork `Alex-Amarandei/Sprintr` (`origin`).
- **Track work in `TASKS.md`**; check off `- [x]` in the same commit.
- **Don't push until the user has tested and OK'd it.**

## Supabase project
- Ref `qborcngytmztfucjuwgw` · `https://qborcngytmztfucjuwgw.supabase.co` · region Frankfurt.
- Access via **Supabase MCP** (each teammate authenticates via `/mcp` OAuth; invite required).
- Each teammate needs their own `web/.env.local` (copy `.env.local.example`, gitignored).
- **Registry gotcha:** global npm registry points at a private JFrog that 403s public packages.
  Root + `web/.npmrc` pin npmjs.org; for `bunx` one-offs prefix `NPM_CONFIG_REGISTRY=https://registry.npmjs.org/`.
- AI skills in `.agents/skills/` (symlinked to `.claude/skills/`): `mantine-form`, `mantine-combobox`,
  `mantine-custom-components`, `supabase`. Mantine MCP in `.mcp.json`.

## Data model
**IDs:** plain `uuid primary key default gen_random_uuid()` (UUIDv4) for all our PKs.
`profiles.id` = `auth.users.id` (the exception).

**Template (FKs, mutable) vs instance (frozen copies).** A placed order is a permanent
self-contained record — it never changes when the catalog is later edited.

### Schema (deployed)
- **`profiles`** (1:1 auth.users): `id, email, full_name, phone, role, created_at`. `role` =
  `user_role` enum `customer | shop | admin`. `handle_new_user()` trigger auto-creates on signup.
  RLS = select-own **plus** `profiles_select_shop_customer`: a shop member can read the
  name/phone/email of any customer who ordered at their shop (via SECURITY DEFINER
  `can_read_customer(uuid)`, no orders-RLS recursion).
- **`shops`** = public-readable storefront: `id, name, description, logo_path, banner_path, phones
  (text[]), website_url, email, address, schedule (jsonb), schedule_overrides (jsonb), delivery_fee,
  commission_rate, default_eta_minutes, lat, lng, is_active, active_version_id, created_at`. Storage
  **paths** not URLs (logo/banner also accept a pass-through absolute URL). No `owner_id`, no `city`.
  `phones` = list of contact numbers (UI: `TagsInput`); the legacy single `phone` column still exists
  (deprecated, to be dropped after this lands on main). `lat/lng` = shop coords, **auto-geocoded from
  `address` on profile save** (`forwardGeocode`, Iași-bounded) — drive the delivery-radius check +
  courier pickup. `commission_rate` owner-immutable (admin-only, trigger `shops_guard_commission`);
  `default_eta_minutes` seeds new orders' ETA. "Temporary pause" = `schedule_overrides` day-entries set
  to `null` (closed) via the `setShopPause` action; `isOpenNow` honours overrides over the weekly
  `schedule`, flipping the open badge + checkout gate. (`is_active` column exists; browse-hiding by it is
  a separate TODO.)
- **`shop_permissions`** `(shop_id, profile_id, role)`, `shop_role` enum ordered `staff < catalog <
  owner`. staff=orders+chat; catalog=+catalog/offers; owner=+members/legal/finance. RLS via
  `is_shop_member(shop_id, min_role)` SECURITY DEFINER helper.
- **`shop_legal`** = owner-only fiscal data (1:1, PK=FK).
- **`catalog_versions`** = immutable JSON snapshots; `shops.active_version_id` = live one. Edit a
  **draft**, publish = move the pointer. Keep last 10. RPCs: `create_catalog_draft`,
  `set_active_catalog_version`. `catalog`+ manage; public reads only the active version's `document`.
- **`orders`** + **`order_items`** (mixed cart, one row + N lines). Lines freeze `kind, item_id,
  item_title, quantity, answers (jsonb), price_breakdown (jsonb), line_total, files (jsonb)`.
  Orders carry `total, subtotal, discount, shipping_fee, service_fee, commission, payout,
  eta_minutes, applied_offers (jsonb), status, payment_method, payment_status, payment_ref, paid_at,
  catalog_version_id, handled_by, completed_at, archived_at`, plus `delivery_lat/lng` (drop-off coords
  from the checkout map/geolocation) and `courier_provider/ref/status/tracking_url/name/phone` (external
  courier dispatch — Glovo). `eta_minutes` = per-order estimate (visible both sides; shop-editable via
  `setOrderEta`; seeded from `shops.default_eta_minutes`).
  **No client insert** — only the place-order Server Action (service role).
- **`shop_invitations`** `(shop_id, email, role)` = pre-authorized members without an account yet.
  Owner-only SECURITY DEFINER RPCs manage the team (`add_shop_member` → 'added' if the email has a
  profile else 'invited'; `set_shop_member_role`, `remove_shop_member`, `list_shop_members`,
  `list_shop_invitations`, `cancel_shop_invitation`; last-owner lockout guard). `handle_new_user`
  **claims** matching invites on first Google login. Becoming a member grants `profiles.role='shop'`
  (dashboard access). UI: `/dashboard/members`. No invite email yet (pre-auth only).
- **`messages`** = per-order chat (Realtime). Participants insert directly under RLS. `kind`
  (`order|complaint`): RLS allows `order` posts only while active, `complaint` posts only once the
  order is `done`/`rejected` — so a closed order's chat is read-only but a complaint thread opens.
  `ChatPanel` shows a Reclamație/Conversație tab on closed orders (one subscription, routed by kind).
- **`offers`** = live promos (not in catalog versions): `type` (`percent|fixed|bxgy|free_shipping`),
  `scope` (`product|category|cart`), `target_id`, `trigger` (`automatic|code`), `code`, `config jsonb`,
  `stackable`, window. Public reads only **live automatic** offers; codes never exposed (use
  `validate_offer_code`). `catalog`+ manage.
- **`reviews`** + **`review_replies`** — verified-purchase only (`done` order required), immutable,
  public read. `target_type` = `shop | employee | item`.
- **`rls_auto_enable` event trigger** turns on RLS for every new public table — **but you still
  must write policies** (RLS on + no policy = deny-all).
- **Admin:** `is_admin()` + a permissive `*_admin_all` policy on every table + `storage.objects` →
  root access. Admins: George (georgecodefy@gmail.com), Alex (alex.m.amarandei@gmail.com).

### Catalog document (the `document` JSON) — see CONTEXT_HISTORY §1–11 for the full contract
- `{ schema_version, categories[], items[] }`. Categories nested via `parent_id`.
- **Item:** `id (stable across versions), kind (service|product), title, description, image_path,
  is_active, in_stock, sort_order, base_price, min_quantity, sku, unit, category_id, requires_upload,
  accepted_file_types, fields[]`. `is_active` = published/listed; `in_stock` = availability (both
  must be true to show/order). `min_quantity` (default 1) = smallest orderable quantity; it raises the
  floor of the item's `is_quantity` field + clamps the line multiplier (enforced in defaultAnswers /
  validateAnswers / the order form / the place-order reprice). `sku`/`unit` = optional retail metadata (display-only, no pricing impact).
- **Field types (only these 5):** `single_select | multi_select | boolean | number | text`, plus
  `file` handled at item level via `requires_upload`/`accepted_file_types`. Rich UIs (color swatches,
  image choices) are just `single_select` with shop-defined options — not new types.
- **Pricing (additive + per_unit only):** `quantity = answers[is_quantity field] or 1`;
  `line_total = quantity × (base_price + Σ addons)`. Per-type pricing + the full algorithm in §7.
  **Server reprices authoritatively at placement**; client computes the same formula for live preview
  (shared pure-TS module `lib/catalog/{pricing,answers}.ts`).

## Money & flows
- **Place order** (`/api/place-order` route handler / Server Action): requires auth, reloads the live
  catalog, **reprices every line server-side**, rejects on >1¢ mismatch or OOS line, applies offers,
  inserts via service role. Online payment → creates Stripe PaymentIntent (RON), returns `client_secret`.
- **Delivery location & 12 km radius:** checkout has a **Leaflet map picker** (`components/cart/LocationPicker`,
  loaded `ssr:false`) + "use current location" + reverse-geocode (free OSM Nominatim) → freezes
  `orders.delivery_lat/lng`; on open it tries to prefill the address from geolocation. A delivery order whose
  drop-off is **> `MAX_DELIVERY_KM` (12 km)** from the shop is **blocked** — client alert + nearby-shop
  suggestions (`findNearbyShops`) AND a server reject in place-order. Degrades to *allowed* when either side
  has no coords. Helpers in `lib/geo/geocode.ts` (haversine, forward/reverse geocode, Google-maps link); the
  shop+order detail render the address as a maps link. Dep: `leaflet` (+`@types/leaflet`).
- **Cart discount preview:** `CartContext` loads the shop's live automatic offers and runs the shared
  `applyOffers` engine for a live preview (`discount`/`payable`/`freeShipping`/per-line strikethrough);
  checkout mirrors it and the server reprices authoritatively. Delivery fee preview comes from `quoteDelivery`
  (Glovo) when enabled, else the shop's flat `delivery_fee`.
- **`total = subtotal − discount + shipping_fee + service_fee`.** `service_fee` = flat 2 lei
  (checkout only). The customer is **not** charged a platform fee (the old +6% is removed).
- **Platform commission (deducted from payout, not added to the customer):** per-shop
  `shops.commission_rate` (default 5%). `goods = subtotal − discount`;
  `commission = goods ≥ 2 ? round(goods × rate) : 0` (no commission below 2 lei);
  `payout = goods − commission + shipping_fee`; platform take = `commission + service_fee`.
  `orders.commission`/`orders.payout` are **frozen at placement** (no recompute). `commission_rate`
  is **owner-immutable** (trigger `shops_guard_commission`, admin-only) and **invisible to the
  customer** and to the shop except on its own order breakdown (`payout` line). Analytics +
  reports/CSV reflect commission/payout.
- **Stripe:** `/api/stripe-webhook` (raw-body signature verify + `stripe_events` idempotency) flips
  `payment_status`; PI created at place-order (idempotency key `pi_<orderId>`, order rolled back if PI
  fails); `confirmOrderPayment` (`lib/orders/payment.ts`) is a client fallback. Keys are Vercel server env
  only (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; publishable is `NEXT_PUBLIC_`). Local:
  `stripe listen --forward-to localhost:3000/api/stripe-webhook`; test card `4242…`.
- **Refunds (done):** a paid online order is auto-refunded when the shop **rejects** it
  (`lib/orders/refund.ts` → Stripe refund, wired in `advanceOrderStatus`; `charge.refunded` webhook also
  catches manual dashboard refunds) → `payment_status='refunded'`. Customer-initiated cancel/refund: not built.
- **Payouts = MANUAL (MVP choice):** the platform collects everything; shop `payout` is just a stored number
  — shops are paid by bank transfer using the CSV export. **No Stripe Connect** (deferred to scale; would be
  Express accounts + `transfer_data`/`application_fee_amount`). Full plan + the deferred items: TASKS.md
  "🚀 Production launch".
- **Couriers (Glovo LaaS) — built, GATED OFF by default** (`lib/delivery/{glovo,dispatch,actions,types}.ts`).
  Active only when `GLOVO_API_KEY`+`SECRET` are set, or `GLOVO_API_ENV=mock` (realistic fake data for
  testing — no account). Flow: checkout shows a live quote (`quoteDelivery`) as the delivery fee — **pricing
  model A = the customer pays the courier cost** — and place-order re-quotes authoritatively
  (`baseShipping = quote.fee`); for a courier delivery the shop's `payout` EXCLUDES that fee (the platform
  pays Glovo). `advanceOrderStatus → in_delivery` dispatches a courier, `→ rejected` cancels it. Webhook
  `/api/glovo-webhook`; courier shown on both order details; `orders.courier_*` columns. **3 `TODO(glovo)`
  spots need real sandbox creds to confirm: auth header, price units (`/100`), webhook signature/fields.**
  Supersedes the old WhatsApp-ping idea. Full launch plan: TASKS.md.
- **Order files:** customer attaches at checkout → uploaded to private `order-files` bucket under
  `{uid}/…` (own-folder RLS); paths frozen into `order_items.files`. Shop downloads via service-role
  **signed URLs** (`GET /api/orders/[id]/files`).
- **Invoice:** `GET /api/orders/[id]/invoice` streams an on-demand receipt PDF (`@react-pdf/renderer`,
  embedded Noto Sans for diacritics). Auth-gated via `getOrderDetail`.
- **Status:** `pending → accepted | rejected → in_progress → in_delivery → done`. `in_delivery` is
  delivery-only (pickup skips it). `completed_at` set on `done`/`rejected`; `pg_cron` sets
  `archived_at` ~1 day later. `advanceOrderStatus(orderId, status)` Server Action; stamps `handled_by`
  on accept; on `in_delivery` dispatches the Glovo courier, on `rejected` cancels it + refunds (if paid).
- **Order visibility (shop):** an order reaches the shop (queue + the "Comandă nouă" notification) only
  once it's actually placed — **cash on insert, online ONLY when `payment_status='paid'`.** Enforced by the
  `notify_new_order`/`notify_paid_order` triggers + a shared `payment_method.neq.online,payment_status.eq.paid,
  payment_status.eq.refunded` filter in `getShopOrders`/`getShopOrderCounts`/`exportShopOrders` (payout CSV).
  `refunded` is included because a refund implies the charge was captured first — so an online order the shop
  **rejects (auto-refunded)** or refunds manually STAYS in its history instead of vanishing from the queue.
  An **abandoned/unpaid online checkout is invisible** to the shop (no order, no notification, not in the
  payout CSV) until payment succeeds.

## Routing
- Customer: `/browse`, `/orders`, `/shop/[shopId]`, `/order/[orderId]` (public: `/browse`, `/shop/[id]`).
- Shop: `/dashboard` + `/dashboard/{orders,products,services,offers,profile}` (layout guards `shop|admin`).
- Auth: `/login`, `/register`. `/` routes by role. `middleware.ts` skips auth when env keys are
  placeholder; protected prefixes `/order /orders /dashboard /courier` (segment-precise).

## Active shop & viewer identity
- A user can belong to **several shops** (`shop_permissions`). The dashboard scopes to ONE
  **active shop** via the `sprintr.active_shop` cookie. `lib/shop/active.ts` =
  `getMyShops()` / `getActiveMembership()` / `getActiveShopId()` (cookie → validate → first
  membership), all `cache()`d per request. **Every shop-scoped read resolves through these**
  (getMyShop, getShopOrders, exportShopOrders, loadShopProfile, loadCatalogEditor, products,
  members) — never `shop_permissions … limit(1)` ad-hoc. Switch via `setActiveShop` action.
- `lib/auth/identity.ts` `getViewerIdentity()` = display name + Google avatar
  (`user_metadata.avatar_url`, no profiles column; initials fallback via `utils/format.initials`)
  + shop memberships + active one. Powers the customer header `ProfileMenu`, the dashboard
  `DashboardTopbar` (company + role badges, shop switcher, account menu), and the greeting.

## Read/write layers (server-only unless noted)
- Reads: `lib/catalog/shops.ts` (getShops/getShopView/getShopCatalog), `lib/catalog/products.ts`,
  `lib/orders/queries.ts` (getMyOrders/getOrderDetail/getShopOrders/getMyShop), `lib/offers/queries.ts`.
- Writes (Server Actions): `lib/orders/actions.ts`, `lib/shop/actions.ts`, `lib/offers/api.ts`.
- Engine: `lib/catalog/offers.ts` (`applyOffers`, pure — client preview + server reprice). Order of
  application `product → category → cart`; percents compound on the running amount; `stackable=false`
  = exclusive; best-pick between all-stackable vs each-exclusive-alone.

## Known gaps / still-stubbed (visual placeholders until BE lands)
- Shop profile editor persists name/description/phone/email/address/schedule/delivery_fee/
  default_eta_minutes; logo/banner upload wired via `shop-assets`. (City still hardcoded Iași.)
- Order ETA: `orders.eta_minutes` exists + is read on both sides; shop edit control / customer
  timeline display is FE polish (C3/C2).
- Customer identity for shops now resolvable (`profiles_select_shop_customer`); still falls back
  to "Client" if a profile has no `full_name`.
- Courier delivery: **superseded by the Glovo LaaS integration** (built + gated — see Money & flows and
  TASKS.md "🚀 Production launch"). Glovo dispatches the courier on `in_delivery`; the old WhatsApp-ping
  idea is dropped. Needs real Glovo sandbox creds to finish (3 `TODO(glovo)` spots).
- Inventory (Phase 2: `inventory_items`, `consumes`) deferred — `in_stock` flag is the simple gate for now.

## Gotchas
- **Mantine + RSC:** don't import a Mantine **client** component into a Server Component (statics become
  `undefined`). Use `theme.components` plain config objects (not `Component.extend()`); wrap compound
  APIs (`Tabs.List`, `Accordion.Item`, …) in a small `"use client"` component. Don't pass
  `component={Link}` from an RSC — use the `web/src/components/ui/links.tsx` wrappers (string `href`).
- **Fonts:** next/font var must be on `<html>` (not just `<body>`) or Mantine falls back to serif.
- **Nested Mantine `Collapse`** mis-measures height → use conditional render for nested expandables.
- **Screenshots:** `/dashboard/*` and `/browse` never reach network-idle → verify via DOM, not screenshots.
- **Google avatars:** `lh3.googleusercontent.com` (the OAuth `avatar_url`) 403s when a referrer is
  sent → pass `imageProps={{ referrerPolicy: "no-referrer" }}` to Mantine `<Avatar>` or it shows a
  broken image instead of the initials fallback.
- **Read state:** mark a chat read via the `mark_order_read(order_id)` RPC (server `now()`), not a
  client-time upsert — clock skew left just-read messages "unread" so the badge never cleared.
- **Pricing parity:** the place-order server reprice (`api/place-order/route.ts`) must stay
  byte-equivalent to `lib/catalog/pricing.ts` — any >1 bani divergence rejects a valid cart. Watch:
  per_unit with an unanswered `per` = 0 (not amount×1); quantity multiplier `|| 1` (0/NaN → 1); and
  always guard `item.fields ?? []` (products may omit `fields` → was a 500).
- **Charts:** `@mantine/charts@9` requires **recharts ≥3.2.1** — do NOT downgrade to recharts 2 (the
  Donut/Pie still renders on v2 but cartesian charts like AreaChart silently draw axes with no series).
  In recharts 3 the Pie `activeIndex` prop is gone — drive the hover-active sector via `activeShape` +
  the `Tooltip`. `valueFormatter`/`activeShape` are functions → keep charts in a `"use client"` wrapper
  (`components/dashboard/AnalyticsCharts.tsx`), pass only serializable data from the Server Component.
- **Schedule (open/closed) is Bucharest wall-clock:** all open/closed + temporary-pause math runs in
  `Europe/Bucharest` via `Intl` (`lib/shop/schedule.ts` `bucharestNow`/`bucharestDateKey`), NOT raw `Date`
  parts — Vercel/SSR is UTC and a browser is the visitor's zone, so `getHours()/getDay()` would be 2–3 h off.
  `isOpenNow` (`catalog/shops.ts`) delegates to `getScheduleStatus`; `setShopPause` stamps override keys with
  the Bucharest date so writer + reader agree across midnight.
- **Cart files don't persist:** `CartLine.files` are in-memory `File`s, stripped when the cart saves to
  localStorage → after a reload a requires-upload item has no file. The line carries a serializable
  `requiresUpload` flag; `CartBar` detects the gap, shows a **re-attach** picker (`attachFiles`), and blocks
  checkout until it's re-added (defense guard in `CheckoutModal` too). Reorder sets `requiresUpload` as well.
- **Shipping/courier money parity:** the place-order reprice must mirror the checkout preview. Shipping is
  fulfilment-aware (`baseShipping = pickup ? 0 : delivery_fee`, or the Glovo quote when enabled); for a
  courier delivery the shop's `payout` EXCLUDES that fee (the platform pays the courier — pricing model A).

## Shipped this iteration (delivery + payments push, ~2026-06-03)
> Condensed record; durable details are integrated into the sections above, full task checklist in TASKS.md.
- **Delivery location:** checkout Leaflet map picker + geolocation prefill + reverse-geocode → `orders.delivery_lat/lng`; shops auto-geocode their address → `shops.lat/lng`. (`components/cart/LocationPicker`, `lib/geo/geocode.ts`)
- **12 km delivery radius:** blocks far delivery orders (client alert + nearby suggestions + server reject); degrades to allowed without coords.
- **Cart/checkout pricing:** live discount preview (offers engine in the cart), fixed pickup-vs-delivery shipping + parity bugs.
- **Order visibility:** online orders reach the shop (queue + notification) ONLY when paid; cash immediately (triggers + `getShopOrders` filter).
- **Payments:** refunds auto-on-reject + `charge.refunded` webhook (`lib/orders/refund.ts`); **payouts = manual via CSV** (no Connect — MVP).
- **Glovo courier (gated/mock):** estimate→fee (model A), dispatch on `in_delivery`, cancel on reject, webhook, courier display. `lib/delivery/*`. Needs sandbox creds to finish 3 `TODO(glovo)` spots.
- **Schedule timezone:** open/closed now Bucharest wall-clock (was UTC).
- **UX/polish:** schedule + maps links (address→Google Maps, phone→tel), catalog card image thumbnail + description tooltip, configurator image preview, catalog-builder cancel-edit + publish-when-changed + confirm modal, messages show order #+status, dirty-aware save buttons, file re-attach, search no longer matches raw UUIDs, dark-mode "Respinge" fix, closable card-payment modal.
