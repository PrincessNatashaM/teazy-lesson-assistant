import type { AssessmentStatus } from "@/hooks/useAssessmentStatus";
import { formatResetDate, quotaSummary } from "@/lib/assessmentQuota";

export default function UsageCounter({ status, compact = false }: { status: AssessmentStatus; compact?: boolean }) {
  if (status.loading) return <div className="h-16 rounded-xl bg-muted/40 animate-pulse" />;
  const limit = status.plan === "free" ? status.freeLimit ?? 2 : status.monthlyLimit ?? 0;
  const used = status.plan === "free" ? status.freeUsed ?? 0 : status.monthlyUsed ?? 0;
  const q = quotaSummary(used, limit);
  const reset = formatResetDate(status.resetsAt);

  return (
    <div className={compact ? "" : "rounded-xl border border-border bg-card p-4"}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Assessment uploads</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
        <span className="text-2xl font-bold text-navy">{q.used} / {q.limit}</span>
        <span className="text-sm text-muted-foreground">scripts used this month</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full transition-all ${q.reached ? "bg-destructive" : "bg-primary"}`} style={{ width: `${q.percent}%` }} />
      </div>
      {q.reached ? (
        <p className="mt-2 text-sm font-medium text-destructive">
          You've reached your {q.limit}-script monthly limit.{reset && ` Your allowance resets on ${reset}.`}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {q.remaining} scripts remaining{reset && ` · resets ${reset}`}
        </p>
      )}
    </div>
  );
}
