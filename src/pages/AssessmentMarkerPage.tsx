import { useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft, ArrowRight, Loader2, Camera, Upload, X, ImageIcon,
  Check, FileText, PenLine, Sparkles, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  CURRICULA, ASSESSMENT_TYPES, MARKING_STYLES,
  getCurriculum, type AssessmentTypeId, type MarkingStyleId,
} from "@/lib/curricula";
import WritingAssessmentOutput, { type AssessmentData } from "@/components/WritingAssessmentOutput";

const OCR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-handwriting`;
const ASSESS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assess-writing`;
const AUTH_HEADER = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface ScriptPage {
  id: string;
  preview: string; // data url
  mime: string;
  base64: string;
  extractedText: string;
  ocrLoading: boolean;
  ocrDone: boolean;
}

const STEPS: { id: StepId; title: string; short: string }[] = [
  { id: 1, title: "Select curriculum", short: "Curriculum" },
  { id: 2, title: "Select subject", short: "Subject" },
  { id: 3, title: "Select class / grade", short: "Class" },
  { id: 4, title: "What are you marking today?", short: "Type" },
  { id: 5, title: "Upload exam scripts", short: "Upload" },
  { id: 6, title: "Question paper & marking scheme (optional)", short: "Guides" },
  { id: 7, title: "Review extracted text", short: "OCR" },
  { id: 8, title: "Choose marking style", short: "Style" },
];

