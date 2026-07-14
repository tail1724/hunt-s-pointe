import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { requestEntryTransition } from "@/lib/entry-transition";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "./AuthDialog";
import { ProductMegaMenu } from "./MegaMenu";
import { Zap, Menu, X, LogOut } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { trackCTA } from "@/lib/track";

const FLAT_LINKS = [
  { label: "Solutions", to: "/use-cases" },
  { label: "Customers", to: "/customers" },
  { label: "Pricing", to: "/pricing" },
];

const MOBILE_GROUPS = [
  {
    title: "Product",
    items: [
      { label: "Features", to: "/#features" },
      { label: "How It Works", to: "/#how-it-works" },
      { label: "Integrations", to: "/integrations" },
      { label: "Security", to: "/security" },
      { label: "Changelog", to: "/changelog" },
    ],
  },
  {
    title: "Solutions",
    items: [
      { label: "Use Cases", to: "/use-cases" },
      { label: "Customers", to: "/customers" },
      { label: "Pricing", to: "/pricing" },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Blog", to: "/blog" },
      { label: "About", to: "/about" },
      { label: "Help", to: "/help" },
      { label: "Contact", to: "/contact" },
    ],
  },
];

export function Navbar() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");
  const [mobileOpen, setMobileOpen] = useState(false);

  const openAuth = (tab: "login" | "signup") => {
    trackCTA(tab === "signup" ? "signup" : "login", "navbar");
    setAuthTab(tab);
    setAuthOpen(true);
  };

  const enterWorkspace = () => {
    requestEntryTransition();
    navigate("/app/ezra");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 md:h-16 px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 no-underline shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-base md:text-lg font-extrabold tracking-tight text-foreground">
              {APP_NAME}
            </span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-2 ml-8">
            <ProductMegaMenu />
            {FLAT_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors no-underline"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {session ? (
              <>
                <Button onClick={enterWorkspace} className="rounded-lg">
                  Go to Ezra
                </Button>
                <Button variant="outline" onClick={handleSignOut} className="rounded-lg gap-1.5">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => openAuth("login")}
                  className="text-sm"
                >
                  Log In
                </Button>
                <Button
                  onClick={() => openAuth("signup")}
                  className="rounded-lg shadow-lg hover:shadow-xl"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile: persistent Sign up + hamburger (≥44px hit area) */}
          <div className="md:hidden flex items-center gap-1">
            {session ? (
              <Button
                onClick={enterWorkspace}
                size="sm"
                className="rounded-full h-9 px-4 text-xs font-semibold"
              >
                Go to Ezra
              </Button>
            ) : (
              <Button
                onClick={() => openAuth("signup")}
                size="sm"
                className="rounded-full h-9 px-4 text-xs font-semibold"
              >
                Sign up
              </Button>
            )}
            <button
              type="button"
              className="h-11 w-11 flex items-center justify-center text-foreground -mr-2"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md px-5 py-5 space-y-5 max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
            {MOBILE_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center min-h-11 text-base text-foreground hover:text-primary transition-colors no-underline"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-border flex flex-col gap-2">
              {session ? (
                <>
                  <Button
                    onClick={() => {
                      enterWorkspace();
                      setMobileOpen(false);
                    }}
                    className="rounded-lg w-full h-11"
                  >
                    Go to Ezra
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleSignOut();
                      setMobileOpen(false);
                    }}
                    className="rounded-lg w-full h-11 gap-1.5"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      openAuth("login");
                      setMobileOpen(false);
                    }}
                    className="h-11"
                  >
                    Log In
                  </Button>
                  <Button
                    onClick={() => {
                      openAuth("signup");
                      setMobileOpen(false);
                    }}
                    className="rounded-lg h-11"
                  >
                    Get Started — Free
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} defaultTab={authTab} />
    </>
  );
}
