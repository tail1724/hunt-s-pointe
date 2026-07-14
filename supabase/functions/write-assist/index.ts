import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";
import { EDITORIAL_GUARDRAILS, prefilterPrompt, recordGuardrailEvent } from "../_shared/guardrails.ts";
import { utilityChat } from "../_shared/utility-model.ts";

const BodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  selected_text: z.string().max(5000).optional(),
  surrounding_text: z.string().max(5000).optional(),
  collection_id: z.string().uuid().optional(),
});

const SYSTEM = `You are PressRoom, the editorial co-pilot for an independent digital publication. You help the author improve, expand, and refine their manuscript — as suggestions they integrate by hand, never as replacements.
Given the user's PROMPT, the SELECTED TEXT (if any), and SURROUNDING CONTEXT, produce the requested output.
Be direct — return only the proposed text or answer, no preamble. Match the voice and cadence of the surrounding content; preserve the author's idiosyncratic style markers (em dashes, fragments, colloquialisms) rather than sanitizing them.
Factual claims you introduce must be attributable — never invent sources, quotes, or statistics.
${EDITORIAL_GUARDRAILS}`;

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
  const { prompt, selected_text, surrounding_text, collection_id } = parsed.data;

  // Domain guardrail prefilter — see _shared/guardrails.ts.
  const verdict = prefilterPrompt(prompt);
  if (verdict.blocked) {
    logEvent("write-assist", userId, 200, Date.now() - t0, { guardrail: verdict.category });
    await recordGuardrailEvent((auth as any).supabase, userId, "write-assist", verdict.category);
    return jsonResponse({ result: verdict.message });
  }

  try {
    let ragContext = "";
    if (collection_id) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );
      const { data: chunks } = await admin
        .from("collection_item_chunks")
        .select("content")
        .eq("collection_id", collection_id)
        .eq("user_id", userId)
        .neq("content_type", "parent")
        .limit(5);
      if (chunks && chunks.length > 0) {
        ragContext = "\n\nREFERENCE MATERIAL:\n" + chunks.map((c: any) => c.content).join("\n---\n").slice(0, 4000);
      }
    }

    const userContent =
      `PROMPT: ${prompt}` +
      (selected_text ? `\n\nSELECTED TEXT:\n${selected_text}` : "") +
      (surrounding_text ? `\n\nSURROUNDING CONTEXT:\n${surrounding_text}` : "") +
      ragContext;

    const result = await utilityChat([
      { role: "system", content: SYSTEM },
      { role: "user", content: userContent },
    ], { maxTokens: 1500, timeoutMs: 15_000 });

    if (!result) return jsonResponse({ error: "Model returned no result" }, 502);

    logEvent("write-assist", userId, 200, Date.now() - t0, { prompt_len: prompt.length });
    return jsonResponse({ result });
  } catch (e) {
    const msg = String((e as any)?.message ?? e).slice(0, 400);
    logEvent("write-assist", userId, 500, Date.now() - t0, { error: msg });
    return jsonResponse({ error: msg }, 500);
  }
});
