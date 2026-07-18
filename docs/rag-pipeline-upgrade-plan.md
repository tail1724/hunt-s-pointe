# Upgrading the Multi-Turn, Multimodal RAG System

**Scope:** Improve the retrieval-augmented pipeline that powers PressRoom, the AI chat in Hunt's Pointe — its multi-turn memory, its multimodal ingestion and retrieval, and the quality of what it feeds the model.
**Status:** Plan for review. No implementation until approved.
**Context:** This is an upgrade of an already-sophisticated system, not a greenfield build. The plan is written against the current code and calls out exactly what to change.

---

## 0. TL;DR

The RAG stack is genuinely advanced already: conversation-aware query condensation, three parallel retrieval arms (dense + sparse + hypothetical-question) fused with weighted RRF, an LLM reranker, a priors blend (authority/recency/tags), multi-granularity parent-chunk expansion, rolling per-session memory, a multimodal chunk model with a private upload bucket, and a RAGAS-style eval harness. The upgrades that matter are not "add RAG" — they're **precision, grounding honesty, multimodal depth, and memory that actually persists across sessions.** This plan sequences those.

---

## 1. What exists today (accurate audit)

**Retrieval — `supabase/functions/rag-retrieve/index.ts` + `_shared/rank.ts`:**
1. **Condensation** — one cheap LLM call rewrites a conversational turn into a standalone search query, using history + a running summary (`condenseQuery`).
2. **Embed with cache** — 1536-dim vectors, `match_collection_chunks` ANN RPC.
3. **Three arms in parallel** — dense (ANN), sparse (Postgres FTS), HyQE (`match_chunk_hyq`, matching the query against per-chunk *hypothetical questions*).
4. **Weighted RRF fusion** — `fuseRRF` with per-arm weights.
5. **Hydrate + LLM rerank** — pull candidate rows, an LLM reranker orders them.
6. **Priors blend** — `blendScore`: LLM rank (0.55) + source authority (0.2) + recency (0.1) + tag match (0.15).
7. **Parent-chunk expansion** — multi-granularity: hit small chunks, return the larger parent when budget allows.

**Multi-turn — `session_memories` table + `session-memory` function:** rolling `summary` + `facts[]`, updated by the utility model as chats grow; `retrievalHistory`/`windowTranscript` on the client shape what gets sent.

**Multimodal — `_shared/multimodal.ts`, `chat-uploads` bucket, `modality` column:** images/audio/video are analyzed (`analyzeMedia`) into text descriptions, chunked with a `modality` tag, and retrieved through the same text-embedding path. Messages can carry images.

**Enrichment & eval:** `enrichment_queue` (async chunk enrichment: tags, entities, HyQ, summaries), `chunk_entities` (a light graph layer), `chunk_hypothetical_questions`, and `rag_eval_runs` (a RAGAS-style harness table).

**The honest weaknesses:**
1. **Multimodal is text-only under the hood.** Images/audio/video are flattened to a text description at ingest, then embedded as text. A chart's actual values, a photo's actual composition, and audio's actual timing are lost — retrieval can't see what it can't read. There's no true multimodal embedding.
2. **Memory is per-session and lossy.** `session_memories` is keyed by `session_id` — nothing carries a user's stable context *across* conversations. Long chats also compress to a summary that can drop specifics the user later references.
3. **Grounding is not verified.** Chunks are fed to the model, but nothing checks the model's *answer* against them — the citation/verify path exists for documents (Phase 4 fact-check) but the chat itself can still say things its sources don't support.
4. **Retrieval quality is unmeasured in production.** `rag_eval_runs` exists but there's no continuous eval loop, no per-query logging of which arm/chunk actually helped, and the RRF/blend weights are hand-tuned constants.
5. **Fixed retrieval regardless of query.** Every query runs all three arms at `FIRST_STAGE_N`; a simple factual lookup and a multi-hop synthesis question get the same treatment. No adaptivity.
6. **Newsroom mismatch.** The graph/entity layer and `verse_xrefs` were built for scripture cross-referencing; for a publication they should key on **story entities, sources, and archive links**, not verses.

---

## 2. Guiding priorities

