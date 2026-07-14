import { loadBook } from "./registry";
import type { Reference, Verse } from "./types";

export async function getVerse(translation: string, ref: Reference): Promise<Verse | null> {
  const book = await loadBook(translation, ref.book);
  if (!book) return null;
  const chapter = book.chapters[ref.chapter];
  if (!chapter) return null;
  const text = chapter[ref.verseStart];
  if (text == null) return null;
  return { translation, book: ref.book, chapter: ref.chapter, verse: ref.verseStart, text };
}

export async function getChapter(translation: string, book: string, chapter: number): Promise<Verse[]> {
  const data = await loadBook(translation, book);
  if (!data) return [];
  const verses = data.chapters[chapter];
  if (!verses) return [];
  const out: Verse[] = [];
  for (let v = 1; v < verses.length; v++) {
    const text = verses[v];
    if (text != null) out.push({ translation, book, chapter, verse: v, text });
  }
  return out;
}

export async function getRange(translation: string, ref: Reference): Promise<Verse[]> {
  const data = await loadBook(translation, ref.book);
  if (!data) return [];
  const chapter = data.chapters[ref.chapter];
  if (!chapter) return [];
  const start = ref.verseStart;
  const end = ref.verseEnd ?? ref.verseStart;
  const out: Verse[] = [];
  for (let v = start; v <= end; v++) {
    const text = chapter[v];
    if (text != null) out.push({ translation, book: ref.book, chapter: ref.chapter, verse: v, text });
  }
  return out;
}

/** Format a reference for display, e.g. "John 3:16-18". */
export function formatReference(ref: Reference, displayBook?: string): string {
  const book = displayBook ?? prettyBook(ref.book);
  const verses = ref.verseEnd && ref.verseEnd !== ref.verseStart
    ? `${ref.verseStart}-${ref.verseEnd}`
    : `${ref.verseStart}`;
  return `${book} ${ref.chapter}:${verses}`;
}

function prettyBook(slug: string): string {
  return slug
    .split("-")
    .map((part) => {
      if (part === "i") return "1";
      if (part === "ii") return "2";
      if (part === "iii") return "3";
      return part[0]?.toUpperCase() + part.slice(1);
    })
    .join(" ");
}
