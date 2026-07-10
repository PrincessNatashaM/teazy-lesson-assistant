import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const PACK_UPLOAD_COUNT: Record<string, number> = {
  assessment_pack_5: 5,
  assessment_pack_10: 10,
  assessment_pack_30: 30,
  assessment_pack_6: 6,
  assessment_pack_11: 11,
};

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
    const expected = createHmac("sha512", secret).update(body).digest("hex");
    if (!signature || signature !== expected) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (event.event === "charge.success") {
      const reference = event.data.reference;
      const { data: payment } = await admin
        .from("payments").select("*").eq("paystack_reference", reference).maybeSingle();
      if (payment && payment.status !== "success") {
        await admin.from("payments").update({ status: "success", metadata: { ...payment.metadata, webhook: event.data } }).eq("id", payment.id);
        await grant(admin, payment);
      }
    } else if (event.event === "subscription.disable" || event.event === "invoice.payment_failed") {
      const customer_code = event.data.customer?.customer_code;
      if (customer_code) {
        await admin.from("subscriptions").update({ status: "canceled" }).eq("paystack_customer_code", customer_code);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response((e as Error).message, { status: 500 });
  }
});

async function grant(admin: any, payment: any) {
  const { purpose, user_id, lesson_hash } = payment;
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
}
