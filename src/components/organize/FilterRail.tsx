import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrganizeTag } from "@/lib/organize/types";
import { colorSwatch } from "@/lib/organize/types";
import {
  isFilterActive, type DueFacet, type KindFacet, type OrganizeFilters,
} from "@/lib/organize/filters";

const KIND_LABELS: { key: KindFacet; label: string }[] = [
  { key: "document", label: "Documents" },
  { key: "collection", label: "Collections" },
  { key: "generation", label: "Creations" },
  { key: "session", label: "Chats" },
  { key: "plain", label: "Plain cards" },
];

const DUE_LABELS: { key: DueFacet; label: string }[] = [
  { key: "all", label: "Any due" },
  { key: "overdue", label: "Overdue" },
  { key: "week", label: "This week" },
  { key: "none", label: "No date" },
];

interface Props {
  filters: OrganizeFilters;
  onChange: (f: OrganizeFilters) => void;
  tags: OrganizeTag[];
}

/** Search / tag / category / due filters. Composable; matches dim in place. */
export function FilterRail({ filters, onChange, tags }: Props) {
  const toggleTag = (id: string) =>
    onChange({
      ...filters,
      tagIds: filters.tagIds.includes(id)
        ? filters.tagIds.filter((t) => t !== id)
        : [...filters.tagIds, id],
    });

  const toggleKind = (k: KindFacet) =>
    onChange({
      ...filters,
      kinds: filters.kinds.includes(k) ? filters.kinds.filter((x) => x !== k) : [...filters.kinds, k],
    });

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2 md:px-6" role="search" aria-label="Filter cards">
      <label className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          placeholder="Search cards…"
          aria-label="Search cards"
          className="h-8 w-44 rounded-lg border border-border bg-card pl-7 pr-2 text-xs outline-none focus:border-accent md:w-56"
        />
      </label>

      {tags.map((t) => {
        const on = filters.tagIds.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => toggleTag(t.id)}
            aria-pressed={on}
            className={cn(
              "tactile inline-flex h-7 items-center gap-1.5 rounded-full border px-2 text-xs",
              on
                ? "border-accent/60 bg-accent/15 text-foreground"
                : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground",
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: colorSwatch(t.color) }} aria-hidden />
            {t.name}
          </button>
        );
      })}

      <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />

      {KIND_LABELS.map(({ key, label }) => {
        const on = filters.kinds.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => toggleKind(key)}
            aria-pressed={on}
            className={cn(
              "tactile h-7 rounded-full border px-2 text-xs",
              on
                ? "border-accent/60 bg-accent/15 text-foreground"
                : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}

      <select
        value={filters.due}
        onChange={(e) => onChange({ ...filters, due: e.target.value as DueFacet })}
        aria-label="Due date filter"
        className="tactile h-7 rounded-lg border border-border bg-card px-1.5 text-xs outline-none hover:border-accent/60"
      >
        {DUE_LABELS.map(({ key, label }) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      {isFilterActive(filters) && (
        <button
          type="button"
          onClick={() => onChange({ q: "", tagIds: [], kinds: [], due: "all" })}
          className="tactile inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}
    </div>
  );
}
