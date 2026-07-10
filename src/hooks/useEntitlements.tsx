import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type EntitlementKind = "download_pdf" | "download_docx" | "edit_unlock";
export type PlanId = "free" | "standard" | "pro";

export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface EntitlementState {
  /** True for Standard OR Pro subscribers — grants downloads & editing. */
  proActive: boolean;
  plan: PlanId;
  currentPeriodEnd: string | null;
  unlockedKinds: Set<EntitlementKind>;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useEntitlements(lessonHash: string | null): EntitlementState {
  const { user } = useAuth();
  const [proActive, setProActive] = useState(false);
  const [plan, setPlan] = useState<PlanId>("free");
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [unlockedKinds, setUnlockedKinds] = useState<Set<EntitlementKind>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProActive(false);
      setPlan("free");
      setCurrentPeriodEnd(null);
      setUnlockedKinds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: sub }, ents] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("status,plan,current_period_end")
        .eq("user_id", user.id)
        .maybeSingle(),
      lessonHash
        ? supabase
            .from("entitlements")
            .select("kind")
            .eq("user_id", user.id)
            .eq("lesson_hash", lessonHash)
        : Promise.resolve({ data: [] as { kind: string }[] }),
    ]);

    const active =
      sub?.status === "active" &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
    const activePlan: PlanId =
      active && (sub?.plan === "pro" || sub?.plan === "pro_monthly")
        ? "pro"
        : active && sub?.plan === "standard"
          ? "standard"
          : "free";
    setPlan(activePlan);
    setProActive(activePlan !== "free");
    setCurrentPeriodEnd(sub?.current_period_end ?? null);
    setUnlockedKinds(new Set(((ents as any).data || []).map((e: any) => e.kind)));
    setLoading(false);
  }, [user, lessonHash]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { proActive, plan, currentPeriodEnd, unlockedKinds, loading, refresh };
}