In order — each phase earns the next:
1. **Grounding honesty** (don't state what the sources don't support) — the platform's whole brand is credibility.
2. **Cross-session memory** (PressRoom should remember the beat you cover, your house style, your recurring sources).
3. **True multimodal** (retrieve on what an image/chart/audio actually *is*, not a lossy caption).
4. **Adaptive, measured retrieval** (route by query type; tune weights from real signal).

---

## 3. Phased roadmap

### Phase 1 — Grounding & answer verification *(highest trust leverage)*
Make the chat as accountable as the document fact-checker already is.

- **Answer-time citation binding.** After the stream, run a lightweight check (reuse `verify-citations`) that maps each factual sentence in PressRoom's answer to a retrieved chunk; surface inline source chips and flag unsupported sentences. The machinery exists for documents — extend it to the chat turn.
- **"Insufficient context" honesty.** When fused top-scores fall below a confidence floor, PressRoom says so and offers to search wider, instead of confabulating. A retrieval-confidence signal already falls out of `blendScore` — thread it into the prompt.
- **Per-turn grounding telemetry.** Log, per turn: which chunks were retrieved, which the answer actually used, and the grounding ratio — into a `rag_query_events` table (referenced in `rank.ts` comments but not yet the loop's backbone). This is the raw material for Phase 4.

*Exit:* every substantive chat answer shows its sources, and an unsupported claim is visibly flagged rather than shipped.

### Phase 2 — Durable cross-session memory
- **User memory store** (distinct from per-session `session_memories`): stable facts about the user — beat, house-style notes, recurring sources, standing preferences — extracted with consent and injected into every session. `prompt-partner` already reads a `user_memories` table for this; formalize the write path (what gets promoted from a session to durable memory, and how the user edits/forgets it).
- **Retrieval over past conversations.** Index prior chat turns as their own collection so "what did we conclude about the transit budget last month?" retrieves the actual earlier exchange, not just a summary.
- **Summary with pinned specifics.** When compressing a long chat, preserve verbatim the entities/numbers/decisions (from `chunk_entities`) so compression never drops a figure the user later cites.
- **Forgetting & transparency.** A memory viewer (what PressRoom remembers about you) with per-item delete — the same honesty stance as the provenance ledger.

*Exit:* a new conversation already knows your beat and can retrieve a conclusion from a chat two weeks ago.

### Phase 3 — True multimodal retrieval
- **Multimodal embeddings.** Embed images (and chart/figure crops) with a vision-capable embedding model into a parallel vector space, so an image query or an image-bearing question retrieves on visual content, not just its caption. Add an `image_embedding` column + a `match_image_chunks` RPC alongside the text arm.
- **Structured extraction for charts/tables.** At ingest, pull a chart's underlying series and a table's cells into structured `chunk_metadata` so "what was the Q3 number?" hits data, not prose about data.
- **Audio/video timestamps.** Keep transcript chunks but retain time offsets so a retrieved answer can deep-link to the moment in the source (interview transcripts are a core newsroom asset — the pipeline already ingests them via `chat-uploads`).
- **Modality-aware fusion.** Add the image arm to `fuseRRF` with its own weight; let query modality shift the weights (an uploaded photo weights the image arm up).

*Exit:* uploading a chart and asking for its numbers returns the numbers; asking about a photo retrieves on what's in it.

### Phase 4 — Adaptive, self-tuning retrieval
- **Query router.** Classify each query (simple lookup / multi-hop synthesis / comparison / temporal) in the condensation call that already runs, and adapt: skip arms for cheap lookups, fan out and iterate for multi-hop, widen the recency window for temporal.
- **Iterative retrieval for hard questions.** For multi-hop synthesis, allow a second retrieval round seeded by the first round's entities (the `chunk_entities` graph enables 1-hop expansion) — closer to agentic RAG, bounded to 2 rounds.
- **Learned weights.** Feed the Phase 1 grounding telemetry into the `rag_eval_runs` harness on a schedule; tune the RRF and `blendScore` weights from which arms/chunks actually grounded good answers, instead of hand-set constants.
- **Newsroom entity graph.** Repoint the entity layer from `verse_xrefs` to **story/source/coverage** edges: link a chunk to the documents, people, and past coverage it references, so retrieval can traverse "this claim → the filing it came from → our earlier story on it." This also feeds the Phase 4 interlink feature from the omnibus plan.

*Exit:* a simple question is fast and cheap; a multi-hop question does the extra work; the weights improve from real usage.

---

## 4. Data model

Additive; RLS-by-`user_id`, timestamped migrations per house pattern.

- **`rag_query_events`** (new/formalized): per-turn retrieval telemetry — query, condensed query, arm hit-lists, fused ranks, chunks used by the answer, grounding ratio, latency. The backbone of Phases 1 & 4.
- **`user_memories`** — formalize the durable cross-session store `prompt-partner` already reads (fact, source, enabled, last_used_at, provenance).
- **`collection_item_chunks`** — add `image_embedding vector`, and richer `chunk_metadata` for structured chart/table data and audio/video time offsets.
- **New RPC** `match_image_chunks` mirroring `match_collection_chunks` for the image arm.
- **Entity graph** — generalize `chunk_entities` edges to `document`/`source`/`coverage` types; deprecate `verse_xrefs` for the newsroom vertical (keep behind the Bible-reader flag).

---

## 5. Retrieval quality — the measurement loop

The single highest-ROI investment. Today the pipeline is well-engineered but flies blind in production.

- **Golden set.** Curate ~50 real newsroom Q&A pairs with known-correct source chunks; store as a `dataset` in `rag_eval_runs`.
- **Continuous eval.** On each pipeline change, run RAGAS-style metrics (context precision/recall, faithfulness, answer relevance) and gate merges on no-regression.
- **Online signal.** The Phase 1 grounding telemetry + thumbs feedback (the `HistoryTab` already captures votes) becomes the online complement to the offline golden set.
- **Weight tuning as data, not vibes.** Every RRF/blend constant in `rank.ts` becomes a tunable read from a config, adjusted from eval results.

---

## 6. Cost & latency

- **Budget-aware arms** (Phase 4 router) cut cost on the majority of simple queries that don't need all three arms + rerank.
- **Embed cache** already exists; extend it to condensed queries and to the image arm.
- **Streaming stays first** (`stream_first` is already wired) — verification and telemetry (Phase 1) run *after* the stream so they never delay the first token.
- **Multimodal embedding** is the main new cost; gate high-cost image embedding to ingest-time (once per asset), never per query.

---

## 7. Risks & watch-items

- **Grounding checks must not gate the stream.** Run them post-stream and annotate; never make the user wait on verification for the first token.
- **Memory privacy.** Durable cross-session memory is sensitive — consent to store, a visible memory viewer, per-item forget, and no memory written from another user's shared session. Mirror the provenance-ledger honesty stance.
- **Multimodal embedding drift.** A separate image vector space needs its own eval slice; don't assume text metrics transfer.
- **Router misclassification.** A mis-routed query that skips arms can miss the answer — the router must fail *open* (when unsure, run the full pipeline).
- **Don't over-agentify.** Iterative retrieval is bounded to 2 rounds; unbounded agentic loops blow latency and cost for marginal recall.
- **Scripture-era leftovers.** `verse_xrefs` and verse-typed entities are dead weight for a newsroom — migrate the graph rather than carrying two schemas.

---

## 8. Sequenced summary & first PR

| Phase | Outcome | Effort |
|---|---|---|
| **1. Grounding & verification** | Chat answers cite sources, flag unsupported claims, log grounding telemetry | M |
| **2. Cross-session memory** | PressRoom remembers your beat and can retrieve old conclusions | M |
| **3. True multimodal** | Retrieve on real image/chart/audio content, not lossy captions | L |
| **4. Adaptive & self-tuning** | Route by query type; iterate on hard questions; tune weights from data | L |
| **Cross-cutting** | The golden-set + continuous-eval loop (§5) — start immediately, it gates everything | M |

**Recommended first PR = Phase 1 + the eval loop foundation (§5).** Grounding verification is the highest-trust, most on-brand improvement, and it's the change that produces the telemetry every later phase tunes against. Concretely: extend `verify-citations` to the chat turn, add the confidence floor to `condenseQuery`/prompt assembly, formalize `rag_query_events`, and stand up the golden-set eval run. Self-contained, independently verifiable, unblocks the rest.
