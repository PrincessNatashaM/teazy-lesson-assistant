/**
 * CSV/Analytics helpers for Assessment Pro batch results.
 */
export interface BatchItemRow {
  student_name: string;
  awarded: number | null;
  max_score: number | null;
  percent: number | null;
  grade: string | null;
  confidence: number | null;
  status: string;
}

function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function itemsToCSV(items: BatchItemRow[]): string {
  const header = ["Student", "Awarded", "Max", "Percent", "Grade", "Confidence", "Status"];
  const rows = items.map((i) => [
    i.student_name, i.awarded ?? "", i.max_score ?? "", i.percent ?? "",
    i.grade ?? "", i.confidence ?? "", i.status,
  ]);
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface Analytics {
  count: number;
  avg: number;
  min: number;
  max: number;
  gradeCounts: Record<string, number>;
  distribution: { bucket: string; count: number }[];
  needsReview: number;
}

export function analyseBatch(items: BatchItemRow[]): Analytics {
  const done = items.filter((i) => i.status === "done" && i.percent !== null);
  const percents = done.map((d) => Number(d.percent));
  const gradeCounts: Record<string, number> = {};
  done.forEach((d) => {
    const g = d.grade || "?";
    gradeCounts[g] = (gradeCounts[g] || 0) + 1;
  });
  const buckets = ["0-40", "40-55", "55-70", "70-85", "85-100"];
  const distribution = buckets.map((b) => ({ bucket: b, count: 0 }));
  percents.forEach((p) => {
    if (p < 40) distribution[0].count++;
    else if (p < 55) distribution[1].count++;
    else if (p < 70) distribution[2].count++;
    else if (p < 85) distribution[3].count++;
    else distribution[4].count++;
  });
  return {
    count: done.length,
    avg: percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : 0,
    min: percents.length ? Math.min(...percents) : 0,
    max: percents.length ? Math.max(...percents) : 0,
    gradeCounts,
    distribution,
    needsReview: done.filter((d) => (d.confidence ?? 100) < 75).length,
  };
}
