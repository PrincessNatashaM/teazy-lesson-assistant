import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import AuthGateModal from "@/components/AuthGateModal";
import { readPendingAction, savePendingAction, type GateFeature, type PendingAction } from "@/lib/pendingAction";

interface RequireAuthOpts {
  feature: GateFeature;
  /** Called immediately if user is already signed in */
  onAuthed?: () => void;
  /** Form values to preserve across the auth flow */
  formData?: Record<string, any>;
  /** If true, page will auto-resubmit the form on return */
  autoSubmit?: boolean;
  /** Override return path (defaults to current pathname) */
  returnPath?: string;
}

interface Ctx {
  requireAuth: (opts: RequireAuthOpts) => boolean; // returns true if allowed to proceed
  openGate: (feature: GateFeature) => void;
}

const AuthGateCtx = createContext<Ctx>({
  requireAuth: () => true,
  openGate: () => {},
});

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gate, setGate] = useState<{ feature: GateFeature } | null>(null);

  // When the user becomes authenticated (via modal or OAuth redirect), close
  // any open gate and return them to the page that originated the auth prompt.
  useEffect(() => {
    if (!user) return;
    setGate(null);
    const pending = readPendingAction();
    if (!pending?.path) return;
    const current = window.location.pathname + window.location.search;
    if (pending.path !== current) {
      navigate(pending.path);
    }
  }, [user, navigate]);

  const requireAuth = useCallback(
    (opts: RequireAuthOpts) => {
      if (user) {
        opts.onAuthed?.();
        return true;
      }
      savePendingAction({
        feature: opts.feature,
        path: opts.returnPath ?? window.location.pathname + window.location.search,
        autoSubmit: opts.autoSubmit,
        formData: opts.formData,
      });
      setGate({ feature: opts.feature });
      return false;
    },
    [user],
  );

  const openGate = useCallback((feature: GateFeature) => setGate({ feature }), []);

  return (
    <AuthGateCtx.Provider value={{ requireAuth, openGate }}>
      {children}
      <AuthGateModal
        open={!!gate}
        feature={gate?.feature ?? "lesson"}
        onClose={() => setGate(null)}
      />
    </AuthGateCtx.Provider>
  );
}

export function useAuthGate() {
  return useContext(AuthGateCtx);
}
