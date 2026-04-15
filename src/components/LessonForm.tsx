import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";

const SUBJECTS = [
  "Mathematics", "English Language", "Basic Science", "Basic Technology",
  "Social Studies", "Civic Education", "Agricultural Science",
  "Computer Studies / ICT", "Christian Religious Studies",
  "Islamic Religious Studies", "Physical and Health Education",
  "Home Economics", "Business Studies", "French", "Yoruba", "Igbo",
  "Hausa", "Creative Arts", "Music", "Biology", "Chemistry", "Physics",
  "Economics", "Government", "Literature in English", "Geography",
];

const CURRICULA = [
  "Nigeria (NERDC)",
  "Ghana",
  "Kenya",
];

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

const LANGUAGES = ["English", "French"];

const TEACHING_STYLES = [
  "Activity-based", "Lecture", "Discussion", "Demonstration",
  "Group Work", "Project-based",
];

export interface LessonFormData {
  subject: string;
  classLevel: string;
  topic: string;
  curriculum: string;
  language: string;
  duration: string;
  teachingStyle: string;
}

interface LessonFormProps {
  onGenerate: (data: LessonFormData) => void;
  isLoading: boolean;
}

export default function LessonForm({ onGenerate, isLoading }: LessonFormProps) {
  const [form, setForm] = useState<LessonFormData>({
    subject: "",
    classLevel: "",
    topic: "",
    curriculum: "",
    language: "English",
    duration: "",
    teachingStyle: "",
  });

  const canSubmit = form.subject && form.classLevel && form.topic && form.curriculum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) onGenerate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="curriculum">Curriculum *</Label>
          <Select value={form.curriculum} onValueChange={(v) => setForm({ ...form, curriculum: v })}>
            <SelectTrigger id="curriculum">
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
          <Label htmlFor="language">Language *</Label>
          <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
            <SelectTrigger id="language">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subject">Subject *</Label>
          <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
            <SelectTrigger id="subject">
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {SUBJECTS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="class">Class *</Label>
          <Select value={form.classLevel} onValueChange={(v) => setForm({ ...form, classLevel: v })}>
            <SelectTrigger id="class">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {CLASSES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="topic">Topic *</Label>
        <Input
          id="topic"
          placeholder="e.g. Fractions and Decimals"
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Lesson Duration</Label>
          <Input
            id="duration"
            placeholder="e.g. 40 minutes"
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="style">Teaching Style</Label>
          <Select value={form.teachingStyle} onValueChange={(v) => setForm({ ...form, teachingStyle: v })}>
            <SelectTrigger id="style">
              <SelectValue placeholder="Select style" />
            </SelectTrigger>
            <SelectContent>
              {TEACHING_STYLES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!canSubmit || isLoading}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base h-12"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generating Detailed Lesson Note...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-5 w-5" />
            Generate Lesson Note
          </>
        )}
      </Button>
    </form>
  );
}
