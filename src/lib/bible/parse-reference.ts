import type { Reference } from "./types";

// Normalized book aliases → canonical slug. Lowercase, no spaces/periods.
const BOOK_ALIASES: Record<string, string> = {
  // Pentateuch
  genesis: "genesis", gen: "genesis", ge: "genesis",
  exodus: "exodus", exo: "exodus", ex: "exodus",
  leviticus: "leviticus", lev: "leviticus", lv: "leviticus",
  numbers: "numbers", num: "numbers", nm: "numbers",
  deuteronomy: "deuteronomy", deut: "deuteronomy", dt: "deuteronomy",
  // History
  joshua: "joshua", josh: "joshua", jos: "joshua",
  judges: "judges", judg: "judges", jdg: "judges",
  ruth: "ruth", rth: "ruth",
  "1samuel": "i-samuel", "1sam": "i-samuel", "isamuel": "i-samuel", "isam": "i-samuel",
  "2samuel": "ii-samuel", "2sam": "ii-samuel", "iisamuel": "ii-samuel", "iisam": "ii-samuel",
  "1kings": "i-kings", "1kgs": "i-kings", "ikings": "i-kings",
  "2kings": "ii-kings", "2kgs": "ii-kings", "iikings": "ii-kings",
  "1chronicles": "i-chronicles", "1chron": "i-chronicles", "1chr": "i-chronicles", "ichron": "i-chronicles",
  "2chronicles": "ii-chronicles", "2chron": "ii-chronicles", "2chr": "ii-chronicles", "iichron": "ii-chronicles",
  ezra: "ezra", ezr: "ezra",
  nehemiah: "nehemiah", neh: "nehemiah",
  esther: "esther", est: "esther",
  // Wisdom
  job: "job",
  psalms: "psalms", psalm: "psalms", ps: "psalms", psa: "psalms",
  proverbs: "proverbs", prov: "proverbs", prv: "proverbs", pr: "proverbs",
  ecclesiastes: "ecclesiastes", eccl: "ecclesiastes", eccles: "ecclesiastes", ec: "ecclesiastes",
  songofsolomon: "song-of-solomon", song: "song-of-solomon", sos: "song-of-solomon", canticles: "song-of-solomon",
  // Major prophets
  isaiah: "isaiah", isa: "isaiah", is: "isaiah",
  jeremiah: "jeremiah", jer: "jeremiah",
  lamentations: "lamentations", lam: "lamentations",
  ezekiel: "ezekiel", ezek: "ezekiel", eze: "ezekiel",
  daniel: "daniel", dan: "daniel", dn: "daniel",
  // Minor prophets
  hosea: "hosea", hos: "hosea",
  joel: "joel", jl: "joel",
  amos: "amos", am: "amos",
  obadiah: "obadiah", obad: "obadiah", ob: "obadiah",
  jonah: "jonah", jon: "jonah",
  micah: "micah", mic: "micah",
  nahum: "nahum", nah: "nahum",
  habakkuk: "habakkuk", hab: "habakkuk",
  zephaniah: "zephaniah", zeph: "zephaniah", zep: "zephaniah",
  haggai: "haggai", hag: "haggai",
  zechariah: "zechariah", zech: "zechariah", zec: "zechariah",
  malachi: "malachi", mal: "malachi",
  // Gospels + Acts
  matthew: "matthew", matt: "matthew", mt: "matthew",
  mark: "mark", mk: "mark", mr: "mark",
  luke: "luke", lk: "luke",
  john: "john", jn: "john", joh: "john",
  acts: "acts", act: "acts",
  // Epistles
  romans: "romans", rom: "romans",
  "1corinthians": "i-corinthians", "1cor": "i-corinthians", icorinthians: "i-corinthians",
  "2corinthians": "ii-corinthians", "2cor": "ii-corinthians", iicorinthians: "ii-corinthians",
  galatians: "galatians", gal: "galatians",
  ephesians: "ephesians", eph: "ephesians",
  philippians: "philippians", phil: "philippians", php: "philippians",
  colossians: "colossians", col: "colossians",
  "1thessalonians": "i-thessalonians", "1thess": "i-thessalonians", "1th": "i-thessalonians", ithess: "i-thessalonians",
  "2thessalonians": "ii-thessalonians", "2thess": "ii-thessalonians", "2th": "ii-thessalonians", iithess: "ii-thessalonians",
  "1timothy": "i-timothy", "1tim": "i-timothy", "1ti": "i-timothy", itim: "i-timothy",
  "2timothy": "ii-timothy", "2tim": "ii-timothy", "2ti": "ii-timothy", iitim: "ii-timothy",
  titus: "titus", tit: "titus",
  philemon: "philemon", phlm: "philemon", phm: "philemon",
  hebrews: "hebrews", heb: "hebrews",
  james: "james", jas: "james", jam: "james",
  "1peter": "i-peter", "1pet": "i-peter", "1pt": "i-peter", ipeter: "i-peter",
  "2peter": "ii-peter", "2pet": "ii-peter", "2pt": "ii-peter", iipeter: "ii-peter",
  "1john": "i-john", "1jn": "i-john", "1jo": "i-john", ijohn: "i-john",
  "2john": "ii-john", "2jn": "ii-john", "2jo": "ii-john", iijohn: "ii-john",
  "3john": "iii-john", "3jn": "iii-john", "3jo": "iii-john", iiijohn: "iii-john",
  jude: "jude", jud: "jude",
  revelation: "revelation-of-john", rev: "revelation-of-john", apocalypse: "revelation-of-john",
};

function normalizeBookKey(raw: string): string {
  return raw.toLowerCase().replace(/\./g, "").replace(/\s+/g, "");
}

export function canonicalizeBook(raw: string): string | null {
  return BOOK_ALIASES[normalizeBookKey(raw)] ?? null;
}

// Matches things like:
//   "John 3:16", "1 John 3:16-18", "Romans 8:28–30", "Ps 23"
const REFERENCE_REGEX = /\b((?:[1-3]|I{1,3})?\s?[A-Za-z]+(?:\s[A-Za-z]+)?)\.?\s+(\d+)(?::(\d+)(?:\s?[-–]\s?(\d+))?)?/g;

/** Parse the first reference in `text`. Returns null if none found. */
export function parseReference(text: string): Reference | null {
  const all = parseAllReferences(text);
  return all[0] ?? null;
}

/** Parse every reference in `text`. */
export function parseAllReferences(text: string): Reference[] {
  const refs: Reference[] = [];
  const seen = new Set<string>();
  REFERENCE_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = REFERENCE_REGEX.exec(text)) !== null) {
    const bookRaw = m[1].trim();
    const chapter = parseInt(m[2], 10);
    const verseStart = m[3] ? parseInt(m[3], 10) : 1;
    const verseEnd = m[4] ? parseInt(m[4], 10) : undefined;
    const book = canonicalizeBook(bookRaw);
    if (!book || !Number.isFinite(chapter)) continue;
    const key = `${book}|${chapter}|${verseStart}|${verseEnd ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ book, chapter, verseStart, verseEnd });
  }
  return refs;
}
