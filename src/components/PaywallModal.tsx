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
import { Lock, Sparkles, Loader2, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { loadPaystack } from "@/lib/paystack";
import {
  UNLOCK_PRICES,
  PRO_PRICES,
  detectCurrency,
  formatMinor,
  type DisplayCurrency,
} from "@/lib/pricing";
import type { EntitlementKind } from "@/hooks/useEntitlements";

type Purpose = EntitlementKind | "subscription";

interface Props {
  open: boolean;
  onClose: () => void;
  purpose: Purpose;
  lessonHash?: string | null;
  onSuccess?: () => void;
}

const HEADLINES: Record<Purpose, { title: string; message: string }> = {
  download_pdf: {
    title: "Unlock PDF Download",
    message: "Payment unlocks PDF export for the current lesson note.",
  },
  download_docx: {
    title: "Unlock Word Download",
    message: "Payment unlocks Word export for the current lesson note.",
  },
  edit_unlock: {
    title: "Unlock Editing",
    message: "Editing lesson notes requires a Teazy AI pass or active subscription.",
  },
  subscription: {
    title: "Upgrade to Pro",
    message: "Unlimited editing, PDF and Word downloads, and assessment marking.",
  },
};

export default function PaywallModal({ open, onClose, purpose: initialPurpose, lessonHash, onSuccess }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [purpose, setPurpose] = useState<Purpose>(initialPurpose);
  useEffect(() => { setPurpose(initialPurpose); }, [initialPurpose, open]);
  const [country, setCountry] = useState<DisplayCurrency>("NGN");
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

  const isSub = purpose === "subscription";
  const priceTable = isSub ? PRO_PRICES : UNLOCK_PRICES;
  const price = priceTable[country];
  const finalMinor = promoApplied ? promoApplied.adjusted_minor : price.chargeMinor;
  const headline = HEADLINES[purpose];

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    try {
      const { data, error } = await supabase.functions.invoke("validate-promo", {
        body: {
          code: promoCode.trim().toUpperCase(),
          purpose,
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
        toast({ title: "Promo code applied successfully.", description: data.message });
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
      // 1. Server initializes payment (computes price server-side, handles free promo)
      const { data: init, error } = await supabase.functions.invoke("paystack-initialize", {
        body: {
          purpose,
          lesson_hash: lessonHash ?? null,
          promo_code: promoApplied ? promoCode.trim().toUpperCase() : null,
          display_currency: country,
        },
      });
      if (error || !init) throw new Error(error?.message || "Could not start payment");

      // Free via promo — server already granted access
      if (init.granted_free) {
        toast({ title: "Access granted via promo code.", description: "" });
        onSuccess?.();
        onClose();
        return;
      }

      if (!init.public_key) {
        throw new Error("Paystack not configured. Contact support.");
      }

      // 2. Open Paystack popup
      const Paystack = await loadPaystack();
      const handler = Paystack.setup({
        key: init.public_key,
        email: user.email,
        amount: init.amount_minor,
        currency: init.currency,
        ref: init.reference,
        onClose: () => setPaying(false),
        callback: (response: any) => {
          // 3. Verify on server
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
              toast({ title: "Payment Successful 🎉", description: "Access unlocked." });
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
            {isSub ? <Sparkles className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <DialogTitle className="text-center text-xl">{headline.title}</DialogTitle>
          <DialogDescription className="text-center">{headline.message}</DialogDescription>
        </DialogHeader>

        {!user && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-center">
            <Link to={"/auth?next=" + encodeURIComponent(window.location.pathname)} className="text-primary font-medium underline">
              Sign in or create an account
            </Link>{" "}
            to purchase.
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label htmlFor="paywall-country" className="text-xs">Region</Label>
            <Select value={country} onValueChange={(v) => setCountry(v as DisplayCurrency)}>
              <SelectTrigger id="paywall-country"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NGN">Nigeria (NGN)</SelectItem>
                <SelectItem value="CFA">Ghana / West Africa (CFA)</SelectItem>
                <SelectItem value="KES">Kenya (KES)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {isSub ? "Pro Subscription" : "One-time unlock"}
            </div>
            <div className="mt-1 text-3xl font-extrabold text-navy font-heading">
              {promoApplied?.free
                ? "FREE"
                : promoApplied
                  ? formatMinor(promoApplied.adjusted_minor, price.chargeCurrency)
                  : price.display}
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
            <button
              onClick={() => setShowPromo(true)}
              className="text-sm text-primary underline w-full text-center"
            >
              Have a promo code?
            </button>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="promo">Enter Promo Code</Label>
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
            ) : promoApplied?.free ? (
              "Unlock with Promo Code"
            ) : isSub ? (
              `Subscribe for ${promoApplied ? formatMinor(finalMinor, price.chargeCurrency) : price.display}`
            ) : (
              `Pay ${promoApplied ? formatMinor(finalMinor, price.chargeCurrency) : price.display}`
            )}
          </Button>

          {!isSub && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setPromoApplied(null);
                setPromoCode("");
                setShowPromo(false);
                setPurpose("subscription");
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Or upgrade to Pro for unlimited access
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
