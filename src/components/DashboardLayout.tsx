import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar from "./DashboardSidebar";

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <div className="flex w-full min-h-[calc(100vh-3.5rem)]">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-12 flex items-center border-b border-border px-2 sticky top-14 z-30 bg-background/95 backdrop-blur">
            <SidebarTrigger className="ml-1" aria-label="Toggle navigation menu" />
          </div>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
