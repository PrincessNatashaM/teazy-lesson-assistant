import { Outlet } from "react-router-dom";
import Hero from "./Hero";

export default function AppShell() {
  return (
    <div className="container mx-auto max-w-4xl">
      <Hero />
      <div className="px-4 pb-12">
        <Outlet />
      </div>
    </div>
  );
}
