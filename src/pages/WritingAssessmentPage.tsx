import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  Loader2, Camera, Upload, X, Check, Sparkles, Wand2, Zap, Crown,
  ChevronDown, FileText, Settings2, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAssessmentStatus } from "@/hooks/useAssessmentStatus";
import { useAuth } from "@/hooks/useAuth";
import { useAuthGate } from "@/hooks/useAuthGate";
import { supabase } from "@/integrations/supabase/client";
import BuyPackModal from "@/components/BuyPackModal";
import {
  CURRICULA, ASSESSMENT_TYPES, MARKING_STYLES,
  getCurriculum, subjectsForClass, isTerminalExamBody,
  type AssessmentTypeId, type MarkingStyleId,
} from "@/lib/curricula";

import AssessmentResults, { type AssessmentResult } from "@/components/AssessmentResults";
import SubjectCombobox from "@/components/SubjectCombobox";
import UpgradeModal from "@/components/UpgradeModal";
import UsageTracker from "@/components/UsageTracker";

const OCR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-handwriting`;
const ASSESS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assess-script`;
const RUBRIC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assess-writing`;
const AUTH_HEADER = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

interface ScriptPage {
  id: string;
  preview: string;
  mime: string;
  base64: string;
  extractedText: string;
  ocrLoading: boolean;
  ocrDone: boolean;
}

// Heuristic to infer assessment type from combined OCR text + subject profile.
function inferAssessmentType(
  text: string,
  subjectProfile?: string,
): { id: AssessmentTypeId; confidence: "high" | "low" } {
  const t = text.toLowerCase();
  const hasNumbered = /(^|\n)\s*(?:q?\d{1,2}[.)a-c]|\b(?:question|q)\s*\d)/i.test(text);
  const hasCalc = /[=+\-×÷*/]\s*\d|\d\s*[=+\-×÷*/]|\bequation\b|\bsolve\b/.test(t);
  const hasChem = /\b(mol|reaction|acid|base|hcl|naoh|→|->)\b|[A-Z][a-z]?\d/.test(text);
  const longParas = text.split(/\n{2,}/).some((p) => p.trim().split(/\s+/).length > 80);
  const wordCount = text.trim().split(/\s+/).length;

  if (subjectProfile === "math" || hasCalc) return { id: "theory", confidence: "high" };
  if (subjectProfile === "sciences" && (hasChem || hasNumbered)) return { id: "theory", confidence: "high" };
  if (subjectProfile === "english" || subjectProfile === "literature") {
    if (longParas || wordCount > 200) return { id: "essay", confidence: "high" };
  }
  if (longParas && !hasNumbered) return { id: "essay", confidence: "high" };
  if (hasNumbered) return { id: "theory", confidence: "high" };
  if (wordCount > 40) return { id: "mixed", confidence: "low" };
  return { id: "mixed", confidence: "low" };
}

export default function WritingAssessmentPage() {
  const { toast } = useToast();
  const status = useAssessmentStatus();
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const [showBuyPack, setShowBuyPack] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Primary inputs
  const [curriculumId, setCurriculumId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [pages, setPages] = useState<ScriptPage[]>([]);

  // Advanced (optional)
  const [assessmentType, setAssessmentType] = useState<AssessmentTypeId | "">("");
  const [markingStyle, setMarkingStyle] = useState<MarkingStyleId>("standard");
  const [questionPaper, setQuestionPaper] = useState("");
  const [markingScheme, setMarkingScheme] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showOcrReview, setShowOcrReview] = useState(false);
  const [rubricLoading, setRubricLoading] = useState(false);

  const [isAssessing, setIsAssessing] = useState(false);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [confirmType, setConfirmType] = useState<AssessmentTypeId | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const qpFileRef = useRef<HTMLInputElement>(null);
  const msFileRef = useRef<HTMLInputElement>(null);

  const curriculum = useMemo(() => getCurriculum(curriculumId), [curriculumId]);
  const availableSubjects = useMemo(
    () => (curriculum ? subjectsForClass(curriculum, classLevel) : []),
    [curriculum, classLevel],
  );
  const subject = useMemo(
    () => availableSubjects.find((s) => s.id === subjectId),
    [availableSubjects, subjectId],
  );

  // WAEC/NECO are SS-3 only — auto-set and skip the class picker.
  useEffect(() => {
    if (!curriculum) return;
    if (isTerminalExamBody(curriculum.id)) {
      if (classLevel !== "SS 3") setClassLevel("SS 3");
    }
  }, [curriculum, classLevel]);

  // If the previously-selected subject isn't available for the current class, clear it.
  useEffect(() => {
    if (subjectId && !availableSubjects.some((s) => s.id === subjectId)) {
      setSubjectId("");
    }
  }, [availableSubjects, subjectId]);


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

  const runOcr = async (pageId: string, base64: string, mime: string) => {
    setPages((prev) => prev.map((p) => p.id === pageId ? { ...p, ocrLoading: true } : p));
    try {
      const resp = await fetch(OCR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({ imageBase64: base64, mimeType: mime }),
      });
      const data = await resp.json();
      const text = data.extractedText === "[UNREADABLE]" ? "" : (data.extractedText || "");
      setPages((prev) => prev.map((p) => p.id === pageId
        ? { ...p, extractedText: text, ocrLoading: false, ocrDone: true } : p));
    } catch {
      setPages((prev) => prev.map((p) => p.id === pageId ? { ...p, ocrLoading: false } : p));
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    for (const file of arr) {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) {
        toast({ title: "Unsupported file", description: `${file.name} — upload an image or PDF.`, variant: "destructive" });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name} is over 10MB.`, variant: "destructive" });
        continue;
      }
      const { dataUrl, base64, mime } = await readFile(file);
      const id = crypto.randomUUID();
      setPages((prev) => [...prev, { id, preview: isImage ? dataUrl : "", mime, base64, extractedText: "", ocrLoading: false, ocrDone: false }]);
      setTimeout(() => runOcr(id, base64, mime), 30);
    }
  };

  const removePage = (id: string) => setPages((prev) => prev.filter((p) => p.id !== id));

  const generateRubric = async () => {
    if (!curriculum || !subject || !classLevel) return;
    setRubricLoading(true);
    try {
      const resp = await fetch(RUBRIC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({
          curriculum: curriculum.label,
          classLevel,
          writingType: `RUBRIC — ${subject.label}`,
          language: "English",
          studentWriting: `Generate a concise marking rubric (bulleted, max 12 lines) for a ${classLevel} ${subject.label} assessment under the ${curriculum.label} curriculum.`,
        }),
      });
      const data = await resp.json();
      const rubricText = data.teacherComment || data.suggestedRewrite || JSON.stringify(data, null, 2);
      setMarkingScheme(rubricText);
      toast({ title: "Rubric generated", description: "Review and edit before grading." });
    } catch {
      toast({ title: "Couldn't generate rubric", variant: "destructive" });
    } finally {
      setRubricLoading(false);
    }
  };

  const quotaExhausted =
    !status.loading &&
    (
      (status.plan === "free" && (status.freeUsed ?? 0) >= (status.freeLimit ?? 2)) ||
      (status.plan === "standard" &&
        (status.monthlyUsed ?? 0) >= (status.monthlyLimit ?? 40) &&
        (status.packRemaining ?? 0) <= 0)
    );

  const runAssessment = async (typeOverride?: AssessmentTypeId) => {
    if (!curriculum || !subject) return;
    if (!requireAuth({ feature: "writing" })) return;
    const combinedText = pages.map((p, i) => `--- Page ${i + 1} ---\n${p.extractedText.trim()}`).join("\n\n");
    if (combinedText.trim().length < 20) {
      toast({ title: "Not enough text extracted", description: "Try clearer photos or open OCR review in Advanced Options.", variant: "destructive" });
      return;
    }
    if (quotaExhausted) {
      if (status.plan === "free") setUpgradeOpen(true);
      else toast({ title: "You've reached your Assessment limit.", variant: "destructive" });
      return;
    }

    // Infer type if not manually set
    let finalType: AssessmentTypeId;
    if (typeOverride) {
      finalType = typeOverride;
    } else if (assessmentType) {
      finalType = assessmentType;
    } else {
      const inferred = inferAssessmentType(combinedText, subject.profile);
      if (inferred.confidence === "low") {
        setConfirmType(inferred.id);
        return;
      }
      finalType = inferred.id;
    }
    setConfirmType(null);

    setIsAssessing(true);
    setAssessment(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : AUTH_HEADER;
      const resp = await fetch(ASSESS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          curriculum: curriculum.label,
          subject: subject.label,
          subjectProfile: subject.profile,
          classLevel,
          assessmentType: finalType,
          markingStyle,
          questionPaper: questionPaper.trim() || undefined,
          markingScheme: markingScheme.trim() || undefined,
          studentScript: combinedText,
          language: "English",
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Grading failed" }));
        if (resp.status === 402) {
          if (status.plan === "free") setUpgradeOpen(true);
          else toast({ title: "Upload limit reached", description: err.error, variant: "destructive" });
          await status.refresh();
          return;
        }
        toast({ title: "Error", description: err.error, variant: "destructive" });
        return;
      }
      const data = (await resp.json()) as AssessmentResult;
      setAssessment(data);
      await status.refresh();
      if (user) {
        const title = `${subject.label} · ${new Date().toLocaleDateString()}`;
        supabase.from("saved_assessments").insert({
          user_id: user.id,
          title,
          curriculum: curriculum.label,
          subject: subject.label,
          class_level: classLevel || null,
          assessment_type: finalType,
          student_name: null,
          awarded: data.overallScore ?? null,
          max_score: data.maxScore ?? null,
          percent: data.percentage ?? null,
          grade: data.grade ?? null,
          result: data as any,
          script_text: combinedText,
        }).then(({ error }) => { if (error) console.error("save assessment failed", error); });
      }
      setTimeout(() => document.getElementById("assessment-output")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to grade. Please try again.", variant: "destructive" });
    } finally {
      setIsAssessing(false);
    }
  };

  const resetAll = () => {
    setCurriculumId(""); setSubjectId(""); setClassLevel("");
    setPages([]); setAssessmentType(""); setQuestionPaper(""); setMarkingScheme("");
    setMarkingStyle("standard"); setAssessment(null); setShowAdvanced(false); setShowOcrReview(false);
  };

  const uploadReady = pages.length > 0 && pages.every((p) => p.ocrDone);
  const readyToGrade = !!(curriculum && subject && classLevel && uploadReady && pages.some((p) => p.extractedText.trim().length > 20));

  return (
    <div>
      <Helmet>
        <title>Writing Assessment | Teazy AI</title>
        <meta name="description" content="Upload handwritten exam scripts and receive AI-assisted marking in three steps." />
      </Helmet>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy font-heading">Writing Assessment</h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Three quick steps: pick your curriculum, pick the subject, upload the script.
            The AI handles the rest.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/writing/batches" className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-navy hover:bg-muted">My batches</Link>
          <Link to="/app/writing/bulk" className="inline-flex items-center gap-1 rounded-md bg-accent/10 border border-accent/30 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20">
            <Crown className="h-3 w-3" /> Bulk marking (Pro)
          </Link>
        </div>
      </header>

      <UsageMeter status={status} onBuyPack={() => setShowBuyPack(true)} />

      {user && (
        <div className="mb-4">
          <UsageTracker only="writing" compact />
        </div>
      )}

      <div className="space-y-6">
        {/* STEP 1 — Curriculum */}
        <StepCard n={1} title="Select curriculum" done={!!curriculumId}>
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
              </button>
            ))}
          </div>
        </StepCard>

        {/* STEP 2 — Class / grade (skipped for terminal exam bodies) */}
        {curriculum && !isTerminalExamBody(curriculum.id) && (
          <StepCard n={2} title={`Select ${curriculum.terminology.class.toLowerCase()}`} done={!!classLevel}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {curriculum.classes.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClassLevel(c)}
                  className={cn(
                    "rounded-md border px-2 py-2 text-sm font-medium transition-colors",
                    classLevel === c
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {/* STEP 3 — Subject (filtered by class) */}
        {curriculum && (isTerminalExamBody(curriculum.id) || classLevel) && (
          <StepCard n={isTerminalExamBody(curriculum.id) ? 2 : 3} title="Select subject" done={!!subjectId}>
            {!isTerminalExamBody(curriculum.id) && (
              <p className="text-xs text-muted-foreground mb-2">
                Showing subjects offered at <span className="font-medium text-foreground">{classLevel}</span>.
              </p>
            )}
            {isTerminalExamBody(curriculum.id) && (
              <p className="text-xs text-muted-foreground mb-2">
                {curriculum.label} is a terminal SS 3 examination — all listed subjects are SS 3 papers.
              </p>
            )}
            <SubjectCombobox
              subjects={availableSubjects}
              value={subjectId}
              onChange={setSubjectId}
              placeholder={`Search ${curriculum.label} subjects...`}
            />
          </StepCard>
        )}

        {/* STEP 4 — Upload */}
        {curriculum && subject && classLevel && (
          <StepCard n={isTerminalExamBody(curriculum.id) ? 3 : 4} title="Upload assessment" done={uploadReady && pages.length > 0}>

            <div
              className="border-2 border-dashed border-border rounded-xl p-8 bg-muted/30 text-center cursor-pointer hover:border-accent/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            >
              <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">Drag &amp; drop scripts, or click to choose</p>
              <p className="text-xs text-muted-foreground mt-1">
                Images, multi-page PDF, or multiple pages. The AI reads them all automatically.
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  <Upload className="mr-2 h-4 w-4" /> Choose files
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                  <Camera className="mr-2 h-4 w-4" /> Take photo
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple className="hidden"
                onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} />
            </div>

            {pages.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {pages.length} page{pages.length > 1 ? "s" : ""} • {pages.filter((p) => p.ocrDone).length} read
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {pages.map((p, i) => (
                    <div key={p.id} className="relative group">
                      {p.preview ? (
                        <img src={p.preview} alt={`Page ${i + 1}`} className="w-full h-24 object-cover rounded-md border border-border" />
                      ) : (
                        <div className="w-full h-24 rounded-md border border-border bg-muted flex items-center justify-center">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
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
                      <button type="button" onClick={() => removePage(p.id)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </StepCard>
        )}

        {/* Gentle optional prompt */}
        {uploadReady && pages.length > 0 && !questionPaper && !markingScheme && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-foreground/90">
              For even more accurate marking, you can optionally upload the original question paper or marking scheme.
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => { setShowAdvanced(true); setTimeout(() => qpFileRef.current?.click(), 100); }}>
                Upload Question Paper
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowAdvanced(true); setTimeout(() => msFileRef.current?.click(), 100); }}>
                Upload Marking Scheme
              </Button>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => runAssessment()}>
                Continue without them
              </Button>
            </div>
          </div>
        )}

        {/* Advanced Options */}
        {curriculum && (
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-navy hover:bg-muted transition-colors">
                <span className="flex items-center gap-2"><Settings2 className="h-4 w-4" /> Advanced Options (Optional)</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="rounded-xl border border-border bg-card p-5 space-y-6">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Assessment type</Label>
                  <p className="text-xs text-muted-foreground mb-2">Leave on Auto and the AI will infer it from the script.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button type="button" onClick={() => setAssessmentType("")}
                      className={cn("rounded-md border px-3 py-2 text-xs text-left",
                        !assessmentType ? "border-accent bg-accent/10 text-accent font-semibold" : "border-border hover:bg-muted")}>
                      Auto-detect
                    </button>
                    {ASSESSMENT_TYPES.map((t) => (
                      <button key={t.id} type="button" onClick={() => setAssessmentType(t.id)}
                        className={cn("rounded-md border px-3 py-2 text-xs text-left",
                          assessmentType === t.id ? "border-accent bg-accent/10 text-accent font-semibold" : "border-border hover:bg-muted")}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Marking style</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {MARKING_STYLES.map((m) => (
                      <button key={m.id} type="button" onClick={() => setMarkingStyle(m.id)}
                        className={cn("rounded-md border p-3 text-left",
                          markingStyle === m.id ? "border-accent bg-accent/5" : "border-border hover:bg-muted")}>
                        <div className="text-sm font-semibold text-navy">{m.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{m.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="qp">Question paper</Label>
                      <Button type="button" variant="ghost" size="sm" onClick={() => qpFileRef.current?.click()}>
                        <Upload className="mr-1 h-3.5 w-3.5" /> Upload file
                      </Button>
                    </div>
                    <Textarea id="qp" value={questionPaper} onChange={(e) => setQuestionPaper(e.target.value)} placeholder="Paste the exam questions…" className="min-h-[120px]" />
                    <input ref={qpFileRef} type="file" accept="image/*,application/pdf,text/plain" className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        if (f.type.startsWith("text/")) setQuestionPaper(await f.text());
                        else { const { base64, mime } = await readFile(f); const r = await fetch(OCR_URL, { method: "POST", headers: { "Content-Type": "application/json", ...AUTH_HEADER }, body: JSON.stringify({ imageBase64: base64, mimeType: mime }) }); const d = await r.json(); setQuestionPaper(d.extractedText || ""); }
                        e.target.value = "";
                      }} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="ms">Marking scheme</Label>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => msFileRef.current?.click()}>
                          <Upload className="mr-1 h-3.5 w-3.5" /> Upload
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={generateRubric} disabled={rubricLoading || !subject}>
                          {rubricLoading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-1 h-3.5 w-3.5" />}
                          Generate AI Rubric
                        </Button>
                      </div>
                    </div>
                    <Textarea id="ms" value={markingScheme} onChange={(e) => setMarkingScheme(e.target.value)} placeholder="Paste the marking scheme, or generate one with AI." className="min-h-[120px]" />
                    <input ref={msFileRef} type="file" accept="image/*,application/pdf,text/plain" className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]; if (!f) return;
                        if (f.type.startsWith("text/")) setMarkingScheme(await f.text());
                        else { const { base64, mime } = await readFile(f); const r = await fetch(OCR_URL, { method: "POST", headers: { "Content-Type": "application/json", ...AUTH_HEADER }, body: JSON.stringify({ imageBase64: base64, mimeType: mime }) }); const d = await r.json(); setMarkingScheme(d.extractedText || ""); }
                        e.target.value = "";
                      }} />
                  </div>
                </div>

                {pages.length > 0 && (
                  <div>
                    <button type="button" onClick={() => setShowOcrReview((v) => !v)}
                      className="text-sm font-medium text-accent hover:underline flex items-center gap-1">
                      <Brain className="h-4 w-4" /> {showOcrReview ? "Hide" : "Review"} extracted text (OCR)
                    </button>
                    {showOcrReview && (
                      <div className="mt-3 space-y-3">
                        {pages.map((p, i) => (
                          <div key={p.id} className="border border-border rounded-lg p-3 bg-muted/20">
                            <Label className="text-xs">Page {i + 1}</Label>
                            <Textarea
                              value={p.extractedText}
                              onChange={(e) => setPages((prev) => prev.map((pp) => pp.id === p.id ? { ...pp, extractedText: e.target.value, ocrDone: true } : pp))}
                              className="min-h-[80px] text-sm mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Confirm inferred type when low confidence */}
        {confirmType && (
          <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 space-y-3">
            <div className="text-sm">
              We're not fully sure what kind of assessment this is. Please confirm:
            </div>
            <div className="flex flex-wrap gap-2">
              {(["essay", "theory", "mixed", "practical", "ca"] as AssessmentTypeId[]).map((t) => (
                <Button key={t} size="sm" variant="outline" onClick={() => runAssessment(t)}>
                  {ASSESSMENT_TYPES.find((x) => x.id === t)?.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Primary CTA + status */}
        {readyToGrade && !confirmType && (
          <div className="rounded-xl border border-border bg-card p-5">
            {quotaExhausted ? (
              <div className="space-y-3">
                <div className="font-semibold text-destructive">You've reached your Assessment limit.</div>
                <div className="grid grid-cols-2 gap-2">
                  {status.plan === "standard" && (
                    <Button onClick={() => setShowBuyPack(true)} variant="outline">
                      <Zap className="mr-2 h-4 w-4" /> Buy upload pack
                    </Button>
                  )}
                  <Button asChild className={status.plan === "standard" ? "" : "col-span-2"}>
                    <Link to="/pricing"><Crown className="mr-2 h-4 w-4" /> {status.plan === "free" ? "See plans" : "Upgrade to Pro"}</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{subject?.label}</span> · {classLevel} · {pages.length} page{pages.length > 1 ? "s" : ""} · {assessmentType ? ASSESSMENT_TYPES.find((t) => t.id === assessmentType)?.label : "Auto-detect type"}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={resetAll}>Start over</Button>
                  <Button
                    type="button"
                    onClick={() => runAssessment()}
                    disabled={isAssessing}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold h-11 px-6"
                  >
                    {isAssessing
                      ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Grading…</>
                      : <><Sparkles className="mr-2 h-5 w-5" /> Grade Assessment</>}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isAssessing && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="h-10 w-10 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Analyzing student script…</p>
        </div>
      )}

      {assessment && (
        <div id="assessment-output" className="mt-8">
          <AssessmentResults data={assessment} onChange={setAssessment} />
        </div>
      )}

      <BuyPackModal open={showBuyPack} onClose={() => setShowBuyPack(false)} onSuccess={() => status.refresh()} />
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} feature="writing" />
    </div>
  );
}

function StepCard({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
          done ? "bg-green-600 text-white" : "bg-accent text-accent-foreground")}>
          {done ? <Check className="h-4 w-4" /> : n}
        </div>
        <h2 className="text-lg font-semibold text-navy">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function UsageMeter({
  status,
  onBuyPack,
}: {
  status: ReturnType<typeof useAssessmentStatus>;
  onBuyPack: () => void;
}) {
  if (status.loading) return null;
  if (status.plan === "pro") {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
        <Crown className="h-4 w-4 text-accent" />
        <span className="font-semibold text-navy">Assessment Pro</span>
        <span className="text-muted-foreground">, unlimited uploads.</span>
      </div>
    );
  }
  if (status.plan === "standard") {
    const used = status.monthlyUsed ?? 0;
    const limit = status.monthlyLimit ?? 40;
    const remaining = Math.max(0, limit - used);
    const pct = Math.min(100, Math.round((used / limit) * 100));
    return (
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-semibold text-navy">{remaining} / {limit}</span>
            <span className="text-muted-foreground"> uploads remaining this month</span>
            {status.packRemaining > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-success/10 text-success text-xs font-semibold px-2 py-0.5">
                <Zap className="h-3 w-3" /> +{status.packRemaining} pack
              </span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={onBuyPack}>
            <Zap className="mr-1 h-3.5 w-3.5" /> Buy more
          </Button>
        </div>
        <Progress value={pct} className="mt-2 h-1.5" />
      </div>
    );
  }
  const used = status.freeUsed ?? 0;
  const limit = status.freeLimit ?? 2;
  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="text-sm">
        <span className="font-semibold text-navy">{Math.max(0, limit - used)} of {limit}</span>
        <span className="text-muted-foreground"> free Writing Assessment uploads left.</span>
      </div>
      <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
        <Link to="/pricing"><Sparkles className="mr-1 h-3.5 w-3.5" /> Upgrade</Link>
      </Button>
    </div>
  );
}
