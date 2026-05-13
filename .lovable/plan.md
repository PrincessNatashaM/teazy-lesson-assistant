## Teazy AI Architecture Upgrade Plan

This is a large, multi-phase refactor. I'll ship it in sequenced phases so each one is testable and reversible. Branding, routes, and existing UI stay intact.

---

### Phase 1 — Backend orchestration + curriculum prompt library

**What changes**
- New shared module `supabase/functions/_shared/curriculum.ts` holding:
  - Curriculum system prompts (Nigeria NERDC, Ghana NaCCA, Kenya CBC) as short reusable strings keyed by ID.
  - Subject-aware prompt fragments (math, biology, physics, chemistry, english, geography).
  - Lesson templates (already in `generate-lesson`) extracted here.
- New shared module `supabase/functions/_shared/ai.ts`:
  - Single `callAI({ task, model, messages, stream })` helper.
  - Model routing rules: "light" tasks (quiz, translation, formatting) → `google/gemini-2.5-flash-lite`; "heavy" tasks (lesson note, writing feedback) → `google/gemini-3-flash-preview`.
- Frontend keeps calling edge functions only — never the AI gateway directly (already true; we formalize it).

**Why**: Stops resending huge curriculum blocks per request and centralizes model choice for cost control.

---

### Phase 2 — Modular generation (no more all-at-once)

- `generate-lesson` returns lesson note only (already does).
- Quiz generation stays in `generate-quiz` and is triggered **only** when the user opens the Quiz tab and clicks Generate (verify current behavior; wire a lazy trigger if missing).
- Diagram generation (`generate-lesson-images`) becomes **conditional**:
  - New helper `shouldGenerateDiagrams(subject, topic)` on the client — only fires for math/biology/physics/chemistry/geography or when topic keywords match (e.g. "cycle", "diagram", "shape", "cell", "circuit").
  - Otherwise skipped entirely → big savings.
- Writing assessment stays isolated to its own page (already true).

---

### Phase 3 — Database + caching layer

New Supabase tables (with RLS open-read for cache hits, service-role write from edge functions):

- `cached_lessons` — `(curriculum, subject, class_level, topic_normalized)` unique key, `content`, `language`, `created_at`.
- `cached_quizzes` — keyed by `lesson_hash`.
- `diagram_library` — `(subject, topic_keyword, svg_url, title)` for the static SVG library (Phase 4).

Edge function flow:
1. Normalize input → lookup in cache.
2. Cache hit (>90% similarity on topic) → return stored content immediately, optionally light personalization pass with the lite model.
3. Cache miss → generate, then store.

---

### Phase 4 — Static diagram library

- `public/diagrams/` directory with curated SVGs: plane shapes, triangle types, plant cell, animal cell, digestive system, water cycle, simple circuit, photosynthesis, etc.
- `src/lib/diagram-registry.ts` maps `(subject, topic keywords) → svg path + alt text`.
- `LessonOutput` checks registry first; only falls back to AI image generation if no static match AND subject genuinely benefits from a visual.

---

### Phase 5 — Progressive lesson rendering

- Already streaming via SSE. Add section-aware UI: as `## Heading` tokens arrive, render skeleton placeholders for upcoming sections (Objectives → Introduction → Activities → Evaluation) so perceived speed improves. No change to backend.

---

### Phase 6 — OCR-first writing assessment

- Confirm flow: upload → OCR (`ocr-handwriting`) → editable textarea → user reviews → "Grade" button calls `assess-writing` with cleaned text only.
- If grading currently takes the raw image, switch to text-only path. (Need to read `assess-writing/index.ts` and `WritingAssessmentForm.tsx` first.)

---

### Phase 7 — Word (.docx) export

- Add `docx` npm package; new `src/lib/export-docx.ts` builds a document from the lesson markdown (headings, lists, paragraphs, embedded diagram images, KaTeX rendered to MathML/text fallback).
- "Download Word" button alongside existing Copy / Download PDF buttons in `LessonOutput`.

---

### Phase 8 — Math rendering verification

Already implemented with KaTeX + Unicode fallback in `LessonOutput.tsx`. I'll spot-check during QA, not rebuild.

---

### Technical details

- **Models**: `gemini-3-flash-preview` for lesson notes & writing feedback; `gemini-2.5-flash-lite` for quizzes, translations, cache personalization.
- **Cache key normalization**: lowercase + trim + strip punctuation on topic; exact match on (curriculum, subject, classLevel).
- **No UI redesign**: only new buttons (Download Word) and skeleton states added. Colors, layout, branding untouched.
- **Migrations**: 1 migration for the 3 new tables + RLS policies (public read, service-role write).

---

### Suggested execution order for this conversation

I recommend doing **Phases 1 + 2 + 3 (cache schema only, no diagram lib yet) + 7 (Word export)** in the first build pass — that delivers the biggest cost/perf wins immediately. Phases 4, 5, 6 follow in a second pass once you've validated the orchestration works.

**Confirm and I'll start with Phases 1, 2, 3, and 7.** Or tell me which phases to prioritize / drop.