import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BookMeta } from "@/lib/bible";
import { cn } from "@/lib/utils";

interface Props {
  books: BookMeta[];
  book: string;
  chapter: number;
  onSelect: (book: string, chapter: number) => void;
}

/**
 * Book + chapter navigator: a two-step popover (pick a book, then a chapter
 * from a numeric grid), with an OT/NT split and type-to-filter.
 */
export function BiblePassagePicker({ books, book, chapter, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"book" | "chapter">("book");
  const [pendingBook, setPendingBook] = useState<BookMeta | null>(null);
  const [filter, setFilter] = useState("");

  const current = books.find((b) => b.slug === book);

  useEffect(() => {
    if (open) {
      setStage("book");
      setPendingBook(null);
      setFilter("");
    }
  }, [open]);

  const { ot, nt } = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const visible = q ? books.filter((b) => b.name.toLowerCase().includes(q)) : books;
    return {
      ot: visible.filter((b) => b.section.startsWith("ot")),
      nt: visible.filter((b) => b.section.startsWith("nt")),
    };
  }, [books, filter]);

  const pickBook = (b: BookMeta) => {
    if (b.chapters === 1) {
      onSelect(b.slug, 1);
      setOpen(false);
      return;
    }
    setPendingBook(b);
    setStage("chapter");
  };

  const bookColumn = (label: string, list: BookMeta[]) =>
    list.length > 0 && (
      <div>
        <p className="mb-1.5 px-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <div className="flex flex-col">
          {list.map((b) => (
            <button
              key={b.slug}
              type="button"
              onClick={() => pickBook(b)}
              className={cn(
                "tactile rounded-md px-2 py-1 text-left text-sm hover:bg-muted",
                b.slug === book && "font-semibold text-accent",
              )}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="tactile inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-display text-sm font-semibold hover:border-accent/60"
          aria-label="Choose book and chapter"
        >
          {current?.name ?? book} {chapter}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[420px] max-w-[92vw] p-3">
        {stage === "book" ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Find a book…"
              aria-label="Filter books"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-accent"
            />
            <div className="grid max-h-[46vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
              {bookColumn("Old Testament", ot)}
              {bookColumn("New Testament", nt)}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-semibold">{pendingBook?.name}</p>
              <button
                type="button"
                onClick={() => setStage("book")}
                className="tactile rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                ← Books
              </button>
            </div>
            <div className="grid max-h-[46vh] grid-cols-8 gap-1 overflow-y-auto">
              {Array.from({ length: pendingBook?.chapters ?? 0 }, (_, i) => i + 1).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onSelect(pendingBook!.slug, c);
                    setOpen(false);
                  }}
                  className={cn(
                    "tactile rounded-md py-1.5 text-center text-sm tabular-nums hover:bg-muted",
                    pendingBook?.slug === book && c === chapter && "bg-accent/20 font-semibold text-accent",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
