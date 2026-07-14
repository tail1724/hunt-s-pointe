import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";
import { verifyCitations } from "../_shared/verify-citations.ts";

const BodySchema = z.object({
  response: z.string().min(1).max(20_000),
  sources: z.array(z.object({
    content: z.string(),
    chunk_index: z.number().optional(),
  })).min(1).max(50),
});

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

  try {
    const result = await verifyCitations(parsed.data.response, parsed.data.sources);
    logEvent("verify-citations", userId, 200, Date.now() - t0, {
      verdict: result.verdict, claims: result.claims.length,
    });
    return jsonResponse(result);
  } catch (e) {
    const msg = String((e as any)?.message ?? e).slice(0, 400);
    logEvent("verify-citations", userId, 500, Date.now() - t0, { error: msg });
    return jsonResponse({ error: msg }, 500);
  }
});
