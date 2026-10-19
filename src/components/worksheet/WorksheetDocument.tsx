import { forwardRef } from "react";
import type { Worksheet, WsQuestion, WsSection } from "@/lib/worksheet";
import { blankParts, sizeFor, letters } from "@/lib/worksheet";

const Lines = ({ n, gap }: { n: number; gap: number }) => (
  <div className="mt-2">{Array.from({ length: Math.max(1, n) }).map((_, i) => <div key={i} className="border-b border-foreground/50" style={{ height: gap }} />)}</div>
);
const Box = () => <span className="inline-block h-4 w-4 border-2 border-foreground align-middle mr-2" />;
const Marks = ({ m }: { m: number }) => (m > 0 ? <span className="ml-2 whitespace-nowrap text-xs font-semibold">[{m} mark{m === 1 ? "" : "s"}]</span> : null);

function QuestionBody({ q, format, n, gap, images, qKey }: { q: WsQuestion; format: WsSection["format"]; n: number; gap: number; images: Record<string, string>; qKey: string }) {
  const head = (text: React.ReactNode) => (
    <div className="flex justify-between gap-3"><div><span className="font-semibold mr-2">{n}.</span>{text}</div><Marks m={q.marks} /></div>
  );
  const img = images[qKey];
  switch (format) {
    case "mcq":
      return <>{head(q.prompt)}<div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 pl-6">{q.options.map((o, i) => (
        <div key={i} className="flex items-center"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-foreground text-xs font-bold">{letters[i]}</span>{o}</div>))}</div></>;
    case "fill_blank":
      return head(blankParts(q.prompt).map((p, i) => p === null ? <span key={i} className="inline-block min-w-[110px] border-b-2 border-foreground mx-1">&nbsp;</span> : <span key={i}>{p}</span>));
    case "true_false":
      return <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="font-semibold mr-2">{n}.</span>{q.prompt}</div>
        <div className="flex items-center gap-4 whitespace-nowrap"><span><Box />True</span><span><Box />False</span><Marks m={q.marks} /></div></div>;
    case "short": return <>{head(q.prompt)}<Lines n={q.lines || 2} gap={gap} /></>;
    case "long": return <>{head(q.prompt)}<Lines n={q.lines || 8} gap={gap} /></>;
    case "maths":
      return <>{head(q.prompt)}<div className="mt-2 h-40 rounded border border-foreground/50"
        style={{ backgroundImage: "linear-gradient(hsl(var(--foreground)/0.12) 1px,transparent 1px),linear-gradient(90deg,hsl(var(--foreground)/0.12) 1px,transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="mt-2 text-right">Answer: <span className="inline-block w-40 border-b-2 border-foreground">&nbsp;</span></div></>;
    case "matching":
      return <>{head(q.prompt || "Match each item in Column A with the correct item in Column B.")}<div className="mt-3 grid grid-cols-2 gap-8">
        <div><div className="mb-2 font-semibold">Column A</div>{q.left.map((l, i) => <div key={i} className="mb-3 flex items-center gap-2"><span className="font-semibold">{i + 1}.</span><span className="flex-1">{l}</span><span className="inline-block w-10 border-b-2 border-foreground">&nbsp;</span></div>)}</div>
        <div><div className="mb-2 font-semibold">Column B</div>{q.right.map((r, i) => <div key={i} className="mb-3"><span className="font-semibold mr-2">{letters[i]}.</span>{r}</div>)}</div></div></>;
    case "sequencing":
      return <>{head(q.prompt || "Put these in the correct order. Write 1, 2, 3 ... in the boxes.")}<div className="mt-2 space-y-2 pl-6">{q.items.map((it, i) => (
        <div key={i} className="flex items-center gap-3"><span className="inline-block h-8 w-8 border-2 border-foreground" />{it}</div>))}</div></>;
    case "table":
      return <>{head(q.prompt)}<table className="mt-2 w-full border-collapse"><thead><tr>{q.tableHeaders.map((h, i) => <th key={i} className="border border-foreground p-2 text-left">{h}</th>)}</tr></thead>
        <tbody>{q.tableRows.map((r, i) => <tr key={i}>{q.tableHeaders.map((_, j) => <td key={j} className="border border-foreground p-2" style={{ height: gap + 10 }}>{r[j] || ""}</td>)}</tr>)}</tbody></table></>;
    case "labelling":
      return <>{head(q.prompt || "Label the diagram using the words in the box.")}
        {q.labels.length > 0 && <div className="mt-2 rounded border-2 border-foreground p-2 text-center font-semibold">{q.labels.join("     ")}</div>}
        <div className="mt-3 grid grid-cols-[3fr_2fr] gap-4 items-center">
          <div className="flex min-h-[200px] items-center justify-center rounded border border-foreground/50">{img ? <img src={img} alt="Diagram to label" className="max-h-[260px] w-full object-contain" /> : <span className="text-sm text-muted-foreground">Diagram</span>}</div>
          <div className="space-y-4">{q.labels.map((_, i) => <div key={i} className="flex items-end gap-2"><span className="font-semibold">{letters[i]}.</span><span className="flex-1 border-b-2 border-foreground">&nbsp;</span></div>)}</div>
        </div></>;
    case "drawing":
      return <>{head(q.prompt)}<div className="mt-2 flex h-56 items-center justify-center rounded border-2 border-dashed border-foreground/60">{img && <img src={img} alt="Picture to colour" className="max-h-52 object-contain" />}</div></>;
    case "tracing":
      return <>{head("Trace, then write it yourself.")}<div className="mt-2 flex flex-wrap gap-6 text-6xl font-bold tracking-widest" style={{ color: "transparent", WebkitTextStroke: "2px hsl(var(--foreground) / 0.45)" }}>
        {[0, 1, 2].map((i) => <span key={i} className="border-b-2 border-dashed border-foreground/40 pb-1">{q.prompt}</span>)}</div><Lines n={1} gap={70} /></>;
    default: return <>{head(q.prompt)}<Lines n={3} gap={gap} /></>;
  }
}

const WorksheetDocument = forwardRef<HTMLDivElement, { ws: Worksheet; images: Record<string, string> }>(({ ws, images }, ref) => {
  const sz = sizeFor(ws.ageBand);
  let n = 0;
  return (
    <div ref={ref} className="worksheet-doc mx-auto w-full max-w-[794px] bg-card text-card-foreground border border-border shadow-sm px-8 py-8 sm:px-12" style={{ fontSize: sz.font, lineHeight: 1.5 }}>
      <div data-ws-block className="pb-4">
        <div className="border-b-4 border-foreground pb-3">
          <h1 className="text-center font-bold" style={{ fontSize: sz.font * 1.6 }}>{ws.title}</h1>
          <div className="mt-1 flex flex-wrap justify-center gap-x-6 text-sm">
            {ws.subject && <span><b>Subject:</b> {ws.subject}</span>}{ws.level && <span><b>Class:</b> {ws.level}</span>}{ws.topic && <span><b>Topic:</b> {ws.topic}</span>}
            {ws.totalMarks > 0 && <span><b>Total:</b> {ws.totalMarks} marks</span>}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[2fr_1fr_1fr] gap-4">
          {["Name", "Class", "Date"].map((f) => <div key={f} className="flex items-end gap-2"><b>{f}:</b><span className="flex-1 border-b-2 border-foreground">&nbsp;</span></div>)}
        </div>
        {ws.instructions && <div className="mt-4 rounded border-2 border-foreground p-3"><b>Instructions: </b>{ws.instructions}</div>}
      </div>
      {ws.sections.map((sec, si) => (
        <div key={si}>
          <div data-ws-block className="mt-5 pb-2">
            <div className="border-b-2 border-foreground pb-1 font-bold uppercase tracking-wide">Section {letters[si]}: {sec.heading}</div>
            {sec.instructions && <div className="mt-1 text-sm italic">{sec.instructions}</div>}
          </div>
          {sec.questions.map((q, qi) => { n += 1; return (
            <div key={qi} data-ws-block className="break-inside-avoid py-3">
              <QuestionBody q={q} format={sec.format} n={n} gap={sz.line} images={images} qKey={`${si}-${qi}`} />
            </div>); })}
        </div>
      ))}
    </div>
  );
});
WorksheetDocument.displayName = "WorksheetDocument";
export default WorksheetDocument;
