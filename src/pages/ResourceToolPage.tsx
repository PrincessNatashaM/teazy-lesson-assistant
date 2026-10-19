import { useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuthGate } from "@/hooks/useAuthGate";
import VideoMaker from "@/components/VideoMaker";
import { readOcrResponse } from "@/lib/assessmentUpload";

export type ToolType = "worksheet" | "slides" | "rubric" | "video";

const META: Record<ToolType, { title: string; intro: string; topicLabel: string; placeholder: string; button: string }> = {
  worksheet: { title: "Worksheet Designer", intro: "Printable practice worksheets with an answer key.", topicLabel: "Topic", placeholder: "e.g. Fractions: adding unlike denominators", button: "Design worksheet" },
  slides: { title: "Presentation Slides", intro: "Ready-to-teach slides with speaker notes. Download as PowerPoint.", topicLabel: "Topic", placeholder: "e.g. Photosynthesis", button: "Create slides" },
  rubric: { title: "Rubric Generator", intro: "Clear, weighted marking rubrics for essays, projects and presentations.", topicLabel: "Assignment", placeholder: "e.g. 2,000-word argumentative essay on climate policy", button: "Generate rubric" },
  video: { title: "Animated Video Maker", intro: "Describe your lesson. Teazy plans the scenes and narration, then animates a narrated video for you.", topicLabel: "What should the video teach?", placeholder: "e.g. The water cycle for Primary 4", button: "Plan my video" },
};

