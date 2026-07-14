import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";
import { chunkText } from "../_shared/chunker.ts";
import { ragEmbedBatch } from "../_shared/rag-embed.ts";
import { mediaKindFor, analyzeMedia } from "../_shared/multimodal.ts";

const MAX_BODY_TEXT = 50_000;
const LINK_FETCH_TIMEOUT_MS = 10_000;

async function embedAndStoreChunks(
  admin: ReturnType<typeof createClient>,
  item: any,
  bodyText: string,
  modality: string = "text",
): Promise<{ chunks: number; embedded: number; error?: string }> {
  if (!bodyText || bodyText.trim().length < 40) return { chunks: 0, embedded: 0 };
  try {
    const chunks = chunkText(bodyText);
    if (chunks.length === 0) return { chunks: 0, embedded: 0 };
    // Wipe any prior chunks for this item (re-index safe).
    await admin.from("collection_item_chunks").delete().eq("item_id", item.id);

    const vectors = await ragEmbedBatch(chunks.map((c) => c.content));
    const rows = chunks.map((c, i) => ({
      item_id: item.id,
      collection_id: item.collection_id,
      user_id: item.user_id,
      chunk_index: c.chunk_index,
      content: c.content,
      content_type: c.content_type,
      modality,
      token_count: c.token_count,
      embedding: vectors[i] as any,
      pipeline_version: "v2",
    }));
    // Insert in batches of 100.
    for (let i = 0; i < rows.length; i += 100) {
      const slice = rows.slice(i, i + 100);
      const { error } = await admin.from("collection_item_chunks").insert(slice as any);
      if (error) throw error;
    }
    return { chunks: chunks.length, embedded: vectors.length };
  } catch (e) {
    const msg = String((e as any)?.message ?? e).slice(0, 300);
    console.error("embedAndStoreChunks failed:", msg);
    return { chunks: 0, embedded: 0, error: msg };
  }
}

