import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Download, CheckCircle } from "lucide-react";
import { useState } from "react";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaywallModal({ open, onClose, onSuccess }: PaywallModalProps) {
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const handlePay = async () => {
    setProcessing(true);
    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 2000));
    setProcessing(false);
    setDone(true);
    setTimeout(() => {
      onSuccess();
      setDone(false);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-heading">
            <Lock className="h-5 w-5" />
            Unlock PDF Download
          </DialogTitle>
          <DialogDescription>
            Download your detailed lesson note as a professionally formatted PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">PDF Lesson Note</span>
              <span className="font-bold text-primary text-lg">$1 / ₦500</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Full detailed lesson note</li>
              <li>✓ Print-ready formatting</li>
              <li>✓ Includes all sections & board work</li>
            </ul>
          </div>

          {done ? (
            <Button disabled className="w-full bg-green-600 text-white">
              <CheckCircle className="mr-2 h-4 w-4" />
              Payment Successful!
            </Button>
          ) : (
            <Button
              onClick={handlePay}
              disabled={processing}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base font-semibold"
            >
              {processing ? (
                <>Processing...</>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Pay & Download PDF
                </>
              )}
            </Button>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Secure payment powered by Teazy Tech
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
