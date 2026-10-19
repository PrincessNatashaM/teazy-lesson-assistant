/** Exact-count instructional illustrations for worksheets, drawn as SVG so preview, PDF and Word all match. */
export type WsObject = "ball" | "apple" | "star" | "heart" | "flower" | "fish";
export type WsShape = "circle" | "square" | "triangle" | "rectangle" | "star" | "oval" | "pentagon" | "hexagon" | "diamond";
export interface WsVisual { kind: "none" | "objects" | "shapes"; object: WsObject; groups: number[]; takeAway: number; shapes: WsShape[] }

export const OBJECTS: WsObject[] = ["ball", "apple", "star", "heart", "flower", "fish"];
export const SHAPES: WsShape[] = ["circle", "square", "triangle", "rectangle", "star", "oval", "pentagon", "hexagon", "diamond"];
export const emptyVisual = (): WsVisual => ({ kind: "none", object: "ball", groups: [], takeAway: 0, shapes: [] });

const INK = "#1f2937";
const poly = (n: number, cx: number, cy: number, r: number, rot = -Math.PI / 2) =>
  Array.from({ length: n }, (_, i) => { const a = rot + (i * 2 * Math.PI) / n; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
const starPts = (cx: number, cy: number, R: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, d = i % 2 ? r : R; return `${(cx + d * Math.cos(a)).toFixed(1)},${(cy + d * Math.sin(a)).toFixed(1)}`; }).join(" ");

function objectSvg(o: WsObject, x: number, y: number, s: number) {
  const cx = x + s / 2, cy = y + s / 2, r = s * 0.4, st = `stroke="${INK}" stroke-width="2"`;
  switch (o) {
    case "apple": return `<circle cx="${cx}" cy="${cy + 2}" r="${r}" fill="#e5484d" ${st}/><path d="M${cx} ${cy - r + 2} q2 -8 7 -10" fill="none" ${st}/><ellipse cx="${cx + 7}" cy="${cy - r - 4}" rx="6" ry="3" fill="#46a758" ${st}/>`;
    case "star": return `<polygon points="${starPts(cx, cy, r + 2, r * 0.45)}" fill="#f5b400" ${st}/>`;
    case "heart": return `<path d="M${cx} ${cy + r} C${cx - r * 2} ${cy - r * 0.2} ${cx - r * 0.6} ${cy - r * 1.4} ${cx} ${cy - r * 0.4} C${cx + r * 0.6} ${cy - r * 1.4} ${cx + r * 2} ${cy - r * 0.2} ${cx} ${cy + r}Z" fill="#e5484d" ${st}/>`;
    case "flower": return [0, 72, 144, 216, 288].map((a) => `<circle cx="${(cx + r * 0.55 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(cy + r * 0.55 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" r="${r * 0.45}" fill="#f78fb3" ${st}/>`).join("") + `<circle cx="${cx}" cy="${cy}" r="${r * 0.35}" fill="#f5b400" ${st}/>`;
    case "fish": return `<ellipse cx="${cx - 3}" cy="${cy}" rx="${r}" ry="${r * 0.6}" fill="#3e9bd8" ${st}/><polygon points="${cx + r - 4},${cy} ${cx + r + 8},${cy - 9} ${cx + r + 8},${cy + 9}" fill="#3e9bd8" ${st}/><circle cx="${cx - r * 0.5}" cy="${cy - 3}" r="2.5" fill="${INK}"/>`;
    default: return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f97316" ${st}/><path d="M${cx - r} ${cy} Q${cx} ${cy - r * 0.6} ${cx + r} ${cy}" fill="none" ${st}/><path d="M${cx} ${cy - r} Q${cx - r * 0.6} ${cy} ${cx} ${cy + r}" fill="none" ${st}/>`;
  }
}

function shapeSvg(sh: WsShape, x: number, y: number, s: number) {
  const cx = x + s / 2, cy = y + s / 2, r = s * 0.42, st = `fill="none" stroke="${INK}" stroke-width="3"`;
  switch (sh) {
    case "square": return `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" ${st}/>`;
    case "rectangle": return `<rect x="${cx - r * 1.1}" y="${cy - r * 0.6}" width="${2.2 * r}" height="${1.2 * r}" ${st}/>`;
    case "triangle": return `<polygon points="${poly(3, cx, cy + r * 0.15, r * 1.05)}" ${st}/>`;
    case "pentagon": return `<polygon points="${poly(5, cx, cy, r)}" ${st}/>`;
    case "hexagon": return `<polygon points="${poly(6, cx, cy, r, 0)}" ${st}/>`;
    case "diamond": return `<polygon points="${poly(4, cx, cy, r)}" ${st}/>`;
    case "star": return `<polygon points="${starPts(cx, cy, r * 1.05, r * 0.45)}" ${st}/>`;
    case "oval": return `<ellipse cx="${cx}" cy="${cy}" rx="${r * 1.1}" ry="${r * 0.7}" ${st}/>`;
    default: return `<circle cx="${cx}" cy="${cy}" r="${r}" ${st}/>`;
  }
}

/** Returns an SVG string with exactly the counts in the visual, or "" when nothing should be drawn. */
export function visualSvg(v?: WsVisual | null): { svg: string; width: number; height: number } | null {
  if (!v) return null;
  if (v.kind === "objects" && (v.groups || []).some((g) => g > 0)) {
    const S = 44, PER_ROW = 5, PAD = 10, SIGN = 40;
    const groups = v.groups.slice(0, 3).map((g) => Math.min(20, Math.max(0, g)));
    const sub = v.takeAway > 0 && groups.length === 1;
    let x = 0, out = "", maxH = 0;
    const boxes = groups.map((g) => { const cols = Math.min(PER_ROW, Math.max(1, g)), rows = Math.max(1, Math.ceil(g / PER_ROW)); return { g, w: cols * S + 2 * PAD, h: rows * S + 2 * PAD }; });
    boxes.forEach((b) => (maxH = Math.max(maxH, b.h)));
    boxes.forEach((b, gi) => {
      if (gi > 0) { out += `<text x="${x + SIGN / 2}" y="${maxH / 2 + 12}" font-size="36" font-weight="700" text-anchor="middle" fill="${INK}" font-family="Arial">+</text>`; x += SIGN; }
      const oy = (maxH - b.h) / 2;
      out += `<rect x="${x + 1}" y="${oy + 1}" width="${b.w - 2}" height="${b.h - 2}" rx="12" fill="none" stroke="${INK}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="6 4"/>`;
      for (let i = 0; i < b.g; i++) {
        const ox = x + PAD + (i % PER_ROW) * S, oyy = oy + PAD + Math.floor(i / PER_ROW) * S;
        out += objectSvg(v.object, ox, oyy, S);
        if (sub && i >= b.g - Math.min(v.takeAway, b.g)) out += `<line x1="${ox + 4}" y1="${oyy + 4}" x2="${ox + S - 4}" y2="${oyy + S - 4}" stroke="${INK}" stroke-width="4"/><line x1="${ox + S - 4}" y1="${oyy + 4}" x2="${ox + 4}" y2="${oyy + S - 4}" stroke="${INK}" stroke-width="4"/>`;
      }
      x += b.w;
    });
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${x}" height="${maxH}" viewBox="0 0 ${x} ${maxH}">${out}</svg>`, width: x, height: maxH };
  }
  if (v.kind === "shapes" && v.shapes?.length) {
    const S = 90, GAP = 18, list = v.shapes.slice(0, 8);
    const w = list.length * S + (list.length - 1) * GAP;
    const out = list.map((sh, i) => shapeSvg(sh, i * (S + GAP), 0, S)).join("");
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${S}" viewBox="0 0 ${w} ${S}">${out}</svg>`, width: w, height: S };
  }
  return null;
}

/** Makes object counts match the arithmetic in the prompt (e.g. "4 + 2" -> groups [4, 2]; "7 - 3" -> 7 with 3 crossed out). */
export function reconcileVisual(prompt: string, v: WsVisual): WsVisual {
  if (!v) return emptyVisual();
  if (v.kind !== "objects") return v;
  const m = prompt.match(/(\d{1,2})\s*([+\-−–])\s*(\d{1,2})/);
  if (m) {
    const a = +m[1], b = +m[3];
    if (m[2] === "+") return { ...v, groups: [a, b], takeAway: 0 };
    if (b <= a) return { ...v, groups: [a], takeAway: b };
  }
  const c = prompt.match(/count\D{0,40}?(\d{1,2})|(\d{1,2})\s+\w+\s*(?:are there|in all)/i);
  if (c && v.groups.length !== 1) return { ...v, groups: [Math.min(20, +(c[1] || c[2]))], takeAway: 0 };
  return v;
}

/** Rasterises a visual for Word export. */
export async function visualPng(v?: WsVisual | null): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  const r = visualSvg(v); if (!r) return null;
  const img = new Image(); const scale = 2;
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(r.svg);
  await img.decode();
  const c = document.createElement("canvas"); c.width = r.width * scale; c.height = r.height * scale;
  const ctx = c.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
  const b64 = c.toDataURL("image/png").split(",")[1];
  return { data: Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0)), width: r.width, height: r.height };
}
