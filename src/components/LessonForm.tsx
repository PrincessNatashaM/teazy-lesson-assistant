import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const CURRICULA = ["Nigeria (NERDC)", "Ghana", "Kenya"];

const CLASS_OPTIONS: Record<string, string[]> = {
  "Nigeria (NERDC)": [
    "Nursery",
    "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
    "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3",
  ],
  "Kenya": [
    "PP1", "PP2",
    "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
    "Grade 7", "Grade 8", "Grade 9",
    "Senior School",
  ],
  "Ghana": [
    "Kindergarten",
    "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
    "JHS 1", "JHS 2", "JHS 3",
    "SHS 1", "SHS 2", "SHS 3",
  ],
};

const CURRICULUM_HINTS: Record<string, string> = {
  "Nigeria (NERDC)": "Nigeria NERDC subjects loaded",
  "Kenya": "Kenya CBC subjects loaded",
  "Ghana": "Ghana Education Service subjects loaded",
};

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
      "Physical & Health Education",
    ],
    junior: [
      "English Language", "Mathematics", "Basic Science", "Basic Technology",
      "Social Studies", "Civic Education", "Computer Studies",
      "Christian Religious Studies", "Islamic Religious Studies",
      "Agricultural Science", "Home Economics", "Business Studies",
      "Cultural and Creative Arts", "Yoruba", "Igbo", "Hausa", "French",
      "Physical & Health Education",
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
    if (classLevel === "Nursery" || classLevel.startsWith("Primary")) return "primary";
    if (classLevel.startsWith("JSS")) return "junior";
    if (classLevel.startsWith("SS")) return "senior";
  }
  if (curriculum === "Ghana") {
    if (classLevel === "Kindergarten" || classLevel.startsWith("Primary")) return "primary";
    if (classLevel.startsWith("JHS")) return "junior";
    if (classLevel.startsWith("SHS")) return "senior";
  }
  if (curriculum === "Kenya") {
    if (classLevel.startsWith("PP")) return "primary";
    if (classLevel === "Senior School") return "senior";
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

const AGE_GROUPS = ["3–5 years", "6–8 years", "9–12 years", "13–15 years", "16–18 years", "Adults"];

const PLATFORMS = [
  "Zoom", "Google Meet", "Microsoft Teams", "Google Classroom",
  "Canvas", "Moodle", "Thinkific", "Teachable", "Other",
];

export type TeachingEnvironment = "classroom" | "online";

export interface LessonFormData {
  environment: TeachingEnvironment;
  subject: string;
  classLevel: string;
  topic: string;
  curriculum: string;
  language: string;
  duration: string;
  teachingStyle: string;
  objectives?: string;
  additionalInstructions?: string;
  // Online only
  ageGroup?: string;
  platform?: string;
}

interface LessonFormProps {
  onGenerate: (data: LessonFormData) => void;
  isLoading: boolean;
  initialValues?: Partial<LessonFormData>;
  onFormChange?: (data: LessonFormData) => void;
}

const EMPTY: LessonFormData = {
  environment: "classroom",
  subject: "",
  classLevel: "",
  topic: "",
  curriculum: "",
  language: "English",
  duration: "",
  teachingStyle: "",
  objectives: "",
  additionalInstructions: "",
  ageGroup: "",
  platform: "",
};

export default function LessonForm({ onGenerate, isLoading, initialValues, onFormChange }: LessonFormProps) {
  const [form, setForm] = useState<LessonFormData>({ ...EMPTY, ...(initialValues || {}) });

  // Apply initialValues once
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setForm((f) => ({ ...f, ...initialValues }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onFormChange?.(form);
  }, [form, onFormChange]);

  const isOnline = form.environment === "online";

  const availableSubjects = useMemo(() => {
    if (isOnline) {
      // Broad subject union for online — teacher can pick anything.
      const all = new Set<string>();
      Object.values(SUBJECTS_BY_CURRICULUM).forEach((b) => {
        b.primary.forEach((s) => all.add(s));
        b.junior.forEach((s) => all.add(s));
        b.senior.forEach((s) => all.add(s));
      });
      return Array.from(all).sort();
    }
    if (!form.curriculum) return [];
    const buckets = SUBJECTS_BY_CURRICULUM[form.curriculum];
    if (!buckets) return [];
    const level = getLevel(form.curriculum, form.classLevel);
    if (!level) {
      const all = new Set<string>([...buckets.primary, ...buckets.junior, ...buckets.senior]);
      return Array.from(all);
    }
    return buckets[level];
  }, [form.curriculum, form.classLevel, isOnline]);

  useEffect(() => {
    if (form.subject && !availableSubjects.includes(form.subject)) {
      setForm((f) => ({ ...f, subject: "" }));
    }
  }, [availableSubjects, form.subject]);

  const canSubmit = isOnline
    ? !!(form.subject && form.topic && form.ageGroup && form.platform)
    : !!(form.subject && form.classLevel && form.topic && form.curriculum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) onGenerate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>Teaching Environment *</Label>
        <div className="grid grid-cols-2 gap-3">
          <EnvOption
            active={form.environment === "classroom"}
            title="Classroom"
            desc="Curriculum-aligned lesson plan"
            onClick={() => setForm({ ...form, environment: "classroom", ageGroup: "", platform: "" })}
          />
          <EnvOption
            active={form.environment === "online"}
            title="Online Teaching"
            desc="Virtual-first lesson plan"
            onClick={() => setForm({ ...form, environment: "online", curriculum: "", classLevel: "" })}
          />
        </div>
      </div>

      {!isOnline && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="curriculum">Curriculum *</Label>
            <Select
              value={form.curriculum}
              onValueChange={(v) => setForm({ ...form, curriculum: v, classLevel: "", subject: "" })}
            >
              <SelectTrigger id="curriculum"><SelectValue placeholder="Select curriculum" /></SelectTrigger>
              <SelectContent>
                {CURRICULA.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {form.curriculum && (
              <p className="text-xs text-accent font-medium">{CURRICULUM_HINTS[form.curriculum]}</p>
            )}
          </div>

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
        </div>
      )}

      {isOnline && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ageGroup">Age Group *</Label>
            <Select value={form.ageGroup} onValueChange={(v) => setForm({ ...form, ageGroup: v })}>
              <SelectTrigger id="ageGroup"><SelectValue placeholder="Select age group" /></SelectTrigger>
              <SelectContent>
                {AGE_GROUPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform">Teaching Platform *</Label>
            <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
              <SelectTrigger id="platform"><SelectValue placeholder="Select platform" /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subject">Subject *</Label>
          <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
            <SelectTrigger id="subject"><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {availableSubjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Language *</Label>
          <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
            <SelectTrigger id="language"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
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
            <SelectTrigger id="style"><SelectValue placeholder="Select style" /></SelectTrigger>
            <SelectContent>
              {TEACHING_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="objectives">Learning Objectives (optional)</Label>
        <Textarea
          id="objectives"
          rows={2}
          placeholder="e.g. Students will be able to add and subtract fractions with unlike denominators."
          value={form.objectives || ""}
          onChange={(e) => setForm({ ...form, objectives: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Additional Instructions (optional)</Label>
        <Textarea
          id="instructions"
          rows={2}
          placeholder="Any special context, prior knowledge, or focus areas."
          value={form.additionalInstructions || ""}
          onChange={(e) => setForm({ ...form, additionalInstructions: e.target.value })}
        />
      </div>

      <Button
        type="submit"
        disabled={!canSubmit || isLoading}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-base h-12"
      >
        {isLoading ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Detailed Lesson Note...</>
        ) : (
          <><Sparkles className="mr-2 h-5 w-5" /> Generate Lesson Note</>
        )}
      </Button>
    </form>
  );
}

function EnvOption({ active, title, desc, onClick }: { active: boolean; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left rounded-xl border-2 p-4 transition-all hover:border-accent/60",
        active ? "border-accent bg-accent/5" : "border-border bg-background",
      )}
    >
      <div className="font-semibold text-navy">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
    </button>
  );
}
