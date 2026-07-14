import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface StackPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function StackPicker({ selectedIds, onChange }: StackPickerProps) {
  const [stacks, setStacks] = useState<Tables<"context_stacks">[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("context_stacks")
      .select("*")
      .order("layer")
      .order("category")
      .order("name")
      .then(({ data }) => {
        if (data) setStacks(data);
      });
  }, []);

  const filtered = stacks.filter(
    (s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, Tables<"context_stacks">[]>>((acc, s) => {
    const key = `${s.layer} / ${s.category}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search stacks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>
      <ScrollArea className="h-[300px]">
        <div className="space-y-3 pr-3">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <h4 className="mb-1.5 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</h4>
              <div className="space-y-1">
                {items.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted cursor-pointer">
                    <Checkbox checked={selectedIds.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
                    <span className="text-foreground">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <p className="text-xs text-muted-foreground">{selectedIds.length} stacks locked</p>
    </div>
  );
}
