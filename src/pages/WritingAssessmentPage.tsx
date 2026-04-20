import { useState } from "react";
import WritingAssessmentForm, { type WritingAssessmentFormData } from "@/components/WritingAssessmentForm";
import WritingAssessmentOutput, { type AssessmentData } from "@/components/WritingAssessmentOutput";
import { useToast } from "@/hooks/use-toast";

const ASSESS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assess-writing`;

export default function WritingAssessmentPage() {
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAssess = async (data: WritingAssessmentFormData) => {
    setIsLoading(true);
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
        setIsLoading(false);
        return;
      }
      const result = await resp.json();
      setAssessmentData(result);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to assess writing. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm mb-8">
        <WritingAssessmentForm onAssess={handleAssess} isLoading={isLoading} />
      </div>

      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="h-10 w-10 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Analyzing student writing...</p>
        </div>
      )}

      {assessmentData && <WritingAssessmentOutput data={assessmentData} />}
    </div>
  );
}
