// Offline chunk enrichment worker (pipeline v2).
//
// For each un-enriched chunk of an item, one cheap utility-model call
// produces: topic tags, entities, a one-line summary, a time-sensitivity
// flag, and 2-3 hypothetical questions ("what question does this chunk
// answer?"). Questions are embedded and stored for the HyQE retrieval arm.
// Also builds parent chunks (groups of 3 consecutive chunks) for
// multi-granularity context expansion.
//
// Bounded per invocation: processes a batch within a soft deadline, then
// self-chains (fire-and-forget re-invoke) until the item is fully enriched.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";
import { ragEmbedBatch } from "../_shared/rag-embed.ts";
import { utilityJson } from "../_shared/utility-model.ts";

const BodySchema = z.object({
  item_id: z.string().uuid(),
  depth: z.number().int().min(0).max(12).optional(),
});

const CHUNKS_PER_LLM_CALL = 5;
const SOFT_DEADLINE_MS = 20_000;
const PARENT_GROUP_SIZE = 3;

interface ChunkRow {
  id: string;
  chunk_index: number;
  content: string;
  content_type: string;
  collection_id: string;
  user_id: string;
}

interface Enrichment {
  tags: string[];
  entities: { type: string; value: string }[];
  summary: string;
  time_sensitive: boolean;
  questions: string[];
}

async function enrichBatch(chunks: ChunkRow[]): Promise<(Enrichment | null)[]> {
  const numbered = chunks
    .map((c, i) => `--- CHUNK ${i} ---\n${c.content.slice(0, 1600)}`)
    .join("\n\n");
  const out = await utilityJson<Enrichment[]>([
    {
      role: "system",
      content:
        `You analyze reference-material chunks for a retrieval system used by editors and journalists. ` +
        `For EACH numbered chunk, produce one JSON object. Reply with a JSON array only — same order and length as the input.\n` +
        `Each object: {"tags": [3-6 short lowercase topic tags], ` +
        `"entities": [{"type": "person|place|verse_ref|topic|org", "value": "..."}] (0-6; verse_ref only for scripture-style citations), ` +
        `"summary": "<one sentence, max 140 chars>", ` +
        `"time_sensitive": <true only for news/dated/announcement content>, ` +
        `"questions": [2-3 natural questions this chunk directly answers]}`,
    },
    { role: "user", content: numbered },
  ], { maxTokens: 380 * chunks.length, timeoutMs: 20_000 });

  if (!Array.isArray(out)) return chunks.map(() => null);
  return chunks.map((_, i) => {
    const e = out[i];
    if (!e || !Array.isArray(e.questions)) return null;
    return {
      tags: Array.isArray(e.tags) ? e.tags.slice(0, 8).map(String) : [],
      entities: Array.isArray(e.entities)
        ? e.entities.filter((x) => x && x.type && x.value).slice(0, 8)
        : [],
      summary: String(e.summary ?? "").slice(0, 200),
      time_sensitive: !!e.time_sensitive,
      questions: e.questions.slice(0, 3).map(String).filter((q) => q.length > 5),
    };
  });
}

