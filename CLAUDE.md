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

## Build order suggestion

0. First migration: `uuid_generate_v7()` function (if needed) → `profiles` → trigger to
   create a profile row on auth signup.
1. `shops` + `services` + `option_groups` + `option_choices` + seed 1–2 shops/services.
2. `orders` + `order_selections` + storage bucket for PDFs.
3. `messages` + realtime + RLS policies across all tables.
4. Wire frontend: chat is a SHARED component one person owns (both customer + shop embed it).
   Frontend split otherwise: Person A = shop side, Person B = customer side.

---

# TEAM SYNC — read this before working

**Convention: we ALL use Claude. Any change another teammate's Claude must know about goes
HERE, in this section. Keep it short and current. Update it in the same commit as the change.**

## Repo layout (monorepo)
- `web/` — Next.js frontend (built). `server/` — backend, placeholder only so far.
- Run the frontend from `web/`. We use **Bun**, not npm (`bun install`, `bun run dev`).

## Confirmed stack versions (bumped to latest on purpose, 2026-05-30)
- Next.js **16** (App Router, Turbopack) · React **19** · TypeScript 6
- Tailwind **v4** — note the v4 setup: `@import "tailwindcss"` + `@config` in
  `web/src/styles/globals.css`, and the `@tailwindcss/postcss` plugin in `postcss.config.mjs`.
  Do NOT reintroduce v3 `@tailwind base/...` directives.
- Supabase JS + `@supabase/ssr`. Two clients: `web/src/lib/supabase/{client,server}.ts`.
- Package manager: **Bun** (`web/bun.lock` is the lockfile; no package-lock.json).

## Routing (route-group collision was fixed — don't undo it)
Route groups alone collided (`/orders` existed twice). Final URL scheme:
- Customer: `/browse`, `/orders`, `/shop/[shopId]`, `/order/[orderId]` (root level)
- Shop owner: `/dashboard`, `/dashboard/orders|products|services|offers|profile`
- Courier: `/courier/deliveries|earnings`
- Auth: `/login`, `/register`
`middleware.ts` skips Supabase auth when env keys are missing/placeholder (so the app is
browsable before keys are set). Protected prefixes: /browse /order /orders /dashboard /courier.

## Supabase project
- Project ref: `qborcngytmztfucjuwgw` · URL: `https://qborcngytmztfucjuwgw.supabase.co`
- **Postgres 17.6** → NO native `uuidv7()`. We add `public.uuid_generate_v7()` (Fabio Lima).
- MCP server configured in `.mcp.json` (each teammate authenticates via OAuth on their machine).
- Each teammate needs their own `web/.env.local` (copy from `.env.local.example`, gitignored).

## DB scope decision (2026-05-30)
Building the **CLAUDE.md 8-table weekend scope** (profiles, shops, services, option_groups,
option_choices, orders, order_selections, messages). NO cities/products/offers tables yet,
even though scaffold has `/dashboard/products` + `/dashboard/offers` pages (left as empty
shells for post-MVP). `web/src/types/database.ts` currently describes the BROADER model and
must be reconciled to the 8-table scope.

## Seed data
- `web/seed/pimcopy.json` — real PIM Copy (pimcopy.ro) catalog, shaped to our schema.
  Prices marked `price_estimated:true` are fictive placeholders; 3 are real (`:false`).
- `web/seed/printhaus.json` — PrintHaus (printhaus.ro) catalog, 16 services, 38 option
  groups. Site publishes NO real prices (all calculator/quote), so ALL prices here are
  fictive estimates (`price_estimated:true`). Phone/address captured in the `shop` block.

## Migration log (keep appending; newest last)
- `00_uuidv7_profiles` (applied 2026-05-30): added `public.uuid_generate_v7()`,
  `public.profiles` (+RLS: select/update own), and `handle_new_user()` trigger on
  `auth.users` that inserts a profile row on signup (role from user_metadata, default
  'customer'). OPEN advisor warnings to fix: pin search_path on uuid_generate_v7; revoke
  public EXECUTE on the SECURITY DEFINER funcs.
- NOTE: DB is being worked on by a teammate concurrently (spotted a `public.rls_auto_enable()`
  function not created here). Coordinate before applying more migrations to avoid collisions.
  Schema/seed ownership: teammate is handling seeding — do NOT seed from here.
