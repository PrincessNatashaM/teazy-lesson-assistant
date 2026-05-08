import { useState, useMemo, useEffect } from "react";
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
  "Nigeria (NERDC)": "Nigeria NERDC subjects loaded",
  "Kenya": "Kenya CBC subjects loaded",
  "Ghana": "Ghana Education Service subjects loaded",
};

// Subject lists by curriculum and education level
const SUBJECTS_BY_CURRICULUM: Record<
  string,
  { primary: string[]; junior: string[]; senior: string[] }
> = {
  "Nigeria (NERDC)": {
    primary: [
      "English Studies", "Mathematics", "Basic Science", "Social Studies",
      "Civic Education", "Cultural and Creative Arts", "Computer Studies",
      "Christian Religious Studies", "Islamic Religious Studies",
      "Yoruba", "Igbo", "Hausa", "French", "Agricultural Science", "Home Economics",
    ],
    junior: [
      "English Language", "Mathematics", "Basic Science", "Basic Technology",
      "Social Studies", "Civic Education", "Computer Studies",
      "Christian Religious Studies", "Islamic Religious Studies",
      "Agricultural Science", "Home Economics", "Business Studies",
      "Cultural and Creative Arts", "Yoruba", "Igbo", "Hausa", "French",
    ],
    senior: [
      "English Language", "Mathematics", "Biology", "Chemistry", "Physics",
      "Economics", "Government", "Literature in English", "Geography",
      "Commerce", "Agricultural Science", "Civic Education", "Computer Studies",
      "Christian Religious Studies", "Islamic Religious Studies",
      "Yoruba", "Igbo", "Hausa", "Further Mathematics",
    ],
  },
  "Ghana": {
    primary: [
      "English Language", "Mathematics", "Science", "Social Studies",
      "Computing", "Creative Arts and Design", "Religious and Moral Education",
      "Ghanaian Language", "French", "Physical and Health Education",
    ],
    junior: [
      "English Language", "Mathematics", "Science", "Social Studies",
      "Computing", "Creative Arts and Design", "Career Technology",
      "Religious and Moral Education", "Ghanaian Language", "French",
      "Physical and Health Education",
    ],
    senior: [
      "Core Mathematics", "English Language", "Integrated Science", "Social Studies",
      "Elective Mathematics", "Biology", "Chemistry", "Physics", "Economics",
      "Government", "Geography", "History", "Literature in English",
      "Financial Accounting", "ICT",
    ],
  },
  "Kenya": {
    primary: [
      "Mathematics", "English", "Kiswahili", "Environmental Activities",
      "Creative Arts", "Religious Education", "Movement Activities",
    ],
    junior: [
      "Mathematics", "English", "Kiswahili", "Integrated Science", "Social Studies",
      "Pre-Technical Studies", "Agriculture", "Business Studies",
      "Life Skills Education", "Health Education", "Creative Arts and Sports",
    ],
    senior: [
      "Mathematics", "English", "Kiswahili", "Biology", "Chemistry", "Physics",
      "Geography", "History", "Agriculture", "Computer Science", "Business Studies",
    ],
  },
};

function getLevel(curriculum: string, classLevel: string): "primary" | "junior" | "senior" | null {
  if (!classLevel) return null;
  if (curriculum === "Nigeria (NERDC)") {
    if (classLevel.startsWith("Primary")) return "primary";
    if (classLevel.startsWith("JSS")) return "junior";
    if (classLevel.startsWith("SS")) return "senior";
  }
  if (curriculum === "Ghana") {
    if (classLevel.startsWith("Primary")) return "primary";
    if (classLevel.startsWith("JHS")) return "junior";
    if (classLevel.startsWith("SHS")) return "senior";
  }
  if (curriculum === "Kenya") {
    const m = classLevel.match(/Grade (\d+)/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    if (n <= 6) return "primary";
    if (n <= 9) return "junior";
    return "senior";
  }
  return null;
}

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

  const availableSubjects = useMemo(() => {
    if (!form.curriculum) return [];
    const buckets = SUBJECTS_BY_CURRICULUM[form.curriculum];
    if (!buckets) return [];
    const level = getLevel(form.curriculum, form.classLevel);
    if (!level) {
      // Union across all levels for this curriculum
      const all = new Set<string>([
        ...buckets.primary, ...buckets.junior, ...buckets.senior,
      ]);
      return Array.from(all);
    }
    return buckets[level];
  }, [form.curriculum, form.classLevel]);

  // Reset subject if it's no longer valid for the chosen curriculum/class
  useEffect(() => {
    if (form.subject && !availableSubjects.includes(form.subject)) {
      setForm((f) => ({ ...f, subject: "" }));
    }
  }, [availableSubjects, form.subject]);

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
          <Select
            value={form.curriculum}
            onValueChange={(v) =>
              setForm({ ...form, curriculum: v, classLevel: "", subject: "" })
            }
          >
            <SelectTrigger id="curriculum">
              <SelectValue placeholder="Select curriculum" />
            </SelectTrigger>
            <SelectContent>
              {CURRICULA.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.curriculum && (
            <p className="text-xs text-accent font-medium">{CURRICULUM_HINTS[form.curriculum]}</p>
          )}
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
          <Label htmlFor="class">Class / Grade *</Label>
          <Select
            value={form.classLevel}
            onValueChange={(v) => setForm({ ...form, classLevel: v })}
            disabled={!form.curriculum}
          >
            <SelectTrigger id="class">
              <SelectValue placeholder={form.curriculum ? "Select class" : "Select curriculum first"} />
            </SelectTrigger>
            <SelectContent>
              {(CLASS_OPTIONS[form.curriculum] || []).map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject *</Label>
          <Select
            value={form.subject}
            onValueChange={(v) => setForm({ ...form, subject: v })}
            disabled={!form.curriculum}
          >
            <SelectTrigger id="subject">
              <SelectValue
                placeholder={
                  form.curriculum
                    ? form.classLevel
                      ? "Select subject"
                      : "Select class for best match"
                    : "Select curriculum first"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableSubjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
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
