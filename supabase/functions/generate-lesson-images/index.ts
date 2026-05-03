import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Subject-aware diagram prompt builder
function buildPrompts(subject: string, classLevel: string, topic: string, curriculum: string): string[] {
  const s = subject.toLowerCase();
  const t = topic;
  const region = curriculum?.includes("Nigeria")
    ? "Nigerian"
    : curriculum?.includes("Ghana")
    ? "Ghanaian"
    : curriculum?.includes("Kenya")
    ? "Kenyan"
    : "African";

  const labelStyle =
    "Clean educational diagram, clearly labeled with text labels, white background, high contrast, printable, suitable for classroom teaching aid, no watermarks.";

  if (s.includes("math")) {
    return [
      `Mathematics teaching diagram illustrating "${t}" — geometric shapes, graphs, coordinate plane, fractions or equations as relevant. ${labelStyle}`,
      `Step-by-step worked example visual for "${t}" in mathematics, showing the solution clearly with arrows and labels. ${labelStyle}`,
      `Real-world application illustration of "${t}" in mathematics with measurements and labels for ${classLevel} learners. ${labelStyle}`,
    ];
  }
  if (s.includes("biology") || s.includes("basic science")) {
    return [
      `Detailed labeled biology diagram of "${t}" (e.g. cell structure, organ, plant part, body system). All key parts labeled with arrows. ${labelStyle}`,
      `Process or cycle diagram for "${t}" in biology with arrows and labels showing each stage. ${labelStyle}`,
      `Cross-section or anatomical illustration of "${t}" suitable for ${classLevel} biology students. ${labelStyle}`,
    ];
  }
  if (s.includes("physics")) {
    return [
      `Physics diagram for "${t}" — circuit, force, motion, ray or wave diagram as appropriate, with labeled components and arrows. ${labelStyle}`,
      `Annotated illustration showing the formula and setup for "${t}" in physics with labeled variables. ${labelStyle}`,
      `Real-world physics example of "${t}" with vectors, measurements and labels. ${labelStyle}`,
    ];
  }
  if (s.includes("chemistry")) {
    return [
      `Chemistry diagram for "${t}" — atomic structure, molecule, reaction or lab apparatus, fully labeled. ${labelStyle}`,
      `Step-by-step reaction or process diagram for "${t}" in chemistry with labels and arrows. ${labelStyle}`,
      `Laboratory setup illustration for "${t}" with each apparatus labeled. ${labelStyle}`,
    ];
  }
  if (s.includes("geography")) {
    return [
      `Geography diagram for "${t}" — map, landform, water cycle or atmospheric process, fully labeled. ${labelStyle}`,
      `Cross-section or map view of "${t}" in geography with key features labeled. ${labelStyle}`,
      `${region} regional example of "${t}" in geography with labeled features. ${labelStyle}`,
    ];
  }
  if (s.includes("english") || s.includes("literature") || s.includes("french") || s.includes("yoruba") || s.includes("igbo") || s.includes("hausa")) {
    return [
      `Friendly classroom illustration showing the concept of "${t}" in language learning, with example sentences as labels. ${labelStyle}`,
      `Visual example chart for "${t}" — vocabulary, grammar or comprehension example, clearly laid out. ${labelStyle}`,
      `${region} classroom scene of students engaging with the topic "${t}". Warm, inclusive illustration.`,
    ];
  }
  // Generic / Social Studies / Civic / Religious / Agric / etc.
  return [
    `Educational illustration explaining "${t}" for a ${classLevel} ${subject} class, with labels for key elements. ${labelStyle}`,
    `Diagram-style infographic visualising the key concept of "${t}" in ${subject}, with clear labeled parts. ${labelStyle}`,
    `${region} classroom scene of students and a teacher engaging with "${t}". Warm, inclusive illustration, no text watermarks.`,
  ];
}

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

    const prompts = buildPrompts(subject, classLevel || "", topic, curriculum || "");

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

    const results = await Promise.all(prompts.map(generateOne));
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
