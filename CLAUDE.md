# SprintR — Project Plan & Context

This file is the source of truth for the build. It captures scope, data model, and
conventions agreed during planning. Stay inside this scope — do not add features or
fields not listed here without being asked.

## What we're building

A delivery-style app for **stationery / printing services** (not food). A customer
uploads a PDF and configures a print/binding job (covers, cut, binding, etc.); a shop
receives the order with all details; on shop acceptance a WhatsApp message pings a
courier group. Live chat runs per order between customer and shop.

First market: **Iași, Romania** only (city is hardcoded this weekend — no city column).

## Constraints

- **Timeline: 48-hour sprint.** Ruthless scope. Critical path only.
- **Team: 3 people** — one backend/infra, two frontend.
- **Stack:** Supabase (Postgres + Auth + Storage + Realtime) as the backend foundation;
  React (responsive, mobile-first web app). React Native is post-MVP.
- **Strategy:** Lean on Supabase managed pieces over custom code. The only likely custom
  server code is the WhatsApp ping (keep credentials server-side, never in the client).

## Roles

- **Customer** — student/buyer. Places and tracks orders.
- **Shop** — vendor. Builds services, receives/accepts orders. Accounts pre-created by
  admin (no self-serve signup this weekend).
- **Courier** — NOT an app user. Just receives a WhatsApp message.
- **Admin** — operates via the Supabase dashboard, not a built UI.

## Scope — IN

- Customer email/password auth (Supabase Auth).
- Shop browsing (list of 1–3 seeded shops) + shop profile page.
- Dynamic options builder (shop side) + dynamic form renderer (customer side).
- PDF upload (Supabase Storage).
- Order placement with frozen price + selections.
- Shop order dashboard: see all details + PDF, accept/reject, advance status.
- WhatsApp ping to courier group on accept (server-side).
- **Live chat per order** (mandatory) — Supabase Realtime on a messages table.
- Order status tracking: pending → accepted → in_preparation → done (+ rejected).

## Scope — OUT (post-weekend)

Courier accounts/claims/payouts, GPS tracking, courier↔customer chat, payments/checkout,
shop self-signup, password reset/email verification, standalone products, offers/promos,
search, categories, ratings/reviews, multi-city, order editing/cancellation, i18n,
number/quantity fields, conditional option logic, multi-file uploads, image sharing in chat.

> NOTE: `offers` was later moved INTO scope — see "Scope change: offers is now IN scope"
> below. The line above is kept for history.

## Taxonomy

Template side (what a shop defines; mutable; uses foreign keys):
- **Shop** → owns a catalog.
- **Service** → one orderable thing ("Thesis printing & binding"). Has a base price.
- **Option Group** → one configurable question within a service ("Binding", "Cover").
  Has a `type`: `single_select` | `boolean` | `text`.
- **Option Choice** → a selectable value inside a `single_select` group ("Spiral" +10 lei).

Instance side (what a customer commits to; frozen; copies values):
- **Order** → a customer's instance of ordering a service. Carries price snapshot + PDF.
- **Order Selection** → the customer's answer to one option group (copied label/value/price).
- **Message** → chat message scoped to an order.

### Core modeling rules
1. **Template uses FKs; instance copies values.** Order selections store literal
   `group_label`, `group_type`, `answer_value`, `answer_price` — NOT foreign keys back to
   the template. A placed order must be a permanent, self-contained record that does not
   change when a shop later edits/renames/deletes a service or choice.
2. **`option_groups.type` is the discriminator** that drives both rendering and pricing.
3. **Price location by type:**
   - `single_select`: price lives on each `option_choices.price`.
   - `boolean`: price lives on `option_groups.price` (checked = add it).
   - `text`: no price (informational only).
4. **Pricing is additive only:** total = service base_price + sum of selected option prices.
   No quantity multipliers, no per-page, no conditional/tiered pricing.

## IDs — UUIDv7

