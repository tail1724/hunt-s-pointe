/**
 * Transform scrollmapper/bible_databases JSON exports into the vendored
 * layout consumed by `src/lib/bible/registry.ts`:
 *
 *   src/data/bibles/manifest.json
 *   src/data/bibles/<TRANSLATION>/<book-slug>.json
 *
 * Source files are the per-translation exports at
 * `formats/json/<TRANSLATION>.json` in the upstream repo. Point SOURCE_DIR
 * at a directory containing one or more of those files:
 *
 *   BIBLE_SOURCE_DIR=/tmp/bible-upstream bun run scripts/bible/transform.ts
 *
 * Then rebuild search shards with `bun run scripts/bible/build-search-index.ts`.
 */

import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const SOURCE_DIR = process.env.BIBLE_SOURCE_DIR || "/tmp/bible-upstream";
const OUT_ROOT = path.resolve(process.cwd(), "src/data/bibles");

// Human-friendly translation names + licenses for the ids we vendor.
const TRANSLATION_META: Record<string, { name: string; lang: string; license: string }> = {
  KJV: { name: "King James Version", lang: "en", license: "Public domain (Crown patent in the UK)" },
  NHEB: { name: "New Heart English Bible", lang: "en", license: "Public domain" },
  ASV: { name: "American Standard Version", lang: "en", license: "Public domain" },
  BBE: { name: "Bible in Basic English", lang: "en", license: "Public domain" },
  YLT: { name: "Young's Literal Translation", lang: "en", license: "Public domain" },
};

type Section =
  | "ot-pentateuch" | "ot-history" | "ot-wisdom" | "ot-prophets-major" | "ot-prophets-minor"
  | "nt-gospels-acts" | "nt-epistles" | "nt-revelation";

const SECTIONS: Record<Section, string[]> = {
  "ot-pentateuch": ["genesis", "exodus", "leviticus", "numbers", "deuteronomy"],
  "ot-history": ["joshua", "judges", "ruth", "i-samuel", "ii-samuel", "i-kings", "ii-kings", "i-chronicles", "ii-chronicles", "ezra", "nehemiah", "esther"],
  "ot-wisdom": ["job", "psalms", "proverbs", "ecclesiastes", "song-of-solomon"],
  "ot-prophets-major": ["isaiah", "jeremiah", "lamentations", "ezekiel", "daniel"],
  "ot-prophets-minor": ["hosea", "joel", "amos", "obadiah", "jonah", "micah", "nahum", "habakkuk", "zephaniah", "haggai", "zechariah", "malachi"],
  "nt-gospels-acts": ["matthew", "mark", "luke", "john", "acts"],
  "nt-epistles": ["romans", "i-corinthians", "ii-corinthians", "galatians", "ephesians", "philippians", "colossians", "i-thessalonians", "ii-thessalonians", "i-timothy", "ii-timothy", "titus", "philemon", "hebrews", "james", "i-peter", "ii-peter", "i-john", "ii-john", "iii-john", "jude"],
  "nt-revelation": ["revelation-of-john"],
};

function sectionFor(slug: string): Section | null {
  for (const [section, slugs] of Object.entries(SECTIONS) as [Section, string[]][]) {
    if (slugs.includes(slug)) return section;
  }
  return null;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

/** "I Samuel" → "1 Samuel", "Revelation of John" → "Revelation". */
function displayName(name: string): string {
  if (name === "Revelation of John") return "Revelation";
  return name
    .replace(/^III /, "3 ")
    .replace(/^II /, "2 ")
    .replace(/^I /, "1 ");
}

/** Strip translator-italics brackets, keep the supplied words. */
function cleanText(text: string): string {
  return text.replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();
}

interface SourceTranslation {
  translation: string;
  books: { name: string; chapters: { chapter: number; verses: { verse: number; text: string }[] }[] }[];
}

async function main() {
  const files = (await readdir(SOURCE_DIR)).filter((f) => f.endsWith(".json"));
  const wanted = files.filter((f) => TRANSLATION_META[path.basename(f, ".json")]);
  if (wanted.length === 0) {
    console.error(`No known translation files found in ${SOURCE_DIR}. Expected e.g. KJV.json, NHEB.json.`);
    process.exit(1);
  }

  const manifest: { translations: unknown[] } = { translations: [] };

  for (const file of wanted.sort()) {
    const id = path.basename(file, ".json");
    const meta = TRANSLATION_META[id];
    const raw: SourceTranslation = JSON.parse(await readFile(path.join(SOURCE_DIR, file), "utf8"));
    const outDir = path.join(OUT_ROOT, id);
    await mkdir(outDir, { recursive: true });

    const books: { slug: string; name: string; section: Section; chapters: number }[] = [];

    for (const book of raw.books) {
      const slug = slugify(book.name);
      const section = sectionFor(slug);
      if (!section) {
        console.warn(`[${id}] skipping unmapped book: ${book.name}`);
        continue;
      }
      // 1-indexed: chapters[chapter][verse] = text.
      const chapters: (string[] | null)[] = [null];
      for (const ch of book.chapters) {
        const verses: (string | null)[] = [null];
        for (const v of ch.verses) verses[v.verse] = cleanText(v.text);
        chapters[ch.chapter] = verses as string[];
      }
      const data = { translation: id, book: slug, chapters };
      await writeFile(path.join(outDir, `${slug}.json`), JSON.stringify(data));
      books.push({ slug, name: displayName(book.name), section, chapters: book.chapters.length });
    }

    manifest.translations.push({ id, name: meta.name, lang: meta.lang, license: meta.license, books });
    console.log(`[${id}] wrote ${books.length} books`);
  }

  await writeFile(path.join(OUT_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`manifest.json: ${manifest.translations.length} translations`);
}

main();
