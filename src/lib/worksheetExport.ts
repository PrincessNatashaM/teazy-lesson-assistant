import type { Worksheet, WsQuestion, WsSection } from "./worksheet";
import { answerKeyLines, blankParts, letters, sizeFor } from "./worksheet";
import { visualPng } from "./worksheetVisual";

/** PDF that mirrors the preview: each block is captured separately and placed whole, so a question never splits from its answer space. */
export async function worksheetPdf(root: HTMLElement, title: string): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 12, FOOT = 10, usable = W - 2 * M;
  const blocks = Array.from(root.querySelectorAll<HTMLElement>("[data-ws-block]"));
  const scale = usable / root.clientWidth; // mm per css px for consistent sizing across blocks
  let y = M, page = 1;
  const footer = () => { pdf.setFontSize(9); pdf.setTextColor(90); pdf.text(`${title.slice(0, 80)}  |  Page ${page}`, W / 2, H - 6, { align: "center" }); };
  for (const b of blocks) {
    const c = await html2canvas(b, { scale: 1.6, backgroundColor: "#ffffff", useCORS: true });
    let w = b.offsetWidth * scale, h = b.offsetHeight * scale;
    const maxH = H - 2 * M - FOOT;
    if (h > maxH) { w *= maxH / h; h = maxH; }
    if (y + h > H - M - FOOT) { footer(); pdf.addPage(); page += 1; y = M; }
    pdf.addImage(c.toDataURL("image/jpeg", 0.85), "JPEG", M, y, w, h);
    y += h;
  }
  footer();
  return pdf.output("blob");
}

export async function answerKeyPdf(ws: Worksheet): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setFontSize(16); pdf.text(`${ws.title} - Answer Key (Teacher copy)`, 12, 18, { maxWidth: 186 });
  pdf.setFontSize(11); let y = 30;
  for (const l of answerKeyLines(ws)) {
    const lines = pdf.splitTextToSize(l, 186);
    if (y + lines.length * 6 > 285) { pdf.addPage(); y = 18; }
    pdf.setFont("helvetica", l.startsWith("Section") ? "bold" : "normal"); pdf.text(lines, 12, y); y += lines.length * 6 + 1;
  }
  return pdf.output("blob");
}

const dataUrlBytes = (u: string) => Uint8Array.from(atob(u.split(",")[1] || ""), (c) => c.charCodeAt(0));

