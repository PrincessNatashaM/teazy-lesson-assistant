import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Upload, X, Crown, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useEntitlements } from "@/hooks/useEntitlements";
import { useToast } from "@/hooks/use-toast";
import { CURRICULA, getCurriculum, subjectsForClass, isTerminalExamBody, ASSESSMENT_SYSTEMS, getAssessmentSystem, isOpenSystem, customSubjectCopy } from "@/lib/curricula";
import SavedSchemePicker from "@/components/SavedSchemePicker";
import SubjectCombobox from "@/components/SubjectCombobox";
import { cn } from "@/lib/utils";
import { useAssessmentStatus } from "@/hooks/useAssessmentStatus";
import UsageCounter from "@/components/dashboard/UsageCounter";
import { quotaSummary } from "@/lib/assessmentQuota";

const OCR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-handwriting`;
const BATCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assess-batch`;
async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

interface StagedFile {
  id: string;
  file: File;
  student: string;
  preview: string;
  ocrText: string;
  ocrLoading: boolean;
  ocrDone: boolean;
}

export default function BulkAssessmentPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const { plan, loading: entLoading } = useEntitlements(null);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [params] = useSearchParams();
  const folderId = params.get("folder");
  const [folder, setFolder] = useState<{ id: string; name: string } | null>(null);
  const quota = useAssessmentStatus();
  const q = quotaSummary(quota.monthlyUsed ?? 0, quota.monthlyLimit ?? 0);
  const [totalMarks, setTotalMarks] = useState("");
  const [instructions, setInstructions] = useState("");
  const [schemeName, setSchemeName] = useState<string | null>(null);

  const [batchName, setBatchName] = useState("");
  const [sp] = useSearchParams();
  const [curriculumId, setCurriculumId] = useState(sp.get("for") === "higher-ed" ? "higher-ed" : "");
  const [subjectId, setSubjectId] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [assessmentType, setAssessmentType] = useState("Exam");
  const [questionPaper, setQuestionPaper] = useState("");
  const [markingScheme, setMarkingScheme] = useState("");
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [creating, setCreating] = useState(false);

  const curriculum = useMemo(() => getAssessmentSystem(curriculumId), [curriculumId]);
  const availableSubjects = useMemo(
    () => (curriculum ? subjectsForClass(curriculum, classLevel) : []),
    [curriculum, classLevel],
  );
  const [customSubject, setCustomSubject] = useState("");
  const openSystem = isOpenSystem(curriculumId);
  const subject = openSystem
    ? (customSubject.trim() ? { id: "custom", label: customSubject.trim().slice(0, 120), profile: "general" as const } : undefined)
    : availableSubjects.find((s) => s.id === subjectId);
  const terminal = curriculum ? isTerminalExamBody(curriculum.id) : false;

  // WAEC/NECO: auto-lock class to SS 3. Open systems: single implicit level.
  useEffect(() => {
    if (terminal && classLevel !== "SS 3") setClassLevel("SS 3");
    if (openSystem && curriculum && classLevel !== curriculum.classes[0]) setClassLevel(curriculum.classes[0]);
  }, [terminal, openSystem, curriculum, classLevel]);

  // Clear subject when it's not available for the current class.
  useEffect(() => {
    if (subjectId && !availableSubjects.some((s) => s.id === subjectId)) setSubjectId("");
  }, [availableSubjects, subjectId]);


  const isPro = plan === "pro";

  // Creating from inside a subject folder: subject comes from the folder, no curriculum needed.
  useEffect(() => {
    if (!folderId || !user) return;
    supabase.from("assessment_folders").select("id,name").eq("id", folderId).maybeSingle().then(({ data }) => {
      if (!data) return;
      setFolder(data);
      setCurriculumId("other");
      setCustomSubject(data.name);
    });
  }, [folderId, user]);

  const readFile = (f: File) =>
    new Promise<{ dataUrl: string; base64: string; mime: string }>((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("read"));
      r.onload = (e) => {
        const dataUrl = e.target?.result as string;
        resolve({ dataUrl, base64: dataUrl.split(",")[1], mime: f.type });
      };
      r.readAsDataURL(f);
    });

  const runOcr = async (id: string, base64: string, mime: string) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, ocrLoading: true } : f));
    try {
      const resp = await fetch(OCR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ imageBase64: base64, mimeType: mime }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Could not read the file.");
      const text = data.extractedText === "[UNREADABLE]" ? "" : (data.extractedText || "");
      setFiles((prev) => prev.map((f) => f.id === id ? { ...f, ocrText: text, ocrLoading: false, ocrDone: true } : f));
    } catch (error) {
      setFiles((prev) => prev.map((f) => f.id === id ? { ...f, ocrLoading: false, ocrDone: false } : f));
      toast({ title: "Could not read script", description: error instanceof Error ? error.message : "Please upload the file again.", variant: "destructive" });
    }
  };

  const handleFiles = async (list: FileList | File[]) => {
    const arr = Array.from(list);
    if (q.limit > 0 && files.length + arr.length > q.remaining) {
      toast({ title: "Not enough uploads left", description: `You have ${q.remaining} scripts remaining this month.`, variant: "destructive" });
      return;
    }
    if (files.length + arr.length > 30) {
      toast({ title: "Batch too large", description: "Max 30 scripts per batch.", variant: "destructive" });
      return;
    }
    for (const file of arr) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Unsupported", description: `${file.name} isn't an image.`, variant: "destructive" });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Too large", description: `${file.name} > 10MB`, variant: "destructive" });
        continue;
      }
      const { dataUrl, base64, mime } = await readFile(file);
      const id = crypto.randomUUID();
      const student = file.name.replace(/\.[^.]+$/, "");
      setFiles((prev) => [...prev, { id, file, student, preview: dataUrl, ocrText: "", ocrLoading: false, ocrDone: false }]);
      setTimeout(() => runOcr(id, base64, mime), 30);
    }
  };

  const canStart = !!(batchName && curriculumId && subject && classLevel &&
    files.length > 0 && files.every((f) => f.ocrDone) && !q.reached && files.length <= q.remaining);

  const startBatch = async () => {
    if (!curriculum || !subject) return;
    if (!user) { requireAuth({ feature: "writing" }); return; }
    setCreating(true);
    try {
      const { data: batch, error } = await supabase.from("assessment_batches").insert({
        user_id: user.id,
        name: batchName,
        curriculum: curriculum.label,
        subject: subject.label,
        subject_profile: subject.profile,
        class_level: classLevel,
        assessment_type: assessmentType,
        marking_style: "standard",
        question_paper: questionPaper.trim() || null,
        marking_scheme: markingScheme.trim() || null,
        script_count: files.length,
        folder_id: folder?.id ?? null,
        total_marks: totalMarks.trim() && Number(totalMarks) > 0 ? Number(totalMarks) : null,
        instructions: instructions.trim().slice(0, 4000) || null,
        scheme_name: markingScheme.trim() ? (schemeName || "Custom scheme") : null,
        status: "queued",
      }).select().single();
      if (error) throw error;

      const items = files.map((f) => ({
        batch_id: batch.id,
        user_id: user.id,
        student_name: f.student.trim() || "Unnamed",
        ocr_text: f.ocrText,
        // Unreadable scripts are flagged for the teacher instead of being given a guessed mark.
        status: f.ocrText.trim().length > 20 ? "queued" : "needs_review",
        error: f.ocrText.trim().length > 20 ? null : "Script could not be read reliably. Please review it manually.",
      }));
      const { error: itemErr } = await supabase.from("assessment_batch_items").insert(items);
      if (itemErr) throw itemErr;

      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(BATCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ batchId: batch.id }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        quota.refresh();
        throw new Error(err.error || "Failed to start batch");
      }
      quota.refresh();
      toast({ title: "Batch started", description: `${files.length} scripts queued.` });
      navigate(`/app/writing/batches/${batch.id}`);
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (entLoading) return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  if (!isPro) {
    return (
      <div>
        <Helmet><title>Bulk Marking (Pro) | Teazy AI</title></Helmet>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent mb-4">
            <Crown className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy font-heading">Assessment Pro</h1>
          <p className="text-xl font-bold text-navy mt-1">₦8,000/month</p>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            Up to 1000 handwritten scripts every month. Includes saved marking schemes, subject folders and organised assessment management.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/pricing"><Sparkles className="mr-2 h-4 w-4" /> Upgrade to Assessment Pro</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/app/writing">Single-script marking</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Helmet>
        <title>Bulk Marking | Writing Assessment | Teazy AI</title>
        <meta name="description" content="Mark up to 30 handwritten student scripts in one batch with Assessment Pro." />
      </Helmet>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-navy font-heading">{folder ? `New assessment in ${folder.name}` : "Bulk Marking"}</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
              <Crown className="h-3 w-3" /> PRO
            </span>
          </div>
          <p className="text-muted-foreground mt-1">Up to 30 scripts per batch. Same paper &amp; scheme applied to all.</p>
        </div>
        <Button asChild variant="outline">{folder ? <Link to={`/dashboard/folders/${folder.id}`}>Back to {folder.name}</Link> : <Link to="/app/writing/batches">View batches →</Link>}</Button>
      </header>

      <div className="mb-6"><UsageCounter status={quota} /></div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Assessment name</Label>
            <Input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="First Semester Examination" />
          </div>
          <div>
            <Label>Assessment type</Label>
            <Input value={assessmentType} onChange={(e) => setAssessmentType(e.target.value)} placeholder="Exam / Test / CA" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Total marks</Label>
            <Input inputMode="decimal" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value.replace(/[^0-9.]/g, "").slice(0, 6))} placeholder="e.g. 70" />
          </div>
          {folder && (
            <div>
              <Label>Course / Subject</Label>
              <Input value={customSubject} maxLength={120} onChange={(e) => setCustomSubject(e.target.value)} />
            </div>
          )}
        </div>

        <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", folder && "hidden")}>
          <div>
            <Label>Curriculum / education system</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={curriculumId} onChange={(e) => { setCurriculumId(e.target.value); setSubjectId(""); setCustomSubject(""); setClassLevel(""); }}>
              <option value="">Select...</option>
              {ASSESSMENT_SYSTEMS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          {!terminal && !openSystem && (
            <div>
              <Label>Class / grade</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={classLevel} onChange={(e) => setClassLevel(e.target.value)} disabled={!curriculum}>
                <option value="">Select...</option>
                {curriculum?.classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className={terminal || openSystem ? "md:col-span-2" : ""}>
            {openSystem && curriculum ? (
              <>
                <Label>{customSubjectCopy(curriculum.id).label}</Label>
                <Input value={customSubject} maxLength={120} onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder={customSubjectCopy(curriculum.id).placeholder} />
                <p className="text-xs text-muted-foreground mt-1">No formal curriculum needed. Your marking scheme below is used as the main basis for marking.</p>
              </>
            ) : (<>
            <Label>Subject {terminal && <span className="text-xs text-muted-foreground">(SS 3 papers)</span>}</Label>
            <SubjectCombobox
              subjects={availableSubjects}
              value={subjectId}
              onChange={setSubjectId}
              disabled={!curriculum || (!terminal && !classLevel)}
              placeholder={
                !curriculum
                  ? "Select curriculum first"
                  : !terminal && !classLevel
                  ? "Select class first"
                  : `Search ${curriculum.label} subjects...`
              }
            />
            </>)}
          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Question paper (optional)</Label>
            <Textarea rows={4} value={questionPaper} onChange={(e) => setQuestionPaper(e.target.value)} placeholder="Paste the exam questions..." />
          </div>
          <div>
            <Label>Marking scheme (optional but recommended)</Label>
            <SavedSchemePicker markingScheme={markingScheme} questionPaper={questionPaper} subject={subject?.label}
              onLoad={(x) => { setMarkingScheme(x.markingScheme); setSchemeName(x.name || null); if (x.questionPaper) setQuestionPaper(x.questionPaper); }} />
            <Textarea className="mt-2" rows={4} value={markingScheme} onChange={(e) => { setMarkingScheme(e.target.value); setSchemeName(null); }} placeholder="Paste the scheme so scripts are marked against it..." />
          </div>
        </div>

        <div>
          <Label>Additional instructions (optional)</Label>
          <Textarea rows={3} maxLength={4000} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Accept equivalent answers. Penalise missing units by half a mark." />
        </div>

        {q.reached ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            You've reached your 1000-script monthly limit. Your existing assessments and folders are still available.
          </div>
        ) : (
        <div>
          <Label>Upload handwritten scripts ({files.length}/30)</Label>
          <div
            className="mt-2 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-foreground font-medium">Drop images here or click to select</p>
            <p className="text-xs text-muted-foreground">One file per student. Filename is used as student name (editable).</p>
            <input ref={inputRef} type="file" multiple accept="image/*" className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)} />
          </div>

          {files.length > 0 && (
            <ul className="mt-4 space-y-2">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
                  <img src={f.preview} alt="" className="h-12 w-12 rounded object-cover" />
                  <Input
                    value={f.student}
                    onChange={(e) => setFiles((prev) => prev.map((p) => p.id === f.id ? { ...p, student: e.target.value } : p))}
                    className="max-w-xs h-8 text-sm"
                  />
                  <div className={cn("flex-1 text-xs", f.ocrDone ? "text-muted-foreground" : "text-accent")}>
                    {f.ocrLoading ? "Reading handwriting..." : f.ocrDone ? (f.ocrText.trim().length > 20 ? "Uploaded, ready to mark" : "Hard to read: will be flagged for your review") : "Uploading..."}
                  </div>
                  <button className="text-muted-foreground hover:text-destructive" onClick={() => setFiles((prev) => prev.filter((p) => p.id !== f.id))}>
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {files.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {files.filter((f) => f.ocrDone).length} of {files.length} scripts read
            </p>
          )}
        </div>
        )}

        <div className="flex justify-end">
          <Button size="lg" onClick={startBatch} disabled={!canStart || creating}
            className="bg-accent text-accent-foreground hover:bg-accent/90">
            {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...</> : <>Grade {files.length} script{files.length === 1 ? "" : "s"} <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </div>
      </div>
    </div>
  );
}
