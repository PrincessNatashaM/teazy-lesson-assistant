import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Scene { narration: string; imagePrompt: string; videoPrompt: string }
type SceneState = { status: "waiting" | "working" | "completed" | "failed"; id?: string; url?: string; error?: string };

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-scene`;

async function call(body: object) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch(FN, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(body),
  });
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) };
}

export default function VideoMaker({ title, scenes }: { title: string; scenes: Scene[] }) {
  const [states, setStates] = useState<SceneState[]>([]);
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const statesRef = useRef<SceneState[]>([]);
  const update = (i: number, s: SceneState) => {
    statesRef.current = statesRef.current.map((x, j) => (j === i ? s : x));
    setStates(statesRef.current);
  };

  const start = async () => {
    setStarted(true);
    statesRef.current = scenes.map(() => ({ status: "waiting" }));
    setStates(statesRef.current);
    // Start scenes one after another; busy-service responses wait and try again a little later.
    for (let i = 0; i < scenes.length; i++) {
      for (let attempt = 0; attempt < 4; attempt++) {
        const r = await call({ action: "create", prompt: scenes[i].videoPrompt });
        if (r.ok) { update(i, { status: "working", id: r.json.id }); break; }
        if (!r.json.retryable || attempt === 3) { update(i, { status: "failed", error: r.json.error }); break; }
        await new Promise((res) => setTimeout(res, 15000 * (attempt + 1)));
      }
      if (statesRef.current[i].status === "failed" && /limit/i.test(statesRef.current[i].error || "")) {
        for (let k = i + 1; k < scenes.length; k++) update(k, { status: "failed", error: "Daily video limit reached." });
        break;
      }
    }
  };

  useEffect(() => {
    if (!started) return;
    const t = setInterval(async () => {
      const pending = statesRef.current.map((s, i) => [s, i] as const).filter(([s]) => s.status === "working" && s.id);
      for (const [s, i] of pending) {
        const r = await call({ action: "status", id: s.id });
        if (r.json.status === "completed") update(i, { ...s, status: "completed", url: r.json.url });
        else if (r.json.status === "failed") update(i, { ...s, status: "failed", error: r.json.error });
      }
    }, 8000);
    return () => clearInterval(t);
  }, [started]);

  const done = states.filter((s) => s.status === "completed").length;
  const finished = started && states.every((s) => s.status === "completed" || s.status === "failed");
  const playable = states.map((s, i) => ({ ...s, i })).filter((s) => s.url);

  const onEnded = () => {
    const idx = playable.findIndex((p) => p.i === current);
    if (idx >= 0 && idx < playable.length - 1) setCurrent(playable[idx + 1].i);
  };
  useEffect(() => { videoRef.current?.play().catch(() => {}); }, [current]);
  const currentUrl = states[current]?.url || playable[0]?.url;

  if (!started) {
    return (
      <div className="rounded-lg border border-accent/40 bg-secondary/40 p-4">
        <p className="text-sm">Your video has {scenes.length} scenes of about 8 seconds each, with narration, music and animation.</p>
        <Button className="mt-3 bg-accent text-accent-foreground hover:bg-accent/90" onClick={start}>Generate video</Button>
        <p className="text-xs text-muted-foreground mt-2">Takes a few minutes. Keep this page open.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">
        {finished ? `Ready: ${done} of ${scenes.length} scenes` : <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Making your video... {done} of {scenes.length} scenes ready</span>}
      </div>
      {currentUrl && (
        <video ref={videoRef} key={currentUrl} src={currentUrl} controls autoPlay onEnded={onEnded} className="w-full rounded-lg bg-foreground/90 aspect-video" />
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {scenes.map((sc, i) => {
          const s = states[i];
          return (
            <button key={i} type="button" disabled={!s?.url} onClick={() => setCurrent(i)}
              className={`text-left rounded-lg border p-3 text-sm ${current === i && s?.url ? "border-primary" : "border-border"}`}>
              <div className="flex justify-between font-semibold text-navy">
                <span>Scene {i + 1}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {s?.status === "completed" ? "Ready" : s?.status === "failed" ? "Not made" : s?.status === "working" ? "Animating..." : "Waiting"}
                </span>
              </div>
              <p className="mt-1">{sc.narration}</p>
              {s?.status === "failed" && <p className="text-xs text-destructive mt-1">{s.error}</p>}
              {s?.url && <a href={s.url} download={`${title.slice(0, 40)} scene ${i + 1}.mp4`} className="text-xs text-primary underline" onClick={(e) => e.stopPropagation()}>Download clip</a>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
