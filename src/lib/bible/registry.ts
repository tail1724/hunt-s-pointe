import type { BibleManifest, BookData, TranslationMeta } from "./types";

/**
 * Lazy registry over `src/data/bibles/`.
 *
 * Layout (produced by `scripts/bible/transform.ts`):
 *   src/data/bibles/manifest.json
 *   src/data/bibles/<translation>/<book>.json
 *   src/data/bibles/search/manifest.json
 *   src/data/bibles/search/<lang>/<shard>.json
 *
 * Every JSON file is dynamically imported so the initial bundle stays small.
 */

type Mod<T> = { default: T } | T;
function unwrap<T>(m: Mod<T>): T {
  return (m && typeof m === "object" && "default" in (m as any))
    ? (m as { default: T }).default
    : (m as T);
}

const BOOK_GLOB = import.meta.glob<Mod<BookData>>("../../data/bibles/*/*.json");

const ROOT_MANIFEST_GLOB = import.meta.glob<Mod<{ translations: TranslationMeta[] }>>(
  "../../data/bibles/manifest.json",
);

const SEARCH_MANIFEST_GLOB = import.meta.glob<Mod<NonNullable<BibleManifest["search"]>>>(
  "../../data/bibles/search/manifest.json",
);

const SHARD_GLOB = import.meta.glob<Mod<unknown>>("../../data/bibles/search/*/*.json");

// ---------- Manifest ----------

let manifestPromise: Promise<BibleManifest> | null = null;

export function getManifest(): Promise<BibleManifest> {
  if (!manifestPromise) {
    manifestPromise = (async () => {
      const rootKey = Object.keys(ROOT_MANIFEST_GLOB)[0];
      const searchKey = Object.keys(SEARCH_MANIFEST_GLOB)[0];
      const root = rootKey ? unwrap(await ROOT_MANIFEST_GLOB[rootKey]()) : { translations: [] as TranslationMeta[] };
      const search = searchKey ? unwrap(await SEARCH_MANIFEST_GLOB[searchKey]()) : undefined;
      return { translations: root.translations ?? [], search };
    })();
  }
  return manifestPromise;
}

export async function listTranslations(): Promise<TranslationMeta[]> {
  const m = await getManifest();
  return m.translations;
}

export async function getTranslation(id: string): Promise<TranslationMeta | undefined> {
  const m = await getManifest();
  return m.translations.find((t) => t.id === id);
}

// ---------- Book LRU cache ----------

const BOOK_CACHE_LIMIT = 32;
const bookCache = new Map<string, BookData>();

function bookKey(translation: string, book: string) {
  return `${translation}/${book}`;
}

function pathFor(translation: string, book: string): string {
  return `../../data/bibles/${translation}/${book}.json`;
}

export async function loadBook(translation: string, book: string): Promise<BookData | null> {
  const key = bookKey(translation, book);
  const cached = bookCache.get(key);
  if (cached) {
    bookCache.delete(key);
    bookCache.set(key, cached);
    return cached;
  }
  const loader = BOOK_GLOB[pathFor(translation, book)];
  if (!loader) return null;
  try {
    const data = unwrap(await loader());
    bookCache.set(key, data);
    if (bookCache.size > BOOK_CACHE_LIMIT) {
      const first = bookCache.keys().next().value;
      if (first) bookCache.delete(first);
    }
    return data;
  } catch (err) {
    console.warn("[bible] failed to load", key, err);
    return null;
  }
}

// ---------- Search shard cache ----------

const SHARD_CACHE_LIMIT = 12;
const shardCache = new Map<string, unknown>();

export function shardPath(lang: string, shardKey: string): string {
  return `../../data/bibles/search/${lang}/${shardKey}.json`;
}

export async function loadShardRaw(lang: string, shardKey: string): Promise<unknown | null> {
  const cacheKey = `${lang}/${shardKey}`;
  const cached = shardCache.get(cacheKey);
  if (cached) {
    shardCache.delete(cacheKey);
    shardCache.set(cacheKey, cached);
    return cached;
  }
  const loader = SHARD_GLOB[shardPath(lang, shardKey)];
  if (!loader) return null;
  try {
    const data = unwrap(await loader());
    shardCache.set(cacheKey, data);
    if (shardCache.size > SHARD_CACHE_LIMIT) {
      const first = shardCache.keys().next().value;
      if (first) shardCache.delete(first);
    }
    return data;
  } catch (err) {
    console.warn("[bible] failed to load shard", cacheKey, err);
    return null;
  }
}

/** True if any vendored data is present in the bundle. */
export async function isBibleDataAvailable(): Promise<boolean> {
  const m = await getManifest();
  return (m.translations?.length ?? 0) > 0;
}
