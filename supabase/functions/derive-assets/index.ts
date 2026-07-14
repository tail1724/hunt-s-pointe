import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";
import { utilityJson } from "../_shared/utility-model.ts";

// Automated content cascades (addendum feature 4). One finished piece,
// generated into every downstream format in a single grounded pass. These
// are AI-authored by design (addendum §C.0) — stored in document_assets,
// outside the manuscript, always labeled, always reviewed before it ships
// anywhere.

const BodySchema = z.object({
  document_id: z.string().uuid(),
  title: z.string().max(300),
  content_text: z.string().max(24000),
  asset_types: z.array(z.enum(["seo", "newsletter", "social_thread", "excerpt"])).min(1).max(4),
});

interface CascadeOutput {
  seo?: { title: string; description: string };
  newsletter?: string;
  social_thread?: string;
  excerpt?: string;
}

const SYSTEM = `You cascade one finished article into downstream formats for an independent publication.
Given the TITLE and BODY, produce ONLY the requested asset types as a JSON object:
- "seo": {"title": "<=60 chars", "description": "<=155 chars, states what the piece delivers"}
- "newsletter": a short newsletter edition — subject line + 2-3 paragraph teaser, ending with a read-more prompt. Markdown.
- "social_thread": a numbered thread (4-6 posts, each under 280 chars) condensing the piece for social syndication.
- "excerpt": a single punchy 2-3 sentence hook suitable as a homepage teaser or share card.
Stay faithful to the source — never invent facts, numbers, or quotes not in the BODY. Reply with a JSON object containing only the keys that were requested.`;

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
  const { document_id, title, content_text, asset_types } = parsed.data;

  try {
    const result = await utilityJson<CascadeOutput>([
      { role: "system", content: SYSTEM },
      { role: "user", content: `REQUESTED: ${asset_types.join(", ")}\n\nTITLE: ${title}\n\nBODY:\n${content_text.slice(0, 8000)}` },
    ], { maxTokens: 2000, timeoutMs: 25_000 });

    if (!result) {
      logEvent("derive-assets", userId, 502, Date.now() - t0);
      return jsonResponse({ error: "Cascade model returned no result" }, 502);
    }

    const rows: { document_id: string; user_id: string; asset_type: string; content: string }[] = [];
    if (asset_types.includes("seo") && result.seo) {
      rows.push({ document_id, user_id: userId, asset_type: "seo", content: JSON.stringify(result.seo) });
    }
    if (asset_types.includes("newsletter") && result.newsletter) {
      rows.push({ document_id, user_id: userId, asset_type: "newsletter", content: result.newsletter });
    }
    if (asset_types.includes("social_thread") && result.social_thread) {
      rows.push({ document_id, user_id: userId, asset_type: "social_thread", content: result.social_thread });
    }
    if (asset_types.includes("excerpt") && result.excerpt) {
      rows.push({ document_id, user_id: userId, asset_type: "excerpt", content: result.excerpt });
    }

    let inserted: any[] = [];
    if (rows.length > 0) {
      const { data } = await supabase.from("document_assets" as any).insert(rows as any).select("*");
      inserted = data ?? [];
    }

    logEvent("derive-assets", userId, 200, Date.now() - t0, { assets: inserted.length });
    return jsonResponse({ assets: inserted });
  } catch (e) {
    const msg = String((e as any)?.message ?? e).slice(0, 400);
    logEvent("derive-assets", userId, 500, Date.now() - t0, { error: msg });
    return jsonResponse({ error: msg }, 500);
  }
});
