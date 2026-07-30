import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCachedQuiz, saveCachedQuiz, hashString } from "../_shared/cache.ts";
import { requireUser, readJsonBody, consumeQuota } from "../_shared/authz.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;

    const parsed = await readJsonBody(req, 128 * 1024);
    if (parsed instanceof Response) return parsed;
    const { lessonContent, language } = parsed as Record<string, any>;

    if (typeof lessonContent !== "string" || !lessonContent.trim() || lessonContent.length > 60000) {
      return new Response(JSON.stringify({ error: "Lesson content is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (language !== undefined && language !== null && (typeof language !== "string" || language.length > 60)) {
      return new Response(JSON.stringify({ error: "Invalid request." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = language || "English";

    // Server-authoritative quota check before any AI or cache work.
    const quota = await consumeQuota(auth, "quiz");
    if (quota) return quota;

    // Cache lookup by content hash
    const lessonHash = await hashString(lessonContent.slice(0, 4000) + "|" + lang);
    const cached = await getCachedQuiz(lessonHash, lang);
    if (cached) {
      console.log("Quiz cache HIT");
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }


    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Cost optimization: use the lite model for quiz generation
    const systemPrompt = `Quiz generator for African teachers. Output ONLY raw JSON (no markdown):
{"multipleChoice":[{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A"}],"shortAnswer":[{"question":"...","answer":"..."}]}
- 8 multiple choice + 2 short answer
- Mix of recall, understanding, application
- Language: ${lang}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a quiz from this lesson:\n\n${lessonContent.slice(0, 4000)}` },
        ],
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
      return new Response(JSON.stringify({ error: "Failed to generate quiz." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let quiz;
    try {
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      quiz = JSON.parse(cleaned);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse quiz. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to cache (fire-and-forget)
    saveCachedQuiz(lessonHash, lang, quiz).catch(() => {});

    return new Response(JSON.stringify(quiz), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
