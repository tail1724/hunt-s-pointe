import { describe, it, expect } from "vitest";
import { fuseRRF, recencyScore, blendScore, tagMatchFraction } from "../../../supabase/functions/_shared/rank";

describe("fuseRRF", () => {
  it("fuses two arms with correct ranking", () => {
    const result = fuseRRF([
      { name: "dense", weight: 0.6, ids: ["a", "b", "c"] },
      { name: "sparse", weight: 0.4, ids: ["b", "c", "d"] },
    ], 60, 10);
    expect(result[0].id).toBe("b");
    expect(result[0].arms).toContain("dense");
    expect(result[0].arms).toContain("sparse");
  });

  it("respects limit", () => {
    const result = fuseRRF([
      { name: "a", weight: 1, ids: ["1", "2", "3", "4", "5"] },
    ], 60, 2);
    expect(result).toHaveLength(2);
  });

  it("handles empty arms", () => {
    const result = fuseRRF([{ name: "x", weight: 1, ids: [] }]);
    expect(result).toHaveLength(0);
  });
});

describe("recencyScore", () => {
  it("returns 1 for day 0", () => {
    expect(recencyScore(0)).toBe(1);
  });

  it("returns 0.5 at half-life", () => {
    expect(recencyScore(30, 30)).toBeCloseTo(0.5);
  });

  it("decays over time", () => {
    expect(recencyScore(60, 30)).toBeLessThan(recencyScore(30, 30));
  });

  it("handles negative age", () => {
    expect(recencyScore(-5)).toBe(1);
  });
});

describe("blendScore", () => {
  it("returns a value in [0, 1]", () => {
    const s = blendScore({
      llmRank: 1,
      llmRankOf: 5,
      source: "bible",
      tagMatch: 0.5,
    });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("bible source scores higher than web", () => {
    const base = { llmRank: 1, llmRankOf: 5, tagMatch: 0.5 };
    const bible = blendScore({ ...base, source: "bible" });
    const web = blendScore({ ...base, source: "web" });
    expect(bible).toBeGreaterThan(web);
  });

  it("handles unranked candidates", () => {
    const s = blendScore({ llmRank: null, llmRankOf: 0, source: "collection" });
    expect(s).toBeGreaterThan(0);
  });
});

describe("tagMatchFraction", () => {
  it("returns 1 when all terms match", () => {
    expect(tagMatchFraction("prodigal son parable", ["prodigal", "parable", "son"])).toBe(1);
  });

  it("returns 0 for no tags", () => {
    expect(tagMatchFraction("test query", [])).toBe(0);
    expect(tagMatchFraction("test query", null)).toBe(0);
  });

  it("ignores short words", () => {
    expect(tagMatchFraction("the of an", ["the", "of"])).toBe(0);
  });

  it("partial match returns fraction", () => {
    const score = tagMatchFraction("grace mercy justice", ["grace", "love"]);
    expect(score).toBeCloseTo(1 / 3);
  });
});
