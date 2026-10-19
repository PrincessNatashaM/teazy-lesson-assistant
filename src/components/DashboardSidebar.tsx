import { NavLink, useLocation } from "react-router-dom";
import {
  BookOpen, Brain, PenLine, FileText, Presentation, Clapperboard,
  FolderOpen, CreditCard, Settings,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; match?: (pathname: string, search: string) => boolean };

const MATERIALS: Item[] = [
  { title: "Recent generations", url: "/app/workspace", icon: FolderOpen, match: (p, s) => p === "/app/workspace" && !s },
  { title: "Lesson notes", url: "/app/workspace?tab=lessons", icon: BookOpen, match: (p, s) => p === "/app/workspace" && s.includes("tab=lessons") },
  { title: "Quizzes", url: "/app/workspace?tab=quizzes", icon: Brain, match: (p, s) => p === "/app/workspace" && s.includes("tab=quizzes") },
  { title: "Worksheets", url: "/app/workspace?tab=worksheets", icon: FileText, match: (p, s) => p === "/app/workspace" && s.includes("tab=worksheets") },
  { title: "Presentation slides", url: "/app/workspace?tab=slides", icon: Presentation, match: (p, s) => p === "/app/workspace" && s.includes("tab=slides") },
  { title: "Videos", url: "/app/workspace?tab=videos", icon: Clapperboard, match: (p, s) => p === "/app/workspace" && s.includes("tab=videos") },
  { title: "Marked assessments", url: "/app/workspace?tab=assessments", icon: PenLine, match: (p, s) => p === "/app/workspace" && s.includes("tab=assessments") },
  { title: "Other resources", url: "/app/workspace?tab=resources", icon: FileText, match: (p, s) => p === "/app/workspace" && s.includes("tab=resources") },
];

const ACCOUNT: Item[] = [
  { title: "Subscription & Usage", url: "/dashboard/usage", icon: CreditCard },
  { title: "Settings", url: "/account", icon: Settings },
];

function NavGroup({ label, items }: { label?: string; items: Item[] }) {
  const { pathname, search } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const isActive = (item: Item) =>
    item.match ? item.match(pathname, search) : pathname === item.url || pathname.startsWith(item.url + "/");
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title + item.url}>
              <SidebarMenuButton asChild isActive={isActive(item)}>
                <NavLink
                  to={item.url}
                  end
                  onClick={() => isMobile && setOpenMobile(false)}
                  className="flex items-center gap-2"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default function DashboardSidebar() {
  return (
    <Sidebar collapsible="icon" className="top-[61px] h-[calc(100svh-61px)]">
      <SidebarContent className="gap-4 py-4">
        <NavGroup label="MY MATERIALS" items={MATERIALS} />
        <NavGroup label="ACCOUNT" items={ACCOUNT} />
      </SidebarContent>
    </Sidebar>
  );
}
