import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuizData {
  multipleChoice: {
    question: string;
    options: Record<string, string>;
    answer: string;
  }[];
  shortAnswer: {
    question: string;
    answer: string;
  }[];
}

interface QuizSectionProps {
  lessonContent: string;
  language: string;
}

const QUIZ_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`;

export default function QuizSection({ lessonContent, language }: QuizSectionProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    setQuiz(null);
    setShowAnswers(false);

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
        setIsLoading(false);
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

  if (!quiz && !isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Brain className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center max-w-md">
          Generate a quiz based on the lesson note to test student understanding.
        </p>
        <Button onClick={handleGenerate} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Brain className="mr-2 h-4 w-4" />
          Generate Quiz
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <p className="text-muted-foreground">Generating quiz questions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary font-heading">Quiz Questions</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAnswers(!showAnswers)}
        >
          {showAnswers ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {showAnswers ? "Hide Answers" : "Show Answers"}
        </Button>
      </div>

      {/* Multiple Choice */}
      <div className="space-y-4">
        <h4 className="font-semibold text-foreground">Multiple Choice</h4>
        {quiz?.multipleChoice.map((q, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
            <p className="font-medium">{i + 1}. {q.question}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-4">
              {Object.entries(q.options).map(([key, val]) => (
                <p
                  key={key}
                  className={`text-sm px-2 py-1 rounded ${
                    showAnswers && key === q.answer
                      ? "bg-green-100 text-green-800 font-semibold border border-green-300"
                      : "text-foreground/80"
                  }`}
                >
                  {key}. {val}
                </p>
              ))}
            </div>
            {showAnswers && (
              <p className="text-sm text-green-700 font-medium ml-4">✓ Answer: {q.answer}</p>
            )}
          </div>
        ))}
      </div>

      {/* Short Answer */}
      <div className="space-y-4">
        <h4 className="font-semibold text-foreground">Short Answer</h4>
        {quiz?.shortAnswer.map((q, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
            <p className="font-medium">{i + 1}. {q.question}</p>
            {showAnswers && (
              <p className="text-sm text-green-700 bg-green-50 p-2 rounded border border-green-200">
                <strong>Answer:</strong> {q.answer}
              </p>
            )}
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={handleGenerate}
        className="w-full"
      >
        <Brain className="mr-2 h-4 w-4" />
        Regenerate Quiz
      </Button>
    </div>
  );
}