/** Queue the enrichment pass (tags, entities, hypothetical questions). */
async function queueEnrichment(
  admin: ReturnType<typeof createClient>,
  item: any,
  authHeader: string,
) {
  await admin.from("enrichment_queue").insert({
    item_id: item.id,
    user_id: item.user_id,
    status: "pending",
  } as any).then(() => {}).catch(() => {});
  // Fire-and-forget the worker with the caller's auth.
  fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/collection-enrich`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader },
    body: JSON.stringify({ item_id: item.id }),
  }).catch(() => {});
}

const FileBody = z.object({ kind: z.literal("file"), item_id: z.string().uuid() });
const LinkBody = z.object({ kind: z.literal("link"), item_id: z.string().uuid(), url: z.string().url().max(2000) });
const BodySchema = z.discriminatedUnion("kind", [FileBody, LinkBody]);

function htmlToText(html: string): string {
  // Strip script/style blocks, then tags. Cheap and good enough as a fallback.
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|h\d|li|br|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function extractFromFile(bytes: Uint8Array, mime: string, name: string): Promise<string> {
  const lname = name.toLowerCase();
  // Plain text-y types
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    lname.endsWith(".txt") || lname.endsWith(".md") || lname.endsWith(".csv") || lname.endsWith(".json")
  ) {
    try { return new TextDecoder("utf-8").decode(bytes); } catch { return ""; }
  }
  // PDF
  if (mime === "application/pdf" || lname.endsWith(".pdf")) {
    try {
      const mod = await import("https://esm.sh/pdf-parse@1.1.1?target=deno");
      const pdf = (mod as any).default ?? mod;
      const out = await pdf(bytes);
      return String(out?.text ?? "");
    } catch (e) {
      throw new Error(`PDF parse failed: ${String(e).slice(0, 200)}`);
    }
  }
  // DOCX
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lname.endsWith(".docx")
  ) {
    try {
      const mod = await import("https://esm.sh/mammoth@1.7.2?target=deno");
      const mammoth = (mod as any).default ?? mod;
      const result = await mammoth.extractRawText({ buffer: bytes });
      return String(result?.value ?? "");
    } catch (e) {
      throw new Error(`DOCX parse failed: ${String(e).slice(0, 200)}`);
    }
  }
  // Media types are handled by the multimodal path in the request handler.
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { userId, authHeader } = auth;

  let bodyJson: unknown;
  try { bodyJson = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);

  // Use a service-role client so we can read storage + write back item rows
  // even when the user-scoped client trips RLS edge cases. We still check
  // ownership manually below.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Verify the item belongs to the calling user.
  const { data: item, error: itemErr } = await admin
    .from("collection_items")
    .select("*")
    .eq("id", parsed.data.item_id)
    .maybeSingle();
  if (itemErr || !item) return jsonResponse({ error: "Item not found" }, 404);
  if (item.user_id !== userId) return jsonResponse({ error: "Forbidden" }, 403);

  await admin.from("collection_items").update({ status: "pending", error_message: null }).eq("id", item.id);

  try {
    let bodyText = "";
    let modality = "text";
    if (parsed.data.kind === "file") {
      if (!item.storage_path) throw new Error("Item has no storage_path");
      const { data: blob, error: dlErr } = await admin.storage
        .from("collections")
        .download(item.storage_path);
      if (dlErr || !blob) throw new Error(`Download failed: ${dlErr?.message ?? "unknown"}`);
      const buf = new Uint8Array(await blob.arrayBuffer());
      const mediaKind = mediaKindFor(item.mime_type ?? "", item.title ?? item.storage_path);
      if (mediaKind) {
        // Images / charts / audio / video → per-type analysis into index text
        // that accompanies the original asset.
        const analyzed = await analyzeMedia(mediaKind, buf, item.mime_type ?? "");
        if ("error" in analyzed) throw new Error(analyzed.error);
        bodyText = analyzed.text;
        modality = mediaKind;
      } else {
        bodyText = await extractFromFile(buf, item.mime_type ?? "", item.title ?? item.storage_path);
      }
    } else {
      // link
      const url = parsed.data.url;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), LINK_FETCH_TIMEOUT_MS);
      try {
        const resp = await fetch(url, {
          signal: controller.signal,
          headers: { "User-Agent": "EzraCollectionsBot/1.0 (+https://lovable.dev)" },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const ct = resp.headers.get("content-type") ?? "";
        const text = await resp.text();
        bodyText = ct.includes("html") ? htmlToText(text) : text;
      } finally {
        clearTimeout(timer);
      }
    }

    if (bodyText.length > MAX_BODY_TEXT) bodyText = bodyText.slice(0, MAX_BODY_TEXT) + "\n…(truncated)";

    await admin.from("collection_items").update({
      body_text: bodyText,
      char_count: bodyText.length,
      status: "ready",
      error_message: null,
    }).eq("id", item.id);

    // Chunk + embed (best effort — failure here doesn't fail the ingest).
    const embedResult = await embedAndStoreChunks(admin, item, bodyText, modality);

    // Kick off offline enrichment (tags, entities, hypothetical questions).
    if (embedResult.chunks > 0) {
      await queueEnrichment(admin, item, authHeader);
    }

    logEvent("collection-ingest", userId, 200, Date.now() - t0, {
      kind: parsed.data.kind, modality, chars: bodyText.length,
      chunks: embedResult.chunks, embed_error: embedResult.error,
    });
    return jsonResponse({ ok: true, char_count: bodyText.length, chunks: embedResult.chunks });
  } catch (e) {
    const msg = String(e?.message ?? e).slice(0, 500);
    await admin.from("collection_items").update({
      status: "error",
      error_message: msg,
    }).eq("id", item.id);
    logEvent("collection-ingest", userId, 500, Date.now() - t0, { kind: parsed.data.kind, error: msg });
    return jsonResponse({ error: msg }, 500);
  }
});
