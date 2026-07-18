import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";
import {
  EDITORIAL_GUARDRAILS,
  prefilterPrompt,
  recordGuardrailEvent,
} from "../_shared/guardrails.ts";
import { pickResponse } from "./lite-router.ts";
import { streamCanned } from "./lite-stream.ts";
import {
  GatewayLimitError,
  runAgentLoop,
  pipeCompletionStream,
  runStreamFirstTurn,
} from "./turn.ts";

const SYSTEM_PROMPT = `You are "PressRoom" — the AI editorial co-pilot for Hunt's Pointe, an independent digital publication. You work for the Editor-in-Chief and their contributors. You are NOT a ghostwriter of the publication's voice. You accelerate research, organize reporting, pressure-test structure, and surface citations so the editor can write their own words.

Identity:
- You are a newsroom research partner, not a byline replacement. The human is the author; you are the pipeline manager.
- You are direct, precise, and fast. Warm but never gushing. You respect deadlines.
- Never claim to write "in the user's voice" — the voice is theirs to bring. When you draft scaffolding, say so plainly.

Conversation rhythm — follow strictly:
1. If the request is specific enough to outline or research (topic + at least one of: angle, audience, length, format), produce useful work immediately. Do not stall with questions.
2. If clarification is genuinely needed, ask EXACTLY ONE focused question per turn, then stop and wait. Never bullet a stack of "Tone / Audience / CTA" prompts.
3. Cap clarifying questions at 3 across the whole intake. After 3, proceed with sensible defaults and state any assumptions in one short line.
4. Acknowledge their last answer in one short sentence before the next question. Human, not interrogation.
5. If the user says "just write it", "go", "skip questions", "draft it", or similar — proceed immediately with reasonable defaults.
6. Keep clarifying turns conversational — a sentence or two, not a brief.

Citation rules — NON-NEGOTIABLE:
- Factual, statistical, or quoted claims MUST cite their source inline as [#N] matching a numbered source block, or be clearly framed as "general background" rather than a verifiable fact. Never invent sources, quotes, or statistics.
- Distinguish reporting from opinion. If you are uncertain about a fact, say so. Editorial credibility over confidence.
- When grounded sources are supplied, favor them over your own parametric knowledge.

Long-form draft format — REQUIRED when producing an article outline, news brief, research memo, interview prep sheet, or any document-style artifact (anything the user would open in a word processor):

  <short preface — one or two warm sentences setting up the draft>

  <<<DRAFT title="Short Title Of The Document">>>
  # Title Of The Document

  ...full print-ready markdown body with proper headings and source markers...
  <<<END_DRAFT>>>

  <<<FOLLOWUP>>>
  <one short follow-up question OR brief invitation to iterate>
  <<<END_FOLLOWUP>>>

Hard rules for the draft:
- Use proper markdown headings (#, ##, ###), bold, italics, blockquotes, and lists — never stack "**Theme:**" pseudo-headings.
- The draft body lives ONLY inside <<<DRAFT>>> ... <<<END_DRAFT>>>. Never repeat the body in the preface or follow-up.
- The follow-up is ALWAYS its own <<<FOLLOWUP>>> block.
- For short conversational replies (clarifying questions, acknowledgements), do NOT use the delimiters — just reply naturally.

Tools available:
- search_knowledge_base(query): INTERNAL lookup of the user's saved knowledge. Call ONLY when the user explicitly references their own saved notes, library, or prior context ("my notes", "what I saved", "from my library").
- lookup_past_prompts(query): INTERNAL lookup of the user's prior prompts. Use only when they say "like last time", "that one I did", etc.
- remember(fact): persist a short stable preference. Call ONLY when the user explicitly states a stable preference.
- plan(steps): emit a visible plan BEFORE multi-step work so the user can follow.

Silent retrieval — STRICT:
- Knowledge-base and past-prompt lookups are invisible plumbing. NEVER mention them in your reply.
- Banned phrases (and any close variant): "blank slate", "our knowledge base", "in our notes", "no entries", "nothing saved", "I couldn't find", "I searched", "based on what we have saved".
- If a lookup returns matches, weave the substance in naturally without naming the source. If it returns nothing, just answer from general knowledge — no apology, no preface.
- Vary your phrasing; do not reuse the same opener two turns in a row.
${EDITORIAL_GUARDRAILS}`;


