import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Download, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuizSection from "./QuizSection";
import PaywallModal from "./PaywallModal";

interface LessonOutputProps {
  content: string;
  language: string;
  images?: string[];
  imagesLoading?: boolean;
}

export default function LessonOutput({ content, language, images = [], imagesLoading = false }: LessonOutputProps) {
  const [copied, setCopied] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { toast } = useToast();
  const ref = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast({ title: "Copied!", description: "Lesson note copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    // Trigger the text download as a simple fallback after "payment"
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lesson-note.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Lesson note downloaded successfully." });
    setShowPaywall(false);
  };

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
        return <li key={i} className="ml-5 list-disc text-foreground/90">{renderInline(line.slice(2))}</li>;
      }
      if (/^\d+\.\s/.test(line)) {
        return <li key={i} className="ml-5 list-decimal text-foreground/90">{renderInline(line.replace(/^\d+\.\s/, ""))}</li>;
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="font-semibold mt-2">{line.slice(2, -2)}</p>;
      }
      if (line.trim() === "") {
        return <div key={i} className="h-2" />;
      }
      return <p key={i} className="text-foreground/90 leading-relaxed">{renderInline(line)}</p>;
    });
  };

  const renderInline = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    if (parts.length > 1) {
      return parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part);
    }
    return text;
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="lesson" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="lesson" className="flex-1">Lesson Note</TabsTrigger>
          <TabsTrigger value="quiz" className="flex-1">Quiz</TabsTrigger>
        </TabsList>

        <TabsContent value="lesson">
          <div className="flex gap-3 justify-end mb-4">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <CheckCircle className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPaywall(true)}
              className="border-accent text-accent hover:bg-accent/10"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>

          <div
            ref={ref}
            className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm prose-sm max-w-none"
          >
            {renderContent(content)}
          </div>
        </TabsContent>

        <TabsContent value="quiz">
          <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm">
            <QuizSection lessonContent={content} language={language} />
          </div>
        </TabsContent>
      </Tabs>

      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSuccess={handleDownloadPDF}
      />
    </div>
  );
}
