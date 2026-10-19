import { createClient } from "npm:@supabase/supabase-js@2";
import { requireUser, readJsonBody, enforceRateLimit, jsonResponse, aiCorsHeaders } from "../_shared/authz.ts";

const GW = "https://ai.gateway.lovable.dev/v1/videos";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: aiCorsHeaders });
  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;
    const body = await readJsonBody(req, 16 * 1024);
    if (body instanceof Response) return body;
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return jsonResponse({ error: "Video service is not configured." }, 500);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const gwHeaders = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

    if (body.action === "create") {
      const prompt = body.prompt;
      if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 3000) return jsonResponse({ error: "Invalid scene." }, 400);
      const limited = await enforceRateLimit(auth.id, "video_scenes");
      if (limited) return jsonResponse({ error: "You have reached today's video limit (15 scenes per day). Please try again tomorrow." }, 429);
      const r = await fetch(GW, {
        method: "POST", headers: gwHeaders,
        body: JSON.stringify({
          model: "google/gemini-omni-1.1-flash",
          input: prompt,
          response_format: { type: "video", resolution: "720p", duration: "8s", aspect_ratio: "16:9" },
        }),
      });
      const t = await r.text();
      if (!r.ok) {
        console.error("video create", r.status, t);
        let msg = "Could not start this scene.";
        try { msg = JSON.parse(t)?.error?.message || JSON.parse(t)?.message || msg; } catch { /* keep */ }
        return jsonResponse({ error: msg, retryable: r.status === 429 || r.status >= 500 }, r.status);
      }
      const job = JSON.parse(t);
      const title = typeof body.title === "string" ? body.title.slice(0, 200) : null;
      const sceneIndex = Number.isInteger(body.sceneIndex) ? body.sceneIndex : null;
      await admin.from("video_jobs").insert({ id: job.id, user_id: auth.id, status: job.status || "queued", title, scene_index: sceneIndex });
      return jsonResponse({ id: job.id, status: job.status });
    }

    if (body.action === "list") {
      const { data: rows } = await admin.from("video_jobs")
        .select("id, title, scene_index, status, storage_path, saved, created_at")
        .eq("user_id", auth.id).eq("status", "completed").not("storage_path", "is", null)
        .order("created_at", { ascending: false });
      const out = [];
      for (const row of rows || []) {
        const signed = (await admin.storage.from("lesson-videos").createSignedUrl(row.storage_path, 60 * 60 * 6)).data?.signedUrl;
        if (signed) out.push({ id: row.id, title: row.title, sceneIndex: row.scene_index, saved: row.saved, createdAt: row.created_at, url: signed });
      }
      return jsonResponse({ videos: out });
    }

    if (body.action === "save") {
      const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string").slice(0, 50) : [];
      if (!ids.length) return jsonResponse({ error: "Invalid request." }, 400);
      await admin.from("video_jobs").update({ saved: true }).in("id", ids).eq("user_id", auth.id);
      return jsonResponse({ saved: true });
    }

    if (body.action === "delete") {
      const id = body.id;
      if (typeof id !== "string" || id.length > 200) return jsonResponse({ error: "Invalid request." }, 400);
      const { data: row } = await admin.from("video_jobs").select("storage_path").eq("id", id).eq("user_id", auth.id).maybeSingle();
      if (!row) return jsonResponse({ error: "Not found." }, 404);
      if (row.storage_path) await admin.storage.from("lesson-videos").remove([row.storage_path]);
      await admin.from("video_jobs").delete().eq("id", id);
      return jsonResponse({ deleted: true });
    }

    if (body.action === "status") {
      const id = body.id;
      if (typeof id !== "string" || id.length > 200) return jsonResponse({ error: "Invalid request." }, 400);
      const { data: row } = await admin.from("video_jobs").select("*").eq("id", id).eq("user_id", auth.id).maybeSingle();
      if (!row) return jsonResponse({ error: "Not found." }, 404);
      const sign = async (path: string) => (await admin.storage.from("lesson-videos").createSignedUrl(path, 60 * 60 * 6)).data?.signedUrl;
      if (row.storage_path) return jsonResponse({ status: "completed", url: await sign(row.storage_path) });
      if (row.status === "failed") return jsonResponse({ status: "failed", error: row.error });

      const r = await fetch(`${GW}/${encodeURIComponent(id)}`, { headers: gwHeaders });
      if (!r.ok) return jsonResponse({ status: "in_progress" });
      const job = await r.json();
      if (job.status === "failed") {
        const err = job.error?.message || "This scene could not be generated.";
        await admin.from("video_jobs").update({ status: "failed", error: err }).eq("id", id);
        return jsonResponse({ status: "failed", error: err });
      }
      if (job.status !== "completed") return jsonResponse({ status: job.status, progress: job.progress ?? null });

      const c = await fetch(`${GW}/${encodeURIComponent(id)}/content`, { headers: { Authorization: `Bearer ${key}` } });
      if (!c.ok) return jsonResponse({ status: "in_progress" });
      const bytes = new Uint8Array(await c.arrayBuffer());
      const path = `${auth.id}/${id}.mp4`;
      const up = await admin.storage.from("lesson-videos").upload(path, bytes, { contentType: "video/mp4", upsert: true });
      if (up.error) { console.error(up.error); return jsonResponse({ status: "in_progress" }); }
      await admin.from("video_jobs").update({ status: "completed", storage_path: path }).eq("id", id);
      return jsonResponse({ status: "completed", url: await sign(path) });
    }
    return jsonResponse({ error: "Invalid action." }, 400);
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: "Something went wrong." }, 500);
  }
});
