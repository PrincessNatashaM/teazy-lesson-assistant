import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const curriculumFocus: Record<string, string> = {
  "Nigeria (NERDC)": "Follow NERDC scheme of work. Value grammatical correctness and mark allocation transparency.",
  WAEC: "Apply WAEC marking scheme conventions with clear mark points and formal remarks.",
  NECO: "Apply NECO marking scheme conventions with structured mark allocation and formal feedback.",
  "Kenya CBC": "Follow the Kenya CBC. Use EE / ME / AE / BE descriptors.",
  "Ghana Curriculum": "Follow Ghana's standards-based curriculum. Reference NaCCA content standards.",
};

const profileGuidance: Record<string, string> = {
  math: "Mathematics: award method marks even when the final answer is wrong.",
  sciences: "Sciences: award marks for terminology, definitions, units and formula application.",
  english: "English: assess content, organisation, expression, grammar and register.",
  literature: "Literature: assess text understanding, character, theme, evidence, devices.",
  geography: "Geography: reward accurate place facts, sketch maps, cause-effect reasoning, case studies.",
  history: "History: reward accurate dates, cause-consequence analysis, sources.",
  languages: "Language paper: assess vocabulary, grammar, comprehension, translation.",
  religious: "Religious studies: assess scriptural accuracy, doctrinal understanding, moral application.",
  general: "Reward factual accuracy, structured reasoning, correct terminology.",
};

const stylePolicy: Record<string, string> = {
  strict: "Deduct for every clear error. Round DOWN borderline marks.",
  standard: "Balanced marking. Round to the fairer mark.",
  lenient: "Encouraging marking. Round UP borderline marks.",
};

function gradeFromPercent(p: number) {
  if (p >= 75) return "A";
  if (p >= 65) return "B";
  if (p >= 55) return "C";
  if (p >= 45) return "D";
  if (p >= 40) return "E";
  return "F";
}

async function gradeOne(payload: {
  curriculum: string; subject: string; subjectProfile?: string;
  classLevel: string; assessmentType?: string; markingStyle?: string;
  questionPaper?: string; markingScheme?: string; studentScript: string; language?: string;
  priority: "high" | "normal";
}, LOVABLE_API_KEY: string) {
  const focus = curriculumFocus[payload.curriculum] || curriculumFocus["Nigeria (NERDC)"];
  const profile = profileGuidance[payload.subjectProfile || "general"] || profileGuidance.general;
  const style = stylePolicy[payload.markingStyle || "standard"] || stylePolicy.standard;

  const systemPrompt = `You are Teazy AI's Writing Assessment marker.
CURRICULUM: ${payload.curriculum}
${focus}
SUBJECT PROFILE (${payload.subject}): ${profile}
MARKING STYLE: ${payload.markingStyle || "standard"} - ${style}
LANGUAGE: ${payload.language || "English"}.

If a marking scheme is provided, PRIORITISE it. Identify each question (Q1, Q2 ...). Never fabricate answers.
Return ONLY JSON: {"overallScore":n,"maxScore":n,"percentage":n,"grade":"","confidence":n,"manualReviewRecommended":bool,"summary":"","perQuestion":[{"number":"","questionText":"","studentAnswer":"","awarded":n,"max":n,"feedback":""}],"strengths":[],"improvements":[],"commonErrors":[],"suggestedIntervention":"","suggestedHomework":"","curriculumObjectives":[],"teacherComment":""}`;

  const userPrompt = [
    `Class: ${payload.classLevel}`,
    `Assessment type: ${payload.assessmentType || "General"}`,
    payload.questionPaper ? `\nQUESTION PAPER:\n${payload.questionPaper}` : "",
    payload.markingScheme ? `\nMARKING SCHEME (authoritative):\n${payload.markingScheme}` : "",
    `\nSTUDENT SCRIPT:\n${payload.studentScript}`,
  ].filter(Boolean).join("\n");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (payload.priority === "high") headers["x-priority"] = "high";

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) throw new Error(`AI ${resp.status}`);
  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content || "";
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);
  const perQuestion = Array.isArray(parsed.perQuestion) ? parsed.perQuestion : [];
  const maxScore = Number(parsed.maxScore) || perQuestion.reduce((s: number, q: any) => s + (Number(q.max) || 0), 0) || 100;
  const overallScore = Number(parsed.overallScore) || perQuestion.reduce((s: number, q: any) => s + (Number(q.awarded) || 0), 0);
  const percentage = Number(parsed.percentage) || (maxScore > 0 ? Math.round((overallScore / maxScore) * 100) : 0);
  return {
    overallScore, maxScore, percentage,
    grade: parsed.grade || gradeFromPercent(percentage),
    confidence: Number(parsed.confidence) || 80,
    manualReviewRecommended: parsed.manualReviewRecommended ?? (Number(parsed.confidence) || 80) < 75,
    summary: parsed.summary || "",
    perQuestion,
    strengths: parsed.strengths || [],
    improvements: parsed.improvements || [],
    commonErrors: parsed.commonErrors || [],
    suggestedIntervention: parsed.suggestedIntervention || "",
    suggestedHomework: parsed.suggestedHomework || "",
    curriculumObjectives: parsed.curriculumObjectives || [],
    teacherComment: parsed.teacherComment || "",
  };
}

