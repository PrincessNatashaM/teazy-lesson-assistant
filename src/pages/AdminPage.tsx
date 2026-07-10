import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";

interface PromoCode {
  id: string;
  code: string;
  kind: string;
  value: number;
  currency: string | null;
  applies_to: string[];
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
}

const KINDS = [
  { value: "free_access", label: "Free Access (bypass payment)" },
  { value: "percent_off", label: "Percent Off" },
  { value: "fixed_off", label: "Fixed Amount Off (minor units)" },
  { value: "bonus_assessments", label: "Bonus Assessment Credits" },
  { value: "pro_days", label: "Free Pro Days" },
];

const PURPOSES = ["sub_standard", "sub_pro", "assessment_pack_5", "assessment_pack_10", "assessment_pack_30", "download_pdf", "download_docx", "edit_unlock", "subscription", "assessment_pack_6", "assessment_pack_11"];

export default function AdminPage() {
  const { user, isAdmin, roleLoading } = useAuth();
  const { toast } = useToast();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [form, setForm] = useState({
    code: "",
    kind: "free_access",
    value: 0,
    currency: "NGN",
    applies_to: [...PURPOSES],
    max_uses: "",
    expires_at: "",
  });

  const load = async () => {
    const { data } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    setCodes((data as any) || []);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (roleLoading) return null;
  if (!user) return <Navigate to="/auth?next=/admin" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const togglePurpose = (p: string) => {
    setForm((f) => ({
      ...f,
      applies_to: f.applies_to.includes(p)
        ? f.applies_to.filter((x) => x !== p)
        : [...f.applies_to, p],
    }));
  };

  const create = async () => {
    if (!form.code.trim()) return;
    const { error } = await supabase.from("promo_codes" as any).insert({
      code: form.code.trim().toUpperCase(),
      kind: form.kind,
      value: form.value,
      currency: form.kind === "fixed_off" ? form.currency : null,
      applies_to: form.applies_to,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
      active: true,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Promo code created" });
    setForm({ ...form, code: "", value: 0, max_uses: "", expires_at: "" });
    load();
  };

  const toggleActive = async (c: PromoCode) => {
    await supabase.from("promo_codes" as any).update({ active: !c.active }).eq("id", c.id);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this code?")) return;
    await supabase.from("promo_codes" as any).delete().eq("id", id);
    load();
  };

  return (
    <>
      <Helmet><title>Admin | Teazy AI</title><meta name="robots" content="noindex" /></Helmet>
      <div className="container mx-auto max-w-5xl px-4 py-10 space-y-6">
        <h1 className="text-3xl font-bold text-navy font-heading">Admin · Promo Codes</h1>

        {/* Create form */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">Create new code</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="TEAZYVIP" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value {form.kind === "percent_off" && "(%)"} {form.kind === "fixed_off" && "(minor units, e.g. 50000 = ₦500)"} {form.kind === "bonus_assessments" && "(credits)"} {form.kind === "pro_days" && "(days)"}</Label>
              <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} disabled={form.kind === "free_access"} />
            </div>
            {form.kind === "fixed_off" && (
              <div>
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGN">NGN</SelectItem>
                    <SelectItem value="KES">KES</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Max uses (blank = unlimited)</Label>
              <Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
            </div>
            <div>
              <Label>Expires (blank = never)</Label>
              <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Applies to</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {PURPOSES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePurpose(p)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${
                    form.applies_to.includes(p)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={create}><Plus className="mr-2 h-4 w-4" /> Create code</Button>
        </section>

        {/* List */}
        <section className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-semibold text-lg mb-4">Existing codes</h2>
          <div className="space-y-2">
            {codes.length === 0 && <p className="text-sm text-muted-foreground">No codes yet.</p>}
            {codes.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <div className="font-mono font-bold">{c.code}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.kind} · value {c.value} · used {c.used_count}/{c.max_uses ?? "∞"}
                    {c.expires_at && ` · expires ${new Date(c.expires_at).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Button size="sm" variant="outline" onClick={() => toggleActive(c)}>
                    {c.active ? "Disable" : "Enable"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
