// RAG retrieval for Ezra — pipeline v2 (multi-turn conversational).
//
// Pipeline: conversation-aware condensation (standalone-question rewrite) ->
// embed (with cache) -> three retrieval arms in parallel (dense, sparse,
// hypothetical-question) -> weighted RRF fusion -> hydrate + LLM rerank ->
// priors blend (authority, recency, tag match) -> parent-chunk context
// expansion -> top K with source metadata.
//
// Scoped strictly to the calling user (RLS-enforced) and the requested
// collection_id. Returns chunks + timing + the condensed query.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";
import { ragEmbed, RAG_EMBED_MODEL_ID } from "../_shared/rag-embed.ts";
import { utilityJson } from "../_shared/utility-model.ts";
import { fuseRRF, blendScore, tagMatchFraction, type RankedArm } from "../_shared/rank.ts";

const PIPELINE_VERSION = "v2";

const HistoryTurn = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(600),
});

const BodySchema = z.object({
  query: z.string().min(1).max(2000),
  collection_id: z.string().uuid().nullable().optional(),
  top_k: z.number().int().min(1).max(10).optional(),
  include_web: z.boolean().optional(),
  include_bibles: z.boolean().optional(),
  // Multi-turn context: recent turns (oldest first, current question excluded)
  // plus the rolling session summary maintained by session-memory.
  history: z.array(HistoryTurn).max(12).optional().nullable(),
  history_summary: z.string().max(3000).optional().nullable(),
});

const RRF_K = 60;
const W_DENSE = 0.45;
const W_SPARSE = 0.30;
const W_HYQ = 0.25;
const FIRST_STAGE_N = 50;
const FUSED_N = 20;
const RERANK_TIMEOUT_MS = 1500;
const PARENT_EXPANSION_BUDGET_CHARS = 9000;

interface Candidate {
  id: string;
  item_id: string;
  collection_id: string;
  content: string;
  source: "collection" | "web" | "bible";
  item_title?: string;
  source_url?: string;
  // Hydrated enrichment fields
  content_type?: string;
  modality?: string;
  parent_id?: string | null;
  chunk_metadata?: { tags?: string[]; summary?: string; time_sensitive?: boolean } | null;
  created_at?: string;
  // Scoring
  llm_rank?: number | null;
  final_score?: number;
  matched_arms?: string[];
  expanded_content?: string;
}

async function sha256(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Conversation-aware condensation (the MTRAG lesson: most multi-turn failures
 * are non-standalone questions). One cheap call classifies AND rewrites:
 * standalone questions pass through with light search expansion; follow-ups
 * are rewritten into a self-contained query resolving pronouns and ellipsis.
 */
async function condenseQuery(
  query: string,
  history: { role: string; content: string }[] | null | undefined,
  summary: string | null | undefined,
): Promise<{ query: string; standalone: boolean }> {
  const hasContext = (history && history.length > 0) || (summary && summary.trim());
  if (!hasContext) return { query, standalone: true };

  const historyBlock = (history ?? [])
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content}`)
    .join("\n");

  const out = await utilityJson<{ standalone: boolean; query: string }>([
    {
      role: "system",
      content:
        `You rewrite conversational questions into standalone search queries for a retrieval system.\n` +
        `Given the conversation context and the user's LATEST message, reply with JSON only:\n` +
        `{"standalone": <true if the latest message is already fully self-contained>, "query": "<the standalone search query>"}\n` +
        `Rules: resolve pronouns and references ("it", "that verse", "his second point") using the context; ` +
        `keep the user's intent exactly — never answer the question; expand common abbreviations; ` +
        `if the latest message is already standalone, return it unchanged with standalone=true. ` +
        `The query must be a single line under 250 characters.`,
    },
    {
      role: "user",
      content:
        (summary ? `Conversation summary:\n${summary}\n\n` : "") +
        (historyBlock ? `Recent turns:\n${historyBlock}\n\n` : "") +
        `LATEST message: ${query}`,
    },
  ], { maxTokens: 120, timeoutMs: 2500 });

  if (!out || typeof out.query !== "string" || !out.query.trim() || out.query.length > 300) {
    return { query, standalone: true };
  }
  return { query: out.query.trim(), standalone: !!out.standalone };
}

