// Turn machinery for prompt-partner, extracted from index.ts so the
// agent-tool loop, SSE piping, and the stream-first envelope are directly
// importable by Deno tests (importing index.ts would execute serve()).
// Behavior is identical to the previously inlined code — index.ts now just
// wires request parsing/auth/context around these.
import { embedText } from "../_shared/embed.ts";

/** Thrown by the agent-tool loop when the gateway itself is rate-limited or
 *  out of credits. The legacy path turns this into an HTTP error response;
 *  the stream-first path can't change status after headers are sent, so it
 *  turns this into an in-stream `__nexus` error event instead. */
export class GatewayLimitError extends Error {
  constructor(public status: 429 | 402) {
    super(status === 429 ? "Rate limited" : "Credits exhausted");
  }
}

export function normBook(b: string): string {
  return String(b || "").toLowerCase().replace(/[\s_]+/g, "-");
}

export function validateCitations(artifact: any, bibleCtx: any): any {
  if (!artifact || !Array.isArray(artifact.citations)) return artifact;
  const supplied = new Set(
    (bibleCtx.verses || []).map((v: any) => `${normBook(v.book)}|${v.chapter}|${v.verse}`),
  );
  const validIds = new Set<number>();
  artifact.citations = artifact.citations.filter((c: any) => {
    const key = `${normBook(c.book)}|${c.chapter}|${c.verse_start}`;
    const ok = supplied.has(key);
    if (ok) validIds.add(c.id);
    return ok;
  });
  if (Array.isArray(artifact.sections)) {
    for (const s of artifact.sections) {
      if (Array.isArray(s.citation_ids)) {
        s.citation_ids = s.citation_ids.filter((id: number) => validIds.has(id));
      }
    }
  }
  return artifact;
}

export async function executeAgentTool(name: string, args: any, ctx: any): Promise<string> {
  try {
    if (name === "search_knowledge_base") {
      const emb = await embedText(args.query);
      const { data } = await ctx.supabase.rpc("match_knowledge", {
        query_embedding: emb as any, target_user: ctx.userId, match_count: Math.min(args.k ?? 5, 10),
      });
      if (!data || data.length === 0) {
        return JSON.stringify({ status: "no_saved_context", note: "Proceed normally from general knowledge. Do not mention this lookup or its absence to the user." });
      }
      return JSON.stringify({ matches: data });
    }
    if (name === "lookup_past_prompts") {
      const emb = await embedText(args.query);
      const { data } = await ctx.supabase.rpc("match_past_prompts", {
        query_embedding: emb as any, target_user: ctx.userId, match_count: Math.min(args.k ?? 5, 10),
      });
      if (!data || data.length === 0) {
        return JSON.stringify({ status: "no_saved_context", note: "Proceed normally from general knowledge. Do not mention this lookup or its absence to the user." });
      }
      return JSON.stringify({ matches: data });
    }
    if (name === "remember") {
      const fact = String(args.fact || "").slice(0, 240).trim();
      if (!fact) return JSON.stringify({ ok: false, error: "empty" });
      await ctx.supabase.from("user_memories").insert({ user_id: ctx.userId, fact, source: "sentient" });
      return JSON.stringify({ ok: true, fact });
    }
    if (name === "plan") {
      return JSON.stringify({ ok: true, acknowledged: true });
    }
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
  return JSON.stringify({ error: "unknown_tool" });
}

/**
 * Up to 2 non-streamed rounds giving the model a chance to call
 * search_knowledge_base / lookup_past_prompts / remember / plan before the
 * final answer streams. Shared verbatim between the legacy path (runs
 * before any response headers are sent, so a gateway error can still
 * return a normal HTTP status) and the stream-first path (runs after
 * headers are already sent, so a gateway error becomes an in-stream event
 * instead — see GatewayLimitError above).
 */
export async function runAgentLoop(params: {
  useTools: boolean;
  lite: boolean | undefined;
  authCtx: any;
  finalMessages: any[];
  tools: any[] | undefined;
  chosenModel: string;
  LOVABLE_API_KEY: string;
  onRoundStart?: (round: number) => void;
}): Promise<{ workingMessages: any[]; toolEventsForClient: any[] }> {
  const { useTools, lite, authCtx, finalMessages, tools, chosenModel, LOVABLE_API_KEY, onRoundStart } = params;
  let workingMessages: any[] = finalMessages;
  const toolEventsForClient: any[] = [];
  if (!(useTools && !lite && authCtx)) return { workingMessages, toolEventsForClient };

  for (let round = 0; round < 2; round++) {
    onRoundStart?.(round);
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: chosenModel, messages: workingMessages, tools, tool_choice: "auto" }),
    });
    if (!r.ok) {
      if (r.status === 429) throw new GatewayLimitError(429);
      if (r.status === 402) throw new GatewayLimitError(402);
      break; // fall through to streaming
    }
    const j = await r.json();
    const msg = j.choices?.[0]?.message;
    const toolCalls = msg?.tool_calls ?? [];
    const agentCalls = toolCalls.filter((tc: any) => tc.function?.name && tc.function.name !== "nexus_signal");
    if (agentCalls.length === 0) {
      // No agent tools requested — break to streaming.
      // If model also produced final content here, we'll just stream the same prompt; cheaper to re-stream.
      break;
    }
    // Execute each agent tool.
    workingMessages = [...workingMessages, msg];
    for (const tc of agentCalls) {
      let parsedArgs: any = {};
      try { parsedArgs = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }
      const result = await executeAgentTool(tc.function.name, parsedArgs, authCtx);
      workingMessages.push({ role: "tool", tool_call_id: tc.id, content: result });
      toolEventsForClient.push({ name: tc.function.name, args: parsedArgs, result: safeParse(result) });
    }
    // Loop again — model may chain.
  }
  return { workingMessages, toolEventsForClient };
}

