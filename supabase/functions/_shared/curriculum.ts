// Centralized curriculum + subject prompt fragments.
// Rewritten for AI Output Quality 2.0: no markdown noise, natural prose,
// curriculum-accurate structure, universal examples, teaching-style branching.

export const curriculumContext: Record<string, string> = {
  "Nigeria (NERDC)":
    `Align to Nigerian NERDC standards. Use the NERDC lesson structure and terminology: Behavioural Objectives, Set Induction, Presentation, Evaluation, Assignment. Objectives use measurable action verbs (state, identify, solve, explain, analyse). Reference the naira for money where relevant.`,

  "Ghana":
    `Align to Ghana NaCCA / Common Core Programme standards. Use Ghanaian terminology: Content Standard, Indicators, Core Competencies (Critical Thinking, Communication, Creativity, Digital Literacy, Personal Development, Cultural Identity, Global Citizenship), Teaching and Learning Activities, Assessment. Reference the cedi for money where relevant.`,

  "Kenya":
    `Align to Kenya CBC standards. Use CBC terminology: Strand, Sub-Strand, Specific Learning Outcomes, Key Inquiry Questions, Core Competencies (communication, collaboration, critical thinking, creativity, citizenship, digital literacy, self-efficacy), Learning Experiences, Assessment, Community Service Learning. Reference the shilling for money where relevant.`,
};

// Clean, professional templates. No markdown headings; sections are labelled
// in bold. The final document reads like a teacher-authored plan.
export const lessonTemplates: Record<string, string> = {
  "Nigeria (NERDC)": `
**Lesson Information**
Subject, class, topic, curriculum, duration.

**Prerequisite Knowledge**
What learners should already know or be able to do before this lesson.

**Behavioural Objectives**
Four to six measurable objectives, each beginning with an action verb. Every objective must be assessable by the end of the lesson.

**Instructional Materials**
Concise list of the resources the teacher will actually use.

**Set Induction**
Five to seven minutes. A brief opening that connects to prior knowledge and previews the lesson. Written as clear teacher prose, not bullet points.

**Presentation**
Three sequential steps. For each step provide: a short teacher explanation with the exact words a new teacher can say, expected board work or notes, the learner activity, likely learner responses, and the teacher's follow-up. Steps must progress logically from concrete to abstract, from known to new.

**Guided Practice**
A focused activity where learners apply the concept with teacher support before working independently.

**Real-Life Applications**
Two or three universal examples that relate the lesson to everyday life anywhere in Nigeria. Prefer general settings (the local market, a family shop, a school football field, a nearby farm, a household kitchen, a neighbourhood clinic) unless the topic requires a specific place.

**Differentiation**
One concrete strategy for advanced learners and one for learners who need extra support. Both must fit the same lesson time.

**Common Misconceptions**
Two or three specific misunderstandings learners bring to this topic and how the teacher will address each one.

**Evaluation**
Four to six questions of increasing difficulty, aligned one-to-one with the behavioural objectives. Include short answers.

**Summary**
A short teacher recap of the key ideas in three to five sentences.

**Assignment**
A brief take-home task that extends the lesson.

**Teacher Reflection**
Two prompts the teacher should answer after the lesson to plan the next one.`,

  "Kenya": `
**Lesson Information**
Subject, grade, strand, sub-strand, curriculum, duration.

**Prerequisite Knowledge**
Skills and experiences learners bring from earlier learning.

**Specific Learning Outcomes**
Four to six learner-centred outcomes beginning with "By the end of the lesson, the learner should be able to...". Each must be observable.

**Key Inquiry Questions**
Two or three questions that frame the lesson.

**Core Competencies and Values**
Which CBC competencies and values this lesson develops, and how.

**Learning Resources**
The materials and digital tools the teacher will use.

**Introduction**
Five to seven minutes. An engaging entry point tied to a Key Inquiry Question, using learners' own experiences.

**Learning Experiences**
Three sequential activities. For each: what the facilitator does, what the learner does, expected responses, and assessment cues. Activities must be learner-centred and progress from exploration to consolidation.

**Guided Practice**
A collaborative or hands-on task where learners apply the skill with teacher guidance.

**Real-Life Connections**
Two or three universal examples that fit any Kenyan classroom (a local market, a family farm, a school garden, a neighbourhood shop, a household chore, a community water point) unless the topic requires a specific place.

**Differentiation**
One strategy for advanced learners, one for learners needing more support.

**Common Misconceptions**
Two or three misconceptions and how the teacher will address each.

**Assessment**
Four to six items aligned one-to-one with the learning outcomes, mixing recall and application. Include expected responses.

**Summary and Reflection**
A short recap plus a reflection prompt for the learners.

**Extended Activity**
A take-home task that continues the learning.

**Community Service Learning Link**
A concise, realistic way this lesson connects to service in the learner's community.

**Teacher Reflection**
Two prompts the teacher completes after the lesson.`,

  "Ghana": `
**Lesson Information**
Subject, class, topic, curriculum, duration.

**Content Standard and Indicators**
Statement of what learners will know and be able to do, aligned to NaCCA.

**Prerequisite Knowledge**
What learners should already know before this lesson.

**Objectives**
Four to six measurable, learner-centred objectives.

**Core Competencies**
Which Common Core competencies this lesson develops, and how.

**Learning Resources**
The materials the teacher will use.

**Introduction**
Five to seven minutes. A grounded opening that connects to learners' experience.

**Teaching and Learning Activities**
Three sequential activities. For each: teacher activity, learner activity, board work or notes, expected responses, and teacher feedback. Activities must move from concrete to abstract.

**Guided Practice**
A structured task where learners apply the new skill under teacher guidance.

**Real-Life Examples**
Two or three universal examples that fit any Ghanaian classroom (a local market, a family shop, a neighbourhood farm, a school compound, a household kitchen, a nearby clinic) unless the topic requires a specific place.

**Differentiation**
One strategy for advanced learners, one for learners needing more support.

**Common Misconceptions**
Two or three misconceptions and how the teacher will address each.

**Assessment**
Four to six items aligned one-to-one with the objectives. Include expected answers.

**Summary**
A brief teacher recap of the key ideas.

**Assignment**
A short take-home task.

**Teacher Reflection**
Two prompts the teacher completes after the lesson.`,
};

