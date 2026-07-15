import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";
import { utilityChat } from "../_shared/utility-model.ts";

// Intelligent localization & regionalization (addendum feature 10). Beyond
// translation: idiom, spelling, units, and cultural touchstones shifted for
// a target regional sub-edition. Voice locks still apply — the EIC's
// fingerprint survives regionalization, it isn't a rewrite from scratch.

const BodySchema = z.object({
  document_id: z.string().uuid(),
  content_text: z.string().max(24000),
  locale: z.string().max(20),
  label: z.string().max(100).optional().nullable(),
  spelling_system: z.string().max(20).optional().nullable(),
  unit_system: z.string().max(20).optional().nullable(),
  idiom_notes: z.string().max(1000).optional().nullable(),
  voice_locks: z.array(z.string().max(200)).max(24).optional().nullable(),
});

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
  const { document_id, content_text, locale, label, spelling_system, unit_system, idiom_notes, voice_locks } = parsed.data;

  const system = [
    `You produce a regional sub-edition of an article for the "${label || locale}" (${locale}) audience.`,
    `Shift idioms, cultural touchstones, and phrasing that wouldn't land naturally for this audience — this is NOT a literal translation pass.`,
    spelling_system ? `Spelling: ${spelling_system}.` : "",
    unit_system ? `Convert units of measurement to: ${unit_system}.` : "",
    idiom_notes ? `Regional notes: ${idiom_notes}` : "",
    voice_locks && voice_locks.length > 0
      ? `VOICE LOCKS — protected stylistic traits, do not sanitize away even while localizing:\n${voice_locks.map((v) => `- ${v}`).join("\n")}`
      : "",
    `Preserve every fact, number, and quote exactly. Return ONLY the localized article body, no preamble.`,
  ].filter(Boolean).join("\n");

  try {
    const result = await utilityChat([
      { role: "system", content: system },
      { role: "user", content: content_text.slice(0, 10000) },
    ], { maxTokens: 3000, timeoutMs: 25_000 });

    if (!result) {
      logEvent("localize", userId, 502, Date.now() - t0);
      return jsonResponse({ error: "Localization model returned no result" }, 502);
    }

    const { data } = await supabase.from("document_assets" as any).insert({
      document_id, user_id: userId, asset_type: `regional:${locale}`, content: result,
    } as any).select("*").single();

    logEvent("localize", userId, 200, Date.now() - t0, { locale });
    return jsonResponse({ asset: data, content: result });
  } catch (e) {
    const msg = String((e as any)?.message ?? e).slice(0, 400);
    logEvent("localize", userId, 500, Date.now() - t0, { error: msg });
    return jsonResponse({ error: msg }, 500);
  }
});
