/**
 * Generates the Ezra Guide assistant's retrieval corpus from the single source
 * of truth (src/data/guides.ts) into the edge function directory. The Deno
 * edge function cannot import from src/, so we emit a plain JSON snapshot.
 *
 * Run after editing guides:  bunx tsx scripts/build-help-corpus.ts
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GUIDES } from "../src/data/guides";

interface CorpusChunk {
  guideSlug: string;
  guideTitle: string;
  category: string;
  heading: string;
  text: string;
  actions: { label: string; to: string }[];
}

const chunks: CorpusChunk[] = [];

for (const g of GUIDES) {
  // A guide-level chunk (summary + intro) plus one chunk per step.
  chunks.push({
    guideSlug: g.slug,
    guideTitle: g.title,
    category: g.category,
    heading: g.title,
    text: `${g.summary} ${g.intro}`,
    actions: [],
  });
  for (const step of g.steps) {
    chunks.push({
      guideSlug: g.slug,
      guideTitle: g.title,
      category: g.category,
      heading: step.heading,
      text: step.body.replace(/[*_`]/g, ""),
      actions: step.action ? [step.action] : [],
    });
  }
}

const dir = dirname(fileURLToPath(import.meta.url));
const out = resolve(dir, "../supabase/functions/help-assist/corpus.json");
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), chunks }, null, 2));
console.log(`help-assist corpus: ${chunks.length} chunks → ${out}`);
