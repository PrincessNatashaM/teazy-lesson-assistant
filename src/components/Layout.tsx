import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";

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
        <footer className="border-t border-border py-6">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Teazy Tech — Empowering teachers with technology.
          </p>
        </footer>
      )}
    </div>
  );
}
