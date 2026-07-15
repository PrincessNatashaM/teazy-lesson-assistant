import { Progress } from "@/components/ui/progress";
import { BookOpen, ListChecks, PenLine } from "lucide-react";
import { Link } from "react-router-dom";
import { useFeatureUsage, type FeatureUsage } from "@/hooks/useFeatureUsage";

interface RowProps {
  icon: React.ReactNode;
  label: string;
  usage: FeatureUsage;
  href: string;
}

function UsageRow({ icon, label, usage, href }: RowProps) {
  const unlimited = usage.limit === -1;
  const remaining = unlimited ? "Unlimited" : `${Math.max(0, usage.limit - usage.used)} / ${usage.limit} remaining`;
  const pct = unlimited ? 0 : Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100);
  return (
    <Link
      to={href}
      className="block rounded-xl border border-border bg-card p-4 hover:border-accent/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent">
            {icon}
          </div>
          <p className="text-sm font-semibold text-navy">{label}</p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{remaining}</span>
      </div>
      {!unlimited && (
        <Progress value={pct} className="mt-3 h-1.5" />
      )}
    </Link>
  );
}

interface Props {
  compact?: boolean;
  only?: "lesson" | "quiz" | "writing";
}

export default function UsageTracker({ compact = false, only }: Props) {
  const usage = useFeatureUsage();
  if (usage.loading) return null;

  const rows = [
    { key: "lesson" as const, icon: <BookOpen className="h-4 w-4" />, label: "Lesson Notes", usage: usage.lesson, href: "/app" },
    { key: "quiz" as const, icon: <ListChecks className="h-4 w-4" />, label: "Quiz Generator", usage: usage.quiz, href: "/app/quiz" },
    { key: "writing" as const, icon: <PenLine className="h-4 w-4" />, label: "Writing Assessment", usage: usage.writing, href: "/app/writing" },
  ];

  const filtered = only ? rows.filter((r) => r.key === only) : rows;

  return (
    <div className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 sm:grid-cols-3 gap-3"}>
      {filtered.map((r) => (
        <UsageRow key={r.key} icon={r.icon} label={r.label} usage={r.usage} href={r.href} />
      ))}
    </div>
  );
}
