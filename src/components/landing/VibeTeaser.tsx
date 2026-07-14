import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface VibeTerm {
  id: string;
  term: string;
  category: string;
  weight: number;
}

interface VibeTeaserProps {
  onOpenAuth: () => void;
}

export function VibeTeaser({ onOpenAuth }: VibeTeaserProps) {
  const [terms, setTerms] = useState<VibeTerm[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from("vibe_cloud_terms").select("id, term, category, weight").limit(40).then(({ data }) => {
      if (data) setTerms(data);
    });
  }, []);

  const toggle = (term: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else if (next.size < 8) next.add(term);
      return next;
    });
  };

  if (terms.length === 0) return null;

  return (
    <section className="py-24 px-6 bg-muted/30">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
          Try the <span className="text-primary">Tag Cloud</span>
        </h2>
        <p className="text-muted-foreground text-lg mb-10">
          Click terms to build your palette. Sign up to use them in real projects.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {terms.map((t) => (
            <button
              key={t.id}
              onClick={() => toggle(t.term)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                selected.has(t.term)
                  ? "border-2 border-primary bg-card text-foreground shadow-[var(--glow-zest)]"
                  : "border border-accent/10 bg-card text-muted-foreground hover:border-primary/40"
              )}
            >
              {t.term}
            </button>
          ))}
        </div>

        {selected.size > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            {selected.size} tag{selected.size > 1 ? "s" : ""} selected
          </p>
        )}

        <Button onClick={onOpenAuth} className="rounded-lg shadow-lg hover:shadow-xl">
          Sign Up to Get Started
        </Button>
      </div>
    </section>
  );
}