export function getSubjectGuide(subject: string): string {
  const s = (subject || "").toLowerCase();
  if (s.includes("math"))
    return `Mathematics: use worked examples with clear steps; formulas in LaTeX; universal, tangible examples (classroom objects, fruit, pencils, coins, sports scores, cooking measures). Include practice items with answers.`;
  if (s.includes("biology") || s.includes("basic science"))
    return `Biology / Basic Science: describe labelled diagrams in words; use everyday living examples (plants around the school, common animals, the human body, a school garden); define scientific terms plainly on first use.`;
  if (s.includes("physics"))
    return `Physics: include units and worked numerical examples; reference simple everyday phenomena (a ball rolling, a light switch, a bicycle) before formal theory; describe any circuit or force diagram in words.`;
  if (s.includes("chemistry"))
    return `Chemistry: use correctly balanced equations, proper subscripts (write $H_2O$, never H2O), and lab-safe examples; ground each concept in observable everyday chemistry (rusting, cooking, cleaning) before formal notation.`;
  if (s.includes("english") || s.includes("literature"))
    return `English / Literature: use model sentences and short passages; give comprehension and writing tasks; keep examples culturally neutral and universal.`;
  if (s.includes("geography"))
    return `Geography: describe maps, landforms and cycles in words; use general regional references rather than a single city; connect concepts to features learners can observe.`;
  if (s.includes("economics") || s.includes("business") || s.includes("commerce"))
    return `Economics / Business: use everyday trade and savings examples (a small shop, a family budget, buying and selling in a local market) rather than corporate scenarios.`;
  if (s.includes("computer") || s.includes("ict") || s.includes("computing"))
    return `Computer Science / ICT: ground each concept in familiar technology (smartphones, websites, messaging apps, a school computer) before introducing formal terms.`;
  return "";
}

