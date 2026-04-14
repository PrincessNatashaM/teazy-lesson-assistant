import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Download, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface LessonOutputProps {
  content: string;
}

export default function LessonOutput({ content }: LessonOutputProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const ref = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast({ title: "Copied!", description: "Lesson plan copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lesson-plan.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Lesson plan saved as text file." });
  };

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("# ")) {
        return <h2 key={i} className="text-xl font-bold text-primary mt-6 mb-2 font-heading">{line.slice(2)}</h2>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={i} className="text-lg font-semibold text-primary mt-5 mb-1 font-heading">{line.slice(3)}</h3>;
      }
      if (line.startsWith("### ")) {
        return <h4 key={i} className="text-base font-semibold mt-3 mb-1">{line.slice(4)}</h4>;
      }
      if (line.startsWith("- ")) {
        return <li key={i} className="ml-5 list-disc text-foreground/90">{line.slice(2)}</li>;
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="font-semibold mt-2">{line.slice(2, -2)}</p>;
      }
      if (line.trim() === "") {
        return <div key={i} className="h-2" />;
      }
      // Bold inline
      const parts = line.split(/\*\*(.*?)\*\*/g);
      if (parts.length > 1) {
        return (
          <p key={i} className="text-foreground/90 leading-relaxed">
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
          </p>
        );
      }
      return <p key={i} className="text-foreground/90 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 justify-end">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <CheckCircle className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </div>

      <div
        ref={ref}
        className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm prose-sm max-w-none"
      >
        {renderContent(content)}
      </div>
    </div>
  );
}
