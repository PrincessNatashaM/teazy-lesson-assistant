import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Scheme {
  id: string;
  name: string;
  subject: string | null;
  question_paper: string | null;
  marking_scheme: string;
}

interface Props {
  markingScheme: string;
  questionPaper?: string;
  subject?: string;
  onLoad: (s: { markingScheme: string; questionPaper?: string }) => void;
}

/** Save the current marking scheme under a name, or load a previously saved one. */
export default function SavedSchemePicker({ markingScheme, questionPaper, subject, onLoad }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_marking_schemes")
      .select("id,name,subject,question_paper,marking_scheme")
      .order("updated_at", { ascending: false });
    setSchemes((data as Scheme[]) || []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  if (!user) return null;

  const pick = (id: string) => {
    setSelected(id);
    const s = schemes.find((x) => x.id === id);
    if (!s) return;
    onLoad({ markingScheme: s.marking_scheme, questionPaper: s.question_paper || undefined });
    setName(s.name);
    toast({ title: "Marking scheme loaded", description: s.name });
  };

  const save = async () => {
    const n = name.trim().slice(0, 120);
    if (!n || !markingScheme.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("saved_marking_schemes").upsert(
      {
        user_id: user.id,
        name: n,
        subject: subject || null,
        marking_scheme: markingScheme.slice(0, 50000),
        question_paper: questionPaper?.trim() ? questionPaper.slice(0, 50000) : null,
      },
      { onConflict: "user_id,name" },
    );
    setSaving(false);
    if (error) { toast({ title: "Could not save", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Marking scheme saved", description: n });
    load();
  };

  const remove = async () => {
    if (!selected) return;
    await supabase.from("saved_marking_schemes").delete().eq("id", selected);
    setSelected("");
    load();
  };

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
      {schemes.length > 0 && (
        <div className="flex gap-2">
          <select
            aria-label="Use a saved marking scheme"
            className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={selected}
            onChange={(e) => pick(e.target.value)}
          >
            <option value="">Use a saved marking scheme...</option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.subject ? ` (${s.subject})` : ""}</option>
            ))}
          </select>
          {selected && <Button type="button" variant="ghost" size="sm" onClick={remove}>Delete</Button>}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          className="h-9"
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          placeholder='Name to save as, e.g. "Thermodynamics Mid-Semester 2026"'
        />
        <Button type="button" size="sm" onClick={save} disabled={saving || !name.trim() || !markingScheme.trim()}>
          {saving ? "Saving..." : "Save scheme"}
        </Button>
      </div>
    </div>
  );
}
