import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuthGate } from "@/hooks/useAuthGate";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, Brain, PenLine, Search, Copy, Download, Trash2,
  Pencil, Loader2, Eye, FileText,
} from "lucide-react";
import UsageTracker from "@/components/UsageTracker";

type SavedLesson = {
  id: string; title: string; curriculum: string | null; subject: string | null;
  class_level: string | null; topic: string | null; language: string | null;
  content: string; created_at: string; updated_at: string;
};
type SavedQuiz = {
  id: string; title: string; curriculum: string | null; subject: string | null;
  class_level: string | null; topic: string | null; language: string | null;
  quiz: any; created_at: string;
};
type SavedAssessment = {
  id: string; title: string; curriculum: string | null; subject: string | null;
  class_level: string | null; assessment_type: string | null; student_name: string | null;
  awarded: number | null; max_score: number | null; percent: number | null;
  grade: string | null; result: any; created_at: string;
};

function useSaved<T>(table: "saved_lessons" | "saved_quizzes" | "saved_assessments") {
  const { user } = useAuth();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from(table).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (!error) setRows((data as unknown as T[]) || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user, table]);
  return { rows, loading, refresh, setRows };
}

function downloadText(name: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(name: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function DateBadge({ iso }: { iso: string }) {
  return <span className="text-xs text-muted-foreground">{new Date(iso).toLocaleDateString()}</span>;
}

function useFilters<T extends { subject: string | null; curriculum: string | null; class_level: string | null; created_at: string }>(
  rows: T[],
  searchFn: (r: T) => string,
) {
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<string>("all");
  const [curriculum, setCurriculum] = useState<string>("all");
  const [classLevel, setClassLevel] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");

  const uniq = (key: keyof T) =>
    Array.from(new Set(rows.map((r) => (r[key] as string) || "").filter(Boolean))).sort();

  const subjects = uniq("subject");
  const curricula = uniq("curriculum");
  const classes = uniq("class_level");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (ql && !searchFn(r).toLowerCase().includes(ql)) return false;
      if (subject !== "all" && (r.subject || "") !== subject) return false;
      if (curriculum !== "all" && (r.curriculum || "") !== curriculum) return false;
      if (classLevel !== "all" && (r.class_level || "") !== classLevel) return false;
      if (dateRange !== "all") {
        const d = new Date(r.created_at).getTime();
        const now = Date.now();
        const days = { "7": 7, "30": 30, "90": 90 }[dateRange as "7" | "30" | "90"] ?? 0;
        if (days && now - d > days * 86400000) return false;
      }
      return true;
    });
  }, [rows, q, subject, curriculum, classLevel, dateRange, searchFn]);

  const FiltersUI = (
    <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search..." className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Select value={curriculum} onValueChange={setCurriculum}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Curriculum" /></SelectTrigger>
        <SelectContent><SelectItem value="all">All curricula</SelectItem>
          {curricula.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={subject} onValueChange={setSubject}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Subject" /></SelectTrigger>
        <SelectContent><SelectItem value="all">All subjects</SelectItem>
          {subjects.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={classLevel} onValueChange={setClassLevel}>
        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Class / Grade" /></SelectTrigger>
        <SelectContent><SelectItem value="all">All classes</SelectItem>
          {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={dateRange} onValueChange={setDateRange}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Date" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return { filtered, FiltersUI };
}

/* ---------------- LESSONS TAB ---------------- */
function LessonsTab() {
  const { rows, loading, refresh } = useSaved<SavedLesson>("saved_lessons");
  const { toast } = useToast();
  const [openRow, setOpenRow] = useState<SavedLesson | null>(null);
  const [editRow, setEditRow] = useState<SavedLesson | null>(null);
  const [editing, setEditing] = useState(false);

  const { filtered, FiltersUI } = useFilters(rows, (r) =>
    [r.title, r.subject, r.topic, r.class_level, r.curriculum].filter(Boolean).join(" "),
  );

  const del = async (id: string) => {
    if (!confirm("Delete this lesson note?")) return;
    await supabase.from("saved_lessons").delete().eq("id", id);
    refresh();
  };
  const dup = async (r: SavedLesson) => {
    const { error } = await supabase.from("saved_lessons").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      title: r.title + " (copy)",
      curriculum: r.curriculum, subject: r.subject, class_level: r.class_level,
      topic: r.topic, language: r.language, content: r.content,
    });
    if (!error) { toast({ title: "Duplicated" }); refresh(); }
  };
  const saveEdit = async () => {
    if (!editRow) return;
    setEditing(true);
    const { error } = await supabase.from("saved_lessons").update({
      title: editRow.title, content: editRow.content,
    }).eq("id", editRow.id);
    setEditing(false);
    if (!error) { toast({ title: "Saved" }); setEditRow(null); refresh(); }
  };

  if (loading) return <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  if (!rows.length) return <EmptyState icon={<BookOpen />} title="No lesson notes yet" cta={<Link to="/app"><Button>Generate a lesson</Button></Link>} />;

  return (
    <div>
      {FiltersUI}
      <div className="grid gap-3">
        {filtered.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3 border border-border rounded-lg p-4 bg-card">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-navy truncate">{r.title}</h3>
                <DateBadge iso={r.created_at} />
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                {r.subject && <span className="bg-muted rounded px-2 py-0.5">{r.subject}</span>}
                {r.class_level && <span className="bg-muted rounded px-2 py-0.5">{r.class_level}</span>}
                {r.curriculum && <span className="bg-muted rounded px-2 py-0.5">{r.curriculum}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="ghost" onClick={() => setOpenRow(r)}><Eye className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setEditRow({ ...r })}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => dup(r)}><Copy className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => downloadText(`${r.title}.txt`, r.content)}><Download className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-sm text-muted-foreground py-8 text-center">No results match your filters.</p>}
      </div>

      <Dialog open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{openRow?.title}</DialogTitle></DialogHeader>
          <pre className="whitespace-pre-wrap text-sm">{openRow?.content}</pre>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Edit lesson</DialogTitle></DialogHeader>
          {editRow && (
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={editRow.title} onChange={(e) => setEditRow({ ...editRow, title: e.target.value })} /></div>
              <div><Label>Content</Label><Textarea rows={16} value={editRow.content} onChange={(e) => setEditRow({ ...editRow, content: e.target.value })} /></div>
              <Button onClick={saveEdit} disabled={editing}>{editing ? "Saving..." : "Save changes"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- QUIZZES TAB ---------------- */
function QuizzesTab() {
  const { rows, loading, refresh } = useSaved<SavedQuiz>("saved_quizzes");
  const { toast } = useToast();
  const [openRow, setOpenRow] = useState<SavedQuiz | null>(null);
  const { filtered, FiltersUI } = useFilters(rows, (r) => [r.title, r.subject, r.topic].filter(Boolean).join(" "));

  const del = async (id: string) => {
    if (!confirm("Delete this quiz?")) return;
    await supabase.from("saved_quizzes").delete().eq("id", id);
    refresh();
  };
  const dup = async (r: SavedQuiz) => {
    const { error } = await supabase.from("saved_quizzes").insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      title: r.title + " (copy)", curriculum: r.curriculum, subject: r.subject,
      class_level: r.class_level, topic: r.topic, language: r.language, quiz: r.quiz,
    });
    if (!error) { toast({ title: "Duplicated" }); refresh(); }
  };

  const quizToText = (q: any) => {
    const lines: string[] = [];
    (q?.multipleChoice || []).forEach((it: any, i: number) => {
      lines.push(`${i + 1}. ${it.question}`);
      Object.entries(it.options || {}).forEach(([k, v]) => lines.push(`   ${k}. ${v}`));
      lines.push(`   Answer: ${it.answer}\n`);
    });
    (q?.shortAnswer || []).forEach((it: any, i: number) => {
      lines.push(`SA${i + 1}. ${it.question}\n   Answer: ${it.answer}\n`);
    });
    return lines.join("\n");
  };

  if (loading) return <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  if (!rows.length) return <EmptyState icon={<Brain />} title="No quizzes saved yet" cta={<Link to="/app/quiz"><Button>Generate a quiz</Button></Link>} />;

  return (
    <div>
      {FiltersUI}
      <div className="grid gap-3">
        {filtered.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3 border border-border rounded-lg p-4 bg-card">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-navy truncate">{r.title}</h3>
                <DateBadge iso={r.created_at} />
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                {r.subject && <span className="bg-muted rounded px-2 py-0.5">{r.subject}</span>}
                {r.class_level && <span className="bg-muted rounded px-2 py-0.5">{r.class_level}</span>}
                <span className="bg-muted rounded px-2 py-0.5">
                  {(r.quiz?.multipleChoice?.length ?? 0)} MCQ · {(r.quiz?.shortAnswer?.length ?? 0)} SA
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="ghost" onClick={() => setOpenRow(r)}><Eye className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => dup(r)}><Copy className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => downloadText(`${r.title}.txt`, quizToText(r.quiz))}><Download className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-sm text-muted-foreground py-8 text-center">No results.</p>}
      </div>

      <Dialog open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{openRow?.title}</DialogTitle></DialogHeader>
          <pre className="whitespace-pre-wrap text-sm">{openRow ? quizToText(openRow.quiz) : ""}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- ASSESSMENTS TAB ---------------- */
function AssessmentsTab() {
  const { rows, loading, refresh } = useSaved<SavedAssessment>("saved_assessments");
  const { toast } = useToast();
  const [openRow, setOpenRow] = useState<SavedAssessment | null>(null);
  const { filtered, FiltersUI } = useFilters(rows, (r) =>
    [r.title, r.subject, r.student_name, r.assessment_type].filter(Boolean).join(" "),
  );

  const del = async (id: string) => {
    if (!confirm("Delete this assessment?")) return;
    await supabase.from("saved_assessments").delete().eq("id", id);
    refresh();
  };

  const exportCSV = (r: SavedAssessment) => {
    const per = r.result?.perQuestion || [];
    const rowsCsv = [
      ["Question", "Awarded", "Max", "Feedback"],
      ...per.map((q: any) => [q.number, q.awarded, q.max, JSON.stringify(q.feedback || "")]),
    ];
    const csv = rowsCsv.map((row) => row.join(",")).join("\n");
    downloadText(`${r.title}.csv`, csv);
    toast({ title: "Exported" });
  };

  if (loading) return <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  if (!rows.length) return <EmptyState icon={<PenLine />} title="No graded assessments yet" cta={<Link to="/app/writing"><Button>Grade a script</Button></Link>} />;

  return (
    <div>
      {FiltersUI}
      <div className="grid gap-3">
        {filtered.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3 border border-border rounded-lg p-4 bg-card">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-navy truncate">{r.title}</h3>
                <DateBadge iso={r.created_at} />
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                {r.student_name && <span className="bg-muted rounded px-2 py-0.5">👤 {r.student_name}</span>}
                {r.subject && <span className="bg-muted rounded px-2 py-0.5">{r.subject}</span>}
                {r.class_level && <span className="bg-muted rounded px-2 py-0.5">{r.class_level}</span>}
                {r.percent != null && <span className="bg-accent/10 text-accent rounded px-2 py-0.5 font-semibold">{r.percent}% · {r.grade}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="ghost" onClick={() => setOpenRow(r)}><Eye className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => exportCSV(r)}><Download className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => downloadJSON(`${r.title}.json`, r.result)}><FileText className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-sm text-muted-foreground py-8 text-center">No results.</p>}
      </div>

      <Dialog open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{openRow?.title}</DialogTitle></DialogHeader>
          {openRow && (
            <div className="space-y-3 text-sm">
              <div className="bg-accent/10 rounded-lg p-3">
                <div className="text-2xl font-bold text-navy">{openRow.percent}% · {openRow.grade}</div>
                <div className="text-xs text-muted-foreground">{openRow.awarded} / {openRow.max_score}</div>
              </div>
              <div><b>Summary:</b> {openRow.result?.summary}</div>
              {(openRow.result?.perQuestion || []).map((q: any, i: number) => (
                <div key={i} className="border-l-2 border-border pl-3 py-1">
                  <div className="font-semibold">Q{q.number} — {q.awarded}/{q.max}</div>
                  <div className="text-muted-foreground">{q.feedback}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ icon, title, cta }: { icon: React.ReactNode; title: string; cta: React.ReactNode }) {
  return (
    <div className="border border-dashed border-border rounded-xl py-14 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">{icon}</div>
      <p className="text-navy font-semibold mb-1">{title}</p>
      <p className="text-sm text-muted-foreground mb-4">Everything you generate is saved here automatically.</p>
      {cta}
    </div>
  );
}

export default function MyWorkspacePage() {
  const { user, loading } = useAuth();
  const { requireAuth } = useAuthGate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "lessons";

  useEffect(() => {
    if (!loading && !user) {
      requireAuth({ feature: "workspace" });
    }
  }, [loading, user, requireAuth]);

  if (loading) return <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  if (!user) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <BookOpen className="h-10 w-10 text-accent mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-navy font-heading">Your saved work lives here</h1>
        <p className="text-muted-foreground mt-2">Sign in to view lesson notes, quizzes and assessments you've saved.</p>
        <Button className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => requireAuth({ feature: "workspace" })}>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Helmet>
        <title>My Workspace | Teazy AI</title>
        <meta name="description" content="All your generated lesson notes, quizzes and graded assessments — saved and searchable in one place." />
      </Helmet>
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-navy font-heading">My Workspace</h1>
        <p className="text-muted-foreground mt-1">Everything you generate is saved here automatically.</p>
      </header>

      <section className="mb-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-navy">This month's usage</h2>
          <Link to="/pricing" className="text-xs font-medium text-accent hover:underline">Upgrade plan</Link>
        </div>
        <UsageTracker />
      </section>


      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })}>
        <TabsList className="mb-4">
          <TabsTrigger value="lessons"><BookOpen className="h-4 w-4 mr-1.5" /> Lesson Notes</TabsTrigger>
          <TabsTrigger value="quizzes"><Brain className="h-4 w-4 mr-1.5" /> Quizzes</TabsTrigger>
          <TabsTrigger value="assessments"><PenLine className="h-4 w-4 mr-1.5" /> Assessments</TabsTrigger>
        </TabsList>
        <TabsContent value="lessons"><LessonsTab /></TabsContent>
        <TabsContent value="quizzes"><QuizzesTab /></TabsContent>
        <TabsContent value="assessments"><AssessmentsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
