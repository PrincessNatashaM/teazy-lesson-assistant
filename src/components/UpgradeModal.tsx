import { Link } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Crown } from "lucide-react";

export type UpgradeFeature = "lesson" | "quiz" | "writing";

interface Props {
  open: boolean;
  onClose: () => void;
  feature: UpgradeFeature;
}

const COPY: Record<UpgradeFeature, { title: string; blurb: string }> = {
  lesson: {
    title: "You've reached your free monthly Lesson Note limit.",
    blurb: "Free plans include 10 lesson notes per month. Upgrade to Teazy AI Pro to keep going.",
  },
  quiz: {
    title: "You've reached your free monthly Quiz limit.",
    blurb: "Free plans include 10 quizzes per month. Upgrade to Teazy AI Pro to generate more.",
  },
  writing: {
    title: "You've reached your free monthly Writing Assessment limit.",
    blurb: "Free plans include 2 assessment uploads per month. Upgrade to keep marking scripts.",
  },
};

const PRO_PERKS = [
  "Unlimited lesson notes",
  "Unlimited quiz generation",
  "Free Word downloads",
  "Free PDF downloads",
  "Priority AI responses",
];

export default function UpgradeModal({ open, onClose, feature }: Props) {
  const copy = COPY[feature];
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Crown className="h-6 w-6" />
          </div>
          <DialogTitle className="text-navy font-heading text-xl text-center">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {copy.blurb}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-navy">Teazy AI Pro includes:</p>
          <ul className="mt-2 space-y-1.5">
            {PRO_PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 text-accent shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-11">
            Maybe later
          </Button>
          <Button asChild className="flex-1 h-11 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/pricing" onClick={onClose}>Upgrade to Pro</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
