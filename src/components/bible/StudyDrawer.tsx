import { useEffect, useMemo, useState } from "react";
import { Bookmark, Highlighter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { loadAllAnnotations, type AnnotationRecord } from "@/lib/bible/annotations";
import { loadAllBookmarks, type BookmarkRecord } from "@/lib/bible/bookmarks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookNames: Record<string, string>;
  onNavigate: (book: string, chapter: number, verse?: number) => void;
}

const DOT: Record<string, string> = {
  gold: "hsl(40 49% 53%)",
  sage: "hsl(95 25% 50%)",
  sky: "hsl(205 45% 55%)",
  rose: "hsl(355 45% 60%)",
};

/** The Study drawer: everything the reader has marked — highlights & bookmarks. */
export function StudyDrawer({ open, onOpenChange, bookNames, onNavigate }: Props) {
  const { user } = useAuth();
  const [annotations, setAnnotations] = useState<AnnotationRecord[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([loadAllAnnotations(user?.id), loadAllBookmarks(user?.id)]).then(
      ([anns, marks]) => {
        setAnnotations(anns);
        setBookmarks(marks);
        setLoading(false);
      },
    );
  }, [open, user?.id]);

  const groupedAnnotations = useMemo(() => {
    const map = new Map<string, AnnotationRecord[]>();
    for (const r of annotations) {
      const list = map.get(r.book) ?? [];
      list.push(r);
      map.set(r.book, list);
    }
    return [...map.entries()];
  }, [annotations]);

  const jump = (book: string, chapter: number, verse?: number) => {
    onNavigate(book, chapter, verse);
    onOpenChange(false);
  };

  const refLabel = (r: BookmarkRecord) =>
    `${bookNames[r.book] ?? r.book} ${r.chapter}${r.verse != null ? `:${r.verse}` : ""}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center gap-2">
            <Highlighter className="h-4 w-4 text-accent" />
            My study
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="highlights" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="highlights" className="gap-1.5 text-xs">
              <Highlighter className="h-3.5 w-3.5" /> Highlights
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="gap-1.5 text-xs">
              <Bookmark className="h-3.5 w-3.5" /> Bookmarks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="highlights">
            {loading ? (
              <Skeletons />
            ) : annotations.length === 0 ? (
              <Empty>
                Nothing highlighted yet. Select verses in the reader and pick a color — they&apos;ll gather here.
              </Empty>
            ) : (
              <div className="mt-4 space-y-5">
                {groupedAnnotations.map(([book, list]) => (
                  <section key={book}>
                    <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {bookNames[book] ?? book}
                    </h3>
                    <ul className="space-y-1">
                      {list.map((r) => (
                        <li key={`${r.book}-${r.chapter}-${r.verse}`}>
                          <button
                            type="button"
                            onClick={() => jump(r.book, r.chapter, r.verse)}
                            className="tactile flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-muted/60"
                          >
                            <span
                              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-border/60"
                              style={{ background: r.color ? DOT[r.color] : "transparent" }}
                              aria-hidden
                            />
                            <span className="min-w-0">
                              <span className="block font-display text-sm font-semibold">
                                {bookNames[r.book] ?? r.book} {r.chapter}:{r.verse}
                              </span>
                              {r.note && (
                                <span className="mt-0.5 block truncate text-xs italic text-muted-foreground">
                                  {r.note}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookmarks">
            {loading ? (
              <Skeletons />
            ) : bookmarks.length === 0 ? (
              <Empty>
                No bookmarks yet. Tap the ribbon on a chapter, or select verses and choose Bookmark.
              </Empty>
            ) : (
              <ul className="mt-4 space-y-1">
                {bookmarks.map((r) => (
                  <li key={`${r.book}-${r.chapter}-${r.verse ?? "c"}`}>
                    <button
                      type="button"
                      onClick={() => jump(r.book, r.chapter, r.verse ?? undefined)}
                      className="tactile flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-muted/60"
                    >
                      <Bookmark
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-accent/80 text-accent"
                        aria-hidden
                      />
                      <span className="min-w-0">
                        <span className="block font-display text-sm font-semibold">{refLabel(r)}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {r.verse == null ? "Chapter" : "Verse"}
                          {r.label ? ` · ${r.label}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Skeletons() {
  return (
    <div className="mt-6 space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-8 text-center text-sm text-muted-foreground">{children}</p>;
}
