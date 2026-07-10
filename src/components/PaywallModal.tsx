import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Lock, Sparkles, Loader2, BadgeCheck, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { loadPaystack } from "@/lib/paystack";
import {
  STANDARD_PRICES,
  PRO_PRICES,
  resolveDisplayCurrency,
  paystackChannelsFor,
  formatMinor,
  type DisplayCurrency,
  type SubPurpose,
} from "@/lib/pricing";
import type { EntitlementKind } from "@/hooks/useEntitlements";

/** Legacy incoming purpose type — kept so existing callers still compile. */
type Purpose = EntitlementKind | "subscription";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Retained for backwards compatibility. All values now show subscription upsell. */
  purpose: Purpose;
  lessonHash?: string | null;
  onSuccess?: () => void;
}

const CONTEXT_COPY: Record<Purpose, { title: string; message: string }> = {
  download_pdf: {
    title: "Downloads are a paid feature",
    message: "Upgrade to Teazy AI Standard to unlock unlimited PDF and Word downloads.",
  },
  download_docx: {
    title: "Downloads are a paid feature",
    message: "Upgrade to Teazy AI Standard to unlock unlimited PDF and Word downloads.",
  },
  edit_unlock: {
    title: "Editing is a paid feature",
    message: "Upgrade to Teazy AI Standard to edit lesson notes and download in PDF or Word.",
  },
  subscription: {
    title: "Choose your plan",
    message: "Pick the plan that matches how often you teach and mark.",
  },
};

