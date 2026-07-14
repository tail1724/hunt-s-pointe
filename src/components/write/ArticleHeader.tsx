import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { X, Plus, Users, Tag, Calendar, ChevronDown } from "lucide-react";

export type ArticleStatus = "draft" | "in_review" | "ready" | "published" | "archived";

export const ARTICLE_STATUSES: { value: ArticleStatus; label: string; className: string }[] = [
  { value: "draft",      label: "Draft",       className: "bg-muted text-muted-foreground border-border" },
  { value: "in_review",  label: "In review",   className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  { value: "ready",      label: "Ready",       className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  { value: "published",  label: "Published",   className: "bg-primary/10 text-primary border-primary/30" },
  { value: "archived",   label: "Archived",    className: "bg-muted/50 text-muted-foreground/70 border-border/60" },
];

export const SECTION_SUGGESTIONS = [
  "Politics", "Business", "Tech", "Media", "Science", "Health",
  "Sports", "Culture", "World", "Economy", "Climate", "Opinion",
];

export interface ArticleMeta {
  dek: string;
  byline: string[];
  section: string;
  status: ArticleStatus;
  storyTags: string[];
  publishAt: string | null; // ISO
}

interface Props {
  value: ArticleMeta;
  onChange: (patch: Partial<ArticleMeta>) => void;
}

/** Newsroom-style article metadata block that sits above the manuscript. */
export function ArticleHeader({ value, onChange }: Props) {
  return (
    <div className="mt-4 border-t border-dashed border-border/60 pt-4 space-y-3">
      {/* Dek / subhead */}
      <textarea
        value={value.dek}
        onChange={(e) => onChange({ dek: e.target.value })}
        placeholder="Dek — one sentence that sells the story."
        rows={2}
        className="w-full resize-none bg-transparent border-0 outline-none text-lg leading-snug text-muted-foreground placeholder:text-muted-foreground/40 font-medium"
        style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: "italic" }}
        aria-label="Dek (subhead)"
      />

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <BylineField value={value.byline} onChange={(byline) => onChange({ byline })} />
        <SectionField value={value.section} onChange={(section) => onChange({ section })} />
        <StatusField value={value.status} onChange={(status) => onChange({ status })} />
        <PublishAtField value={value.publishAt} onChange={(publishAt) => onChange({ publishAt })} />
        <TagsField value={value.storyTags} onChange={(storyTags) => onChange({ storyTags })} />
      </div>
    </div>
  );
}

// ---------- Byline chips ----------
function BylineField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [entry, setEntry] = useState("");
  const commit = () => {
    const name = entry.trim();
    if (!name) return;
    if (value.includes(name)) { setEntry(""); return; }
    onChange([...value, name]);
    setEntry("");
  };
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Users className="h-3.5 w-3.5 text-muted-foreground/70" />
      <span className="uppercase tracking-wider text-[10px] text-muted-foreground/70">By</span>
      {value.map((n) => (
        <Badge key={n} variant="secondary" className="gap-1 rounded-full font-normal pl-2.5 pr-1 py-0.5">
          {n}
          <button
            type="button"
            aria-label={`Remove ${n}`}
            onClick={() => onChange(value.filter((x) => x !== n))}
            className="rounded-full hover:bg-muted-foreground/20 p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <input
        value={entry}
        onChange={(e) => setEntry(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }}
        onBlur={commit}
        placeholder={value.length ? "Add author" : "Add byline"}
        className="bg-transparent border-0 outline-none text-xs placeholder:text-muted-foreground/50 min-w-[7ch] w-[9ch] focus:w-[14ch] transition-all"
        aria-label="Add byline"
      />
    </div>
  );
}

// ---------- Section combobox ----------
function SectionField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs hover:bg-muted/50 tactile"
          aria-label="Section"
        >
          <Tag className="h-3 w-3" />
          <span className={cn(!value && "text-muted-foreground/60")}>{value || "Section"}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { onChange(draft.trim()); setOpen(false); } }}
          placeholder="Custom section…"
          className="h-8 text-xs mb-2"
          autoFocus
        />
        <div className="flex flex-wrap gap-1">
          {SECTION_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { onChange(s); setOpen(false); }}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] tactile",
                value === s
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-muted/50",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        {value && (
          <Button variant="ghost" size="sm" className="mt-2 h-7 w-full text-[11px]" onClick={() => { onChange(""); setOpen(false); }}>
            Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ---------- Status pill ----------
function StatusField({ value, onChange }: { value: ArticleStatus; onChange: (v: ArticleStatus) => void }) {
  const current = ARTICLE_STATUSES.find((s) => s.value === value) ?? ARTICLE_STATUSES[0];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium tactile",
            current.className,
          )}
          aria-label="Status"
        >
          {current.label}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        {ARTICLE_STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            className={cn(
              "w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-muted/60 flex items-center justify-between",
              value === s.value && "bg-muted/60",
            )}
          >
            <span>{s.label}</span>
            <span className={cn("h-2 w-2 rounded-full border", s.className)} />
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ---------- Publish date ----------
function PublishAtField({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dateVal = value ? value.slice(0, 10) : "";
  const label = value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Publish date";
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => inputRef.current?.showPicker?.() ?? inputRef.current?.focus()}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs hover:bg-muted/50 tactile"
      >
        <Calendar className="h-3 w-3" />
        <span className={cn(!value && "text-muted-foreground/60")}>{label}</span>
      </button>
      <input
        ref={inputRef}
        type="date"
        value={dateVal}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
        className="sr-only"
        aria-label="Publish date"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear publish date"
          onClick={() => onChange(null)}
          className="ml-1 rounded-full p-0.5 hover:bg-muted/60"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ---------- Story tags ----------
function TagsField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [entry, setEntry] = useState("");
  const commit = () => {
    const t = entry.trim().toLowerCase();
    if (!t) return;
    if (value.includes(t)) { setEntry(""); return; }
    onChange([...value, t]);
    setEntry("");
  };
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {value.map((t) => (
        <Badge key={t} variant="outline" className="gap-1 rounded-full font-normal pl-2 pr-1 py-0.5 text-[10px]">
          #{t}
          <button
            type="button"
            aria-label={`Remove tag ${t}`}
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="rounded-full hover:bg-muted-foreground/20 p-0.5"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <input
        value={entry}
        onChange={(e) => setEntry(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }}
        onBlur={commit}
        placeholder={value.length ? "" : "+ tag"}
        className="bg-transparent border-0 outline-none text-[11px] placeholder:text-muted-foreground/50 min-w-[6ch] w-[7ch] focus:w-[12ch] transition-all"
        aria-label="Add tag"
      />
    </div>
  );
}