async function pool<T>(items: T[], limit: number, fn: (t: T) => Promise<void>) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (!next) break;
      try { await fn(next); } catch (e) { console.error("worker error", e); }
    }
  });
  await Promise.all(runners);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Sign in required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Sign in required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Pro gate
    const { data: sub } = await admin.from("subscriptions").select("plan,status,current_period_end").eq("user_id", user.id).maybeSingle();
    const proActive = sub?.status === "active" && (sub?.plan === "pro" || sub?.plan === "pro_monthly") &&
      (!sub?.current_period_end || new Date(sub.current_period_end) > new Date());
    if (!proActive) {
      return new Response(JSON.stringify({ error: "Bulk marking is an Assessment Pro feature." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { batchId } = await req.json();
    if (!batchId) return new Response(JSON.stringify({ error: "batchId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: batch } = await admin.from("assessment_batches").select("*").eq("id", batchId).eq("user_id", user.id).maybeSingle();
    if (!batch) return new Response(JSON.stringify({ error: "Batch not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: items } = await admin.from("assessment_batch_items").select("*").eq("batch_id", batchId).eq("status", "queued");
    const queue = items || [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // process in background so HTTP returns fast; realtime rows show progress
    const process = async () => {
      await pool(queue, 4, async (item: any) => {
        await admin.from("assessment_batch_items").update({ status: "processing" }).eq("id", item.id);
        try {
          const result = await gradeOne({
            curriculum: batch.curriculum,
            subject: batch.subject,
            subjectProfile: batch.subject_profile || undefined,
            classLevel: batch.class_level,
            assessmentType: batch.assessment_type || undefined,
            markingStyle: batch.marking_style || "standard",
            questionPaper: batch.question_paper || undefined,
            markingScheme: batch.marking_scheme || undefined,
            studentScript: item.ocr_text || "",
            language: batch.language || "English",
            priority: "high",
          }, LOVABLE_API_KEY);
          await admin.from("assessment_batch_items").update({
            status: "done",
            result_json: result,
            awarded: result.overallScore,
            max_score: result.maxScore,
            percent: result.percentage,
            grade: result.grade,
            confidence: result.confidence,
          }).eq("id", item.id);
        } catch (e) {
          console.error("item failed", item.id, e);
          await admin.from("assessment_batch_items").update({
            status: "failed",
            error: e instanceof Error ? e.message : "Failed",
          }).eq("id", item.id);
        }
      });
    };

    // @ts-ignore EdgeRuntime available on Supabase Edge
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(process());
    } else {
      process();
    }

    return new Response(JSON.stringify({ queued: queue.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
