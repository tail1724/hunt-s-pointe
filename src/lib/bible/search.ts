import MiniSearch from "minisearch";
import { getManifest, loadShardRaw } from "./registry";
import { shardForBook, shardsForScope } from "./scopes";
import type { SearchHit, SearchOptions } from "./types";

const indexCache = new Map<string, MiniSearch>();

interface ShardDoc {
  id: string;
  translation: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

async function loadIndex(lang: string, shardKey: string): Promise<MiniSearch | null> {
  const key = `${lang}/${shardKey}`;
  const cached = indexCache.get(key);
  if (cached) return cached;
  const raw = await loadShardRaw(lang, shardKey);
  if (!raw) return null;
  try {
    const idx = MiniSearch.loadJSON<ShardDoc>(typeof raw === "string" ? raw : JSON.stringify(raw), {
      fields: ["text"],
      storeFields: ["translation", "book", "chapter", "verse", "text"],
    });
    indexCache.set(key, idx);
    return idx;
  } catch (err) {
    console.warn("[bible] failed to deserialize shard", key, err);
    return null;
  }
}

/**
 * Full-text search across the vendored Bible corpus.
 *
 * - `translation` constrains hits to a single translation.
 * - `lang` (default "en") picks which language shards to load.
 * - `book` loads only the shard containing that book.
 * - `scope` (e.g. "ot", "nt", "gospels") loads only matching shards.
 */
export async function search(query: string, opts: SearchOptions = {}): Promise<SearchHit[]> {
  if (!query.trim()) return [];
  const lang = opts.lang ?? "en";
  const limit = opts.limit ?? 12;

  const manifest = await getManifest();
  const langManifest = manifest.search?.[lang];
  if (!langManifest) return [];

  // Decide which shards to query.
  let shardKeys: string[];
  if (opts.book) {
    const shard = shardForBook(opts.book);
    shardKeys = shard ? [shard] : [];
  } else if (opts.scope) {
    const wanted = new Set(shardsForScope(opts.scope));
    shardKeys = langManifest.shards
      .filter((s) => wanted.has(s.key as any) || [...wanted].some((w) => s.key.startsWith(w)))
      .map((s) => s.key);
  } else {
    shardKeys = langManifest.shards.map((s) => s.key);
  }

  const indices = (await Promise.all(shardKeys.map((k) => loadIndex(lang, k)))).filter(Boolean) as MiniSearch[];
  if (indices.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const idx of indices) {
    const results = idx.search(query, { prefix: true, fuzzy: 0.2 });
    for (const r of results) {
      if (opts.translation && (r as any).translation !== opts.translation) continue;
      if (opts.book && (r as any).book !== opts.book) continue;
      hits.push({
        translation: (r as any).translation,
        book: (r as any).book,
        chapter: (r as any).chapter,
        verse: (r as any).verse,
        text: (r as any).text,
        score: r.score,
      });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  // Deduplicate by translation+book+chapter+verse, keeping highest score.
  const seen = new Set<string>();
  const deduped: SearchHit[] = [];
  for (const h of hits) {
    const k = `${h.translation}|${h.book}|${h.chapter}|${h.verse}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(h);
    if (deduped.length >= limit) break;
  }
  return deduped;
}
