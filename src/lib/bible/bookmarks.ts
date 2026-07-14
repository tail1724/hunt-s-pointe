// Bookmark persistence for the Bible reader.
//
// Same architecture as annotations.ts: primary store is the `bible_bookmarks`
// table (per-user, RLS-guarded); every operation falls back to localStorage so
// a signed-out or offline reader never loses a bookmark. Keys are
// translation-agnostic. `verse: null` is a whole-chapter bookmark (the ribbon).

import { supabase } from "@/integrations/supabase/client";

export interface BookmarkRecord {
  book: string;
  chapter: number;
  verse: number | null;
  label: string | null;
  created_at: string;
}

const LS_KEY = "bible.bookmarks.v1";

type LocalMap = Record<string, { label: string | null; created_at: string }>;

const keyOf = (book: string, chapter: number, verse: number | null) =>
  `${book}|${chapter}|${verse ?? "chapter"}`;

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
    /* storage full/unavailable — bookmark stays in memory for the session */
  }
}

/** All bookmarks in one chapter. `verse: null` entry = chapter ribbon. */
export async function loadChapterBookmarks(
  userId: string | undefined,
  book: string,
  chapter: number,
): Promise<BookmarkRecord[]> {
  if (userId) {
    try {
      const { data, error } = await supabase
        .from("bible_bookmarks")
        .select("book, chapter, verse, label, created_at")
        .eq("user_id", userId)
        .eq("book", book)
        .eq("chapter", chapter);
      if (!error && data) return data;
    } catch {
      /* fall through to localStorage */
    }
  }
  const map = lsRead();
  const prefix = `${book}|${chapter}|`;
  return Object.entries(map)
    .filter(([k]) => k.startsWith(prefix))
    .map(([k, v]) => {
      const raw = k.slice(prefix.length);
      return {
        book,
        chapter,
        verse: raw === "chapter" ? null : Number(raw),
        label: v.label,
        created_at: v.created_at,
      };
    });
}

/**
 * Toggle a bookmark on a chapter (verse null) or verse.
 * Returns true when the bookmark now exists, false when it was removed.
 */
export async function toggleBookmark(
  userId: string | undefined,
  translation: string,
  book: string,
  chapter: number,
  verse: number | null,
  exists: boolean,
): Promise<boolean> {
  if (userId) {
    try {
      if (exists) {
        let q = supabase
          .from("bible_bookmarks")
          .delete()
          .eq("user_id", userId)
          .eq("book", book)
          .eq("chapter", chapter);
        q = verse === null ? q.is("verse", null) : q.eq("verse", verse);
        const { error } = await q;
        if (!error) return false;
      } else {
        const { error } = await supabase.from("bible_bookmarks").insert({
          user_id: userId,
          translation,
          book,
          chapter,
          verse,
        });
        // 23505 = unique violation: it already exists, treat as bookmarked.
        if (!error || error.code === "23505") return true;
      }
    } catch {
      /* fall through to localStorage */
    }
  }
  const map = lsRead();
  const k = keyOf(book, chapter, verse);
  if (exists) delete map[k];
  else map[k] = { label: null, created_at: new Date().toISOString() };
  lsWrite(map);
  return !exists;
}

/** Every bookmark, newest first (for the Study drawer). */
export async function loadAllBookmarks(userId: string | undefined): Promise<BookmarkRecord[]> {
  if (userId) {
    try {
      const { data, error } = await supabase
        .from("bible_bookmarks")
        .select("book, chapter, verse, label, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (!error && data) return data;
    } catch {
      /* fall through */
    }
  }
  const map = lsRead();
  return Object.entries(map)
    .map(([k, v]) => {
      const [book, chapter, raw] = k.split("|");
      return {
        book,
        chapter: Number(chapter),
        verse: raw === "chapter" ? null : Number(raw),
        label: v.label,
        created_at: v.created_at,
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