export default function AssessmentMarkerPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<StepId>(1);

  const [curriculumId, setCurriculumId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [classLevel, setClassLevel] = useState<string>("");
  const [assessmentType, setAssessmentType] = useState<AssessmentTypeId | "">("");
  const [pages, setPages] = useState<ScriptPage[]>([]);
  const [questionPaper, setQuestionPaper] = useState("");
  const [markingScheme, setMarkingScheme] = useState("");
  const [rubricLoading, setRubricLoading] = useState(false);
  const [markingStyle, setMarkingStyle] = useState<MarkingStyleId>("standard");

  const [isAssessing, setIsAssessing] = useState(false);
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const curriculum = useMemo(() => getCurriculum(curriculumId), [curriculumId]);
  const subject = useMemo(
    () => curriculum?.subjects.find((s) => s.id === subjectId),
    [curriculum, subjectId],
  );

  const canAdvance: Record<StepId, boolean> = {
    1: !!curriculumId,
    2: !!subjectId,
    3: !!classLevel,
    4: !!assessmentType,
    5: pages.length > 0,
    6: true,
    7: pages.length > 0 && pages.every((p) => p.ocrDone && p.extractedText.trim().length > 0),
    8: !!markingStyle,
  };

  const goNext = () => setStep((s) => Math.min(8, (s + 1) as StepId));
  const goPrev = () => setStep((s) => Math.max(1, (s - 1) as StepId));

  // ---------------- Upload + OCR ----------------
  const readFile = (file: File): Promise<{ dataUrl: string; base64: string; mime: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read error"));
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        resolve({ dataUrl, base64: dataUrl.split(",")[1], mime: file.type });
      };
      reader.readAsDataURL(file);
    });

  const runOcr = async (pageId: string) => {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, ocrLoading: true } : p)));
    const target = pages.find((p) => p.id === pageId);
    const current = target || undefined;
    // read fresh state via functional update below
    setPages((prev) => {
      const found = prev.find((p) => p.id === pageId);
      if (!found) return prev;
      // fire and forget
      (async () => {
        try {
          const resp = await fetch(OCR_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...AUTH_HEADER },
            body: JSON.stringify({ imageBase64: found.base64, mimeType: found.mime }),
          });
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: "OCR failed" }));
            toast({ title: "OCR Error", description: err.error, variant: "destructive" });
            setPages((p2) => p2.map((p) => (p.id === pageId ? { ...p, ocrLoading: false } : p)));
            return;
          }
          const data = await resp.json();
          const text = data.extractedText || "";
          setPages((p2) => p2.map((p) =>
            p.id === pageId
              ? {
                  ...p,
                  extractedText: text === "[UNREADABLE]" ? "" : text,
                  ocrLoading: false,
                  ocrDone: true,
                }
              : p,
          ));
        } catch (e) {
          console.error(e);
          setPages((p2) => p2.map((p) => (p.id === pageId ? { ...p, ocrLoading: false } : p)));
        }
      })();
      return prev;
    });
    void current;
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    for (const file of arr) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Unsupported file", description: `${file.name} is not an image. PDF support coming soon — for now upload page photos.`, variant: "destructive" });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} is over 10MB.`, variant: "destructive" });
        continue;
      }
      const { dataUrl, base64, mime } = await readFile(file);
      const id = crypto.randomUUID();
      setPages((prev) => [...prev, { id, preview: dataUrl, mime, base64, extractedText: "", ocrLoading: false, ocrDone: false }]);
      // trigger OCR immediately so text is ready by Step 7
      setTimeout(() => runOcr(id), 50);
    }
  };

  const removePage = (id: string) => setPages((prev) => prev.filter((p) => p.id !== id));

  // ---------------- Rubric generation ----------------
  const generateRubric = async () => {
    if (!curriculum || !subject || !classLevel || !assessmentType) return;
    setRubricLoading(true);
    try {
      const resp = await fetch(ASSESS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({
          curriculum: curriculum.label,
          classLevel,
          writingType: `RUBRIC GENERATION — subject: ${subject.label}, assessment: ${assessmentType}`,
          language: "English",
          studentWriting: `Generate a concise marking rubric (bulleted, max 12 lines) for a ${classLevel} ${subject.label} ${assessmentType} under the ${curriculum.label} curriculum. Focus on what a teacher should look for and typical mark allocations. Return only the rubric text, no JSON.`,
        }),
      });
      if (!resp.ok) throw new Error("rubric failed");
      const data = await resp.json();
      // The endpoint returns structured feedback — use teacherComment as the rubric body if present.
      const rubricText = data.teacherComment || data.suggestedRewrite || JSON.stringify(data, null, 2);
      setMarkingScheme(rubricText);
      toast({ title: "Rubric generated", description: "Review and edit before grading." });
    } catch {
      toast({ title: "Couldn't generate rubric", description: "Try again or paste your own.", variant: "destructive" });
    } finally {
      setRubricLoading(false);
    }
  };

  // ---------------- Grade ----------------
  const runAssessment = async () => {
    if (!curriculum || !subject) return;
    const combinedText = pages.map((p, i) => `--- Page ${i + 1} ---\n${p.extractedText.trim()}`).join("\n\n");
    if (combinedText.trim().length < 20) {
      toast({ title: "Not enough text", description: "Review OCR — extracted text is very short.", variant: "destructive" });
      return;
    }

    // Build a rich contextual payload for the current assess-writing endpoint.
    const context = [
      `Subject: ${subject.label}`,
      `Class: ${classLevel}`,
      `Assessment type: ${assessmentType}`,
      `Marking style: ${markingStyle}`,
      questionPaper.trim() ? `Question paper:\n${questionPaper.trim()}` : "",
      markingScheme.trim() ? `Marking scheme (PRIORITISE OVER INFERENCE):\n${markingScheme.trim()}` : "",
      `Student script (from OCR, review-approved):\n${combinedText}`,
    ].filter(Boolean).join("\n\n");

    setIsAssessing(true);
    setAssessment(null);
    try {
      const resp = await fetch(ASSESS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({
          curriculum: curriculum.label,
          classLevel,
          writingType: `${subject.label} — ${assessmentType}`,
          language: "English",
          studentWriting: context,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Grading failed" }));
        toast({ title: "Error", description: err.error, variant: "destructive" });
        return;
      }
      const data = await resp.json();
      setAssessment(data);
      // Scroll to output
      setTimeout(() => document.getElementById("assessment-output")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to grade. Please try again.", variant: "destructive" });
    } finally {
      setIsAssessing(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setCurriculumId(""); setSubjectId(""); setClassLevel(""); setAssessmentType("");
    setPages([]); setQuestionPaper(""); setMarkingScheme(""); setMarkingStyle("standard");
    setAssessment(null);
  };

  // ---------------- Render ----------------
  return (
    <div>
      <Helmet>
        <title>AI Assessment Marker | Teazy AI</title>
        <meta name="description" content="Upload handwritten exam scripts and receive AI-assisted marking, curriculum-aligned scoring and classroom-ready reports." />
      </Helmet>

      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-navy font-heading">AI Assessment Marker</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">
          Upload handwritten exam scripts and receive AI-assisted marking, curriculum-aligned scoring, detailed
          feedback, and classroom-ready reports.
        </p>
      </header>

      {/* Stepper */}
      <div className="mb-6 overflow-x-auto">
        <ol className="flex items-center gap-2 min-w-max">
          {STEPS.map((s) => {
            const active = s.id === step;
            const done = s.id < step;
            return (
              <li key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => (done ? setStep(s.id) : undefined)}
                  disabled={!done && !active}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                    active && "bg-accent text-accent-foreground border-accent",
                    done && !active && "bg-accent/10 text-accent border-accent/30 hover:bg-accent/20",
                    !active && !done && "bg-muted text-muted-foreground border-border",
                  )}
                >
                  <span className={cn(
                    "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                    active ? "bg-white/20" : done ? "bg-accent/20" : "bg-muted-foreground/10",
                  )}>
                    {done ? <Check className="h-3 w-3" /> : s.id}
                  </span>
                  <span className="hidden sm:inline">{s.short}</span>
                </button>
                {s.id < 8 && <span className="text-muted-foreground/40">→</span>}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-navy mb-4">
          Step {step}. {STEPS[step - 1].title}
        </h2>

        {/* STEP 1 - Curriculum */}
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CURRICULA.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setCurriculumId(c.id); setSubjectId(""); setClassLevel(""); }}
                className={cn(
                  "text-left rounded-xl border-2 p-4 transition-all hover:shadow-md hover:border-accent/50",
                  curriculumId === c.id ? "border-accent bg-accent/5 shadow-md" : "border-border bg-background",
                )}
              >
                <div className="text-3xl mb-2">{c.flag}</div>
                <div className="font-semibold text-navy">{c.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{c.country}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  {c.subjects.length} subjects · {c.classes.length} {c.terminology.class.toLowerCase()} levels
                </div>
              </button>
            ))}
          </div>
        )}

        {/* STEP 2 - Subject */}
        {step === 2 && curriculum && (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Showing subjects for <span className="font-medium text-foreground">{curriculum.label}</span>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {curriculum.subjects.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSubjectId(sub.id)}
                  className={cn(
                    "text-left rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    subjectId === sub.id
                      ? "border-accent bg-accent/10 text-accent font-semibold"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 - Class */}
        {step === 3 && curriculum && (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Select the {curriculum.terminology.class.toLowerCase()} for this script.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {curriculum.classes.map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setClassLevel(cls)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-sm transition-colors",
                    classLevel === cls
                      ? "border-accent bg-accent/10 text-accent font-semibold"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4 - What are you marking today */}
        {step === 4 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ASSESSMENT_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAssessmentType(t.id)}
                className={cn(
                  "text-left rounded-xl border-2 p-4 transition-all hover:border-accent/50",
                  assessmentType === t.id ? "border-accent bg-accent/5" : "border-border",
                )}
              >
                <div className="font-semibold text-navy">{t.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.hint}</div>
              </button>
            ))}
          </div>
        )}

        {/* STEP 5 - Upload scripts */}
        {step === 5 && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-xl p-6 bg-muted/30 text-center"
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            >
              <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Drag and drop clear photos of the student's script, or use the buttons below.
                <br />
                <span className="text-xs">Add multiple pages — each is OCR'd automatically. JPG / PNG, max 10MB per file.</span>
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" /> Upload files
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()}>
                  <Camera className="mr-2 h-4 w-4" /> Take photo
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} className="hidden" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} className="hidden" />
            </div>

            {pages.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{pages.length} page{pages.length > 1 ? "s" : ""} added</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {pages.map((p, i) => (
                    <div key={p.id} className="relative group">
                      <img src={p.preview} alt={`Page ${i + 1}`} className="w-full h-24 object-cover rounded-md border border-border" />
                      <span className="absolute bottom-1 left-1 text-[10px] font-bold bg-navy/80 text-white px-1.5 py-0.5 rounded">
                        Page {i + 1}
                      </span>
                      {p.ocrLoading && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md">
                          <Loader2 className="h-4 w-4 text-white animate-spin" />
                        </span>
                      )}
                      {p.ocrDone && (
                        <span className="absolute top-1 left-1 bg-green-600 text-white rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removePage(p.id)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 6 - Optional guides */}
        {step === 6 && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Provide the original question paper and/or marking scheme to boost accuracy.
              When supplied, the AI will prioritise these over its own inference. All fields are optional.
            </p>

            <div className="space-y-2">
              <Label htmlFor="qp">Question paper (paste text)</Label>
              <Textarea
                id="qp"
                placeholder="Paste the exam questions here…"
                value={questionPaper}
                onChange={(e) => setQuestionPaper(e.target.value)}
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="ms">Marking scheme / rubric</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateRubric}
                  disabled={rubricLoading || !subject || !classLevel || !assessmentType}
                >
                  {rubricLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-2 h-3.5 w-3.5" />}
                  Generate with AI
                </Button>
              </div>
              <Textarea
                id="ms"
                placeholder="Paste your official marking guide, or generate a starter rubric with AI and edit it."
                value={markingScheme}
                onChange={(e) => setMarkingScheme(e.target.value)}
                className="min-h-[160px]"
              />
            </div>
          </div>
        )}

        {/* STEP 7 - OCR review */}
        {step === 7 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Review and correct the extracted handwriting for each page before grading begins.
            </p>
            {pages.length === 0 && (
              <p className="text-sm text-destructive">No pages uploaded — go back to Step 5.</p>
            )}
            {pages.map((p, i) => (
              <div key={p.id} className="border border-border rounded-lg p-3 bg-muted/20">
                <div className="flex items-start gap-3">
                  <img src={p.preview} alt={`Page ${i + 1}`} className="h-24 w-20 object-cover rounded border border-border flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Page {i + 1}</Label>
                      {p.ocrLoading ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Reading…
                        </span>
                      ) : p.ocrDone ? (
                        <span className="text-xs text-green-600 font-medium">✓ Extracted</span>
                      ) : (
                        <Button type="button" size="sm" variant="outline" onClick={() => runOcr(p.id)}>Run OCR</Button>
                      )}
                    </div>
                    <Textarea
                      value={p.extractedText}
                      onChange={(e) => setPages((prev) => prev.map((pp) => pp.id === p.id ? { ...pp, extractedText: e.target.value, ocrDone: true } : pp))}
                      placeholder="Extracted handwriting will appear here — edit any errors."
                      className="min-h-[100px] text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 8 - Marking style + summary */}
        {step === 8 && curriculum && subject && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MARKING_STYLES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMarkingStyle(m.id)}
                  className={cn(
                    "text-left rounded-xl border-2 p-4 transition-all",
                    markingStyle === m.id ? "border-accent bg-accent/5" : "border-border hover:border-accent/50",
                  )}
                >
                  <div className="font-semibold text-navy">{m.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.hint}</div>
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1 text-sm">
              <div className="font-semibold text-navy mb-1 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Ready to grade
              </div>
              <SummaryRow label="Curriculum" value={curriculum.label} />
              <SummaryRow label="Subject" value={subject.label} />
              <SummaryRow label="Class" value={classLevel} />
              <SummaryRow label="Marking" value={ASSESSMENT_TYPES.find((t) => t.id === assessmentType)?.label || "—"} />
              <SummaryRow label="Pages" value={`${pages.length}`} />
              <SummaryRow label="Style" value={MARKING_STYLES.find((m) => m.id === markingStyle)?.label || "—"} />
              <SummaryRow label="Question paper" value={questionPaper ? "Provided" : "Not provided"} />
              <SummaryRow label="Marking scheme" value={markingScheme ? "Provided" : "Not provided"} />
            </div>

            <Button
              type="button"
              onClick={runAssessment}
              disabled={isAssessing}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base h-12"
            >
              {isAssessing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Grading script…</>
              ) : (
                <><Sparkles className="mr-2 h-5 w-5" /> Grade Assessment</>
              )}
            </Button>
          </div>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={goPrev} disabled={step === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          {step < 8 ? (
            <Button type="button" onClick={goNext} disabled={!canAdvance[step]}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={resetWizard}>Start over</Button>
          )}
        </div>
      </div>

      {isAssessing && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="h-10 w-10 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Analyzing student script…</p>
        </div>
      )}

      {assessment && (
        <div id="assessment-output" className="mt-8">
          <WritingAssessmentOutput data={assessment} />
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}
