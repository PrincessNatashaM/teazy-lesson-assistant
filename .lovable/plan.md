
# Rename + New Monetisation Model

Two changes bundled:
1. Rename **Assessment Marker → Writing Assessment** everywhere.
2. Replace the current pricing model with a 3-tier subscription plan (Free / Standard / Pro) + Standard-only upload packs.

---

## Part 1 — Rename

Revert the previous rename. Change every user-facing reference from **Assessment Marker** back to **Writing Assessment**.
- Nav item, homepage cards/FAQ/copy, Hero slide, page title + meta, `PaywallModal` copy.
- Route: primary becomes `/app/writing` again; keep `/app/marker` as a redirect for anyone with the link.
- Rename `AssessmentMarkerPage.tsx` → `WritingAssessmentPage.tsx`.
- Curriculum/results files keep their names — they're internal.

---

## Part 2 — New pricing model

### Plans

| | **Free** | **Teazy AI Standard** — ₦2,000/mo | **Assessment Pro** — ₦5,000/mo |
|---|---|---|---|
| Price equivalents | — | ~2,000 CFA · KSh 180 | ~5,000 CFA · KSh 450 |
| Lesson notes | Unlimited generate + copy | Unlimited + editing | Everything in Standard |
| Quizzes | Unlimited generate | Unlimited | + |
| PDF / Word downloads | ✗ | Unlimited | + |
| Writing Assessment uploads | 2 lifetime free | **40 / calendar month** | **Unlimited** |
| Assessment history | ✗ | ✓ | ✓ |
| Faster AI responses | ✗ | ✓ | ✓ (priority) |
| Bulk marking, multi-script upload | ✗ | ✗ | ✓ |
| Mark against uploaded schemes / question paper comparison | ✗ | ✗ | ✓ |
| Advanced analytics + student performance reports | ✗ | ✗ | ✓ |
| Excel / CSV export | ✗ | ✗ | ✓ |
| Early access to new assessment features | ✗ | ✗ | ✓ |

Tagline for the Pro card: *"Best for teachers who grade frequently."*

### Upload packs (Standard-only add-on)
Purchased uploads **never expire** and are consumed after the monthly 40 is used up.

| Pack | Price |
|---|---|
| 5 uploads | ₦500 |
| 10 uploads | ₦1,000 |
| 30 uploads | ₦2,000 |

### Usage meter behaviour (Standard)
- Show `X / 40 uploads remaining this month` on the Writing Assessment page.
- If pack credits exist, show `+ N extra pack uploads` beside it.
- When both the monthly quota and pack credits are exhausted → block the "Grade Assessment" button and show:
  > "You've reached your monthly Writing Assessment limit."
  with two CTAs: **Buy upload pack** and **Upgrade to Assessment Pro**.

---

## Data model changes

Extend the existing tables (schema migration + one small backfill):

- `subscriptions.plan` → allowed values: `free`, `standard`, `pro` (was `pro_monthly`). Migrate existing `pro_monthly` rows → `pro`.
- New table `monthly_assessment_usage(user_id, period_start, uploads_used)` — tracks the 40/month Standard quota. Reset by comparing `period_start` to the current month.
- `assessment_credits.remaining` stays for pack purchases (already exists).
- `payments.purpose` new values: `sub_standard`, `sub_pro`, `assessment_pack_5`, `assessment_pack_10`, `assessment_pack_30`. Deprecate old `sub_monthly`, `assessment_pack_6`, `assessment_pack_11` (leave old rows intact for history).

All new tables get `GRANT` + RLS scoped to `auth.uid()`.

## Backend (edge functions)

- `paystack-initialize` — extend switch statement with the new SKUs (5 upload/₦500, 10/₦1000, 30/₦2000, Standard ₦2000, Pro ₦5000). Keep promo-code path and prorated upgrade support (upgrade Standard→Pro credits remaining days).
- `paystack-webhook` — on successful `sub_standard` / `sub_pro`, upsert subscription with correct `plan` and 30-day `current_period_end`. On upload packs, add to `assessment_credits.remaining`.
- New `check-assessment-quota` (or inline in Writing Assessment page) — returns `{ plan, monthlyUsed, monthlyLimit, packRemaining, canUpload }`. Called before grading.
- `assess-script` — increment the correct counter (monthly first, then pack) atomically via a Postgres function.

## Frontend

- New `/pricing` page listing all three plans side-by-side. Pro highlighted as "Recommended for schools & high-volume users". Currency toggle: **₦ / CFA / KSh** on the price line.
- `useEntitlements` hook returns `{ plan: 'free'|'standard'|'pro', monthlyUsed, monthlyLimit, packRemaining, canDownload, canEdit }`.
- `PaywallModal` rewrite: when a free user hits a download/edit lock, offer **Upgrade to Standard** (₦2,000/mo) as primary CTA and **Upgrade to Pro** as secondary. Old per-download "unlock this file" flow removed — downloads are subscription-gated now (per spec).
- Writing Assessment page: usage meter component + limit-reached modal with two CTAs.
- Account page: show current plan, renewal date, pack credits remaining, "Manage / Cancel" link and "Upgrade" CTA.

## Build order (single milestone, ships as one PR)

1. Rename revert.
2. Migration (subscriptions.plan values, new `monthly_assessment_usage` table, quota RPC).
3. Update Paystack initialize + webhook for new SKUs.
4. Update `useEntitlements` + `PaywallModal`.
5. New `/pricing` page with currency toggle.
6. Writing Assessment usage meter + limit gate.
7. Account page shows plan + credits.

Small caveat: **Bulk marking / Excel / CSV export / advanced analytics** are Pro-tier features that don't exist yet — this milestone gates them (Pro badge + upgrade CTA on the Writing Assessment page) but doesn't build them. That belongs in the previously-planned bulk marking milestone.

Reply "go" to build all of the above, or tell me to trim/split.
