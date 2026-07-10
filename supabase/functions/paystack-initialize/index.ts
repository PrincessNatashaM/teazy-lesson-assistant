import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Server-side price table (source of truth). Prices are in minor units.
const SUB_STANDARD = { NGN: 200000, KES: 20000, GHS: 4000 };
const SUB_PRO       = { NGN: 500000, KES: 50000, GHS: 10000 };
const PACK_5        = { NGN: 50000,  KES: 4500,  GHS: 500  };
const PACK_10       = { NGN: 100000, KES: 9000,  GHS: 1000 };
const PACK_30       = { NGN: 200000, KES: 18000, GHS: 2000 };

// Legacy per-file unlock price (kept so old paywall paths still work)
const LEGACY_UNLOCK  = { NGN: 50000,  KES: 4500,  GHS: 500  };
const LEGACY_PRO     = { NGN: 200000, KES: 18000, GHS: 2000 };
const LEGACY_PACK_6  = { NGN: 50000,  KES: 4500,  GHS: 500  };
const LEGACY_PACK_11 = { NGN: 100000, KES: 9000,  GHS: 1000 };

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
    // Legacy
    case "subscription":       return { minor: LEGACY_PRO[charge], charge_currency: charge };
    case "assessment_pack_6":  return { minor: LEGACY_PACK_6[charge], charge_currency: charge };
    case "assessment_pack_11": return { minor: LEGACY_PACK_11[charge], charge_currency: charge };
    default:                   return { minor: LEGACY_UNLOCK[charge], charge_currency: charge };
  }
}

const VALID_PURPOSES = new Set([
  "sub_standard", "sub_pro",
  "assessment_pack_5", "assessment_pack_10", "assessment_pack_30",
  // Legacy fallbacks:
  "download_pdf", "download_docx", "edit_unlock",
  "subscription", "assessment_pack_6", "assessment_pack_11",
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

    if (!VALID_PURPOSES.has(purpose)) return json({ error: "Invalid purpose" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let { minor, charge_currency } = priceFor(purpose, displayCurrency);
    let promo: any = null;

    // Prorate upgrade Standard → Pro (credit remaining days of Standard sub)
    if (purpose === "sub_pro") {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("plan,status,current_period_end")
        .eq("user_id", user.id)
        .maybeSingle();
      if (sub?.status === "active" && sub.plan === "standard" && sub.current_period_end) {
        const remainingMs = new Date(sub.current_period_end).getTime() - Date.now();
        const remainingDays = Math.max(0, remainingMs / 86400000);
        const standardMinor = SUB_STANDARD[charge_currency];
        const credit = Math.round((remainingDays / 30) * standardMinor);
        minor = Math.max(1000, minor - credit); // never below 10 units
      }
    }

    // Validate promo server-side
    if (promoCode) {
      const { data: p } = await admin
        .from("promo_codes").select("*")
        .eq("code", promoCode.toUpperCase()).eq("active", true).maybeSingle();
      if (p && (!p.expires_at || new Date(p.expires_at) > new Date()) &&
          (!p.max_uses || p.used_count < p.max_uses) &&
          (p.applies_to?.includes(purpose))) {
        promo = p;
        if (p.kind === "free_access" || p.kind === "pro_days") {
          minor = 0;
        } else if (p.kind === "percent_off") {
          minor = Math.max(0, Math.round(minor * (1 - Number(p.value) / 100)));
        } else if (p.kind === "fixed_off") {
          if (p.currency === charge_currency) {
            minor = Math.max(0, minor - Math.round(Number(p.value)));
          }
        }
      }
    }

    if (minor === 0 && promo) {
      await grantAccess(admin, user.id, purpose, lessonHash, promo);
      return json({ granted_free: true });
    }

    const reference = `tzy_${user.id.slice(0, 8)}_${Date.now()}`;
    const { data: payment, error: payErr } = await admin
      .from("payments").insert({
        user_id: user.id,
        paystack_reference: reference,
        amount_minor: minor,
        currency: charge_currency,
        purpose,
        lesson_hash: lessonHash,
        promo_code_id: promo?.id ?? null,
        status: "pending",
        metadata: { display_currency: displayCurrency, promo_kind: promo?.kind ?? null, promo_value: promo?.value ?? null },
      }).select().single();
    if (payErr) throw payErr;

    return json({
      reference,
      amount_minor: minor,
      currency: charge_currency,
      payment_id: payment.id,
      public_key: Deno.env.get("PAYSTACK_PUBLIC_KEY") || "",
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

const PACK_UPLOAD_COUNT: Record<string, number> = {
  assessment_pack_5: 5,
  assessment_pack_10: 10,
  assessment_pack_30: 30,
  assessment_pack_6: 6,
  assessment_pack_11: 11,
};

async function grantAccess(admin: any, userId: string, purpose: string, lessonHash: string | null, promo: any) {
  if (purpose === "sub_standard" || purpose === "sub_pro" || purpose === "subscription") {
    const days = promo?.kind === "pro_days" ? Number(promo.value) : 30;
    const end = new Date(Date.now() + days * 86400 * 1000);
    const plan = purpose === "sub_standard" ? "standard" : "pro";
    await admin.from("subscriptions").upsert({
      user_id: userId, status: "active", plan, current_period_end: end.toISOString(),
    }, { onConflict: "user_id" });
  } else if (purpose in PACK_UPLOAD_COUNT) {
    const add = PACK_UPLOAD_COUNT[purpose];
    const { data: existing } = await admin.from("assessment_credits").select("remaining").eq("user_id", userId).maybeSingle();
    await admin.from("assessment_credits").upsert({
      user_id: userId, remaining: (existing?.remaining ?? 0) + add,
    }, { onConflict: "user_id" });
  } else if (lessonHash) {
    await admin.from("entitlements").upsert({
      user_id: userId, lesson_hash: lessonHash, kind: purpose,
    }, { onConflict: "user_id,lesson_hash,kind" });
  }

  if (promo?.kind === "bonus_assessments") {
    const { data: existing } = await admin.from("assessment_credits").select("remaining").eq("user_id", userId).maybeSingle();
    await admin.from("assessment_credits").upsert({
      user_id: userId, remaining: (existing?.remaining ?? 0) + Number(promo.value),
    }, { onConflict: "user_id" });
  }

  if (promo) {
    await admin.from("promo_redemptions").insert({
      promo_code_id: promo.id, user_id: userId, purpose, feature_unlocked: purpose,
    });
    await admin.from("promo_codes").update({ used_count: promo.used_count + 1 }).eq("id", promo.id);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
