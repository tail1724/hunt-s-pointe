import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const RODES_SYSTEM = `You are a prompt optimization engine. Given a raw user seed, transform it into a RODES-structured prompt:
- Role: Define who the AI should be
- Objective: State the clear goal
- Details: Add specifics, constraints, context
- Examples: Provide 1-2 illustrative examples if helpful
- Standards: Define quality criteria and what to avoid

Output ONLY the optimized prompt text. No explanations.`;

const JUDGE_SYSTEM = `You are an impartial evaluator comparing two AI outputs. Output A was generated from a raw, unoptimized seed. Output B was generated from a structured, optimized prompt derived from the same seed.

Evaluate the delta between them across 5 dimensions. Use the tool provided to return your structured assessment.`;

const JUDGE_TOOL = {
  type: "function",
  function: {
    name: "score_robustness",
    description: "Return the robustness assessment comparing Pipe A (raw) vs Pipe B (optimized) outputs.",
    parameters: {
      type: "object",
      properties: {
        creativity: { type: "number" },
        precision: { type: "number" },
        context_density: { type: "number" },
        compliance: { type: "number" },
        nuance: { type: "number" },
        delta_score: { type: "number" },
      },
      required: ["creativity", "precision", "context_density", "compliance", "nuance", "delta_score"],
      additionalProperties: false,
    },
  },
};

const BodySchema = z.object({
  seed: z.string().min(1).max(8000),
  force: z.boolean().optional(),
  cooldown_sec: z.number().int().min(0).max(3600).optional(),
});

// Cheap keyword-based category inference
function inferCategory(seed: string): string {
  const s = seed.toLowerCase();
  if (/\b(code|function|bug|api|typescript|python|sql|debug|refactor)\b/.test(s)) return "coding";
  if (/\b(story|poem|character|narrative|creative|write|novel|lyric)\b/.test(s)) return "creative";
  if (/\b(analyze|compare|evaluate|summary|report|data|metric)\b/.test(s)) return "analysis";
  if (/\b(image|photo|render|illustration|design|logo|video|scene)\b/.test(s)) return "visual";
  return "general";
}

async function callAI(apiKey: string, messages: any[], tools?: any[], toolChoice?: any) {
  const body: any = { model: MODEL, messages };
  if (tools) { body.tools = tools; body.tool_choice = toolChoice; }
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`AI error ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const { userId, supabase } = ctx;

  let bodyJson: unknown;
  try { bodyJson = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);
  const { seed, force, cooldown_sec } = parsed.data;

  try {
    // Cooldown gate
    if (!force) {
      const cd = cooldown_sec ?? 90;
      const since = new Date(Date.now() - cd * 1000).toISOString();
      const { data: recent } = await supabase
        .from("nexus_logs")
        .select("id")
        .eq("user_id", userId)
        .not("robustness_score", "is", null)
        .gte("created_at", since)
        .limit(1);
      if (recent && recent.length > 0) {
        logEvent("inference-benchmark", userId, 200, Date.now() - t0, { skipped: "cooldown" });
        return jsonResponse({ skipped: true, reason: "cooldown" });
      }
    }

    const category = inferCategory(seed);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const rodesResp = await callAI(LOVABLE_API_KEY, [
      { role: "system", content: RODES_SYSTEM },
      { role: "user", content: seed },
    ]);
    const optimizedPrompt = rodesResp.choices?.[0]?.message?.content || seed;

    const [pipeA, pipeB] = await Promise.allSettled([
      callAI(LOVABLE_API_KEY, [
        { role: "system", content: "Generate content based on this seed. Be thorough and creative." },
        { role: "user", content: seed },
      ]),
      callAI(LOVABLE_API_KEY, [
        { role: "system", content: "Generate content based on this optimized prompt. Be thorough and creative." },
        { role: "user", content: optimizedPrompt },
      ]),
    ]);

    const pipeAOutput = pipeA.status === "fulfilled" ? pipeA.value.choices?.[0]?.message?.content || "" : "";
    const pipeBOutput = pipeB.status === "fulfilled" ? pipeB.value.choices?.[0]?.message?.content || "" : "";

    let robustnessVector = { creativity: 50, precision: 50, context_density: 50, compliance: 50, nuance: 50 };
    let deltaScore = 0;
    try {
      const judgeResp = await callAI(LOVABLE_API_KEY, [
        { role: "system", content: JUDGE_SYSTEM },
        { role: "user", content: `## Original Seed\n${seed}\n\n## Output A (Raw Seed)\n${pipeAOutput || "[FAILED]"}\n\n## Output B (Optimized Prompt)\n${pipeBOutput}` },
      ], [JUDGE_TOOL], { type: "function", function: { name: "score_robustness" } });
      const toolCall = judgeResp.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const p = JSON.parse(toolCall.function.arguments);
        robustnessVector = {
          creativity: Math.min(100, Math.max(0, p.creativity || 50)),
          precision: Math.min(100, Math.max(0, p.precision || 50)),
          context_density: Math.min(100, Math.max(0, p.context_density || 50)),
          compliance: Math.min(100, Math.max(0, p.compliance || 50)),
          nuance: Math.min(100, Math.max(0, p.nuance || 50)),
        };
        deltaScore = Math.min(100, Math.max(-100, p.delta_score || 0));
      }
    } catch (e) {
      console.error("Judge scoring failed:", e);
    }

    const avgScore = Math.round(
      (robustnessVector.creativity + robustnessVector.precision + robustnessVector.context_density +
        robustnessVector.compliance + robustnessVector.nuance) / 5
    );

    // Persist directly here (server-side, trusted user_id)
    await supabase.from("nexus_logs").insert({
      user_id: userId,
      mode: "presence",
      action_taken: "BENCHMARK",
      category,
      robustness_score: avgScore,
      robustness_vector: robustnessVector,
      pipe_a_output: pipeAOutput.slice(0, 4000),
      pipe_b_output: pipeBOutput.slice(0, 4000),
      delta_score: deltaScore,
    });

    logEvent("inference-benchmark", userId, 200, Date.now() - t0, { category, score: avgScore, delta: deltaScore });

    return jsonResponse({
      pipe_a: pipeAOutput.slice(0, 2000),
      pipe_b: pipeBOutput.slice(0, 2000),
      optimized_prompt: optimizedPrompt,
      robustness_vector: robustnessVector,
      delta_score: deltaScore,
      robustness_score: avgScore,
      category,
    });
  } catch (e) {
    console.error("inference-benchmark error:", e);
    logEvent("inference-benchmark", userId, 500, Date.now() - t0);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
