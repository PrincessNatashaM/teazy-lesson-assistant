
# Assessment Marker — Expansion Plan

Transform the existing Writing Assessment into a comprehensive, curriculum-first **Assessment Marker** for Nigerian (NERDC/WAEC/NECO), Kenyan CBC, and Ghanaian teachers. This is a large build — I'll ship it in phased milestones so you can review as we go.

## Phase 1 — Rename & Navigation (small)
- Rename route/label "Writing Assessment" → **Assessment Marker** everywhere (nav in `AppShell`, homepage feature cards, footer links, page title, meta).
- Keep route `/app/writing` working via redirect; primary route becomes `/app/marker`.
- New landing header on the page: "AI Assessment Marker" + subtitle from spec.

## Phase 2 — Curriculum data model (foundation)
Create `src/lib/curricula.ts` as the single source of truth. Structure:
```ts
CURRICULA = {
  "nigeria-nerdc": { label, flag, subjects[], classes[], terminology },
  "waec":          { ... },
  "neco":          { ... },
  "kenya-cbc":     { ... },
  "ghana":         { ... },
}
```
Each subject carries a `markingProfile` key (math / sciences / english / literature / geography / history / general) that drives subject-specific grading rules on the backend.

Assessment types (shared across all curricula): Essay/Creative Writing, Theory, CA, Homework, Classwork, End-of-Term, Mid-Term, Practical Report, Project, Mixed Script.

## Phase 3 — Stepper UI (the core UX)
Replace the current single form with a guided 8-step wizard in `AssessmentMarkerPage.tsx`, using existing shadcn components + Teazy blue/navy tokens. Steps:

```text
[1 Curriculum] → [2 Subject] → [3 Class] → [4 What are you marking?]
[5 Upload scripts] → [6 Question paper + Marking scheme (optional)]
[7 OCR review & approve] → [8 Marking style] → [Grade]
```
- Step 1: curriculum cards with flag emojis.
- Step 2: subject dropdown, populated from selected curriculum only.
- Step 3: class list from curriculum.
- Step 4: "What are you marking today?" chip picker.
- Step 5: drag-and-drop uploader (JPG/PNG/PDF, multi-page, multi-file, camera). Page previews shown.
- Step 6: optional question paper + marking scheme (upload / paste / AI-generate rubric with edit).
- Step 7: OCR pass on all pages, editable extracted text, "Approve & continue".
- Step 8: Strict / Standard / Lenient with explanations.

Progress bar + Back/Next controls. State kept in a single reducer.

## Phase 4 — Backend (edge functions)
Extend/add functions:
- `ocr-handwriting` (exists) — extend to accept PDFs (split to images) and batches. Return per-page text.
- `generate-marking-rubric` (new) — AI generates a rubric from curriculum + subject + class + assessment type + question paper.
- `assess-script` (new; supersedes `assess-writing`) — inputs: curriculum, subject, class, assessment type, marking style, approved text, optional question paper text, optional marking scheme. Uses subject `markingProfile` to select a specialised system prompt (math/science/English/etc.). Returns structured JSON: overallScore, percentage, grade, confidence, perQuestion[], strengths[], improvements[], commonErrors[], suggestedIntervention, suggestedHomework, curriculumObjectives[].
- Keep `assess-writing` alive as a thin wrapper for backwards compatibility.

Prompts encode curriculum-specific marking rules and subject profile. If a marking scheme is supplied, the system prompt is instructed to prioritise it over inference.

## Phase 5 — Results dashboard
New `AssessmentResults.tsx`:
- Header: Overall score, %, grade, confidence badge (with the <75% manual-review warning).
- Per-question accordion with score + feedback + teacher edit.
- Strengths / Improvements / Common errors / Suggested intervention / Suggested homework / Curriculum objectives to reinforce.
- Teacher controls: edit any score, override final grade, edit feedback, "Approve final grading", save to history (localStorage for now; DB-ready shape).
- Export buttons: PDF, Word, Printable student report, Teacher summary — reuse existing paywall via `useEntitlements` and `PaywallModal`.

## Phase 6 — Bulk Marking (Pro)
Behind Pro entitlement:
- Multi-script upload with per-script progress.
- Aggregate view: class average, high/low, distribution chart (simple bars), per-question difficulty, common misconceptions.
- Exports: Excel (via `xlsx`), CSV, PDF summary.
Non-Pro users see the tab with an upgrade CTA.

## Phase 7 — Monetisation wiring
Reuse existing entitlements/paywall:
- Free = 2 assessment uploads (new counter `assessment_uploads` in `usage_counters`).
- Unlock packs: ₦500 = 6, ₦1,000 = 11 (new Paystack SKUs in `paystack-initialize`).
- Pro ₦5,000/month unlocks unlimited + bulk + advanced analytics + priority.
- Promo codes flow through existing `validate-promo` unchanged.

## Phase 8 — Forward-compatible architecture
Type the results object and edge-function contract so future features slot in without redesign: report-card comments, parent reports, school dashboards, mastery tracking, LMS/SIS integrations. Persist assessments in a new `assessments` table (Postgres) keyed by user, with JSONB payload — laid down in this phase so history/analytics work later.

---

## Technical notes
- All colour usage stays on existing semantic tokens (blue primary, navy headings, light-blue gradients) — no hardcoded colours.
- PDF → image: use `pdfjs-dist` client-side for previews and to send page images to OCR (keeps edge function simple).
- Excel export: `xlsx` (SheetJS). PDF export: reuse existing PDF path in `LessonOutput`.
- New DB migration (Phase 8) will include GRANTs + RLS scoped to `auth.uid()`.
- Everything server-side uses Lovable AI Gateway (`google/gemini-3-flash-preview`) — no new secrets required.

## Suggested build order (what I'll ship first)
1. Phases 1–3 (rename, curriculum model, stepper UI + upload + OCR review) — biggest visible change, safe to ship together.
2. Phase 4 + 5 (new assess-script backend + results dashboard with subject-aware grading and teacher edits).
3. Phase 7 (usage counter + unlock packs + Pro gating on exports).
4. Phase 6 (bulk marking).
5. Phase 8 (persistence table + analytics-ready schema).

Reply "go" to start with milestone 1, or tell me to reorder / drop anything.
