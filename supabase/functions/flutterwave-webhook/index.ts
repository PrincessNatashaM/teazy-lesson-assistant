import { createClient } from "npm:@supabase/supabase-js@2";

const PACK_UPLOAD_COUNT: Record<string, number> = {
  assessment_pack_5: 5,
  assessment_pack_10: 10,
  assessment_pack_30: 30,
  assessment_pack_6: 6,
  assessment_pack_11: 11,
};

Deno.serve(async (req) => {
  try {
    // 1. Verify webhook hash header
    const signature = req.headers.get("verif-hash");
    const expected = Deno.env.get("FLUTTERWAVE_WEBHOOK_HASH") || "";
    if (!expected || !signature || signature !== expected) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = await req.json();
    const data = event?.data ?? event;
    const eventType: string = event?.event ?? event?.["event.type"] ?? "";

    // Only process successful charges
    const isSuccessEvent =
      eventType.includes("charge.completed") ||
      eventType === "CHARGE_COMPLETED" ||
      data?.status === "successful";

    if (!isSuccessEvent) {
      return new Response("ignored", { status: 200 });
    }

    const txId = data?.id;
    const txRef: string | undefined = data?.tx_ref;
    if (!txId || !txRef) {
      return new Response("Missing transaction id/ref", { status: 400 });
    }

    // 2. Verify transaction with Flutterwave API
    const flwSecret = Deno.env.get("FLUTTERWAVE_SECRET_KEY") || "";
    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${txId}/verify`,
      { headers: { Authorization: `Bearer ${flwSecret}` } },
    );
    const verifyJson = await verifyRes.json();
    if (!verifyRes.ok || verifyJson?.status !== "success") {
      return new Response("Verification failed", { status: 400 });
    }
    const tx = verifyJson.data;
    if (
      tx?.status !== "successful" ||
      tx?.tx_ref !== txRef
    ) {
      return new Response("Transaction not successful", { status: 400 });
    }

    // 3. Look up local payment row (tx_ref stored in paystack_reference column)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: payment } = await admin
      .from("payments")
      .select("*")
      .eq("paystack_reference", txRef)
      .maybeSingle();

    if (!payment) {
      return new Response("Payment not found", { status: 404 });
    }

    if (payment.status !== "success") {
      await admin
        .from("payments")
        .update({
          status: "success",
          metadata: { ...(payment.metadata ?? {}), gateway: "flutterwave", webhook: tx },
        })
        .eq("id", payment.id);
      await grant(admin, payment);
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response((e as Error).message, { status: 500 });
  }
});

async function grant(admin: any, payment: any) {
  const { purpose, user_id, lesson_hash } = payment;
  if (
    purpose === "sub_standard" ||
    purpose === "sub_pro" ||
    purpose === "subscription"
  ) {
    const end = new Date(Date.now() + 30 * 86400 * 1000);
    const plan = purpose === "sub_standard" ? "standard" : "pro";
    await admin.from("subscriptions").upsert(
      {
        user_id,
        status: "active",
        plan,
        current_period_end: end.toISOString(),
        gateway: "flutterwave",
      },
      { onConflict: "user_id" },
    );
  } else if (purpose in PACK_UPLOAD_COUNT) {
    const add = PACK_UPLOAD_COUNT[purpose];
    const { data: ex } = await admin
      .from("assessment_credits")
      .select("remaining")
      .eq("user_id", user_id)
      .maybeSingle();
    await admin.from("assessment_credits").upsert(
      { user_id, remaining: (ex?.remaining ?? 0) + add },
      { onConflict: "user_id" },
    );
  } else if (lesson_hash) {
    await admin.from("entitlements").upsert(
      { user_id, lesson_hash, kind: purpose },
      { onConflict: "user_id,lesson_hash,kind" },
    );
  }
}
