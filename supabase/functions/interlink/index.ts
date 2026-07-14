import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";
import { utilityJson } from "../_shared/utility-model.ts";
import { ragEmbed } from "../_shared/rag-embed.ts";

// Internal asset ingestion & contextual interlinking (addendum feature 7).
// Reads the user's own archive (Projects) via the same dense-retrieval RPC
// rag-retrieve uses, then asks one grounded model pass to separate genuine
// interlink opportunities from potential contradictions with earlier coverage.

const BodySchema = z.object({
  document_text: z.string().min(1).max(24000),
  collection_id: z.string().uuid().optional().nullable(),
});

interface InterlinkResult {
  type: "related" | "contradiction";
  note: string;
  source_id: number;
}

const SYSTEM = `You are PressRoom's archive interlinking pass.
Read the DRAFT and the numbered ARCHIVE SOURCES (past coverage / saved documents). For each source that is genuinely relevant, return one entry:
- type: "related" if it's worth linking to or referencing (deepens the piece, gives useful background), or "contradiction" if it conflicts with a claim in the DRAFT (different numbers, different account of events, etc).
- note: one short, specific sentence — for "related" say why it's worth linking; for "contradiction" name the actual conflict.
- source_id: the ARCHIVE SOURCE number this refers to.
Skip sources that are only superficially similar. Return at most 5 entries. Reply with a JSON array only: [{"type":"related","note":"...","source_id":1}]. If nothing is genuinely relevant, reply with [].`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  let bodyJson: unknown;
  try { bodyJson = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);
  const { document_text, collection_id } = parsed.data;

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const vec = await ragEmbed(document_text.slice(0, 3000));
    const { data: chunks } = await admin.rpc("match_collection_chunks" as any, {
      query_embedding: `[${vec.join(",")}]`,
      target_user: userId,
      target_collection: collection_id ?? null,
      match_count: 10,
    });

    if (!Array.isArray(chunks) || chunks.length === 0) {
      logEvent("interlink", userId, 200, Date.now() - t0, { sources: 0 });
      return jsonResponse({ results: [] });
    }

    const sourceMeta = chunks.map((c: any, i: number) => ({ id: i + 1, item_id: c.item_id, content: c.content as string }));
    const archiveBlock = sourceMeta.map((s) => `[#${s.id}] ${s.content.slice(0, 600)}`).join("\n---\n");

    const results = await utilityJson<InterlinkResult[]>([
      { role: "system", content: SYSTEM },
      { role: "user", content: `DRAFT:\n${document_text.slice(0, 6000)}\n\nARCHIVE SOURCES:\n${archiveBlock}` },
    ], { maxTokens: 1200, timeoutMs: 20_000 });

    const out = (Array.isArray(results) ? results : []).slice(0, 5).map((r) => {
      const src = sourceMeta.find((s) => s.id === r.source_id);
      return {
        type: r.type === "contradiction" ? "contradiction" : "related",
        note: String(r.note ?? "").slice(0, 300),
        item_id: src?.item_id ?? null,
        excerpt: src?.content.slice(0, 300) ?? "",
      };
    });

    logEvent("interlink", userId, 200, Date.now() - t0, { sources: sourceMeta.length, results: out.length });
    return jsonResponse({ results: out });
  } catch (e) {
    const msg = String((e as any)?.message ?? e).slice(0, 400);
    logEvent("interlink", userId, 500, Date.now() - t0, { error: msg });
    return jsonResponse({ error: msg }, 500);
  }
});
