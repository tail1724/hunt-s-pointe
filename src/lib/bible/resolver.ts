import { getRange } from "./lookup";
import { parseAllReferences } from "./parse-reference";
import { isBibleDataAvailable } from "./registry";
import { search } from "./search";
import type { Verse } from "./types";

export interface ScripturePrefs {
  primary_translation: string;
  secondary_translation?: string | null;
  tradition: string;
  prose_style: string;
  reading_level: number;
  citation_density: "Sparse" | "Balanced" | "Dense" | string;
}

export interface BibleContext {
  prefs: ScripturePrefs;
  /** Verses pre-resolved for the model to ground its prose on. */
  verses: Verse[];
  /** How the verses were found (helps the model know whether they're authoritative). */
  source: "reference" | "search" | "mixed";
  /** Original query, for the model's reference. */
  query: string;
}

/**
 * Turn a free-form user query into a BibleContext, or null if the query has
 * no detectable scripture intent and no useful search hits.
 *
 * Order of operations:
 *   1. Parse any explicit references in the query.
 *   2. Resolve them via getRange().
 *   3. If no references, run a full-text search() to surface thematic verses.
 *   4. Cap at ~12 verses, dedupe.
 */
export async function buildBibleContext(query: string, prefs: ScripturePrefs): Promise<BibleContext | null> {
  if (!query.trim()) return null;
  if (!(await isBibleDataAvailable())) return null;

  const translation = prefs.primary_translation || "KJV";
  const refs = parseAllReferences(query);
  const verses: Verse[] = [];
  let source: BibleContext["source"] = "search";

  if (refs.length > 0) {
    source = "reference";
    for (const ref of refs) {
      const range = await getRange(translation, ref);
      verses.push(...range);
      if (verses.length >= 24) break;
    }
  }

  if (verses.length < 12) {
    // Augment with search-driven verses.
    const remaining = 12 - verses.length;
    const hits = await search(query, { translation, limit: remaining * 2 });
    const seen = new Set(verses.map((v) => verseKey(v)));
    for (const h of hits) {
      const k = verseKey(h);
      if (seen.has(k)) continue;
      seen.add(k);
      verses.push({ translation: h.translation, book: h.book, chapter: h.chapter, verse: h.verse, text: h.text });
      if (verses.length >= 12) break;
    }
    if (verses.length > 0 && source === "reference") source = "mixed";
  }

  if (verses.length === 0) return null;

  return { prefs, verses, source, query };
}

function verseKey(v: Verse) {
  return `${v.translation}|${v.book}|${v.chapter}|${v.verse}`;
}
