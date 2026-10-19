import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAssessmentStatus } from "@/hooks/useAssessmentStatus";
import UsageCounter from "@/components/dashboard/UsageCounter";
import UsageTracker from "@/components/UsageTracker";
import PaywallModal from "@/components/PaywallModal";
import { UpgradeCard } from "./DashboardPage";

interface Sub { status: string; plan?: string | null; current_period_end: string | null }

export default function UsagePage() {
  const { user, loading: authLoading } = useAuth() as any;
  const status = useAssessmentStatus();
  const [sub, setSub] = useState<Sub | null>(null);
  const [credits, setCredits] = useState(0);
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("subscriptions").select("status,plan,current_period_end").eq("user_id", user.id).maybeSingle(),
      supabase.from("assessment_credits").select("remaining").eq("user_id", user.id).maybeSingle(),
    ]).then(([s, c]) => {
      setSub(s.data as any);
      setCredits(c.data?.remaining ?? 0);
    });
  }, [user]);

  if (!authLoading && !user) return <Navigate to="/auth?next=/dashboard/usage" replace />;

  const proActive =
    sub?.status === "active" &&
    (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  const planLabel =
    proActive && (sub?.plan === "pro" || sub?.plan === "pro_monthly")
      ? "Assessment Pro"
      : proActive && sub?.plan === "standard"
        ? "Teazy AI Pro"
        : "Free";

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Helmet><title>Subscription & Usage | Teazy AI</title><meta name="robots" content="noindex" /></Helmet>

      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy font-heading">Subscription & Usage</h1>
        <p className="text-muted-foreground mt-1">Your plan, allowances and monthly usage in one place.</p>
      </header>

      <section className="bg-card border border-border rounded-2xl p-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Current plan</div>
          <div className="font-semibold text-lg text-navy flex items-center gap-2">
            {planLabel}
            {proActive && <BadgeCheck className="h-4 w-4 text-success" />}
          </div>
          {sub?.current_period_end && proActive && (
            <div className="text-xs text-muted-foreground mt-1">
              Renews {new Date(sub.current_period_end).toLocaleDateString()}
            </div>
          )}
          {credits > 0 && (
            <div className="text-xs text-muted-foreground mt-1">{credits} extra pack uploads remaining (never expire)</div>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/pricing">Compare plans</Link></Button>
          {!proActive && (
            <Button size="sm" onClick={() => setPaywall(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              Upgrade
            </Button>
          )}
        </div>
      </section>

      <UsageCounter status={status} />

      <section>
        <h2 className="text-lg font-semibold text-navy mb-3">Monthly tool usage</h2>
        <UsageTracker />
      </section>

      {!status.loading && status.plan !== "pro" && <UpgradeCard onUpgrade={() => setPaywall(true)} />}

      <PaywallModal
        open={paywall}
        onClose={() => { setPaywall(false); status.refresh(); }}
        purpose="subscription"
        initialPlan={status.plan === "free" ? undefined : "sub_pro"}
      />
    </div>
  );
}
