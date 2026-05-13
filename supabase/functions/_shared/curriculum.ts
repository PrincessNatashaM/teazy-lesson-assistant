// Centralized curriculum + subject prompt fragments.
// Kept compact so we don't resend long blocks per AI request.

export const curriculumContext: Record<string, string> = {
  "Nigeria (NERDC)":
    `Follow Nigerian NERDC standards. Use: "Set Induction", "Behavioral Objectives", "Evaluation", "scheme of work", "lesson note", "instructional materials". Use Nigerian examples (naira, Onitsha/Balogun markets, Durbar/New Yam festivals, states/landmarks). Mix teacher-led + activities.`,

  "Ghana":
    `Follow Ghana NaCCA/CCP standards. Use "Objectives", "Core Competencies", "Teaching & Learning Activities", "Assessment". Use Ghanaian examples (cedi, Makola/Kejetia markets, fufu/banku, Homowo/Aboakyir festivals, regions). Blend structured + interactive teaching.`,

  "Kenya":
    `Follow Kenya CBC standards. Use "Learning Outcomes", "Key Competencies" (communication, collaboration, critical thinking, creativity, citizenship, digital literacy, self-efficacy), "Learning Experiences/Activities", "Reflection". Use Kenyan examples (shilling, Maasai Mara, Lake Victoria, ugali, counties). Learner-centered, activity-based, community service learning.`,
};

export const lessonTemplates: Record<string, string> = {
  "Nigeria (NERDC)": `
# Lesson Note: [Topic]
## Subject and Class
## Curriculum: Nigeria (NERDC)
## Lesson Duration
## Behavioral Objectives
(4-6 SMART verbs: state, identify, solve, explain)
## Instructional Materials
## Previous Knowledge
## Set Induction (5-7 min)
## Presentation / Lesson Development
### Step 1: [Sub-topic]
**Teacher Activity:** **Board Work:** **Student Activity:** **Likely Student Responses:** **Teacher's Response:**
### Step 2: [Sub-topic]
### Step 3: [Sub-topic]
## Real-Life Examples and Applications (Nigerian)
## Differentiation Strategies
### For Advanced Learners:
### For Struggling Learners:
## Common Misconceptions
## Evaluation (4-6 questions)
## Conclusion (3-5 min)
## Assignment / Homework
## Suggested EdTech Tools`,

  "Kenya": `
# Lesson Note: [Topic]
## Subject and Grade
## Curriculum: Kenya CBC
## Lesson Duration
## Strand / Sub-Strand
## Learning Outcomes (4-6 learner-centered)
## Key Competencies
## Values
## Pertinent and Contemporary Issues (PCIs)
## Learning Resources
## Previous Knowledge / Learner Experience
## Introduction / Engagement (5-7 min)
## Learning Experiences / Activities
### Activity 1: [Sub-topic]
**Facilitator Guide:** **Learner Activity:** **Expected Responses:** **Assessment Cues:**
### Activity 2: [Sub-topic]
### Activity 3: [Sub-topic]
## Real-Life Connections (Kenyan)
## Differentiation Strategies
### For Advanced Learners:
### For Struggling Learners:
## Common Misconceptions
## Reflection
## Extended Activity / Homework
## Community Service Learning Connection
## Suggested EdTech Tools`,

  "Ghana": `
# Lesson Note: [Topic]
## Subject and Class
## Curriculum: Ghana (NaCCA)
## Lesson Duration
## Content Standard
## Objectives (4-6)
## Core Competencies
## Learning Resources
## Previous Knowledge
## Introduction (5-7 min)
## Teaching & Learning Activities
### Activity 1: [Sub-topic]
**Teacher Activity:** **Learner Activity:** **Board Work / Notes:** **Expected Responses:** **Teacher Feedback:**
### Activity 2: [Sub-topic]
### Activity 3: [Sub-topic]
## Real-Life Examples (Ghanaian)
## Differentiation Strategies
### For Advanced Learners:
### For Struggling Learners:
## Common Misconceptions
## Assessment (4-6 questions)
## Conclusion (3-5 min)
## Assignment / Homework
## Suggested EdTech Tools`,
};

export function getSubjectGuide(subject: string): string {
  const s = (subject || "").toLowerCase();
  if (s.includes("math"))
    return `MATHEMATICS: include 2 fully worked examples, 4-6 practice problems with answers, formulas in LaTeX, suggest visual diagrams.`;
  if (s.includes("biology") || s.includes("basic science"))
    return `BIOLOGY: reference labeled diagrams (cell, organ, system), observation-based explanations, scientific terminology with definitions.`;
  if (s.includes("physics"))
    return `PHYSICS: include formulas, units, 2 worked numerical examples, reference diagrams (circuit, force, motion, ray).`;
  if (s.includes("chemistry"))
    return `CHEMISTRY: include balanced equations, atomic structures, lab apparatus references, correct chemical notation.`;
  if (s.includes("english") || s.includes("literature"))
    return `ENGLISH/LITERATURE: rich examples, model sentences, comprehension questions, writing tasks.`;
  if (s.includes("geography"))
    return `GEOGRAPHY: reference maps, landforms, cycles, regional examples.`;
  return "";
}

export const MATH_FORMATTING = `MATH FORMATTING (CRITICAL):
- Inline math: $x^2 + y^2 = r^2$
- Display equations on own line: $$A = l \\\\times b$$
- Use proper LaTeX: ^, _, \\\\frac{a}{b}, \\\\sqrt{x}, \\\\times, \\\\div, \\\\pi, \\\\theta, \\\\Delta.
- Never write x2 for x squared. Never write H2O — write $H_2O$.`;

export function buildLessonSystemPrompt(args: {
  curriculum: string;
  subject: string;
  language: string;
}): string {
  const { curriculum, subject, language } = args;
  const cur = curriculumContext[curriculum] || curriculumContext["Nigeria (NERDC)"];
  const tmpl = lessonTemplates[curriculum] || lessonTemplates["Nigeria (NERDC)"];
  const subj = getSubjectGuide(subject);
  return `You are an expert African curriculum specialist for Teazy Tech. Generate the ENTIRE lesson note in ${language}.

CURRICULUM: ${cur}
${subj ? `SUBJECT: ${subj}\n` : ""}${MATH_FORMATTING}

Use this EXACT structure (do not deviate):
${tmpl}

Be extremely detailed and classroom-ready: exact teacher scripts, board work, expected student responses, local examples. A new teacher should be able to teach immediately.`;
}

// Topic normalization for cache lookup
export function normalizeTopic(topic: string): string {
  return (topic || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Subject-aware decision: should we generate diagrams at all?
const VISUAL_SUBJECTS = ["math", "biology", "basic science", "physics", "chemistry", "geography", "agric"];
const VISUAL_KEYWORDS = [
  "diagram", "shape", "shapes", "cycle", "cell", "organ", "system",
  "circuit", "map", "structure", "anatomy", "geometry", "triangle",
  "polygon", "graph", "plot", "ecosystem", "photosynthesis", "respiration",
  "digestion", "force", "motion", "wave", "atom", "molecule", "reaction",
];

export function shouldGenerateDiagrams(subject: string, topic: string): boolean {
  const s = (subject || "").toLowerCase();
  const t = (topic || "").toLowerCase();
  if (VISUAL_SUBJECTS.some((v) => s.includes(v))) return true;
  if (VISUAL_KEYWORDS.some((k) => t.includes(k))) return true;
  return false;
}
