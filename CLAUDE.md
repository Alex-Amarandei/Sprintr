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
- **Postgres 17.6** → NO native `uuidv7()`. We add `public.uuid_generate_v7()` (Fabio Lima).
- MCP server configured in `.mcp.json` (each teammate authenticates via OAuth on their machine).
- Each teammate needs their own `web/.env.local` (copy from `.env.local.example`, gitignored).

## Seed data (FE-provided catalog inputs)
- `web/seed/pimcopy.json` — real PIM Copy (pimcopy.ro) catalog; `price_estimated:true` =
  fictive placeholder, 3 are real (`:false`).
- `web/seed/printhaus.json` — PrintHaus catalog (16 services, 38 option groups); all prices
  fictive estimates (site publishes none). Phone/address in the `shop` block.
- These JSONs use richer option types (`number`, `radio`) + per-unit pricing that **don't**
  match our MVP model (`single_select|boolean|text`, additive-only). **Down-map** when we
  write the seed migration. Seeding ownership (FE script vs seed migration) is TBD.
