import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const curriculumContext: Record<string, string> = {
  "Nigeria (NERDC)": `Follow the Nigerian NERDC curriculum standards strictly. Use Nigerian classroom terminology:
- "Set Induction" for introduction
- "Behavioral Objectives" for learning objectives
- Use "Evaluation" not "Assessment"
- Reference Nigerian examples: local markets (Balogun, Onitsha), naira currency, Nigerian foods, festivals (Durbar, New Yam), states and landmarks
- Use terms like "scheme of work", "lesson note", "instructional materials"
- Follow a teacher-led + activity mix approach`,

  "Ghana": `Follow the Ghanaian NaCCA/CCP curriculum standards. Use Ghanaian classroom terminology:
- Use "Objectives" and "Core Competencies"
- Structure around "Teaching & Learning Activities"
- Use "Assessment" for evaluation
- Blend structured + interactive teaching
- Reference Ghanaian examples: cedi currency, local markets (Makola, Kejetia), Ghanaian foods (fufu, banku), festivals (Homowo, Aboakyir), regions and landmarks
- Reflect Ghanaian classroom terminology throughout`,

  "Kenya": `Follow the Kenyan CBC (Competency-Based Curriculum) standards strictly. Use Kenyan CBC terminology:
- Use "Learning Outcomes" instead of objectives
- Include "Key Competencies" (communication, collaboration, critical thinking, creativity, citizenship, digital literacy, self-efficacy)
- Structure around "Learning Experiences / Activities"
- Use "Reflection" instead of traditional evaluation
- Emphasize learner-centered, activity-based pedagogy
- Reference Kenyan examples: shilling currency, local contexts (Maasai Mara, Lake Victoria), Kenyan foods (ugali, nyama choma), counties and landmarks
- Focus on competency development and community service learning`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, classLevel, topic, duration, teachingStyle, curriculum, language } = await req.json();

    if (!subject || !classLevel || !topic || !curriculum) {
      return new Response(JSON.stringify({ error: "Subject, class, topic, and curriculum are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const curriculumGuide = curriculumContext[curriculum] || curriculumContext["Nigeria (NERDC)"];
    const lang = language || "English";

    const lessonTemplates: Record<string, string> = {
      "Nigeria (NERDC)": `
# Lesson Note: [Topic]

## Subject and Class
## Curriculum: Nigeria (NERDC)
## Lesson Duration
## Behavioral Objectives
(Write 4-6 SMART, measurable, action-based behavioral objectives using verbs like "state", "identify", "solve", "explain")

## Instructional Materials
(List specific, accessible materials with alternatives)

## Previous Knowledge
(What students should already know; how to verify)

## Set Induction (5-7 minutes)
(A specific, engaging opening activity with exact teacher script and expected student responses)

## Presentation / Lesson Development

### Step 1: [Sub-topic]
**Teacher Activity:** (Exact words the teacher says, demonstrations to perform)
**Board Work:** (What exactly to write on the board, including diagrams)
**Student Activity:** (What students do, expected responses)
**Likely Student Responses:** (Common correct and incorrect answers)
**Teacher's Response to Students:** (How to handle right and wrong answers)

### Step 2: [Sub-topic]
(Same detailed structure)

### Step 3: [Sub-topic]
(Same detailed structure — include at least 3-4 steps)

## Real-Life Examples and Applications
(3-4 concrete Nigerian examples connecting the topic to daily life)

## Differentiation Strategies
### For Advanced Learners:
### For Struggling Learners:

## Common Misconceptions

## Evaluation
(4-6 questions of varying difficulty — recall, understanding, and application)

## Conclusion (3-5 minutes)

## Assignment / Homework

## Suggested EdTech Tools`,

      "Kenya": `
# Lesson Note: [Topic]

## Subject and Grade
## Curriculum: Kenya CBC
## Lesson Duration
## Strand / Sub-Strand
## Learning Outcomes
(Write 4-6 learner-centered outcomes focusing on what the learner will be able to do)

## Key Competencies
(List relevant CBC competencies: Communication, Collaboration, Critical Thinking, Creativity, Citizenship, Digital Literacy, Self-Efficacy)

## Values
(Core values addressed in this lesson)

## Pertinent and Contemporary Issues (PCIs)

## Learning Resources
(List specific, accessible materials with alternatives)

## Previous Knowledge / Learner Experience

## Introduction / Engagement (5-7 minutes)
(A learner-centered opening activity)

## Learning Experiences / Activities

### Activity 1: [Sub-topic]
**Facilitator Guide:** (How the teacher facilitates, not lectures)
**Learner Activity:** (What learners do — group work, exploration, discussion)
**Expected Learner Responses:**
**Assessment Cues:** (How to check understanding during the activity)

### Activity 2: [Sub-topic]
(Same learner-centered structure)

### Activity 3: [Sub-topic]
(Same structure — include at least 3-4 activities)

## Real-Life Connections
(3-4 concrete Kenyan examples)

## Differentiation Strategies
### For Advanced Learners:
### For Struggling Learners:

## Common Misconceptions

## Reflection
(Learner self-assessment, peer assessment, teacher observation notes)

## Extended Activity / Homework

## Community Service Learning Connection
(How this lesson connects to the community)

## Suggested EdTech Tools`,

      "Ghana": `
# Lesson Note: [Topic]

## Subject and Class
## Curriculum: Ghana (NaCCA)
## Lesson Duration
## Content Standard
## Objectives
(Write 4-6 clear, measurable objectives)

## Core Competencies
(List relevant competencies: Critical Thinking, Creativity, Communication, Collaboration, Cultural Identity, Digital Literacy)

## Learning Resources
(List specific, accessible materials with alternatives)

## Previous Knowledge

## Introduction (5-7 minutes)
(A specific, engaging starter activity)

## Teaching & Learning Activities

### Activity 1: [Sub-topic]
**Teacher Activity:** (Teacher-led instruction and facilitation)
**Learner Activity:** (Interactive tasks, group work, discussions)
**Board Work / Notes:**
**Expected Responses:**
**Teacher Feedback:**

### Activity 2: [Sub-topic]
(Same structure — blend of structured + interactive)

### Activity 3: [Sub-topic]
(Same structure — include at least 3-4 activities)

## Real-Life Examples and Applications
(3-4 concrete Ghanaian examples)

## Differentiation Strategies
### For Advanced Learners:
### For Struggling Learners:

## Common Misconceptions

## Assessment
(4-6 questions of varying difficulty)

## Conclusion (3-5 minutes)

## Assignment / Homework

## Suggested EdTech Tools`,
    };

    const selectedTemplate = lessonTemplates[curriculum] || lessonTemplates["Nigeria (NERDC)"];

    const subjectLower = (subject || "").toLowerCase();
    let subjectGuide = "";
    if (subjectLower.includes("math")) {
      subjectGuide = `\nSUBJECT FOCUS — MATHEMATICS:\n- Always include at least 2 fully worked examples with step-by-step solutions.\n- Include 4-6 practice problems with answers.\n- Show formulas explicitly. Use proper mathematical notation.\n- Suggest visual diagrams (graphs, shapes, coordinate planes) where useful.\n`;
    } else if (subjectLower.includes("biology") || subjectLower.includes("basic science")) {
      subjectGuide = `\nSUBJECT FOCUS — BIOLOGY:\n- Reference labeled diagrams (cell, organ, system, plant) wherever relevant.\n- Use observation-based explanations and real specimens.\n- Include scientific terminology with definitions.\n`;
    } else if (subjectLower.includes("physics")) {
      subjectGuide = `\nSUBJECT FOCUS — PHYSICS:\n- Include formulas, units and at least 2 worked numerical examples.\n- Reference diagrams (circuits, force, motion, ray) where relevant.\n`;
    } else if (subjectLower.includes("chemistry")) {
      subjectGuide = `\nSUBJECT FOCUS — CHEMISTRY:\n- Include balanced equations, atomic structures and lab apparatus references.\n- Use correct chemical notation.\n`;
    } else if (subjectLower.includes("english") || subjectLower.includes("literature")) {
      subjectGuide = `\nSUBJECT FOCUS — ENGLISH/LITERATURE:\n- Focus on rich examples, model sentences and class exercises.\n- Include comprehension questions and writing tasks.\n`;
    } else if (subjectLower.includes("geography")) {
      subjectGuide = `\nSUBJECT FOCUS — GEOGRAPHY:\n- Reference maps, landforms, cycles and regional examples.\n`;
    }

    const mathFormatting = `\nMATH FORMATTING RULES (CRITICAL):\n- Wrap inline math in single dollar signs: $x^2 + y^2 = r^2$\n- Wrap display equations in double dollar signs on their own lines: $$A = l \\\\times b$$\n- Use proper LaTeX: ^ for superscript, _ for subscript, \\\\frac{a}{b} for fractions, \\\\sqrt{x} for roots, \\\\times for multiplication, \\\\div for division, \\\\pi, \\\\theta, \\\\Delta etc.\n- Never write x2 when you mean x squared — write $x^2$.\n- Never write H2O — write $H_2O$.\n`;

    const systemPrompt = `You are an expert African curriculum specialist and master lesson note writer for Teazy Tech. You help teachers across Africa create HIGHLY DETAILED, classroom-ready lesson notes they can use immediately.

${curriculumGuide}
${subjectGuide}
${mathFormatting}

IMPORTANT: Generate the ENTIRE lesson note in ${lang}.

Your lesson notes must be EXTREMELY detailed and practical — not generic summaries. Write as if you are coaching a new teacher through every minute of the lesson.

CRITICAL: You MUST use the EXACT structure and terminology below. Do NOT use a generic template. The output must clearly feel like it belongs to the ${curriculum} education system.

Format using markdown headings following this EXACT structure:
${selectedTemplate}`;

    const userPrompt = `Create an extremely detailed, classroom-ready lesson note for:
- Subject: ${subject}
- Class: ${classLevel}
- Topic: ${topic}
- Curriculum: ${curriculum}
${duration ? `- Duration: ${duration}` : "- Duration: 40 minutes"}
${teachingStyle ? `- Preferred Teaching Style: ${teachingStyle}` : ""}
- Language: ${lang}

Make it very detailed with exact teacher scripts, board work, expected student responses, and practical local examples. A teacher should be able to pick this up and teach immediately without any other preparation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate lesson note." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
