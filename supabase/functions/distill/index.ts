import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";

const BodySchema = z.object({ prompt: z.string().min(1).max(20000) });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const userId = ctx.userId;

  let bodyJson: unknown;
  try { bodyJson = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);
  const { prompt } = parsed.data;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: `You are an output optimization expert. Compress a long output down to approximately 50 of the most impactful tokens while preserving all critical specifications, subject identity, and intent. Return ONLY the distilled text.` },
          { role: "user", content: `Distill this output to ~50 critical tokens:\n\n${prompt}` },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      logEvent("distill", userId, status, Date.now() - t0);
      if (status === 429) return jsonResponse({ error: "Rate limit exceeded." }, 429);
      if (status === 402) return jsonResponse({ error: "Credits exhausted." }, 402);
      throw new Error(`AI error: ${status}`);
    }

    const data = await response.json();
    const distilled = data.choices?.[0]?.message?.content || "";
    logEvent("distill", userId, 200, Date.now() - t0, { chars: prompt.length });
    return jsonResponse({ distilled });
  } catch (e) {
    console.error("distill error:", e);
    logEvent("distill", userId, 500, Date.now() - t0);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
