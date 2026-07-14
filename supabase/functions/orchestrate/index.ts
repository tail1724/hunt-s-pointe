import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";

const SYSTEM_PROMPT = `You are an expert content processing engine. Your job is to transform a simple seed idea into richly detailed, production-ready outputs for multiple platforms.

## Core Principles
1. **Detailed Prose**: Write descriptive, specific content with sensory details and temporal sequences.
2. **Specific Details Over Generic Tags**: Ground every detail in observable, concrete reality.
3. **Anchor to the Subject**: Never replace the user's subject — enrich it.
4. **No Fluff Words**: Never use "stunning," "breathtaking," "beautiful."

## Platform-Specific Output Rules
### Output A (midjourney): Dense, structured keywords [subject], [attributes], [action], [environment], [technical].
### Output B (video_gen): 150-300 words of flowing descriptive prose.
### Output C (audio_gen): Complete sensory landscape in flowing prose.
### Output D (openai): A detailed narrative paragraph.
### Negative Output (negative_prompt): The inverse of the positive outputs.

## Inference Modes
- LITERAL: Honor the seed exactly.
- CREATIVE: Expand the seed with narrative elements.
- STYLIZED: Rewrite in a specific artistic style.

## Granularity
- 0-20: Minimal. 2-3 sentences.
- 21-50: Moderate. 4-6 sentences.
- 51-80: Rich. 6-10 sentences.
- 81-100: Maximum. 10+ sentences for Output B.`;

const BodySchema = z.object({
  seed: z.string().min(1).max(4000),
  selectedStacks: z.array(z.string().uuid()).max(20),
  mode: z.string().min(1).max(40),
  granularity: z.number().int().min(0).max(100),
  persona_data: z.object({ name: z.string(), description: z.string().nullable().optional() }).nullable().optional(),
  vibes: z.array(z.string()).max(50).optional(),
});

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
  const { seed, selectedStacks, mode, granularity, persona_data, vibes } = parsed.data;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let stacks: any[] = [];
    if (selectedStacks.length > 0) {
      const stacksRes = await fetch(`${SUPABASE_URL}/rest/v1/context_stacks?id=in.(${selectedStacks.join(",")})&select=*`, {
        headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      });
      stacks = await stacksRes.json();
    }

    const stacksDescription = stacks.map((s: any) =>
      `[${s.layer}/${s.category}] ${s.name}${s.description ? ` — ${s.description}` : ""}
  Integrate: ${s.positive_keywords.join(", ")}
  Avoid: ${(s.negative_keywords || []).join(", ") || "none"}`
    ).join("\n\n");

    const personaSection = persona_data
      ? `\n## Active Persona: "${persona_data.name}"\n${persona_data.description || ""}\n`
      : "";

    const vibeSection = vibes && vibes.length > 0
      ? `\n## Tag Cloud — Mood/Tone Directives\n${vibes.join(", ")}\n`
      : "";

    let vibeNegatives = "";
    if (vibes && vibes.length > 0) {
      const vibeTermsRes = await fetch(`${SUPABASE_URL}/rest/v1/vibe_cloud_terms?term=in.(${vibes.map((v: string) => `"${v}"`).join(",")})&select=negative_pair`, {
        headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
      });
      const vibeTermsData = await vibeTermsRes.json();
      const negPairs = vibeTermsData.map((v: any) => v.negative_pair).filter(Boolean);
      if (negPairs.length > 0) vibeNegatives = `\nAlso add to negative output: ${negPairs.join(", ")}`;
    }

    const userPrompt = `## Seed Idea\n${seed}\n\n## Mode: ${mode.toUpperCase()}\n\n## Granularity: ${granularity}/100\n${personaSection}${vibeSection}\n## Modules to Integrate\n${stacksDescription || "No specific modules — use best judgment."}\n${vibeNegatives}\nGenerate the processed outputs now.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "output_prompts",
            parameters: {
              type: "object",
              properties: {
                midjourney: { type: "string" }, video_gen: { type: "string" },
                audio_gen: { type: "string" }, openai: { type: "string" }, negative_prompt: { type: "string" },
              },
              required: ["midjourney", "video_gen", "audio_gen", "openai", "negative_prompt"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "output_prompts" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      logEvent("orchestrate", userId, status, Date.now() - t0);
      if (status === 429) return jsonResponse({ error: "Rate limit exceeded." }, 429);
      if (status === 402) return jsonResponse({ error: "Usage credits exhausted." }, 402);
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    if (toolCall?.function?.arguments) result = JSON.parse(toolCall.function.arguments);
    else {
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { midjourney: content, video_gen: "", audio_gen: "", openai: "", negative_prompt: "" };
    }

    logEvent("orchestrate", userId, 200, Date.now() - t0, { stacks: selectedStacks.length, granularity });
    return jsonResponse(result);
  } catch (e) {
    console.error("orchestrate error:", e);
    logEvent("orchestrate", userId, 500, Date.now() - t0);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
