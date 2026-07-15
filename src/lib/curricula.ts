// Curriculum-first data model for Assessment Marker.
// Adding a new curriculum, subject, or class only requires editing this file.

export type MarkingProfile =
  | "math"
  | "sciences"
  | "english"
  | "literature"
  | "geography"
  | "history"
  | "languages"
  | "religious"
  | "general";

export type SchoolLevel = "primary" | "junior" | "senior";

export interface Subject {
  id: string;
  label: string;
  profile: MarkingProfile;
  /** Which school levels this subject is taught at. Omit = all levels. */
  levels?: SchoolLevel[];
}


export interface Curriculum {
  id: string;
  label: string;
  flag: string;
  country: string;
  terminology: {
    exam: string; // e.g. "Examination", "Assessment"
    class: string; // e.g. "Class", "Grade", "Form"
  };
  classes: string[];
  subjects: Subject[];
}

const s = (
  id: string,
  label: string,
  profile: MarkingProfile,
  levels?: SchoolLevel[],
): Subject => ({ id, label, profile, levels });

const ALL: SchoolLevel[] = ["primary", "junior", "senior"];
const JS: SchoolLevel[] = ["junior", "senior"];
const PJ: SchoolLevel[] = ["primary", "junior"];
const SEN: SchoolLevel[] = ["senior"];

const NIGERIA_SUBJECTS: Subject[] = [
  s("english-studies", "English Studies", "english", ALL),
  s("mathematics", "Mathematics", "math", ALL),
  s("further-mathematics", "Further Mathematics", "math", SEN),
  s("basic-science", "Basic Science", "sciences", PJ),
  s("basic-technology", "Basic Technology", "sciences", PJ),
  s("computer-studies", "Computer Studies", "general", ALL),
  s("social-studies", "Social Studies", "general", PJ),
  s("civic-education", "Civic Education", "general", ALL),
  s("agricultural-science", "Agricultural Science", "sciences", JS),
  s("business-studies", "Business Studies", "general", JS),
  s("biology", "Biology", "sciences", SEN),
  s("chemistry", "Chemistry", "sciences", SEN),
  s("physics", "Physics", "sciences", SEN),
  s("government", "Government", "general", SEN),
  s("economics", "Economics", "general", SEN),
  s("geography", "Geography", "geography", SEN),
  s("literature", "Literature in English", "literature", SEN),
  s("financial-accounting", "Financial Accounting", "math", SEN),
  s("crs", "Christian Religious Studies", "religious", ALL),
  s("irs", "Islamic Religious Studies", "religious", ALL),
  s("french", "French", "languages", ALL),
  s("hausa", "Hausa", "languages", ALL),
  s("igbo", "Igbo", "languages", ALL),
  s("yoruba", "Yoruba", "languages", ALL),
  s("home-economics", "Home Economics", "general", JS),
  s("history", "History", "history", ALL),
  s("phe", "Physical & Health Education (PHE)", "general", ALL),
];

const NIGERIA_CLASSES = [
  "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  "JSS 1", "JSS 2", "JSS 3",
  "SS 1", "SS 2", "SS 3",
];

const KENYA_SUBJECTS: Subject[] = [
  s("english", "English", "english", ALL),
  s("kiswahili", "Kiswahili", "languages", ALL),
  s("mathematics", "Mathematics", "math", ALL),
  s("integrated-science", "Integrated Science", "sciences", ALL),
  s("social-studies", "Social Studies", "general", ALL),
  s("agriculture", "Agriculture", "sciences", JS),
  s("creative-arts", "Creative Arts", "general", ALL),
  s("pre-technical", "Pre-Technical Studies", "general", JS),
  s("religious-education", "Religious Education", "religious", ALL),
  s("health-education", "Health Education", "general", ALL),
  s("computer-science", "Computer Science", "general", JS),
  s("french", "French", "languages", JS),
];

const KENYA_CLASSES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
];

const GHANA_SUBJECTS: Subject[] = [
  s("english-language", "English Language", "english", ALL),
  s("mathematics", "Mathematics", "math", ALL),
  s("science", "Science", "sciences", ALL),
  s("computing", "Computing", "general", ALL),
  s("creative-arts", "Creative Arts & Design", "general", PJ),
  s("career-technology", "Career Technology", "general", JS),
  s("french", "French", "languages", JS),
  s("rme", "Religious & Moral Education", "religious", ALL),
  s("social-studies", "Social Studies", "general", ALL),
  s("ghanaian-language", "Ghanaian Language", "languages", ALL),
];

const GHANA_CLASSES = [
  "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  "JHS 1", "JHS 2", "JHS 3",
  "SHS 1", "SHS 2", "SHS 3",
];

