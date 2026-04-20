import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Brain, Eye, EyeOff, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CURRICULA = ["Nigeria (NERDC)", "Ghana", "Kenya"];
const CLASS_OPTIONS: Record<string, string[]> = {
  "Nigeria (NERDC)": ["Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6","JSS 1","JSS 2","JSS 3","SS 1","SS 2","SS 3"],
  "Kenya": ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"],
  "Ghana": ["Primary 1","Primary 2","Primary 3","Primary 4","Primary 5","Primary 6","JHS 1","JHS 2","JHS 3","SHS 1","SHS 2","SHS 3"],
};
const LANGUAGES = ["English", "French"];

const QUIZ_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`;

interface QuizData {
  multipleChoice: { question: string; options: Record<string, string>; answer: string }[];
  shortAnswer: { question: string; answer: string }[];
}

export default function QuizGeneratorPage() {
  const [topic, setTopic] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [language, setLanguage] = useState("English");
  const [notes, setNotes] = useState("");
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const { toast } = useToast();

  const classes = curriculum ? CLASS_OPTIONS[curriculum] || [] : [];

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: "Topic required", description: "Please enter a topic for the quiz.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setQuiz(null);
    setShowAnswers(false);

    const lessonContent = `Topic: ${topic}
Curriculum: ${curriculum || "General"}
Class/Grade: ${classLevel || "General"}
Additional notes: ${notes || "None"}

Generate a quiz suitable for this topic and level.`;

    try {
      const resp = await fetch(QUIZ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ lessonContent, language }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Something went wrong" }));
        toast({ title: "Error", description: err.error, variant: "destructive" });
        return;
      }
      const data = await resp.json();
      setQuiz(data);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to generate quiz. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm mb-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="topic">Quiz Topic *</Label>
          <Input
            id="topic"
            placeholder="e.g. Photosynthesis, Fractions, Nigerian Civil War"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Curriculum</Label>
            <Select value={curriculum} onValueChange={(v) => { setCurriculum(v); setClassLevel(""); }}>
              <SelectTrigger><SelectValue placeholder="Select curriculum" /></SelectTrigger>
              <SelectContent>
                {CURRICULA.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Class / Grade</Label>
            <Select value={classLevel} onValueChange={setClassLevel} disabled={!curriculum}>
              <SelectTrigger><SelectValue placeholder={curriculum ? "Select class" : "Select curriculum first"} /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Paste a lesson note or add context to focus the quiz..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {isLoading ? "Generating quiz..." : "Generate Quiz"}
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <p className="text-muted-foreground">Generating quiz questions...</p>
        </div>
      )}

      {quiz && (
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary font-heading">Quiz Questions</h3>
            <Button variant="outline" size="sm" onClick={() => setShowAnswers(!showAnswers)}>
              {showAnswers ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {showAnswers ? "Hide Answers" : "Show Answers"}
            </Button>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Multiple Choice</h4>
            {quiz.multipleChoice.map((q, i) => (
              <div key={i} className="bg-background border border-border rounded-lg p-4 space-y-2">
                <p className="font-medium">{i + 1}. {q.question}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-4">
                  {Object.entries(q.options).map(([key, val]) => (
                    <p
                      key={key}
                      className={`text-sm px-2 py-1 rounded ${
                        showAnswers && key === q.answer
                          ? "bg-accent/15 text-accent-foreground font-semibold border border-accent/40"
                          : "text-foreground/80"
                      }`}
                    >
                      {key}. {val}
                    </p>
                  ))}
                </div>
                {showAnswers && (
                  <p className="text-sm text-accent font-medium ml-4">✓ Answer: {q.answer}</p>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Short Answer</h4>
            {quiz.shortAnswer.map((q, i) => (
              <div key={i} className="bg-background border border-border rounded-lg p-4 space-y-2">
                <p className="font-medium">{i + 1}. {q.question}</p>
                {showAnswers && (
                  <p className="text-sm bg-muted p-2 rounded border border-border">
                    <strong>Answer:</strong> {q.answer}
                  </p>
                )}
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={handleGenerate} className="w-full">
            <Brain className="mr-2 h-4 w-4" />
            Regenerate Quiz
          </Button>
        </div>
      )}
    </div>
  );
}
