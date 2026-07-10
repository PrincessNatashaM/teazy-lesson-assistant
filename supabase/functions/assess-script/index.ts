import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const curriculumFocus: Record<string, string> = {
  "Nigeria (NERDC)":
    "Follow NERDC scheme of work. Value grammatical correctness, clear structure, mark allocation transparency, and neatness. Use Nigerian classroom conventions (e.g. 'Well done', 'Read the question again').",
  WAEC:
    "Apply WAEC marking scheme conventions — clear mark points per sub-question, allocate marks in halves or wholes, cite typical WAEC chief examiner remarks where relevant.",
  NECO:
    "Apply NECO marking scheme conventions — structured mark allocation, formal feedback language, benchmark against NECO expected standards.",
  "Kenya CBC":
    "Follow the Kenya Competency Based Curriculum. Score against competencies, values and PCIs. Use CBC descriptors: Exceeding Expectation (EE), Meeting Expectation (ME), Approaching Expectation (AE), Below Expectation (BE).",
  "Ghana Curriculum":
    "Follow Ghana's standards-based curriculum. Balance conceptual understanding, communication and application. Reference NaCCA content standards where relevant.",
};

const profileGuidance: Record<string, string> = {
  math: "Mathematics: award method marks for correct working even when the final answer is wrong. Show where marks were awarded (M1/A1 style). Point out arithmetic vs. conceptual errors distinctly.",
  sciences:
    "Sciences: award marks for correct terminology, definitions, labelled diagrams, units, and correct application of formulas. Distinguish factual recall from application/analysis.",
  english:
    "English / Language: assess content, organisation, expression, grammar, mechanics and register. Quote the student's own phrases when giving feedback.",
  literature:
    "Literature: assess understanding of text, character analysis, theme handling, use of evidence/quotations and literary devices.",
  geography:
    "Geography: reward accurate place-based facts, correct sketch maps, cause-effect reasoning, use of case studies and geographical terminology.",
  history:
    "History: reward accurate dates and figures, cause-consequence analysis, use of sources and balanced argument.",
  languages:
    "Language paper: assess vocabulary, grammar, comprehension, translation accuracy and cultural context.",
  religious:
    "Religious studies: assess scriptural accuracy, doctrinal understanding, moral application and clarity.",
  general:
    "Reward factual accuracy, structured reasoning, correct terminology and clear expression suited to the subject.",
};

const stylePolicy: Record<string, string> = {
  strict: "Deduct for every clear error. Round DOWN borderline marks. Minimal benefit of the doubt.",
  standard: "Balanced marking. Round to the fairer mark. Reward substance, deduct for clear errors.",
  lenient: "Encouraging marking. Round UP borderline marks. Reward effort, partial credit is generous.",
};

function gradeFromPercent(p: number): string {
  if (p >= 75) return "A";
  if (p >= 65) return "B";
  if (p >= 55) return "C";
  if (p >= 45) return "D";
  if (p >= 40) return "E";
  return "F";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      curriculum,
      subject,
      subjectProfile,
      classLevel,
      assessmentType,
      markingStyle,
      questionPaper,
      markingScheme,
      studentScript,
      language,
    } = await req.json();

    if (!curriculum || !subject || !classLevel || !studentScript) {
      return new Response(
        JSON.stringify({ error: "curriculum, subject, classLevel and studentScript are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const focus = curriculumFocus[curriculum] || curriculumFocus["Nigeria (NERDC)"];
    const profile = profileGuidance[subjectProfile] || profileGuidance.general;
    const style = stylePolicy[markingStyle] || stylePolicy.standard;
    const lang = language || "English";

    const systemPrompt = `You are Teazy AI's Assessment Marker — a senior African classroom teacher and examiner.
You mark handwritten student scripts fairly, transparently and constructively.

CURRICULUM: ${curriculum}
${focus}

SUBJECT PROFILE (${subject}):
${profile}

MARKING STYLE: ${markingStyle}
${style}

LANGUAGE OF FEEDBACK: ${lang}.

RULES:
- If a marking scheme is provided, PRIORITISE it over your own inference.
- Identify each question in the student's script (Q1, Q2, ...). If the script is a single essay, treat it as one question.
- For each question: assign an award (points) out of a max, and give feedback that quotes the student's own words where useful.
- Report a "confidence" (0-100) reflecting OCR quality and unambiguity. If < 75, note that manual review is recommended.
- Never fabricate answers the student didn't give.
- Keep feedback constructive, specific and classroom-ready.

Return ONLY valid JSON with this exact schema (no markdown fences):
{
  "overallScore": <number, total awarded points>,
  "maxScore": <number, total possible points>,
  "percentage": <number 0-100>,
  "grade": "<letter or CBC descriptor>",
  "confidence": <number 0-100>,
  "manualReviewRecommended": <boolean>,
  "summary": "<one paragraph overall summary>",
  "perQuestion": [
    {
      "number": "<e.g. Q1 or 1a>",
      "questionText": "<question, if identifiable>",
      "studentAnswer": "<short paraphrase / quote of what the student wrote>",
      "awarded": <number>,
      "max": <number>,
      "feedback": "<specific feedback, 1-3 sentences>"
    }
  ],
  "strengths": ["<strength>", "..."],
  "improvements": ["<actionable improvement>", "..."],
  "commonErrors": ["<recurring error>", "..."],
  "suggestedIntervention": "<what the teacher should reteach or focus on next>",
  "suggestedHomework": "<concrete homework task for this student>",
  "curriculumObjectives": ["<objective the student still needs to master>", "..."],
  "teacherComment": "<one warm, classroom-ready paragraph the teacher can copy onto the script>"
}`;

    const userPrompt = [
      `Class: ${classLevel}`,
      `Assessment type: ${assessmentType || "General"}`,
      questionPaper?.trim() ? `\nQUESTION PAPER:\n${questionPaper.trim()}` : "",
      markingScheme?.trim() ? `\nMARKING SCHEME (authoritative):\n${markingScheme.trim()}` : "",
      `\nSTUDENT SCRIPT (from OCR, teacher-approved):\n${studentScript}`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to grade script." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", raw);
      return new Response(JSON.stringify({ error: "Failed to parse assessment. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalise / fill safe defaults so the UI never crashes.
    const perQuestion = Array.isArray(parsed.perQuestion) ? parsed.perQuestion : [];
    const maxScore = Number(parsed.maxScore) || perQuestion.reduce((s: number, q: any) => s + (Number(q.max) || 0), 0) || 100;
    const overallScore = Number(parsed.overallScore) || perQuestion.reduce((s: number, q: any) => s + (Number(q.awarded) || 0), 0);
    const percentage = Number(parsed.percentage) || (maxScore > 0 ? Math.round((overallScore / maxScore) * 100) : 0);
    const grade = parsed.grade || gradeFromPercent(percentage);
    const confidence = Number(parsed.confidence) || 80;

    const normalised = {
      overallScore,
      maxScore,
      percentage,
      grade,
      confidence,
      manualReviewRecommended: parsed.manualReviewRecommended ?? confidence < 75,
      summary: parsed.summary || "",
      perQuestion,
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
      commonErrors: parsed.commonErrors || [],
      suggestedIntervention: parsed.suggestedIntervention || "",
      suggestedHomework: parsed.suggestedHomework || "",
      curriculumObjectives: parsed.curriculumObjectives || [],
      teacherComment: parsed.teacherComment || "",
      meta: { curriculum, subject, classLevel, assessmentType, markingStyle },
    };

    return new Response(JSON.stringify(normalised), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
