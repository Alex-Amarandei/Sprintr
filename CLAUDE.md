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
- **`shops`** = public-readable storefront: `id, name, description, logo_path, banner_path, phone,
  email, address, schedule (jsonb), schedule_overrides (jsonb), delivery_fee, commission_rate,
  default_eta_minutes, active_version_id, created_at`. Storage **paths** not URLs. No `owner_id`,
  no `city`. `commission_rate` owner-immutable (admin-only, trigger `shops_guard_commission`);
  `default_eta_minutes` seeds new orders' ETA.
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
  catalog_version_id, handled_by, completed_at, archived_at`. `eta_minutes` = per-order estimate
  (visible both sides; shop-editable via `setOrderEta`; seeded from `shops.default_eta_minutes`).
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
  is_active, in_stock, sort_order, base_price, sku, unit, category_id, requires_upload,
  accepted_file_types, fields[]`. `is_active` = published/listed; `in_stock` = availability (both
  must be true to show/order). `sku`/`unit` = optional retail metadata (display-only, no pricing impact).
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
- **Stripe:** `/api/stripe-webhook` (raw-body signature verify) flips `payment_status`. Keys are
  Vercel server env only (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; publishable is `NEXT_PUBLIC_`).
  Local: `stripe listen --forward-to localhost:3000/api/stripe-webhook`; test card `4242…`.
- **Order files:** customer attaches at checkout → uploaded to private `order-files` bucket under
  `{uid}/…` (own-folder RLS); paths frozen into `order_items.files`. Shop downloads via service-role
  **signed URLs** (`GET /api/orders/[id]/files`).
- **Invoice:** `GET /api/orders/[id]/invoice` streams an on-demand receipt PDF (`@react-pdf/renderer`,
  embedded Noto Sans for diacritics). Auth-gated via `getOrderDetail`.
- **Status:** `pending → accepted | rejected → in_progress → in_delivery → done`. `in_delivery` is
  delivery-only (pickup skips it). `completed_at` set on `done`/`rejected`; `pg_cron` sets
  `archived_at` ~1 day later. `advanceOrderStatus(orderId, status)` Server Action; stamps `handled_by`
  on accept.

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
- WhatsApp courier ping not built yet (server-side, on accept).
- Inventory (Phase 2: `inventory_items`, `consumes`) deferred — `in_stock` flag is the simple gate for now.

## Gotchas
- **Mantine + RSC:** don't import a Mantine **client** component into a Server Component (statics become
  `undefined`). Use `theme.components` plain config objects (not `Component.extend()`); wrap compound
  APIs (`Tabs.List`, `Accordion.Item`, …) in a small `"use client"` component. Don't pass
  `component={Link}` from an RSC — use the `web/src/components/ui/links.tsx` wrappers (string `href`).
- **Fonts:** next/font var must be on `<html>` (not just `<body>`) or Mantine falls back to serif.
- **Nested Mantine `Collapse`** mis-measures height → use conditional render for nested expandables.
- **Screenshots:** `/dashboard/*` and `/browse` never reach network-idle → verify via DOM, not screenshots.
- **Pricing parity:** the place-order server reprice (`api/place-order/route.ts`) must stay
  byte-equivalent to `lib/catalog/pricing.ts` — any >1 bani divergence rejects a valid cart. Watch:
  per_unit with an unanswered `per` = 0 (not amount×1); quantity multiplier `|| 1` (0/NaN → 1); and
  always guard `item.fields ?? []` (products may omit `fields` → was a 500).
- **Charts:** `@mantine/charts@9` requires **recharts ≥3.2.1** — do NOT downgrade to recharts 2 (the
  Donut/Pie still renders on v2 but cartesian charts like AreaChart silently draw axes with no series).
  In recharts 3 the Pie `activeIndex` prop is gone — drive the hover-active sector via `activeShape` +
  the `Tooltip`. `valueFormatter`/`activeShape` are functions → keep charts in a `"use client"` wrapper
  (`components/dashboard/AnalyticsCharts.tsx`), pass only serializable data from the Server Component.
