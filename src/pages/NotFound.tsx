import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowRight, Search } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

const QUICK_LINKS = [
  { label: "Pricing", to: "/pricing" },
  { label: "Use Cases", to: "/use-cases" },
  { label: "Customers", to: "/customers" },
  { label: "Integrations", to: "/integrations" },
  { label: "Blog", to: "/blog" },
  { label: "Learning", to: "/learning" },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background px-5 py-16 overflow-hidden">
      <div className="absolute inset-0 gradient-mesh opacity-60 pointer-events-none" aria-hidden />
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" aria-hidden />

      <div className="relative max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Search className="h-7 w-7" />
        </div>
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">
          404 · Page not found
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          We couldn't find that page.
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          The link may be outdated, or the page has moved. Try one of these instead.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Button asChild size="lg" className="w-full rounded-lg h-12 gap-2">
            <Link to="/">
              <Home className="h-4 w-4" /> Back to {APP_NAME}
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex items-center justify-between rounded-lg border border-border bg-card/60 backdrop-blur px-4 py-3 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors no-underline"
            >
              {l.label}
              <ArrowRight className="h-3.5 w-3.5 opacity-60" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
