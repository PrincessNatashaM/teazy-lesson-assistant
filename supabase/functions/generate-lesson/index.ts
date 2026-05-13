import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildLessonSystemPrompt, normalizeTopic } from "../_shared/curriculum.ts";
import { getCachedLesson, saveCachedLesson } from "../_shared/cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simulate streaming by emitting cached content in chunks (so client UX stays identical)
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

    const lang = language || "English";
    const cacheKey = {
      curriculum,
      subject,
      class_level: classLevel,
      topic_normalized: normalizeTopic(topic),
      language: lang,
    };

    // 1) Cache lookup
    const cached = await getCachedLesson(cacheKey);
    if (cached) {
      console.log("Cache HIT:", cacheKey.topic_normalized);
      return new Response(streamCachedContent(cached), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Cache": "HIT" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = buildLessonSystemPrompt({ curriculum, subject, language: lang });
    const userPrompt = `Create a detailed classroom-ready lesson note:
- Subject: ${subject}
- Class: ${classLevel}
- Topic: ${topic}
- Curriculum: ${curriculum}
- Duration: ${duration || "40 minutes"}
${teachingStyle ? `- Teaching Style: ${teachingStyle}` : ""}
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

    // Tee the stream: send to client, accumulate for cache
    const [clientStream, cacheStream] = response.body!.tee();

    // Background: parse SSE, accumulate full text, then save to cache
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
          console.log("Cache SAVE:", cacheKey.topic_normalized, full.length, "chars");
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