// WAEC / NECO are terminal senior-secondary exams taken in SS 3.
const WAEC_NECO_SUBJECTS: Subject[] = NIGERIA_SUBJECTS.filter((sub) =>
  ["english-studies", "mathematics", "further-mathematics", "biology", "chemistry", "physics",
   "literature", "government", "economics", "geography", "history", "agricultural-science",
   "financial-accounting", "crs", "irs", "french", "hausa", "igbo", "yoruba",
   "computer-studies", "civic-education"].includes(sub.id),
).map((sub) => ({ ...sub, levels: SEN }));

const WAEC_NECO_CLASSES = ["SS 3"];


export const CURRICULA: Curriculum[] = [
  {
    id: "nigeria-nerdc",
    label: "Nigeria (NERDC)",
    flag: "🇳🇬",
    country: "Nigeria",
    terminology: { exam: "Examination", class: "Class" },
    classes: NIGERIA_CLASSES,
    subjects: NIGERIA_SUBJECTS,
  },
  {
    id: "waec",
    label: "WAEC",
    flag: "🇳🇬",
    country: "Nigeria / West Africa",
    terminology: { exam: "Examination", class: "Class" },
    classes: WAEC_NECO_CLASSES,
    subjects: WAEC_NECO_SUBJECTS,
  },
  {
    id: "neco",
    label: "NECO",
    flag: "🇳🇬",
    country: "Nigeria",
    terminology: { exam: "Examination", class: "Class" },
    classes: WAEC_NECO_CLASSES,
    subjects: WAEC_NECO_SUBJECTS,
  },
  {
    id: "kenya-cbc",
    label: "Kenya CBC",
    flag: "🇰🇪",
    country: "Kenya",
    terminology: { exam: "Assessment", class: "Grade" },
    classes: KENYA_CLASSES,
    subjects: KENYA_SUBJECTS,
  },
  {
    id: "ghana",
    label: "Ghana Curriculum",
    flag: "🇬🇭",
    country: "Ghana",
    terminology: { exam: "Examination", class: "Class" },
    classes: GHANA_CLASSES,
    subjects: GHANA_SUBJECTS,
  },
];

export const ASSESSMENT_TYPES = [
  { id: "essay", label: "Essay / Creative Writing", hint: "Narrative, descriptive, argumentative or letter writing." },
  { id: "theory", label: "Theory Questions", hint: "Long-answer or short-answer theory response questions." },
  { id: "ca", label: "Continuous Assessment (CA)", hint: "In-term formative assessment." },
  { id: "homework", label: "Homework", hint: "Take-home assignment." },
  { id: "classwork", label: "Classwork", hint: "In-class exercise or task." },
  { id: "end-of-term", label: "End-of-Term Examination", hint: "Summative end-of-term paper." },
  { id: "mid-term", label: "Mid-Term Examination", hint: "Mid-term progress check." },
  { id: "practical", label: "Practical Report", hint: "Lab or practical write-up." },
  { id: "project", label: "Project", hint: "Multi-page student project." },
  { id: "mixed", label: "Mixed Examination Script", hint: "Combined objectives, theory and essay in one paper." },
] as const;

export type AssessmentTypeId = (typeof ASSESSMENT_TYPES)[number]["id"];

export const MARKING_STYLES = [
  { id: "strict", label: "Strict", hint: "Rigorous scoring — deducts for every error, minimal benefit of the doubt." },
  { id: "standard", label: "Standard", hint: "Balanced grading aligned to the curriculum's expected level." },
  { id: "lenient", label: "Lenient", hint: "Encouraging scoring — rewards effort, weighs strengths heavily." },
] as const;

export type MarkingStyleId = (typeof MARKING_STYLES)[number]["id"];

export function getCurriculum(id: string): Curriculum | undefined {
  return CURRICULA.find((c) => c.id === id);
}

/** Map any class/grade label to a broad school level. */
export function classToLevel(classLabel: string): SchoolLevel | null {
  if (!classLabel) return null;
  const c = classLabel.toLowerCase();
  if (/\bprimary\b|\bp\s?\d/.test(c)) return "primary";
  if (/\bjss\b|\bjhs\b/.test(c)) return "junior";
  if (/\bss\b|\bshs\b/.test(c)) return "senior";
  const gr = c.match(/grade\s*(\d+)/);
  if (gr) {
    const n = parseInt(gr[1], 10);
    if (n <= 6) return "primary";
    if (n <= 9) return "junior";
    return "senior";
  }
  return null;
}

/** Filter a curriculum's subjects to those taught at the given class level. */
export function subjectsForClass(curriculum: Curriculum, classLabel: string): Subject[] {
  const level = classToLevel(classLabel);
  if (!level) return curriculum.subjects;
  return curriculum.subjects.filter((sub) => !sub.levels || sub.levels.includes(level));
}

/** WAEC/NECO are terminal SS-3 exams — no class picker needed. */
export function isTerminalExamBody(curriculumId: string): boolean {
  return curriculumId === "waec" || curriculumId === "neco";
}

