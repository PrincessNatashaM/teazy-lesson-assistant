import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, classLevel, topic, curriculum } = await req.json();

    if (!topic || !subject) {
      return new Response(JSON.stringify({ error: "Subject and topic are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build 3 distinct, classroom-appropriate prompts
    const region =
      curriculum?.includes("Nigeria")
        ? "African (Nigerian)"
        : curriculum?.includes("Ghana")
        ? "African (Ghanaian)"
        : curriculum?.includes("Kenya")
        ? "African (Kenyan)"
        : "African";

    const basePrompts = [
      `A clean, colorful educational illustration explaining "${topic}" for a ${classLevel} ${subject} class. Bright, friendly, classroom-appropriate, no text, no watermarks. Style: simple flat illustration suitable for a teaching aid.`,
      `A diagram-style infographic visualizing the key concept of "${topic}" in ${subject}. Labeled visual elements, clear layout, minimal text labels only, suitable for ${classLevel} learners.`,
      `${region} classroom scene of students and a teacher engaging with the topic "${topic}". Warm, inclusive, realistic illustration, no text or watermarks.`,
    ];

    const generateOne = async (prompt: string): Promise<string | null> => {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!r.ok) {
          const t = await r.text();
          console.error("Image gateway error:", r.status, t);
          return null;
        }

        const data = await r.json();
        const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        return url || null;
      } catch (e) {
        console.error("Image gen failed:", e);
        return null;
      }
    };

    const results = await Promise.all(basePrompts.map(generateOne));
    const images = results.filter((u): u is string => !!u);

    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
