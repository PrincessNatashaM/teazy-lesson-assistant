import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import type { GateFeature } from "@/lib/pendingAction";

interface Props {
  open: boolean;
  onClose: () => void;
  feature: GateFeature;
}

const COPY: Record<GateFeature, { heading: string; description: string }> = {
  lesson: {
    heading: "Generate curriculum-aligned lesson notes in minutes.",
    description: "Sign in to generate, save and revisit your lesson notes anytime.",
  },
  quiz: {
    heading: "Create classroom-ready quizzes instantly.",
    description: "Sign in to generate, edit and save quizzes for future use.",
  },
  assessment: {
    heading: "Mark handwritten assessments with AI.",
    description: "Sign in to upload scripts, generate reports and track previous assessments.",
  },
  writing: {
    heading: "Assess creative writing with confidence.",
    description: "Sign in to upload handwritten essays, receive AI-powered feedback and save reports.",
  },
  workspace: {
    heading: "Your saved work lives here.",
    description: "Sign in to view lesson notes, quizzes and assessments you've saved.",
  },
  download: {
    heading: "Save your work to your device.",
    description: "Sign in to unlock PDF and Word downloads for your lessons and reports.",
  },
};

interface PwChecks {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  special: boolean;
}

function checkPassword(pw: string): PwChecks {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

function scoreOf(c: PwChecks) {
  return Number(c.length) + Number(c.upper) + Number(c.lower) + Number(c.number) + Number(c.special);
}

const STRENGTH_LABEL = ["Weak", "Weak", "Fair", "Good", "Strong", "Strong"] as const;
const STRENGTH_COLOR = [
  "bg-destructive", "bg-destructive", "bg-orange-400",
  "bg-yellow-400", "bg-emerald-500", "bg-emerald-600",
];

const emailSchema = z.string().email().max(255);
const nameSchema = z.string().trim().min(2).max(100);

export default function AuthGateModal({ open, onClose, feature }: Props) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const copy = COPY[feature];
  const pwChecks = useMemo(() => checkPassword(password), [password]);
  const pwScore = scoreOf(pwChecks);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setConfirm("");
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (mode === "signup") {
      if (!nameSchema.safeParse(fullName).success) return toast({ title: "Enter your full name", variant: "destructive" });
      if (!emailSchema.safeParse(email).success) return toast({ title: "Enter a valid email", variant: "destructive" });
      if (pwScore < 5) return toast({ title: "Password does not meet all requirements", variant: "destructive" });
      if (password !== confirm) return toast({ title: "Passwords do not match", variant: "destructive" });
    } else {
      if (!emailSchema.safeParse(email).success) return toast({ title: "Enter a valid email", variant: "destructive" });
      if (!password) return toast({ title: "Enter your password", variant: "destructive" });
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data: su, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: fullName,
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        if (!su.session) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) {
            if (/confirm/i.test(signInErr.message)) {
              toast({ title: "Check your email", description: "Confirm your email address, then sign in." });
              setMode("signin");
              return;
            }
            throw signInErr;
          }
        }
        // Best-effort: update profiles with name/phone
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("profiles").update({
              display_name: fullName,
              full_name: fullName,
            } as any).eq("id", user.id);
          }
        } catch {}
        toast({ title: "Welcome to Teazy AI" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Signed in" });
      }
      onClose();
    } catch (err: any) {
      toast({ title: mode === "signup" ? "Sign-up failed" : "Sign-in failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-navy font-heading text-xl">{copy.heading}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="fullName">Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pw">Password</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </div>
          {mode === "signup" && (
            <div className="space-y-1">
              <Label htmlFor="pw2">Confirm Password</Label>
              <Input id="pw2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
          )}

          {mode === "signup" && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-5 gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-1.5 rounded ${i < pwScore ? STRENGTH_COLOR[pwScore] : "bg-muted"}`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Strength: <span className="font-medium text-foreground">{STRENGTH_LABEL[pwScore]}</span>
              </p>
              <ul className="text-xs space-y-0.5">
                <PwRule ok={pwChecks.length} label="At least 8 characters" />
                <PwRule ok={pwChecks.upper} label="One uppercase letter" />
                <PwRule ok={pwChecks.lower} label="One lowercase letter" />
                <PwRule ok={pwChecks.number} label="One number" />
                <PwRule ok={pwChecks.special} label="One special character" />
              </ul>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? "Create Account" : "Sign In"}
          </Button>
        </form>

        {mode === "signin" ? (
          <div className="pt-1">
            <div className="text-center text-sm text-muted-foreground mb-2">New to Teazy AI?</div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode("signup")}
              className="w-full h-11 border-2 border-primary text-primary hover:bg-primary/5 font-semibold text-base"
            >
              Create an account
            </Button>
          </div>
        ) : (
          <div className="text-center text-sm">
            Already have an account?{" "}
            <button type="button" onClick={() => setMode("signin")} className="text-primary font-semibold underline">
              Sign In
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PwRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? "text-emerald-600" : "text-muted-foreground"}`}>
      <Check className={`h-3.5 w-3.5 ${ok ? "opacity-100" : "opacity-40"}`} />
      {label}
    </li>
  );
}
