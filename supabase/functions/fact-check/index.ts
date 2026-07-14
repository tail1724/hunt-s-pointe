import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";
import { utilityJson } from "../_shared/utility-model.ts";
import { ragEmbed } from "../_shared/rag-embed.ts";

// Asynchronous multi-agent fact & source verification (addendum feature 1).
// "Multi-agent" here is a single orchestrated pipeline with distinct
// stages — archive retrieval (dense vector search over the user's own
// Projects), then one grounded model pass that extracts claims AND verifies
// them against the retrieved evidence — rather than separate services, which
// would cost more round trips for the same result at this scale.

const BodySchema = z.object({
  document_id: z.string().uuid(),
  document_text: z.string().min(1).max(24000),
  collection_id: z.string().uuid().optional().nullable(),
});

interface ClaimVerdict {
  claim: string;
  verdict: "supported" | "contradicted" | "unverifiable";
  confidence: number;
  reason: string;
  source_ids: number[];
}

const SYSTEM = `You are PressRoom's fact-verification pass, run before a draft moves to staging.
Read the DRAFT. Extract up to 8 concrete, checkable claims: statistics, dates, quotes, named-source assertions, and specific factual statements. Skip opinion, style, and vague generalities.
For each claim, compare it against the numbered ARCHIVE SOURCES (if any were supplied) and your own general knowledge, then assign:
- verdict: "supported" (the sources or well-established facts back it up), "contradicted" (the sources or well-established facts conflict with it), or "unverifiable" (no way to confirm either way from what's supplied).
- confidence: 0 to 1.
- reason: one short sentence.
- source_ids: the numbers of any ARCHIVE SOURCES that informed the verdict (empty array if none apply).
Be conservative: prefer "unverifiable" over a confident guess. Reply with a JSON array only, one object per claim, matching: [{"claim":"...","verdict":"...","confidence":0.0,"reason":"...","source_ids":[]}]`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { userId, supabase } = auth;

  let bodyJson: unknown;
  try { bodyJson = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);
  const { document_id, document_text, collection_id } = parsed.data;

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    let archiveBlock = "";
    let sourceMeta: { id: number; item_id: string; content: string }[] = [];
    try {
      const vec = await ragEmbed(document_text.slice(0, 3000));
      const { data: chunks } = await admin.rpc("match_collection_chunks" as any, {
        query_embedding: `[${vec.join(",")}]`,
        target_user: userId,
        target_collection: collection_id ?? null,
        match_count: 8,
      });
      if (Array.isArray(chunks) && chunks.length > 0) {
        sourceMeta = chunks.map((c: any, i: number) => ({ id: i + 1, item_id: c.item_id, content: c.content }));
        archiveBlock = "\n\nARCHIVE SOURCES:\n" + sourceMeta.map((s) => `[#${s.id}] ${s.content.slice(0, 800)}`).join("\n---\n");
      }
    } catch {
      // Archive retrieval is best-effort — verification still runs on general knowledge.
    }

    const verdicts = await utilityJson<ClaimVerdict[]>([
      { role: "system", content: SYSTEM },
      { role: "user", content: `DRAFT:\n${document_text.slice(0, 8000)}${archiveBlock}` },
    ], { maxTokens: 1800, timeoutMs: 20_000 });

    if (!Array.isArray(verdicts)) {
      logEvent("fact-check", userId, 502, Date.now() - t0);
      return jsonResponse({ error: "Verification model returned no result" }, 502);
    }

    const rows = verdicts.slice(0, 8).map((v) => ({
      document_id,
      user_id: userId,
      claim_text: String(v.claim ?? "").slice(0, 2000),
      verdict: (["supported", "contradicted", "unverifiable"].includes(v.verdict) ? v.verdict : "unverifiable"),
      confidence: Math.max(0, Math.min(1, Number(v.confidence) || 0)),
      sources: (Array.isArray(v.source_ids) ? v.source_ids : [])
        .map((n) => sourceMeta.find((s) => s.id === n))
        .filter(Boolean)
        .map((s) => ({ item_id: s!.item_id, excerpt: s!.content.slice(0, 300) })),
    }));

    if (rows.length > 0) {
      await supabase.from("claim_checks").insert(rows as any);
    }

    logEvent("fact-check", userId, 200, Date.now() - t0, { claims: rows.length });
    return jsonResponse({
      claims: verdicts.slice(0, 8).map((v, i) => ({ ...v, ...rows[i] })),
    });
  } catch (e) {
    const msg = String((e as any)?.message ?? e).slice(0, 400);
    logEvent("fact-check", userId, 500, Date.now() - t0, { error: msg });
    return jsonResponse({ error: msg }, 500);
  }
});
