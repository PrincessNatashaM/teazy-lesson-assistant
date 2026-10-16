export const ASSESSMENT_PRO_LIMIT = 1000;

export interface QuotaSummary {
  used: number;
  limit: number;
  remaining: number;
  reached: boolean;
  percent: number;
}

export function quotaSummary(used: number, limit: number): QuotaSummary {
  const u = Math.max(0, Math.floor(used || 0));
  const l = Math.max(0, Math.floor(limit || 0));
  const remaining = Math.max(0, l - u);
  return {
    used: u,
    limit: l,
    remaining,
    reached: l > 0 && u >= l,
    percent: l > 0 ? Math.min(100, Math.round((u / l) * 100)) : 0,
  };
}

/** "Today", "Yesterday", "3 days ago", or a short date. */
export function relativeDay(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatResetDate(iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}
