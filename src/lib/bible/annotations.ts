/* eslint-disable @typescript-eslint/no-explicit-any --
   `bible_annotations` isn't in the generated Supabase types yet; the repo's
   convention for such tables is untyped `from("…" as any)` access. */
// Highlight + note persistence for the Bible reader.
//
// Primary store is the `bible_annotations` table (per-user, RLS-guarded).
// If the table isn't reachable (offline, migration not yet applied), every
// operation falls back to localStorage so a reader never loses a highlight.
// Keys are translation-agnostic: a highlight on John 3:16 follows the verse
// across translations.

import { supabase } from "@/integrations/supabase/client";

export type HighlightColor = "gold" | "sage" | "sky" | "rose";

export interface VerseAnnotation {
  color: HighlightColor | null;
  note: string | null;
}

export interface AnnotationRecord extends VerseAnnotation {
  book: string;
  chapter: number;
  verse: number;
}

const LS_KEY = "bible.annotations.v1";

type LocalMap = Record<string, VerseAnnotation>; // `${book}|${chapter}|${verse}`

function lsRead(): LocalMap {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

function lsWrite(map: LocalMap) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {
    /* storage full/unavailable — annotation stays in memory for the session */
  }
}

const keyOf = (book: string, chapter: number, verse: number) => `${book}|${chapter}|${verse}`;

/** Load all annotations for one chapter. Returns verse → annotation. */
export async function loadChapterAnnotations(
  userId: string | undefined,
  book: string,
  chapter: number,
): Promise<Map<number, VerseAnnotation>> {
  const out = new Map<number, VerseAnnotation>();
  if (userId) {
    try {
      const { data, error } = await supabase
        .from("bible_annotations" as any)
        .select("verse, color, note")
        .eq("user_id", userId)
        .eq("book", book)
        .eq("chapter", chapter);
      if (!error && data) {
        for (const row of data as any[]) {
          out.set(row.verse, { color: row.color ?? null, note: row.note ?? null });
        }
        return out;
      }
    } catch {
      /* fall through to localStorage */
    }
  }
  const map = lsRead();
  const prefix = `${book}|${chapter}|`;
  for (const [k, v] of Object.entries(map)) {
    if (k.startsWith(prefix)) out.set(Number(k.slice(prefix.length)), v);
  }
  return out;
}

/** Upsert an annotation. Passing color:null and note:null deletes it. */
export async function saveAnnotation(
  userId: string | undefined,
  translation: string,
  rec: AnnotationRecord,
): Promise<void> {
  const empty = !rec.color && !(rec.note && rec.note.trim());
  if (userId) {
    try {
      if (empty) {
        const { error } = await supabase
          .from("bible_annotations" as any)
          .delete()
          .eq("user_id", userId)
          .eq("book", rec.book)
          .eq("chapter", rec.chapter)
          .eq("verse", rec.verse);
        if (!error) return;
      } else {
        const { error } = await supabase
          .from("bible_annotations" as any)
          .upsert(
            {
              user_id: userId,
              translation,
              book: rec.book,
              chapter: rec.chapter,
              verse: rec.verse,
              color: rec.color,
              note: rec.note,
              updated_at: new Date().toISOString(),
            } as any,
            { onConflict: "user_id,book,chapter,verse" },
          );
        if (!error) return;
      }
    } catch {
      /* fall through to localStorage */
    }
  }
  const map = lsRead();
  const k = keyOf(rec.book, rec.chapter, rec.verse);
  if (empty) delete map[k];
  else map[k] = { color: rec.color, note: rec.note };
  lsWrite(map);
}

/** Every highlighted verse across the whole Bible (for a "my highlights" view). */
export async function loadAllAnnotations(userId: string | undefined): Promise<AnnotationRecord[]> {
  if (userId) {
    try {
      const { data, error } = await supabase
        .from("bible_annotations" as any)
        .select("book, chapter, verse, color, note")
        .eq("user_id", userId)
        .order("book")
        .order("chapter")
        .order("verse")
        .limit(1000);
      if (!error && data) return data as unknown as AnnotationRecord[];
    } catch {
      /* fall through */
    }
  }
  const map = lsRead();
  return Object.entries(map).map(([k, v]) => {
    const [book, chapter, verse] = k.split("|");
    return { book, chapter: Number(chapter), verse: Number(verse), ...v };
  });
}
