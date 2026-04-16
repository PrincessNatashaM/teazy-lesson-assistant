import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, PenLine } from "lucide-react";

const CURRICULA = ["Nigeria (NERDC)", "Ghana", "Kenya"];

const CLASS_OPTIONS: Record<string, string[]> = {
  "Nigeria (NERDC)": [
    "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
    "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3",
  ],
  "Kenya": [
    "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
    "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
  ],
  "Ghana": [
    "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
    "JHS 1", "JHS 2", "JHS 3", "SHS 1", "SHS 2", "SHS 3",
  ],
};

const CURRICULUM_HINTS: Record<string, string> = {
  "Nigeria (NERDC)": "You are using the Nigerian NERDC curriculum structure",
  "Kenya": "You are using Kenya CBC (Competency-Based Curriculum) structure",
  "Ghana": "You are using the Ghana Education Service structure",
};

const WRITING_TYPES = ["Narrative", "Descriptive", "Argumentative", "Letter Writing"];
const LANGUAGES = ["English", "French"];

export interface WritingAssessmentFormData {
  curriculum: string;
  classLevel: string;
  writingType: string;
  studentWriting: string;
  language: string;
}

interface Props {
  onAssess: (data: WritingAssessmentFormData) => void;
  isLoading: boolean;
}

export default function WritingAssessmentForm({ onAssess, isLoading }: Props) {
  const [form, setForm] = useState<WritingAssessmentFormData>({
    curriculum: "",
    classLevel: "",
    writingType: "",
    studentWriting: "",
    language: "English",
  });

  const canSubmit = form.curriculum && form.classLevel && form.writingType && form.studentWriting.trim().length > 20;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) onAssess(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="wa-curriculum">Curriculum *</Label>
          <Select value={form.curriculum} onValueChange={(v) => setForm({ ...form, curriculum: v, classLevel: "" })}>
            <SelectTrigger id="wa-curriculum">
              <SelectValue placeholder="Select curriculum" />
            </SelectTrigger>
            <SelectContent>
              {CURRICULA.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wa-class">Class / Grade *</Label>
          <Select
            value={form.classLevel}
            onValueChange={(v) => setForm({ ...form, classLevel: v })}
            disabled={!form.curriculum}
          >
            <SelectTrigger id="wa-class">
              <SelectValue placeholder={form.curriculum ? "Select class" : "Select curriculum first"} />
            </SelectTrigger>
            <SelectContent>
              {(CLASS_OPTIONS[form.curriculum] || []).map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.curriculum && (
            <p className="text-xs text-accent font-medium">{CURRICULUM_HINTS[form.curriculum]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="wa-type">Writing Type *</Label>
          <Select value={form.writingType} onValueChange={(v) => setForm({ ...form, writingType: v })}>
            <SelectTrigger id="wa-type">
              <SelectValue placeholder="Select writing type" />
            </SelectTrigger>
            <SelectContent>
              {WRITING_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wa-language">Language *</Label>
          <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
            <SelectTrigger id="wa-language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wa-writing">Student Writing *</Label>
        <Textarea
          id="wa-writing"
          placeholder="Paste the student's writing here... (minimum 20 characters)"
          value={form.studentWriting}
          onChange={(e) => setForm({ ...form, studentWriting: e.target.value })}
          className="min-h-[180px]"
        />
        <p className="text-xs text-muted-foreground">
          {form.studentWriting.length} characters
        </p>
      </div>

      <Button
        type="submit"
        disabled={!canSubmit || isLoading}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base h-12"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Assessing Writing...
          </>
        ) : (
          <>
            <PenLine className="mr-2 h-5 w-5" />
            Assess Writing
          </>
        )}
      </Button>
    </form>
  );
}
