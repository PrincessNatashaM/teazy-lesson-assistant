import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Check, Loader2 } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8, "Use at least 8 characters — avoid common passwords").max(72),
  displayName: z.string().max(100).optional(),
});

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

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const n = sessionStorage.getItem("auth_notice");
    if (n) { setNotice(n); sessionStorage.removeItem("auth_notice"); }
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();

  const next = params.get("next") || "/app";

  const pwChecks = useMemo(() => checkPassword(password), [password]);
  const pwScore = scoreOf(pwChecks);

  // Clear the confirmation field when switching modes
  useEffect(() => {
    setConfirm("");
  }, [mode]);

  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, navigate, next]);

  const switchMode = (m: "signin" | "signup") => {
    setMode(m);
    setPassword("");
    setConfirm("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, displayName });
    if (!parsed.success) {
      toast({
        title: "Invalid input",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }
    if (mode === "signup") {
      if (pwScore < 5) return toast({ title: "Password does not meet all requirements", variant: "destructive" });
      if (password !== confirm) return toast({ title: "Passwords do not match", variant: "destructive" });
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${next}`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        // Auto-confirm is on, so try signing in immediately to get a session
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        toast({ title: "Welcome!", description: "Account created." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Signed in" });
      }
    } catch (err: any) {
      toast({ title: "Authentication failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{mode === "signin" ? "Sign in" : "Create account"} | Teazy AI</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-navy font-heading text-center">
            {mode === "signin" ? "Sign in to Teazy AI" : "Create your Teazy AI account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            {mode === "signin"
              ? "Sign in to access Pro features, downloads and unlocks."
              : "Free to start. Upgrade anytime for unlimited downloads."}
          </p>
          {notice && (
            <div className="mt-4 rounded-md bg-accent/10 border border-accent/30 text-accent-foreground/90 px-3 py-2 text-sm text-center">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Display name (optional)</Label>
                <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={8}
              />
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground">
                  Avoid common passwords (e.g. "password", "12345678") — they'll be rejected.
                </p>
              )}
            </div>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="pw2">Confirm Password</Label>
                <Input
                  id="pw2"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
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

            <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-11">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {mode === "signin" ? (
              <button onClick={() => switchMode("signup")} className="text-primary underline">
                New here? Create an account
              </button>
            ) : (
              <button onClick={() => switchMode("signin")} className="text-primary underline">
                Already have an account? Sign in
              </button>
            )}
          </div>
          <div className="mt-4 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:underline">← Back to home</Link>
          </div>
        </div>
      </div>
    </>
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
