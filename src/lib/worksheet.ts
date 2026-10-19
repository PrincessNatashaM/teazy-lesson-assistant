export type WsFormat = "mcq" | "fill_blank" | "short" | "long" | "matching" | "true_false" | "labelling" | "maths" | "table" | "drawing" | "tracing" | "sequencing";
export interface WsQuestion { prompt: string; marks: number; lines: number; options: string[]; left: string[]; right: string[]; items: string[]; labels: string[]; tableHeaders: string[]; tableRows: string[][]; imagePrompt: string; answer: string }
export interface WsSection { heading: string; instructions: string; format: WsFormat; questions: WsQuestion[] }
export interface Worksheet { title: string; subject: string; level: string; topic: string; ageBand: "early" | "primary" | "secondary" | "university"; instructions: string; totalMarks: number; sections: WsSection[] }

export const letters = "ABCDEFGHIJKLMNOP".split("");

/** Removes numbering the model sometimes adds ("1.", "A.", "Section A:") since the layout numbers items itself. */
export const stripNum = (t: string) => t.replace(/^\s*(section\s+[a-z0-9]+\s*[:.)-]\s*)?([a-z0-9]{1,2}[.)]\s+)?/i, "").trim();

export function sizeFor(age: Worksheet["ageBand"]) {
  if (age === "early") return { font: 20, line: 48, docx: 32 };
  if (age === "primary") return { font: 16, line: 34, docx: 26 };
  return { font: 14, line: 30, docx: 22 };
}

/** Splits a fill-in-the-blank prompt into text parts and blanks (null). */
export function blankParts(prompt: string): (string | null)[] {
  const parts = prompt.split(/_{3,}/);
  const out: (string | null)[] = [];
  parts.forEach((p, i) => { if (p) out.push(p); if (i < parts.length - 1) out.push(null); });
  if (!out.includes(null)) out.push(" ", null);
  return out;
}

/** Fills missing fields so older or partial results still render, and keeps marks consistent. */
export function normalizeWorksheet(raw: any): Worksheet {
  const arr = (v: any) => (Array.isArray(v) ? v.map((x) => String(x ?? "")) : []);
  const sections: WsSection[] = (raw?.sections || []).map((s: any) => ({
    heading: stripNum(String(s.heading || "")), instructions: String(s.instructions || ""), format: (s.format || "short") as WsFormat,
    questions: (s.questions || []).map((q: any) => ({
      prompt: stripNum(String(q.prompt ?? q.question ?? "")), marks: Number(q.marks) || 0, lines: Number(q.lines) || 0,
      options: arr(q.options), left: arr(q.left), right: arr(q.right), items: arr(q.items), labels: arr(q.labels),
      tableHeaders: arr(q.tableHeaders), tableRows: Array.isArray(q.tableRows) ? q.tableRows.map(arr) : [],
      imagePrompt: String(q.imagePrompt || ""), answer: String(q.answer || ""),
    })),
  }));
  const total = sections.reduce((t, s) => t + s.questions.reduce((a, q) => a + q.marks, 0), 0);
  return { title: String(raw?.title || "Worksheet"), subject: String(raw?.subject || ""), level: String(raw?.level || ""), topic: String(raw?.topic || ""),
    ageBand: ["early", "primary", "secondary", "university"].includes(raw?.ageBand) ? raw.ageBand : "primary", instructions: String(raw?.instructions || ""), totalMarks: total, sections };
}

/** Questions that need a generated picture (labelling diagrams, colouring pictures), capped. */
export function imageRequests(ws: Worksheet, max = 4) {
  const out: { key: string; prompt: string }[] = [];
  ws.sections.forEach((s, si) => s.questions.forEach((q, qi) => {
    if (q.imagePrompt.trim() && (s.format === "labelling" || s.format === "drawing") && out.length < max) out.push({ key: `${si}-${qi}`, prompt: q.imagePrompt.slice(0, 600) });
  }));
  return out;
}

export function answerKeyLines(ws: Worksheet): string[] {
  let n = 0; const out: string[] = [];
  ws.sections.forEach((s, si) => { out.push(`Section ${letters[si]}: ${s.heading}`); s.questions.forEach((q) => { n += 1; out.push(`${n}. ${q.answer || "(teacher's judgement)"}`); }); });
  return out;
}
