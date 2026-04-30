import { useState } from "react";
import LessonForm, { type LessonFormData } from "@/components/LessonForm";
import LessonOutput from "@/components/LessonOutput";
import { useToast } from "@/hooks/use-toast";

const LESSON_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lesson`;
const IMAGES_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lesson-images`;

export default function LessonNotesPage() {
  const [lessonPlan, setLessonPlan] = useState("");
  const [language, setLanguage] = useState("English");
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (data: LessonFormData) => {
    setIsLoading(true);
    setLessonPlan("");
    setImages([]);
    setImagesLoading(false);
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
        setIsLoading(false);
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
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm mb-8">
        <LessonForm onGenerate={handleGenerate} isLoading={isLoading} />
      </div>

      {isLoading && !lessonPlan && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="h-10 w-10 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Crafting your detailed lesson note...</p>
        </div>
      )}

      {lessonPlan && <LessonOutput content={lessonPlan} language={language} />}
    </div>
  );
}
