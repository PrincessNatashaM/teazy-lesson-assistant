import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { itemsToCSV, downloadCSV, analyseBatch } from "@/lib/batchAnalytics";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import AssessmentResults, { type AssessmentResult } from "@/components/AssessmentResults";

interface Batch {
  id: string; name: string; subject: string; class_level: string; curriculum: string;
  script_count: number; completed_count: number; failed_count: number;
  avg_percent: number | null; status: string; created_at: string;
  marking_scheme: string | null; question_paper: string | null;
}

interface Item {
  id: string; student_name: string; awarded: number | null; max_score: number | null;
  percent: number | null; grade: string | null; confidence: number | null;
  status: string; error: string | null; result_json: any;
}

const PIE_COLORS = ["hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--primary))", "hsl(var(--muted))", "hsl(var(--destructive))"];

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [openStudent, setOpenStudent] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const [{ data: b }, { data: it }] = await Promise.all([
        supabase.from("assessment_batches").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
        supabase.from("assessment_batch_items").select("*").eq("batch_id", id).order("student_name"),
      ]);
      setBatch(b as Batch);
      setItems((it as Item[]) || []);
      setLoading(false);
    })();

    const ch = supabase.channel(`batch-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "assessment_batch_items", filter: `batch_id=eq.${id}` },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") return [...prev, payload.new as Item];
            if (payload.eventType === "DELETE") return prev.filter((p) => p.id !== (payload.old as Item).id);
            return prev.map((p) => p.id === (payload.new as Item).id ? (payload.new as Item) : p);
          });
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "assessment_batches", filter: `id=eq.${id}` },
        (payload) => setBatch(payload.new as Batch))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, id]);

  const analytics = useMemo(() => analyseBatch(items), [items]);
  const gradePie = useMemo(() =>
    Object.entries(analytics.gradeCounts).map(([grade, count]) => ({ name: grade, value: count })), [analytics]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  if (!batch) return <div className="p-8 text-center text-muted-foreground">Batch not found.</div>;

  const exportCSV = () => downloadCSV(
    `${batch.name.replace(/\s+/g, "-")}.csv`,
    itemsToCSV(items.map((i) => ({
      student_name: i.student_name, awarded: i.awarded, max_score: i.max_score,
      percent: i.percent, grade: i.grade, confidence: i.confidence, status: i.status,
    })))
  );

  const progress = batch.script_count ? Math.round(((batch.completed_count + batch.failed_count) / batch.script_count) * 100) : 0;

  return (
    <div>
      <Helmet><title>{batch.name} | Batch | Teazy AI</title></Helmet>

      <div className="mb-4">
        <Button asChild variant="ghost" size="sm"><Link to="/app/writing/batches"><ArrowLeft className="mr-1 h-4 w-4" /> All batches</Link></Button>
      </div>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy font-heading">{batch.name}</h1>
          <p className="text-muted-foreground mt-1">{batch.curriculum} · {batch.subject} · {batch.class_level}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={!items.some((i) => i.status === "done")}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </header>

      {batch.status !== "completed" && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-accent">Marking in progress</span>
            <span className="text-muted-foreground">{batch.completed_count + batch.failed_count}/{batch.script_count} ({progress}%)</span>
          </div>
          <div className="h-2 rounded-full bg-accent/10 overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Marked", value: `${analytics.count}/${batch.script_count}` },
          { label: "Class avg", value: `${analytics.avg}%` },
          { label: "Range", value: analytics.count ? `${analytics.min}–${analytics.max}%` : "—" },
          { label: "Needs review", value: analytics.needsReview, tone: analytics.needsReview > 0 ? "warn" : "" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className={`text-2xl font-bold ${s.tone === "warn" ? "text-accent" : "text-navy"}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {analytics.count > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-navy mb-2">Score distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.distribution}>
                <XAxis dataKey="bucket" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold text-navy mb-2">Grade breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={gradePie} dataKey="value" nameKey="name" outerRadius={80} label>
                  {gradePie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-semibold text-navy">Student scripts</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Student</th>
                <th className="text-right px-4 py-2">Score</th>
                <th className="text-right px-4 py-2">%</th>
                <th className="text-center px-4 py-2">Grade</th>
                <th className="text-center px-4 py-2">Conf.</th>
                <th className="text-center px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it) => (
                <tr key={it.id}
                  className={`hover:bg-muted/40 ${it.status === "done" ? "cursor-pointer" : ""}`}
                  onClick={() => it.status === "done" && setOpenStudent(it)}>
                  <td className="px-4 py-2 font-medium text-foreground">
                    {it.student_name}
                    {(it.confidence ?? 100) < 75 && it.status === "done" && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-accent">
                        <AlertTriangle className="h-3 w-3" /> review
                      </span>
                    )}
                  </td>
                  <td className="text-right px-4 py-2">
                    {it.awarded != null && it.max_score != null ? `${it.awarded}/${it.max_score}` : "—"}
                  </td>
                  <td className="text-right px-4 py-2 font-semibold">{it.percent != null ? Math.round(Number(it.percent)) : "—"}</td>
                  <td className="text-center px-4 py-2">{it.grade || "—"}</td>
                  <td className="text-center px-4 py-2 text-muted-foreground">{it.confidence != null ? Math.round(Number(it.confidence)) : "—"}</td>
                  <td className="text-center px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      it.status === "done" ? "bg-success/15 text-success" :
                      it.status === "processing" ? "bg-accent/15 text-accent" :
                      it.status === "failed" ? "bg-destructive/15 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>{it.status === "processing" ? "marking..." : it.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setOpenStudent(null)}>
          <div className="bg-background rounded-xl max-w-4xl w-full my-8 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-navy">{openStudent.student_name}</h2>
              <button onClick={() => setOpenStudent(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <AssessmentResults data={openStudent.result_json as AssessmentResult} />
          </div>
        </div>
      )}
    </div>
  );
}
