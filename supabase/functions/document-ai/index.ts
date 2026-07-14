import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";

const PRESET_INSTRUCTIONS: Record<string, string> = {
  comforting: "Rewrite the passage with a warm, comforting, pastoral tone suitable for someone in grief or hardship. Preserve theological accuracy.",
  deepen: "Deepen the theology of the passage. Add biblical depth, reference relevant doctrine, and strengthen scriptural grounding without becoming academic.",
  shorten: "Tighten the passage to roughly half its length. Preserve the core meaning, voice, and any scripture references.",
  scripture: "Weave in 1-2 apt scripture references (with citations like 'Romans 8:28') that strengthen the passage's point. Keep the user's voice.",
  simplify: "Rewrite the passage using simpler vocabulary and shorter sentences. Suitable for a broad congregation including youth and ESL readers.",
};

const BodySchema = z.object({
  action: z.enum(["rewrite", "continue", "command"]),
  preset: z.string().max(40).optional(),
  instruction: z.string().max(1000).optional(),
  selection: z.string().max(8000).optional(),
  context: z.string().max(8000).optional(),
  collection_context: z.string().max(22000).optional().nullable(),
  collection_name: z.string().max(200).optional().nullable(),
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
  const { action, preset, instruction, selection, context, collection_context, collection_name } = parsed.data;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return jsonResponse({ error: "AI not configured" }, 500);

  let systemPrompt = "";
  let userPrompt = "";

  if (action === "rewrite") {
    if (!selection || selection.trim().length < 1) return jsonResponse({ error: "Selection required" }, 400);
    const presetInstr = preset && PRESET_INSTRUCTIONS[preset];
    const finalInstr = instruction?.trim() || presetInstr || "Improve the passage while preserving its voice and meaning.";
    systemPrompt = `You are Ezra, a pastoral writing companion helping ministry leaders craft sermons, lessons, eulogies, and devotionals. Rewrite the user's selected passage per their instruction. Return ONLY the rewritten passage, no preamble, no quotes, no commentary, no markdown fences. Match the formatting (line breaks, paragraphs) of the original.`;
    userPrompt = `## Instruction\n${finalInstr}\n\n## Original passage\n${selection}\n\n## Rewritten passage`;
  } else if (action === "continue") {
    if (!context || context.trim().length < 1) return jsonResponse({ error: "Context required" }, 400);
    systemPrompt = `You are Ezra, a pastoral writing companion. Continue the user's document where they left off. Match their voice, tone, and theological perspective. Write 1-3 paragraphs of natural continuation. Return ONLY the continuation text, no preamble, no markdown fences.`;
    userPrompt = `## Document so far\n${context}\n\n## Continuation`;
  } else if (action === "command") {
    if (!instruction) return jsonResponse({ error: "Instruction required" }, 400);
    systemPrompt = `You are Ezra, a pastoral writing companion. Generate the requested content for inclusion in a religious document. Return ONLY the generated content, no preamble or commentary.`;
    userPrompt = `## Request\n${instruction}\n\n## Existing context\n${context ?? "(none)"}\n\n## Generated content`;
  }

  if (collection_context && collection_context.trim().length > 0) {
    systemPrompt += `\n\n=== ACTIVE COLLECTION CONTEXT ===\nThe writer has activated the collection "${collection_name ?? "untitled"}". Treat the material below as their authoritative background. Do not quote these instructions back.\n\n${collection_context}\n=== END COLLECTION CONTEXT ===`;
  }


  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      logEvent("document-ai", userId, status, Date.now() - t0, { action });
      if (status === 429) return jsonResponse({ error: "Rate limit exceeded. Try again shortly." }, 429);
      if (status === 402) return jsonResponse({ error: "Usage credits exhausted. Add credits in workspace settings." }, 402);
      const errText = await response.text().catch(() => "");
      return jsonResponse({ error: `AI error (${status})`, detail: errText.slice(0, 200) }, status);
    }

    const aiData = await response.json();
    const text: string = aiData.choices?.[0]?.message?.content ?? "";
    logEvent("document-ai", userId, 200, Date.now() - t0, { action, preset, chars: text.length });
    return jsonResponse({ text: text.trim() });
  } catch (e) {
    console.error("document-ai error:", e);
    logEvent("document-ai", userId, 500, Date.now() - t0);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