const URL_ = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-resource`;
const IMG_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slide-images`;
const OCR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-handwriting`;
const MAX_IMAGES = 8;

const toB64 = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result).split(",")[1] || "");
  r.onerror = rej; r.readAsDataURL(f);
});

export default function ResourceToolPage({ type, audience = "k12" }: { type: ToolType; audience?: "k12" | "higher-ed" }) {
  const m = META[type];
  const { user } = useAuth();
  const { openGate } = useAuthGate();
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesName, setNotesName] = useState("");
  const [reading, setReading] = useState(false);
  const [images, setImages] = useState<(string | null)[]>([]);
  const [imgBusy, setImgBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const headers = async () => {
    const { data: s } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: `Bearer ${s.session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY };
  };

  const readNotes = async (f: File) => {
    if (!user) return openGate("lesson");
    setReading(true);
    try {
      let text = "";
      const name = f.name.toLowerCase();
      if (f.type.startsWith("text/") || name.endsWith(".md") || name.endsWith(".txt")) text = await f.text();
      else if (name.endsWith(".docx")) {
        const mammoth = await import("mammoth");
        text = (await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })).value;
      } else if (f.type === "application/pdf" || f.type.startsWith("image/")) {
        if (f.size > 8 * 1024 * 1024) throw new Error("File is too large (max 8 MB).");
        const r = await fetch(OCR_URL, { method: "POST", headers: await headers(), body: JSON.stringify({ imageBase64: await toB64(f), mimeType: f.type }) });
        text = await readOcrResponse(r);
      } else throw new Error("Use a Word (.docx), PDF, text file or photo.");
      if (!text.trim()) throw new Error("No text found in that file.");
      setNotes(text.slice(0, 40000)); setNotesName(f.name);
      toast({ title: "Notes added", description: f.name });
    } catch (e: any) {
      toast({ title: "Could not read notes", description: e.message, variant: "destructive" });
    } finally { setReading(false); }
  };

  const makeImages = async (d: any) => {
    const prompts = d.slides.slice(0, MAX_IMAGES).map((s: any) => (s.imagePrompt || s.title).slice(0, 600));
    if (!prompts.length) return;
    setImgBusy(true);
    try {
      const r = await fetch(IMG_URL, { method: "POST", headers: await headers(), body: JSON.stringify({ prompts, topic: d.title.slice(0, 300) }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Image generation failed.");
      setImages(j.images || []);
    } catch (e: any) {
      toast({ title: "Slides ready, but pictures failed", description: e.message, variant: "destructive" });
    } finally { setImgBusy(false); }
  };

  const run = async () => {
    if (!user) return openGate("lesson");
    if (!topic.trim()) return;
    setBusy(true); setData(null); setImages([]);
    try {
      const r = await fetch(URL_, {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({ type, audience, topic, subject, level, details, ...(type === "slides" && notes ? { notes } : {}) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Generation failed.");
      setData(j);
      if (type === "slides") makeImages(j);
    } catch (e: any) {
      toast({ title: "Could not generate", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const downloadPptx = async () => {
    const PptxGenJS = (await import("pptxgenjs")).default;
    const p = new PptxGenJS();
    p.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
    const BLUE = "1E3A8A", ORANGE = "C2410C", NUDE = "F3E4D7", INK = "1F2937";
    const t = p.addSlide();
    t.background = { color: BLUE };
    t.addShape("rect", { x: 0, y: 6.9, w: 13.33, h: 0.6, fill: { color: ORANGE } });
    t.addShape("rect", { x: 0.8, y: 2.2, w: 0.15, h: 2.2, fill: { color: ORANGE } });
    if (images[0]) t.addImage({ data: images[0], x: 7.4, y: 1.2, w: 5.4, h: 3.6, rounding: false });
    t.addText(data.title, { x: 1.1, y: 2.0, w: images[0] ? 6 : 11, h: 1.8, fontSize: 40, bold: true, color: "FFFFFF", fontFace: "Georgia", valign: "top" });
    if (data.subtitle) t.addText(data.subtitle, { x: 1.1, y: 3.8, w: images[0] ? 6 : 11, h: 0.8, fontSize: 18, color: NUDE });
    data.slides.forEach((s: any, i: number) => {
      const sl = p.addSlide();
      sl.background = { color: "FFFFFF" };
      sl.addShape("rect", { x: 0, y: 0, w: 13.33, h: 1.25, fill: { color: BLUE } });
      sl.addShape("rect", { x: 0, y: 1.25, w: 13.33, h: 0.08, fill: { color: ORANGE } });
      sl.addText(s.title, { x: 0.6, y: 0.15, w: 12, h: 0.95, fontSize: 28, bold: true, color: "FFFFFF", fontFace: "Georgia" });
      const img = images[i];
      sl.addText(s.bullets.map((b: string) => ({ text: b, options: { bullet: { code: "25A0" }, paraSpaceAfter: 10 } })),
        { x: 0.6, y: 1.7, w: img ? 6.4 : 12, h: 5, fontSize: 20, color: INK, valign: "top" });
      if (img) {
        sl.addShape("rect", { x: 7.35, y: 1.75, w: 5.5, h: 3.9, fill: { color: NUDE } });
        sl.addImage({ data: img, x: 7.5, y: 1.9, w: 5.2, h: 3.6 });
      }
      sl.addText(`${i + 1}`, { x: 12.3, y: 6.9, w: 0.6, h: 0.4, fontSize: 12, color: ORANGE, align: "right" });
      if (s.notes) sl.addNotes(s.notes);
    });
    await p.writeFile({ fileName: `${data.title.slice(0, 60)}.pptx` });
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Copied" }); };

  return (
    <div className="max-w-4xl mx-auto">
      <Helmet><title>{m.title} | Teazy AI</title></Helmet>
      <h1 className="text-2xl font-bold text-navy font-heading">{m.title}</h1>
      <p className="text-muted-foreground mt-1">{m.intro}</p>

      <div className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-5 print:hidden">
        <div><Label>{m.topicLabel}</Label><Input value={topic} maxLength={300} onChange={(e) => setTopic(e.target.value)} placeholder={m.placeholder} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>{audience === "higher-ed" ? "Course" : "Subject"}</Label><Input value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} placeholder={audience === "higher-ed" ? "e.g. PHY 302" : "e.g. Mathematics"} /></div>
          <div><Label>{audience === "higher-ed" ? "Level" : "Class"}</Label><Input value={level} maxLength={120} onChange={(e) => setLevel(e.target.value)} placeholder={audience === "higher-ed" ? "e.g. 300 level" : "e.g. JSS 2"} /></div>
        </div>
        {type === "slides" && (
          <div className="rounded-lg border border-dashed border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Label>Your notes (optional)</Label>
                <p className="text-xs text-muted-foreground">Upload lesson or lecture notes (Word, PDF, text or photo) and the slides will be built from them.</p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={reading} onClick={() => fileRef.current?.click()}>
                {reading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}{reading ? "Reading..." : "Upload notes"}
              </Button>
              <input ref={fileRef} type="file" className="hidden" accept=".docx,.pdf,.txt,.md,image/*,text/plain,application/pdf"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) readNotes(f); e.target.value = ""; }} />
            </div>
            {notes && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{notesName} ({notes.length.toLocaleString()} characters)</span>
                  <button type="button" className="underline" onClick={() => { setNotes(""); setNotesName(""); }}>Remove</button>
                </div>
                <Textarea className="mt-1" rows={4} value={notes} maxLength={40000} onChange={(e) => setNotes(e.target.value)} />
              </div>
            )}
          </div>
        )}
        <div><Label>Extra details (optional)</Label><Textarea value={details} maxLength={3000} onChange={(e) => setDetails(e.target.value)} rows={3} /></div>
        <Button onClick={run} disabled={busy || reading || !topic.trim()}>{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Working...</> : m.button}</Button>
      </div>

      {data && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <h2 className="text-xl font-bold text-navy">{data.title}</h2>
            <div className="flex gap-2">
              {type === "slides" && <Button onClick={downloadPptx} disabled={imgBusy}>{imgBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding pictures...</> : "Download PowerPoint"}</Button>}
              {type === "worksheet" && <Button variant="outline" onClick={() => setShowAnswers((v) => !v)}>{showAnswers ? "Hide answers" : "Show answers"}</Button>}
              {(type === "worksheet" || type === "rubric") && <Button variant="outline" onClick={() => window.print()}>Print</Button>}
            </div>
          </div>
          <h2 className="hidden print:block text-xl font-bold">{data.title}</h2>

          {type === "worksheet" && (
            <div className="mt-4 space-y-5">
              <p className="italic">{data.instructions}</p>
              {data.sections.map((sec: any, i: number) => (
                <div key={i}>
                  <h3 className="font-semibold text-navy">{sec.heading}</h3>
                  <ol className="list-decimal pl-6 mt-2 space-y-2">
                    {sec.questions.map((q: any, j: number) => (
                      <li key={j}>{q.question}{showAnswers && <div className="text-sm text-success">Answer: {q.answer}</div>}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}

          {type === "slides" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {data.slides.map((s: any, i: number) => (
                <div key={i} className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                  <div className="bg-primary px-4 py-2 border-b-4 border-accent">
                    <div className="text-[10px] uppercase tracking-wide text-primary-foreground/70">Slide {i + 1}</div>
                    <div className="font-semibold text-primary-foreground leading-snug">{s.title}</div>
                  </div>
                  {i < MAX_IMAGES && (
                    <div className="aspect-[3/2] bg-secondary/40">
                      {images[i] ? <img src={images[i]!} alt={s.title} className="h-full w-full object-cover" loading="lazy" />
                        : imgBusy ? <div className="flex h-full items-center justify-center text-xs text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Drawing picture...</div> : null}
                    </div>
                  )}
                  <ul className="list-disc pl-8 pr-4 py-3 text-sm space-y-1">{s.bullets.map((b: string, j: number) => <li key={j}>{b}</li>)}</ul>
                </div>
              ))}
            </div>
          )}

          {type === "rubric" && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border border-border">
                <thead><tr className="bg-secondary/50"><th className="p-2 text-left">Criterion</th>{data.levels.map((l: string) => <th key={l} className="p-2 text-left">{l}</th>)}</tr></thead>
                <tbody>{data.criteria.map((c: any, i: number) => (
                  <tr key={i} className="border-t border-border align-top">
                    <td className="p-2 font-medium">{c.name}<div className="text-xs text-muted-foreground">{c.weight}%</div></td>
                    {c.descriptors.map((d: string, j: number) => <td key={j} className="p-2">{d}</td>)}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {type === "video" && <div className="mt-4"><VideoMaker key={data.title} title={data.title} scenes={data.scenes} /></div>}
        </div>
      )}
    </div>
  );
}
