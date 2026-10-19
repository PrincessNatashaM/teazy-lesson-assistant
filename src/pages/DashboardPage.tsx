import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAssessmentStatus } from "@/hooks/useAssessmentStatus";
import { useToast } from "@/hooks/use-toast";
import PaywallModal from "@/components/PaywallModal";
import { relativeDay } from "@/lib/assessmentQuota";

export interface FolderRow { id: string; name: string; created_at: string }
export interface BatchRow {
  id: string; name: string; subject: string; curriculum: string; folder_id: string | null;
  script_count: number; created_at: string; last_opened_at: string | null;
  total_marks: number | null; status: string; scheme_name: string | null;
}

export const BATCH_COLUMNS = "id,name,subject,curriculum,folder_id,script_count,created_at,last_opened_at,total_marks,status,scheme_name";

export function UpgradeCard({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="rounded-xl border border-accent/30 bg-secondary/40 p-5">
      <div className="text-lg font-bold text-navy font-heading">Assessment Pro</div>
      <div className="text-2xl font-bold text-navy mt-1">₦8,000<span className="text-sm font-normal text-muted-foreground">/month</span></div>
      <p className="text-sm text-muted-foreground mt-1">
        Up to 1000 handwritten scripts every month. Includes saved marking schemes, subject folders and organised assessment management.
      </p>
      <Button className="mt-3 bg-accent text-accent-foreground hover:bg-accent/90" onClick={onUpgrade}>
        Upgrade to Assessment Pro
      </Button>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth() as any;
  const status = useAssessmentStatus();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [schemes, setSchemes] = useState<{ id: string; name: string; subject: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [paywall, setPaywall] = useState(false);

  const isPro = status.plan === "pro";

  const load = async () => {
    if (!user) return;
    const [{ data: p }, { data: f }, { data: b }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("full_name,display_name").eq("id", user.id).maybeSingle(),
      supabase.from("assessment_folders").select("id,name,created_at").order("name"),
      supabase.from("assessment_batches").select(BATCH_COLUMNS).order("created_at", { ascending: false }).limit(500),
      supabase.from("saved_marking_schemes").select("id,name,subject").order("updated_at", { ascending: false }),
    ]);
    setName((p?.full_name || p?.display_name || "").split(" ")[0] || "");
    setFolders((f as FolderRow[]) || []);
    setBatches((b as unknown as BatchRow[]) || []);
    setSchemes(s || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const folderStats = useMemo(() => {
    const m: Record<string, { assessments: number; scripts: number }> = {};
    for (const b of batches) {
      if (!b.folder_id) continue;
      m[b.folder_id] ??= { assessments: 0, scripts: 0 };
      m[b.folder_id].assessments += 1;
      m[b.folder_id].scripts += b.script_count || 0;
    }
    return m;
  }, [batches]);

  const recent = useMemo(() =>
    [...batches].sort((a, b) =>
      new Date(b.last_opened_at || b.created_at).getTime() - new Date(a.last_opened_at || a.created_at).getTime(),
    ).slice(0, 6), [batches]);

  const needsAttention = useMemo(
    () => batches.filter((b) => ["processing", "draft", "pending", "failed"].includes((b.status || "").toLowerCase())).slice(0, 5),
    [batches],
  );

  const q = query.trim().toLowerCase();
  const folderById = useMemo(() => Object.fromEntries(folders.map((f) => [f.id, f])), [folders]);
  const foundFolders = q ? folders.filter((f) => f.name.toLowerCase().includes(q)) : [];
  const foundBatches = q ? batches.filter((b) =>
    [b.name, b.subject, b.curriculum, b.folder_id ? folderById[b.folder_id]?.name : ""].some((x) => (x || "").toLowerCase().includes(q)),
  ).slice(0, 20) : [];

  if (!authLoading && !user) return <Navigate to="/auth?next=/dashboard" replace />;

  const createFolder = async () => {
    const n = newName.trim().slice(0, 80);
    if (!n || !user) return;
    setSaving(true);
    const { data, error } = await supabase.from("assessment_folders").insert({ user_id: user.id, name: n }).select("id").single();
    setSaving(false);
    if (error) {
      toast({ title: "Could not create folder", description: error.code === "23505" ? "You already have a folder with that name." : error.message, variant: "destructive" });
      return;
    }
    setNewOpen(false); setNewName("");
    navigate(`/dashboard/folders/${data.id}`);
  };

  const openNewFolder = () => (isPro ? setNewOpen(true) : setPaywall(true));

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Helmet><title>Teacher Dashboard | Teazy AI</title></Helmet>

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy font-heading">Welcome back{name ? `, ${name}` : ""}</h1>
          <p className="text-muted-foreground mt-1">Your assessments, organised by subject.</p>
        </div>
        <Input
          aria-label="Search folders and assessments"
          className="md:max-w-xs"
          placeholder="Search folders, subjects, assessments"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>

      {needsAttention.length > 0 && (
        <section className="mt-6 rounded-xl border border-accent/40 bg-secondary/40 p-4">
          <h2 className="text-sm font-semibold text-navy">Needs your attention</h2>
          <ul className="mt-2 space-y-1">
            {needsAttention.map((b) => (
              <li key={b.id}>
                <Link to={`/app/writing/batches/${b.id}`} className="text-sm text-foreground hover:text-primary underline-offset-2 hover:underline">
                  {b.name} — {b.status === "processing" ? "still processing" : b.status} · {b.script_count} scripts
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {q && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-navy">Search results</h2>
          {foundFolders.length === 0 && foundBatches.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">Nothing matches "{query}".</p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
              {foundFolders.map((f) => (
                <li key={f.id}><Link to={`/dashboard/folders/${f.id}`} className="block px-4 py-3 hover:bg-muted/40">
                  <div className="font-medium text-navy">{f.name}</div>
                  <div className="text-xs text-muted-foreground">Folder</div>
                </Link></li>
              ))}
              {foundBatches.map((b) => (
                <li key={b.id}><Link to={`/app/writing/batches/${b.id}`} className="block px-4 py-3 hover:bg-muted/40">
                  <div className="font-medium text-foreground">{b.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.folder_id && folderById[b.folder_id] ? `${folderById[b.folder_id].name} · ` : ""}{b.script_count} scripts · {relativeDay(b.created_at)}
                  </div>
                </Link></li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-navy">My subjects</h2>
          <Button onClick={openNewFolder}>+ New Folder</Button>
        </div>
        {loading ? (
          <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : folders.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Create a folder for each subject or course you mark, for example Mathematics, Organic Chemistry or PHY 302.
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((f) => {
              const s = folderStats[f.id] || { assessments: 0, scripts: 0 };
              return (
                <Link key={f.id} to={`/dashboard/folders/${f.id}`}
                  className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition">
                  <div className="font-semibold text-navy truncate">{f.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {s.assessments} assessment{s.assessments === 1 ? "" : "s"} · {s.scripts} script{s.scripts === 1 ? "" : "s"}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-navy">Recent assessments</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">No assessments yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
              {recent.map((b) => (
                <li key={b.id}><Link to={`/app/writing/batches/${b.id}`} className="block px-4 py-3 hover:bg-muted/40">
                  <div className="font-medium text-foreground truncate">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.script_count} scripts · {relativeDay(b.last_opened_at || b.created_at)}</div>
                </Link></li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy">Saved marking schemes</h2>
          {schemes.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">Schemes you save while creating an assessment appear here and can be reused.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
              {schemes.slice(0, 8).map((s) => (
                <li key={s.id} className="px-4 py-3">
                  <div className="font-medium text-foreground truncate">{s.name}</div>
                  {s.subject && <div className="text-xs text-muted-foreground">{s.subject}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New folder</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input id="folder-name" autoFocus maxLength={80} value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createFolder()}
              placeholder="e.g. Mathematics, Educational Psychology, PHY 302" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={createFolder} disabled={saving || !newName.trim()}>{saving ? "Creating..." : "Create folder"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaywallModal open={paywall} onClose={() => { setPaywall(false); status.refresh(); }} purpose="subscription" initialPlan="sub_pro" />
    </div>
  );
}
