# Milestone 2 — Assessment Pro features

Build the Pro-tier capabilities that were gated (badge + upgrade CTA) in the previous milestone. Everything here is behind `plan === "pro"`; Standard/Free see the upgrade paywall.

## Scope

1. **Bulk marking (multi-script upload)**
   - New "Bulk mode" toggle on the Writing Assessment page.
   - Upload up to 30 scripts in one batch (images or PDFs, one script per file OR multi-page PDF per student).
   - Optional single question paper + marking scheme applied to the whole batch.
   - Optional CSV of student names to auto-label scripts; otherwise use filenames.
   - Batch runs OCR + `assess-script` per student in parallel (capped concurrency = 4) with a live progress panel (queued / marking / done / failed).
   - Each script counts against the Pro upload counter (Pro = unlimited, but still logged for analytics).

2. **Mark-against-scheme comparison view**
   - When a marking scheme is provided, render a side-by-side "Scheme vs Student" panel per question in results, highlighting matched keywords / missed points.
   - Add a "Compare to question paper" tab that shows question coverage (which questions the student attempted / skipped).

3. **Batch results dashboard**
   - New route `/app/writing/batches` listing past batches (name, date, class, subject, #scripts, avg %, top/bottom scorer).
   - Batch detail page: sortable table of students with score, %, grade, confidence, flags (needs manual review, missing pages, low OCR quality). Click a row → single-script results (reuses `AssessmentResults`).

4. **Advanced analytics + student performance reports**
   - Per-batch charts: score distribution histogram, grade breakdown pie, per-question average, common errors word-cloud/list, recommended reteach topics.
   - Per-student report (printable): trend across batches for the same class, mastery vs curriculum objectives, teacher comment history.
   - Class-level report: aggregate strengths/weaknesses, intervention list.

5. **Excel / CSV export**
   - Batch table → CSV and XLSX (student, score, %, grade, confidence, per-question marks as columns).
   - Per-student report → PDF (reuses existing PDF pipeline) and DOCX.
   - Class analytics → XLSX with multiple sheets (summary, per-student, per-question).

6. **Priority processing**
   - Pro requests get a higher-priority queue key; free/standard use the default. Implemented in `assess-script` and the new `assess-batch` function via a queue-priority header + faster model tier where available.

7. **Early-access flag**
   - `feature_flags` table (`user_id`, `flag`, `enabled`). Pro users auto-flagged for `early_access`. UI: "Early access" badge on the Writing Assessment page for these users; feature-gated experimental toggles read this flag.

## Data model

- `assessment_batches(id, user_id, name, curriculum, subject, class_level, assessment_type, marking_style, question_paper, marking_scheme, script_count, status, avg_percent)` + timestamps.
- `assessment_batch_items(id, batch_id, user_id, student_name, source_file, ocr_text, result_json, awarded, max, percent, grade, confidence, status, error)` + timestamps.
- `student_reports` view: joins batch items by `student_name` within a `class_level` for a user, exposes trend data.
- `feature_flags(id, user_id, flag text, enabled bool)` — unique(user_id, flag).
- All tables: `GRANT` to `authenticated` + `service_role`, RLS scoped to `auth.uid()`, `updated_at` trigger.
- Storage bucket `assessment-uploads` (private) for original script files; signed URLs on demand.

## Backend

- New edge function `assess-batch`:
  - Auth required, `plan === 'pro'` gate.
  - Accepts `batch_id` + array of item ids to process; runs OCR then `assess-script` internal call per item, updates `assessment_batch_items` incrementally. Concurrency cap = 4.
  - Emits progress via row updates (frontend subscribes with realtime).
- Extend `assess-script` to accept an internal service-role call bypassing quota when invoked by `assess-batch` (batch already counted).
- New `export-batch` function: builds XLSX/CSV server-side and returns a signed URL.

## Frontend

- `WritingAssessmentPage`: add `Mode` tabs — "Single script" (existing) and "Bulk (Pro)". Non-Pro users see paywall for the Bulk tab.
- New components: `BulkUploadDropzone`, `BatchProgressPanel`, `BatchResultsTable`, `AnalyticsCharts` (recharts), `SchemeCompareView`, `StudentReportPrintable`.
- New pages: `/app/writing/batches`, `/app/writing/batches/:id`, `/app/writing/students/:name`.
- Header: add "Batches" sub-link under Writing Assessment for Pro users.
- Account page: show "Early access" badge if flagged.

## Technical notes

- Use existing `recharts` for charts; add `xlsx` (SheetJS) for XLSX generation server-side.
- PDF export reuses the current `jspdf` pipeline; add a batch-report template.
- Realtime: enable on `assessment_batch_items` so the progress panel is live.
- Priority: pass `x-priority: high` header to Lovable AI gateway for Pro; keep default for others.
- OCR cost control: reject files > 10 MB, cap batch at 30 scripts, warn if total pages > 120.

## Build order (single milestone)

1. Migration: batches + items + feature_flags + storage bucket + RLS/grants.
2. `assess-batch` edge function + `assess-script` internal-call path.
3. `BulkUploadDropzone` + batch creation flow on Writing Assessment page (Pro-gated).
4. `BatchProgressPanel` with realtime updates.
5. Batches list + batch detail pages with `BatchResultsTable` and `SchemeCompareView`.
6. `AnalyticsCharts` + student/class reports.
7. `export-batch` function + CSV/XLSX/PDF/DOCX download buttons.
8. `feature_flags` + early-access badge + priority header wiring.

Reply "go" to build, or tell me to trim/split (e.g. ship bulk + exports first, analytics second).
