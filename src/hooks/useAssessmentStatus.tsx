import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AssessmentStatus {
  plan: "free" | "standard" | "pro";
  monthlyUsed?: number;
  monthlyLimit?: number;
  packRemaining: number;
  freeUsed?: number;
  freeLimit?: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Reads the current user's Writing Assessment quota state directly from tables
 * (the SECURITY DEFINER RPC is service-role only, so we compose the same view here).
 */
export function useAssessmentStatus(): AssessmentStatus {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<AssessmentStatus, "refresh" | "loading">>({
    plan: "free",
    packRemaining: 0,
    freeUsed: 0,
    freeLimit: 2,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setState({ plan: "free", packRemaining: 0, freeUsed: 0, freeLimit: 2 });
      setLoading(false);
      return;
    }
    setLoading(true);
    const periodStart = new Date();
    periodStart.setUTCDate(1);
    periodStart.setUTCHours(0, 0, 0, 0);
    const periodStartISO = periodStart.toISOString().slice(0, 10);

    const [{ data: sub }, { data: credits }, { data: usage }, { data: freeUsage }] = await Promise.all([
      supabase.from("subscriptions").select("status,plan,current_period_end").eq("user_id", user.id).maybeSingle(),
      supabase.from("assessment_credits").select("remaining").eq("user_id", user.id).maybeSingle(),
      supabase.from("monthly_assessment_usage").select("uploads_used").eq("user_id", user.id).eq("period_start", periodStartISO).maybeSingle(),
      supabase.from("monthly_feature_usage").select("count").eq("user_id", user.id).eq("kind", "writing").eq("period_start", periodStartISO).maybeSingle(),
    ]);

    const active =
      sub?.status === "active" &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
    const plan: "free" | "standard" | "pro" =
      active && (sub?.plan === "pro" || sub?.plan === "pro_monthly")
        ? "pro"
        : active && sub?.plan === "standard"
          ? "standard"
          : "free";

    setState({
      plan,
      monthlyUsed: usage?.uploads_used ?? 0,
      monthlyLimit: 40,
      packRemaining: credits?.remaining ?? 0,
      freeUsed: freeUsage?.count ?? 0,
      freeLimit: 2,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...state, loading, refresh };
}
