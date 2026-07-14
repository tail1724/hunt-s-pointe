import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";

const KEY = "cookie-consent-v1";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (!stored) {
      // delay slightly so it doesn't fight first-paint
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const persist = (choice: "accept" | "decline") => {
    localStorage.setItem(KEY, choice);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50 animate-fade-in">
      <div className="rounded-xl border border-border bg-card shadow-xl p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Cookie className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm font-bold text-foreground">We use cookies</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              We use essential cookies to make this site work, plus optional analytics cookies to
              improve it. Read our{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => persist("accept")} className="h-8 rounded-md">
                Accept all
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => persist("decline")}
                className="h-8 rounded-md"
              >
                Essential only
              </Button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => persist("decline")}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
