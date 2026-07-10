
# Multi-Gateway Payments (Paystack + Flutterwave)

Add Flutterwave for Ghana/Kenya while keeping Paystack for Nigeria. Users never see gateway choice — the app picks based on country/curriculum/locale (logic already in `resolveDisplayCurrency`).

## 1. Secrets
Ask the user to add via `add_secret`:
- `FLUTTERWAVE_PUBLIC_KEY`
- `FLUTTERWAVE_SECRET_KEY`
- `FLUTTERWAVE_ENCRYPTION_KEY`
- `FLUTTERWAVE_WEBHOOK_HASH` (secret hash configured in FLW dashboard)

## 2. Frontend gateway abstraction (`src/lib/payments/`)
- `types.ts` — `PaymentGateway` interface: `initialize(purpose, currency)`, launches checkout, returns success/failure.
- `paystack.ts` — wraps existing Paystack inline flow (moved from `BuyPackModal`/`PaywallModal`).
- `flutterwave.ts` — loads `https://checkout.flutterwave.com/v3.js`, calls `FlutterwaveCheckout({...})` with mobile money + card for GHS/KES.
- `index.ts` — `getGatewayForCurrency(cur)`: NGN→paystack, GHS/KES→flutterwave. Exposes single `startCheckout({ purpose, currency, user, onSuccess })` used everywhere.

Refactor `PaywallModal.tsx` and `BuyPackModal.tsx` to call `startCheckout` instead of `loadPaystack` directly. UI/copy unchanged.

## 3. Backend edge functions
- Rename intent: existing `paystack-initialize` returns Paystack config only when currency=NGN; for GHS/KES it errors. Simpler: keep two initialize functions:
  - `paystack-initialize` (existing) — no change beyond currency guard (NGN only).
  - `flutterwave-initialize` (new) — same auth/promo/prorate logic as Paystack version, returns `{ tx_ref, amount, currency, public_key, payment_options }`. Reuses same `payments` table.
  - `flutterwave-verify` (new) — calls `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=...`, checks status+amount, then `grantAccess` (shared logic replicated from paystack-verify).
  - `flutterwave-webhook` (new, `verify_jwt=false`) — validates `verif-hash` header against `FLUTTERWAVE_WEBHOOK_HASH`, handles `charge.completed`.

Add shared grant logic — keep small duplication rather than shared module (edge functions can't cross-import from ../).

## 4. Database
Migration to add columns on `payments` table:
- `gateway text not null default 'paystack'` (values: `paystack`, `flutterwave`)
- Add `gateway` to `subscriptions` too (nullable text).
Existing `paystack_reference` column reused as generic reference (Flutterwave `tx_ref` stored there). No rename to avoid breaking existing code.

## 5. Admin dashboard
Extend `AdminPage.tsx` with a Payments tab showing:
- table of recent payments (gateway, country/currency, amount, status, user)
- revenue-by-gateway and revenue-by-currency aggregates
- active subscription count
Queries via `supabase.from('payments')` with existing `has_role('admin')` RLS.

## 6. Payment methods display
`paystackChannelsFor` becomes `channelsFor(currency)` returning provider-appropriate methods; PaywallModal shows small hint text like "Card, Mobile Money" based on currency.

## Out of scope
- Stripe/PayPal/M-Pesa direct (mentioned as future).
- Recurring subscription auto-renewal via gateway tokens (current model already re-charges monthly on user action; keeping that).

## Technical notes
- `PACK_UPLOAD_COUNT` and `grantAccess` duplicated across 3 edge functions today; adding 2 more copies for Flutterwave. Acceptable given Deno edge function isolation.
- All currency/pricing tables stay in `src/lib/pricing.ts` and `paystack-initialize` server table; add matching table in `flutterwave-initialize`.
- Frontend never sees secret keys; both public keys returned from initialize response.

After approval I'll ask for the Flutterwave secrets before writing the edge functions.
