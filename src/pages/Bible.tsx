/* eslint-disable @typescript-eslint/no-explicit-any --
   `documents` insert follows the repo's untyped `from("…" as any)` convention. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark, BookOpen, ChevronLeft, ChevronRight, Columns2, Copy, Highlighter, MessagesSquare,
  PenLine, Search, Square, StickyNote, Volume2, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getChapter, listTranslations } from "@/lib/bible";
import type { BookMeta, TranslationMeta, Verse } from "@/lib/bible";
import {
  loadChapterAnnotations, saveAnnotation,
  type HighlightColor, type VerseAnnotation,
} from "@/lib/bible/annotations";
import {
  loadChapterBookmarks, toggleBookmark, type BookmarkRecord,
} from "@/lib/bible/bookmarks";
import { BiblePassagePicker } from "@/components/bible/BiblePassagePicker";
import { BibleSearchDialog } from "@/components/bible/BibleSearchDialog";
import { StudyDrawer } from "@/components/bible/StudyDrawer";
import { AudioDock } from "@/components/bible/audio/AudioDock";
import { useScriptureAudio } from "@/hooks/useScriptureAudio";
import { markdownToTiptapJSON, markdownToPlainText } from "@/lib/markdown-to-tiptap";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

const POSITION_KEY = "bible.position.v1";

const HIGHLIGHT_COLORS: { key: HighlightColor; label: string; swatch: string }[] = [
  { key: "gold", label: "Gold", swatch: "hsl(40 49% 53%)" },
  { key: "sage", label: "Sage", swatch: "hsl(95 25% 50%)" },
  { key: "sky", label: "Sky", swatch: "hsl(205 45% 55%)" },
  { key: "rose", label: "Rose", swatch: "hsl(355 45% 60%)" },
];

interface Position {
  translation: string;
  book: string;
  chapter: number;
}

function readPosition(): Position {
  try {
    const raw = JSON.parse(localStorage.getItem(POSITION_KEY) || "");
    if (raw?.translation && raw?.book && raw?.chapter) return raw;
  } catch { /* first visit */ }
  return { translation: "KJV", book: "john", chapter: 1 };
}

/** Collapse a sorted verse list into "3-5, 7" style range text. */
function rangeLabel(verses: number[]): string {
  const ranges: string[] = [];
  let start = verses[0];
  let prev = verses[0];
  for (let i = 1; i <= verses.length; i++) {
    const v = verses[i];
    if (v !== prev + 1) {
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = v;
    }
    prev = v;
  }
  return ranges.join(", ");
}