Use **UUIDv7** for all our own primary keys (timestamp-prefixed → time-sortable + good
B-tree locality). Column type stays `uuid` so everything joins cleanly with
`auth.users` (which stays v4 — fine, version doesn't affect FK integrity).

- Native `uuidv7()` requires Postgres 18. Supabase hosted may still be on PG17 — CHECK
  the dashboard's Postgres version before building.
- If PG18 available: use `default uuidv7()`.
- If not: add a PL/pgSQL `uuid_generate_v7()` function once in the first migration and use
  it as the column default. (Fabio Lima's well-known function, or the `pg_uuidv7` ext.)
- `auth.users` ids are not sortable (Supabase-managed) — irrelevant; sort users by created_at.

> SUPERSEDED — see "Decision reversal: plain UUIDv4 over UUIDv7" below. We use
> `gen_random_uuid()` (UUIDv4). This section is kept for history.

## Schedule modeling

`shops.schedule` (jsonb) = recurring weekly pattern. `shops.schedule_overrides` (jsonb) =
date-specific exceptions. Both jsonb (not tables) because the only query is single-shop
"open now?" while browsing — never cross-shop. No split shifts / holidays-as-table /
timezones this weekend.

```json
// schedule
{ "mon": {"open":"09:00","close":"18:00"}, "sun": null, ... }
// schedule_overrides  (date key present => it wins; null => closed)
{ "2026-06-01": null, "2026-06-15": {"open":"10:00","close":"13:00"} }
```

Open-now logic: check `schedule_overrides[today]` first; if the date key exists it wins
(object = special hours, null = closed); else fall back to `schedule[weekday]`.

## Tables (target ~8)

Template: `shops`, `services`, `option_groups`, `option_choices`
Instance: `orders`, `order_selections`, `messages`
Auth/role: `profiles` (1:1 with auth.users, carries `role`)

### shops (FINALIZED)
```sql
create table shops (
  id                 uuid primary key default uuid_generate_v7(),
  owner_id           uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  description        text,
  logo_path          text,        -- storage path, not URL (logo = profile picture)
  banner_path        text,        -- storage path, not URL
  phone              text,
  address            text,        -- single free-text line (e.g. "Str. Lăpușneanu 12, Iași")
  schedule           jsonb,       -- recurring weekly hours
  schedule_overrides jsonb,       -- date-specific exceptions
  created_at         timestamptz not null default now()
);
create index on shops (owner_id);
```
Everything past `name` is nullable so a bare shop can be inserted and filled in (matters
for fast seed data). Store storage PATHS not URLs. No `city` column (Iași hardcoded).

> SUPERSEDED — `owner_id` was dropped and ownership moved to `shop_permissions`; the UUID
> default is now `gen_random_uuid()`. See "Shops, access control & legal data" below.

### Not yet designed (DO THESE NEXT)
- `profiles` (role mapping: customer | shop, 1:1 with auth.users) — design FIRST, security
  depends on it.
- `services` (id, shop_id FK, name, base_price, created_at)
- `option_groups` (id, service_id FK, label, type, required, price nullable for boolean, sort_order)
- `option_choices` (id, group_id FK, label, price, sort_order)
- `orders` (id, customer_id FK, shop_id FK, service_id FK, total_price, status, pdf_path, created_at)
- `order_selections` (id, order_id FK, group_label, group_type, answer_value, answer_price)
- `messages` (id, order_id FK, sender_id FK, body, created_at)

## Non-functional

- Order placement + chat delivery feel instant (sub-second perceived).
- Mobile-first responsive web. Demo likely shown on a phone.
- RLS: customer sees only their own orders/chats; shop sees only its own shop/orders.
- PDFs in access-controlled storage (not public URLs).
- WhatsApp/API credentials server-side only.
- Demo-grade reliability: the happy path (browse → order → accept → chat → notify) must
  not break on stage. Harden it last.
- Romanian content is fine; no i18n system.

## Open decisions (resolve before/while coding)

1. `order_selections` proper table (chosen, cleaner) vs `jsonb` blob on orders (day-2
   shortcut if tight). Default: proper table.
2. WhatsApp: real Twilio/WhatsApp API access, or stub/`wa.me` fallback for the demo?
   This decides whether ANY custom server code is needed.
3. Build-day check: Supabase Postgres version (PG18 native uuidv7 vs add the function).
   → Resolved: PG17.6, and we chose UUIDv4 (see reversal below).

## Build order suggestion

0. First migration: `uuid_generate_v7()` function (if needed) → `profiles` → trigger to
   create a profile row on auth signup.
1. `shops` + `services` + `option_groups` + `option_choices` + seed 1–2 shops/services.
2. `orders` + `order_selections` + storage bucket for PDFs.
3. `messages` + realtime + RLS policies across all tables.
4. Wire frontend: chat is a SHARED component one person owns (both customer + shop embed it).
   Frontend split otherwise: Person A = shop side, Person B = customer side.

---

# Build-day conventions (append-only)

> Decisions made while building. **Append here additively** whenever we agree on
> something colleagues must follow — never rewrite/delete. Commit the change.

## Tooling

- **Package manager: bun** (not npm/npx). Use `bun install`, `bun run <script>`,
  `bunx <tool>`, `bun add <pkg>`. `web/` uses `bun.lock` (the old `package-lock.json`
  was removed). Node was briefly broken on macOS (missing `libsimdjson` dylib); fix is
  `brew reinstall node@24 simdjson`.
- **Commits: a single gitmoji subject line, no body** (see https://gitmoji.dev).

## Supabase

- **One shared cloud project. No Supabase DB branching** this weekend (Pro-only,
  overkill for 3 people). Project ref: `qborcngytmztfucjuwgw`, region Central EU
  (Frankfurt). URL: `https://qborcngytmztfucjuwgw.supabase.co`.
- **Postgres 17.6** → no native `uuidv7()`. (We chose UUIDv4 anyway — see below.)
- Access is via the **Supabase MCP** (`.mcp.json`, committed). Each teammate must
  (1) be **invited to the Supabase project/org**, then (2) run `/mcp` → **authenticate**
  (OAuth). The committed config alone grants no access.
- Supabase **agent skills** are installed under `.agents/skills/` (symlinked into
  `.claude/skills/`); install with `bunx skills add supabase/agent-skills`.

## Migration workflow

- **Backend owns all schema changes.** `supabase/migrations/*.sql` is the single source
  of truth. **The committed migrations are authoritative — do not apply ad-hoc DB changes
  outside them.**
- Apply migrations via the **MCP `apply_migration`**, then commit the `.sql`, regenerate
  TypeScript types, and commit those too.
- Teammates **`git pull` migration files + types — they never apply migrations
  themselves** (shared DB). Announce "applying migration X" before doing so.

## Git / branching

- **Trunk-based.** `main` stays demoable; merge early & often.
- Branches: **`migrations`** (schema/DB work), **`backend-dev`** (server code),
  **`feat/shop-*`**, **`feat/customer-*`**. Chat component has one owner, merged early.
- Repo is the fork **`Alex-Amarandei/Sprintr`** (`origin`); the original upstream remote
  was removed to avoid mistakes.

## Decision reversal: plain UUIDv4 over UUIDv7

Supersedes the "IDs — UUIDv7" section above and the `default uuid_generate_v7()` in the
`shops` block. **For this sprint we use plain `gen_random_uuid()` (UUIDv4) for all our
own primary keys** — no custom function, nothing to break. The v7 benefits
(time-sortability, B-tree locality) only matter at a scale we won't hit this weekend, and
we already sort by `created_at` + index everywhere. Column type stays `uuid`, so flipping
the default back to v7 later needs no type change / data migration.

→ When defining tables, use `id uuid primary key default gen_random_uuid()` (not
`uuid_generate_v7()`). `profiles.id` stays the exception: it equals `auth.users.id`.

## Deployed schema state

- **Migration 0 (`profiles` + auth) is applied.** `profiles` columns:
  `id (=auth.users.id), email not null, full_name, phone, role, created_at`.
  `role` is the **`user_role` enum** (`customer | shop`) — we use the enum, not a
  text+check column.
- Signup is wired: `handle_new_user()` (SECURITY DEFINER, `execute` revoked from
  `anon`/`authenticated`/`public` — call it only via the trigger, never RPC) +
  `on_auth_user_created` trigger auto-creates a profile. Shop accounts pass
  `role`/`full_name` via `raw_user_meta_data`.
- **`rls_auto_enable` event trigger** (`ensure_rls`): auto-runs `enable row level security`
  on every new `public` table. So new tables get RLS turned on for free — **but you still
  must write policies** (RLS on + no policy = deny-all). Adopted into source control in
  migration 2 (and its `execute` revoked); it's canonical now, not out-of-band.
- **Migration filename = ledger version.** The MCP stamps its own wall-clock version on
  `apply_migration`; after applying, rename the local file to match the version shown by
  `list_migrations` so the repo and DB agree (needed for CLI `db push`/`db reset`).
- **Applied ledger:** `…113653 initial_profiles_and_auth`, `…121242 shops_permissions_legal`,
  `…122212 adopt_rls_auto_enable_guard`. (Supersedes any older `00_uuidv7_profiles` note.)

## Shops, access control & legal data (migration 1, applied)

Supersedes the original single-`owner_id` `shops` block. Ownership/permissions now live in
their own table, and fiscal data is split out.

- **`shops`** = public, browsable storefront identity (no `owner_id`):
  `id, name, description, logo_path, banner_path, phone, address, schedule,
  schedule_overrides, created_at`. **Anyone (incl. `anon`) can read shops** — browsing is
  public; login is only required at checkout/chat.
- **`shop_permissions`** `(shop_id, profile_id, role)`, one role per person per shop
  (`unique (shop_id, profile_id)`). `role` is the **`shop_role` enum, ordered
  `staff < catalog < owner`**:
  - `staff` → orders + chat
  - `catalog` → + catalog & offers (everything staff can do, plus catalog/offers)
  - `owner` → + members, legal/fiscal, finance/stats (everything)
  RLS uses `role >= 'x'` thanks to the enum order.
- **`shop_legal`** = sensitive fiscal/tax data, 1:1 with shop (PK = FK), **owner-only**
  read+write: `legal_name, legal_form, fiscal_code (CUI), vat_payer, vat_number, reg_com,
  legal_address`.
- **`is_shop_member(shop_id, min_role)`** SECURITY DEFINER helper drives all shop-scoped
  RLS (bypasses RLS internally to avoid recursion; only checks the caller's own row).
- **Provisioning is admin-only** (service role): admin creates the `shops` row + the first
  `owner` `shop_permissions` row (+ optional `shop_legal`). No self-serve shop signup.
  An `owner` can then add teammates.

### Scope change: `offers` is now IN scope

Reverses the "offers/promos" entry under "Scope — OUT". Offers matter to the product.
The `catalog` role owns them. **Open question for when we build the `offers` table:**
display-only promo (no order-math change) vs price-affecting discount (touches the frozen
order total + the additive-only pricing rule). Decide then.

### Postgres gotcha: function EXECUTE grants

Supabase sets `ALTER DEFAULT PRIVILEGES` granting `EXECUTE` to `PUBLIC`/`anon`/
`authenticated` on every new `public` function, and `CREATE FUNCTION` itself adds a
`PUBLIC` grant. So to lock a function down you must **`revoke execute … from public, anon`
(and `authenticated` if it's trigger-only)** — revoking from one role isn't enough if the
grant arrives via `PUBLIC`. Verify with `pg_proc.proacl`, not just the advisor (which
caches). Run `get_advisors` after every migration. Helper/trigger functions
(`handle_new_user`, `is_shop_member`) are locked down this way; `is_shop_member` keeps
`authenticated` because RLS needs it (an accepted advisor WARN).

# Frontend & integration notes (FE-owned)

> Maintained by the frontend work; kept here so everyone's Claude stays in sync.
> DB/schema decisions are governed by the sections above (UUIDv4, offers IN scope,
> `profiles` = enum + email, `shops` + `shop_permissions` + `shop_legal`) — those
> **supersede** the earlier "UUIDv7 / 8-table / offers-out / single-owner" notes.

## Repo layout (monorepo)
- `web/` — Next.js frontend (built). `server/` — backend, placeholder so far.
- Run the frontend from `web/`. Bun, not npm (`bun install`, `bun run dev`).

## Confirmed stack versions (bumped to latest on purpose, 2026-05-30)
- Next.js **16** (App Router, Turbopack) · React **19** · TypeScript 6
- **UI: Mantine v9** (switched away from Tailwind on 2026-05-30). No Tailwind anymore.
  - Setup: `MantineProvider` + `ColorSchemeScript` in `web/src/app/layout.tsx`, theme in
    `web/src/lib/theme.ts` (brand orange = `primaryColor: "brand"`), `postcss.config.cjs`
    with `postcss-preset-mantine`. `globals.css` is now minimal (Mantine owns the reset).
  - Style with Mantine components + props (`c`, `fw`, `p`, `bg`, etc.), NOT className utilities.
  - GOTCHA: don't pass `component={Link}` from a Server Component (RSC error). Use the
    client wrappers in `web/src/components/ui/links.tsx` (`LinkAnchor`, `LinkButton`,
    `LinkActionIcon`, `LinkNavItem`) which take a string `href`.
  - Account-type values in the register form are `customer` / `shop` (match profiles.role).
- Supabase JS + `@supabase/ssr`. Two clients: `web/src/lib/supabase/{client,server}.ts`.
- Package manager: **Bun** (`web/bun.lock` is the lockfile; no package-lock.json).

## Routing (route-group collision was fixed — don't undo it)
- Customer: `/browse`, `/orders`, `/shop/[shopId]`, `/order/[orderId]` (root level).
- Shop: `/dashboard`, `/dashboard/orders|products|services|offers|profile`.
- Courier: `/courier/deliveries|earnings`.
- Auth: `/login`, `/register`.
- `middleware.ts` skips Supabase auth when env keys are missing/placeholder (app browsable
  before keys are set). Protected prefixes: `/browse /order /orders /dashboard /courier`.

## Auth — Google OAuth (DECISION 2026-05-30, supersedes "email/password" scope line)
We switched login to **Google OAuth only** (was: email/password in Scope-IN line 35).
- FE wired: `signInWithOAuth({provider:'google', redirectTo:/auth/callback})` in
  `components/auth/GoogleSignInButton.tsx`; callback route `app/auth/callback/route.ts`
  (`exchangeCodeForSession`); `/login` + `/register` now show the Google button; a
  `SignOutButton` is in the customer header + dashboard sidebar.
- After login we redirect to `/browse` (customers). Shop owners navigate to `/dashboard`.
  `handle_new_user` gives OAuth users role `customer` by default (no metadata) — shop
  accounts are still admin-pre-created with role/permissions.
- `forgot-password` page is now dead (no passwords); left in place, unlinked.
- **MANUAL CONFIG REQUIRED (dashboard, not code):** (1) Google Cloud OAuth Web client →
  Client ID+Secret, authorized redirect URI `https://qborcngytmztfucjuwgw.supabase.co/auth/v1/callback`;
  (2) Supabase → Auth → Providers → enable Google + paste creds; (3) Supabase → Auth →
  URL config: Site URL `http://localhost:3000`, redirect allow-list `http://localhost:3000/**`.
  Until this is done the button errors out.

## Env
- Each teammate needs their own `web/.env.local` (copy from `.env.local.example`; gitignored).
## AI tooling for Mantine (all teammates get these via the committed files)
- **Skills** in `.agents/skills/` (symlinked to Claude Code): `mantine-form`,
  `mantine-combobox`, `mantine-custom-components`. Use them when building forms / custom
  selects / custom components. There's also the `supabase` skill.
- **Mantine MCP server** added to `.mcp.json` (`bunx @mantine/mcp-server`). Tools:
  list_items, get_item_doc, get_item_props, search_docs. Restart to load it.
- **REGISTRY GOTCHA (we use Bun):** the machine's global npm registry points to a private
  JFrog (FanDuel) that 403s on public packages. Root `.npmrc` + `web/.npmrc` pin
  `registry=https://registry.npmjs.org/`. For `bunx` one-offs that ignore .npmrc, prefix:
  `NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ bunx ...` (the Mantine MCP entry already
  sets this via its `env`).

## Supabase project
- Project ref: `qborcngytmztfucjuwgw` · URL: `https://qborcngytmztfucjuwgw.supabase.co`
- **Postgres 17.6** → no native `uuidv7()`. We use **`gen_random_uuid()` (UUIDv4)** for our
  PKs — see "Decision reversal: plain UUIDv4 over UUIDv7" above. There is **no**
  `uuid_generate_v7()` function (this line previously claimed otherwise — corrected).
- MCP server configured in `.mcp.json` (each teammate authenticates via OAuth on their machine).
- Each teammate needs their own `web/.env.local` (copy from `.env.local.example`, gitignored).

## Seed data (FE-provided catalog inputs)
- `web/seed/pimcopy.json` — real PIM Copy (pimcopy.ro) catalog; `price_estimated:true` =
  fictive placeholder, 3 are real (`:false`).
- `web/seed/printhaus.json` — PrintHaus catalog (16 services, 38 option groups); all prices
  fictive estimates (site publishes none). Phone/address in the `shop` block.
- `web/seed/stef.json` — STEF Copy Center (stef.ro, WooCommerce), Iași. 8 services + 5
  products. **5 REAL prices** (`:false`, from product JSON-LD: șapcă 35, ecuson 1.1,
  ștampile 137/185, set creion 45.3); print/copy/binding/lamination services + variable
  personalizări are estimates (`:true`). Real contact + weekday schedule in `shop`.
- These JSONs use richer option types (`number`, `radio`) + per-unit pricing that **don't**
  match our MVP model (`single_select|boolean|text`, additive-only). **Down-map** when we
  write the seed migration. Seeding ownership (FE script vs seed migration) is TBD.

## Catalog builder — IMPLEMENTED (FE, 2026-05-30)
First cut of the shop catalog configurator lives in `web/src`:
- `lib/catalog/schema.ts` — **Zod** mirror of the builder spec (Item/Field/PriceRule,
  5 field types). Shared source of truth for builder + (future) renderer + price preview.
- `lib/catalog/factories.ts` — blank Item/Field/Option builders. `lib/catalog/api.ts` —
  client RPC/CRUD: `getOrCreateDraft`, `createDraft` (→ `create_catalog_draft`),
  `saveDraftDocument` (updates `catalog_versions.document`).
- `components/catalog/{CatalogBuilder,ItemCard,FieldEditor,PriceRuleInput}.tsx` — the UI.
- Mounted at **`/dashboard/services`** (server page resolves the user's shop via
  `shop_permissions`, loads latest draft + active doc, renders `<CatalogBuilder>`).
- Scope of this cut: editor core (items + fields + price rules + save to draft).
  **Deferred:** publish/version-history UI (`set_active_catalog_version`), image upload,
  drag-reorder (uses up/down buttons for now), customer-facing renderer.
- **To test live you need:** (1) working login (Google OAuth — done) and (2) a seeded
  `shops` row + a `shop_permissions` row (role `catalog`/`owner`) for the logged-in user.
- **Login-free demo:** `/catalog-demo` (builder, localMode) — throwaway, remove before prod.

## Customer renderer + pricing — IMPLEMENTED (FE, 2026-05-30)
The other half of the configurator (Scope-IN "dynamic form renderer (customer side)"):
- `lib/catalog/pricing.ts` — `computeItemPrice(item, answers)` = client mirror of the §7
  algorithm (additive + per_unit, round half-up). Server (Edge Function) stays authoritative.
- `lib/catalog/answers.ts` — `defaultAnswers(item)` (applies defaults/locked) +
  `validateAnswers(item, answers)` (§8 mirror).
- `lib/catalog/samples.ts` — `samplePrintService` worked example (§9: pages × bw, color/page).
- `components/catalog/ItemOrderForm.tsx` — renders a catalog Item as a dynamic form
  (Radio/Checkbox/Switch/NumberInput/Textarea + PDF FileInput), live price breakdown,
  validation, "Plasează comanda" (preview only — real placement needs the Edge Function).
- **Login-free demo:** `/order-demo`. Throwaway, remove before prod.
- middleware now uses **segment-precise** route matching (`/order` no longer captures
  `/order-demo`); real `/order/[id]` stays protected.

## Customer journey wired into REAL routes (FE, 2026-05-30) — NO demo pages
Demo pages (`/catalog-demo`, `/order-demo`, `/cart-demo`) were REMOVED — features now live
in the actual app, using sample data until backend reads land:
- `/browse` is now **public** (removed from middleware protected list, per "browsing is
  public" rule). Lists `sampleShops` (PIM Copy, PrintHaus) → links to `/shop/[shopId]`.
- `/shop/[shopId]` renders the shop + its catalog as `AddItemCard`s (uses
  `getSampleCatalog()` placeholder; swap for the shop's active `catalog_versions.document`).
- `(customer)/layout.tsx` wraps everything in `<CartProvider>` and shows `<CartBar>` in the
  header — cart persists across customer pages (client state; resets on full reload).
- TODO(BE) markers flag where `sampleShops`/`getSampleCatalog` get replaced by Supabase reads,
  and where cart checkout calls the pricing/placement Edge Function.

## Browse/shop wired to REAL Supabase reads (FE, 2026-05-30) ✅
Seed is live: 3 published shops (PIM Copy 10 items, PrintHaus 16, STEF 13) via
`scripts/seed-db.mjs` + `scripts/seed-to-document.mjs` (seed JSON → catalog `document`).
- **`lib/catalog/shops.ts`** (server-only) = the read layer: `getShops()`, `getShopView(id)`,
  `getShopCatalog(id)` (reads `shops.active_version_id` → `catalog_versions.document` →
  `parseDocument`). Maps DB rows into the `SampleShop` UI shape; `isOpenNow()` from the
  `schedule` jsonb; rating/eta/reviews not in DB yet → undefined (cards degrade gracefully).
- `/browse` now lists DB shops via `getShops()`; `/shop/[shopId]` reads `getShopView` +
  `getShopCatalog` (shopId is the real **uuid** now, not a slug). `sampleShops`/`getSampleCatalog`
  are unused (kept for now; safe to delete later).
- Anon SSR client reads work because shops + active catalog version are public-read by RLS.
- STILL sample/stub: cart **checkout** (needs place-order action), offers sidebar, the
  shop ratings/eta/program (hardcoded DAYS). Next: wire checkout → orders insert.

## Role-based routing (FE, 2026-05-30) — single source of truth = `/`
- **`/` (home)** is an async server component: logged-in → redirect by `profiles.role`
  (`shop` → `/dashboard`, else `/browse`); logged-out → marketing landing (CTA → /browse, /login).
- **Middleware** redirects logged-in users off `/login`/`/register` to **`/`** (NOT /browse),
  so role routing lives in exactly one place. Protected prefixes: `/order /orders /dashboard
  /courier` (segment-precise). `/browse` + `/shop/[id]` are public.
- **`/dashboard` layout** guards `role === 'shop' || role === 'admin'`, else redirects to
  `/browse`. Admin role gets full dashboard access (DB root access already covered by
  `is_admin()` policies). (Catalog page additionally needs a `shop_permissions` row to load.)
- OAuth callback also routes by role (explicit `?next` wins, else role).

## Color swatches on select options (FE, 2026-05-30) — schema EXTENSION
Added an optional **`swatch`** (hex string) to a select option (`fieldOptionSchema`).
Additive + backward-compatible (old documents without it stay valid). Display-only —
NEVER affects pricing/validation (answers still send the option `value` string).
- Builder: `ColorInput` per option in `FieldEditor` (shop sets the colors it stocks).
- Renderer: if ANY option in a single/multi-select has a `swatch`, `ItemOrderForm` renders
  a visual **`SwatchPicker`** (clickable `ColorSwatch`es) instead of radio/checkbox text.
- Example: `samplePrintService` now has a "Culoare hârtie" field (alb/crem/albastru/roz).
- **TODO(BE):** mirror `swatch?` in the Edge Function's document validator so saving/placing
  documents that include it isn't rejected (it's an unknown key to a strict validator).

## Mixed cart — IMPLEMENTED (FE, 2026-05-30)
Cart UX: zero-config items add instantly; configurable items open a modal with the
dynamic form first (matches the "order = mixed cart of N lines" model).
- `lib/catalog/cart.ts` — `CartLine` type, `needsConfiguration(item)` (true if it has
  fields or requires_upload), `buildCartLine(item, answers, fileName)` (freezes total).
- `components/cart/CartContext.tsx` — `<CartProvider>` + `useCart()` (lines/total/add/remove/clear).
  Also tracks `shopId` (single-shop cart; switching shops clears the cart automatically).
- `components/cart/AddItemCard.tsx` — accepts `shopId` prop, passes it to `addLine`.
- `components/cart/CartBar.tsx` — cart indicator + `<Drawer>` with lines, remove, total;
  "Finalizează comanda" opens `<CheckoutModal>` (real flow, not a preview toast).
- `components/cart/CheckoutModal.tsx` — 3-step modal: (1) delivery details + payment method,
  (2) Stripe `<PaymentElement>` for online payments, (3) success screen + redirect to order.
- Sample catalog in `lib/catalog/samples.ts`: `samplePencil` (instant), `sampleNotebook`
  (modal/product), `samplePrintService` (modal/service). **Login-free demo:** `/cart-demo`.

## Stripe + order placement — IMPLEMENTED (2026-05-30)

**No Supabase Edge Functions** — all server logic runs as **Vercel API Routes** (Next.js
App Router route handlers under `web/src/app/api/`). The two deployed Supabase Edge
Functions (`place-order`, `stripe-webhook`) are superseded and unused.

- **`/api/place-order`** (`web/src/app/api/place-order/route.ts`):
  - Requires `Authorization: Bearer <access_token>` (customer must be logged in).
  - Receives `{ shop_id, lines[], fulfilment, delivery_address, contact_phone, notes, payment_method }`.
  - Loads the shop's active catalog version, **reprices every line server-side** (same §7
    algorithm as the client), rejects if client total differs by > 1 cent (tamper-proof).
  - Applies **6% platform fee** on top of subtotal → `total`.
  - Inserts `orders` + `order_items` via the **service role** (clients never insert directly).
  - For `payment_method = 'online'`: creates a Stripe `PaymentIntent` (RON, bani), stores
    `payment_ref = pi.id`, returns `client_secret` to the browser.
  - For cash methods: returns `order_id` + totals only (`client_secret: null`).

- **`/api/stripe-webhook`** (`web/src/app/api/stripe-webhook/route.ts`):
  - `verify_jwt: false` (Stripe calls this, not a user).
  - Verifies `stripe-signature` header with `STRIPE_WEBHOOK_SECRET`.
  - `payment_intent.succeeded` → sets `payment_status='paid'`, `paid_at`, `payment_ref`.
  - `payment_intent.payment_failed` → sets `payment_status='failed'`.

**Stripe keys** (never commit; gitignored in `.env.local`; add to Vercel env vars for prod):
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — client-side (safe to expose).
- `STRIPE_SECRET_KEY` — server-side only.
- `STRIPE_WEBHOOK_SECRET` — from Stripe dashboard webhook endpoint or `stripe listen` CLI.

**To test locally:** `stripe listen --forward-to localhost:3000/api/stripe-webhook` (Stripe
CLI) prints a local `whsec_...` secret — paste into `.env.local` as `STRIPE_WEBHOOK_SECRET`.
Test card: `4242 4242 4242 4242`, any future date, any CVC.

> **WEBHOOK STATUS (2026-05-30):** order placement + intent work, but `payment_status` stays
> `pending` locally because no one's running the webhook listener yet. George can't install
> the Stripe CLI (Xcode CLT too old) → **Alex owns local webhook setup**. Step-by-step in
> **`STRIPE_WEBHOOK_SETUP.md`** (repo root). Open test order pending: `f800bc3c-…7bac9`.

**Platform fee:** 6% (`PLATFORM_FEE_PERCENT = 0.06` in the route handler). Charged on top
of the order subtotal; visible to the customer in `CheckoutModal` as "include taxă platformă 6%".

---

# Catalog & product builder — spec for the UI team

This is the **contract** for the product/service builder (catalog-member side) and the
customer-facing renderer. Build to this convention; the backend renders, validates, and
prices from exactly these shapes. The configurator is intentionally **data-driven and
shop-agnostic** (Storyblok-style): a shop defines arbitrary fields; we never hard-code a
shop's schema. Two job types, **service** and **product**, share one model.

## 1. Versioned catalog (saving / publishing)

- A shop's catalog is a series of **immutable version snapshots** (`catalog_versions`),
  each holding the whole catalog as one JSON `document`.
- `shops.active_version_id` points at the **live** version (what customers see).
- Editing happens on a **draft**; publishing/switching just moves the pointer; reverting =
  point back at an older version. We keep the **last 10** versions per shop.
- **Permissions:** create/edit drafts and publish/switch/revert = role **`catalog` or
  `owner`** (`staff` cannot). Enforced by RLS + the RPC functions below.
- **Builder UI flow (RPCs):**
  - *Edit catalog* → `create_catalog_draft(shop_id, label?)` → clones the live version into
    a new `draft`; returns the row. Edit that draft's `document` (normal `update`).
  - *Publish / Make live / Revert to vN* → `set_active_catalog_version(version_id)`.
  - *Version history* → select `catalog_versions` for the shop (members read all); show
    `version, label, status, created_by, created_at`; offer switch/revert.
- Customers (incl. logged-out `anon`) can read **only** the active version's `document`.

## 2. Document structure

```jsonc
{
  "schema_version": 1,
  "categories": [ /* nested, per-shop — see below */ ],
  "items": [ /* ordered Items */ ]
}
```

**Categories (nested, per-shop, in the document).** A flat list with `parent_id`
(adjacency list → arbitrary nesting, easy to move/reorder). Items reference one via
`category_id`. Versioned with everything else, so revert restores categories + items
together.
```jsonc
"categories": [
  { "id": "cat_print",  "name": "Printare",          "parent_id": null,        "sort_order": 0 },
  { "id": "cat_thesis", "name": "Lucrări de licență", "parent_id": "cat_print", "sort_order": 0 },
  { "id": "cat_paper",  "name": "Papetărie",           "parent_id": null,        "sort_order": 1 }
]
```
The UI builds the tree from `parent_id`. (Per-shop only for now — a global cross-shop
taxonomy would be a separate shared table, deferred.)

## 3. Item

```jsonc
{
  "id": "uuid",               // stable across versions — KEEP the same id when editing an item
  "kind": "service" | "product",
  "title": "Listare lucrare de licență",
  "description": "…",         // nullable
  "image_path": "shops/<id>/items/<file>",   // storage path (not URL), nullable
  "is_active": true,
  "sort_order": 0,
  "base_price": 0,            // RON; part of the line base (see §7)
  "category_id": null,        // optional → a category id from document.categories
  "stock_display": "none",    // "none" | "in_out" | "exact"   (Phase 2 / inventory)
  "inventory_item_id": null,  // PRODUCT only, 1:1 link            (Phase 2 / inventory)
  "fields": [ /* ordered Fields — the configurator */ ]
}
```

- **No fixed `requires_upload` flag** — expected inputs are just fields: a `file` field for a
  PDF/image/doc, a `text` field for a note. The shop configures exactly what it needs (§4).
- **product** = simple good: typically one `number` field flagged `is_quantity` (the qty),
  1:1 `inventory_item_id`.
- **service** = configurable job: `fields` define the config (incl. any `file`/`text`
  inputs); may consume **several** inventory items based on choices (Phase 2 `consumes`).

## 4. Field — render by `type`

```jsonc
{
  "key": "binding",      // unique within the item; [a-z0-9_]; machine-stable
  "label": "Legătorie",  // customer-facing
  "type": "single_select" | "multi_select" | "boolean" | "number" | "text" | "file",
  "required": false,     // see per-type meaning below
  "help": null,          // optional hint
  "default": null        // optional prefill
}
```

| `type` | UI control | answer value | priced via |
|---|---|---|---|
| `single_select` | radio / dropdown | chosen `value` (string) | chosen option's `price` |
| `multi_select` | checkbox group | `value`s (string[]) | Σ chosen options' `price` |
| `boolean` | switch / checkbox | `true`/`false` | field `price` when `true` |
| `number` | number input | number | field `price` (usually `per_unit`); may be the `is_quantity` multiplier |
| `text` | text input | string | never priced |
| `file` | file upload | storage path (string) | never priced |

- **single_/multi_select** add:
  ```jsonc
  "options": [
    { "value": "spiral", "label": "Spiră", "price": { "mode":"additive", "amount":10 },
      "default": false, "locked": false }
  ],
  "min_select": 0,   // multi_select only — 0 = optional, ≥1 = mandatory count
  "max_select": null // multi_select only — null = unlimited
  ```
- **number** adds: `"min":1, "max":null, "step":1, "unit":"pagini"`, optional `"price"`, and
  optional **`"is_quantity": true`** — at most ONE per item; it multiplies the whole line (§7).
- **boolean** adds optional `"price"` (applied when `true`).
- **file** (configurable expected input — the shop picks what it accepts) adds:
  ```jsonc
  "accept": ["documents", ".jpg", ".png"],  // named groups AND/OR explicit extensions/mime
  "max_size_mb": 20
  ```
  **Named groups** resolve to extension/mime sets (client + server), so a shop can pick a
  broad category or specific types:
  - `images` = jpg, jpeg, png, webp · `documents` = pdf, doc, docx, txt, odt · `pdf` = pdf only
  - (extensible — groups defined in one shared place); explicit `.docx` / `image/*` also allowed.
  The file uploads to the private bucket; the **answer is its storage path**.

### Mandatory vs optional
- `required:true` on `single_select`/`number` → must be answered.
- `multi_select` → governed by `min_select` / `max_select`.
- option `default:true` → pre-selected but changeable; `locked:true` → pre-selected and
  **cannot** be deselected (render checked + disabled; always counts toward price/consume).

## 5. PriceRule

```jsonc
{ "mode": "additive", "amount": 10 }                  // +10 RON once
{ "mode": "per_unit", "amount": 1.0, "per": "pages" }  // +1.0 RON × answers.pages
```
- `per` = `key` of a `number` field in the same item. A `number` field's *own* price
  defaults `per` to that field's value. Prices are RON, 2 decimals.

## 6. Answer shape (customer submission; frozen onto the order)

Keyed by field `key`:
```jsonc
{ "pages": 100, "print": "color", "finishing": ["lamination"], "rush": true, "note": "…" }
```
single_select→string · multi_select→string[] · boolean→bool · number→number · text→string.

## 7. Pricing algorithm (authoritative; client mirrors it for live preview)

```
quantity = answers[the field flagged is_quantity]   (or 1 if none)
addons   = Σ over every NON-quantity field, by type:
  single_select : answered ? resolve(chosenOption.price) : 0
  multi_select  : Σ resolve(option.price) over selected
  boolean       : value === true ? resolve(field.price) : 0
  number        : resolve(field.price)        // per defaults to this field's own value
  text, file    : 0
line_total = quantity × (base_price + addons)
resolve(additive)       = amount
resolve(per_unit, per)  = amount × answers[per]
round half-up to 2 decimals at the end.
```
- The **`is_quantity` number field multiplies the whole line** (e.g. `copies`) — it is NOT in
  the addon sum, it's the multiplier. At most one per item; default `quantity = 1`.
- A `per_unit` price adds *within* one unit (e.g. `pages × 0.25`); the assembled unit then
  scales by `quantity`. **No other conditional/branching pricing.**
- **Server is the source of truth.** The client computes the same formula for live preview,
  but the order total is recomputed server-side at placement; mismatch → reject.

## 8. Validation (server + mirror on client)

- `required` single_select/number answered; multi_select count ∈ [min_select, max_select].
- every selected value ∈ that field's option `value`s; all `locked` options present.
- number ∈ [min, max] honoring `step`.
- at most ONE field per item has `is_quantity: true`; its answer ≥ its `min` (≥1).
- `file` answer is a storage path whose object exists, whose type ∈ the field's resolved
  `accept`, and whose size ≤ `max_size_mb`.
- **categories:** each `category.parent_id` references an existing category, no cycles; every
  item `category_id` (if set) references an existing category.
- every `per` (and Phase-2 `qty_per`) references an existing `number` field key.
- unknown answer keys rejected; malformed `document` rejected on save.

## 9. Worked example (service)

```jsonc
{ "kind":"service", "title":"Listare licență", "base_price":0,
  "fields":[
    {"key":"pages","label":"Pagini","type":"number","required":true,"min":1,"unit":"pag",
     "price":{"mode":"per_unit","amount":0.25}},
    {"key":"copies","label":"Exemplare","type":"number","required":true,"min":1,
     "default":1,"is_quantity":true},
    {"key":"file","label":"Document PDF","type":"file","required":true,"accept":["pdf"]},
    {"key":"print","label":"Tipar","type":"single_select","required":true,"options":[
      {"value":"bw","label":"Alb-negru","price":{"mode":"additive","amount":0}},
      {"value":"color","label":"Color","price":{"mode":"per_unit","amount":1.0,"per":"pages"}}]},
    {"key":"binding","label":"Legătorie","type":"single_select","required":true,"options":[
      {"value":"none","label":"Fără","price":{"mode":"additive","amount":0}},
      {"value":"spiral","label":"Spiră","price":{"mode":"additive","amount":10}}]}
  ]}
// answers {pages:100, copies:2, print:"color", binding:"spiral", file:"order-files/…"}
//   addons = 25 (pages) + 100 (color) + 10 (spiral) = 135 ; line = 2 × (0 + 135) = 270 RON
```

## 10. Product pattern

```jsonc
{ "kind":"product", "title":"Pix Pilot", "base_price":5,
  "inventory_item_id":"…", "stock_display":"in_out",
  "fields":[ {"key":"quantity","label":"Cantitate","type":"number","required":true,
              "min":1,"default":1,"is_quantity":true} ] }
// answers {quantity:3} → 3 × (5 + 0) = 15 RON; decrements its inventory item by 3 (Phase 2).
```

## 11. Phase 2 — inventory (designed, NOT built yet)

When `inventory_items` lands, the `document` gains these **additively** (no migration —
it's JSONB; old documents without them stay valid):
- **product** items: `inventory_item_id` — **1:1** with an inventory item. Ordering qty N
  decrements that item by N.
- **service** items: options/fields may declare a **`consumes`** list (bill-of-materials),
  exactly parallel to `price`:
  ```jsonc
  "consumes": [
    { "inventory_item_id":"…", "qty": 1 },            // fixed: 1 spiral if this option chosen
    { "inventory_item_id":"…", "qty_per": "pages" }   // per-unit: 1 sheet per page
  ]
  ```
  So a service can consume **multiple** inventory items depending on the customer's choices.
- **At placement:** accumulate required qty per inventory item across the frozen answers,
  then decrement atomically. **Hard-block** if any *tracked* item is short
  (`stock` NULL = untracked → skipped). `stock_display` controls customer visibility
  (`none` / `in_out` / `exact`).

The builder UI can ignore Phase 2 until the table exists — the document shape is
forward-compatible.

---

# Pricing, orders & offers — decided approach

## Pricing/validation lives in an Edge Function, NOT the DB

- The authoritative price engine is a **Supabase Edge Function** (Deno — the project's one
  real custom server piece, alongside the WhatsApp ping). We deliberately do **not** compute
  price in Postgres.
- **Order placement flow:** the client sends the cart payload (line items + `answers` per
  item + the client-computed total). The function **recomputes** the price from the live
  catalog `document` (+ active offers), **validates** answers against the schema (§8 of the
  builder spec), and:
  - matches & valid → it **inserts the order** (service role) and returns it;
  - mismatch or invalid → **reject**, no order.
- The client still computes a price for live preview (same algorithm, §7), but it is never
  trusted.

## Orders = mixed cart, inserted only by the Edge Function (migration 4, applied)

- One **`orders`** row + N **`order_items`** lines, each a `service` or `product`, each
  **freezing** `kind, item_id (stable), item_title, quantity, answers (jsonb),
  price_breakdown (jsonb), line_total`. Uploaded files live as storage paths *inside*
  `answers` (the `file` fields). Instance copies values — a placed order never changes when
  the catalog does. `orders.catalog_version_id` records which version it was placed off.
- **RLS:** customer `select`s own; shop members `select`/`update` their shop's; **no client
  `insert`** — only the Edge Function (service role) writes orders/items (tamper-proof).
  `staff`+ (any member) advances status.
- **Status:** `pending → accepted | rejected → in_progress → done`. `completed_at` is set
  (trigger) when it hits `done` or `rejected`; a **`pg_cron`** hourly job sets `archived_at`
  ~1 day after `completed_at` (archived is a timestamp, NOT a status — the done/rejected
  outcome is preserved). Active board = `archived_at is null`.
- **Payment:** `payment_method` (`cash_in_store | cash_on_delivery | online`),
  `payment_status` (`pending | paid | failed | refunded`), `payment_ref` (Stripe id, online),
  `paid_at`. Online = Edge Fn creates the Stripe intent + webhook marks paid; cash = shop
  marks paid at handover. Stripe wiring is server-side, later (like the WhatsApp ping).
- **Uploads:** private `order-files` bucket, customer own-folder (`order-files/{uid}/…`);
  shops read via server-generated signed URLs.

## Offers — banner + cart-level promotions (separate from the catalog version)

Offers are a **live** table (not part of `catalog_versions`). Two faces:
- **Banner:** a catalog-configurable promo display (title/description + a show toggle).
- **Promotions:** multiple **types** — percent off, fixed amount off, buy-X-get-Y, … —
  with a **scope** (per product/item or per whole order), applied at **cart level** by the
  Edge Function. Stored flexibly as `type` + `config jsonb` (same data-driven spirit as the
  configurator), plus an active window. `catalog`+ manage; public reads active offers.

## Reviews (migration 6, applied)

- **`reviews`** target one of three things via `target_type` + `target_id`: **`shop`**
  (shop id), **`employee`** (the `profiles.id` who handled the order), **`item`** (a catalog
  item's stable id — service or product). `rating` 1–5 **required**, `comment` optional.
- **Verified-purchase only** (enforced in RLS): the author must have a **`done`** order from
  that shop whose `order_id` justifies the target — the shop itself, the order's `handled_by`
  employee, or an `order_items` line. One review per `(author, shop, target)`.
- **Immutable** — no edit; the author may **delete (retract)** their own. Public read.
- **`orders.handled_by`** (new column) records the shop member who took the order; a member
  sets it via the existing orders update (it's what employee reviews point at).
- **`review_replies`** — shop **`staff`+** members reply to a review (public read; author may
  delete own). Customers don't reply.

## Inventory — deferred (Phase 2)

No inventory tables yet. We add `inventory_items` + the `consumes`/`inventory_item_id`
wiring (builder spec §11) **after the product POC** is finished.

## Admin role — root access (migrations 7–8)

Reverses the original "admin = dashboard only, not in the enum" line under "Roles".

- **`user_role` now includes `admin`** (`customer | shop | admin`). Admins are the project's
  trusted operators (the app-level equivalent of the Supabase collaborators).
- **`is_admin()`** (SECURITY DEFINER) checks `profiles.role = 'admin'` for the caller.
- **Root access everywhere:** every public table **and** `storage.objects` has a permissive
  `"<t>_admin_all" FOR ALL USING (is_admin()) WITH CHECK (is_admin())` policy. Permissive
  policies OR together, so an admin bypasses all ownership/role/status gating and can
  read/insert/update/delete anything (incl. inserting orders directly, editing any catalog
  version, any shop, etc.).
- **Who's admin:** set `profiles.role='admin'`. Currently **George**
  (`georgecodefy@gmail.com`) and **Alex** (`alex.m.amarandei@gmail.com`). Ioana once she has
  an auth account.

# Backend architecture (Vercel + Supabase)

We host the Next.js app on **Vercel**. "Backend" = three layers:

1. **Supabase (managed)** — Postgres + RLS (the real authz layer), Auth, Storage, Realtime.
   Clients talk to it directly for anything that's read/write-your-own-stuff.
2. **Next.js on Vercel** — UI **plus** our custom server logic (serverless functions):
   **Server Actions** for UI-driven mutations, **Route Handlers** (`app/api/*`) for
   webhooks / external callers.
3. **Client** — browse, auth, chat (Realtime), file upload → straight to Supabase, RLS-gated.

**No separate Supabase Edge Function** (supersedes the earlier note): custom logic lives in
`web/` so the client preview and the server share one TypeScript pricing module.

### Server Actions vs Route Handlers
- **Server Actions** (`'use server'`, called from components/forms): internal, UI-driven
  mutations with `revalidatePath`. Use for `placeOrder`, `acceptOrder`/advance status, set
  `handled_by`, `postReview`, publish/revert catalog.
- **Route Handlers** (stable public URL, own the raw Request/Response): anything external —
  **Stripe webhook** (`/api/stripe/webhook`, raw-body signature verify), future Supabase
  DB-webhook → WhatsApp, signed-URL endpoints, health checks.
- **Security is identical & mandatory in both:** args/bodies are untrusted → check
  `auth.uid()`, validate with zod, and **recompute price server-side**. The
  **`service_role`** Supabase client is created *inside* the action/handler only (never
  shipped to the browser); it's what lets the server insert orders (clients can't) and mint
  signed URLs.

### What runs where
- **Place order** → Server Action: recompute from the live catalog `document` (+ offers
  later), validate answers (§8), insert `orders`/`order_items` with service role.
- **Stripe** (online payments, building now) → Route Handler creates the PaymentIntent +
  `/api/stripe/webhook` flips `payment_status`→`paid`, sets `payment_ref`/`paid_at`. Secrets
  are Vercel server env only.
- **WhatsApp** (later) → server-side on accept (Server Action or DB-webhook→Route Handler).
- **Archive** → Supabase `pg_cron` (already built).

### Shared pricing/validation module
`web/src/lib/catalog/{pricing,answers}.ts` — **pure TS, no React / no server-only imports**
so it runs in both the browser (live preview) and the server (authoritative). Single source
of truth for the §7 formula and §8 validation. (`server/` folder was dropped.)

### Secrets / env
- Client: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public).
- Server-only on Vercel: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET` (and WhatsApp creds later). Never `NEXT_PUBLIC_`.

---

# Design system v2 — "Slate · Ink · Ember" (FE, append-only)

> Visual system rebuilt from the bit.cloud prototype ("Design preview v2"). Live
> reference page at **`/design`** — render it to see palette + components in-app.
> 100% Mantine (theme tokens + component compositions), **no custom CSS / no className
> utilities** (per the Mantine convention above).

## Palette → `web/src/lib/theme.ts`
Seven 10-shade Mantine ramps (0 = lightest, 9 = darkest). Reference by index, e.g. `c="slate.6"`:
- **`brand`** = Ember — CTAs & primary. Vibrant base at **shade 6** (`#e77023`); `primaryColor:"brand"`, `primaryShade:6`, `autoContrast:true`.
- **`slate`** / **`ink`** — structural blue / darkest charcoal (headings, dark bands, gradients, "Dark"/"Acceptă-dark" buttons).
- **`teal`** — success / Deschis / Acceptată / online. **`cyan`** — info / În pregătire.
- **`mist`** / **`stone`** — muted blue-grey / pure neutral (text, borders, surfaces).
- Tokens: radius `{xs4 sm6 md8 lg12 xl16}` (button=md, card=lg, banner=xl); spacing `{xs8 sm12 md16 lg24 xl32}`; font Inter.
- **Component defaults** live in `theme.components` as **plain objects** (`{ defaultProps, styles }`),
  NOT `Component.extend()` — importing Mantine client components into this server-imported
  module breaks under the App Router (`X.extend is not a function`). Badge is set to normal-case.

## Status tokens → `web/src/lib/design/status.ts`
`ORDER_STATUS` maps the DB enum `order_status` (`pending|accepted|rejected|in_progress|done`)
→ Romanian label + palette colour: pending=brand · accepted=teal · in_progress=cyan ("În pregătire")
· done=mist ("Finalizată") · rejected=red. Use `<StatusBadge status={...}/>` everywhere — don't hardcode.

## Shared components → `web/src/components/ui/`
`Dot`, `StatusBadge`, `OpenBadge`, `SectionHeader`, `EmptyState`, `StatCard` (all pure → usable
in Server Components). More composites (ShopCard, PriceSummary, ChatPanel, StatusTimeline,
field renderers) added as pages are built.

## Scope decisions for the UI rebuild (agreed)
- **Field types = our 5 model types only** (`single_select | multi_select | boolean | number | text`).
  The prototype's "image-choice" (A4/A3/A5) and "color-picker" are just **`single_select` with
  shop-defined enum options** rendered richly — not new types. The catalog/schema builder is where
  shops define those enums.
- **Payments (Stripe/card/cash/TVA/factură) + delivery tracking (ETA, "Livrată" step) = visual-only**
  for now (Stripe integration planned → keep the designs).

## Gotcha: next/font + Mantine font var
next/font's `--font-geist-sans` must be exposed on **`<html>`** (not only `<body>`), else Mantine's
`--mantine-font-family` (defined at `:root`) can't resolve the `var()` and the whole app falls back
to serif. Fixed in `layout.tsx` (`className={inter.variable}` on `<html>`).

## Gotcha: Mantine compound components + `.extend` in Server Components
Under the App Router, importing a Mantine **client** component into a Server Component gives a
client-reference proxy — its statics/sub-components are `undefined`. So:
- `Component.extend()` in `theme.ts` → use plain config objects instead (already done).
- Compound APIs (`Tabs.List/Tab/Panel`, `Accordion.Item`, `Menu.Target`, etc.) → wrap that JSX in a
  small `"use client"` component (e.g. `components/shop/ShopCatalogTabs.tsx`). Symptom if you forget:
  500 "Element type is invalid… got undefined".

## Customer pages — design pass (done so far, logic preserved)
Restyled to the prototype, keeping existing logic/data (`sampleShops`, `getSampleCatalog`,
`AddItemCard` → `ItemOrderForm` modal, cart, role-redirect):
- **`/` landing** — hero (ember accent headline, dual CTA, stats, order-preview card) + "cum funcționează". Redirects logged-in users by role (unchanged).
- **`/browse`** — welcome band (greets by profile name), visual filter chips, `ShopCard` grid.
- **`/shop/[shopId]`** — banner + overlapping header card, weekly program, catalog tabs, promo sidebar.
- New shared: `components/shop/ShopCard.tsx`, `category.ts`, `ShopCatalogTabs.tsx`; `SampleShop` extended with optional display fields (rating/eta/tags/isOpen/category — placeholder until BE).

## Heads-up: Stripe key missing locally
`CheckoutModal` calls `loadStripe(NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)` eagerly → throws
"Expected publishable key… got undefined" (the dev "1 Issue" badge) when the cart mounts and the
key isn't in `.env.local`. Harmless to rendering; set the key locally to silence it.

## Catalog builder — categories + drag-drop (FE, 2026-05-30)
- **Document schema gained categories (§2):** `catalogDocumentSchema` now has `categories: Category[]`
  (`{id,name,parent_id,sort_order}`, flat for now) and each item has `category_id` (nullable). Both
  **additive with defaults** — old documents parse unchanged. **TODO(BE):** mirror `categories` +
  `category_id` (and the earlier `swatch`) in any server-side document validator so saving isn't rejected.
- **Builder UX reconfigured** (`CatalogBuilder`/`ItemCard`/`FieldEditor`): items & fields are now
  **collapsible** (compact summary row → click to expand) and **drag-reorderable** via **dnd-kit**
  (`@dnd-kit/core|sortable|utilities`) with grip handles — the old up/down arrows are gone. A
  `Categorii` manager (add/rename/delete) sits at the top; each item has a "Categorie (opțional)" select.
- **Gotcha fixed:** nested Mantine `Collapse` (item-Collapse containing field-Collapses) mis-measures
  height and opens to 0px → looked like "expand doesn't work". Use plain conditional render (`{open && …}`)
  for nested expandables, not `Collapse`.

## Catalog — per-item accepted file types (FE, 2026-05-31)
- `itemSchema` gained **`accepted_file_types: FileTypeKey[]`** (`pdf | word | excel | image | csv`),
  default `["pdf"]` (backward-compatible). The shop picks them in the builder when "Necesită fișier
  atașat" is on; the customer upload's `accept` + validation come from this list
  (`lib/catalog/fileTypes.ts` → `acceptAttr` / `acceptedLabel` / `fileAllowed`). Replaces the old
  hardcoded PDF-only upload. **TODO(BE):** allow these MIME/extensions in the `order-files` bucket and
  mirror the check in server-side answer validation (§8).

---

# Pages — full FE inventory (design pass complete, append-only)

> Every page below is built to the design system v2 with **existing logic preserved** (data fetches,
> cart, pricing, checkout, catalog RPCs). Placeholder data is clearly sample/`TODO(BE)`. Romanian UI.
> All counts use `roCount(n, singular, plural)` from `lib/utils/format.ts` (1→sg, 2–19→pl, ≥20→"de"+pl).

## Customer
- **`/` landing** (`app/page.tsx`) — hero (ember-accent headline, badge, dual CTA, stats, floating
  order-preview card) + "Trei pași" steps. Logged-in users redirect by role (`shop`→/dashboard, else /browse).
- **`/browse`** — dark welcome band (greets by profile name, "N magazine sunt deschise"), visual filter
  chips, `ShopCard` grid. **Reads real shops via `getShops()`** (BE-wired).
- **`/shop/[shopId]`** — banner + overlapping header card, weekly `ShopSchedule`, catalog tabs
  (`ShopCatalogTabs`), promo sidebar. Reads `getShopView`/`getShopCatalog`.
- **Configurator** = `AddItemCard` (catalog item card) → modal with `ItemOrderForm`: 5 field types as
  radio-cards/swatch-picker/stepper/switch/textarea, live price, **sticky Total+CTA footer**, errors only
  after first submit, file-cancel doesn't clear. Bold modal title + `padding="xl"`.
- **Cart** = header `CartBar` → right `Drawer` (icon-tile lines, Subtotal/Livrare/Total card, CTA + empty
  state) → `CheckoutModal` (3 steps: card-style fulfilment + payment selects, Stripe `PaymentElement`,
  success). **No platform-fee line**; "Numerar la magazin" only on pickup.
- **`/orders`** — KPI strip + `OrdersTable` (filter tabs, status pills, ETA, clickable rows).
- **`/order/[orderId]`** — `StatusTimeline` + frozen line items + PDF link + totals + `ChatPanel`
  (customer perspective).

## Shop dashboard (`/dashboard/*`, layout guards `role shop|admin`; sidebar `DashboardNav`)
- **`/dashboard`** — greeting + date, 4 `StatCard`s, `RevenueBars` (CSS bar chart), Top servicii,
  `ShopOrderQueue` (inline Acceptă/Respinge/advance, tabs).
- **`/dashboard/orders`** — full `ShopOrderQueue`; rows link to detail.
- **`/dashboard/orders/[orderId]`** — shop order detail: status actions (`ShopOrderActions`), status
  timeline, frozen config per line, **Fișiere atașate + Descarcă** (`DownloadButton`, TODO(BE) signed
  URLs), client notes, Client&livrare sidebar, `ChatPanel` (shop perspective), **prev/next arrows** top-right.
- **`/dashboard/products`** — product grid; **`/dashboard/products/new`** + **`/[productId]/edit`** =
  `ProductEditor` (general details + live preview).
- **`/dashboard/offers`** — `OffersManager`: banner editor w/ live preview + promotions list (type/status/
  code badges + toggles).
- **`/dashboard/profile`** — `ProfileEditor`: banner/logo, info form, per-day hours, completeness sidebar.
- **`/dashboard/services`** — `CatalogBuilder` (real Supabase draft/publish). Items & fields **collapsible**
  + **drag-reorder (dnd-kit)**; **categories as droppable sections** — drag items between sections to set
  `category_id`; no-shop state uses `EmptyState`.

## Component locations
`components/ui/` (StatusBadge, OpenBadge, Dot, SectionHeader, EmptyState, StatCard) ·
`components/shop/` (ShopCard, category.ts, ShopCatalogTabs, ShopSchedule) ·
`components/order/` (StatusTimeline, ChatPanel[`perspective` prop], OrdersTable, ShopOrderActions, DownloadButton) ·
`components/dashboard/` (DashboardNav, RevenueBars, ShopOrderQueue, OffersManager, ProfileEditor, ProductEditor) ·
`components/catalog/` (CatalogBuilder, ItemCard, FieldEditor, PriceRuleInput) · `components/cart/` (CartBar, CheckoutModal, AddItemCard).
Sample data: `lib/orders/sample.ts` (orders incl. customer/contact/notes/fulfilment), `lib/catalog/samples.ts`.

## Dev notes
- **Toasts** moved to `bottom-right` + `closeButton` (were covering the header).
- **Screenshot quirk:** `/dashboard/*` (and `/browse` since it does a live Supabase read) never reach
  network-idle, so the Chrome screenshot tool times out — verify those via DOM inspection, not screenshots.
- **Aligning an image tile beside a labelled input:** the input label adds ~22px above the field; offset
  the tile column (`mt`) so the tile top meets the input box, not the column top.

## Orders + status + profile wired to REAL Supabase (FE, 2026-05-31) ✅
The customer order pages, the shop order queue/detail, and the shop profile editor now read/write
real data (no more `sampleOrders` on these). `lib/orders/sample.ts` is kept only for `/design`-style
references; the live pages no longer import it.
- **`lib/orders/queries.ts`** (server-only) = read layer, maps DB rows → the existing `SampleOrder`
  UI shape so components were untouched:
  - `getMyOrders()` — the customer's own orders (RLS own) → `/orders` list.
  - `getOrderDetail(id)` — one order + `order_items` + `messages` + shop name + customer name +
    config summary (loads `catalog_versions.document` by `orders.catalog_version_id` to turn frozen
    `answers` into human labels). Used by BOTH `/order/[id]` (customer) and
    `/dashboard/orders/[id]` (shop); RLS authorizes who can read it.
  - `getShopOrders()` / `getMyShop()` — resolve the caller's shop via `shop_permissions`, then read
    that shop's orders / storefront fields. Drive the dashboard queue + greeting + profile editor.
- **Server Actions** (the only writes):
  - `lib/orders/actions.ts → advanceOrderStatus(orderId, status)` — accept/reject/in_progress/done;
    stamps `handled_by = auth.uid()` on accept; `revalidatePath`. RLS = shop staff+.
    `ShopOrderQueue` + `ShopOrderActions` call it with optimistic update + rollback-on-error.
  - `lib/shop/actions.ts → updateShopProfile(shopId, {name,description,phone,address})` — owner-only
    by RLS. `ProfileEditor` is now controlled + has a "Salvează modificările" button.
  - `ShopProfileInput` lives in `lib/shop/types.ts` (NOT the `"use server"` file — those may only
    export async functions).
- Order **id is a uuid** → displayed short (`id.slice(0,8)`) everywhere (lists, headers, toasts).
- `delivery` shown on order detail = `total − subtotal` (the 6% platform fee; there is no delivery-fee
  column).

### BE gaps surfaced by this integration (FE features with NO backend support yet)
These stay as **visual placeholders** until BE lands them (per product decision 2026-05-31):
1. **Uploaded files aren't persisted.** `/api/place-order` receives `fileName` per line but does NOT
   store it in `order_items` (answers/price_breakdown/line_total only). So order detail shows no
   "Fișiere atașate" and no per-line PDF chip. → BE: persist the storage path in the `file` answer +
   mint signed URLs for the shop to download.
2. **No ETA** on orders → the "ETA …" text + StatusTimeline eta are omitted for real orders.
3. **No revenue/stats aggregation** → dashboard "Venit azi / ultimele 7 zile", "Top servicii",
   RevenueBars, and customer "Economisit cu promoții / Livrare medie" are hardcoded sample numbers.
4. **Customer name visibility for shops** depends on `profiles` RLS. If a shop member can't read the
   buyer's `profiles.full_name`, the queue/detail fall back to "Client". → BE: confirm/allow shops to
   read the names of customers who ordered from them.
5. **Shop profile**: only `name/description/phone/address` save. `schedule` (jsonb weekly hours),
   logo/banner upload, "Tip activitate", and email are visual-only (no columns / not wired).
6. **Chat is read-only** in this pass (existing `messages` are displayed; no realtime send) — chat was
   intentionally excluded from this integration round.
7. **Admins with no `shop_permissions` row** see an empty dashboard queue (reads are membership-scoped,
   not `is_admin()`-scoped). A demo shop login must be an actual shop member.

## Products wired to the REAL catalog document (FE, 2026-05-31) ✅
`/dashboard/products` + new/edit no longer use `sampleCatalog`. Products are catalog `items`
with `kind === "product"` inside the same versioned `catalog_versions.document` as services.
- **`lib/catalog/products.ts`** (server-only): `getShopProducts()` / `getShopProduct(id)` —
  resolve the caller's shop via `shop_permissions`, then read the **latest DRAFT if one exists**
  (so unpublished edits are visible in the dashboard), else the **active** version's document;
  filter `kind === "product"`.
- **`lib/catalog/api.ts → saveProductToDraft(shopId, {id?,name,description,basePrice,inStock})`**
  (client): `getOrCreateDraft` → upsert the product item into `document.items` (preserving all
  other items + the product's own config fields) → `saveDraftDocument`. **Does NOT publish** —
  same draft→publish model as the builder; the shop publishes from `/dashboard/services` (Catalog).
  The save toast says so ("…publică din Catalog pentru a-l face vizibil").
- `ProductEditor` now takes `shopId` + optional `productId`, persists via the helper (loading +
  error toast), then `router.push + refresh`. Pages show `EmptyState` when the user has no shop.
- **Still not persisted by the simple editor:** SKU + unit (cosmetic — no schema column / the
  simple editor doesn't manage `number`/`is_quantity` fields), and image upload. Configurable
  products (with `fields`) also list here; editing them via this simple form preserves their fields.

## Responsive / mobile pass — dashboard (FE, 2026-05-31) ✅
Made the shop dashboard area usable on phones (was: 6 stacked nav links atop every page;
order-detail client+chat invisible on mobile; cramped fixed-width input/queue rows).
- **`components/dashboard/MobileNav.tsx`** (new, client) — mobile sticky top bar with a
  **Burger → Drawer** nav (replaces the always-expanded vertical `DashboardNav` in the mobile
  bar). Drawer auto-closes on route change + on link click (`DashboardNav` gained an optional
  `onNavigate` cb). Desktop fixed sidebar (`visibleFrom md`) is unchanged.
- **`/dashboard/orders/[orderId]`** — the "Client & livrare" card + `ChatPanel` were
  `visibleFrom md` with NO mobile fallback (invisible on phones). Extracted to a `sidebar`
  const, rendered in the desktop side column AND stacked below the main content on mobile
  (`hiddenFrom md`). (Customer `/order/[id]` already had a mobile chat fallback.)
- **`ShopOrderQueue`** rows — were one `nowrap` row packing total+status+2 buttons (overflowed
  on phones). Now: desktop unchanged (status+actions inline, `visibleFrom sm`); on mobile a
  second row carries `StatusBadge` + the action buttons (`hiddenFrom sm`).
- **`ProductEditor`** — the 3-up Preț/Unitate/SKU `Group grow` → `SimpleGrid cols={{base:1,sm:3}}`.
- **`ProfileEditor`** — info `Group grow` rows → `SimpleGrid cols={{base:1,sm:2}}`; schedule rows
  now `wrap` (time inputs + badge drop below the day/switch on narrow screens).
- **`ShopOrderActions`** (detail header) — `wrap="wrap"` so buttons reflow.
- Verified via production build (all routes compile, dynamic). NOTE: true mobile-viewport
  rendering couldn't be exercised in-tool — the remote Chrome renders at a fixed 1440 viewport
  and `/dashboard/*` never reaches network-idle (screenshots/JS eval hang). Desktop confirmed
  clean (sidebar visible, no horizontal overflow).

## Live chat — WIRED to Supabase Realtime (FE/BE, 2026-05-31) ✅

Closes the "TODO(BE): wire to Supabase Realtime on the messages table" — the mandatory
per-order chat is now real (was presentational, local-state only).
- **Client-side, no server action** (matches migration 5's design: participants `insert`
  directly under RLS, Realtime delivers). `components/order/ChatPanel.tsx`:
  - History is server-rendered via `getOrderDetail()` into `initialMessages`.
  - Sending does `supabase.from("messages").insert({order_id, sender_id, body}).select()`
    (browser client) → optimistic append, then dedups the Realtime echo by row `id`.
  - Subscribes to `postgres_changes` INSERT filtered `order_id=eq.<id>` on a per-order
    channel; RLS scopes delivery to participants (customer + shop members). Auto-scrolls.
  - Incoming rows are classified into customer/shop **sides** via the order's `customerId`
    (sender === customer → customer, else shop). Input is **disabled** when the order is
    `done`/`rejected` (the insert RLS policy blocks posting on closed orders anyway).
- **Props now required:** `orderId`, `currentUserId` (logged-in profile id = sender), and
  `customerId`. Both detail pages (`(customer)/order/[orderId]`, `dashboard/orders/[orderId]`)
  fetch the user server-side and pass these + `disabled`.
- `getOrderDetail()` now also returns `customerId`; `SampleOrder` gained `customerId?`.
- Verified: `tsc --noEmit` clean + production build compiles both order routes. Full
  2-party live delivery needs a logged-in customer+shop session to exercise end-to-end.

## Offers + money model — SCHEMA DEPLOYED (migration `offers_and_money`, 2026-05-31)

Applied ledger: `…004033 offers_and_money`, `…004114 offers_offer_is_live_search_path`.
This is the **contract** the customer (C2) and shop (C3) lanes build against. The discount
**engine** (`lib/catalog/offers.ts`) + API + place-order rewrite land next — schema first.

### `offers` table (one table, two faces — banner is DERIVED, not stored)
An offer = a **function applied to the cart**. Columns:
`id, shop_id, name (shown by the strikethrough), description (advert copy), type, scope,
target_id, trigger, code, config jsonb, stackable, starts_at, ends_at, active, created_by`.
- **Enums:** `offer_type` = `percent | fixed | bxgy | free_shipping` · `offer_scope` =
  `product | category | cart` · `offer_trigger` = `automatic | code`.
- **`config` jsonb by type:** percent `{ "percent": 10 }` · fixed `{ "amount": 10 }` ·
  bxgy `{ "buy": 2, "get": 1 }` · free_shipping `{}`.
- **`target_id`** = a product (item) id or category id **from the active catalog `document`**
  (not an FK — same frozen-id spirit as orders). `cart` scope → `target_id` null.
- **CHECK guards (DB-enforced):** free_shipping ⇒ scope=cart; bxgy ⇒ scope∈(product,category);
  target_id present iff scope∈(product,category); code required when trigger=code. Unique
  **live code per shop** (case-insensitive).
- **Banner is not a row type** — it's how the UI renders **active automatic** offers:
  exactly 1 ⇒ banner; many ⇒ carousel of cards. (`name`/`description` are the advert text.)

### RLS + code privacy
- **Public** reads ONLY **live automatic** offers (`offer_is_live(o)` = active ∧ within window).
  Typed **codes are never exposed** to the client.
- Members read **all** their shop's offers (manage); **`catalog`+** insert/update/delete.
- **`validate_offer_code(shop_id, code)`** SECURITY DEFINER → returns the single live code
  offer (or none) so the client can preview a typed code without seeing the code list.
  Granted to `anon`+`authenticated` (cart is pre-login) — an accepted advisor WARN, like
  `is_shop_member`.

### Engine contract (`lib/catalog/offers.ts`, pure TS — client preview AND server reprice)
- **Order of application:** `product → category → cart`. Percents apply on the **running
  (already-discounted)** amount, so stackable percents **compound**. Fixed subtracts (capped at
  the remaining base); bxgy free units = `floor(qty/(buy+get)) × get × unitPrice`;
  free_shipping zeroes the shipping line.
- **Stacking / best-pick:** `stackable=false` ⇒ **exclusive** (if chosen, nothing else applies).
  Evaluate two candidate worlds and keep the one with the **larger total discount**:
  (A) all *stackable* offers combined; (B) each single *exclusive* offer alone. A typed code is
  just another offer in this set (joins A if stackable, competes as B if exclusive).
- UI shows **strikethrough original + new price** with the **offer `name`** beside it.

### Money model (orders gained `discount, shipping_fee, service_fee, applied_offers jsonb`)
- **`shops.delivery_fee`** numeric (shop-configured shipping/"shipping tax", default 0). A
  `free_shipping` offer zeroes `shipping_fee` at checkout.
- **`total = subtotal − discount + shipping_fee + service_fee` (+ platform fee).**
  `applied_offers` jsonb freezes which offers applied + their amounts on the order.
- **`service_fee`** = flat **2 lei** on every order, shown **only at checkout** (not in cart).
- **Platform fee (6%)** is **left untouched** here — it moves into the Stripe flow (redirect a
  % to us) as a separate task; do NOT rework it under the offers work.

### API surface (BE-ready — wire the UI to these)
- **Engine:** `lib/catalog/offers.ts` → `applyOffers(lines, offers, baseShipping)` (pure; client
  preview + server reprice both use it), `toEngineOffer(row)`, `isOfferLive(row)`.
- **Dashboard CRUD (C3):** `lib/offers/api.ts` → `listShopOffers`, `createOffer`, `updateOffer`,
  `setOfferActive`, `deleteOffer`, `validateCode(shop,code)`; `lib/offers/types.ts` →
  `OfferInput` + `normalizeOfferInput` (enforces the scope/code/config guards client-side).
- **Storefront (C2):** `lib/offers/queries.ts` → `getActiveOffers(shopId)` (server-only; live
  automatic only → banner if 1, carousel if many). Customer cart preview: read `getActiveOffers`
  + `validateCode`, run `applyOffers` for the strikethrough; place-order is authoritative.
- **place-order** accepts an optional `code` and returns `{subtotal, discount, shipping_fee,
  service_fee, platform_fee, applied_offers, total}`.

## Order status: `in_delivery` added (migration `order_status_in_delivery`, 2026-05-31)

`order_status` is now `pending | accepted | rejected | in_progress | in_delivery | done`.
`in_delivery` sits between `in_progress` and `done` for **delivery** fulfilment (pickup skips
it — FE branches on `fulfilment`). It is **non-terminal**, so the `orders_set_completed_at`
trigger still fires only on `done`/`rejected` (no change). Shared token `lib/design/status.ts`:
label **"În livrare"**, colour `grape`, and it's in `ORDER_FLOW` between `in_progress` and
`done`. `advanceOrderStatus` already accepts any status, so no action change. FE follow-ups
(tracked in TASKS): C3 shop-side "in delivery" action button, C2 customer timeline step.
