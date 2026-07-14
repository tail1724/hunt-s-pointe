// Pure ranking math for the RAG pipeline — no Deno/network APIs so the same
// file is unit-tested with vitest from src/test and imported by edge functions.

export interface RankedArm {
  /** Arm name, e.g. "dense" | "sparse" | "hyq" — used in telemetry */
  name: string;
  /** RRF fusion weight for this arm */
  weight: number;
  /** Candidate ids, best first (rank 1 = index 0) */
  ids: string[];
}

/**
 * Weighted Reciprocal Rank Fusion across any number of retrieval arms.
 * score(id) = Σ_arm weight / (k + rank_in_arm). Ids missing from an arm
 * contribute nothing for that arm.
 */
export function fuseRRF(arms: RankedArm[], k = 60, limit = 20): { id: string; score: number; arms: string[] }[] {
  const scores = new Map<string, { score: number; arms: Set<string> }>();
  for (const arm of arms) {
    arm.ids.forEach((id, i) => {
      const entry = scores.get(id) ?? { score: 0, arms: new Set<string>() };
      entry.score += arm.weight / (k + i + 1);
      entry.arms.add(arm.name);
      scores.set(id, entry);
    });
  }
  return Array.from(scores.entries())
    .map(([id, { score, arms }]) => ({ id, score, arms: Array.from(arms) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Source-authority priors: primary texts and curated docs outrank scraped web. */
export const AUTHORITY_PRIOR: Record<string, number> = {
  bible: 1.0,
  collection: 0.85,
  document: 0.85,
  web: 0.55,
  rss: 0.5,
};

/**
 * Exponential recency decay in [0,1]. Applied ONLY to chunks whose metadata
 * marks them time-sensitive (news, feeds); reference material never decays.
 */
export function recencyScore(ageDays: number, halfLifeDays = 30): number {
  if (!Number.isFinite(ageDays) || ageDays < 0) return 1;
  return Math.pow(0.5, ageDays / halfLifeDays);
}

export interface PriorFeatures {
  /** 1-based position from the LLM reranker (lower = better); null if absent */
  llmRank: number | null;
  /** How many candidates the LLM ranked (for normalization) */
  llmRankOf: number;
  /** Source key looked up in AUTHORITY_PRIOR */
  source: string;
  /** Age in days; only applied when timeSensitive */
  ageDays?: number;
  timeSensitive?: boolean;
  /** Fraction of query terms matching chunk tags, in [0,1] */
  tagMatch?: number;
}

export const BLEND_WEIGHTS = {
  llm: 0.55,
  authority: 0.2,
  recency: 0.1,
  tags: 0.15,
} as const;

/**
 * Final composite relevance in [0,1]: LLM judgment leads, priors adjust.
 * Deliberately a transparent linear blend — every feature is logged to
 * rag_query_events so the weights can be tuned from real traffic.
 */
export function blendScore(f: PriorFeatures, w = BLEND_WEIGHTS): number {
  const llm = f.llmRank !== null && f.llmRankOf > 0
    ? 1 - (f.llmRank - 1) / Math.max(1, f.llmRankOf)
    : 0.3; // unranked candidates keep a floor so priors can still surface them
  const authority = AUTHORITY_PRIOR[f.source] ?? 0.6;
  const recency = f.timeSensitive ? recencyScore(f.ageDays ?? 0) : 1;
  const tags = Math.max(0, Math.min(1, f.tagMatch ?? 0));
  return w.llm * llm + w.authority * authority + w.recency * recency + w.tags * tags;
}

/** Fraction of meaningful query terms present in the chunk's tag list. */
export function tagMatchFraction(query: string, tags: string[] | undefined | null): number {
  if (!tags || tags.length === 0) return 0;
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((t) => t.length > 3);
  if (terms.length === 0) return 0;
  const bag = tags.map((t) => t.toLowerCase());
  const hits = terms.filter((t) => bag.some((tag) => tag.includes(t) || t.includes(tag)));
  return hits.length / terms.length;
}
