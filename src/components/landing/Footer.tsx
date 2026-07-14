import { useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Github, Twitter, Linkedin, Globe } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { AuthDialog } from "./AuthDialog";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", to: "/#features" },
      { label: "How It Works", to: "/#how-it-works" },
      { label: "Integrations", to: "/integrations" },
      { label: "Security", to: "/security" },
      { label: "Changelog", to: "/changelog" },
      { label: "Pricing", to: "/pricing" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Use Cases", to: "/use-cases" },
      { label: "Customers", to: "/customers" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", to: "/blog" },
      { label: "Help / Support", to: "/help" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Service", to: "/terms" },
      { label: "AI Safety Policy", to: "/ai-safety" },
    ],
  },
];

export function Footer() {
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <footer className="border-t border-border bg-card py-14 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
          {/* Branding */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <Zap className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="font-display text-sm font-bold text-foreground">{APP_NAME}</span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">{APP_TAGLINE}</p>
            <div className="flex items-center gap-2 pt-1">
              <a
                href="#"
                aria-label="Twitter"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
              >
                <Twitter className="h-3.5 w-3.5" />
              </a>
              <a
                href="#"
                aria-label="GitHub"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
              >
                <Github className="h-3.5 w-3.5" />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
              >
                <Linkedin className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors no-underline"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <button
              onClick={() => setAuthOpen(true)}
              className="hover:text-foreground transition-colors"
            >
              Log In
            </button>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-3 w-3" /> English (US)
            </span>
          </div>
        </div>
      </div>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} defaultTab="login" />
    </footer>
  );
}
