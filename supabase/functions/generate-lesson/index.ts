import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, classLevel, topic, duration, objectives, teachingStyle } = await req.json();

    if (!subject || !classLevel || !topic) {
      return new Response(JSON.stringify({ error: "Subject, class, and topic are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a Nigerian curriculum expert and lesson planning assistant for Teazy Tech. You help teachers in Nigeria create practical, high-quality lesson plans they can use immediately in their classrooms.

Your lesson plans must:
- Align with the Nigerian curriculum standards
- Use familiar Nigerian classroom terminology (e.g., "set induction", "evaluation")
- Include relatable local examples (markets, daily life, Nigerian culture)
- Be written in simple, clear, professional English
- Be practical and actionable for real classroom use

Format the lesson plan with these sections using markdown headings:
# Lesson Plan: [Topic]

## Class and Subject
## Lesson Duration
## Learning Objectives
(Write 3-5 SMART, action-based objectives starting with verbs like "identify", "explain", "demonstrate")

## Instructional Materials

## Introduction (Set Induction)
(An engaging 5-minute activity to capture attention)

## Teaching Activities

### Teacher Activities
(Step-by-step numbered list)

### Student Activities
(Corresponding student activities)

## Assessment / Evaluation
(2-4 questions or quick evaluation tasks)

## Conclusion
(Brief summary of key takeaways)

## Homework / Assignment

## Suggested EdTech Tools
(2-3 simple, accessible digital tools teachers can use)`;

    const userPrompt = `Create a detailed lesson plan for:
- Subject: ${subject}
- Class: ${classLevel}
- Topic: ${topic}
${duration ? `- Duration: ${duration}` : "- Duration: 40 minutes"}
${objectives ? `- Learning Objectives guidance: ${objectives}` : ""}
${teachingStyle ? `- Preferred Teaching Style: ${teachingStyle}` : ""}`;

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
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to generate lesson plan." }), {
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
