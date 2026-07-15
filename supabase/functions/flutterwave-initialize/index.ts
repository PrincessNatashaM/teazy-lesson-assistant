import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUB_STANDARD = { NGN: 200000, KES: 20000, GHS: 2000 };
const SUB_PRO      = { NGN: 500000, KES: 50000, GHS: 5000 };
const PACK_5       = { NGN: 50000,  KES: 4500,  GHS: 500  };
const PACK_10      = { NGN: 100000, KES: 9000,  GHS: 1000 };
const PACK_30      = { NGN: 200000, KES: 18000, GHS: 2000 };
const PACK_500     = { NGN: 1000000,KES: 100000,GHS: 10000 };
const LEGACY_UNLOCK = { NGN: 50000, KES: 4500, GHS: 500 };

type Charge = "NGN" | "KES" | "GHS";

function priceFor(purpose: string, displayCurrency: string): { minor: number; charge_currency: Charge } {
  const charge: Charge =
    displayCurrency === "KES" ? "KES" :
    displayCurrency === "GHS" ? "GHS" : "NGN";
  switch (purpose) {
    case "sub_standard": return { minor: SUB_STANDARD[charge], charge_currency: charge };
    case "sub_pro":      return { minor: SUB_PRO[charge], charge_currency: charge };
    case "assessment_pack_5":  return { minor: PACK_5[charge], charge_currency: charge };
    case "assessment_pack_10": return { minor: PACK_10[charge], charge_currency: charge };
    case "assessment_pack_30": return { minor: PACK_30[charge], charge_currency: charge };
    default: return { minor: LEGACY_UNLOCK[charge], charge_currency: charge };
  }
}

const VALID_PURPOSES = new Set([
  "sub_standard", "sub_pro",
  "assessment_pack_5", "assessment_pack_10", "assessment_pack_30",
  "download_pdf", "download_docx", "edit_unlock", "subscription",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sign in required" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Sign in required" }, 401);

    const body = await req.json();
    const purpose = String(body.purpose || "");
    const lessonHash: string | null = body.lesson_hash ?? null;
    const promoCode: string | null = body.promo_code ?? null;
    const displayCurrency = String(body.display_currency || "NGN");
    const redirectUrl: string | null = body.redirect_url ?? null;

    if (!VALID_PURPOSES.has(purpose)) return json({ error: "Invalid purpose" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let { minor, charge_currency } = priceFor(purpose, displayCurrency);
    let promo: any = null;

    if (promoCode) {
      const { data: p } = await admin
        .from("promo_codes").select("*")
        .eq("code", promoCode.toUpperCase()).eq("active", true).maybeSingle();
      if (p && (!p.expires_at || new Date(p.expires_at) > new Date()) &&
          (!p.max_uses || p.used_count < p.max_uses) &&
          (p.applies_to?.includes(purpose))) {
        promo = p;
        if (p.kind === "free_access" || p.kind === "pro_days") minor = 0;
        else if (p.kind === "percent_off") minor = Math.max(0, Math.round(minor * (1 - Number(p.value) / 100)));
        else if (p.kind === "fixed_off" && p.currency === charge_currency) {
          minor = Math.max(0, minor - Math.round(Number(p.value)));
        }
      }
    }

    if (minor === 0 && promo) {
      // Free grant path (mirrors paystack-initialize)
      const end = new Date(Date.now() + 30 * 86400 * 1000);
      if (purpose === "sub_standard" || purpose === "sub_pro") {
        await admin.from("subscriptions").upsert({
          user_id: user.id, status: "active",
          plan: purpose === "sub_standard" ? "standard" : "pro",
          current_period_end: end.toISOString(),
        }, { onConflict: "user_id" });
      }
      return json({ granted_free: true });
    }

    const reference = `tzy_flw_${user.id.slice(0, 8)}_${Date.now()}`;
    const { error: payErr } = await admin.from("payments").insert({
      user_id: user.id,
      paystack_reference: reference, // shared reference column
      amount_minor: minor,
      currency: charge_currency,
      purpose,
      lesson_hash: lessonHash,
      promo_code_id: promo?.id ?? null,
      status: "pending",
      metadata: { gateway: "flutterwave", display_currency: displayCurrency },
    });
    if (payErr) throw payErr;

    // Create Flutterwave hosted payment link
    const flwRes = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("FLUTTERWAVE_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount: (minor / 100).toFixed(2),
        currency: charge_currency,
        redirect_url: redirectUrl || "https://teazy.ai/payment/callback",
        customer: {
          email: user.email,
          name: user.user_metadata?.display_name || user.email,
        },
        customizations: {
          title: "Teazy AI",
          description: purpose.replace(/_/g, " "),
        },
        meta: { user_id: user.id, purpose },
      }),
    });
    const flwJson = await flwRes.json();
    if (!flwRes.ok || flwJson?.status !== "success" || !flwJson?.data?.link) {
      return json({ error: flwJson?.message || "Flutterwave init failed" }, 400);
    }

    return json({
      reference,
      amount_minor: minor,
      currency: charge_currency,
      payment_link: flwJson.data.link,
      public_key: Deno.env.get("FLUTTERWAVE_PUBLIC_KEY") || "",
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
