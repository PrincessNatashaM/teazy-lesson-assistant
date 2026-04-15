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
- Use terms like "scheme of work", "lesson note", "instructional materials"`,

  "Ghana": `Follow the Ghanaian NaCCA/CCP curriculum standards. Use Ghanaian classroom terminology:
- "Introduction" or "Starter Activity"
- "Learning Indicators" and "Core Competencies"
- Reference Ghanaian examples: cedi currency, local markets (Makola, Kejetia), Ghanaian foods (fufu, banku), festivals (Homowo, Aboakyir), regions and landmarks
- Emphasize the 4 R's: Reading, wRiting, aRithmetic, cReativity`,

  "Kenya": `Follow the Kenyan CBC (Competency-Based Curriculum) standards. Use Kenyan classroom terminology:
- "Learning Experiences" and "Key Inquiry Questions"
- "Core Competencies" and "Pertinent and Contemporary Issues (PCIs)"
- Reference Kenyan examples: shilling currency, local contexts (Maasai Mara, Lake Victoria), Kenyan foods (ugali, nyama choma), counties and landmarks
- Emphasize values, learner-centered approaches, and community service learning`,
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

    const systemPrompt = `You are an expert African curriculum specialist and master lesson note writer for Teazy Tech. You help teachers across Africa create HIGHLY DETAILED, classroom-ready lesson notes they can use immediately.

${curriculumGuide}

IMPORTANT: Generate the ENTIRE lesson note in ${lang}.

Your lesson notes must be EXTREMELY detailed and practical — not generic summaries. Write as if you are coaching a new teacher through every minute of the lesson.

Format using markdown headings:

# Lesson Note: [Topic]

## Subject and Class
## Curriculum
## Lesson Duration
## Learning Objectives
(Write 4-6 SMART, measurable, action-based objectives)

## Instructional Materials
(List specific, accessible materials with alternatives)

## Previous Knowledge
(What students should already know; how to verify)

## Set Induction / Introduction (5-7 minutes)
(A specific, engaging opening activity with exact teacher script and expected student responses)

## Lesson Development

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
(3-4 concrete, local, relatable examples connecting the topic to daily life)

## Differentiation Strategies
### For Advanced Learners:
(Extension activities and challenge questions)
### For Struggling Learners:
(Simplified explanations, scaffolding techniques, peer support strategies)

## Common Misconceptions
(List 3-5 specific misconceptions students may have and how to address each one)

## Evaluation / Assessment
(4-6 questions of varying difficulty — recall, understanding, and application)

## Conclusion (3-5 minutes)
(Summary technique, key takeaways, student reflection prompt)

## Assignment / Homework
(Specific, measurable tasks with clear instructions)

## Suggested EdTech Tools
(3-4 accessible digital tools with brief explanation of how to use each)`;

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
