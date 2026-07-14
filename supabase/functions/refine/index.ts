import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";

const BodySchema = z.object({
  original_output: z.string().min(1).max(20000),
  corrective_input: z.string().min(1).max(4000),
  accuracy_score: z.number().int().min(1).max(10),
  seed: z.string().min(1).max(4000),
  platform: z.string().min(1).max(60),
});

function getStrategyPrompt(score: number): string {
  if (score >= 8) return "The user rated this output highly (8-10/10). Make ONLY minor cosmetic adjustments. Keep the core structure and concepts intact. Tweak phrasing and polish word choices based on the user's corrective input.";
  if (score >= 4) return "The user rated this output moderately (4-7/10). The core concept is right but execution needs significant rework. Keep the fundamental idea but substantially revise the details based on the user's corrective input.";
  return "The user rated this output poorly (1-3/10). The output missed the mark entirely. Start fresh with the same seed idea, completely reimagining the approach. Use the user's corrective input as the primary guide.";
}

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
  const { original_output, corrective_input, accuracy_score, seed, platform } = parsed.data;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert content refinement engine.

## Refinement Strategy
${getStrategyPrompt(accuracy_score)}

## Rules
- Return ONLY the refined output text.
- Maintain the same format as the original.
- Apply the user's corrective input precisely.`;

    const userPrompt = `## Original Seed Idea\n${seed}\n\n## Platform\n${platform}\n\n## Original Output (accuracy: ${accuracy_score}/10)\n${original_output}\n\n## User's Corrective Input\n${corrective_input}\n\nRefine the output now.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }),
    });

    if (!response.ok) {
      const status = response.status;
      logEvent("refine", userId, status, Date.now() - t0);
      if (status === 429) return jsonResponse({ error: "Rate limit exceeded." }, 429);
      if (status === 402) return jsonResponse({ error: "Usage credits exhausted." }, 402);
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await response.json();
    const refined = aiData.choices?.[0]?.message?.content || "";
    logEvent("refine", userId, 200, Date.now() - t0, { score: accuracy_score });
    return jsonResponse({ refined });
  } catch (e) {
    console.error("refine error:", e);
    logEvent("refine", userId, 500, Date.now() - t0);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
