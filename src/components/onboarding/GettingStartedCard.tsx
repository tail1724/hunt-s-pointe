import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Check, ImageIcon, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "onboarding.gettingstarted.dismissed";

interface Steps {
  asked: boolean;
  highlighted: boolean;
  generated: boolean;
}

/**
 * First-run checklist shown on Ezra's empty state until the three aha moments
 * have happened (or the user dismisses it). Completion is detected from real
 * data, not flags — so returning users never see it.
 */
export function GettingStartedCard() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");
  const [steps, setSteps] = useState<Steps | null>(null);

  useEffect(() => {
    if (!user || dismissed) return;
    let cancelled = false;
    (async () => {
      const [history, gens, anns] = await Promise.all([
        supabase.from("prompt_history").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("generations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("media_type", "image"),
        supabase
          .from("bible_annotations" as never)
          .select("id", { count: "exact", head: true })
          .eq("user_id" as never, user.id as never)
          .then((r) => r, () => ({ count: 0 })),
      ]);
      const lsHighlights = (() => {
        try {
          return Object.keys(JSON.parse(localStorage.getItem("bible.annotations.v1") || "{}")).length;
        } catch {
          return 0;
        }
      })();
      if (cancelled) return;
      setSteps({
        asked: (history.count ?? 0) > 0,
        highlighted: ((anns as { count?: number | null }).count ?? 0) > 0 || lsHighlights > 0,
        generated: (gens.count ?? 0) > 0,
      });
    })();
    return () => { cancelled = true; };
  }, [user, dismissed]);

  if (dismissed || !steps) return null;
  const done = [steps.asked, steps.highlighted, steps.generated].filter(Boolean).length;
  if (done === 3) return null;

  const items = [
    {
      done: steps.asked,
      icon: Sparkles,
      label: "Ask Ezra your first question",
      hint: "Try a starter above — or the passage you're preaching next",
    },
    {
      done: steps.highlighted,
      icon: BookOpen,
      label: "Highlight a verse in the Bible",
      hint: "Open the reader, click a verse, pick a color",
      to: "/app/bible",
    },
    {
      done: steps.generated,
      icon: ImageIcon,
      label: "Create your first image",
      hint: "After any answer, choose “Create image”",
    },
  ];

  return (
    <div className="ezra-artifact-reveal mt-5 rounded-2xl border border-[var(--ezra-border)] bg-[var(--ezra-panel)]/60 p-4 text-left">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--ezra-fg)]">
          Getting started <span className="ml-1 font-normal text-[var(--ezra-fg-muted)]">{done} of 3</span>
        </p>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
          aria-label="Dismiss getting started"
          className="ezra-tactile rounded-full p-1 text-[var(--ezra-fg-muted)] hover:bg-[var(--ezra-hover-bg)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--ezra-hover-bg)]">
        <div
          className="h-full rounded-full bg-[var(--ezra-accent)] transition-all duration-500"
          style={{ width: `${(done / 3) * 100}%` }}
        />
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map((it) => {
          const row = (
            <span className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  it.done
                    ? "border-[var(--ezra-accent)] bg-[var(--ezra-accent)] text-[var(--ezra-accent-fg)]"
                    : "border-[var(--ezra-border)] text-[var(--ezra-fg-muted)]",
                )}
              >
                {it.done ? <Check className="h-3 w-3" /> : <it.icon className="h-3 w-3" />}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-xs font-medium", it.done ? "text-[var(--ezra-fg-muted)] line-through" : "text-[var(--ezra-fg)]")}>
                  {it.label}
                </span>
                {!it.done && <span className="block text-[11px] text-[var(--ezra-fg-muted)]">{it.hint}</span>}
              </span>
            </span>
          );
          return (
            <li key={it.label}>
              {it.to && !it.done ? (
                <Link to={it.to} className="ezra-tactile block rounded-lg px-1 py-1 no-underline hover:bg-[var(--ezra-hover-bg)]">
                  {row}
                </Link>
              ) : (
                <span className="block px-1 py-1">{row}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
