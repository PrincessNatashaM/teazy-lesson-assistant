import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser, readJsonBody } from "../_shared/authz.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;

    // ~12MB of base64 payload (≈9MB image) is plenty for a scanned script page.
    const parsed = await readJsonBody(req, 12 * 1024 * 1024);
    if (parsed instanceof Response) return parsed;
    const { imageBase64, mimeType } = parsed as Record<string, any>;

    if (typeof imageBase64 !== "string" || !imageBase64.trim()) {
      return new Response(JSON.stringify({ error: "Image data is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^[A-Za-z0-9+/=\s]+$/.test(imageBase64.slice(0, 256))) {
      return new Response(JSON.stringify({ error: "Invalid image data." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (mimeType !== undefined && mimeType !== null &&
        (typeof mimeType !== "string" || !ALLOWED_MIME.has(mimeType.toLowerCase()))) {
      return new Response(JSON.stringify({ error: "Unsupported image type." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");


    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an OCR specialist. Extract ALL readable text from the handwritten essay image. 
Rules:
- Transcribe the handwriting as accurately as possible
- Preserve paragraph breaks
- If a word is unclear, make your best guess — do NOT skip it
- Do NOT add any commentary, headers, or formatting — just the raw transcribed text
- If the image is not readable at all, respond with: [UNREADABLE]`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all the handwritten text from this image:" },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait and try again." }), {
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
      return new Response(JSON.stringify({ error: "Failed to read handwriting." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ extractedText: text.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
