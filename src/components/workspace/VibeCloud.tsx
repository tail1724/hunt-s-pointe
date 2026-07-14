import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface VibeTerm {
  id: string;
  term: string;
  category: string;
  weight: number;
  negative_pair: string | null;
}

const CATEGORIES = ["Gen_Z", "Funny", "Engaging", "Enraging", "Aesthetic", "Narrative"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  Gen_Z: "Gen Z",
  Funny: "Funny",
  Engaging: "Engaging",
  Enraging: "Enraging",
  Aesthetic: "Aesthetic",
  Narrative: "Narrative",
};

const WEIGHT_SIZES: Record<number, string> = {
  1: "text-[10px] px-2 py-0.5",
  2: "text-xs px-2.5 py-1",
  3: "text-sm px-3 py-1",
  4: "text-base px-3 py-1.5",
  5: "text-lg px-4 py-2",
};

interface VibeCloudProps {
  selectedVibes: string[];
  onVibesChange: (vibes: string[]) => void;
  maxSelections?: number;
}

export function VibeCloud({ selectedVibes, onVibesChange, maxSelections = 25 }: VibeCloudProps) {
  const [terms, setTerms] = useState<VibeTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("vibe_cloud_terms")
      .select("*")
      .order("weight", { ascending: false })
      .then(({ data }) => {
        if (data) setTerms(data as VibeTerm[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    let result = terms;
    if (activeCategory) result = result.filter((t) => t.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.term.toLowerCase().includes(q));
    }
    return result;
  }, [terms, search, activeCategory]);

  const toggleVibe = (term: string) => {
    if (selectedVibes.includes(term)) {
      onVibesChange(selectedVibes.filter((v) => v !== term));
    } else {
      if (selectedVibes.length >= maxSelections) {
        onVibesChange([...selectedVibes.slice(1), term]);
      } else {
        onVibesChange([...selectedVibes, term]);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="font-display text-sm font-semibold text-foreground">
          Tag Cloud
          {selectedVibes.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {selectedVibes.length}/{maxSelections}
            </span>
          )}
        </label>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors",
            !activeCategory
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors",
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Bubble cloud — Kinetic Tangerine style */}
      {loading ? (
        <div className="flex h-20 items-center justify-center">
          <span className="text-xs text-muted-foreground">Loading tags...</span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-[200px] sm:max-h-[280px] overflow-y-auto rounded-lg border border-border bg-card/50 p-3">
          {filtered.length === 0 ? (
            <p className="w-full text-center text-xs text-muted-foreground py-4">No tags match your search</p>
          ) : (
            filtered.map((t, i) => {
              const isActive = selectedVibes.includes(t.term);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleVibe(t.term)}
                  className={cn(
                    "font-display font-medium rounded-full transition-all duration-200 select-none animate-scale-in",
                    WEIGHT_SIZES[t.weight] || WEIGHT_SIZES[3],
                    "vibe-breathe",
                    isActive
                      ? "border-2 border-primary bg-card text-foreground shadow-[var(--glow-zest)]"
                      : "border border-accent/10 bg-card text-card-foreground shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
                  )}
                  style={{ animationDelay: `${Math.min(i * 8, 400)}ms` }}
                >
                  {t.term}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