/**
 * Pipes the final streamed chat-completion response through to the client,
 * translating tool-call deltas into scripture_artifact / nexus_signal
 * events on [DONE] and appending a usage event. Shared verbatim between
 * the legacy and stream-first paths — this is the delicate SSE-parsing
 * logic, so it exists exactly once.
 */
export async function pipeCompletionStream(params: {
  writer: WritableStreamDefaultWriter<Uint8Array>;
  toolEventsForClient: any[];
  response: Response;
  hasBibleCtx: boolean;
  bible_context: any;
  chosenModel: string;
}): Promise<void> {
  const { writer, toolEventsForClient, response, hasBibleCtx, bible_context, chosenModel } = params;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Emit tool events first (before any text) so the UI can render plan + citations.
  for (const ev of toolEventsForClient) {
    await writer.write(encoder.encode(`data: ${JSON.stringify({ __nexus: { type: "tool_result", ...ev } })}\n\n`));
  }

  // Heartbeat every 15s to defeat proxy buffering (PRD 01 §12 risk).
  const heartbeat = setInterval(() => {
    writer.write(encoder.encode(`: hb\n\n`)).catch(() => clearInterval(heartbeat));
  }, 15_000);

  const reader = response.body!.getReader();
  // Accumulate tool-call arguments per call-index, tracking name separately.
  const toolBuf: Record<number, { name?: string; args: string }> = {};
  let buffer = "";
  let usage: any = null;
  const startMs = Date.now();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIdx).replace(/\r$/, "");
        buffer = buffer.slice(newlineIdx + 1);
        if (!line.startsWith("data: ")) { await writer.write(encoder.encode(line + "\n")); continue; }
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          // Flush each accumulated tool call.
          for (const idx of Object.keys(toolBuf)) {
            const entry = toolBuf[Number(idx)];
            if (!entry.args) continue;
            try {
              const parsedArgs = JSON.parse(entry.args);
              if (entry.name === "document_artifact" && hasBibleCtx) {
                const validated = validateCitations(parsedArgs, bible_context);
                await writer.write(encoder.encode(`data: ${JSON.stringify({ __nexus: { type: "scripture_artifact", data: validated } })}\n\n`));
              } else if (entry.name === "nexus_signal" || !entry.name) {
                await writer.write(encoder.encode(`data: ${JSON.stringify({ __nexus: parsedArgs })}\n\n`));
              }
            } catch { /* ignore */ }
          }
          await writer.write(encoder.encode(`data: ${JSON.stringify({ __nexus: { type: "usage", model: chosenModel, latency_ms: Date.now() - startMs, usage } })}\n\n`));
          await writer.write(encoder.encode("data: [DONE]\n\n"));
          continue;
        }
        try {
          const parsedLine = JSON.parse(jsonStr);
          if (parsedLine.usage) usage = parsedLine.usage;
          const delta = parsedLine.choices?.[0]?.delta;
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = typeof tc.index === "number" ? tc.index : 0;
              if (!toolBuf[idx]) toolBuf[idx] = { args: "" };
              if (tc.function?.name) toolBuf[idx].name = tc.function.name;
              if (tc.function?.arguments) toolBuf[idx].args += tc.function.arguments;
            }
            continue;
          }
          await writer.write(encoder.encode(line + "\n"));
        } catch { await writer.write(encoder.encode(line + "\n")); }
      }
    }
    if (buffer.trim()) await writer.write(encoder.encode(buffer));
  } catch (e) {
    console.error("Stream processing error:", e);
  } finally {
    clearInterval(heartbeat);
    await writer.close();
  }
}

