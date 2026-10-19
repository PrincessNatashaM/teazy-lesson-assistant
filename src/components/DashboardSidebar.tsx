import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutGrid, BookOpen, Brain, PenLine, FileText, Presentation, Clapperboard,
  FolderOpen, CreditCard, Settings, GraduationCap, School,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; match?: (pathname: string, search: string) => boolean };

const MATERIALS: Item[] = [
  { title: "All materials", url: "/app/workspace", icon: FolderOpen, match: (p, s) => p === "/app/workspace" && !s },
  { title: "Lesson notes", url: "/app/workspace?tab=lessons", icon: BookOpen, match: (p, s) => p === "/app/workspace" && s.includes("tab=lessons") },
  { title: "Quizzes", url: "/app/workspace?tab=quizzes", icon: Brain, match: (p, s) => p === "/app/workspace" && s.includes("tab=quizzes") },
  { title: "Worksheets", url: "/app/workspace?tab=worksheets", icon: FileText, match: (p, s) => p === "/app/workspace" && s.includes("tab=worksheets") },
  { title: "Slides", url: "/app/workspace?tab=slides", icon: Presentation, match: (p, s) => p === "/app/workspace" && s.includes("tab=slides") },
  { title: "Videos", url: "/app/workspace?tab=videos", icon: Clapperboard, match: (p, s) => p === "/app/workspace" && s.includes("tab=videos") },
  { title: "Marked assessments", url: "/app/workspace?tab=assessments", icon: PenLine, match: (p, s) => p === "/app/workspace" && s.includes("tab=assessments") },
];

const TOOLS: Item[] = [
  { title: "K12 tools", url: "/k12", icon: School },
  { title: "Higher Ed tools", url: "/higher-ed", icon: GraduationCap },
  { title: "Lesson notes", url: "/app", icon: BookOpen, match: (p) => p === "/app" },
  { title: "Quiz generator", url: "/app/quiz", icon: Brain },
  { title: "Writing assessment", url: "/app/writing", icon: PenLine, match: (p) => p.startsWith("/app/writing") },
  { title: "Worksheet designer", url: "/app/worksheet", icon: FileText },
  { title: "Presentation slides", url: "/app/slides", icon: Presentation },
  { title: "Video maker", url: "/app/video", icon: Clapperboard },
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
    <Sidebar collapsible="icon">
      <SidebarContent>
        <NavGroup items={[{ title: "Overview", url: "/dashboard", icon: LayoutGrid, match: (p) => p === "/dashboard" }]} />
        <NavGroup label="MY MATERIALS" items={MATERIALS} />
        <NavGroup label="TEACHING TOOLS" items={TOOLS} />
        <NavGroup label="ACCOUNT" items={ACCOUNT} />
      </SidebarContent>
    </Sidebar>
  );
}
