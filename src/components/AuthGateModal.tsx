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
const phoneSchema = z.string().min(6).max(30);
const nameSchema = z.string().trim().min(2).max(100);

export default function AuthGateModal({ open, onClose, feature }: Props) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const copy = COPY[feature];
  const pwChecks = useMemo(() => checkPassword(password), [password]);
  const pwScore = scoreOf(pwChecks);

  useEffect(() => {
    if (!open) {
      setPassword("");
    }
  }, [open]);

  const handleGoogle = async () => {
    setOauthLoading(true);
    try {
      // Preserve the full current URL so the user returns to the exact page
      // they were on after the Google round-trip. Uses Supabase's standard
      // OAuth flow — works on any host (Lovable, Render, custom domains) and
      // does not depend on the Lovable-only /~oauth/initiate proxy.
      const returnUrl = window.location.origin + window.location.pathname + window.location.search;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: returnUrl },
      });
      if (error) {
        toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
        setOauthLoading(false);
        return;
      }
      // Browser will now redirect to Google; nothing else to do here.
    } catch (err: any) {
      toast({ title: "Google sign-in failed", description: err?.message ?? "Try again", variant: "destructive" });
      setOauthLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (mode === "signup") {
      if (!nameSchema.safeParse(fullName).success) return toast({ title: "Enter your full name", variant: "destructive" });
      if (!emailSchema.safeParse(email).success) return toast({ title: "Enter a valid email", variant: "destructive" });
      if (!phoneSchema.safeParse(phone).success) return toast({ title: "Enter a valid phone number", variant: "destructive" });
      if (pwScore < 5) return toast({ title: "Password does not meet all requirements", variant: "destructive" });
    } else {
      if (!emailSchema.safeParse(email).success) return toast({ title: "Enter a valid email", variant: "destructive" });
      if (!password) return toast({ title: "Enter your password", variant: "destructive" });
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: fullName,
              full_name: fullName,
              phone,
            },
          },
        });
        if (error) throw error;
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        // Best-effort: update profiles with name/phone
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("profiles").update({
              display_name: fullName,
              full_name: fullName,
              phone,
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

        <Button
          type="button"
          onClick={handleGoogle}
          disabled={oauthLoading || loading}
          variant="outline"
          className="w-full h-11 border-border bg-white text-foreground hover:bg-muted/60 font-medium"
        >
          {oauthLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <GoogleIcon />
              <span className="ml-2">Continue with Google</span>
            </>
          )}
        </Button>

        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          {mode === "signup" && (
            <div className="space-y-1">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="pw">Password</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </div>

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
            disabled={loading || oauthLoading}
            className="w-full h-11 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
