import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import {
  Hexagon, FileText, Archive, Library, BarChart3, Plug, LifeBuoy,
  Settings, Sun, Moon, KanbanSquare, type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useMobileNav } from "./mobile-nav-context";
import { EzraBoltIcon } from "@/components/BrandMark";
import { APP_NAME } from "@/lib/constants";
import { haptics } from "@/lib/haptics";

interface NavItem {
  title: string;
  to: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { title: "Write", to: "/app/write", icon: FileText },
  { title: "PressRoom", to: "/app/pressroom", icon: Hexagon },
  { title: "Organize", to: "/app/organize", icon: KanbanSquare },
  { title: "Newsroom", to: "/app/file-cabinet", icon: Archive },
  { title: "Story Packages", to: "/app/knowledge", icon: Library },
  { title: "Analytics", to: "/app/analytics", icon: BarChart3 },
  { title: "Integrations", to: "/app/integrations", icon: Plug },
  { title: "Help", to: "/app/help", icon: LifeBuoy },
];

interface Props {
  onOpenAccount: () => void;
}

export function MobileNavDrawer({ onOpenAccount }: Props) {
  const { isOpen, setOpen } = useMobileNav();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const close = () => setOpen(false);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        id="mobile-nav-drawer"
        side="left"
        aria-label="App navigation"
        className="mobile-nav-drawer w-[85vw] max-w-[340px] gap-0 border-r p-0"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">Browse Ezra Research and manage your account</SheetDescription>

        <div className="mobile-nav-drawer__header">
          <div className="mobile-nav-drawer__brand-icon">
            <EzraBoltIcon size={16} />
          </div>
          <span className="mobile-nav-drawer__brand-name">{APP_NAME}</span>
        </div>

        <nav className="mobile-nav-drawer__list" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                haptics.tap();
                close();
              }}
              className="mobile-nav-drawer__item"
              activeClassName="mobile-nav-drawer__item--active"
            >
              <item.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mobile-nav-drawer__footer">
          <button type="button" className="mobile-nav-drawer__user" onClick={onOpenAccount}>
            <div className="mobile-nav-drawer__avatar">{(user?.email?.[0] || "U").toUpperCase()}</div>
            <div className="min-w-0">
              <div className="mobile-nav-drawer__user-name">{user?.email || "Signed in"}</div>
              <div className="mobile-nav-drawer__user-plan">Free plan</div>
            </div>
          </button>
          <div className="mobile-nav-drawer__utility">
            <button
              type="button"
              aria-label="Settings"
              onClick={() => {
                close();
                navigate("/app/admin");
              }}
            >
              <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <Moon className="h-[18px] w-[18px]" strokeWidth={1.8} />}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
