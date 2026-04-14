import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";

const SUBJECTS = [
  "Mathematics",
  "English Language",
  "Basic Science",
  "Basic Technology",
  "Social Studies",
  "Civic Education",
  "Agricultural Science",
  "Computer Studies / ICT",
  "Christian Religious Studies",
  "Islamic Religious Studies",
  "Physical and Health Education",
  "Home Economics",
  "Business Studies",
  "French",
  "Yoruba",
  "Igbo",
  "Hausa",
  "Creative Arts",
  "Music",
];

const CLASSES = [
  "Primary 1",
  "Primary 2",
  "Primary 3",
  "Primary 4",
  "Primary 5",
  "Primary 6",
  "JSS 1",
  "JSS 2",
  "JSS 3",
  "SS 1",
  "SS 2",
  "SS 3",
];

const TEACHING_STYLES = [
  "Activity-based",
  "Lecture",
  "Discussion",
  "Demonstration",
  "Group Work",
  "Project-based",
];

interface LessonFormProps {
  onGenerate: (data: LessonFormData) => void;
  isLoading: boolean;
}

export interface LessonFormData {
  subject: string;
  classLevel: string;
  topic: string;
  duration: string;
  objectives: string;
  teachingStyle: string;
}

export default function LessonForm({ onGenerate, isLoading }: LessonFormProps) {
  const [form, setForm] = useState<LessonFormData>({
    subject: "",
    classLevel: "",
    topic: "",
    duration: "",
    objectives: "",
    teachingStyle: "",
  });

  const canSubmit = form.subject && form.classLevel && form.topic;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) onGenerate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

      <div className="space-y-2">
        <Label htmlFor="objectives">Learning Objectives (optional)</Label>
        <Textarea
          id="objectives"
          placeholder="Describe what students should be able to do after the lesson..."
          value={form.objectives}
          onChange={(e) => setForm({ ...form, objectives: e.target.value })}
          rows={3}
        />
      </div>

      <Button
        type="submit"
        disabled={!canSubmit || isLoading}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base h-12"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generating Lesson Plan...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-5 w-5" />
            Generate Lesson Plan
          </>
        )}
      </Button>
    </form>
  );
}