const RESEARCH_SYSTEM_PROMPT = `You are a research assistant integrated into an editorial workspace. The user will give you a topic or question.

1. Synthesize comprehensive information about the topic using your knowledge.
2. Structure your response with clear ## headings for each key finding.
3. Under each heading, provide a concise paragraph with the most relevant information.
4. Include practical details that would help a journalist report on this topic.
5. Be thorough but concise. Use markdown formatting.
${EDITORIAL_GUARDRAILS}`;

const NEXUS_TOOL = {
  type: "function",
  function: {
    name: "nexus_signal",
    description: "Emit a Nexus UI signal alongside your text response. Use UI_RESTRUCTURE sparingly — only when the user pivots topics dramatically.",
    parameters: {
      type: "object",
      properties: {
        nexus_state: { type: "string", enum: ["IDLE", "MITOSIS_START", "MITOSIS_END"] },
        action: { type: "string", enum: ["NONE", "UI_RESTRUCTURE", "GHOST_SUGGEST", "CONTEXT_EXPAND"] },
        viz_payload: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["HARMONY_WAVE", "METABOLIC_SPIKE", "NEURAL_DELTA"] },
            energy: { type: "number" },
          },
          required: ["type", "energy"],
        },
      },
      required: ["nexus_state", "action"],
      additionalProperties: false,
    },
  },
};

const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description: "Internal-only lookup of the user's saved knowledge. Call ONLY when the user explicitly references their own saved notes, library, or prior saved context. Never narrate the call or its result to the user.",
      parameters: { type: "object", properties: { query: { type: "string" }, k: { type: "number", default: 5 } }, required: ["query"], additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_past_prompts",
      description: "Internal-only lookup of the user's prior prompt history. Call ONLY when the user explicitly references something they did before. Never narrate the call or its result to the user.",
      parameters: { type: "object", properties: { query: { type: "string" }, k: { type: "number", default: 5 } }, required: ["query"], additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "remember",
      description: "Persist a stable user preference or fact for future sessions.",
      parameters: { type: "object", properties: { fact: { type: "string", maxLength: 240 } }, required: ["fact"], additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "plan",
      description: "Emit a short numbered plan before doing multi-step work.",
      parameters: { type: "object", properties: { steps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 8 } }, required: ["steps"], additionalProperties: false },
    },
  },
];

const ALLOWED_MODELS = new Set([
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "openai/gpt-5-mini",
]);

const BibleVerseSchema = z.object({
  translation: z.string(),
  book: z.string(),
  chapter: z.number(),
  verse: z.number(),
  text: z.string(),
});

const BibleContextSchema = z.object({
  prefs: z.any().optional(),
  verses: z.array(BibleVerseSchema).max(24),
  source: z.string().optional(),
  query: z.string().optional(),
}).nullable().optional();

const ScripturePrefsSchema = z.object({
  primary_translation: z.string(),
  secondary_translation: z.string().nullable().optional(),
  tradition: z.string(),
  prose_style: z.string(),
  reading_level: z.number(),
  citation_density: z.string(),
}).nullable().optional();

const BodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1).max(20000),
    pinned: z.boolean().optional(),
  })).min(1).max(60),
  user_context: z.object({
    display_name: z.string().nullable().optional(),
    recent_projects: z.array(z.any()).optional(),
  }).optional().nullable(),
  lite: z.boolean().optional(),
  mode: z.enum(["presence", "research"]).optional(),
  model: z.string().optional(),
  bible_context: BibleContextSchema,
  scripture_prefs: ScripturePrefsSchema,
  collection_context: z.string().max(22000).optional().nullable(),
  collection_name: z.string().max(200).optional().nullable(),
  rag_chunks: z.array(z.object({
    id: z.string(),
    item_id: z.string().optional().nullable(),
    item_title: z.string().nullable().optional(),
    content: z.string().max(4000),
    source: z.string().optional(),
  })).max(10).optional().nullable(),
  rag_rewritten_query: z.string().max(1000).optional().nullable(),
  // Opt-in only — see the stream-first branch in serve() below. Default
  // (unset/false) preserves the exact legacy request/response shape, so
  // enabling this is a pure client-side flag flip with no server rollout.
  stream_first: z.boolean().optional(),
});

