import { describe, expect, it } from "vitest";
import { getChapter, getVerse, listTranslations, search } from "./index";

// Exercises the vendored corpus end-to-end: manifest → book lookup → search
// shards. Guards against a bad transform or index rebuild shipping silently.
describe("vendored bible data", () => {
  it("lists the vendored translations with 66 books each", async () => {
    const ts = await listTranslations();
    const ids = ts.map((t) => t.id);
    expect(ids).toContain("KJV");
    expect(ids).toContain("NHEB");
    for (const t of ts) expect(t.books).toHaveLength(66);
  });

  it("looks up John 3:16 in the KJV", async () => {
    const v = await getVerse("KJV", { book: "john", chapter: 3, verseStart: 16 });
    expect(v?.text).toMatch(/For God so loved the world/);
  });

  it("reads a whole chapter with 1-indexed verses", async () => {
    const verses = await getChapter("NHEB", "psalms", 23);
    expect(verses.length).toBeGreaterThanOrEqual(6);
    expect(verses[0].verse).toBe(1);
    expect(verses[0].text.toLowerCase()).toContain("shepherd");
  });

  it("finds verses by full-text search", async () => {
    const hits = await search("still small voice", { translation: "KJV", scope: "ot" });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].book).toBe("i-kings");
    expect(hits[0].chapter).toBe(19);
  }, 30_000);
});
