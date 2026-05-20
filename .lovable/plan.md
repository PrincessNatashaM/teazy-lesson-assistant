# Teazy AI — Monetization & Subscription System (Paystack)

This is a large feature. Before I start, two quick decisions are needed (see "Open questions" at the bottom). Everything else is laid out below.

## 1. Authentication (foundation)

Monetization needs accounts so we can track entitlements, subscriptions, promo usage, and free-tier counters across devices.

- Email + password sign-in (default) and Google sign-in
- `/auth` page (sign in / sign up), `/account` page (status, usage, manage subscription)
- "Upgrade to Pro" button in the navbar
- `profiles` table linked to `auth.users` (display name, country for currency detection)
- Separate `user_roles` table with `app_role` enum (`admin`, `user`) and `has_role()` security-definer function — used to gate admin pages

## 2. Database schema (new tables)

```text
profiles              user_id, display_name, country (NG|GH|KE|OTHER)
user_roles            user_id, role (admin|user)
subscriptions         user_id, status (active|canceled|expired), plan, current_period_end, paystack_subscription_code, paystack_customer_code
entitlements          user_id, lesson_hash, kind (download_pdf|download_docx), expires_at  -- per-lesson unlocks
usage_counters        user_id, kind (writing_assessment), period_start, count
assessment_credits    user_id, remaining  -- one-off packs (6 or 11 essays)
promo_codes           code, kind (percent|fixed|free|bonus_uploads), value, currency, max_uses, used_count, expires_at, active
promo_redemptions     code_id, user_id, payment_id, redeemed_at
payments              user_id, paystack_reference, amount, currency, purpose (download|pack6|pack11|subscription), promo_code_id, status, metadata, created_at
app_settings          key, value (JSON) — pricing, free-tier limits, feature flags (admin-editable)
```

All tables get RLS — users read/write only their own rows; `app_settings`, `promo_codes`, all payments visible to admins via `has_role()`.

## 3. Paywall — PDF / Word downloads

- "Download PDF" / "Download Word" in `LessonOutput` and `QuizSection` check entitlement first
- Entitlement = active subscription OR a `entitlements` row for this lesson hash
- If neither → open `PaywallModal`:
  - Headline "Unlock Download Access"
  - Pricing in user's local currency (₦500 / 500 CFA / KSh 45), detected from `profiles.country` with a manual switcher
  - "Pay with Paystack" + "Enter Promo Code"
- After verified payment → insert `entitlements` row → download fires automatically, no page refresh

## 4. Writing Assessment paywall

- First 2 uploads free per account (tracked in `usage_counters`)
- After that, `WritingAssessmentForm` submit is intercepted by `AssessmentPaywallModal`:
  - Pack A: ₦500 / 500 CFA / KSh 45 → +6 credits
  - Pack B: ₦1,000 / 1,000 CFA / KSh 90 → +11 credits
  - Pro Subscription: ₦2,000 / 2,000 CFA / KSh 180 per month → unlimited
- Pro users skip all paywalls; pack credits decrement on each assessment

## 5. Subscription page (`/pricing`)

Two-column comparison:

- **Free**: lesson notes, quizzes, 2 writing assessments, copy outputs
- **Pro** (highlighted "Best for active teachers"): unlimited assessments, unlimited PDF + Word downloads, faster processing, premium access
- Monthly pricing in NGN / CFA / KES, currency toggle
- Small caption: "Designed to remain affordable for teachers across Nigeria, Ghana, and Kenya."

## 6. Paystack integration

- Frontend: `@paystack/inline-js` popup, initialized with `PAYSTACK_PUBLIC_KEY` (publishable, fine in code)
- Backend edge functions (all with CORS, Zod validation, JWT-verified):
  - `paystack-initialize` — creates a transaction, returns reference + access code; accepts `{purpose, lesson_hash?, promo_code?}` and computes server-side price (never trust client price)
  - `paystack-verify` — verifies reference via Paystack API, writes `payments` row, grants entitlement / credits / activates subscription
  - `paystack-webhook` — handles `charge.success`, `subscription.create`, `subscription.disable`, `invoice.payment_failed`; signature-verified with HMAC-SHA512 of `PAYSTACK_SECRET_KEY`
  - `validate-promo` — checks code validity, returns adjusted price
- `PAYSTACK_SECRET_KEY` stored in Lovable Cloud secrets, never sent to frontend

## 7. Promo codes

- Field on every paywall modal: "Enter promo code"
- `validate-promo` returns `{valid, adjusted_amount, kind}` → modal updates price live
- On verify, `paystack-verify` re-validates and records redemption (prevents race / replay)
- Admins create/edit codes in admin panel

## 8. Admin panel (`/admin`, gated by `has_role(admin)`)

- Pricing editor (writes `app_settings`)
- Promo code CRUD (expiration, max uses, kind, value)
- Free-tier limit editor (default 2 assessments)
- Payments + subscriptions table view (read-only)
- First admin: I'll provide a one-line SQL snippet for the user to run via the admin tools to grant themselves the `admin` role after signup

## 9. UX indicators

- Account chip in navbar: "Pro" badge OR "2 free uploads left"
- Inline banners on writing page: "1 free upload remaining" / "Pro subscription active" / "5 essay credits left"
- Download buttons show a small lock icon when locked
- Toast: "Payment Successful 🎉" + auto-unlock

## 10. Homepage messaging cleanup

- Replace "Free for Teachers" / "Completely Free" / "100% Free" with **"Start Free. Upgrade When You Need More."**
- Replace CTA "Get Started Free Forever" with **"Start Generating Lesson Notes"**
- Add a Free-vs-Premium comparison section
- Add transparent line: *"Only pay when you need downloads or additional assessments."*

## Technical details

- Currency: stored everywhere as `{amount_minor, currency}` (NGN/XOF/KES); Paystack accepts NGN, GHS, KES, USD, ZAR — for CFA we'll charge in Paystack's nearest supported currency (likely GHS for West Africa users) or display CFA but charge in NGN equivalent. **Need confirmation — see Q2.**
- All price decisions happen server-side from `app_settings`; frontend only displays
- Subscriptions use Paystack Plans + webhook-driven status; cron-free since webhook covers renewal/cancel
- Existing `cached_lessons` / `cached_quizzes` untouched; lesson hash for entitlements = SHA-256 of generated content (already computed in current code)
- Auth state via `onAuthStateChange` listener set up before `getSession()` (Lovable Cloud rule)

## Build order

1. Auth (profiles, user_roles, /auth, /account, navbar account chip)
2. DB schema + RLS for all monetization tables
3. Paystack edge functions + frontend SDK wiring
4. Subscription/pricing page + paywall modals (downloads + assessments)
5. Promo code system end-to-end
6. Admin panel
7. Homepage copy rewrite + Free-vs-Premium section
8. Usage indicators + lock states polish

## Open questions

**Q1 — Profiles:** I'll add a `profiles` table with `display_name` and `country` (for currency detection). OK?

**Q2 — CFA currency:** Paystack does not natively process XOF/XAF. Three options:
  - (a) Display "500 CFA" but actually charge the NGN equivalent via Paystack NGN
  - (b) Charge in GHS (Paystack Ghana) for West Africa users
  - (c) Show CFA pricing but disable Paystack for CFA users until we add Flutterwave later
  Which do you want?

Once you confirm Q1 + Q2, I'll start shipping in the build order above.