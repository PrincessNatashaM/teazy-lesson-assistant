import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Menu, X, BookOpen, Brain, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import teazyLogo from "@/assets/teazy-logo.jpg";

const NAV = [
  { to: "/", label: "Lesson Notes", icon: BookOpen },
  { to: "/quiz", label: "Quiz Generator", icon: Brain },
  { to: "/writing", label: "Writing Assessment", icon: PenLine },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
      isActive
        ? "bg-accent text-accent-foreground"
        : "text-primary-foreground/90 hover:bg-primary-foreground/10",
    );

  return (
    <header className="border-b border-border bg-primary sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img src={teazyLogo} alt="Teazy Tech logo" className="h-9 w-9 rounded-lg object-contain bg-background" />
          <h1 className="text-lg sm:text-xl font-bold text-primary-foreground font-heading">Teazy AI</h1>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} className={linkClass}>
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-primary-foreground p-2 rounded-md hover:bg-primary-foreground/10"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="md:hidden border-t border-primary-foreground/10 bg-primary px-4 py-3 flex flex-col gap-1 animate-fade-in">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={() => setOpen(false)}
              className={linkClass}
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
