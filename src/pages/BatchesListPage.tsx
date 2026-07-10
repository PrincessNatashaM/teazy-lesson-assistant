import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Loader2, FolderOpen, Plus, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { formatDistanceToNow } from "date-fns";

interface Batch {
  id: string;
  name: string;
  subject: string;
  class_level: string;
  script_count: number;
  completed_count: number;
  failed_count: number;
  avg_percent: number | null;
  status: string;
  created_at: string;
}

export default function BatchesListPage() {
  const { user } = useAuth();
  const { plan, loading: entLoading } = useEntitlements(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("assessment_batches").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setBatches((data as Batch[]) || []); setLoading(false); });
  }, [user]);

  if (entLoading) return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  if (plan !== "pro") {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <Crown className="h-10 w-10 text-accent mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-navy font-heading">Batches are an Assessment Pro feature</h1>
        <p className="text-muted-foreground mt-2">Upgrade to run bulk marking and see class-level results.</p>
        <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/pricing">Upgrade to Pro</Link></Button>
      </div>
    );
  }

  return (
    <div>
      <Helmet><title>Batches | Writing Assessment | Teazy AI</title></Helmet>
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy font-heading">Marking batches</h1>
          <p className="text-muted-foreground mt-1">All your bulk marking runs.</p>
        </div>
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/app/writing/bulk"><Plus className="mr-2 h-4 w-4" /> New batch</Link>
        </Button>
      </header>

      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : batches.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No batches yet.</p>
          <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/app/writing/bulk">Start your first batch</Link>
          </Button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y">
          {batches.map((b) => (
            <Link key={b.id} to={`/app/writing/batches/${b.id}`} className="block p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-navy truncate">{b.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.subject} · {b.class_level} · {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                  </div>
                </div>
                <div className="text-right shrink-0 flex items-center gap-6">
                  <div>
                    <div className="text-xs text-muted-foreground">Scripts</div>
                    <div className="text-sm font-semibold">{b.completed_count}/{b.script_count}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg %</div>
                    <div className="text-sm font-semibold">{b.avg_percent != null ? Math.round(Number(b.avg_percent)) : "—"}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    b.status === "completed" ? "bg-success/15 text-success" :
                    b.status === "processing" ? "bg-accent/15 text-accent" :
                    b.status === "failed" ? "bg-destructive/15 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>{b.status}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