export const MATH_FORMATTING = `Math formatting: inline math uses $...$ (for example $x^2 + y^2 = r^2$); display equations sit on their own line with $$...$$ (for example $$A = l \\\\times b$$). Use proper LaTeX (^, _, \\\\frac{a}{b}, \\\\sqrt{x}, \\\\times, \\\\div, \\\\pi, \\\\theta, \\\\Delta). Never write x2 for x squared. Never write H2O — write $H_2O$.`;

// Teaching-style branching. Each style materially changes activities, teacher
// voice and assessment style.
export function getTeachingStyleGuide(style: string): string {
  const s = (style || "").toLowerCase();
  if (s.includes("lecture"))
    return `Teaching style — Lecture: the teacher leads with clear structured explanation. Presentation steps read as short direct exposition with worked examples on the board. Learner activity per step is focused note-taking, guided questioning and short responses. Guided Practice is a set of teacher-modelled problems. Assessment favours short-answer recall and application.`;
  if (s.includes("activity"))
    return `Teaching style — Activity-based: learners spend most of the lesson doing. Each Presentation step is built around a hands-on task (manipulation, sorting, building, measuring, role-play, a short game). Teacher script is brief instruction and circulation prompts. Guided Practice is a group task with clear roles. Assessment is performance-based (a product, a demonstration, an observation checklist).`;
  if (s.includes("inquiry"))
    return `Teaching style — Inquiry-based: the teacher opens with a guiding question and lets learners explore. Presentation steps are Question → Explore → Explain → Elaborate. Teacher script is mostly prompts and probing questions, not answers. Guided Practice is a short investigation. Assessment asks learners to justify claims with evidence.`;
  if (s.includes("discussion"))
    return `Teaching style — Discussion-based: the lesson is driven by open-ended questions and structured peer talk. Presentation steps use think-pair-share, small-group discussion and whole-class synthesis. Teacher script models sentence starters and reframes learner ideas. Guided Practice is a structured debate or reflection. Assessment values reasoning and the quality of learner contributions.`;
  if (s.includes("demonstration"))
    return `Teaching style — Demonstration: the teacher performs a clear step-by-step demonstration, then learners replicate it. Presentation steps describe exactly what the teacher shows and what learners watch for. Guided Practice is a supervised replication. Assessment checks accurate reproduction of the demonstrated procedure.`;
  if (s.includes("group"))
    return `Teaching style — Group Work: learners work in small teams throughout. Presentation steps assign group roles and a shared task. Teacher script focuses on setting up groups and rotating between them. Guided Practice is a group deliverable. Assessment includes individual accountability within the group product.`;
  if (s.includes("project"))
    return `Teaching style — Project-based: the lesson advances a longer project. Presentation steps outline milestones for today, resources needed and expected artefacts. Guided Practice is dedicated project work time with checkpoints. Assessment is criterion-based against the project rubric.`;
  return `Teaching style — balanced: mix short teacher explanation with active learner practice. Keep at least half the lesson time on learner activity.`;
}