/** Group consecutive child chunks into larger parent chunks (idempotent). */
async function ensureParents(admin: ReturnType<typeof createClient>, itemId: string) {
  const { data: existing } = await admin
    .from("collection_item_chunks")
    .select("id")
    .eq("item_id", itemId)
    .eq("content_type", "parent")
    .limit(1);
  if (existing && existing.length > 0) return;

  const { data: children } = await admin
    .from("collection_item_chunks")
    .select("id, chunk_index, content, collection_id, user_id, modality")
    .eq("item_id", itemId)
    .neq("content_type", "parent")
    .order("chunk_index", { ascending: true });
  if (!children || children.length < 2) return;

  for (let i = 0; i < children.length; i += PARENT_GROUP_SIZE) {
    const group = children.slice(i, i + PARENT_GROUP_SIZE) as any[];
    if (group.length < 2) break;
    const parentContent = group.map((g) => g.content).join("\n\n");
    const { data: parent } = await admin
      .from("collection_item_chunks")
      .insert({
        item_id: itemId,
        collection_id: group[0].collection_id,
        user_id: group[0].user_id,
        chunk_index: 10_000 + i,
        content: parentContent.slice(0, 12_000),
        content_type: "parent",
        modality: "text",
        token_count: Math.ceil(parentContent.length / 4),
        pipeline_version: "v2",
      } as any)
      .select("id")
      .single();
    if (parent) {
      await admin
        .from("collection_item_chunks")
        .update({ parent_id: (parent as any).id } as any)
        .in("id", group.map((g) => g.id));
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { userId, authHeader } = auth as any;

  let bodyJson: unknown;
  try { bodyJson = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);
  const { item_id, depth = 0 } = parsed.data;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Ownership check.
  const { data: item } = await admin
    .from("collection_items")
    .select("id, user_id")
    .eq("id", item_id)
    .maybeSingle();
  if (!item) return jsonResponse({ error: "Item not found" }, 404);
  if ((item as any).user_id !== userId) return jsonResponse({ error: "Forbidden" }, 403);

  await admin.from("enrichment_queue")
    .update({ status: "running", updated_at: new Date().toISOString() } as any)
    .eq("item_id", item_id).eq("status", "pending");

  try {
    if (depth === 0) await ensureParents(admin, item_id);

    let processed = 0;
    let remaining = 0;

    while (Date.now() - t0 < SOFT_DEADLINE_MS) {
      const { data: pending } = await admin
        .from("collection_item_chunks")
        .select("id, chunk_index, content, content_type, collection_id, user_id")
        .eq("item_id", item_id)
        .neq("content_type", "parent")
        .is("chunk_metadata", null)
        .order("chunk_index", { ascending: true })
        .limit(CHUNKS_PER_LLM_CALL);
      const batch = (pending ?? []) as ChunkRow[];
      if (batch.length === 0) { remaining = 0; break; }

      const enrichments = await enrichBatch(batch);

      const hyqRows: any[] = [];
      for (let i = 0; i < batch.length; i++) {
        const chunk = batch[i];
        const e = enrichments[i];
        // Always write metadata (even `{}` on model failure) so a bad chunk
        // can't wedge the loop into re-processing it forever.
        await admin.from("collection_item_chunks").update({
          chunk_metadata: e
            ? { tags: e.tags, summary: e.summary, time_sensitive: e.time_sensitive }
            : { tags: [], summary: "", time_sensitive: false, enrich_failed: true },
        } as any).eq("id", chunk.id);

        if (!e) continue;
        if (e.entities.length > 0) {
          await admin.from("chunk_entities").insert(
            e.entities.map((ent) => ({
              chunk_id: chunk.id,
              user_id: chunk.user_id,
              entity_type: String(ent.type).slice(0, 40),
              entity_value: String(ent.value).slice(0, 200),
            })) as any,
          ).then(() => {}).catch(() => {});
        }
        for (const q of e.questions) {
          hyqRows.push({
            chunk_id: chunk.id,
            item_id,
            collection_id: chunk.collection_id,
            user_id: chunk.user_id,
            question: q.slice(0, 500),
          });
        }
      }

      // Embed hypothetical questions in one batch, then insert.
      if (hyqRows.length > 0) {
        try {
          const vectors = await ragEmbedBatch(hyqRows.map((r) => r.question));
          const withVecs = hyqRows.map((r, i) => ({ ...r, embedding: vectors[i] }));
          await admin.from("chunk_hypothetical_questions").insert(withVecs as any);
        } catch (e) {
          console.error("hyq embed failed:", String(e).slice(0, 200));
        }
      }

      processed += batch.length;
    }

    // Anything left?
    const { count } = await admin
      .from("collection_item_chunks")
      .select("id", { count: "exact", head: true })
      .eq("item_id", item_id)
      .neq("content_type", "parent")
      .is("chunk_metadata", null);
    remaining = count ?? 0;

    if (remaining > 0 && depth < 12) {
      // Self-chain: fire-and-forget the next batch with the caller's auth.
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/collection-enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ item_id, depth: depth + 1 }),
      }).catch(() => {});
    } else {
      await admin.from("enrichment_queue")
        .update({ status: remaining > 0 ? "error" : "done", last_error: remaining > 0 ? "depth limit" : null, updated_at: new Date().toISOString() } as any)
        .eq("item_id", item_id);
    }

    logEvent("collection-enrich", userId, 200, Date.now() - t0, { item_id, processed, remaining, depth });
    return jsonResponse({ ok: true, processed, remaining, depth });
  } catch (e) {
    const msg = String((e as any)?.message ?? e).slice(0, 400);
    await admin.from("enrichment_queue")
      .update({ status: "error", last_error: msg, attempts: depth + 1, updated_at: new Date().toISOString() } as any)
      .eq("item_id", item_id);
    logEvent("collection-enrich", userId, 500, Date.now() - t0, { item_id, error: msg });
    return jsonResponse({ error: msg }, 500);
  }
});
