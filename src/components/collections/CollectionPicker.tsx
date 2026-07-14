import { useState } from "react";
import { Library, Check, Plus, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { CollectionChip } from "./CollectionChip";
import { colorTokens, type Collection, type CollectionSurface } from "@/lib/collections/types";
import { useCollections } from "@/lib/collections/useCollections";
import { useActiveCollection } from "@/lib/collections/useActiveCollection";
import { cn } from "@/lib/utils";

interface Props {
  surface: CollectionSurface;
  /** Compact pill style for embedding above composer inputs */
  compact?: boolean;
  className?: string;
}

/**
 * Combined chip + dropdown picker. Shows the active collection chip when set;
 * otherwise a subtle "Use a collection" trigger. Click the chip's name to navigate.
 */
export function CollectionPicker({ surface, compact = false, className }: Props) {
  const { collections, loading } = useCollections();
  const { collection, setActive } = useActiveCollection(surface);
  const [open, setOpen] = useState(false);

  const select = async (c: Collection | null) => {
    await setActive(c?.id ?? null);
    setOpen(false);
  };

  if (collection) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <CollectionChip collection={collection} onClear={() => select(null)} />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
              Change
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0">
            <PickerList
              collections={collections}
              activeId={collection.id}
              onSelect={select}
              loading={loading}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-7 gap-1.5 rounded-full border-border bg-card px-3 text-xs font-medium text-foreground/80 hover:border-accent/60 hover:text-foreground",
            compact && "h-6",
            className,
          )}
        >
          <Library className="h-3.5 w-3.5" />
          Use a collection
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <PickerList
          collections={collections}
          activeId={null}
          onSelect={select}
          loading={loading}
        />
      </PopoverContent>
    </Popover>
  );
}

function PickerList({
  collections, activeId, onSelect, loading,
}: {
  collections: Collection[];
  activeId: string | null;
  onSelect: (c: Collection | null) => void;
  loading: boolean;
}) {
  return (
    <Command>
      <CommandInput placeholder="Search your collections…" />
      <CommandList>
        {loading ? (
          <div className="p-3 text-xs text-muted-foreground">Loading…</div>
        ) : (
          <>
            <CommandEmpty>
              <div className="p-4 text-center">
                <p className="text-sm text-foreground">No collections yet</p>
                <Button asChild size="sm" className="mt-3 rounded-full">
                  <Link to="/app/knowledge"><Plus className="h-3.5 w-3.5 mr-1" />Create one</Link>
                </Button>
              </div>
            </CommandEmpty>
            {activeId && (
              <CommandGroup>
                <CommandItem onSelect={() => onSelect(null)} className="text-muted-foreground">
                  <X className="h-3.5 w-3.5 mr-2" /> Deactivate
                </CommandItem>
              </CommandGroup>
            )}
            {collections.length > 0 && (
              <CommandGroup heading="Your collections">
                {collections.map((c) => {
                  const tok = colorTokens(c.color);
                  return (
                    <CommandItem key={c.id} value={c.name} onSelect={() => onSelect(c)}>
                      <span
                        className="mr-2 inline-block h-4 w-4 rounded"
                        style={{ background: `linear-gradient(135deg, ${tok.from}, ${tok.to})` }}
                      />
                      <span className="flex-1 truncate">{c.name}</span>
                      {c.id === activeId && <Check className="h-4 w-4 text-primary" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem asChild>
                <Link to="/app/knowledge" className="text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 mr-2" /> Manage collections
                </Link>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
}
