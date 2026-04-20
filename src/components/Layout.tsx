import { Outlet } from "react-router-dom";
import Header from "./Header";
import Hero from "./Hero";

export default function Layout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto max-w-4xl">
          <Hero />
          <div className="px-4 pb-12">
            <Outlet />
          </div>
        </div>
      </main>
      <footer className="border-t border-border py-6">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Teazy Tech — Empowering teachers with technology.
        </p>
      </footer>
    </div>
  );
}
