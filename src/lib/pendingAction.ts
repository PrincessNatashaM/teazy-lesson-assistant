// Cross-navigation pending action storage.
// Used so that a user who is asked to sign in mid-flow returns to the
// exact feature (and form values) they were using.

export type GateFeature = "lesson" | "quiz" | "assessment" | "writing" | "workspace" | "download";

const KEY = "teazy_pending_action";

export interface PendingAction {
  feature: GateFeature;
  path: string;                 // absolute pathname to return to
  autoSubmit?: boolean;         // re-trigger form submit on restore
  formData?: Record<string, any>;
  ts: number;
}

export function savePendingAction(a: Omit<PendingAction, "ts">) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...a, ts: Date.now() }));
  } catch {}
}

export function readPendingAction(): PendingAction | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingAction;
    // Expire after 15 minutes
    if (Date.now() - p.ts > 15 * 60 * 1000) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function consumePendingAction(feature?: GateFeature): PendingAction | null {
  const p = readPendingAction();
  if (!p) return null;
  if (feature && p.feature !== feature) return null;
  sessionStorage.removeItem(KEY);
  return p;
}

export function clearPendingAction() {
  try { sessionStorage.removeItem(KEY); } catch {}
}
