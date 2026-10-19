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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, Brain, PenLine, Search, Copy, Download, Trash2,
  Pencil, Loader2, Eye, FileText, Clapperboard,
} from "lucide-react";
import {
  listWorkspaceVideos, deleteWorkspaceVideo, listSavedResources,
  deleteSavedResource, downloadSavedFile,
  type WorkspaceVideo, type SavedResource,
} from "@/lib/workspace";

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
    <div className="grid min-w-0 grid-cols-1 gap-2 mb-4 sm:grid-cols-2 xl:grid-cols-5">
      <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
        <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search..." className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Select value={curriculum} onValueChange={setCurriculum}>
        <SelectTrigger className="w-full min-w-0"><SelectValue placeholder="Curriculum" /></SelectTrigger>
        <SelectContent><SelectItem value="all">All curricula</SelectItem>
          {curricula.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={subject} onValueChange={setSubject}>
        <SelectTrigger className="w-full min-w-0"><SelectValue placeholder="Subject" /></SelectTrigger>
        <SelectContent><SelectItem value="all">All subjects</SelectItem>
          {subjects.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={classLevel} onValueChange={setClassLevel}>
        <SelectTrigger className="w-full min-w-0"><SelectValue placeholder="Class / Grade" /></SelectTrigger>
        <SelectContent><SelectItem value="all">All classes</SelectItem>
          {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={dateRange} onValueChange={setDateRange}>
        <SelectTrigger className="w-full min-w-0"><SelectValue placeholder="Date" /></SelectTrigger>
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
          <div key={r.id} className="flex min-w-0 flex-col sm:flex-row items-start justify-between gap-3 border border-border rounded-lg p-4 bg-card">
            <div className="min-w-0 w-full flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="max-w-full font-semibold text-navy break-words">{r.title}</h3>
                <DateBadge iso={r.created_at} />
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                {r.subject && <span className="bg-muted rounded px-2 py-0.5">{r.subject}</span>}
                {r.class_level && <span className="bg-muted rounded px-2 py-0.5">{r.class_level}</span>}
                {r.curriculum && <span className="bg-muted rounded px-2 py-0.5">{r.curriculum}</span>}
              </div>
            </div>
            <div className="flex max-w-full shrink-0 flex-wrap gap-1">
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
          <pre className="whitespace-pre-wrap break-words text-sm">{openRow?.content}</pre>
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
          <div key={r.id} className="flex min-w-0 flex-col sm:flex-row items-start justify-between gap-3 border border-border rounded-lg p-4 bg-card">
            <div className="min-w-0 w-full flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="max-w-full font-semibold text-navy break-words">{r.title}</h3>
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
            <div className="flex max-w-full shrink-0 flex-wrap gap-1">
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
          <pre className="whitespace-pre-wrap break-words text-sm">{openRow ? quizToText(openRow.quiz) : ""}</pre>
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
          <div key={r.id} className="flex min-w-0 flex-col sm:flex-row items-start justify-between gap-3 border border-border rounded-lg p-4 bg-card">
            <div className="min-w-0 w-full flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="max-w-full font-semibold text-navy break-words">{r.title}</h3>
                <DateBadge iso={r.created_at} />
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                {r.student_name && <span className="bg-muted rounded px-2 py-0.5">👤 {r.student_name}</span>}
                {r.subject && <span className="bg-muted rounded px-2 py-0.5">{r.subject}</span>}
                {r.class_level && <span className="bg-muted rounded px-2 py-0.5">{r.class_level}</span>}
                {r.percent != null && <span className="bg-accent/10 text-accent rounded px-2 py-0.5 font-semibold">{r.percent}% · {r.grade}</span>}
              </div>
            </div>
            <div className="flex max-w-full shrink-0 flex-wrap gap-1">
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

/* ---------------- VIDEOS TAB ---------------- */
function VideosTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [videos, setVideos] = useState<WorkspaceVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState<WorkspaceVideo | null>(null);

  const refresh = async () => {
    if (!user) { setVideos([]); setLoading(false); return; }
    setLoading(true);
    setVideos(await listWorkspaceVideos());
    setLoading(false);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user]);

  const del = async (v: WorkspaceVideo) => {
    if (!confirm(`Delete "${v.title || "this video"}"? This cannot be undone.`)) return;
    const r = await deleteWorkspaceVideo(v.id);
    if (r.ok) { toast({ title: "Deleted" }); refresh(); }
    else toast({ title: "Could not delete", description: r.json.error, variant: "destructive" });
  };

  const filtered = videos.filter((v) => (v.title || "").toLowerCase().includes(q.trim().toLowerCase()));

  if (loading) return <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  if (!videos.length) return <EmptyState icon={<Clapperboard />} title="No videos yet" cta={<Link to="/app/video"><Button>Make an animated video</Button></Link>} />;

  return (
    <div>
      <div className="relative mb-4">
        <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search videos..." className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((v) => (
          <div key={v.id} className="border border-border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="max-w-full font-semibold text-navy break-words">{v.title || "Untitled video"}</h3>
              <DateBadge iso={v.createdAt} />
              {!v.saved && <span className="text-xs bg-muted rounded px-2 py-0.5 text-muted-foreground">Not saved</span>}
            </div>
            {v.sceneIndex != null && <p className="text-xs text-muted-foreground mt-1">Scene {v.sceneIndex + 1}</p>}
            <div className="flex flex-wrap gap-1 mt-2">
              <Button size="sm" variant="ghost" onClick={() => setPlaying(v)}><Eye className="h-4 w-4" /></Button>
              <a href={v.url} download={`${(v.title || "video").slice(0, 40)}${v.sceneIndex != null ? ` scene ${v.sceneIndex + 1}` : ""}.mp4`}>
                <Button size="sm" variant="ghost"><Download className="h-4 w-4" /></Button>
              </a>
              <Button size="sm" variant="ghost" onClick={() => del(v)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-sm text-muted-foreground py-8 text-center">No videos match your search.</p>}
      </div>

      <Dialog open={!!playing} onOpenChange={(o) => !o && setPlaying(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{playing?.title || "Video"}</DialogTitle></DialogHeader>
          {playing && <video src={playing.url} controls autoPlay className="w-full rounded-lg bg-foreground/90 aspect-video" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- RESOURCES TAB ---------------- */
function ResourcesTab({ kind }: { kind?: "worksheet" | "slides" }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<SavedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [openRow, setOpenRow] = useState<SavedResource | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const refresh = async () => {
    if (!user) { setRows([]); setLoading(false); return; }
    setLoading(true);
    setRows(await listSavedResources());
    setLoading(false);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user]);

  const del = async (r: SavedResource) => {
    if (!confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
    await deleteSavedResource(r);
    toast({ title: "Deleted" });
    refresh();
  };

  const dl = async (r: SavedResource) => {
    setDownloading(r.id);
    try {
      if (r.storage_path) await downloadSavedFile(r);
      else if (r.content) downloadText(`${r.title}.txt`, r.content);
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    } finally { setDownloading(null); }
  };

  const KIND_LABEL: Record<string, string> = { slides: "Slides", worksheet: "Worksheet", rubric: "Rubric", notes: "Notes" };
  const categoryRows = rows.filter((r) => !kind || r.kind === kind);
  const filtered = categoryRows.filter((r) => [r.title, r.kind].join(" ").toLowerCase().includes(q.trim().toLowerCase()));

  if (loading) return <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  if (!categoryRows.length) return <EmptyState icon={<FileText />} title={kind === "worksheet" ? "No worksheets saved yet" : kind === "slides" ? "No presentation slides saved yet" : "No resources saved yet"} cta={<Button asChild><Link to={kind === "worksheet" ? "/app/worksheet" : kind === "slides" ? "/app/slides" : "/higher-ed"}>{kind === "worksheet" ? "Generate worksheet" : kind === "slides" ? "Generate presentation slides" : "Create a resource"}</Link></Button>} />;

  return (
    <div>
      <div className="relative mb-4">
        <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={kind === "worksheet" ? "Search worksheets..." : kind === "slides" ? "Search presentation slides..." : "Search resources..."} className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid gap-3">
        {filtered.map((r) => (
          <div key={r.id} className="flex min-w-0 flex-col sm:flex-row items-start justify-between gap-3 border border-border rounded-lg p-4 bg-card">
            <div className="min-w-0 w-full flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="max-w-full font-semibold text-navy break-words">{r.title}</h3>
                <DateBadge iso={r.created_at} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                <span className="bg-muted rounded px-2 py-0.5">{KIND_LABEL[r.kind] || r.kind}</span>
              </div>
            </div>
            <div className="flex max-w-full shrink-0 flex-wrap gap-1">
              {r.content && <Button size="sm" variant="ghost" onClick={() => setOpenRow(r)}><Eye className="h-4 w-4" /></Button>}
              <Button size="sm" variant="ghost" disabled={downloading === r.id} onClick={() => dl(r)}>
                {downloading === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => del(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-sm text-muted-foreground py-8 text-center">No resources match your search.</p>}
      </div>

      <Dialog open={!!openRow} onOpenChange={(o) => !o && setOpenRow(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{openRow?.title}</DialogTitle></DialogHeader>
          <pre className="whitespace-pre-wrap break-words text-sm">{openRow?.content}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ title, cta }: { icon?: React.ReactNode; title: string; cta: React.ReactNode }) {
  return (
    <div className="min-w-0 px-3 py-14 text-center">
      <p className="text-navy font-semibold mb-4">{title}</p>
      {cta}
    </div>
  );
}

type RecentMaterial = { id: string; title: string; date: string; category: string; tab: string };

function RecentGenerations() {
  const { user } = useAuth();
  const [items, setItems] = useState<RecentMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const [lessons, quizzes, assessments, resources, videos] = await Promise.all([
        supabase.from("saved_lessons").select("id,title,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("saved_quizzes").select("id,title,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("saved_assessments").select("id,title,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("saved_resources").select("id,title,kind,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        listWorkspaceVideos(),
      ]);
      const merged: RecentMaterial[] = [
        ...(lessons.data || []).map(r => ({ id: r.id, title: r.title, date: r.created_at, category: "Lesson notes", tab: "lessons" })),
        ...(quizzes.data || []).map(r => ({ id: r.id, title: r.title, date: r.created_at, category: "Quiz", tab: "quizzes" })),
        ...(assessments.data || []).map(r => ({ id: r.id, title: r.title, date: r.created_at, category: "Assessment", tab: "assessments" })),
        ...(resources.data || []).map(r => ({ id: r.id, title: r.title, date: r.created_at, category: r.kind === "worksheet" ? "Worksheet" : r.kind === "slides" ? "Presentation slides" : "Resource", tab: r.kind === "worksheet" ? "worksheets" : r.kind === "slides" ? "slides" : "resources" })),
        ...videos.map(r => ({ id: r.id, title: r.title || "Untitled video", date: r.createdAt, category: "Video", tab: "videos" })),
      ];
      if (active) {
        setItems(merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6));
        setLoading(false);
      }
    };
    load().catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  if (loading) return <div className="py-10 text-center"><Loader2 className="inline h-5 w-5 animate-spin" /></div>;
  if (!items.length) return null;
  return <div className="divide-y divide-border">
    {items.map(item => <Link key={item.tab + item.id} to={`/app/workspace?tab=${item.tab}`} className="flex min-w-0 flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between hover:text-primary">
      <div className="min-w-0"><h3 className="break-words font-medium">{item.title}</h3><p className="mt-1 text-xs text-muted-foreground">{item.category}</p></div>
      <DateBadge iso={item.date} />
    </Link>)}
  </div>;
}

export default function MyWorkspacePage() {
  const { user, loading } = useAuth();
  const { requireAuth } = useAuthGate();
  const [params] = useSearchParams();
  const tab = params.get("tab") || "recent";
  const titles: Record<string, string> = { recent: "Recent generations", lessons: "Lesson notes", quizzes: "Quizzes", assessments: "Marked assessments", videos: "Videos", worksheets: "Worksheets", slides: "Presentation slides", resources: "Other resources" };

  useEffect(() => {
    if (!loading && !user) requireAuth({ feature: "workspace" });
  }, [loading, user, requireAuth]);

  if (loading) return <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  if (!user) return <div className="mx-auto max-w-xl px-4 py-16 text-center">
    <h1 className="text-2xl font-bold text-navy">Your saved work lives here</h1>
    <Button className="mt-4" onClick={() => requireAuth({ feature: "workspace" })}>Sign in</Button>
  </div>;

  return <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
    <Helmet><title>My Workspace | Teazy AI</title><meta name="description" content="Your saved teaching materials, worksheets, presentation slides and videos." /></Helmet>
    <header className="mb-6">
      <p className="mb-1 text-sm text-muted-foreground">My Workspace</p>
      <h1 className="break-words text-2xl font-bold text-navy font-heading">{titles[tab] || titles.recent}</h1>
    </header>
    {tab === "lessons" ? <LessonsTab /> : tab === "quizzes" ? <QuizzesTab /> : tab === "assessments" ? <AssessmentsTab /> : tab === "videos" ? <VideosTab /> : tab === "worksheets" ? <ResourcesTab key="worksheets" kind="worksheet" /> : tab === "slides" ? <ResourcesTab key="slides" kind="slides" /> : tab === "resources" ? <ResourcesTab key="resources" /> : <RecentGenerations />}
  </div>;
}
