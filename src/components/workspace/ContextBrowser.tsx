import { useState } from "react";
import { ContextCard } from "./ContextCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const LAYERS = [
  { key: "visual", label: "Visual" },
  { key: "environmental", label: "Environment" },
  { key: "motion", label: "Motion" },
  { key: "sonic", label: "Sonic" },
  { key: "narrative", label: "Narrative" },
  { key: "saas_params", label: "SaaS Params" },
] as const;

interface ContextBrowserProps {
  stacks: Tables<"context_stacks">[];
  loading: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function ContextBrowser({ stacks, loading, selectedIds, onToggle }: ContextBrowserProps) {
  const [search, setSearch] = useState("");

  const filtered = stacks.filter(
    (s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="font-display text-sm font-semibold text-foreground">
          2. Inject Context
        </label>
        <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search stacks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <Tabs defaultValue="visual">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {LAYERS.map((l) => (
            <TabsTrigger key={l.key} value={l.key} className="rounded-lg text-xs data-[state=active]:bg-muted">
              {l.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {LAYERS.map((l) => {
          const layerStacks = filtered.filter((s) => s.layer === l.key);
          const categories = [...new Set(layerStacks.map((s) => s.category))];
          return (
            <TabsContent key={l.key} value={l.key} className="mt-3 max-h-[400px] overflow-y-auto pr-1">
              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading stacks...</p>
              ) : layerStacks.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No stacks yet. Seed the database!</p>
              ) : (
                categories.map((cat) => (
                  <div key={cat} className="mb-4">
                    <h4 className="mb-2 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                      {layerStacks.filter((s) => s.category === cat).map((s) => (
                        <ContextCard
                          key={s.id}
                          stack={s}
                          selected={selectedIds.includes(s.id)}
                          onToggle={() => onToggle(s.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
