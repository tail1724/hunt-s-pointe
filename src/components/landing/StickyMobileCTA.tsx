import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";
import { trackCTA } from "@/lib/track";

interface StickyMobileCTAProps {
  onOpenAuth: () => void;
}

const KEY = "sticky-cta-dismissed-at";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function StickyMobileCTA({ onOpenAuth }: StickyMobileCTAProps) {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw && Date.now() - Number(raw) < DISMISS_TTL_MS) return;

    const threshold = Math.max(400, window.innerHeight * 0.7);
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-40 md:hidden animate-fade-in">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card/95 backdrop-blur shadow-xl pl-1 pr-1 py-1">
        <Button
          onClick={() => {
            trackCTA("signup", "sticky-mobile-cta");
            onOpenAuth();
          }}
          className="flex-1 rounded-full gap-1.5 h-11 text-sm font-semibold"
          size="sm"
        >
          Get started — free <ArrowRight className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={() => {
            trackCTA("try-free", "sticky-mobile-cta");
            navigate("/prompt-central-lite");
          }}
          className="h-11 px-3 text-xs font-medium text-muted-foreground hover:text-foreground whitespace-nowrap"
        >
          Try free
        </button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            localStorage.setItem(KEY, String(Date.now()));
            setVisible(false);
          }}
          className="h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
