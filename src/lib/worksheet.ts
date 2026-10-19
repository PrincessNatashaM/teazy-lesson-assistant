import { emptyVisual, reconcileVisual, OBJECTS, SHAPES, type WsVisual } from "./worksheetVisual";
export type WsFormat = "mcq" | "fill_blank" | "short" | "long" | "matching" | "true_false" | "labelling" | "maths" | "table" | "drawing" | "tracing" | "sequencing";
export interface WsQuestion { prompt: string; marks: number; lines: number; options: string[]; left: string[]; right: string[]; items: string[]; labels: string[]; tableHeaders: string[]; tableRows: string[][]; imagePrompt: string; answer: string; visual: WsVisual }
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
      imagePrompt: String(q.imagePrompt || ""), answer: String(q.answer || ""), visual: normVisual(q.visual, String(q.prompt ?? q.question ?? "")),
    })).map((q: WsQuestion) => ({ ...q, lines: s.format === "short" ? Math.max(2, q.lines) : s.format === "long" ? Math.max(6, q.lines) : q.lines })),
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

function normVisual(v: any, prompt: string): WsVisual {
  if (!v || !["objects", "shapes"].includes(v.kind)) return emptyVisual();
  const out: WsVisual = { kind: v.kind, object: OBJECTS.includes(v.object) ? v.object : "ball",
    groups: Array.isArray(v.groups) ? v.groups.map((g: any) => Math.max(0, Math.min(20, Math.round(Number(g) || 0)))).slice(0, 3) : [],
    takeAway: Math.max(0, Math.round(Number(v.takeAway) || 0)), shapes: Array.isArray(v.shapes) ? v.shapes.filter((x: any) => SHAPES.includes(x)) : [] };
  return reconcileVisual(prompt, out);
}

/** Keeps at most `max` distinct question formats (sections of other formats are dropped) unless the teacher asked for more. */
export function limitFormats<T extends { format: string }>(sections: T[], max = 2): T[] {
  const keep: string[] = [];
  return sections.filter((s) => { if (keep.includes(s.format)) return true; if (keep.length < max) { keep.push(s.format); return true; } return false; });
}
