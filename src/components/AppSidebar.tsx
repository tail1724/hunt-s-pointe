import { useEffect } from "react";
import {
  Wand2, History, Library, Download, BarChart3, Plug, Settings, Sun, Moon, LogOut,
  Hexagon, Megaphone, ImageIcon, PenTool, FileText, FolderOpen, ChevronsLeft, ChevronsRight, BookOpen,
  PanelTop, Archive, LifeBuoy, KanbanSquare,
  type LucideIcon,
} from "lucide-react";
import { useNavPlacement } from "@/hooks/useNavPlacement";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { APP_NAME } from "@/lib/constants";
import { EzraBoltIcon } from "@/components/BrandMark";
import { vertical } from "@/config/vertical";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type NavItem = { title: string; url: string; icon: LucideIcon };

export const workspaceItems: NavItem[] = [
  { title: "Ezra", url: "/app/ezra", icon: Hexagon },
  { title: "Bible", url: "/app/bible", icon: BookOpen },
  { title: "Organize", url: "/app/organize", icon: KanbanSquare },
  { title: "Write", url: "/app/write", icon: FileText },
];


export const libraryFileCabinet: NavItem = { title: "Newsroom", url: "/app/file-cabinet", icon: Archive };
/** @deprecated Use libraryFileCabinet. Kept as alias to avoid breaking imports. */
export const libraryExport = libraryFileCabinet;
export const libraryKnowledge: NavItem = { title: "Story Packages", url: "/app/knowledge", icon: Library };

export const insightsItems: NavItem[] = [
  { title: "Analytics", url: "/app/analytics", icon: BarChart3 },
  { title: "Integrations", url: "/app/integrations", icon: Plug },
  { title: "Help", url: "/app/help", icon: LifeBuoy },
];

export const ICON_MAP: Record<string, LucideIcon> = {
  PenTool, ImageIcon, Megaphone, FileText, FolderOpen, Wand2, Library,
};

export function buildLibraryItems(): NavItem[] {
  return [libraryFileCabinet, libraryKnowledge];
}

interface RowProps {
  item: NavItem;
  collapsed: boolean;
  end?: boolean;
}

function NavRow({ item, collapsed, end }: RowProps) {
  const button = (
    <SidebarMenuButton asChild className="tactile">
      <NavLink
        to={item.url}
        end={end}
        className="relative hover:bg-sidebar-accent rounded-lg"
        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[2px] before:rounded-full before:bg-accent"
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.title}</span>}
      </NavLink>
    </SidebarMenuButton>
  );

  if (!collapsed) return button;
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" className="font-medium">{item.title}</TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const { setPlacement } = useNavPlacement();

  // Tag the desktop sidebar surface (not the mobile Sheet) so the nav-flight
  // controller can locate it via [data-nav-anchor="left"].
  useEffect(() => {
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>('[data-sidebar="sidebar"]'),
    );
    const desktop = candidates.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width >= 40 && r.height >= 40;
    });
    if (desktop) {
      desktop.setAttribute("data-nav-anchor", "left");
      return () => {
        desktop.removeAttribute("data-nav-anchor");
      };
    }
  }, [collapsed, state]);

  const libraryItems: NavItem[] = [libraryFileCabinet, libraryKnowledge];


  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initial = (user?.email?.[0] || "U").toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-none bg-transparent">
      <SidebarHeader className="p-3">
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="tactile flex items-center gap-2 min-w-0 rounded-lg text-left"
            aria-label="View the Ezra Research site"
            title="View the Ezra Research site"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-[0_0_20px_-6px_hsl(var(--primary)/0.6)]">
              <EzraBoltIcon size={16} />
            </div>
            {!collapsed && (
              <span className="font-display text-lg font-extrabold tracking-tight truncate">{APP_NAME}</span>
            )}
          </button>
          {!collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="tactile h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <NavRow item={item} collapsed={collapsed} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Library</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {libraryItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <NavRow item={item} collapsed={collapsed} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Insights</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {insightsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <NavRow item={item} collapsed={collapsed} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 gap-1">
        {collapsed && (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleSidebar}
                className="tactile h-9 w-full inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                aria-label="Expand sidebar"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand</TooltipContent>
          </Tooltip>
        )}

        <SidebarMenu>
          <SidebarMenuItem>
            {collapsed ? (
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    onClick={() => setPlacement("top")}
                    className="tactile text-muted-foreground hover:text-foreground"
                    aria-label="Pin nav to top"
                    aria-pressed={false}
                  >
                    <PanelTop className="h-4 w-4" />
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">Pin to top</TooltipContent>
              </Tooltip>
            ) : (
              <SidebarMenuButton
                onClick={() => setPlacement("top")}
                className="tactile text-muted-foreground hover:text-foreground"
                aria-label="Pin nav to top"
                aria-pressed={false}
              >
                <PanelTop className="h-4 w-4" />
                <span>Pin to top</span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
          <SidebarMenuItem>
            <NavRow item={{ title: "Profile & Settings", url: "/app/admin", icon: Settings }} collapsed={collapsed} />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="tactile text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="tactile text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {!collapsed && user && (
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-2">
            <div className="h-8 w-8 shrink-0 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{user.email}</div>
              <div className="text-[10px] text-muted-foreground">Free plan</div>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