export async function worksheetDocx(ws: Worksheet, images: Record<string, string>, withKey = false): Promise<Blob> {
  const d = await import("docx");
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, Footer, PageNumber, ImageRun, HeadingLevel } = d;
  const sz = sizeFor(ws.ageBand).docx;
  const run = (text: string, o: Record<string, unknown> = {}) => new TextRun({ text, size: sz, ...o });
  const line = () => new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "777777" } }, spacing: { before: 280 }, children: [run(" ")] });
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
  const grid = (rows: string[][], bordered = true) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, ...(bordered ? {} : { borders: noBorders }),
    rows: rows.map((r) => new TableRow({ children: r.map((c) => new TableCell({ children: [new Paragraph({ spacing: { before: 80, after: 80 }, children: [run(c)] })] })) })),
  });
  const qHead = (n: number, q: WsQuestion, text?: (InstanceType<typeof TextRun>)[]) => new Paragraph({ keepNext: true, spacing: { before: 240 },
    children: [run(`${n}. `, { bold: true }), ...(text || [run(q.prompt)]), ...(q.marks > 0 ? [run(`   [${q.marks} mark${q.marks === 1 ? "" : "s"}]`, { bold: true, size: sz - 4 })] : [])] });

  const body: any[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.TITLE, children: [run(ws.title, { bold: true, size: sz + 16 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [run([ws.subject && `Subject: ${ws.subject}`, ws.level && `Class: ${ws.level}`, ws.topic && `Topic: ${ws.topic}`, ws.totalMarks ? `Total: ${ws.totalMarks} marks` : ""].filter(Boolean).join("    "), { size: sz - 2 })] }),
    grid([["Name: ______________________", "Class: __________", "Date: __________"]], false),
  ];
  if (ws.instructions) body.push(new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 8 }, bottom: { style: BorderStyle.SINGLE, size: 8 }, left: { style: BorderStyle.SINGLE, size: 8 }, right: { style: BorderStyle.SINGLE, size: 8 } }, spacing: { before: 200 }, children: [run("Instructions: ", { bold: true }), run(ws.instructions)] }));

  const pngs: Record<string, Awaited<ReturnType<typeof visualPng>>> = {};
  for (const [si, s] of ws.sections.entries()) for (const [qi, q] of s.questions.entries()) pngs[`${si}-${qi}`] = await visualPng(q.visual).catch(() => null);
  let n = 0;
  ws.sections.forEach((s: WsSection, si) => {
    body.push(new Paragraph({ keepNext: true, spacing: { before: 400 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12 } }, children: [run(`SECTION ${letters[si]}: ${s.heading.toUpperCase()}`, { bold: true })] }));
    if (s.instructions) body.push(new Paragraph({ keepNext: true, children: [run(s.instructions, { italics: true, size: sz - 2 })] }));
    s.questions.forEach((q, qi) => {
      n += 1; const img = images[`${si}-${qi}`]; const at = body.length;
      switch (s.format) {
        case "mcq": body.push(qHead(n, q)); { const opts = q.options.map((o, i) => `☐ ( ${letters[i]} )  ${o}`); const rows: string[][] = []; for (let i = 0; i < opts.length; i += 2) rows.push([opts[i], opts[i + 1] || ""]); body.push(grid(rows, false)); } break;
        case "fill_blank": body.push(qHead(n, q, blankParts(q.prompt).map((p) => p === null ? run("________________") : run(p)))); break;
        case "true_false": body.push(qHead(n, q)); body.push(new Paragraph({ children: [run("☐ True        ☐ False")] })); break;
        case "matching": body.push(qHead(n, q, [run(q.prompt || "Match Column A with Column B.")])); body.push(grid([["Column A", "Answer", "Column B"], ...q.left.map((l, i) => [`${i + 1}. ${l}`, "______", `${letters[i]}. ${q.right[i] || ""}`])])); break;
        case "sequencing": body.push(qHead(n, q, [run(q.prompt || "Number these in the correct order.")])); q.items.forEach((it) => body.push(new Paragraph({ spacing: { before: 120 }, children: [run(`[    ]   ${it}`)] }))); break;
        case "table": body.push(qHead(n, q)); body.push(grid([q.tableHeaders, ...q.tableRows.map((r) => q.tableHeaders.map((_, j) => r[j] || " "))])); break;
        case "tracing": body.push(qHead(n, q, [run("Trace, then write it yourself.")])); body.push(new Paragraph({ children: [run(`${q.prompt}   ${q.prompt}   ${q.prompt}`, { size: 96, color: "BBBBBB" })] })); body.push(line()); break;
        case "labelling": case "drawing":
          body.push(qHead(n, q, [run(q.prompt || "Label the diagram.")]));
          if (q.labels.length) body.push(new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 6 }, bottom: { style: BorderStyle.SINGLE, size: 6 }, left: { style: BorderStyle.SINGLE, size: 6 }, right: { style: BorderStyle.SINGLE, size: 6 } }, children: [run(q.labels.join("      "), { bold: true })] }));
          if (img) body.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: "png", data: dataUrlBytes(img), transformation: { width: 420, height: 280 } })] }));
          else body.push(...Array.from({ length: 8 }, () => new Paragraph({ children: [run(" ")] })));
          q.labels.forEach((_, i) => body.push(new Paragraph({ children: [run(`${letters[i]}. ______________________________`)] })));
          break;
        case "maths": body.push(qHead(n, q)); body.push(new Paragraph({ children: [run("Working:", { italics: true })] })); for (let i = 0; i < 5; i++) body.push(new Paragraph({ children: [run(" ")] })); body.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("Answer: ____________")] })); break;
        default: body.push(qHead(n, q)); for (let i = 0; i < (q.lines || (s.format === "long" ? 8 : 2)); i++) body.push(line());
      }
      const v = pngs[`${si}-${qi}`];
      if (v) { const w = Math.min(560, v.width); body.splice(at + 1, 0, new Paragraph({ keepNext: true, alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 }, children: [new ImageRun({ type: "png", data: v.data, transformation: { width: w, height: Math.round(v.height * (w / v.width)) } })] })); }
    });
  });
  const sections: any[] = [{ footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [`${ws.title}  |  Page `, PageNumber.CURRENT], size: 18 })] })] }) }, children: body }];
  if (withKey) sections.push({ children: [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run(`${ws.title} - Answer Key (Teacher copy)`, { bold: true })] }), ...answerKeyLines(ws).map((l) => new Paragraph({ spacing: { before: 100 }, children: [run(l, { bold: l.startsWith("Section") })] }))] });
  return Packer.toBlob(new Document({ sections }));
}
