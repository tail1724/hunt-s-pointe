import type { BibleScope, BookSection } from "./types";

/**
 * Canonical shard definitions. Used by both `scripts/bible/build-search-index.ts`
 * (at build-time, to slice indices) and the runtime registry (to know which
 * shard to load for a given book/scope).
 *
 * Every book listed here uses lowercase, hyphenated slugs that match the file
 * naming convention under `src/data/bibles/<translation>/<book>.json`.
 */
export const SHARD_DEFINITIONS: Record<BookSection, string[]> = {
  "ot-pentateuch": ["genesis", "exodus", "leviticus", "numbers", "deuteronomy"],
  "ot-history": [
    "joshua", "judges", "ruth",
    "i-samuel", "ii-samuel",
    "i-kings", "ii-kings",
    "i-chronicles", "ii-chronicles",
    "ezra", "nehemiah", "esther",
  ],
  "ot-wisdom": ["job", "psalms", "proverbs", "ecclesiastes", "song-of-solomon"],
  "ot-prophets-major": ["isaiah", "jeremiah", "lamentations", "ezekiel", "daniel"],
  "ot-prophets-minor": [
    "hosea", "joel", "amos", "obadiah", "jonah", "micah",
    "nahum", "habakkuk", "zephaniah", "haggai", "zechariah", "malachi",
  ],
  "nt-gospels-acts": ["matthew", "mark", "luke", "john", "acts"],
  "nt-epistles": [
    "romans", "i-corinthians", "ii-corinthians", "galatians", "ephesians",
    "philippians", "colossians", "i-thessalonians", "ii-thessalonians",
    "i-timothy", "ii-timothy", "titus", "philemon", "hebrews", "james",
    "i-peter", "ii-peter", "i-john", "ii-john", "iii-john", "jude",
  ],
  "nt-revelation": ["revelation-of-john"],
  // Catholic/Orthodox deuterocanonicals. Surfaced only when the translation
  // includes them; never indexed in the main shards.
  deuterocanonical: [
    "tobit", "judith", "wisdom", "sirach", "baruch",
    "i-maccabees", "ii-maccabees", "iii-maccabees", "iv-maccabees",
    "i-esdras", "ii-esdras",
    "additional-psalm", "prayer-of-manasses", "prayer-of-azariah",
    "susanna", "bel-and-the-dragon",
    "additions-to-esther", "additions-to-daniel",
    "epistle-of-jeremiah", "laodiceans",
    "psalms-of-solomon", "i-enoch", "odes", "esther-greek",
  ],
};

export const SHARD_ORDER: BookSection[] = [
  "ot-pentateuch",
  "ot-history",
  "ot-wisdom",
  "ot-prophets-major",
  "ot-prophets-minor",
  "nt-gospels-acts",
  "nt-epistles",
  "nt-revelation",
];

/** Reverse lookup: book slug → shard key. */
const BOOK_TO_SHARD: Record<string, BookSection> = (() => {
  const out: Record<string, BookSection> = {};
  for (const [shard, books] of Object.entries(SHARD_DEFINITIONS)) {
    for (const b of books) out[b] = shard as BookSection;
  }
  return out;
})();

export function shardForBook(bookSlug: string): BookSection | null {
  return BOOK_TO_SHARD[bookSlug] ?? null;
}

/** Expand a high-level scope into the concrete shard keys to load. */
export function shardsForScope(scope: BibleScope): BookSection[] {
  switch (scope) {
    case "all":
      return SHARD_ORDER;
    case "ot":
      return ["ot-pentateuch", "ot-history", "ot-wisdom", "ot-prophets-major", "ot-prophets-minor"];
    case "nt":
      return ["nt-gospels-acts", "nt-epistles", "nt-revelation"];
    case "gospels":
      return ["nt-gospels-acts"];
    case "epistles":
      return ["nt-epistles"];
    default:
      return [scope as BookSection];
  }
}

/** Per-shard byte budget. Build-time scripts may split further to stay under this. */
export const PER_SHARD_BUDGET_BYTES = 8 * 1024 * 1024;
