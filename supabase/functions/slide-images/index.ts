import { requireUser, readJsonBody, enforceRateLimit, jsonResponse, aiCorsHeaders } from "../_shared/authz.ts";

const MODEL = "openai/gpt-image-2.5-sunburst";
const STYLE = "Clean, modern educational illustration for a presentation slide. Accurate to the subject, clearly shows the named objects or process, flat vector style with soft shading, harmonious deep blue, warm orange and soft nude tones, plain light background, no words or letters, no watermark.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: aiCorsHeaders });
  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;
    const body = await readJsonBody(req, 16 * 1024);
    if (body instanceof Response) return body;
    const { prompts, topic } = body as Record<string, unknown>;
    if (!Array.isArray(prompts) || prompts.length < 1 || prompts.length > 8 || prompts.some((p) => typeof p !== "string" || !p.trim() || p.length > 600))
      return jsonResponse({ error: "Invalid request." }, 400);
    if (typeof topic !== "string" || topic.length > 300) return jsonResponse({ error: "Invalid request." }, 400);

    const limited = await enforceRateLimit(auth.id, "lesson_images");
    if (limited) return limited;

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");

    let blocked: number | null = null;
    const one = async (p: string): Promise<string | null> => {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, prompt: `${p}. Topic: ${topic}. ${STYLE}`, size: "1536x1024", quality: "low" }),
      });
      if (!r.ok) {
        if (r.status === 402 || r.status === 429 || r.status === 403) blocked = r.status;
        console.error("image error", r.status, await r.text());
        return null;
      }
      const j = await r.json();
      const b = j.data?.[0]?.b64_json;
      return b ? `data:image/png;base64,${b}` : null;
    };
    const images = await Promise.all((prompts as string[]).map(one));
    if (images.every((x) => !x) && blocked) {
      return jsonResponse({ error: blocked === 402 ? "AI credits exhausted. Please try again later." : "Image generation is busy. Please try again shortly." }, blocked);
    }
    return jsonResponse({ images });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: "Something went wrong." }, 500);
  }
});
