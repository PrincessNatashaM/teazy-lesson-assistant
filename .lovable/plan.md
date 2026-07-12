
# Authentication, Onboarding & Online Teaching Update

Large scope — grouped into six workstreams. All changes stay on-brand (Deep Blue, Dark Orange, Nude, White), minimal icons/emojis.

## 1. Auth infrastructure

- Enable Google OAuth via Lovable Cloud managed provider (`configure_social_auth` with `providers: ["google"]`, keep email enabled).
- Create a shared `AuthGateModal` component with:
  - Context-aware heading + description (feature key: `lesson` | `quiz` | `assessment` | `writing`).
  - Primary: **Continue with Google** button using `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`.
  - Divider: "or continue with email".
  - Email form: Full Name, Email, Phone Number, Password + real-time password checklist (8+ chars, upper, lower, number, special) and strength meter (Weak/Fair/Good/Strong).
  - Toggle between Sign Up / Sign In.
- Replace existing `/auth` page usage: the page still exists but the modal is the primary entry point. Remove Microsoft (none present, verify).
- Add `phone` column to `profiles` (migration + GRANT).

## 2. Auth gating (no redirects)

Introduce `useRequireAuth(feature)` hook returning `{ user, requireAuth: (action) => void, gateProps }`.
Gate these actions/routes by opening the modal instead of navigating:
- Lesson Note Generator submit
- Quiz Generator submit
- Writing Assessment submit + Bulk Assessment
- Download Word / Download PDF buttons (LessonOutput, AssessmentResults, QuizSection, WritingAssessmentOutput)
- My Workspace, Batches list (History) — render gate overlay on the page instead of redirecting

Homepage remains fully public.

## 3. Preserve form state across auth

- Add a `pendingAction` store (sessionStorage key `teazy_pending_action`) with `{ feature, formData, action }`.
- On gated submit while signed out: snapshot form → open modal.
- On auth success: `AuthProvider` reads pending action, restores form values via a context (`PendingActionContext`), and re-invokes the original submit.
- LessonForm, QuizForm, WritingAssessment forms accept `initialValues` and expose current values via ref/state lift.

## 4. Teaching Environment + Online flow

Update `LessonForm` (`src/components/LessonForm.tsx`):
- New required first field: **Teaching Environment** (Classroom / Online Teaching) as segmented control.
- **Classroom**: existing Curriculum → Class list (already present via `src/lib/curricula.ts`; verify Ghana/Kenya class lists match spec, extend if needed).
- **Online Teaching**: hide Curriculum + Class. Show:
  - **Age Group**: 3–5, 6–8, 9–12, 13–15, 16–18, Adults.
  - **Teaching Platform**: Zoom, Google Meet, Microsoft Teams, Google Classroom, Canvas, Moodle, Thinkific, Teachable, Other.
- Keep Subject, Topic, Duration, Objectives, Additional Instructions.

Type updates in `LessonFormData` + downstream pages.

## 5. Online lesson plan generation

Update `supabase/functions/generate-lesson/index.ts`:
- Accept new fields: `environment`, `ageGroup`, `platform`.
- When `environment === "online"`, use a distinct system prompt producing sections:
  Lesson Overview, Learning Objectives, Required Resources, Suggested AI Tools, Suggested EdTech Tools, Icebreaker Activity, Teacher Script, Lesson Flow, Student Activities, Discussion Questions, Poll Questions, Breakout Room Activities, Guided Practice, Assessment, Homework, Reflection.
- Prompt instructs subject-appropriate tool recommendations (Desmos/GeoGebra for math, PhET for science, Canva/Diffit for English, Scratch/Replit/Code.org for CS, TimelineJS/Google Earth for history, etc.) and engagement strategies (icebreakers, polls, breakouts, exit tickets, think-pair-share).
- Skip diagram generation for online environment unless the subject is inherently visual (reuse existing logic).

## 6. Design polish

- Modal uses shadcn `Dialog`, deep-blue heading, dark-orange primary button, nude/white surfaces.
- Password checklist: small check row, no emoji — use existing `Check` icon from lucide (minimal).
- Strength bar: 4 segments colored via semantic tokens.

## Technical details

**New/edited files**
- New: `src/components/AuthGateModal.tsx`, `src/hooks/useRequireAuth.tsx`, `src/lib/pendingAction.ts`
- Edit: `src/hooks/useAuth.tsx` (integrate pending action replay), `src/App.tsx` (mount `PendingActionProvider`)
- Edit: `src/components/LessonForm.tsx`, `src/pages/LessonNotesPage.tsx`, `src/pages/QuizGeneratorPage.tsx`, `src/pages/WritingAssessmentPage.tsx`, `src/pages/BulkAssessmentPage.tsx`, `src/pages/MyWorkspacePage.tsx`, `src/pages/BatchesListPage.tsx`
- Edit download buttons in `LessonOutput.tsx`, `QuizSection.tsx`, `AssessmentResults.tsx`, `WritingAssessmentOutput.tsx`
- Edit: `supabase/functions/generate-lesson/index.ts`
- Edit: `src/lib/curricula.ts` (verify Ghana/Kenya class lists)

**Migration**
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
-- profiles already has GRANTs
```

**Auth tool call**
- `supabase--configure_social_auth` with `providers: ["google"]` (keep email).

**Pending action shape**
```ts
{ feature: "lesson"|"quiz"|"writing"|"assessment"|"download",
  path: string, // route to return to
  formData?: any,
  actionId?: string }
```
Cleared after replay.

**Password validation** (client-only additive; server still enforces min 8):
Regex per rule + score 0–4 → Weak/Fair/Good/Strong.

## Out of scope

- No changes to payment, pricing, or existing assessment scoring logic.
- No email template changes.
- No changes to `AuthPage` route beyond compatibility (modal handles new flow).
