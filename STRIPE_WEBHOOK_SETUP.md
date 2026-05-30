# Stripe webhook — local setup (Alex)

**Why:** Order placement already works end-to-end (cart → `/api/place-order` → `orders` +
`order_items` inserted → Stripe PaymentIntent). BUT online orders stay `payment_status =
'pending'` locally because nothing forwards Stripe events to our webhook
(`/api/stripe-webhook`), which is what flips them to `paid`. George can't install the Stripe
CLI (Xcode CLT too old) — Alex, please run the listener on your machine.

There's already a test order proving the flow:
`orders.id = f800bc3c-b613-4873-905f-163a85bb7ac9` (PIM Copy, 583 lei, still `pending`).

## Prereqs in your `web/.env.local`

`.env.local` is gitignored, so you need your own copy. Get these **Stripe TEST keys** from
George (DM / 1Password — do NOT commit), they belong to the project's Stripe test account:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=            # you fill this in step 3
```

(Plus the usual `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
`SUPABASE_SERVICE_ROLE_KEY` — same as everyone's local env.)

## Steps

### 1. Install the Stripe CLI
```bash
brew install stripe/stripe-cli/stripe
```

### 2. Log in (pairs the CLI with the Stripe test account)
```bash
stripe login        # opens browser → Allow access
```

### 3. Start forwarding — THIS prints the webhook secret
```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```
It prints: `Ready! Your webhook signing secret is whsec_...`
Copy that `whsec_...` → paste into `web/.env.local` as `STRIPE_WEBHOOK_SECRET=whsec_...`
**Leave this terminal running** — it's the live tunnel.

### 4. Restart the app (env loads at startup) — second terminal
```bash
cd web && bun run dev
```

### 5. Test the full loop
- Browse → a shop → configure an item → cart → **Finalizează comanda** → choose **online**.
- Test card: `4242 4242 4242 4242`, any future expiry, any CVC.
- Watch terminal 1 print `payment_intent.succeeded`.
- The order's `payment_status` flips to `paid` and `paid_at` is set.

## Verify it worked

In Supabase (SQL editor or MCP):
```sql
select id, payment_method, payment_status, paid_at, total
from public.orders order by created_at desc limit 5;
```
A fresh online order should show `payment_status = 'paid'`.

## Notes
- The `whsec_` from `stripe listen` is **local + ephemeral** (changes per session). Each dev
  runs their own listener. **Production** (Vercel) uses a permanent endpoint created in
  Stripe Dashboard → Developers → Webhooks → `https://<app>.vercel.app/api/stripe-webhook`.
- Webhook handler: `web/src/app/api/stripe-webhook/route.ts`
  (`verify_jwt:false`, verifies `stripe-signature`, handles `payment_intent.succeeded` /
  `payment_failed`).
- You don't need the webhook to *place* orders — only to mark them paid.