export default function PaywallModal({ open, onClose, purpose, onSuccess }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [country, setCountry] = useState<DisplayCurrency>("NGN");
  const [selected, setSelected] = useState<SubPurpose>("sub_standard");
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<{
    code_id: string;
    adjusted_minor: number;
    free: boolean;
    message: string;
  } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("profiles")
      .select("country")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.country) setCountry(detectCurrency(data.country));
      });
  }, [open, user]);

  useEffect(() => {
    // Reset promo state when switching plans
    setPromoApplied(null);
    setPromoCode("");
    setShowPromo(false);
  }, [selected]);

  const price = (selected === "sub_pro" ? PRO_PRICES : STANDARD_PRICES)[country];
  const finalMinor = promoApplied ? promoApplied.adjusted_minor : price.chargeMinor;
  const headline = CONTEXT_COPY[purpose];

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-promo", {
        body: {
          code: promoCode.trim().toUpperCase(),
          purpose: selected,
          amount_minor: price.chargeMinor,
          currency: price.chargeCurrency,
        },
      });
      if (error || !data?.valid) {
        toast({
          title: "Invalid code",
          description: data?.message || "This promo code can't be applied.",
          variant: "destructive",
        });
        setPromoApplied(null);
      } else {
        setPromoApplied({
          code_id: data.code_id,
          adjusted_minor: data.adjusted_minor,
          free: !!data.free,
          message: data.message,
        });
        toast({ title: "Promo applied", description: data.message });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setValidatingPromo(false);
    }
  };

  const handlePay = async () => {
    if (!user) {
      navigate("/auth?next=" + encodeURIComponent(window.location.pathname));
      return;
    }
    setPaying(true);
    try {
      const { data: init, error } = await supabase.functions.invoke("paystack-initialize", {
        body: {
          purpose: selected,
          promo_code: promoApplied ? promoCode.trim().toUpperCase() : null,
          display_currency: country,
        },
      });
      if (error || !init) throw new Error(error?.message || "Could not start payment");

      if (init.granted_free) {
        toast({ title: "Access granted via promo code." });
        onSuccess?.();
        onClose();
        return;
      }
      if (!init.public_key) throw new Error("Paystack not configured. Contact support.");

      const Paystack = await loadPaystack();
      const handler = Paystack.setup({
        key: init.public_key,
        email: user.email,
        amount: init.amount_minor,
        currency: init.currency,
        ref: init.reference,
        onClose: () => setPaying(false),
        callback: (response: any) => {
          supabase.functions
            .invoke("paystack-verify", { body: { reference: response.reference } })
            .then(({ data: verifyData, error: vErr }) => {
              setPaying(false);
              if (vErr || !verifyData?.success) {
                toast({
                  title: "Payment verification failed",
                  description: vErr?.message || "Please contact support.",
                  variant: "destructive",
                });
                return;
              }
              toast({ title: "Payment successful 🎉", description: "Your plan is now active." });
              onSuccess?.();
              onClose();
            });
        },
      });
      handler.openIframe();
    } catch (e: any) {
      setPaying(false);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-2">
            {purpose === "subscription" ? <Sparkles className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <DialogTitle className="text-center text-xl">{headline.title}</DialogTitle>
          <DialogDescription className="text-center">{headline.message}</DialogDescription>
        </DialogHeader>

        {!user && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-center">
            <Link to={"/auth?next=" + encodeURIComponent(window.location.pathname)} className="text-primary font-medium underline">
              Sign in or create an account
            </Link>{" "}
            to subscribe.
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label htmlFor="paywall-country" className="text-xs">Region</Label>
            <Select value={country} onValueChange={(v) => setCountry(v as DisplayCurrency)}>
              <SelectTrigger id="paywall-country"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NGN">Nigeria (₦)</SelectItem>
                <SelectItem value="CFA">Ghana / West Africa (CFA)</SelectItem>
                <SelectItem value="KES">Kenya (KSh)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelected("sub_standard")}
              className={`text-left rounded-lg border p-3 transition ${
                selected === "sub_standard" ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
              }`}
            >
              <div className="text-[11px] font-bold uppercase text-muted-foreground">Standard</div>
              <div className="mt-1 font-bold text-navy">{STANDARD_PRICES[country].display}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Unlimited notes & downloads · 40 assessments / month
              </div>
            </button>
            <button
              type="button"
              onClick={() => setSelected("sub_pro")}
              className={`text-left rounded-lg border p-3 transition relative ${
                selected === "sub_pro" ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
              }`}
            >
              <span className="absolute -top-2 right-2 text-[9px] font-bold bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                <Crown className="inline h-2.5 w-2.5 mr-0.5" /> PRO
              </span>
              <div className="text-[11px] font-bold uppercase text-muted-foreground">Assessment Pro</div>
              <div className="mt-1 font-bold text-navy">{PRO_PRICES[country].display}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Unlimited assessments · bulk marking · analytics
              </div>
            </button>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {selected === "sub_pro" ? "Assessment Pro" : "Teazy AI Standard"} · monthly
            </div>
            <div className="mt-1 text-3xl font-extrabold text-navy font-heading">
              {promoApplied?.free ? "FREE" : formatMinor(finalMinor, price.chargeCurrency)}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </div>
            {promoApplied && !promoApplied.free && (
              <div className="text-xs text-muted-foreground mt-1 line-through">{price.display}</div>
            )}
            {promoApplied && (
              <div className="text-xs text-success mt-1 flex items-center justify-center gap-1">
                <BadgeCheck className="h-3 w-3" /> {promoApplied.message}
              </div>
            )}
          </div>

          {!showPromo ? (
            <button onClick={() => setShowPromo(true)} className="text-sm text-primary underline w-full text-center">
              Have a promo code?
            </button>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="promo">Enter promo code</Label>
              <div className="flex gap-2">
                <Input
                  id="promo"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="TEAZYVIP"
                  className="uppercase"
                />
                <Button onClick={applyPromo} disabled={validatingPromo || !promoCode.trim()} variant="outline">
                  {validatingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            </div>
          )}

          <Button
            onClick={handlePay}
            disabled={paying || !user}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-semibold"
          >
            {paying ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              `Subscribe · ${promoApplied?.free ? "FREE" : formatMinor(finalMinor, price.chargeCurrency)}`
            )}
          </Button>

          <Button asChild variant="ghost" className="w-full text-xs">
            <Link to="/pricing" onClick={onClose}>Compare all plans →</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
