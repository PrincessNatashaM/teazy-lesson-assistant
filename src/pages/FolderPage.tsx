import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAssessmentStatus } from "@/hooks/useAssessmentStatus";
import { useToast } from "@/hooks/use-toast";
import UsageCounter from "@/components/dashboard/UsageCounter";
import PaywallModal from "@/components/PaywallModal";
import { quotaSummary } from "@/lib/assessmentQuota";
import { BATCH_COLUMNS, type BatchRow, type FolderRow } from "./DashboardPage";

const STATUS_LABEL: Record<string, string> = {
  queued: "Uploaded", processing: "Processing", completed: "Marked", failed: "Failed",
};

export default function FolderPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const status = useAssessmentStatus();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<FolderRow | null>(null);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameOpen, setRenameOpen] = useState(false);
  const [rename, setRename] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAssessments, setDeleteAssessments] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const [{ data: f }, { data: b }] = await Promise.all([
        supabase.from("assessment_folders").select("id,name,created_at").eq("id", id).maybeSingle(),
        supabase.from("assessment_batches").select(BATCH_COLUMNS).eq("folder_id", id).order("created_at", { ascending: false }),
      ]);
      setFolder(f as FolderRow | null);
      setBatches((b as unknown as BatchRow[]) || []);
      setLoading(false);
    })();
  }, [user, id]);

  if (!authLoading && !user) return <Navigate to="/auth?next=/dashboard" replace />;
  if (loading) return <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  if (!folder) return <div className="p-10 text-center text-muted-foreground">Folder not found. <Link className="text-primary underline" to="/dashboard">Back to dashboard</Link></div>;

  const q = quotaSummary(status.monthlyUsed ?? 0, status.monthlyLimit ?? 0);
  const newAssessment = () => {
    if (status.plan !== "pro") return setPaywall(true);
    if (q.reached) {
      toast({ title: "Monthly limit reached", description: "You've reached your 1000-script monthly limit.", variant: "destructive" });
      return;
    }
    navigate(`/app/writing/bulk?folder=${folder.id}`);
  };

  const doRename = async () => {
    const n = rename.trim().slice(0, 80);
    if (!n) return;
    setBusy(true);
    const { error } = await supabase.from("assessment_folders").update({ name: n }).eq("id", folder.id);
    setBusy(false);
    if (error) { toast({ title: "Could not rename", description: error.code === "23505" ? "You already have a folder with that name." : error.message, variant: "destructive" }); return; }
    setFolder({ ...folder, name: n }); setRenameOpen(false);
  };

  const doDelete = async () => {
    setBusy(true);
    if (deleteAssessments && batches.length) {
      const ids = batches.map((b) => b.id);
      await supabase.from("assessment_batch_items").delete().in("batch_id", ids);
      await supabase.from("assessment_batches").delete().in("id", ids);
    }
    const { error } = await supabase.from("assessment_folders").delete().eq("id", folder.id);
    setBusy(false);
    if (error) { toast({ title: "Could not delete", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Folder deleted", description: deleteAssessments ? "Its assessments were deleted too." : "Its assessments were kept and moved out of the folder." });
    navigate("/dashboard");
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Helmet><title>{folder.name} | Teacher Dashboard | Teazy AI</title></Helmet>
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-navy">← Dashboard</Link>

      <header className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy font-heading">{folder.name}</h1>
          <p className="text-muted-foreground mt-1">
            {batches.length} assessment{batches.length === 1 ? "" : "s"} · {batches.reduce((s, b) => s + (b.script_count || 0), 0)} scripts
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setRename(folder.name); setRenameOpen(true); }}>Rename</Button>
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setDeleteAssessments(false); setDeleteOpen(true); }}>Delete</Button>
          <Button onClick={newAssessment} className="bg-accent text-accent-foreground hover:bg-accent/90">+ New Assessment</Button>
        </div>
      </header>

      {status.plan === "pro" && <div className="mt-6"><UsageCounter status={status} /></div>}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-navy">Assessments</h2>
        {batches.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No assessments in {folder.name} yet. Create one to upload and mark scripts.
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
            {batches.map((b) => (
              <li key={b.id}>
                <Link to={`/app/writing/batches/${b.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{b.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString()} · {b.script_count} scripts
                      {b.total_marks ? ` · ${Number(b.total_marks)} marks` : ""}
                      {b.scheme_name ? ` · ${b.scheme_name}` : ""}
                    </div>
                  </div>
                  <span className={`self-start sm:self-center text-xs px-2 py-0.5 rounded-full ${
                    b.status === "completed" ? "bg-success/15 text-success" :
                    b.status === "failed" ? "bg-destructive/15 text-destructive" : "bg-accent/15 text-accent"
                  }`}>{STATUS_LABEL[b.status] || b.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename folder</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename">Folder name</Label>
            <Input id="rename" autoFocus maxLength={80} value={rename} onChange={(e) => setRename(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doRename()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={doRename} disabled={busy || !rename.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{folder.name}"?</DialogTitle>
            <DialogDescription>
              This folder contains {batches.length} assessment{batches.length === 1 ? "" : "s"}. By default they are kept and moved out of the folder.
            </DialogDescription>
          </DialogHeader>
          {batches.length > 0 && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={deleteAssessments} onCheckedChange={(v) => setDeleteAssessments(!!v)} className="mt-0.5" />
              <span>Also permanently delete the {batches.length} assessment{batches.length === 1 ? "" : "s"} and all student results inside it. This cannot be undone.</span>
            </label>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={doDelete} disabled={busy}>{busy ? "Deleting..." : "Delete folder"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaywallModal open={paywall} onClose={() => { setPaywall(false); status.refresh(); }} purpose="subscription" initialPlan="sub_pro" />
    </div>
  );
}
