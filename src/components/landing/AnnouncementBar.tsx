import { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "announcement-bar-dismissed-v1";
const MESSAGE = "Now in early access — Free forever tier available.";
const CTA_LABEL = "See pricing →";
const CTA_HREF = "/pricing";

export function AnnouncementBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(STORAGE_KEY) !== "1");
  }, []);

  if (!visible) return null;

  return (
    <div className="relative w-full bg-accent text-accent-foreground">
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 pl-4 pr-10 py-2 text-xs sm:text-sm">
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-center leading-snug">
          <span className="hidden sm:inline">{MESSAGE} </span>
          <span className="sm:hidden">Early access — free tier live. </span>
          <Link to={CTA_HREF} className="font-semibold underline underline-offset-4 hover:opacity-90 whitespace-nowrap">
            {CTA_LABEL}
          </Link>
        </span>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, "1");
            setVisible(false);
          }}
          aria-label="Dismiss announcement"
          className="absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
