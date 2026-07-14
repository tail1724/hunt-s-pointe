// Stylometric "burstiness" monitoring (addendum feature 12). LLM prose
// trends toward uniform sentence lengths; human prose is erratic — short
// fragments beside long compound sentences. Burstiness here is the
// coefficient of variation of sentence length, a standard, cheap proxy that
// runs entirely client-side at zero token cost.

export interface CadenceScore {
  burstiness: number;
  avgSentenceLength: number;
  stdDevSentenceLength: number;
  /** Lexical diversity (unique words / total words) — a rough perplexity proxy. */
  uniqueWordRatio: number;
  verdict: "human-like" | "flattened" | "insufficient-data";
}

const FLATTENED_THRESHOLD = 0.25;

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 0);
}

export function computeCadence(text: string): CadenceScore {
  const sentences = splitSentences(text);
  if (sentences.length < 3) {
    return { burstiness: 0, avgSentenceLength: 0, stdDevSentenceLength: 0, uniqueWordRatio: 0, verdict: "insufficient-data" };
  }
  const lengths = sentences.map((s) => (s.match(/\S+/g) || []).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + (b - avg) ** 2, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const burstiness = avg > 0 ? Math.max(0, Math.min(1, stdDev / avg)) : 0;

  const words = (text.match(/\b[a-z']+\b/gi) || []).map((w) => w.toLowerCase());
  const uniqueWordRatio = words.length > 0 ? new Set(words).size / words.length : 0;

  return {
    burstiness,
    avgSentenceLength: avg,
    stdDevSentenceLength: stdDev,
    uniqueWordRatio,
    verdict: burstiness < FLATTENED_THRESHOLD ? "flattened" : "human-like",
  };
}

/**
 * Would this edit flatten the author's cadence? Compared against the
 * ORIGINAL passage the edit replaces, not the whole document — a single
 * paragraph is short enough that the whole-document score would drown out
 * the change.
 */
export function cadenceWouldFlatten(before: string, after: string): boolean {
  const b = computeCadence(before);
  const a = computeCadence(after);
  if (b.verdict === "insufficient-data" || a.verdict === "insufficient-data") return false;
  return a.burstiness < b.burstiness * 0.7 && a.burstiness < 0.35;
}
