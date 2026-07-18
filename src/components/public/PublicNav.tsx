import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthDialog } from "@/components/landing/AuthDialog";
import { useAuth } from "@/contexts/AuthContext";
import { requestEntryTransition } from "@/lib/entry-transition";
import { BrandMark } from "@/components/BrandMark";

const PRODUCT = [
  { label: "Features", to: "/#features" },
  { label: "How it works", to: "/#how" },
  { label: "Integrations", to: "/integrations" },
  { label: "Security", to: "/security" },
  { label: "Changelog", to: "/changelog" },
];
const RESOURCES = [
  { label: "Learning", to: "/learning" },
  { label: "Blog", to: "/blog" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export function PublicNav() {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<null | "login" | "signup">(null);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { session, signOut } = useAuth();

  // Toggles the nav's elevated (scrolled) styling — a small hysteresis band
  // avoids flicker right at the boundary, and it settles back to its flush
  // resting state once the page returns all the way to the top.
  useEffect(() => {
    const onScroll = () => {
      setScrolled((prev) => {
        const y = window.scrollY;
        if (prev) return y > 8;
        return y > 24;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Signed-in visitors get a direct door back into the workspace — with the
  // same ink transition they saw at sign-in.
  const enterPressRoom = () => {
    requestEntryTransition();
    navigate("/app/pressroom");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  useEffect(() => { setOpen(false); }, [location.pathname, location.hash]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleHash = (e: React.MouseEvent, to: string) => {
    if (!to.startsWith("/#")) return;
    if (location.pathname === "/") {
      e.preventDefault();
      const id = to.slice(2);
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <nav className={`nav${scrolled ? " is-scrolled" : ""}`}><div className="wrap"><div className="nav__in">
        <Link className="brand" to="/" aria-label="Hunt's Pointe home">
          <BrandMark size={32} />
        </Link>
        <div className={`nav__links${open ? " open" : ""}`}>
          <div className="dd">
            <span className="navlink" tabIndex={0}>Product
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 9l6 6 6-6"/></svg>
            </span>
            <div className="dd__menu">
              {PRODUCT.map(l => (
                <Link key={l.label} to={l.to} onClick={(e) => handleHash(e, l.to)}>{l.label}</Link>
              ))}
            </div>
          </div>
          <Link className="navlink" to="/use-cases">Solutions</Link>
          <Link className="navlink" to="/customers">Customers</Link>
          <Link className="navlink" to="/pricing">Pricing</Link>
          <div className="dd">
            <span className="navlink" tabIndex={0}>Resources
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 9l6 6 6-6"/></svg>
            </span>
            <div className="dd__menu">
              {RESOURCES.map(l => <Link key={l.label} to={l.to}>{l.label}</Link>)}
            </div>
          </div>
          {/* Login lives inside the mobile menu so the cramped top-right
              cluster is just the primary CTA + hamburger on small screens. */}
          {!session && (
            <button className="navlink nav__mlogin" type="button" onClick={() => setAuth("login")}>Log in</button>
          )}
        </div>
        <div className="nav__right">
          {session ? (
            <>
              <button className="btn btn--ink btn--sm" type="button" onClick={enterPressRoom}>
                Go to PressRoom
                <span className="ar" aria-hidden="true">→</span>
              </button>
              <button className="btn btn--ghost btn--sm" type="button" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button className="navlink" type="button" onClick={() => setAuth("login")}>Log in</button>
              <button className="btn btn--ink btn--sm" type="button" onClick={() => setAuth("signup")}>Get started</button>
            </>
          )}
          <button className="hamb" type="button" aria-label="Menu" onClick={() => setOpen(v => !v)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
        </div>
      </div></div></nav>
      <AuthDialog open={!!auth} onOpenChange={(o) => setAuth(o ? (auth || "signup") : null)} defaultTab={auth ?? "signup"} />
    </>
  );
}
