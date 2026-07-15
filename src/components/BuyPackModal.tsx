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
  PACK_PRICES, PACK_UPLOADS, resolveDisplayCurrency, paystackChannelsFor, gatewayFor,
  type DisplayCurrency, type PackId,
} from "@/lib/pricing";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BuyPackModal({ open, onClose, onSuccess }: Props) {
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

  const price = PACK_PRICES[pack][country];

  const handlePay = async () => {
    if (!user) return;
    setPaying(true);
    try {
      const gateway = gatewayFor(country);
      const initFn = gateway === "flutterwave" ? "flutterwave-initialize" : "paystack-initialize";
      const verifyFn = gateway === "flutterwave" ? "flutterwave-verify" : "paystack-verify";

      const { data: init, error } = await supabase.functions.invoke(initFn, {
        body: { purpose: pack, display_currency: country, redirect_url: window.location.href },
      });
      if (error || !init) throw new Error(error?.message || "Could not start payment");
      if (!init.public_key) throw new Error("Payment gateway not configured.");

      const onVerified = (v: any, vErr: any) => {
        setPaying(false);
        if (vErr || !v?.success) {
          toast({ title: "Verification failed", description: vErr?.message || "Contact support.", variant: "destructive" });
          return;
        }
        toast({ title: "Uploads added 🎉", description: `${PACK_UPLOADS[pack]} extra uploads added to your account.` });
        onSuccess?.();
        onClose();
      };

      if (gateway === "flutterwave") {
        const FlutterwaveCheckout = await loadFlutterwave();
        FlutterwaveCheckout({
          public_key: init.public_key,
          tx_ref: init.reference,
          amount: init.amount_minor / 100,
          currency: init.currency,
          payment_options: flutterwavePaymentOptionsFor(country),
          customer: { email: user.email, name: user.user_metadata?.display_name || user.email },
          customizations: { title: "Teazy AI", description: `${PACK_UPLOADS[pack]} assessment uploads` },
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
          <DialogTitle className="text-center text-xl">Buy Writing Assessment uploads</DialogTitle>
          <DialogDescription className="text-center">
            Extra uploads never expire and are used after your monthly allowance is exhausted.
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
          </div>

          <Button
            onClick={handlePay}
            disabled={paying || !user}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-semibold"
          >
            {paying ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
            ) : (
              `Buy ${PACK_UPLOADS[pack]} uploads · ${price.display}`
            )}
          </Button>

          <Button asChild variant="ghost" className="w-full text-xs">
            <Link to="/pricing" onClick={onClose}>Or upgrade to Assessment Pro for unlimited →</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
