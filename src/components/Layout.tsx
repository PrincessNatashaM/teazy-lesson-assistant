import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";

const FOOTER_LINKS = [
  { label: "About", href: "https://www.teazytech.org/about" },
  { label: "Contact", href: "https://www.teazytech.org/contact" },
  { label: "Blog", href: "https://www.teazytech.org/blog" },
];

export default function Layout() {
  const { pathname } = useLocation();
  const showFooter = pathname !== "/";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      {showFooter && (
        <footer className="border-t border-border py-8">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Teazy Tech. Empowering teachers with technology.
            </p>
            <nav className="flex items-center gap-6">
              {FOOTER_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </nav>
          </div>
        </footer>
      )}
    </div>
  );
}
