import { useMemo, useState } from "react";
import {
  Award, ShieldAlert, TrendingUp, AlertCircle, Bug, BookOpen,
  MessageSquare, ClipboardList, Copy, CheckCircle, Download,
  ChevronDown, Pencil, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface PerQuestion {
  number: string;
  questionText?: string;
  studentAnswer?: string;
  awarded: number;
  max: number;
  feedback: string;
}

export interface AssessmentResult {
  overallScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  confidence: number;
  manualReviewRecommended: boolean;
  summary: string;
  perQuestion: PerQuestion[];
  strengths: string[];
  improvements: string[];
  commonErrors: string[];
  suggestedIntervention: string;
  suggestedHomework: string;
  curriculumObjectives: string[];
  teacherComment: string;
  meta?: {
    curriculum?: string;
    subject?: string;
    classLevel?: string;
    assessmentType?: string;
    markingStyle?: string;
  };
}

interface Props {
  data: AssessmentResult;
  onChange?: (next: AssessmentResult) => void;
}

function tone(pct: number) {
  if (pct >= 70) return { text: "text-green-700", bg: "bg-green-50", border: "border-green-200", bar: "bg-green-500" };
  if (pct >= 50) return { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", bar: "bg-amber-500" };
  return { text: "text-red-700", bg: "bg-red-50", border: "border-red-200", bar: "bg-red-500" };
}

export default function AssessmentResults({ data, onChange }: Props) {
  const { toast } = useToast();
  const [state, setState] = useState<AssessmentResult>(data);
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [editingComment, setEditingComment] = useState(false);
  const [approved, setApproved] = useState(false);
  const [copied, setCopied] = useState(false);

  const t = tone(state.percentage);

  const update = (patch: Partial<AssessmentResult>) => {
    const next = { ...state, ...patch };
    setState(next);
    onChange?.(next);
  };

  const updateQuestion = (idx: number, patch: Partial<PerQuestion>) => {
    const perQuestion = state.perQuestion.map((q, i) => (i === idx ? { ...q, ...patch } : q));
    const overallScore = perQuestion.reduce((s, q) => s + (Number(q.awarded) || 0), 0);
    const maxScore = perQuestion.reduce((s, q) => s + (Number(q.max) || 0), 0) || state.maxScore;
    const percentage = maxScore > 0 ? Math.round((overallScore / maxScore) * 100) : state.percentage;
    update({ perQuestion, overallScore, maxScore, percentage });
  };

  const feedbackText = useMemo(() => buildReportText(state), [state]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(feedbackText);
    setCopied(true);
    toast({ title: "Copied", description: "Full report copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([feedbackText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment-${(state.meta?.subject || "report").toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApprove = () => {
    setApproved(true);
    try {
      const key = "teazy.assessments.history";
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      list.unshift({ savedAt: new Date().toISOString(), result: state });
      localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
    } catch { /* ignore */ }
    toast({ title: "Grading approved", description: "Saved to your assessment history." });
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <CheckCircle className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Copied" : "Copy report"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" /> Download .txt
        </Button>
        <Button
          size="sm"
          onClick={handleApprove}
          disabled={approved}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Check className="mr-2 h-4 w-4" />
          {approved ? "Approved" : "Approve final grading"}
        </Button>
      </div>

      {/* Overall score header */}
      <div className={cn("rounded-2xl border-2 p-6", t.border, t.bg)}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Overall result</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className={cn("text-5xl font-bold", t.text)}>{state.percentage}%</span>
              <span className="text-muted-foreground text-lg">
                {state.overallScore} / {state.maxScore}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {state.meta?.subject && <>{state.meta.subject} · </>}
              {state.meta?.classLevel && <>{state.meta.classLevel} · </>}
              {state.meta?.assessmentType}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center rounded-xl bg-white px-4 py-3 border border-border shadow-sm">
              <Award className="h-5 w-5 text-navy" />
              <span className="text-xs text-muted-foreground mt-1">Grade</span>
              <span className="text-2xl font-bold text-navy">{state.grade}</span>
            </div>
            <div className="flex flex-col items-center rounded-xl bg-white px-4 py-3 border border-border shadow-sm">
              <span className="text-xs text-muted-foreground">Confidence</span>
              <span className={cn("text-2xl font-bold", state.confidence >= 75 ? "text-green-700" : "text-amber-700")}>
                {state.confidence}%
              </span>
            </div>
          </div>
        </div>

        {state.manualReviewRecommended && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-100 border border-amber-300 p-3 text-sm text-amber-900">
            <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Confidence is below 75% — please manually review the extracted text and per-question scoring before finalising.
            </span>
          </div>
        )}

        {state.summary && (
          <p className="mt-4 text-sm text-foreground/90 leading-relaxed">{state.summary}</p>
        )}
      </div>

      {/* Per-question breakdown */}
      {state.perQuestion.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-navy flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Per-question breakdown
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Edit any score or comment. Totals recalculate automatically.</p>
          </div>
          <ul className="divide-y divide-border">
            {state.perQuestion.map((q, idx) => {
              const open = openIdx === idx;
              const qt = tone(q.max > 0 ? (q.awarded / q.max) * 100 : 0);
              return (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => setOpenIdx(open ? null : idx)}
                    className="w-full flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0", qt.bg, qt.text)}>
                        {q.number || idx + 1}
                      </span>
                      <span className="text-sm truncate">
                        {q.questionText || q.feedback?.slice(0, 80) || `Question ${idx + 1}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={cn("text-sm font-semibold", qt.text)}>
                        {q.awarded} / {q.max}
                      </span>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                    </div>
                  </button>
                  {open && (
                    <div className="p-4 pt-0 space-y-3">
                      {q.questionText && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Question</p>
                          <p className="text-sm">{q.questionText}</p>
                        </div>
                      )}
                      {q.studentAnswer && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Student answer</p>
                          <p className="text-sm italic text-foreground/80 whitespace-pre-wrap">"{q.studentAnswer}"</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Awarded</label>
                          <Input
                            type="number"
                            value={q.awarded}
                            onChange={(e) => updateQuestion(idx, { awarded: Number(e.target.value) })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Out of</label>
                          <Input
                            type="number"
                            value={q.max}
                            onChange={(e) => updateQuestion(idx, { max: Number(e.target.value) })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Feedback</label>
                        <Textarea
                          value={q.feedback}
                          onChange={(e) => updateQuestion(idx, { feedback: e.target.value })}
                          className="mt-1 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Strengths / Improvements / Common errors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ListCard
          icon={<TrendingUp className="h-5 w-5" />}
          title="Strengths"
          colour="text-green-700"
          items={state.strengths}
          bullet="✓"
        />
        <ListCard
          icon={<AlertCircle className="h-5 w-5" />}
          title="Areas to improve"
          colour="text-amber-700"
          items={state.improvements}
          bullet="→"
        />
        <ListCard
          icon={<Bug className="h-5 w-5" />}
          title="Common errors"
          colour="text-red-700"
          items={state.commonErrors}
          bullet="•"
        />
      </div>

      {/* Intervention + homework */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextCard
          icon={<BookOpen className="h-5 w-5" />}
          title="Suggested intervention"
          text={state.suggestedIntervention}
        />
        <TextCard
          icon={<ClipboardList className="h-5 w-5" />}
          title="Suggested homework"
          text={state.suggestedHomework}
        />
      </div>

      {/* Curriculum objectives */}
      {state.curriculumObjectives.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-navy font-heading flex items-center gap-2 mb-3">
            <BookOpen className="h-5 w-5" /> Curriculum objectives to reinforce
          </h3>
          <ul className="space-y-2">
            {state.curriculumObjectives.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-accent mt-0.5">◆</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Teacher comment */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-navy font-heading flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Teacher comment
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setEditingComment((v) => !v)}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> {editingComment ? "Done" : "Edit"}
          </Button>
        </div>
        {editingComment ? (
          <Textarea
            value={state.teacherComment}
            onChange={(e) => update({ teacherComment: e.target.value })}
            className="min-h-[120px] text-sm"
          />
        ) : (
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-foreground leading-relaxed italic">"{state.teacherComment}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ListCard({
  icon, title, colour, items, bullet,
}: { icon: React.ReactNode; title: string; colour: string; items: string[]; bullet: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className={cn("font-semibold flex items-center gap-2 mb-3", colour)}>{icon} {title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-2">
          {items.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className={cn("mt-0.5", colour)}>{bullet}</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TextCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-navy flex items-center gap-2 mb-3">{icon} {title}</h3>
      <p className="text-sm text-foreground/90 leading-relaxed">{text || "—"}</p>
    </div>
  );
}

function buildReportText(r: AssessmentResult) {
  return `TEAZY AI ASSESSMENT REPORT
${r.meta?.subject ? `Subject: ${r.meta.subject}\n` : ""}${r.meta?.classLevel ? `Class: ${r.meta.classLevel}\n` : ""}${r.meta?.assessmentType ? `Type: ${r.meta.assessmentType}\n` : ""}${r.meta?.curriculum ? `Curriculum: ${r.meta.curriculum}\n` : ""}
Overall: ${r.overallScore}/${r.maxScore} (${r.percentage}%) — Grade ${r.grade}
Confidence: ${r.confidence}%${r.manualReviewRecommended ? " — MANUAL REVIEW RECOMMENDED" : ""}

Summary:
${r.summary}

Per-question:
${r.perQuestion.map((q) => `${q.number}: ${q.awarded}/${q.max} — ${q.feedback}`).join("\n")}

Strengths:
${r.strengths.map((s) => `• ${s}`).join("\n")}

Areas to improve:
${r.improvements.map((s) => `• ${s}`).join("\n")}

Common errors:
${r.commonErrors.map((s) => `• ${s}`).join("\n")}

Suggested intervention:
${r.suggestedIntervention}

Suggested homework:
${r.suggestedHomework}

Curriculum objectives to reinforce:
${r.curriculumObjectives.map((s) => `• ${s}`).join("\n")}

Teacher comment:
${r.teacherComment}`;
}
