import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { loadPaystack } from "@/lib/paystack";
import { loadFlutterwave, flutterwavePaymentOptionsFor } from "@/lib/flutterwave";
import {
  PACK_PRICES, PACK_UPLOADS, VIDEO_PACK_PRICES, resolveDisplayCurrency, paystackChannelsFor, gatewayFor,
  type DisplayCurrency, type PackId,
} from "@/lib/pricing";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** "video" sells one extra video (4 clips of 8 seconds) instead of assessment uploads. */
  kind?: "assessment" | "video";
}

export default function BuyPackModal({ open, onClose, onSuccess, kind = "assessment" }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [country, setCountry] = useState<DisplayCurrency>("NGN");
  const [pack, setPack] = useState<PackId>("assessment_pack_10");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    supabase.from("profiles").select("country").eq("id", user.id).maybeSingle().then(({ data }) => {
      setCountry(resolveDisplayCurrency({ profileCountry: data?.country }));
    });
  }, [open, user]);

  const isVideo = kind === "video";
  const purpose = isVideo ? "video_pack_4" : pack;
  const price = isVideo ? VIDEO_PACK_PRICES[country] : PACK_PRICES[pack][country];
  const what = isVideo ? "1 extra video (4 clips of 8 seconds)" : `${PACK_UPLOADS[pack]} assessment uploads`;

  const handlePay = async () => {
    if (!user) return;
    setPaying(true);
    try {
      const gateway = gatewayFor(country);
      const initFn = gateway === "flutterwave" ? "flutterwave-initialize" : "paystack-initialize";
      const verifyFn = gateway === "flutterwave" ? "flutterwave-verify" : "paystack-verify";

      const { data: init, error } = await supabase.functions.invoke(initFn, {
        body: { purpose, display_currency: country, redirect_url: window.location.href },
      });
      if (error || !init) throw new Error(error?.message || "Could not start payment");
      if (!init.public_key) throw new Error("Payment gateway not configured.");

      const onVerified = (v: any, vErr: any) => {
        setPaying(false);
        if (vErr || !v?.success) {
          toast({ title: "Verification failed", description: vErr?.message || "Contact support.", variant: "destructive" });
          return;
        }
        toast({ title: "Purchase complete", description: `${what} added to your account.` });
        onSuccess?.();
        onClose();
      };

      // Close the Radix Dialog before opening gateway overlays — Radix's
      // pointer-events lock + focus trap block clicks on Paystack/Flutterwave
      // channel tabs (Card, Transfer, USSD, OPay, etc.) otherwise.
      onClose();
      requestAnimationFrame(() => {
        document.body.style.pointerEvents = "";
      });

      if (gateway === "flutterwave") {
        const FlutterwaveCheckout = await loadFlutterwave();
        FlutterwaveCheckout({
          public_key: init.public_key,
          tx_ref: init.reference,
          amount: init.amount_minor / 100,
          currency: init.currency,
          payment_options: flutterwavePaymentOptionsFor(country),
          customer: { email: user.email, name: user.user_metadata?.display_name || user.email },
          customizations: { title: "Teazy AI", description: what },
          onclose: () => setPaying(false),
          callback: (response: any) => {
            supabase.functions
              .invoke(verifyFn, { body: { reference: init.reference, transaction_id: response?.transaction_id } })
              .then(({ data: v, error: vErr }) => onVerified(v, vErr));
          },
        });
        return;
      }

      const Paystack = await loadPaystack();
      const handler = Paystack.setup({
        key: init.public_key,
        email: user.email,
        amount: init.amount_minor,
        currency: init.currency,
        channels: paystackChannelsFor(country),
        ref: init.reference,
        onClose: () => setPaying(false),
        callback: (response: any) => {
          supabase.functions
            .invoke(verifyFn, { body: { reference: response.reference } })
            .then(({ data: v, error: vErr }) => onVerified(v, vErr));
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
            <Zap className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl">{isVideo ? "Buy an extra video" : "Buy Writing Assessment uploads"}</DialogTitle>
          <DialogDescription className="text-center">
            {isVideo
              ? `You have used this month's video allowance. Get 4 more 8-second clips for ${VIDEO_PACK_PRICES[country].display}.`
              : "Extra uploads never expire and are used after your monthly allowance is exhausted."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="pack-country" className="text-xs">Region</Label>
            <Select value={country} onValueChange={(v) => setCountry(v as DisplayCurrency)}>
              <SelectTrigger id="pack-country"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NGN">Nigeria (₦)</SelectItem>
                <SelectItem value="GHS">Ghana (GH₵)</SelectItem>
                <SelectItem value="KES">Kenya (KSh)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isVideo && <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(PACK_PRICES) as PackId[]).map((p) => (
              <button
                key={p}
                onClick={() => setPack(p)}
                className={`text-center rounded-lg border p-3 transition ${
                  pack === p ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
                }`}
              >
                <div className="text-xl font-extrabold text-navy">{PACK_UPLOADS[p]}</div>
                <div className="text-[11px] text-muted-foreground uppercase">uploads</div>
                <div className="mt-1 text-sm font-semibold">{PACK_PRICES[p][country].display}</div>
                {p === "assessment_pack_500" && (
                  <div className="mt-1 text-[10px] font-semibold text-accent">Best value</div>
                )}
              </button>
            ))}
          </div>}

          <Button
            onClick={handlePay}
            disabled={paying || !user}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-semibold"
          >
            {paying ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
            ) : (
              isVideo ? `Buy extra video · ${price.display}` : `Buy ${PACK_UPLOADS[pack]} uploads · ${price.display}`
            )}
          </Button>

          {!isVideo && <Button asChild variant="ghost" className="w-full text-xs">
            <Link to="/pricing" onClick={onClose}>Or upgrade to Assessment Pro: up to 1000 scripts a month</Link>
          </Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
