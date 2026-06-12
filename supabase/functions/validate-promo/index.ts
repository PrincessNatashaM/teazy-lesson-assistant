import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ valid: false, message: "Sign in required" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ valid: false, message: "Sign in required" }, 401);

    const { code, purpose, amount_minor, currency } = await req.json();
    if (!code || !purpose) return json({ valid: false, message: "Missing code" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: promo } = await admin
      .from("promo_codes")
      .select("*")
      .eq("code", String(code).toUpperCase())
      .eq("active", true)
      .maybeSingle();

    if (!promo) return json({ valid: false, message: "Code not found" });
    if (promo.expires_at && new Date(promo.expires_at) < new Date())
      return json({ valid: false, message: "Code expired" });
    if (promo.max_uses && promo.used_count >= promo.max_uses)
      return json({ valid: false, message: "Code fully redeemed" });
    if (!promo.applies_to.includes(purpose))
      return json({ valid: false, message: "Code doesn't apply to this purchase" });

    let adjusted = amount_minor ?? 0;
    let free = false;
    let message = "Discount applied";

    switch (promo.kind) {
      case "free_access":
      case "pro_days":
        adjusted = 0;
        free = true;
        message = promo.kind === "pro_days" ? `Free Pro access (${promo.value} days)` : "Free access unlocked";
        break;
      case "percent_off":
        adjusted = Math.max(0, Math.round(amount_minor * (1 - promo.value / 100)));
        message = `${promo.value}% off`;
        break;
      case "fixed_off":
        adjusted = Math.max(0, amount_minor - Math.round(Number(promo.value)));
        if (currency && promo.currency && currency !== promo.currency)
          return json({ valid: false, message: "Code currency mismatch" });
        message = `${promo.value} off`;
        if (adjusted === 0) free = true;
        break;
      case "bonus_assessments":
        adjusted = amount_minor;
        message = `+${promo.value} essay credits will be added`;
        break;
    }

    return json({
      valid: true,
      code_id: promo.id,
      kind: promo.kind,
      adjusted_minor: adjusted,
      free,
      message,
    });
  } catch (e) {
    return json({ valid: false, message: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
