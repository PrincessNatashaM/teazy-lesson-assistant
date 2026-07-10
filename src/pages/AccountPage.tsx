import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Sparkles } from "lucide-react";
import PaywallModal from "@/components/PaywallModal";

interface Profile { display_name: string | null; country: string }
interface Sub { status: string; plan?: string | null; current_period_end: string | null }

export default function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sub, setSub] = useState<Sub | null>(null);
  const [credits, setCredits] = useState(0);
  const [freeUsed, setFreeUsed] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, s, c, u] = await Promise.all([
        supabase.from("profiles").select("display_name,country").eq("id", user.id).maybeSingle(),
        supabase.from("subscriptions").select("status,plan,current_period_end").eq("user_id", user.id).maybeSingle(),
        supabase.from("assessment_credits").select("remaining").eq("user_id", user.id).maybeSingle(),
        supabase.from("usage_counters").select("count").eq("user_id", user.id).eq("kind", "free_assessment").maybeSingle(),
      ]);
      setProfile(p.data);
      setSub(s.data as any);
      setCredits(c.data?.remaining ?? 0);
      setFreeUsed(u.data?.count ?? 0);
    })();
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const proActive =
    sub?.status === "active" &&
    (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  const planLabel =
    proActive && ((sub as any)?.plan === "pro" || (sub as any)?.plan === "pro_monthly")
      ? "Assessment Pro"
      : proActive && (sub as any)?.plan === "standard"
        ? "Teazy AI Standard"
        : "Free";

  return (
    <>
      <Helmet><title>My Account | Teazy AI</title><meta name="robots" content="noindex" /></Helmet>
      <div className="container mx-auto max-w-3xl px-4 py-10 space-y-6">
        <h1 className="text-3xl font-bold text-navy font-heading">My Account</h1>

        <section className="bg-card border border-border rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Signed in as</div>
              <div className="font-semibold">{profile?.display_name || user.email}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
            {proActive ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success text-sm font-semibold">
                <BadgeCheck className="h-4 w-4" /> {planLabel}
              </span>
            ) : (
              <Button onClick={() => setShowPaywall(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Sparkles className="mr-2 h-4 w-4" /> Upgrade
              </Button>
            )}
          </div>
        </section>

        <section className="grid sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-xs text-muted-foreground uppercase">Current plan</div>
            <div className="mt-1 font-semibold">{planLabel}</div>
            {sub?.current_period_end && proActive && (
              <div className="text-xs text-muted-foreground mt-1">
                Renews {new Date(sub.current_period_end).toLocaleDateString()}
              </div>
            )}
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-xs text-muted-foreground uppercase">Extra pack uploads</div>
            <div className="mt-1 text-2xl font-bold text-navy">{credits}</div>
            <div className="text-xs text-muted-foreground">never expire</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="text-xs text-muted-foreground uppercase">Free assessments used</div>
            <div className="mt-1 text-2xl font-bold text-navy">{freeUsed} / 2</div>
          </div>
        </section>

        <div className="flex gap-3 flex-wrap">
          <Button asChild variant="outline"><Link to="/app">Back to app</Link></Button>
          <Button asChild variant="outline"><Link to="/pricing">Compare plans</Link></Button>
          <Button variant="outline" onClick={signOut}>Sign out</Button>
        </div>
      </div>

      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        purpose="subscription"
        onSuccess={() => window.location.reload()}
      />
    </>
  );
}
