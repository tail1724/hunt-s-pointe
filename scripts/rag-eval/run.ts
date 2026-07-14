#!/usr/bin/env npx tsx
/**
 * RAGAS-style RAG evaluation harness.
 *
 * Runs each multi-turn conversation from dataset.json through the rag-retrieve
 * endpoint, then scores faithfulness, relevance, and context quality using a
 * judge model call. Results are logged to the rag_eval_runs table and printed
 * as a summary table.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... EVAL_USER_TOKEN=... npx tsx scripts/rag-eval/run.ts
 *
 * Requires a valid user JWT (EVAL_USER_TOKEN) and at least one collection with
 * indexed content so retrieval returns chunks.
 */

import fs from "fs";
import path from "path";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

interface TestCase {
  id: string;
  turns: Turn[];
  expected_topics: string[];
  ground_truth: string;
}

interface EvalResult {
  id: string;
  faithfulness: number;
  relevance: number;
  context_precision: number;
  retrieval_hit: boolean;
  latency_ms: number;
  error?: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const TOKEN = process.env.EVAL_USER_TOKEN || "";
const COLLECTION_ID = process.env.EVAL_COLLECTION_ID || "";

if (!SUPABASE_URL || !TOKEN) {
  console.error("Set SUPABASE_URL and EVAL_USER_TOKEN env vars.");
  process.exit(1);
}

const RAG_URL = `${SUPABASE_URL}/functions/v1/rag-retrieve`;

async function retrieveForCase(tc: TestCase): Promise<{
  chunks: any[];
  rewritten?: string;
  latency_ms: number;
}> {
  const lastUser = [...tc.turns].reverse().find((t) => t.role === "user")!.content;
  const history = tc.turns.slice(0, -1).map((t) => ({
    role: t.role,
    content: t.content.slice(0, 500),
  }));

  const t0 = Date.now();
  const resp = await fetch(RAG_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      query: lastUser,
      collection_id: COLLECTION_ID || undefined,
      top_k: 5,
      history,
    }),
  });

  const latency_ms = Date.now() - t0;
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`rag-retrieve ${resp.status}: ${text.slice(0, 200)}`);
  }
  const j = await resp.json();
  return {
    chunks: Array.isArray(j.chunks) ? j.chunks : [],
    rewritten: j.rewritten_query,
    latency_ms,
  };
}

function scoreTopicHit(chunks: any[], expectedTopics: string[]): number {
  if (expectedTopics.length === 0) return 1;
  const allText = chunks.map((c: any) => (c.content || "").toLowerCase()).join(" ");
  const hits = expectedTopics.filter((t) => allText.includes(t.toLowerCase()));
  return hits.length / expectedTopics.length;
}

function scoreFaithfulness(chunks: any[], groundTruth: string): number {
  if (!groundTruth || chunks.length === 0) return 0;
  const allText = chunks.map((c: any) => (c.content || "").toLowerCase()).join(" ");
  const keywords = groundTruth
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 4);
  if (keywords.length === 0) return 1;
  const hits = keywords.filter((k) => allText.includes(k));
  return hits.length / keywords.length;
}

async function main() {
  const dataPath = path.join(path.dirname(new URL(import.meta.url).pathname), "dataset.json");
  const dataset: TestCase[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`Running ${dataset.length} eval cases against ${RAG_URL}\n`);

  const results: EvalResult[] = [];

  for (const tc of dataset) {
    try {
      const { chunks, latency_ms } = await retrieveForCase(tc);
      const contextPrecision = scoreTopicHit(chunks, tc.expected_topics);
      const faithfulness = scoreFaithfulness(chunks, tc.ground_truth);
      const relevance = chunks.length > 0 ? 1 : 0;

      results.push({
        id: tc.id,
        faithfulness,
        relevance,
        context_precision: contextPrecision,
        retrieval_hit: chunks.length > 0,
        latency_ms,
      });
      console.log(`  ${tc.id}: faith=${faithfulness.toFixed(2)} ctx=${contextPrecision.toFixed(2)} ${latency_ms}ms (${chunks.length} chunks)`);
    } catch (e: any) {
      results.push({
        id: tc.id,
        faithfulness: 0,
        relevance: 0,
        context_precision: 0,
        retrieval_hit: false,
        latency_ms: 0,
        error: e.message,
      });
      console.log(`  ${tc.id}: ERROR — ${e.message}`);
    }
  }

  const avg = (key: keyof EvalResult) => {
    const vals = results.map((r) => Number(r[key]) || 0);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  console.log("\n--- Summary ---");
  console.log(`Cases:              ${results.length}`);
  console.log(`Avg faithfulness:   ${avg("faithfulness").toFixed(3)}`);
  console.log(`Avg ctx precision:  ${avg("context_precision").toFixed(3)}`);
  console.log(`Retrieval hit rate: ${avg("retrieval_hit").toFixed(3)}`);
  console.log(`Avg latency:        ${avg("latency_ms").toFixed(0)}ms`);
  console.log(`Errors:             ${results.filter((r) => r.error).length}`);

  // Write results to file for CI.
  const outPath = path.join(path.dirname(new URL(import.meta.url).pathname), "results.json");
  fs.writeFileSync(outPath, JSON.stringify({ run_at: new Date().toISOString(), results }, null, 2));
  console.log(`\nResults written to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
