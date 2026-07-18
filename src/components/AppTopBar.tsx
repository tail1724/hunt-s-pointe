import { Settings, Sun, Moon, LogOut, PanelLeft, MoreHorizontal, type LucideIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { APP_NAME } from "@/lib/constants";
import { PressRoomBoltIcon } from "@/components/BrandMark";
import { useNavPlacement } from "@/hooks/useNavPlacement";
import {
  workspaceItems,
  insightsItems,
  buildLibraryItems,
} from "@/components/AppSidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { title: string; url: string; icon: LucideIcon };

function TopNavLink({ item, compact }: { item: NavItem; compact: boolean }) {
  const link = (
    <NavLink
      to={item.url}
      end={false}
      className="tactile inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-foreground/80 hover:bg-sidebar-accent hover:text-foreground transition-colors"
      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!compact && <span className="truncate">{item.title}</span>}
    </NavLink>
  );
  if (!compact) return link;
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="bottom" className="font-medium">{item.title}</TooltipContent>
    </Tooltip>
  );
}

export function AppTopBar() {
  const { signOut, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { setPlacement } = useNavPlacement();

  const libraryItems = buildLibraryItems();
  const allItems: NavItem[] = [...workspaceItems, ...libraryItems, ...insightsItems];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initial = (user?.email?.[0] || "U").toUpperCase();

  return (
    <nav
      aria-label="Primary"
      data-nav-anchor="top"
      className="hidden md:flex relative h-14 items-center gap-2 px-3 rounded-2xl border border-sidebar-border bg-sidebar/60 backdrop-blur-sm shadow-[0_1px_0_hsl(var(--sidebar-border))]"
    >
      {/* Brand — clicking it shows the public site; the nav there offers a
          "PressRoom" button back into the workspace for signed-in users. */}
      <button
        type="button"
        onClick={() => navigate("/")}
        className="tactile relative z-10 flex items-center gap-2 min-w-0 pr-2 rounded-lg text-left"
        aria-label="View the Hunt's Pointe site"
        title="View the Hunt's Pointe site"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-[0_0_20px_-6px_hsl(var(--primary)/0.6)]">
          <PressRoomBoltIcon size={16} />
        </div>
        <span className="font-display text-base font-extrabold tracking-tight truncate hidden lg:inline">
          {APP_NAME}
        </span>
      </button>

      <div className="h-6 w-px bg-sidebar-border/70 mx-1" />

      {/* Centered nav links */}
      <div className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center pointer-events-none">
        <div className="hidden xl:flex items-center gap-1 pointer-events-auto">
          {allItems.map((item) => (
            <TopNavLink key={item.url} item={item} compact={false} />
          ))}
        </div>
        <div className="hidden lg:flex xl:hidden items-center gap-1 pointer-events-auto">
          {allItems.map((item) => (
            <TopNavLink key={item.url} item={item} compact />
          ))}
        </div>
        <div className="flex lg:hidden items-center gap-1 pointer-events-auto">
          {workspaceItems.map((item) => (
            <TopNavLink key={item.url} item={item} compact />
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="tactile inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                aria-label="More navigation"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {[...libraryItems, ...insightsItems].map((item) => (
                <DropdownMenuItem key={item.url} onSelect={() => navigate(item.url)}>
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Right cluster */}
      <div className="relative z-10 ml-auto flex items-center gap-1 pl-2 border-l border-sidebar-border/70">
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setPlacement("left")}
              className="tactile h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Pin nav to left"
              aria-pressed
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Pin to left</TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => navigate("/app/admin")}
              className="tactile h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Profile & Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Profile &amp; Settings</TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="tactile h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{theme === "dark" ? "Light mode" : "Dark mode"}</TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleSignOut}
              className="tactile h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Sign out</TooltipContent>
        </Tooltip>

        {user && (
          <div className="ml-1 h-8 w-8 shrink-0 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary" title={user.email ?? undefined}>
            {initial}
          </div>
        )}
      </div>
    </nav>
  );
}