const WRITING_RULES = `Writing rules (strict):
- Do not use markdown headings of any kind. Never emit #, ##, ### or > markers.
- Do not use horizontal rules (---), asterisk dividers (***) or decorative separators.
- Label each section with its title in bold on its own line, then a blank line, then the section content as clean paragraphs. Use short bulleted lists only where genuinely list-shaped (objectives, materials, evaluation items) and never as filler.
- Write in natural teacher-authored prose. Vary sentence structure. Avoid stock AI phrases such as "It is important to note", "In conclusion", "As we have learned", "Students should understand".
- Use universal, tangible examples that work for any classroom in the target country. Do not name specific cities, states or named markets (no "Balogun Market", "Onitsha", "Lagos Island", "Kano Market", "Ibadan", "Kumasi Market") unless the topic requires that specific place.
- Choose examples that fit the subject, topic, learner age and teaching environment — not just the country.
- Do not add emojis or em-dashes.
- Every objective must be measurable and paired with at least one assessment item.
- Every activity must fit the lesson duration and the learners' age.`;

export function buildLessonSystemPrompt(args: {
  curriculum: string;
  subject: string;
  language: string;
  teachingStyle?: string;
  classLevel?: string;
}): string {
  const { curriculum, subject, language, teachingStyle, classLevel } = args;
  const cur = curriculumContext[curriculum] || curriculumContext["Nigeria (NERDC)"];
  const tmpl = lessonTemplates[curriculum] || lessonTemplates["Nigeria (NERDC)"];
  const subj = getSubjectGuide(subject);
  const style = getTeachingStyleGuide(teachingStyle || "");
  return `You are an experienced ${curriculum} teacher writing a lesson note that another experienced teacher will teach from tomorrow. Write the entire lesson note in ${language}.

Curriculum alignment: ${cur}
${subj ? `Subject guidance: ${subj}\n` : ""}${style}
${classLevel ? `Class / Grade: ${classLevel}. Match examples, vocabulary and cognitive demand to this level.\n` : ""}
${MATH_FORMATTING}

${WRITING_RULES}

Follow this exact section order and labelling. Each section flows into the next as one continuous document:
${tmpl}

Before you finish, silently self-check: are objectives measurable and matched to assessment items? Do activities fit the duration and the learners' age? Are examples universal and subject-appropriate? Would an experienced teacher believe another experienced teacher wrote this? Revise anything that fails these checks, then output only the final lesson note.`;
}

// Prompt used for the pedagogical review pass.
export function buildReviewPrompt(args: {
  curriculum: string;
  subject: string;
  language: string;
  teachingStyle?: string;
  classLevel?: string;
  duration?: string;
}): string {
  const { curriculum, subject, language, teachingStyle, classLevel, duration } = args;
  const style = getTeachingStyleGuide(teachingStyle || "");
  return `You are a senior instructional designer reviewing a draft lesson note before it is delivered to a teacher.

Context:
- Curriculum: ${curriculum}
- Subject: ${subject}
- Class / Grade: ${classLevel || "unspecified"}
- Duration: ${duration || "unspecified"}
- Language: ${language}
- ${style}

Review the draft against every check below and rewrite it so the final version passes all of them:
1. Curriculum alignment: objectives, activities and assessment match ${curriculum} standards and terminology.
2. Teaching style: the lesson genuinely reflects the selected teaching style; a different style would produce a materially different lesson.
3. Logical flow: each section leads naturally into the next, from prerequisite knowledge through reflection.
4. Objectives: measurable, age-appropriate, and each one has a matching assessment item.
5. Bloom's Taxonomy: objectives and assessment span at least three cognitive levels appropriate to the class.
6. Activities: age-appropriate, fit the duration, and are teachable as written.
7. Differentiation: concrete support for both advanced learners and learners needing more help.
8. Examples: universal, tangible, subject- and age-appropriate; no unnecessary city or market names.
9. Grammar and readability: natural teacher-authored prose; no stock AI phrases; varied sentence structure.
10. Formatting: no markdown headings (#, ##, ###), no horizontal rules, no decorative separators, no emojis, no em-dashes. Section titles are bold labels on their own line.
11. Completeness: no required section is missing or thin.
12. Believability: an experienced teacher would believe another experienced teacher wrote this.

${WRITING_RULES}

Output only the final revised lesson note. Do not include the review notes, a preamble, or any commentary.`;
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