export default function Bible() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [translations, setTranslations] = useState<TranslationMeta[]>([]);
  const [pos, setPos] = useState<Position>(readPosition);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [annotations, setAnnotations] = useState<Map<number, VerseAnnotation>>(new Map());
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  // Search-result landing: `flashTarget` is the pending request (book +
  // chapter + verse), `landedVerse` is the verse currently flagged in view.
  // Splitting them fixes the old race where a cross-chapter jump resolved the
  // flash against the previous chapter's DOM and then cleared itself, so the
  // real chapter arrived unmarked.
  const [flashTarget, setFlashTarget] = useState<{ book: string; chapter: number; verse: number } | null>(null);
  const [landedVerse, setLandedVerse] = useState<number | null>(null);
  const [parallel, setParallel] = useState(() => localStorage.getItem("bible.parallel") === "1");
  const [secondaryVerses, setSecondaryVerses] = useState<Verse[]>([]);
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  const activeTranslation = translations.find((t) => t.id === pos.translation);
  const books: BookMeta[] = useMemo(() => activeTranslation?.books ?? [], [activeTranslation]);
  const bookMeta = books.find((b) => b.slug === pos.book);
  const bookNames = useMemo(
    () => Object.fromEntries(books.map((b) => [b.slug, b.name])),
    [books],
  );

  // Manifest (translation + book lists) loads once.
  useEffect(() => {
    listTranslations().then((ts) => {
      setTranslations(ts);
      // Recover gracefully if the stored translation was removed.
      if (ts.length > 0 && !ts.some((t) => t.id === readPosition().translation)) {
        setPos((p) => ({ ...p, translation: ts[0].id }));
      }
    });
  }, []);

  // Parallel pane: the "other" vendored translation, verse-aligned.
  const secondaryTranslation = useMemo(
    () => translations.find((t) => t.id !== pos.translation)?.id ?? null,
    [translations, pos.translation],
  );

  useEffect(() => {
    localStorage.setItem("bible.parallel", parallel ? "1" : "0");
    if (!parallel || !secondaryTranslation) {
      setSecondaryVerses([]);
      return;
    }
    let cancelled = false;
    getChapter(secondaryTranslation, pos.book, pos.chapter).then((vs) => {
      if (!cancelled) setSecondaryVerses(vs);
    });
    return () => { cancelled = true; };
  }, [parallel, secondaryTranslation, pos.book, pos.chapter]);

  // Chapter text + annotations follow the position.
  useEffect(() => {
    localStorage.setItem(POSITION_KEY, JSON.stringify(pos));
    let cancelled = false;
    setLoading(true);
    setSelected(new Set());
    setNoteOpen(false);
    setLandedVerse(null);
    Promise.all([
      getChapter(pos.translation, pos.book, pos.chapter),
      loadChapterAnnotations(user?.id, pos.book, pos.chapter),
      loadChapterBookmarks(user?.id, pos.book, pos.chapter),
    ]).then(([vs, anns, marks]) => {
      if (cancelled) return;
      setVerses(vs);
      setAnnotations(anns);
      setBookmarks(marks);
      setLoading(false);
      pageRef.current?.closest("main")?.scrollTo({ top: 0 });
    });
    return () => { cancelled = true; };
  }, [pos, user?.id]);

  // Search-result landing: only fire once the *requested* chapter is actually
  // rendered. The verse then stays flagged (brass edge + parchment glow) until
  // the reader taps another verse or turns the page — no fading away before
  // they've found it.
  useEffect(() => {
    if (!flashTarget || loading) return;
    if (pos.book !== flashTarget.book || pos.chapter !== flashTarget.chapter) return;
    if (verses.length === 0) return;
    const el = document.querySelector<HTMLElement>(`[data-verse="${flashTarget.verse}"]`);
    if (!el) return; // chapter loaded but verse out of range — leave target for a retry, don't clear
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setLandedVerse(flashTarget.verse);
    setFlashTarget(null);
  }, [flashTarget, loading, pos.book, pos.chapter, verses]);

  const go = useCallback((book: string, chapter: number, verse?: number) => {
    setPos((p) => ({ ...p, book, chapter }));
    if (verse != null) setFlashTarget({ book, chapter, verse });
  }, []);

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!bookMeta) return;
      const next = pos.chapter + dir;
      if (next >= 1 && next <= bookMeta.chapters) {
        go(pos.book, next);
        return;
      }
      const idx = books.findIndex((b) => b.slug === pos.book);
      const neighbor = books[idx + dir];
      if (!neighbor) return;
      go(neighbor.slug, dir === 1 ? 1 : neighbor.chapters);
    },
    [bookMeta, books, pos, go],
  );

  // Bookmarks: chapter ribbon + per-verse marks, optimistic with local fallback.
  const chapterBookmarked = bookmarks.some((b) => b.verse === null);
  const verseBookmarks = useMemo(
    () => new Set(bookmarks.filter((b) => b.verse != null).map((b) => b.verse as number)),
    [bookmarks],
  );

  const toggleChapterBookmark = useCallback(() => {
    haptics.tap();
    const existed = chapterBookmarked;
    setBookmarks((prev) =>
      existed
        ? prev.filter((b) => b.verse !== null)
        : [...prev, { book: pos.book, chapter: pos.chapter, verse: null, label: null, created_at: new Date().toISOString() }],
    );
    toggleBookmark(user?.id, pos.translation, pos.book, pos.chapter, null, existed);
    toast.success(
      existed
        ? "Bookmark removed"
        : `Bookmarked ${bookMeta?.name ?? pos.book} ${pos.chapter}`,
    );
  }, [chapterBookmarked, user?.id, pos, bookMeta]);

  const bookmarkSelection = useCallback(() => {
    const versesToChange = [...selected].sort((a, b) => a - b);
    if (versesToChange.length === 0) return;
    const allMarked = versesToChange.every((v) => verseBookmarks.has(v));
    const now = new Date().toISOString();
    setBookmarks((prev) => {
      if (allMarked) return prev.filter((b) => b.verse == null || !selected.has(b.verse));
      const additions = versesToChange
        .filter((v) => !verseBookmarks.has(v))
        .map((v) => ({ book: pos.book, chapter: pos.chapter, verse: v, label: null, created_at: now }));
      return [...prev, ...additions];
    });
    for (const v of versesToChange) {
      const existed = verseBookmarks.has(v);
      if (allMarked === existed) {
        toggleBookmark(user?.id, pos.translation, pos.book, pos.chapter, v, existed);
      }
    }
    toast.success(allMarked ? "Bookmarks removed" : "Bookmarked");
    setSelected(new Set());
    setNoteOpen(false);
  }, [selected, verseBookmarks, user?.id, pos]);

  // Scripture Audio: persona voices + verse-synced playback (see useScriptureAudio).
  const advanceForAudio = useCallback((): boolean => {
    if (!bookMeta) return false;
    const next = pos.chapter + 1;
    if (next <= bookMeta.chapters) {
      go(pos.book, next);
      return true;
    }
    const idx = books.findIndex((b) => b.slug === pos.book);
    const neighbor = books[idx + 1];
    if (!neighbor) return false;
    go(neighbor.slug, 1);
    return true;
  }, [bookMeta, books, pos.book, pos.chapter, go]);

  const audio = useScriptureAudio({
    chapter: loading || verses.length === 0 ? null : {
      id: `${pos.translation}-${pos.book}-${pos.chapter}`,
      bookName: bookMeta?.name ?? pos.book,
      chapterNumber: pos.chapter,
      verses,
    },
    onAdvanceChapter: advanceForAudio,
  });

  const toggleListening = useCallback(() => {
    if (!audio.supported) {
      toast.error("Audio reading isn't supported in this browser");
      return;
    }
    if (audio.active) audio.stop();
    else audio.play();
  }, [audio]);

  // Follow the reading: keep the spoken verse centered while playing.
  useEffect(() => {
    if (audio.status !== "playing" || audio.speakingVerse == null) return;
    const el = document.querySelector<HTMLElement>(`[data-verse="${audio.speakingVerse}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [audio.status, audio.speakingVerse]);

  // Keyboard reading: ← → turn chapters, "/" opens search, space drives audio.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === " " && audio.active) {
        e.preventDefault();
        audio.toggle();
      } else if (e.key === "b") {
        toggleChapterBookmark();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, audio, toggleChapterBookmark]);

  const toggleVerse = (v: number) => {
    haptics.tap();
    setLandedVerse(null); // interacting with the chapter dismisses the search flag
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  const selectedSorted = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);
  const refLabel = bookMeta && selectedSorted.length > 0
    ? `${bookMeta.name} ${pos.chapter}:${rangeLabel(selectedSorted)}`
    : "";
  const selectedText = selectedSorted
    .map((v) => verses.find((x) => x.verse === v)?.text)
    .filter(Boolean)
    .join(" ");

  const clearSelection = () => {
    setSelected(new Set());
    setNoteOpen(false);
  };

  const applyHighlight = async (color: HighlightColor | null) => {
    const next = new Map(annotations);
    for (const v of selectedSorted) {
      const existing = next.get(v) ?? { color: null, note: null };
      const ann = { ...existing, color };
      if (!ann.color && !ann.note) next.delete(v);
      else next.set(v, ann);
      await saveAnnotation(user?.id, pos.translation, { book: pos.book, chapter: pos.chapter, verse: v, ...ann });
    }
    setAnnotations(next);
    haptics.tap();
    if (color) toast.success(`Highlighted ${refLabel}`);
    clearSelection();
  };

  const openNote = () => {
    const first = selectedSorted[0];
    setNoteDraft(annotations.get(first)?.note ?? "");
    setNoteOpen(true);
  };

  const saveNote = async () => {
    const note = noteDraft.trim() || null;
    const next = new Map(annotations);
    for (const v of selectedSorted) {
      const existing = next.get(v) ?? { color: null, note: null };
      const ann = { ...existing, note };
      if (!ann.color && !ann.note) next.delete(v);
      else next.set(v, ann);
      await saveAnnotation(user?.id, pos.translation, { book: pos.book, chapter: pos.chapter, verse: v, ...ann });
    }
    setAnnotations(next);
    toast.success(note ? `Note saved on ${refLabel}` : "Note removed");
    clearSelection();
  };

  const sendToEzra = () => {
    navigate("/app/ezra", {
      state: {
        prefill: `Let's study ${refLabel} (${pos.translation}):\n\n"${selectedText}"\n\nWalk me through the context, the original meaning, and how you'd teach it.`,
      },
    });
  };

  const sendToWrite = async () => {
    if (!user) return;
    const md = `> ${selectedText}\n>\n> — ${refLabel} (${pos.translation})\n\n`;
    const { data, error } = await supabase
      .from("documents" as any)
      .insert({
        user_id: user.id,
        title: refLabel,
        content: markdownToTiptapJSON(md) as any,
        content_text: markdownToPlainText(md),
        source: "manual",
        auto_created: false,
      } as any)
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Couldn't create the document");
      return;
    }
    toast.success(`"${refLabel}" opened in Write`);
    navigate(`/app/write/${(data as any).id}`);
  };

  const copySelection = () => {
    navigator.clipboard.writeText(`"${selectedText}" — ${refLabel} (${pos.translation})`);
    toast.success("Copied with reference");
  };

  return (
    <div ref={pageRef} className="bible-surface min-h-full">
      {/* Reading chrome — quiet toolbar in the public site's eyebrow voice */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2.5 md:px-8">
          <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline-flex">
            <BookOpen className="h-3.5 w-3.5 text-accent" />
            Reader
          </span>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <BiblePassagePicker books={books} book={pos.book} chapter={pos.chapter} onSelect={go} />
          <select
            value={pos.translation}
            onChange={(e) => setPos((p) => ({ ...p, translation: e.target.value }))}
            aria-label="Translation"
            className="tactile h-8 rounded-lg border border-border bg-card px-2 text-xs font-medium outline-none hover:border-accent/60"
          >
            {translations.map((t) => (
              <option key={t.id} value={t.id}>{t.id} — {t.name}</option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-1">
            {secondaryTranslation && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setParallel((p) => !p)}
                    aria-pressed={parallel}
                    aria-label="Toggle parallel translation"
                    className={cn(
                      "tactile inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs",
                      parallel
                        ? "border-accent/60 bg-accent/15 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-accent/60 hover:text-foreground",
                    )}
                  >
                    <Columns2 className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">Parallel</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Read {pos.translation} beside {secondaryTranslation}
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleListening}
                  aria-pressed={audio.active}
                  aria-label={audio.active ? "Stop listening" : "Listen to this chapter"}
                  className={cn(
                    "tactile inline-flex h-8 w-8 items-center justify-center rounded-lg border",
                    audio.active
                      ? "border-accent/60 bg-accent/15 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-accent/60 hover:text-foreground",
                  )}
                >
                  {audio.active ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {audio.active ? "Stop" : "Listen to this chapter"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setHighlightsOpen(true)}
                  aria-label="My study: highlights and bookmarks"
                  className="tactile inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-accent/60 hover:text-foreground"
                >
                  <Highlighter className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Highlights &amp; bookmarks</TooltipContent>
            </Tooltip>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="tactile inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground hover:border-accent/60 hover:text-foreground"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded border border-border bg-muted px-1 font-mono text-[10px] sm:inline">/</kbd>
            </button>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous chapter"
              className="tactile inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-accent/60 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next chapter"
              className="tactile inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-accent/60 hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* The spread */}
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-8 md:px-8">
        {translations.length === 0 && !loading ? (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
            <h2 className="font-display text-lg font-semibold">Bible data not bundled</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Run <code className="rounded bg-muted px-1">bun run scripts/bible/transform.ts</code> and{" "}
              <code className="rounded bg-muted px-1">build-search-index.ts</code> to vendor translations.
            </p>
          </div>
        ) : (
          <article key={`${pos.translation}-${pos.book}-${pos.chapter}`} className="bible-spread page-lift">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleChapterBookmark}
                  aria-pressed={chapterBookmarked}
                  aria-label={chapterBookmarked ? "Remove chapter bookmark" : "Bookmark this chapter"}
                  className="bible-ribbon tactile"
                />
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                {chapterBookmarked ? "Remove bookmark" : "Bookmark chapter"}
                <kbd className="ml-1.5 rounded border border-border bg-muted px-1 font-mono text-[10px]">b</kbd>
              </TooltipContent>
            </Tooltip>
            <div className="mb-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                {pos.translation === "KJV" ? "King James Version" : activeTranslation?.name ?? pos.translation}
              </p>
              <h1 className="bible-chapter-title mt-2">{bookMeta?.name ?? pos.book}</h1>
              <div className="mx-auto mt-3 flex items-center justify-center gap-3 text-accent">
                <span className="h-px w-10 bg-accent/50" />
                <span className="font-display text-xl tabular-nums">{pos.chapter}</span>
                <span className="h-px w-10 bg-accent/50" />
              </div>
            </div>

            {loading ? (
              <div className="bible-page space-y-3" aria-label="Loading chapter">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-4 animate-pulse rounded bg-muted/50" style={{ width: `${88 - (i % 4) * 9}%` }} />
                ))}
              </div>
            ) : parallel && secondaryVerses.length > 0 ? (
              // Parallel spread: primary translation on the left page,
              // the companion translation verse-aligned on the right.
              <div className="bible-page-parallel">
                <div className="mb-4 hidden grid-cols-2 gap-x-12 md:grid">
                  {[pos.translation, secondaryTranslation].map((id) => (
                    <p key={id} className="text-center font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                      {id}
                    </p>
                  ))}
                </div>
                {verses.map((v) => {
                  const twin = secondaryVerses.find((s) => s.verse === v.verse);
                  return (
                    <div key={v.verse} className="grid gap-x-12 gap-y-1 border-b border-border/30 py-2 last:border-0 md:grid-cols-2">
                      <div className="bible-page !columns-1 text-left">
                        <VerseSpan v={v} ann={annotations.get(v.verse)} selected={selected.has(v.verse)} landed={landedVerse === v.verse} speaking={audio.speakingVerse === v.verse} bookmarked={verseBookmarks.has(v.verse)} onToggle={toggleVerse} />
                      </div>
                      <p className="bible-page !columns-1 text-left opacity-80">
                        {twin ? (
                          <>
                            <sup className="bible-verse-num">{twin.verse}</sup>
                            {twin.text}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bible-page bible-page--book" role="text">
                {verses.map((v) => (
                  <VerseSpan
                    key={v.verse}
                    v={v}
                    ann={annotations.get(v.verse)}
                    selected={selected.has(v.verse)}
                    landed={landedVerse === v.verse}
                    speaking={audio.speakingVerse === v.verse}
                    bookmarked={verseBookmarks.has(v.verse)}
                    onToggle={toggleVerse}
                  />
                ))}
              </div>
            )}

            <footer className="mt-10 flex items-center justify-between text-xs text-muted-foreground">
              <button type="button" onClick={() => step(-1)} className="tactile inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground">
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                Select verses to highlight · annotate · study
              </span>
              <button type="button" onClick={() => step(1)} className="tactile inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </footer>
          </article>
        )}
      </div>

      {/* Floating verse-action bar */}
      {selectedSorted.length > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="bible-actionbar ezra-artifact-reveal flex max-w-full flex-col gap-2 rounded-2xl border border-border bg-card/95 p-2.5 shadow-xl backdrop-blur">
            {noteOpen && (
              <div className="flex items-end gap-2 px-1 pt-1">
                <textarea
                  autoFocus
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder={`A note on ${refLabel}…`}
                  rows={2}
                  className="min-w-0 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={saveNote}
                  className="tactile shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                >
                  Save note
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="hidden px-1.5 font-display text-xs font-semibold text-accent sm:block">{refLabel}</span>
              <span className="hidden h-5 w-px bg-border sm:block" />
              {HIGHLIGHT_COLORS.map((c) => (
                <Tooltip key={c.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => applyHighlight(c.key)}
                      aria-label={`Highlight ${c.label}`}
                      className="tactile h-7 w-7 rounded-full border border-border/70"
                      style={{ background: c.swatch }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{c.label}</TooltipContent>
                </Tooltip>
              ))}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => applyHighlight(null)}
                    aria-label="Remove highlight"
                    className="tactile inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
                  >
                    <Highlighter className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Remove highlight</TooltipContent>
              </Tooltip>
              <span className="h-5 w-px bg-border" />
              <ActionChip icon={StickyNote} label="Note" onClick={openNote} />
              <ActionChip icon={Bookmark} label="Bookmark" onClick={bookmarkSelection} />
              <ActionChip icon={MessagesSquare} label="Ask Ezra" onClick={sendToEzra} emphasis />
              <ActionChip icon={PenLine} label="To Write" onClick={sendToWrite} />
              <ActionChip icon={Copy} label="Copy" onClick={copySelection} />
              <button
                type="button"
                onClick={clearSelection}
                aria-label="Clear selection"
                className="tactile ml-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <AudioDock
        audio={audio}
        bookName={bookMeta?.name ?? pos.book}
        chapterNumber={pos.chapter}
        raised={selectedSorted.length > 0}
      />

      <StudyDrawer
        open={highlightsOpen}
        onOpenChange={setHighlightsOpen}
        bookNames={bookNames}
        onNavigate={(b, c, v) => go(b, c, v)}
      />

      <BibleSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        translation={pos.translation}
        bookNames={bookNames}
        onNavigate={(b, c, v) => go(b, c, v)}
      />
    </div>
  );
}

/** One tappable verse: number, text, highlight underlay, note dot. */
function VerseSpan({
  v,
  ann,
  selected,
  landed,
  speaking,
  bookmarked,
  onToggle,
}: {
  v: Verse;
  ann: VerseAnnotation | undefined;
  selected: boolean;
  landed?: boolean;
  speaking?: boolean;
  bookmarked?: boolean;
  onToggle: (verse: number) => void;
}) {
  return (
    <span
      data-verse={v.verse}
      onClick={() => onToggle(v.verse)}
      className={cn(
        "bible-verse",
        ann?.color && `bible-hl-${ann.color}`,
        selected && "bible-verse-selected",
        landed && "bible-verse-landed",
        speaking && "bible-verse-speaking",
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(v.verse);
        }
      }}
      aria-pressed={selected}
      aria-label={`Verse ${v.verse}${ann?.note ? " (has note)" : ""}${bookmarked ? " (bookmarked)" : ""}`}
    >
      {bookmarked && <Bookmark className="bible-note-dot fill-current" aria-hidden />}
      <sup className="bible-verse-num">{v.verse}</sup>
      {v.text}
      {ann?.note && (
        <Tooltip>
          <TooltipTrigger asChild>
            <StickyNote className="bible-note-dot" aria-hidden />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-64 text-xs">{ann.note}</TooltipContent>
        </Tooltip>
      )}{" "}
    </span>
  );
}

function ActionChip({
  icon: Icon,
  label,
  onClick,
  emphasis,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "tactile inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium",
        emphasis
          ? "bg-primary text-primary-foreground"
          : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
