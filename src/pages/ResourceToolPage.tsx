import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuthGate } from "@/hooks/useAuthGate";

export type ToolType = "worksheet" | "slides" | "rubric" | "video";

const META: Record<ToolType, { title: string; intro: string; topicLabel: string; placeholder: string; button: string }> = {
  worksheet: { title: "Worksheet Designer", intro: "Printable practice worksheets with an answer key.", topicLabel: "Topic", placeholder: "e.g. Fractions: adding unlike denominators", button: "Design worksheet" },
  slides: { title: "Presentation Slides", intro: "Ready-to-teach slides with speaker notes. Download as PowerPoint.", topicLabel: "Topic", placeholder: "e.g. Photosynthesis", button: "Create slides" },
  rubric: { title: "Rubric Generator", intro: "Clear, weighted marking rubrics for essays, projects and presentations.", topicLabel: "Assignment", placeholder: "e.g. 2,000-word argumentative essay on climate policy", button: "Generate rubric" },
  video: { title: "Animated Video Maker", intro: "Describe your lesson. We write the scenes and narration, then give you ready-made prompts for Google Whisk and Google Flow.", topicLabel: "What should the video teach?", placeholder: "e.g. The water cycle for Primary 4", button: "Plan my video" },
};

const URL_ = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-resource`;

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

  const run = async () => {
    if (!user) return openGate("lesson");
    if (!topic.trim()) return;
    setBusy(true); setData(null);
    const { data: s } = await supabase.auth.getSession();
    try {
      const r = await fetch(URL_, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ type, audience, topic, subject, level, details }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Generation failed.");
      setData(j);
    } catch (e: any) {
      toast({ title: "Could not generate", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const downloadPptx = async () => {
    const PptxGenJS = (await import("pptxgenjs")).default;
    const p = new PptxGenJS();
    const t = p.addSlide();
    t.addText(data.title, { x: 0.5, y: 2, w: 9, h: 1.5, fontSize: 36, bold: true, color: "1E3A8A", align: "center" });
    for (const s of data.slides) {
      const sl = p.addSlide();
      sl.addText(s.title, { x: 0.5, y: 0.3, w: 9, h: 0.9, fontSize: 28, bold: true, color: "1E3A8A" });
      sl.addText(s.bullets.map((b: string) => ({ text: b, options: { bullet: true } })), { x: 0.6, y: 1.3, w: 8.8, h: 4, fontSize: 18 });
      if (s.notes) sl.addNotes(s.notes);
    }
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
        <div><Label>Extra details (optional)</Label><Textarea value={details} maxLength={3000} onChange={(e) => setDetails(e.target.value)} rows={3} /></div>
        <Button onClick={run} disabled={busy || !topic.trim()}>{busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Working...</> : m.button}</Button>
      </div>

      {data && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <h2 className="text-xl font-bold text-navy">{data.title}</h2>
            <div className="flex gap-2">
              {type === "slides" && <Button onClick={downloadPptx}>Download PowerPoint</Button>}
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {data.slides.map((s: any, i: number) => (
                <div key={i} className="rounded-lg border border-border p-4">
                  <div className="text-xs text-muted-foreground">Slide {i + 1}</div>
                  <div className="font-semibold text-navy">{s.title}</div>
                  <ul className="list-disc pl-5 mt-1 text-sm">{s.bullets.map((b: string, j: number) => <li key={j}>{b}</li>)}</ul>
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

          {type === "video" && (
            <div className="mt-4 space-y-4">
              <ol className="text-sm list-decimal pl-5 text-muted-foreground space-y-1">
                <li>Open Whisk, paste each picture prompt and save the images you like.</li>
                <li>Open Flow, add a picture, paste the matching clip prompt, and generate.</li>
                <li>Put the clips in order and record or paste the narration.</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline"><a href="https://labs.google/fx/tools/whisk" target="_blank" rel="noreferrer">Open Whisk</a></Button>
                <Button asChild variant="outline"><a href="https://labs.google/fx/tools/flow" target="_blank" rel="noreferrer">Open Flow</a></Button>
                <Button variant="outline" onClick={() => copy(data.scenes.map((s: any, i: number) => `Scene ${i + 1}: ${s.narration}`).join("\n"))}>Copy full narration</Button>
              </div>
              {data.scenes.map((s: any, i: number) => (
                <div key={i} className="rounded-lg border border-border p-4 space-y-2">
                  <div className="font-semibold text-navy">Scene {i + 1}</div>
                  <p className="text-sm"><span className="font-medium">Narration:</span> {s.narration}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => copy(s.imagePrompt)}>Copy picture prompt (Whisk)</Button>
                    <Button size="sm" variant="secondary" onClick={() => copy(s.videoPrompt)}>Copy clip prompt (Flow)</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
