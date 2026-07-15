import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";

const PRESET_INSTRUCTIONS: Record<string, string> = {
  improve: "Improve the passage: clearer, stronger, better paced. Preserve the author's voice, meaning, and formatting.",
  expand: "Expand the passage with concrete detail and development. Stay in the author's voice; do not pad with filler.",
  shorten: "Tighten the passage to roughly half its length. Preserve the core meaning, voice, and every load-bearing fact.",
  grammar: "Fix grammar, punctuation, and spelling ONLY. Do not rephrase, reorder, or smooth the author's style in any way.",
  vivid: "Make the passage more vivid: concrete nouns, active verbs, specific imagery. Keep the author's cadence and voice.",
  simplify: "Rewrite the passage using simpler vocabulary and shorter sentences, keeping the author's voice and all facts intact.",
  tone_professional: "Shift the tone to professional and polished while keeping the author's voice recognizable and all facts intact.",
  tone_casual: "Shift the tone to casual and conversational while keeping the author's voice recognizable and all facts intact.",
  tone_confident: "Shift the tone to confident and assertive while keeping the author's voice recognizable and all facts intact.",
  tone_warm: "Shift the tone to warm and human while keeping the author's voice recognizable and all facts intact.",
  tone_punchy: "Shift the tone to punchy and direct — shorter sentences, harder verbs — while keeping the author's voice recognizable.",
};

// Deterministic voice-preservation rules injected into every editing call.
// Phase 3 layers per-user voice locks on top of these platform-wide defaults.
const VOICE_PRESERVATION = `
Voice-preservation rules (NON-NEGOTIABLE):
- The human is the author. Preserve their idiosyncratic markers: em dashes, sentence fragments, colloquialisms, paragraph-opening conjunctions, signature phrasings.
- Do NOT homogenize sentence lengths. Human cadence is uneven — keep it uneven.
- Avoid over-indexed AI vocabulary (e.g. "delve", "tapestry", "crucial", "multifaceted", "overarching", "landscape", "leverage", "robust") unless the original passage already uses the word.
- Never add throat-clearing openers or summary closers the author didn't write.`;

const BodySchema = z.object({
  action: z.enum(["rewrite", "continue", "command", "structure"]),
  preset: z.string().max(40).optional(),
  instruction: z.string().max(1000).optional(),
  selection: z.string().max(8000).optional(),
  context: z.string().max(8000).optional(),
  document_text: z.string().max(24000).optional(),
  collection_context: z.string().max(22000).optional().nullable(),
  collection_name: z.string().max(200).optional().nullable(),
  voice_locks: z.array(z.string().max(200)).max(24).optional().nullable(),
  style_rules: z.array(z.string().max(300)).max(40).optional().nullable(),
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
  const { action, preset, instruction, selection, context, document_text, collection_context, collection_name, voice_locks, style_rules } = parsed.data;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return jsonResponse({ error: "AI not configured" }, 500);

  let systemPrompt = "";
  let userPrompt = "";

  if (action === "rewrite") {
    if (!selection || selection.trim().length < 1) return jsonResponse({ error: "Selection required" }, 400);
    const presetInstr = preset && PRESET_INSTRUCTIONS[preset];
    const finalInstr = instruction?.trim() || presetInstr || "Improve the passage while preserving its voice and meaning.";
    systemPrompt = `You are PressRoom, the editorial co-pilot for an independent digital publication. Propose a revision of the author's selected passage per their instruction. Your output is a SUGGESTION rendered in the manuscript's margin — the author integrates it by hand — so return ONLY the proposed passage, no preamble, no quotes, no commentary, no markdown fences. Match the formatting (line breaks, paragraphs) of the original.${VOICE_PRESERVATION}`;
    userPrompt = `## Instruction\n${finalInstr}\n\n## Original passage\n${selection}\n\n## Proposed passage`;
  } else if (action === "continue") {
    if (!context || context.trim().length < 1) return jsonResponse({ error: "Context required" }, 400);
    systemPrompt = `You are PressRoom, the editorial co-pilot for an independent digital publication. Draft a possible continuation of the author's document from where they left off. Your output is a SUGGESTION rendered in the margin — the author integrates it by hand. Match their voice and register. Write 1-3 paragraphs. Return ONLY the continuation text, no preamble, no markdown fences.${VOICE_PRESERVATION}`;
    userPrompt = `## Document so far\n${context}\n\n## Continuation`;
  } else if (action === "command") {
    if (!instruction) return jsonResponse({ error: "Instruction required" }, 400);
    systemPrompt = `You are PressRoom, the editorial co-pilot for an independent digital publication. Generate the requested content as a margin suggestion for the author's document. Return ONLY the generated content, no preamble or commentary.${VOICE_PRESERVATION}`;
    userPrompt = `## Request\n${instruction}\n\n## Existing context\n${context ?? "(none)"}\n\n## Generated content`;
  } else if (action === "structure") {
    const docText = (document_text ?? context ?? "").trim();
    if (docText.length < 200) return jsonResponse({ error: "Document too short for structural analysis" }, 400);
    systemPrompt = `You are PressRoom, the editorial co-pilot for an independent digital publication, performing a READ-ONLY structural review of a draft. You never rewrite the prose — you analyze the macro-architecture and report to the editor.
Produce a concise markdown report with exactly these sections:
## Lede assessment — is the strongest material up top, or buried? Quote the sentence that should lead if different.
## Argument flow — does the logic progress? Name any gap, missing context, or unsupported leap, by paragraph.
## Reorder opportunities — at most 3 concrete "move X before Y because…" suggestions, or "None" if the order works.
## Subheading & retention — where a subhead or break would keep readers, and where the piece risks losing them.
Be specific: cite paragraph numbers and quote short fragments. No praise padding. No rewritten prose.`;
    userPrompt = `## Draft (paragraphs numbered by order)\n${docText.split(/\n{2,}/).map((p, i) => `[¶${i + 1}] ${p}`).join("\n\n")}\n\n## Structural report`;
  }

  // Per-user voice locks (Phase 3): traits the model is prohibited from sanitizing.
  if (voice_locks && voice_locks.length > 0 && action !== "structure") {
    systemPrompt += `\n\nVOICE LOCKS — this author's protected stylistic traits. You are strictly prohibited from removing or "correcting" any of these, even under a grammar or tone instruction:\n${voice_locks.map((v) => `- ${v}`).join("\n")}`;
  }

  // House style rules (Phase 3): publication-level constraints.
  if (style_rules && style_rules.length > 0) {
    systemPrompt += `\n\nHOUSE STYLE — publication rules every proposal must satisfy:\n${style_rules.map((r) => `- ${r}`).join("\n")}`;
  }

  if (collection_context && collection_context.trim().length > 0) {
    systemPrompt += `\n\n=== ACTIVE PROJECT CONTEXT ===\nThe writer has activated the project "${collection_name ?? "untitled"}". Treat the material below as their authoritative background. Do not quote these instructions back.\n\n${collection_context}\n=== END PROJECT CONTEXT ===`;
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