/**
 * The stream-first envelope: returns the SSE Response BEFORE the agent loop
 * runs, so the client has a live connection and can render "using tools"
 * progress instead of sitting on a bare fetch through up to 2 non-streamed
 * round trips. Everything downstream — including gateway errors — becomes
 * an in-stream `__nexus` event, since headers are already sent.
 */
export function runStreamFirstTurn(params: {
  useTools: boolean;
  lite: boolean | undefined;
  authCtx: any;
  finalMessages: any[];
  tools: any[] | undefined;
  streamTools: any[] | undefined;
  chosenModel: string;
  LOVABLE_API_KEY: string;
  hasBibleCtx: boolean;
  bible_context: any;
  corsHeaders: Record<string, string>;
  /** Called exactly once when the turn settles (success or converted error). */
  onDone: (info: { status: number; toolsUsed: number }) => void;
}): Response {
  const {
    useTools, lite, authCtx, finalMessages, tools, streamTools, chosenModel,
    LOVABLE_API_KEY, hasBibleCtx, bible_context, corsHeaders, onDone,
  } = params;
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    let toolEventsForClient: any[] = [];
    try {
      const loopResult = await runAgentLoop({
        useTools, lite, authCtx, finalMessages, tools, chosenModel, LOVABLE_API_KEY,
        onRoundStart: (round) => {
          writer.write(encoder.encode(`data: ${JSON.stringify({ __nexus: { type: "tool_status", round } })}\n\n`)).catch(() => {});
        },
      });
      toolEventsForClient = loopResult.toolEventsForClient;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: chosenModel,
          messages: loopResult.workingMessages,
          stream: true,
          ...(streamTools ? { tools: streamTools, tool_choice: "auto" } : {}),
          stream_options: { include_usage: true },
        }),
      });

      if (!response.ok) {
        const code = response.status === 429 ? 429 : response.status === 402 ? 402 : 500;
        await writer.write(encoder.encode(`data: ${JSON.stringify({ __nexus: { type: "error", code } })}\n\n`));
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        onDone({ status: code, toolsUsed: toolEventsForClient.length });
        return;
      }

      await pipeCompletionStream({ writer, toolEventsForClient, response, hasBibleCtx, bible_context, chosenModel });
      onDone({ status: 200, toolsUsed: toolEventsForClient.length });
    } catch (e) {
      const code = e instanceof GatewayLimitError ? e.status : 500;
      if (!(e instanceof GatewayLimitError)) console.error("prompt-partner stream-first error:", e);
      await writer.write(encoder.encode(`data: ${JSON.stringify({ __nexus: { type: "error", code } })}\n\n`)).catch(() => {});
      await writer.write(encoder.encode("data: [DONE]\n\n")).catch(() => {});
      onDone({ status: code, toolsUsed: toolEventsForClient.length });
    } finally {
      await writer.close().catch(() => {});
    }
  })();

  return new Response(readable, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}

function safeParse(s: string) { try { return JSON.parse(s); } catch { return s; } }
