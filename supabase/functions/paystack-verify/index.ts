import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PACK_UPLOAD_COUNT: Record<string, number> = {
  assessment_pack_5: 5,
  assessment_pack_10: 10,
  assessment_pack_30: 30,
  assessment_pack_500: 500,
  assessment_pack_6: 6,
  assessment_pack_11: 11,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "Sign in required" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ success: false, error: "Sign in required" }, 401);

    const { reference } = await req.json();
    if (!reference) return json({ success: false, error: "Missing reference" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: payment } = await admin
      .from("payments").select("*")
      .eq("paystack_reference", reference).eq("user_id", user.id).maybeSingle();
    if (!payment) return json({ success: false, error: "Payment not found" }, 404);
    if (payment.status === "success") return json({ success: true, already: true });

    const paystackResp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}` },
    });
    const verifyBody = await paystackResp.json();

    if (!verifyBody.status || verifyBody.data?.status !== "success") {
      await admin.from("payments").update({ status: "failed", metadata: { ...payment.metadata, paystack: verifyBody } }).eq("id", payment.id);
      return json({ success: false, error: "Payment not successful" });
    }
    if (Number(verifyBody.data.amount) !== Number(payment.amount_minor)) {
      await admin.from("payments").update({ status: "failed", metadata: { ...payment.metadata, mismatch: true } }).eq("id", payment.id);
      return json({ success: false, error: "Amount mismatch" });
    }

    await admin.from("payments").update({ status: "success", metadata: { ...payment.metadata, paystack: verifyBody.data } }).eq("id", payment.id);
    await grantAccess(admin, payment);

    return json({ success: true });
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});

async function grantAccess(admin: any, payment: any) {
  const { purpose, user_id, lesson_hash, promo_code_id, id: payment_id } = payment;

  if (purpose === "sub_standard" || purpose === "sub_pro" || purpose === "subscription") {
    const end = new Date(Date.now() + 30 * 86400 * 1000);
    const plan = purpose === "sub_standard" ? "standard" : "pro";
    await admin.from("subscriptions").upsert({
      user_id, status: "active", plan, current_period_end: end.toISOString(),
    }, { onConflict: "user_id" });
  } else if (purpose in PACK_UPLOAD_COUNT) {
    const add = PACK_UPLOAD_COUNT[purpose];
    const { data: ex } = await admin.from("assessment_credits").select("remaining").eq("user_id", user_id).maybeSingle();
    await admin.from("assessment_credits").upsert({
      user_id, remaining: (ex?.remaining ?? 0) + add,
    }, { onConflict: "user_id" });
  } else if (lesson_hash) {
    await admin.from("entitlements").upsert({
      user_id, lesson_hash, kind: purpose,
    }, { onConflict: "user_id,lesson_hash,kind" });
  }

  if (promo_code_id) {
    await admin.from("promo_redemptions").insert({
      promo_code_id, user_id, payment_id, purpose, feature_unlocked: purpose,
    });
    const { data: promo } = await admin.from("promo_codes").select("used_count").eq("id", promo_code_id).maybeSingle();
    if (promo) await admin.from("promo_codes").update({ used_count: promo.used_count + 1 }).eq("id", promo_code_id);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
