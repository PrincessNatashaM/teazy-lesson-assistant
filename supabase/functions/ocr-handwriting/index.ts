import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser, readJsonBody, enforceRateLimit } from "../_shared/authz.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { ocrMediaPart } from "./media.ts";


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
    let mediaPart;
    try {
      mediaPart = ocrMediaPart(imageBase64, mimeType);
    } catch {
      return new Response(JSON.stringify({ error: "Unsupported file type." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side abuse guard BEFORE any AI provider call. Identity comes from
    // the verified JWT, never from the request body.
    const limited = await enforceRateLimit(auth.id, "ocr");
    if (limited) return limited;

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
            content: `You are an OCR specialist. Extract ALL readable text from the uploaded image or PDF, including every page in order. 
Rules:
- Transcribe the handwriting as accurately as possible
- Preserve paragraph breaks
- If a word is unclear, make your best guess — do NOT skip it
- Do NOT add any commentary, headers, or formatting — just the raw transcribed text
- If the document is not readable at all, respond with: [UNREADABLE]`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all readable text from this document:" },
              mediaPart,
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
