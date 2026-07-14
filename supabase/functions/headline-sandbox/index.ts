import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";
import { utilityJson } from "../_shared/utility-model.ts";

// Multi-variant headline & hook sandbox (addendum feature 5). Generates
// headline formulas per distribution channel. Scores are heuristic (formula
// match, length/clarity, house-style fit) and labeled as such — a real
// predictive model needs the outcome data `headline_outcomes` starts
// accumulating from here, which doesn't exist yet.

const CHANNELS = ["web", "newsletter", "social"] as const;
const FORMULAS = ["direct", "curiosity_gap", "data_driven", "stakes_forward", "quote_led"] as const;

const BodySchema = z.object({
  document_id: z.string().uuid(),
  content_text: z.string().max(24000),
  current_headline: z.string().max(300).optional().nullable(),
});

interface Variant {
  formula: typeof FORMULAS[number];
  channel: typeof CHANNELS[number];
  headline: string;
}

const SYSTEM = `You are PressRoom's headline sandbox for an independent publication.
Read the BODY and generate exactly ${FORMULAS.length} headline variants, one per formula, each written for the "web" channel (a newsletter/social pass will re-tune length separately):
- "direct": plain journalistic statement of what happened.
- "curiosity_gap": creates a specific, honest information gap — never clickbait or misleading.
- "data_driven": leads with the number or stat that matters most.
- "stakes_forward": leads with what changes for the reader.
- "quote_led": built around the strongest verbatim quote or line from the piece, if one exists; otherwise a stakes_forward variant.
No formula may misrepresent the body. Reply with a JSON array: [{"formula":"direct","headline":"..."}, ...] — exactly one entry per formula, in the order listed.`;

/** Heuristic score in [0,1] — formula fit, length band, no hedge words. Labeled as a heuristic everywhere it's shown; this is not a trained CTR model. */
function heuristicScore(headline: string): number {
  const len = headline.length;
  const lengthScore = len >= 40 && len <= 75 ? 1 : len < 40 ? 0.6 : Math.max(0.3, 1 - (len - 75) / 60);
  const hasHedge = /\b(might|could|maybe|perhaps)\b/i.test(headline);
  const hasNumber = /\d/.test(headline);
  let score = lengthScore * 0.7 + (hasNumber ? 0.15 : 0) + (hasHedge ? -0.15 : 0.15);
  return Math.max(0, Math.min(1, score));
}

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
  const { document_id, content_text, current_headline } = parsed.data;

  try {
    const result = await utilityJson<Variant[]>([
      { role: "system", content: SYSTEM },
      { role: "user", content: `CURRENT HEADLINE: ${current_headline || "(none)"}\n\nBODY:\n${content_text.slice(0, 6000)}` },
    ], { maxTokens: 700, timeoutMs: 15_000 });

    if (!Array.isArray(result)) {
      logEvent("headline-sandbox", userId, 502, Date.now() - t0);
      return jsonResponse({ error: "Headline model returned no result" }, 502);
    }

    const variants = result.slice(0, FORMULAS.length).map((v) => ({
      formula: FORMULAS.includes(v.formula) ? v.formula : "direct",
      channel: "web" as const,
      headline: String(v.headline ?? "").slice(0, 200),
      heuristic_score: heuristicScore(String(v.headline ?? "")),
    }));

    await supabase.from("headline_outcomes" as any).insert({
      document_id, user_id: userId, variants: variants as any,
    } as any);

    logEvent("headline-sandbox", userId, 200, Date.now() - t0, { variants: variants.length });
    return jsonResponse({ variants, note: "heuristic scores — formula fit and length/clarity only, not a trained CTR model" });
  } catch (e) {
    const msg = String((e as any)?.message ?? e).slice(0, 400);
    logEvent("headline-sandbox", userId, 500, Date.now() - t0, { error: msg });
    return jsonResponse({ error: msg }, 500);
  }
});
