import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type FeatureKind = "lesson" | "quiz" | "writing";
export type UsagePlan = "free" | "standard" | "pro" | "pro_monthly";

export interface FeatureUsage {
  used: number;
  /** -1 = unlimited */
  limit: number;
}

export interface UsageSnapshot {
  plan: UsagePlan;
  periodStart: string | null;
  lesson: FeatureUsage;
  quiz: FeatureUsage;
  writing: FeatureUsage;
  loading: boolean;
  refresh: () => Promise<void>;
}

const empty: FeatureUsage = { used: 0, limit: 10 };

export function useFeatureUsage(): UsageSnapshot {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<UsageSnapshot, "refresh" | "loading">>({
    plan: "free",
    periodStart: null,
    lesson: empty,
    quiz: empty,
    writing: { used: 0, limit: 2 },
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_feature_usage", { _user_id: user.id });
    if (error || !data) {
      setLoading(false);
      return;
    }
    const j = data as any;
    setState({
      plan: (j.plan ?? "free") as UsagePlan,
      periodStart: j.period_start ?? null,
      lesson: { used: j.lesson?.used ?? 0, limit: j.lesson?.limit ?? 10 },
      quiz: { used: j.quiz?.used ?? 0, limit: j.quiz?.limit ?? 10 },
      writing: { used: j.writing?.used ?? 0, limit: j.writing?.limit ?? 2 },
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, loading, refresh };
}

/**
 * Attempts to consume a monthly slot for the given feature.
 * Returns { allowed, used, limit, reason }.
 * Paid plans automatically allow (server-side).
 */
export async function consumeFeatureUsage(
  userId: string,
  kind: FeatureKind,
): Promise<{ allowed: boolean; used?: number; limit?: number; reason?: string; plan?: string }> {
  const { data, error } = await supabase.rpc("consume_feature_usage", {
    _user_id: userId,
    _kind: kind,
  });
  if (error) return { allowed: false, reason: error.message };
  const j = (data ?? {}) as any;
  return {
    allowed: !!j.allowed,
    used: j.used,
    limit: j.limit,
    reason: j.reason,
    plan: j.plan,
  };
}