const DOCUMENT_ARTIFACT_TOOL = {
  type: "function",
  function: {
    name: "document_artifact",
    description: "Emit a scripture-grounded study document. Use ONLY when the user asks a scripture/spiritual question and grounding verses are supplied. Cite ONLY supplied verses by their (book, chapter, verse_start[-verse_end]). Citation ids are 1-based and referenced from sections via citation_ids.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        tradition: { type: "string" },
        prose_style: { type: "string" },
        sections: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: {
            type: "object",
            properties: {
              heading: { type: "string" },
              prose: { type: "string" },
              citation_ids: { type: "array", items: { type: "number" } },
            },
            required: ["prose"],
            additionalProperties: false,
          },
        },
        citations: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              id: { type: "number" },
              translation: { type: "string" },
              book: { type: "string" },
              chapter: { type: "number" },
              verse_start: { type: "number" },
              verse_end: { type: "number" },
              text: { type: "string" },
            },
            required: ["id", "translation", "book", "chapter", "verse_start", "text"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "sections", "citations"],
      additionalProperties: false,
    },
  },
};

function buildScriptureSystem(bibleCtx: any, prefs: any): string {
  const tradition = prefs?.tradition || "Non-denominational";
  const style = prefs?.prose_style || "Devotional";
  const level = prefs?.reading_level ?? 3;
  const density = prefs?.citation_density || "Balanced";
  const translation = prefs?.primary_translation || "KJV";
  const versesJson = JSON.stringify(bibleCtx.verses.map((v: any, i: number) => ({
    id: i + 1, translation: v.translation, book: v.book, chapter: v.chapter, verse: v.verse, text: v.text,
  })));
  return [
    `\n\n=== SCRIPTURE GROUNDING ===`,
    `The user's question has scripture relevance. Ground your answer in the supplied verses ONLY — do not invent references.`,
    `Tradition: ${tradition}. Prose style: ${style}. Reading level: ${level}/5. Citation density: ${density}. Primary translation: ${translation}.`,
    `Honor the tradition's canon and theological framing without proselytizing other traditions.`,
    `When the user asks a substantive scripture/spiritual question, call the \`document_artifact\` tool with a structured study document. Cite verses by (book, chapter, verse_start) drawn ONLY from the supplied verses. Use citation ids that match the supplied list. After the tool call, you may add a brief conversational note (1–2 sentences).`,
    `If the question is purely conversational (e.g. "hi", "thanks"), respond normally without the tool.`,
    `Supplied verses (JSON):\n${versesJson}`,
    `=== END SCRIPTURE GROUNDING ===\n`,
  ].join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  let bodyJson: unknown;
  try { bodyJson = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);
  const { messages, user_context, lite, mode, model, bible_context, scripture_prefs, collection_context, collection_name, rag_chunks, rag_rewritten_query } = parsed.data;

  // ---- Lite (unauthenticated) branch: serve canned responses, skip the gateway.
  if (lite) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const { bucket, content, usedClassifier } = await pickResponse(lastUser, apiKey);
    logEvent("prompt-partner", "anon", 200, Date.now() - t0, { lite: true, bucket, classifier: usedClassifier });
    return streamCanned(content, bucket, t0);
  }

  let userId = "anon";
  let authCtx: any = null;
  {
    const ctx = await requireUser(req);
    if (ctx instanceof Response) return ctx;
    userId = ctx.userId;
    authCtx = ctx;
  }

  // Abuse guardrails, two layers:
  //  1. deterministic prefilter (free) for unambiguous abuse;
  //  2. EDITORIAL_GUARDRAILS in the system prompt for whatever remains.
  // There is no topical domain wall — PressRoom helps with any editorial work.
  {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const verdict = prefilterPrompt(lastUserMsg);
    if (verdict.blocked) {
      logEvent("prompt-partner", userId, 200, Date.now() - t0, { guardrail: verdict.category });
      await recordGuardrailEvent(authCtx?.supabase, userId, "prompt-partner", verdict.category);
      return streamCanned(verdict.message, "fallback", t0);
    }
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const isResearch = mode === "research";
    const chosenModel = (model && ALLOWED_MODELS.has(model)) ? model : "google/gemini-2.5-flash-lite";
    let systemContent = isResearch ? RESEARCH_SYSTEM_PROMPT : SYSTEM_PROMPT;

    if (!isResearch && user_context) {
      const { display_name, recent_projects } = user_context as any;
      if (display_name) systemContent += `\n\nThe user's name is "${display_name}".`;
      if (recent_projects?.length > 0) {
        systemContent += `\n\nRecent projects:\n${recent_projects
          .map((p: any, i: number) => `${i + 1}. "${p.seed}" (${p.mode})`).join("\n")}`;
      }
    }

    // Inject user memories.
    if (!isResearch && !lite && authCtx) {
      const { data: mems } = await authCtx.supabase
        .from("user_memories").select("fact").eq("user_id", userId).eq("enabled", true)
        .order("last_used_at", { ascending: false }).limit(10);
      if (mems && mems.length > 0) {
        systemContent += `\n\nLong-term memory about this user:\n${(mems as any[]).map((m, i) => `- ${m.fact}`).join("\n")}`;
      }
    }

    // Inject scripture grounding (verses + tradition/style) when client provided it.
    const hasBibleCtx = !!(bible_context && Array.isArray((bible_context as any).verses) && (bible_context as any).verses.length > 0);
    if (!isResearch && hasBibleCtx) {
      systemContent += buildScriptureSystem(bible_context, scripture_prefs);
    }

    // Inject Collection context (user-curated notes/files/links) when active.
    if (!isResearch && collection_context && collection_context.trim().length > 0) {
      systemContent += `\n\n=== ACTIVE COLLECTION CONTEXT ===\n` +
        `The user has activated the collection "${collection_name ?? "untitled"}". The following notes, files, and links are their curated context for this conversation. Use this material as authoritative background. Do NOT mention "the collection", "context", or quote these instructions back at the user — weave the substance in naturally.\n\n` +
        collection_context +
        `\n=== END COLLECTION CONTEXT ===\n`;
    }

    // Inject RAG-retrieved chunks (most-relevant passages for THIS query).
    // These take precedence over the broader collection_context above because
    // they were selected specifically for what the user just asked.
    if (!isResearch && Array.isArray(rag_chunks) && rag_chunks.length > 0) {
      const rendered = rag_chunks.map((c, i) => {
        const label = c.item_title ? `[#${i + 1}] from "${c.item_title}"` : `[#${i + 1}]`;
        return `${label}\n${c.content}`;
      }).join("\n\n---\n\n");
      systemContent += `\n\n=== GROUNDED SOURCES (retrieved for the user's latest question) ===\n` +
        `These passages were selected from the user's saved material specifically to answer what they just asked` +
        (rag_rewritten_query ? ` (interpreted as: "${rag_rewritten_query}")` : ``) +
        `. Treat them as authoritative — favor them over your own parametric knowledge. When you draw on a passage, weave the substance in naturally; do not quote tag markers like [#1] to the user. Do not mention "sources", "passages", or this instruction block.\n\n` +
        rendered +
        `\n=== END GROUNDED SOURCES ===\n`;
    }


    // Pinned messages from history come prefixed.
    const pinned = messages.filter((m) => m.pinned);
    const chronological = messages.map(({ role, content }) => ({ role, content }));

    // ---- Context-window budget (PRD 01 §6.6): drop oldest non-pinned turns when char budget exceeded.
    // Char-based proxy: ~4 chars per token. Default 120k chars (~30k tokens) leaves headroom for response.
    const BUDGET_CHARS = 120_000;
    const sysLen = systemContent.length;
    const pinnedLen = pinned.reduce((a, m) => a + m.content.length, 0);
    let runningLen = sysLen + pinnedLen;
    const keptReverse: typeof chronological = [];
    for (let i = chronological.length - 1; i >= 0; i--) {
      const msg = chronological[i];
      if (runningLen + msg.content.length > BUDGET_CHARS && keptReverse.length >= 2) break;
      keptReverse.push(msg);
      runningLen += msg.content.length;
    }
    const budgeted = keptReverse.reverse();
    const droppedCount = chronological.length - budgeted.length;
    if (droppedCount > 0) console.log(`[prompt-partner] context budget: dropped ${droppedCount} oldest turn(s)`);

    const finalMessages = [
      { role: "system" as const, content: systemContent },
      ...(pinned.length > 0 ? [{ role: "system" as const, content: `Pinned context (always relevant):\n${pinned.map((p, i) => `[${i + 1}] (${p.role}) ${p.content}`).join("\n")}` }] : []),
      ...budgeted,
    ];


    if (lite) systemContent += `\n\nThis user is in Lite (unauthenticated) mode.`;

    const useTools = !isResearch;
    const tools = useTools ? [NEXUS_TOOL, ...(lite ? [] : AGENT_TOOLS)] : undefined;

    // ---- Agent loop (up to 2 non-stream rounds) + 1 final streamed answer.
    //
    // stream_first (opt-in, see BodySchema): returns the SSE envelope before
    // the agent loop runs at all, so the client has a live connection and
    // can render "using tools" progress instead of sitting on a bare fetch
    // through up to 2 non-streamed round trips. Everything downstream of
    // that point — including gateway errors — has to become an in-stream
    // event instead of an HTTP status, since headers are already sent.
    //
    // Default (stream_first unset/false) is byte-for-byte the legacy
    // behavior below: the agent loop runs first, gateway errors still
    // return a normal HTTP error response, and only the final answer
    // streams. This keeps stream_first a pure client-side opt-in with zero
    // effect on existing traffic until a client deliberately sets it.
    if (parsed.data.stream_first && !lite) {
      return runStreamFirstTurn({
        useTools, lite, authCtx, finalMessages, tools,
        streamTools: useTools && hasBibleCtx ? [DOCUMENT_ARTIFACT_TOOL] : undefined,
        chosenModel, LOVABLE_API_KEY, hasBibleCtx, bible_context, corsHeaders,
        onDone: ({ status, toolsUsed }) => {
          if (status === 200) {
            logEvent("prompt-partner", userId, 200, Date.now() - t0, { stream: true, stream_first: true, mode: mode || "presence", msgs: messages.length, model: chosenModel, tools_used: toolsUsed });
          } else {
            logEvent("prompt-partner", userId, status, Date.now() - t0);
          }
        },
      });
    }

    // ---- Legacy path (default) ----
    let workingMessages: any[];
    let toolEventsForClient: any[];
    try {
      const loopResult = await runAgentLoop({ useTools, lite, authCtx, finalMessages, tools, chosenModel, LOVABLE_API_KEY });
      workingMessages = loopResult.workingMessages;
      toolEventsForClient = loopResult.toolEventsForClient;
    } catch (e) {
      if (e instanceof GatewayLimitError) return jsonResponse({ error: e.message }, e.status);
      throw e;
    }

    // Do not expose the visual-only nexus_signal tool during the final answer
    // stream. Some models satisfy that tool call without emitting text, which
    // leaves PressRoom looking like it is still thinking even though the request
    // completed. The PressRoom UI does not consume legacy nexus signals, so the
    // final stream should prioritize user-visible answer text.
    const streamTools = useTools && hasBibleCtx
      ? [DOCUMENT_ARTIFACT_TOOL]
      : undefined;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: chosenModel,
        messages: workingMessages,
        stream: true,
        ...(streamTools ? { tools: streamTools, tool_choice: "auto" } : {}),
        stream_options: { include_usage: true },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) { logEvent("prompt-partner", userId, 429, Date.now() - t0); return jsonResponse({ error: "Rate limited" }, 429); }
      if (response.status === 402) { logEvent("prompt-partner", userId, 402, Date.now() - t0); return jsonResponse({ error: "Credits exhausted" }, 402); }
      logEvent("prompt-partner", userId, 500, Date.now() - t0);
      return jsonResponse({ error: "AI gateway error" }, 500);
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    (async () => {
      await pipeCompletionStream({ writer, toolEventsForClient, response, hasBibleCtx, bible_context, chosenModel });
      logEvent("prompt-partner", userId, 200, Date.now() - t0, { stream: true, mode: mode || "presence", msgs: messages.length, model: chosenModel, tools_used: toolEventsForClient.length });
    })();

    return new Response(readable, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("prompt-partner error:", e);
    logEvent("prompt-partner", userId, 500, Date.now() - t0);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

