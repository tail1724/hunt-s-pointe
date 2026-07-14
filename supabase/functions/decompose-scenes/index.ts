import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";

const SYSTEM_PROMPT = `You are an expert content strategist. Your task is to decompose a content brief into a sequence of 12–20 distinct key scenes that together tell a compelling micro-story.

For each scene, provide:
1. A narrative caption (3–5 sentences) in present tense, evocative prose.
2. A detailed content generation prompt capturing the exact visual of that scene moment.

Rules:
- Scenes must flow logically: establish → build → climax → resolve
- Each scene visually distinct from the previous
- Captions hook the reader
- Prompts must be self-contained`;

const BodySchema = z.object({
  video_prompt: z.string().min(1).max(8000),
  negative_prompt: z.string().max(4000).optional(),
  scene_count: z.number().int().min(6).max(20).optional(),
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
  const { video_prompt, negative_prompt, scene_count } = parsed.data;

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const sceneCount = scene_count ?? 12;
    let userContent = `Decompose this content brief into exactly ${sceneCount} key scenes:\n\n${video_prompt}`;
    if (negative_prompt?.trim()) userContent += `\n\nMUST AVOID:\n${negative_prompt}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userContent }],
        tools: [{
          type: "function",
          function: {
            name: "output_scenes",
            parameters: {
              type: "object",
              properties: {
                scenes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      scene_number: { type: "integer" },
                      caption: { type: "string" },
                      image_prompt: { type: "string" },
                    },
                    required: ["scene_number", "caption", "image_prompt"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["scenes"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "output_scenes" } },
      }),
    });

    if (!aiResponse.ok) {
      logEvent("decompose-scenes", userId, aiResponse.status, Date.now() - t0);
      if (aiResponse.status === 429) return jsonResponse({ error: "Rate limit exceeded." }, 429);
      if (aiResponse.status === 402) return jsonResponse({ error: "Credits exhausted." }, 402);
      return jsonResponse({ error: "Failed to decompose scenes" }, 500);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      logEvent("decompose-scenes", userId, 500, Date.now() - t0);
      return jsonResponse({ error: "AI did not return structured scenes" }, 500);
    }

    const parsedT = JSON.parse(toolCall.function.arguments);
    const scenes = parsedT.scenes;
    if (!Array.isArray(scenes) || scenes.length === 0) return jsonResponse({ error: "No scenes were generated" }, 500);
    scenes.sort((a: any, b: any) => a.scene_number - b.scene_number);

    logEvent("decompose-scenes", userId, 200, Date.now() - t0, { scenes: scenes.length });
    return jsonResponse({ scenes });
  } catch (e) {
    console.error("decompose-scenes error:", e);
    logEvent("decompose-scenes", userId, 500, Date.now() - t0);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
