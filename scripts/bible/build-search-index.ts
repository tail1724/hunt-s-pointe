/**
 * Build sharded MiniSearch indices for every vendored translation.
 *
 * Reads `src/data/bibles/manifest.json` and `src/data/bibles/<TR>/<book>.json`
 * (produced by `transform.ts`) and emits:
 *
 *   src/data/bibles/search/manifest.json
 *   src/data/bibles/search/<lang>/<shard-key>.json
 *
 * Each shard covers a canonical set of books and stays under
 * PER_SHARD_BUDGET_BYTES (8 MB). Oversize shards are split alphabetically by
 * book name into `<shard>-a.json` / `<shard>-b.json` (recursive halving).
 *
 * Run with: bun run scripts/bible/build-search-index.ts
 */

import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import MiniSearch from "minisearch";

const ROOT = path.resolve(process.cwd(), "src/data/bibles");
const SEARCH_DIR = path.join(ROOT, "search");
const PER_SHARD_BUDGET_BYTES = 8 * 1024 * 1024;

const SHARDS: Record<string, string[]> = {
  "ot-pentateuch": ["genesis", "exodus", "leviticus", "numbers", "deuteronomy"],
  "ot-history": ["joshua", "judges", "ruth", "i-samuel", "ii-samuel", "i-kings", "ii-kings", "i-chronicles", "ii-chronicles", "ezra", "nehemiah", "esther"],
  "ot-wisdom": ["job", "psalms", "proverbs", "ecclesiastes", "song-of-solomon"],
  "ot-prophets-major": ["isaiah", "jeremiah", "lamentations", "ezekiel", "daniel"],
  "ot-prophets-minor": ["hosea", "joel", "amos", "obadiah", "jonah", "micah", "nahum", "habakkuk", "zephaniah", "haggai", "zechariah", "malachi"],
  "nt-gospels-acts": ["matthew", "mark", "luke", "john", "acts"],
  "nt-epistles": ["romans", "i-corinthians", "ii-corinthians", "galatians", "ephesians", "philippians", "colossians", "i-thessalonians", "ii-thessalonians", "i-timothy", "ii-timothy", "titus", "philemon", "hebrews", "james", "i-peter", "ii-peter", "i-john", "ii-john", "iii-john", "jude"],
  "nt-revelation": ["revelation-of-john"],
};

interface BookData {
  translation: string;
  book: string;
  chapters: string[][];
}

interface Doc {
  id: string;
  translation: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

async function loadBook(translation: string, book: string): Promise<BookData | null> {
  const file = path.join(ROOT, translation, `${book}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

function collectDocs(translation: string, book: BookData): Doc[] {
  const docs: Doc[] = [];
  for (let c = 1; c < book.chapters.length; c++) {
    const verses = book.chapters[c];
    if (!verses) continue;
    for (let v = 1; v < verses.length; v++) {
      const text = verses[v];
      if (!text) continue;
      docs.push({
        id: `${translation}|${book.book}|${c}|${v}`,
        translation,
        book: book.book,
        chapter: c,
        verse: v,
        text,
      });
    }
  }
  return docs;
}

function buildIndex(docs: Doc[]): MiniSearch<Doc> {
  const idx = new MiniSearch<Doc>({
    idField: "id",
    fields: ["text"],
    storeFields: ["translation", "book", "chapter", "verse", "text"],
    searchOptions: { prefix: true, fuzzy: 0.2 },
  });
  idx.addAll(docs);
  return idx;
}

async function writeShard(lang: string, shardKey: string, docs: Doc[], books: string[]): Promise<{ key: string; books: string[] }[]> {
  if (docs.length === 0) return [];
  const idx = buildIndex(docs);
  const json = JSON.stringify(idx.toJSON());
  const size = Buffer.byteLength(json, "utf8");
  const dir = path.join(SEARCH_DIR, lang);
  await mkdir(dir, { recursive: true });

  if (size <= PER_SHARD_BUDGET_BYTES || books.length === 1) {
    await writeFile(path.join(dir, `${shardKey}.json`), json);
    console.log(`  [${lang}] ${shardKey}: ${(size / 1024 / 1024).toFixed(2)} MB (${docs.length} verses)`);
    return [{ key: shardKey, books }];
  }

  // Split alphabetically.
  const sorted = [...books].sort();
  const mid = Math.ceil(sorted.length / 2);
  const a = new Set(sorted.slice(0, mid));
  const b = new Set(sorted.slice(mid));
  const docsA = docs.filter((d) => a.has(d.book));
  const docsB = docs.filter((d) => b.has(d.book));
  const out: { key: string; books: string[] }[] = [];
  out.push(...await writeShard(lang, `${shardKey}-a`, docsA, [...a]));
  out.push(...await writeShard(lang, `${shardKey}-b`, docsB, [...b]));
  return out;
}

async function main() {
  if (!existsSync(ROOT)) {
    console.error("No src/data/bibles/ — run bible:fetch and bible:transform first.");
    process.exit(1);
  }
  const manifestPath = path.join(ROOT, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error("No manifest.json — run bible:transform first.");
    process.exit(1);
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const translations: { id: string; lang: string }[] = manifest.translations ?? [];
  if (translations.length === 0) {
    console.warn("Manifest has no translations; nothing to index.");
    return;
  }

  // Group by language.
  const byLang = new Map<string, string[]>();
  for (const t of translations) {
    const arr = byLang.get(t.lang) ?? [];
    arr.push(t.id);
    byLang.set(t.lang, arr);
  }

  const shardManifest: Record<string, { shards: { key: string; books: string[] }[] }> = {};

  for (const [lang, langTranslations] of byLang.entries()) {
    console.log(`\n[${lang}] indexing ${langTranslations.length} translation(s)...`);
    const langShards: { key: string; books: string[] }[] = [];

    for (const [shardKey, shardBooks] of Object.entries(SHARDS)) {
      const docs: Doc[] = [];
      for (const tr of langTranslations) {
        for (const book of shardBooks) {
          const data = await loadBook(tr, book);
          if (!data) continue;
          docs.push(...collectDocs(tr, data));
        }
      }
      const written = await writeShard(lang, shardKey, docs, shardBooks);
      langShards.push(...written);
    }

    shardManifest[lang] = { shards: langShards };
  }

  await mkdir(SEARCH_DIR, { recursive: true });
  await writeFile(path.join(SEARCH_DIR, "manifest.json"), JSON.stringify(shardManifest, null, 2));
  console.log("\n✓ Search index manifest written to src/data/bibles/search/manifest.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
