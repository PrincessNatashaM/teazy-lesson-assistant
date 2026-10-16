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
  /** When the current allowance resets (ISO). */
  resetsAt?: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/** Reads the signed-in user's Writing Assessment allowance from the server (source of truth). */
export function useAssessmentStatus(): AssessmentStatus {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<AssessmentStatus, "refresh" | "loading">>({
    plan: "free", packRemaining: 0, freeUsed: 0, freeLimit: 2,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setState({ plan: "free", packRemaining: 0, freeUsed: 0, freeLimit: 2 });
      setLoading(false);
      return;
    }
    const { data } = await (supabase as any).rpc("get_my_assessment_quota");
    const j = (data ?? {}) as any;
    const plan = (j.plan === "pro" || j.plan === "standard" ? j.plan : "free") as AssessmentStatus["plan"];
    setState({
      plan,
      monthlyUsed: plan === "free" ? 0 : j.used ?? 0,
      monthlyLimit: plan === "pro" ? 1000 : 40,
      packRemaining: j.pack_remaining ?? 0,
      freeUsed: plan === "free" ? j.used ?? 0 : 0,
      freeLimit: 2,
      resetsAt: j.resets_at ?? null,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...state, loading, refresh };
}
