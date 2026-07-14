import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GUIDES } from "./guides";

// The Ezra Guide assistant reads a generated snapshot of the guides
// (supabase/functions/help-assist/corpus.json). If someone edits guides.ts and
// forgets to run `bunx tsx scripts/build-help-corpus.ts`, the assistant would
// answer from stale content — so fail the build until it's regenerated.
describe("help-assist corpus is in sync with guides.ts", () => {
  const corpus = JSON.parse(
    readFileSync(resolve(__dirname, "../../supabase/functions/help-assist/corpus.json"), "utf8"),
  ) as { chunks: { guideSlug: string; heading: string }[] };

  it("has one chunk per guide plus one per step", () => {
    const expected = GUIDES.length + GUIDES.reduce((n, g) => n + g.steps.length, 0);
    expect(corpus.chunks.length).toBe(expected);
  });

  it("covers every guide slug", () => {
    const corpusSlugs = new Set(corpus.chunks.map((c) => c.guideSlug));
    for (const g of GUIDES) expect(corpusSlugs.has(g.slug)).toBe(true);
  });

  it("includes every step heading", () => {
    const headings = new Set(corpus.chunks.map((c) => c.heading));
    for (const g of GUIDES) {
      for (const step of g.steps) expect(headings.has(step.heading)).toBe(true);
    }
  });
});
