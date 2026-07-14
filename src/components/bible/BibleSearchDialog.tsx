import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from "@/components/ui/responsive-dialog";
import { search } from "@/lib/bible";
import type { BibleScope, SearchHit } from "@/lib/bible";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translation: string;
  bookNames: Record<string, string>;
  onNavigate: (book: string, chapter: number, verse: number) => void;
}

const SCOPES: { key: BibleScope; label: string }[] = [
  { key: "all", label: "Whole Bible" },
  { key: "ot", label: "Old Testament" },
  { key: "nt", label: "New Testament" },
  { key: "gospels", label: "Gospels" },
];

/** Bolds query terms inside a hit for scannable results. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const terms = query.trim().split(/\s+/).filter((t) => t.length > 1);
  if (terms.length === 0) return <>{text}</>;
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        re.test(p) ? (
          <mark key={i} className="rounded-sm bg-accent/25 px-0.5 text-inherit">{p}</mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function BibleSearchDialog({ open, onOpenChange, translation, bookNames, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<BibleScope>("all");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 3) {
      setHits([]);
      setSearching(false);
      return;
    }
    const mySeq = ++seq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      const results = await search(q, { translation, scope, limit: 30 });
      if (seq.current === mySeq) {
        setHits(results);
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, scope, translation, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl gap-3">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Search the Scriptures</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search every verse in the ${translation}…`}
            aria-label="Search the Bible"
            className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-10 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setScope(s.key)}
              className={cn(
                "tactile rounded-full px-3 py-1 text-xs font-medium transition-colors",
                scope === s.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="max-h-[50vh] min-h-24 overflow-y-auto rounded-lg border border-border/60 bg-card/50">
          {query.trim().length < 3 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Type at least three characters — try <em>"still small voice"</em> or <em>"faith hope love"</em>.
            </p>
          ) : hits.length === 0 && !searching ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No verses match. Try fewer or different words.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {hits.map((h) => (
                <li key={`${h.book}-${h.chapter}-${h.verse}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate(h.book, h.chapter, h.verse);
                      onOpenChange(false);
                    }}
                    className="tactile block w-full px-4 py-3 text-left hover:bg-muted/50"
                  >
                    <span className="font-display text-sm font-semibold text-accent">
                      {bookNames[h.book] ?? h.book} {h.chapter}:{h.verse}
                    </span>
                    <span className="mt-0.5 block font-serif text-sm leading-relaxed text-foreground/90 line-clamp-2" style={{ fontFamily: "'Spectral', Georgia, serif" }}>
                      <Highlighted text={h.text} query={query} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
