// Shared Bible types used by registry, lookup, search, and resolver.

export interface TranslationMeta {
  /** Short identifier, matches the folder under src/data/bibles/. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** ISO 639-1/-3 language code, lowercased. */
  lang: string;
  /** Books available in this translation. */
  books: BookMeta[];
  /** Public-domain / open-license attribution. */
  license?: string;
}

export interface BookMeta {
  /** Canonical slug (e.g. "genesis", "i-corinthians"). */
  slug: string;
  /** Display name (e.g. "Genesis", "1 Corinthians"). */
  name: string;
  /** Canonical testament/section bucket. */
  section: BookSection;
  /** Number of chapters in this book in this translation. */
  chapters: number;
}

export type BookSection =
  | "ot-pentateuch"
  | "ot-history"
  | "ot-wisdom"
  | "ot-prophets-major"
  | "ot-prophets-minor"
  | "nt-gospels-acts"
  | "nt-epistles"
  | "nt-revelation"
  | "deuterocanonical";

export type BibleScope = "all" | "ot" | "nt" | "gospels" | "epistles" | BookSection;

export interface BookData {
  translation: string;
  book: string;
  /** 1-indexed: chapters[chapter][verse] = text. chapters[0] and verses[0] are unused. */
  chapters: string[][];
}

export interface Reference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
}

export interface Verse {
  translation: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface SearchHit extends Verse {
  score: number;
}

export interface SearchOptions {
  translation?: string;
  lang?: string;
  book?: string;
  scope?: BibleScope;
  limit?: number;
}

export interface BibleManifest {
  translations: TranslationMeta[];
  /** Search shard manifest, keyed by lang. */
  search?: SearchShardManifest;
}

export interface SearchShardManifest {
  [lang: string]: {
    shards: { key: string; books: string[] }[];
  };
}
