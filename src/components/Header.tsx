import { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { Menu, X, UserCircle2, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import teazyLogo from "@/assets/teazy-logo.jpg";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PaywallModal from "./PaywallModal";

const PUBLIC_NAV = [
  { to: "/app", label: "Lesson Notes" },
  { to: "/app/quiz", label: "Quiz Generator" },
  { to: "/app/writing", label: "Assessment Marker" },
];
const PRIVATE_NAV = [
  ...PUBLIC_NAV,
  { to: "/app/workspace", label: "My Workspace" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [proActive, setProActive] = useState(false);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (!user) {
      setProActive(false);
      return;
    }
    supabase
      .from("subscriptions")
      .select("status,current_period_end")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProActive(
          !!(
            data?.status === "active" &&
            (!data.current_period_end || new Date(data.current_period_end) > new Date())
          ),
        );
      });
  }, [user]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "px-3 py-2 rounded-md text-sm font-medium transition-colors",
      isActive
        ? "bg-navy-foreground/15 text-navy-foreground"
        : "text-navy-foreground/85 hover:bg-navy-foreground/10 hover:text-navy-foreground",
    );

  return (
    <header className="border-b border-border bg-navy sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img src={teazyLogo} alt="Teazy Tech logo" className="h-9 w-9 rounded-lg object-contain bg-background" />
          <h1 className="text-lg sm:text-xl font-bold text-navy-foreground font-heading">Teazy AI</h1>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {(user ? PRIVATE_NAV : PUBLIC_NAV).map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === "/app"} className={linkClass}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              {proActive ? (
                <Button asChild size="sm" variant="ghost" className="text-navy-foreground hover:bg-navy-foreground/10">
                  <Link to="/account"><BadgeCheck className="mr-1 h-4 w-4 text-success" /> Manage Subscription</Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setPaywallOpen(true)}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Upgrade to Pro
                </Button>
              )}
              {isAdmin && (
                <Button asChild size="sm" variant="ghost" className="text-navy-foreground hover:bg-navy-foreground/10">
                  <Link to="/admin">Admin</Link>
                </Button>
              )}
              <Button asChild size="sm" variant="ghost" className="text-navy-foreground hover:bg-navy-foreground/10">
                <Link to="/account" aria-label="Account"><UserCircle2 className="h-5 w-5" /></Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost" className="text-navy-foreground hover:bg-navy-foreground/10">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/auth?mode=signup">Upgrade to Pro</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden text-navy-foreground p-2 rounded-md hover:bg-navy-foreground/10"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-navy-foreground/10 bg-navy px-4 py-3 flex flex-col gap-1 animate-fade-in">
          {(user ? PRIVATE_NAV : PUBLIC_NAV).map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === "/app"} onClick={() => setOpen(false)} className={linkClass}>
              {label}
            </NavLink>
          ))}
          <div className="border-t border-navy-foreground/10 mt-2 pt-2 flex flex-col gap-2">
            {user ? (
              <>
                {!proActive && (
                  <Button
                    size="sm"
                    onClick={() => { setOpen(false); setPaywallOpen(true); }}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    Upgrade to Pro
                  </Button>
                )}
                {proActive && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/20 text-success text-xs font-bold w-fit">
                    <BadgeCheck className="h-3.5 w-3.5" /> Pro Active
                  </span>
                )}
                {isAdmin && (
                  <Link onClick={() => setOpen(false)} to="/admin" className="text-navy-foreground/90 px-3 py-2 text-sm">Admin</Link>
                )}
                <Link onClick={() => setOpen(false)} to="/account" className="text-navy-foreground/90 px-3 py-2 text-sm">My Account</Link>
              </>
            ) : (
              <>
                <Link onClick={() => setOpen(false)} to="/auth" className="text-navy-foreground/90 px-3 py-2 text-sm">Sign in</Link>
                <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Link onClick={() => setOpen(false)} to="/auth?mode=signup">Upgrade to Pro</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      )}

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        purpose="subscription"
        onSuccess={() => window.location.reload()}
      />
    </header>
  );
}
