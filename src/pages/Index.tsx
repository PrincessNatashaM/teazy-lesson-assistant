import { useState } from "react";
import LessonForm, { type LessonFormData } from "@/components/LessonForm";
import LessonOutput from "@/components/LessonOutput";
import WritingAssessmentForm, { type WritingAssessmentFormData } from "@/components/WritingAssessmentForm";
import WritingAssessmentOutput, { type AssessmentData } from "@/components/WritingAssessmentOutput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import teazyLogo from "@/assets/teazy-logo.jpg";

const LESSON_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lesson`;
const ASSESS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assess-writing`;

export default function Index() {
  const [lessonPlan, setLessonPlan] = useState("");
  const [language, setLanguage] = useState("English");
  const [isLessonLoading, setIsLessonLoading] = useState(false);
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [isAssessLoading, setIsAssessLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (data: LessonFormData) => {
    setIsLessonLoading(true);
    setLessonPlan("");
    setLanguage(data.language);

    try {
      const resp = await fetch(LESSON_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(data),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Something went wrong" }));
        toast({ title: "Error", description: err.error, variant: "destructive" });
        setIsLessonLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setLessonPlan(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to generate lesson note. Please try again.", variant: "destructive" });
    } finally {
      setIsLessonLoading(false);
    }
  };

  const handleAssess = async (data: WritingAssessmentFormData) => {
    setIsAssessLoading(true);
    setAssessmentData(null);

    try {
      const resp = await fetch(ASSESS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(data),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Something went wrong" }));
        toast({ title: "Error", description: err.error, variant: "destructive" });
        setIsAssessLoading(false);
        return;
      }

      const result = await resp.json();
      setAssessmentData(result);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to assess writing. Please try again.", variant: "destructive" });
    } finally {
      setIsAssessLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <img src={teazyLogo} alt="Teazy Tech logo" className="h-10 w-10 rounded-lg object-contain bg-background" />
          <h1 className="text-xl font-bold text-primary-foreground font-heading">Teazy AI</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary font-heading mb-2">
            Your AI-Powered Teaching Assistant
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Generate detailed lesson notes or assess student writing — all aligned to your curriculum.
          </p>
        </div>

        <Tabs defaultValue="lesson" className="w-full">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="lesson" className="flex-1">Lesson Note Generator</TabsTrigger>
            <TabsTrigger value="writing" className="flex-1">Writing Assessment</TabsTrigger>
          </TabsList>

          <TabsContent value="lesson">
            <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm mb-8">
              <LessonForm onGenerate={handleGenerate} isLoading={isLessonLoading} />
            </div>

            {isLessonLoading && !lessonPlan && (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="h-10 w-10 rounded-full border-4 border-accent border-t-transparent animate-spin" />
                <p className="text-muted-foreground">Crafting your detailed lesson note...</p>
              </div>
            )}

            {lessonPlan && <LessonOutput content={lessonPlan} language={language} />}
          </TabsContent>

          <TabsContent value="writing">
            <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm mb-8">
              <WritingAssessmentForm onAssess={handleAssess} isLoading={isAssessLoading} />
            </div>

            {isAssessLoading && (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="h-10 w-10 rounded-full border-4 border-accent border-t-transparent animate-spin" />
                <p className="text-muted-foreground">Analyzing student writing...</p>
              </div>
            )}

            {assessmentData && <WritingAssessmentOutput data={assessmentData} />}
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Teazy Tech — Empowering teachers with technology.
        </p>
      </footer>
    </div>
  );
}
