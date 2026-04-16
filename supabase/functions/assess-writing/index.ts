import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const curriculumFocus: Record<string, string> = {
  "Nigeria (NERDC)": `Focus on grammar, sentence structure, clarity of expression, and proper use of English conventions. Nigerian teachers emphasize correct spelling, punctuation, and logical organization. Reference Nigerian writing standards and expectations.`,
  "Kenya": `Emphasize creativity, communication competencies, critical thinking, and self-expression aligned with CBC values. Kenyan CBC prioritizes learner voice, originality, and competency demonstration over rigid structure.`,
  "Ghana": `Balanced focus on clarity of expression AND creative flair. Ghanaian standards value both structured writing and personal voice. Assess grammar and mechanics alongside the student's ability to engage the reader.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { curriculum, classLevel, writingType, studentWriting, language } = await req.json();

    if (!curriculum || !classLevel || !writingType || !studentWriting) {
      return new Response(JSON.stringify({ error: "All fields are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const focus = curriculumFocus[curriculum] || curriculumFocus["Nigeria (NERDC)"];
    const lang = language || "English";

    const systemPrompt = `You are an expert writing assessment specialist for Teazy Tech, helping teachers in Africa grade student creative writing. You are constructive, encouraging, and specific. Never be harsh or generic.

${focus}

IMPORTANT: Generate the ENTIRE assessment in ${lang}.

You must return a valid JSON object with this exact structure:
{
  "overallScore": <number 0-100>,
  "rubric": {
    "contentIdeas": { "score": <number 0-100>, "explanation": "<1-2 sentences>" },
    "organization": { "score": <number 0-100>, "explanation": "<1-2 sentences>" },
    "grammarMechanics": { "score": <number 0-100>, "explanation": "<1-2 sentences>" },
    "vocabulary": { "score": <number 0-100>, "explanation": "<1-2 sentences>" },
    "creativity": { "score": <number 0-100>, "explanation": "<1-2 sentences>" }
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<specific actionable improvement 1>", "<improvement 2>", "<improvement 3>"],
  "suggestedRewrite": "<Rewrite 1-2 sentences from the student's actual text, showing how they could be improved. Quote the original then show the improved version.>",
  "teacherComment": "<A polished, classroom-ready feedback paragraph the teacher can copy and give directly to the student. Encouraging, specific, and professional.>"
}

CRITICAL RULES:
- Reference the student's ACTUAL writing in your feedback — quote specific phrases
- Be constructive and encouraging, not harsh
- Use simple, teacher-friendly language
- Make improvements actionable and specific
- The teacher comment should feel warm and professional
- Adapt scoring expectations to the class level (younger students get more lenient scoring)
- Return ONLY the JSON object, no markdown or extra text`;

    const userPrompt = `Assess this ${writingType} writing from a ${classLevel} student (${curriculum} curriculum):

---
${studentWriting}
---

Provide a detailed, constructive assessment with scores, strengths, improvements, a suggested rewrite of 1-2 sentences, and a teacher comment.`;

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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to assess writing." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    try {
      const parsed = JSON.parse(cleaned);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      console.error("Failed to parse AI response:", raw);
      return new Response(JSON.stringify({ error: "Failed to parse assessment. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
