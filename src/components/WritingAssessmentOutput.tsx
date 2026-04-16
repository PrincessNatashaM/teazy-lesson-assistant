import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, Download, Star, TrendingUp, AlertCircle, MessageSquare, PenLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PaywallModal from "./PaywallModal";

interface RubricItem {
  score: number;
  explanation: string;
}

export interface AssessmentData {
  overallScore: number;
  rubric: {
    contentIdeas: RubricItem;
    organization: RubricItem;
    grammarMechanics: RubricItem;
    vocabulary: RubricItem;
    creativity: RubricItem;
  };
  strengths: string[];
  improvements: string[];
  suggestedRewrite: string;
  teacherComment: string;
}

interface Props {
  data: AssessmentData;
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 70 ? "text-green-600" : score >= 50 ? "text-amber-500" : "text-red-500";
  const bg = score >= 70 ? "bg-green-50 border-green-200" : score >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  return (
    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-2 ${bg}`}>
      <span className={`text-2xl font-bold ${color}`}>{score}%</span>
    </div>
  );
}

function RubricRow({ label, item }: { label: string; item: RubricItem }) {
  const barColor = item.score >= 70 ? "bg-green-500" : item.score >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-bold">{item.score}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${item.score}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{item.explanation}</p>
    </div>
  );
}

export default function WritingAssessmentOutput({ data }: Props) {
  const [copied, setCopied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { toast } = useToast();

  const feedbackText = `Overall Score: ${data.overallScore}%

Rubric Breakdown:
- Content/Ideas: ${data.rubric.contentIdeas.score}% — ${data.rubric.contentIdeas.explanation}
- Organization: ${data.rubric.organization.score}% — ${data.rubric.organization.explanation}
- Grammar & Mechanics: ${data.rubric.grammarMechanics.score}% — ${data.rubric.grammarMechanics.explanation}
- Vocabulary: ${data.rubric.vocabulary.score}% — ${data.rubric.vocabulary.explanation}
- Creativity: ${data.rubric.creativity.score}% — ${data.rubric.creativity.explanation}

Strengths:
${data.strengths.map((s) => `• ${s}`).join("\n")}

Areas for Improvement:
${data.improvements.map((i) => `• ${i}`).join("\n")}

Suggested Rewrite:
${data.suggestedRewrite}

Teacher Comment:
${data.teacherComment}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(feedbackText);
    setCopied(true);
    toast({ title: "Copied!", description: "Feedback copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([feedbackText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "writing-assessment.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Assessment downloaded successfully." });
    setShowPaywall(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3 justify-end">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <CheckCircle className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Copied" : "Copy Feedback"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPaywall(true)}
          className="border-accent text-accent hover:bg-accent/10"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </div>

      {/* Overall Score */}
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <h3 className="text-lg font-semibold text-primary font-heading mb-3">Overall Score</h3>
        <ScoreCircle score={data.overallScore} />
      </div>

      {/* Rubric Breakdown */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-primary font-heading flex items-center gap-2">
          <Star className="h-5 w-5" /> Rubric Breakdown
        </h3>
        <RubricRow label="Content / Ideas" item={data.rubric.contentIdeas} />
        <RubricRow label="Organization" item={data.rubric.organization} />
        <RubricRow label="Grammar & Mechanics" item={data.rubric.grammarMechanics} />
        <RubricRow label="Vocabulary" item={data.rubric.vocabulary} />
        <RubricRow label="Creativity" item={data.rubric.creativity} />
      </div>

      {/* Strengths */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-green-700 font-heading flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5" /> Strengths
        </h3>
        <ul className="space-y-2">
          {data.strengths.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Areas for Improvement */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-amber-600 font-heading flex items-center gap-2 mb-3">
          <AlertCircle className="h-5 w-5" /> Areas for Improvement
        </h3>
        <ul className="space-y-2">
          {data.improvements.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-amber-500 mt-0.5">→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Suggested Rewrite */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary font-heading flex items-center gap-2 mb-3">
          <PenLine className="h-5 w-5" /> Suggested Rewrite
        </h3>
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{data.suggestedRewrite}</p>
      </div>

      {/* Teacher Comment */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-primary font-heading flex items-center gap-2 mb-3">
          <MessageSquare className="h-5 w-5" /> Teacher Comment
        </h3>
        <div className="bg-muted rounded-lg p-4">
          <p className="text-sm text-foreground leading-relaxed italic">"{data.teacherComment}"</p>
        </div>
      </div>

      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSuccess={handleDownload}
      />
    </div>
  );
}
