import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemTitle: string;
  onSave: () => Promise<void>;
  onDelete?: () => Promise<void> | void;
}

export default function SaveToWorkspaceDialog({ open, onOpenChange, itemTitle, onSave, onDelete }: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (saved || busy) return; // prevent duplicate saves
    setBusy("save");
    try {
      await onSave();
      setSaved(true);
      toast({ title: "Saved to My Workspace" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const del = async () => {
    if (busy) return;
    setBusy("delete");
    try {
      await onDelete?.();
      toast({ title: "Deleted" });
      onOpenChange(false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) { onOpenChange(o); if (!o) setSaved(false); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keep "{itemTitle.slice(0, 60)}"?</DialogTitle>
          <DialogDescription>
            Your download has started. Do you want to save this to your workspace or delete it?
            If you close this without choosing, it stays available for now.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <Button onClick={save} disabled={!!busy} className="flex-1">
            {busy === "save" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save to My Workspace
          </Button>
          {onDelete && (
            <Button variant="outline" onClick={del} disabled={!!busy} className="flex-1 text-destructive">
              {busy === "delete" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