// Type of the service-role client actually constructed in serve() below —
// `ReturnType<typeof createClient>` resolves to the wrong (option-less)
// overload, whose generic defaults reject every query helper in this file.
function makeAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}
type AdminClient = ReturnType<typeof makeAdminClient>;

async function getCachedOrEmbed(query: string, admin: AdminClient): Promise<{ vec: number[]; hit: boolean }> {
  const hash = await sha256(RAG_EMBED_MODEL_ID + ":" + query);
  const { data } = await admin
    .from("query_embedding_cache")
    .select("embedding")
    .eq("query_hash", hash)
    .maybeSingle();
  if (data?.embedding) {
    const raw = (data as any).embedding;
    const vec = typeof raw === "string" ? JSON.parse(raw) : raw;
    return { vec: vec as number[], hit: true };
  }
  const vec = await ragEmbed(query);
  await admin.from("query_embedding_cache").upsert({
    query_hash: hash,
    model: RAG_EMBED_MODEL_ID,
    embedding: vec as any,
  } as any, { onConflict: "query_hash" } as any).then(() => {}, () => {});
  return { vec, hit: false };
}

// Arm 1 — dense ANN via SECURITY DEFINER RPC.
async function denseSearch(
  admin: AdminClient,
  userId: string,
  collectionId: string | null,
  vec: number[],
): Promise<string[]> {
  const literal = `[${vec.join(",")}]`;
  const { data, error } = await admin.rpc("match_collection_chunks" as any, {
    query_embedding: literal,
    target_user: userId,
    target_collection: collectionId,
    match_count: FIRST_STAGE_N,
  });
  if (error || !data) return [];
  return (data as any[]).map((r) => r.id as string);
}

// Arm 2 — sparse Postgres FTS.
async function sparseSearch(
  admin: AdminClient,
  userId: string,
  collectionId: string | null,
  query: string,
): Promise<string[]> {
  let q = admin
    .from("collection_item_chunks")
    .select("id")
    .eq("user_id", userId)
    .textSearch("content", query, { type: "plain", config: "english" })
    .limit(FIRST_STAGE_N);
  if (collectionId) q = q.eq("collection_id", collectionId);
  const { data, error } = await q;
  if (error || !data) return [];
  return (data as any[]).map((r) => r.id as string);
}

// Arm 3 — hypothetical-question similarity (HyQE). Each chunk stored 2-3
// "what question does this answer?" strings at enrichment time; matching the
// user's query against those often beats matching against the raw prose.
async function hyqSearch(
  admin: AdminClient,
  userId: string,
  collectionId: string | null,
  vec: number[],
): Promise<string[]> {
  const literal = `[${vec.join(",")}]`;
  const { data, error } = await admin.rpc("match_chunk_hyq" as any, {
    query_embedding: literal,
    target_user: userId,
    target_collection: collectionId,
    match_count: FIRST_STAGE_N,
  });
  if (error || !data) return [];
  // Multiple questions can hit the same chunk — keep first (best) occurrence.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of data as any[]) {
    if (!seen.has(r.chunk_id)) {
      seen.add(r.chunk_id);
      out.push(r.chunk_id as string);
    }
  }
  return out;
}

