import { useState, useMemo, useRef, useEffect } from "react";
import LessonForm, { type LessonFormData } from "@/components/LessonForm";
import LessonOutput from "@/components/LessonOutput";
import UsageTracker from "@/components/UsageTracker";
import UpgradeModal from "@/components/UpgradeModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuthGate } from "@/hooks/useAuthGate";
import { consumePendingAction } from "@/lib/pendingAction";
import { consumeFeatureUsage, useFeatureUsage } from "@/hooks/useFeatureUsage";

const LESSON_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lesson`;
const IMAGES_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lesson-images`;

const VISUAL_SUBJECTS = ["math", "biology", "basic science", "physics", "chemistry", "geography", "agric"];
const VISUAL_KEYWORDS = [
  "diagram", "shape", "cycle", "cell", "organ", "system", "circuit", "map",
  "structure", "anatomy", "geometry", "triangle", "polygon", "graph",
  "ecosystem", "photosynthesis", "respiration", "digestion", "force",
  "motion", "wave", "atom", "molecule", "reaction",
];

function shouldGenerateDiagrams(subject: string, topic: string): boolean {
  const s = (subject || "").toLowerCase();
  const t = (topic || "").toLowerCase();
  if (VISUAL_SUBJECTS.some((v) => s.includes(v))) return true;
  if (VISUAL_KEYWORDS.some((k) => t.includes(k))) return true;
  return false;
}

function loadingMessageFor(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("math")) return "Generating formulas, worked examples and diagrams...";
  if (s.includes("biology") || s.includes("basic science"))
    return "Creating labeled instructional visuals...";
  if (s.includes("physics")) return "Building circuits, formulas and force diagrams...";
  if (s.includes("chemistry")) return "Drawing reactions and lab apparatus...";
  if (s.includes("geography")) return "Mapping out landforms and regional examples...";
  if (s.includes("english") || s.includes("literature"))
    return "Structuring lesson content and exercises...";
  return "Crafting your detailed lesson note...";
}

export default function LessonNotesPage() {
  const [lessonPlan, setLessonPlan] = useState("");
  const [language, setLanguage] = useState("English");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState<Partial<LessonFormData> | undefined>();
  const currentFormRef = useRef<LessonFormData | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const savedIdRef = useRef<string | null>(null);
  const lastMetaRef = useRef<LessonFormData | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const usage = useFeatureUsage();

  const loadingMessage = useMemo(() => loadingMessageFor(subject), [subject]);

  // Restore pending form values (and auto-submit if requested) after login.
  useEffect(() => {
    const pending = consumePendingAction("lesson");
    if (pending?.formData) {
      setInitialFormValues(pending.formData as Partial<LessonFormData>);
      if (pending.autoSubmit && user) {
        // Wait a tick for the form to render + apply initialValues
        setTimeout(() => handleGenerate(pending.formData as LessonFormData), 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const persistLesson = async (content: string) => {
    if (!user || !content || content.length < 100) return;
    const meta = lastMetaRef.current;
    if (!meta) return;
    const title = `${meta.subject || "Lesson"} · ${meta.topic || "Untitled"}`;
    try {
      if (savedIdRef.current) {
        await supabase.from("saved_lessons").update({ content, title }).eq("id", savedIdRef.current);
      } else {
        const { data } = await supabase.from("saved_lessons").insert({
          user_id: user.id,
          title,
          curriculum: meta.curriculum || (meta.environment === "online" ? "Online" : ""),
          subject: meta.subject,
          class_level: meta.classLevel || meta.ageGroup || "",
          topic: meta.topic,
          language: meta.language,
          content,
        }).select("id").single();
        if (data?.id) savedIdRef.current = data.id;
      }
    } catch (e) {
      console.error("save lesson failed", e);
    }
  };

  const handleGenerate = async (data: LessonFormData) => {
    // Gate: require auth. If not signed in, save current form snapshot and open modal.
    if (!requireAuth({
      feature: "lesson",
      formData: data,
      autoSubmit: true,
    })) return;

    setIsLoading(true);
    setLessonPlan("");
    setImages([]);
    setImagesLoading(false);
    setLanguage(data.language);
    setSubject(data.subject);
    setTopic(data.topic);
    savedIdRef.current = null;
    lastMetaRef.current = data;

    const needsDiagrams = data.environment === "classroom" && shouldGenerateDiagrams(data.subject, data.topic);
    if (needsDiagrams) {
      setImagesLoading(true);
      fetch(IMAGES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          subject: data.subject,
          classLevel: data.classLevel,
          topic: data.topic,
          curriculum: data.curriculum,
        }),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error("image gen failed");
          const json = await r.json();
          setImages(Array.isArray(json.images) ? json.images : []);
        })
        .catch((err) => console.error("Image generation failed:", err))
        .finally(() => setImagesLoading(false));
    }

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
      if (fullText) await persistLesson(fullText);
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
        <LessonForm
          onGenerate={handleGenerate}
          isLoading={isLoading}
          initialValues={initialFormValues}
          onFormChange={(f) => { currentFormRef.current = f; }}
        />
      </div>

      {isLoading && !lessonPlan && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="h-10 w-10 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          <p className="text-muted-foreground">{loadingMessage}</p>
        </div>
      )}

      {lessonPlan && (
        <LessonOutput
          content={lessonPlan}
          language={language}
          images={images}
          imagesLoading={imagesLoading}
          subject={subject}
          topic={topic}
        />
      )}
    </div>
  );
}
