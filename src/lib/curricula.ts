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

export interface Subject {
  id: string;
  label: string;
  profile: MarkingProfile;
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

const s = (id: string, label: string, profile: MarkingProfile): Subject => ({ id, label, profile });

const NIGERIA_SUBJECTS: Subject[] = [
  s("english-studies", "English Studies", "english"),
  s("mathematics", "Mathematics", "math"),
  s("further-mathematics", "Further Mathematics", "math"),
  s("basic-science", "Basic Science", "sciences"),
  s("basic-technology", "Basic Technology", "sciences"),
  s("computer-studies", "Computer Studies", "general"),
  s("social-studies", "Social Studies", "general"),
  s("civic-education", "Civic Education", "general"),
  s("agricultural-science", "Agricultural Science", "sciences"),
  s("business-studies", "Business Studies", "general"),
  s("biology", "Biology", "sciences"),
  s("chemistry", "Chemistry", "sciences"),
  s("physics", "Physics", "sciences"),
  s("government", "Government", "general"),
  s("economics", "Economics", "general"),
  s("geography", "Geography", "geography"),
  s("literature", "Literature in English", "literature"),
  s("financial-accounting", "Financial Accounting", "math"),
  s("crs", "Christian Religious Studies", "religious"),
  s("irs", "Islamic Religious Studies", "religious"),
  s("french", "French", "languages"),
  s("hausa", "Hausa", "languages"),
  s("igbo", "Igbo", "languages"),
  s("yoruba", "Yoruba", "languages"),
  s("home-economics", "Home Economics", "general"),
  s("history", "History", "history"),
  s("phe", "Physical & Health Education (PHE)", "general"),
];

const NIGERIA_CLASSES = [
  "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  "JSS 1", "JSS 2", "JSS 3",
  "SS 1", "SS 2", "SS 3",
];

const KENYA_SUBJECTS: Subject[] = [
  s("english", "English", "english"),
  s("kiswahili", "Kiswahili", "languages"),
  s("mathematics", "Mathematics", "math"),
  s("integrated-science", "Integrated Science", "sciences"),
  s("social-studies", "Social Studies", "general"),
  s("agriculture", "Agriculture", "sciences"),
  s("creative-arts", "Creative Arts", "general"),
  s("pre-technical", "Pre-Technical Studies", "general"),
  s("religious-education", "Religious Education", "religious"),
  s("health-education", "Health Education", "general"),
  s("computer-science", "Computer Science", "general"),
  s("french", "French", "languages"),
];

const KENYA_CLASSES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
];

const GHANA_SUBJECTS: Subject[] = [
  s("english-language", "English Language", "english"),
  s("mathematics", "Mathematics", "math"),
  s("science", "Science", "sciences"),
  s("computing", "Computing", "general"),
  s("creative-arts", "Creative Arts & Design", "general"),
  s("career-technology", "Career Technology", "general"),
  s("french", "French", "languages"),
  s("rme", "Religious & Moral Education", "religious"),
  s("social-studies", "Social Studies", "general"),
  s("ghanaian-language", "Ghanaian Language", "languages"),
];

const GHANA_CLASSES = [
  "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
  "JHS 1", "JHS 2", "JHS 3",
  "SHS 1", "SHS 2", "SHS 3",
];

// WAEC / NECO share Nigeria's senior secondary subjects (SS levels).
const WAEC_NECO_SUBJECTS: Subject[] = NIGERIA_SUBJECTS.filter((sub) =>
  ["english-studies", "mathematics", "further-mathematics", "biology", "chemistry", "physics",
   "literature", "government", "economics", "geography", "history", "agricultural-science",
   "financial-accounting", "crs", "irs", "french", "hausa", "igbo", "yoruba",
   "computer-studies", "business-studies", "civic-education", "home-economics"].includes(sub.id),
);

const WAEC_NECO_CLASSES = ["SS 1", "SS 2", "SS 3"];

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
