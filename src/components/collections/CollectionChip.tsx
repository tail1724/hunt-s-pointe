import { Link } from "react-router-dom";
import { X, Sparkles } from "lucide-react";
import { colorTokens, type Collection } from "@/lib/collections/types";

interface Props {
  collection: Collection | null;
  onClear: () => void;
}

/**
 * Compact chip shown in Ezra/Write composers when a collection is active.
 * Click the name to jump to the collection detail; click × to deactivate.
 */
export function CollectionChip({ collection, onClear }: Props) {
  if (!collection) return null;
  const c = colorTokens(collection.color);
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border bg-card pl-1.5 pr-1 py-1 text-xs shadow-sm"
      style={{ borderColor: `${c.from}55` }}
    >
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full text-white"
        style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
      >
        <Sparkles className="h-3 w-3" />
      </span>
      <Link
        to={`/app/knowledge/${collection.id}`}
        className="font-medium text-foreground hover:text-primary transition-colors max-w-[160px] truncate"
        title={`Collection: ${collection.name}`}
      >
        {collection.name}
      </Link>
      <button
        type="button"
        onClick={onClear}
        aria-label="Deactivate collection"
        className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
