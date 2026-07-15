import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildLessonSystemPrompt, buildReviewPrompt, normalizeTopic } from "../_shared/curriculum.ts";
import { getCachedLesson, saveCachedLesson } from "../_shared/cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function streamCachedContent(content: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunkSize = 120;
  let offset = 0;
  return new ReadableStream({
    async pull(controller) {
      if (offset >= content.length) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }
      const piece = content.slice(offset, offset + chunkSize);
      offset += chunkSize;
      const payload = JSON.stringify({ choices: [{ delta: { content: piece } }] });
      controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      await new Promise((r) => setTimeout(r, 10));
    },
  });
}

// Subject-appropriate tool guidance for online lessons
function toolHintsFor(subject: string): string {
  const s = (subject || "").toLowerCase();
  if (/math|algebra|geometry|calculus/.test(s)) return "Desmos, GeoGebra, Whiteboard.fi, Kahoot";
  if (/biology|chemistry|physics|science/.test(s)) return "PhET Simulations, BioRender, Labster, Google Jamboard";
  if (/english|literature|language|writing/.test(s)) return "Canva, Diffit, Google Docs, Curipod, Padlet";
  if (/computer|coding|ict|technology/.test(s)) return "Scratch, Replit, Code.org, GitHub Classroom";
  if (/history|geography|social/.test(s)) return "TimelineJS, Google Earth, Padlet, Nearpod";
  if (/art|creative|music/.test(s)) return "Canva, Google Jamboard, Padlet, Flip";
  return "Padlet, Kahoot, Google Jamboard, Nearpod, Mentimeter";
}

function buildOnlineSystemPrompt(opts: {
  subject: string; ageGroup: string; platform: string; language: string; topic: string;
}) {
  const tools = toolHintsFor(opts.subject);
  return `You are an expert online educator preparing a virtual lesson plan.

Design the lesson SPECIFICALLY for online delivery on ${opts.platform}, adapted for the ${opts.ageGroup} age group.
Prioritise active participation and short attention-friendly segments over passive lecture. Language: ${opts.language}.

Output a well-formatted markdown lesson plan with these sections in this exact order using level-2 markdown headings (##):

## Lesson Overview
## Learning Objectives
## Required Resources
## Suggested AI Tools
## Suggested EdTech Tools
## Icebreaker Activity
## Teacher Script
## Lesson Flow
## Student Activities
## Discussion Questions
## Poll Questions
## Breakout Room Activities
## Guided Practice
## Assessment
## Homework
## Reflection

Guidelines:
- Only recommend tools that genuinely fit the lesson topic. Prefer: ${tools}.
- Include at least 3 engagement moments (poll, breakout, think-pair-share, exit ticket, live quiz, or collaborative whiteboard).
- Give the Teacher Script as 3–6 short spoken lines the teacher can read.
- Keep the plan practical — a teacher should be able to follow it live without extra prep.
- Avoid emojis and em-dashes.
`.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      subject, classLevel, topic, duration, teachingStyle, curriculum, language,
      environment, ageGroup, platform, objectives, additionalInstructions,
    } = body;

    const isOnline = environment === "online";

    if (!subject || !topic) {
      return new Response(JSON.stringify({ error: "Subject and topic are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (isOnline) {
      if (!ageGroup || !platform) {
        return new Response(JSON.stringify({ error: "Age group and platform are required for online lessons." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      if (!classLevel || !curriculum) {
        return new Response(JSON.stringify({ error: "Class and curriculum are required for classroom lessons." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const lang = language || "English";
    const cacheKey = {
      curriculum: isOnline ? `online:${platform}:${ageGroup}` : curriculum,
      subject,
      class_level: isOnline ? ageGroup : classLevel,
      topic_normalized: normalizeTopic(topic),
      language: lang,
    };

    const cached = await getCachedLesson(cacheKey);
    if (cached) {
      return new Response(streamCachedContent(cached), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Cache": "HIT" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = isOnline
      ? buildOnlineSystemPrompt({ subject, ageGroup, platform, language: lang, topic })
      : buildLessonSystemPrompt({ curriculum, subject, language: lang });

    const userPrompt = isOnline
      ? `Create a virtual lesson plan:
- Subject: ${subject}
- Topic: ${topic}
- Age Group: ${ageGroup}
- Platform: ${platform}
- Duration: ${duration || "45 minutes"}
${teachingStyle ? `- Teaching Style: ${teachingStyle}` : ""}
${objectives ? `- Learning Objectives (from teacher): ${objectives}` : ""}
${additionalInstructions ? `- Additional Instructions: ${additionalInstructions}` : ""}
- Language: ${lang}`
      : `Create a detailed classroom-ready lesson note:
- Subject: ${subject}
- Class: ${classLevel}
- Topic: ${topic}
- Curriculum: ${curriculum}
- Duration: ${duration || "40 minutes"}
${teachingStyle ? `- Teaching Style: ${teachingStyle}` : ""}
${objectives ? `- Learning Objectives (from teacher): ${objectives}` : ""}
${additionalInstructions ? `- Additional Instructions: ${additionalInstructions}` : ""}
- Language: ${lang}`;

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
      return new Response(JSON.stringify({ error: "Failed to generate lesson note." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [clientStream, cacheStream] = response.body!.tee();

    (async () => {
      try {
        const reader = cacheStream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const j = line.slice(6).trim();
            if (j === "[DONE]") continue;
            try {
              const p = JSON.parse(j);
              const c = p.choices?.[0]?.delta?.content;
              if (c) full += c;
            } catch { /* ignore */ }
          }
        }
        if (full && full.length > 200) {
          await saveCachedLesson(cacheKey, full);
        }
      } catch (e) {
        console.error("cache accumulator error", e);
      }
    })();

    return new Response(clientStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Cache": "MISS" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