async function llmRerank(
  query: string,
  candidates: Candidate[],
  topN: number,
  key: string,
): Promise<Map<string, number>> {
  const order = new Map<string, number>();
  if (candidates.length <= 1) {
    candidates.forEach((c, i) => order.set(c.id, i + 1));
    return order;
  }
  try {
    const snippets = candidates.map((c, i) =>
      `[${i}] ${c.content.replace(/\s+/g, " ").slice(0, 400)}`
    ).join("\n");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("UTILITY_MODEL") || "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: `You are a relevance ranker. Given a query and ${candidates.length} numbered candidate passages, return ONLY a JSON array of the top ${topN} indices (most relevant first). Example: [4,1,7,0,2]. No explanation, no prose, just the array.` },
          { role: "user", content: `Query: ${query}\n\nCandidates:\n${snippets}` },
        ],
        max_tokens: 100,
      }),
      signal: AbortSignal.timeout(RERANK_TIMEOUT_MS),
    });
    if (!r.ok) return order;
    const j = await r.json();
    const text = String(j.choices?.[0]?.message?.content ?? "").trim();
    const match = text.match(/\[[\d,\s]+\]/);
    if (!match) return order;
    const arr = JSON.parse(match[0]) as number[];
    let rank = 1;
    const seen = new Set<number>();
    for (const idx of arr) {
      if (typeof idx === "number" && idx >= 0 && idx < candidates.length && !seen.has(idx)) {
        order.set(candidates[idx].id, rank++);
        seen.add(idx);
      }
    }
    return order;
  } catch {
    return order;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();
  const timing: Record<string, number> = {};

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  let bodyJson: unknown;
  try { bodyJson = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);
  const { query, collection_id, top_k, include_web, include_bibles, history, history_summary } = parsed.data;
  const topK = top_k ?? 5;

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return jsonResponse({ error: "LOVABLE_API_KEY missing" }, 500);

  const admin = makeAdminClient();

  try {
    // 1) Conversation-aware condensation.
    const tR = Date.now();
    const condensed = await condenseQuery(query, history, history_summary);
    timing.condense_ms = Date.now() - tR;

    // 2) Embed (cached).
    const tE = Date.now();
    const { vec, hit: cacheHit } = await getCachedOrEmbed(condensed.query, admin);
    timing.embed_ms = Date.now() - tE;

    // 3) Three retrieval arms in parallel.
    const tH = Date.now();
    const [denseIds, sparseIds, hyqIds] = await Promise.all([
      denseSearch(admin, userId, collection_id ?? null, vec),
      sparseSearch(admin, userId, collection_id ?? null, condensed.query),
      hyqSearch(admin, userId, collection_id ?? null, vec),
    ]);
    timing.retrieve_ms = Date.now() - tH;

    // 4) Weighted RRF fusion.
    const arms: RankedArm[] = [
      { name: "dense", weight: W_DENSE, ids: denseIds },
      { name: "sparse", weight: W_SPARSE, ids: sparseIds },
      { name: "hyq", weight: W_HYQ, ids: hyqIds },
    ];
    const fusedRank = fuseRRF(arms, RRF_K, FUSED_N + 10);

    // 5) Hydrate fused candidates (content + enrichment metadata) and drop
    //    parent-granularity rows from the candidate pool.
    const tHy = Date.now();
    const fusedIds = fusedRank.map((f) => f.id);
    let fused: Candidate[] = [];
    if (fusedIds.length > 0) {
      const { data: rows } = await admin
        .from("collection_item_chunks")
        .select("id, item_id, collection_id, content, content_type, modality, parent_id, chunk_metadata, created_at")
        .in("id", fusedIds);
      const byId = new Map((rows ?? []).map((r: any) => [r.id, r]));
      fused = fusedRank
        .map((f) => {
          const r = byId.get(f.id);
          if (!r || r.content_type === "parent") return null;
          return {
            id: r.id,
            item_id: r.item_id,
            collection_id: r.collection_id,
            content: r.content,
            source: "collection" as const,
            content_type: r.content_type,
            modality: r.modality ?? "text",
            parent_id: r.parent_id,
            chunk_metadata: r.chunk_metadata,
            created_at: r.created_at,
            matched_arms: f.arms,
          };
        })
        .filter(Boolean)
        .slice(0, FUSED_N) as Candidate[];

      // Item titles for display.
      const itemIds = Array.from(new Set(fused.map((c) => c.item_id)));
      if (itemIds.length > 0) {
        const { data: items } = await admin
          .from("collection_items")
          .select("id, title")
          .in("id", itemIds);
        const titleMap = new Map((items ?? []).map((i: any) => [i.id, i.title]));
        for (const c of fused) c.item_title = titleMap.get(c.item_id) ?? undefined;
      }
    }
    timing.hydrate_ms = Date.now() - tHy;

    // 6) LLM rerank + priors blend → final composite order.
    // Skip the rerank round trip entirely when the fused pool is already
    // small enough that we're returning everything anyway — reranking
    // can't change which chunks make the cut, only their order, and the
    // priors blend below (authority/recency/tag-match) still produces a
    // reasonable order without it.
    const tK = Date.now();
    const shouldRerank = fused.length > topK;
    const llmOrder = shouldRerank
      ? await llmRerank(condensed.query, fused, Math.min(fused.length, topK + 5), key)
      : new Map<string, number>();
    const now = Date.now();
    for (const c of fused) {
      c.llm_rank = llmOrder.get(c.id) ?? null;
      const ageDays = c.created_at ? (now - new Date(c.created_at).getTime()) / 86_400_000 : 0;
      c.final_score = blendScore({
        llmRank: c.llm_rank,
        llmRankOf: llmOrder.size,
        source: c.source,
        ageDays,
        timeSensitive: !!c.chunk_metadata?.time_sensitive,
        tagMatch: tagMatchFraction(condensed.query, c.chunk_metadata?.tags),
      });
    }
    fused.sort((a, b) => (b.final_score ?? 0) - (a.final_score ?? 0));
    const top = fused.slice(0, topK);
    timing.rerank_ms = Date.now() - tK;

    // 7) Parent expansion — attach the larger parent chunk for the best hits
    //    while the character budget lasts ("multiple chunk sizes, send the
    //    appropriate amount of context").
    const tP = Date.now();
    const parentIds = Array.from(new Set(top.map((c) => c.parent_id).filter(Boolean))) as string[];
    if (parentIds.length > 0) {
      const { data: parents } = await admin
        .from("collection_item_chunks")
        .select("id, content")
        .in("id", parentIds);
      const parentMap = new Map((parents ?? []).map((p: any) => [p.id, p.content as string]));
      let budget = PARENT_EXPANSION_BUDGET_CHARS - top.reduce((s, c) => s + c.content.length, 0);
      for (const c of top) {
        if (!c.parent_id) continue;
        const pContent = parentMap.get(c.parent_id);
        if (!pContent || pContent.length <= c.content.length) continue;
        const extra = pContent.length - c.content.length;
        if (extra > budget) continue;
        c.expanded_content = pContent;
        budget -= extra;
      }
    }
    timing.expand_ms = Date.now() - tP;

    const total = Date.now() - t0;
    timing.total_ms = total;

    // Fire-and-forget telemetry.
    admin.from("rag_query_events").insert({
      user_id: userId,
      collection_id: collection_id ?? null,
      raw_query: query,
      rewritten_query: condensed.query,
      retrieved_chunk_ids: top.map((c) => c.id),
      rerank_order: top.map((_, i) => i),
      included_web: !!include_web,
      included_bibles: !!include_bibles,
      cache_hit_embedding: cacheHit,
      latency_ms_total: total,
      latency_breakdown: {
        ...timing,
        pipeline_version: PIPELINE_VERSION,
        standalone: condensed.standalone,
        arm_sizes: { dense: denseIds.length, sparse: sparseIds.length, hyq: hyqIds.length },
        scores: top.map((c) => ({ id: c.id, llm: c.llm_rank, final: Number((c.final_score ?? 0).toFixed(4)), arms: c.matched_arms })),
      },
    } as any).then(() => {}, () => {});

    logEvent("rag-retrieve", userId, 200, total, {
      v: PIPELINE_VERSION, candidates: fused.length, returned: top.length,
      cache_hit: cacheHit, standalone: condensed.standalone,
    });

    return jsonResponse({
      chunks: top.map((c) => ({
        id: c.id,
        item_id: c.item_id,
        item_title: c.item_title ?? null,
        content: c.expanded_content ?? c.content,
        source: c.source,
        modality: c.modality ?? "text",
        tags: c.chunk_metadata?.tags ?? [],
        score: Number((c.final_score ?? 0).toFixed(4)),
      })),
      rewritten_query: condensed.query,
      condensed_query: condensed.query,
      standalone: condensed.standalone,
      pipeline_version: PIPELINE_VERSION,
      timing,
      cache_hit_embedding: cacheHit,
    });
  } catch (e) {
    const msg = String((e as any)?.message ?? e).slice(0, 500);
    console.error("rag-retrieve error:", msg);
    logEvent("rag-retrieve", userId, 500, Date.now() - t0, { error: msg });
    return jsonResponse({ error: msg }, 500);
  }
});
