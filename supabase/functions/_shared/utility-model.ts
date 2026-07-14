// The "utility model" — one hyper-cheap, fast model used for every small
// internal call in the RAG pipeline: query condensation, chunk tagging,
// hypothetical questions, summaries, self-checks, and multimodal analysis
// (captions, chart extraction, transcription).
//
// Default: google/gemini-2.5-flash-lite via the Lovable AI gateway (already
// the house pattern; multimodal, so it covers image/chart/audio work too).
// Swappable via the UTILITY_MODEL env var to any model the gateway exposes —
// including a self-hosted open-weights endpoint later, without code changes.

export const UTILITY_MODEL = Deno.env.get("UTILITY_MODEL") || "google/gemini-2.5-flash-lite";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type UtilityContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "input_audio"; input_audio: { data: string; format: string } };

export interface UtilityMessage {
  role: "system" | "user" | "assistant";
  content: string | UtilityContentPart[];
}

interface UtilityOpts {
  maxTokens?: number;
  timeoutMs?: number;
  temperature?: number;
}

/**
 * Single cheap completion. Returns null on any failure — callers must treat
 * utility calls as best-effort and degrade gracefully, never fail the request.
 */
export async function utilityChat(
  messages: UtilityMessage[],
  opts: UtilityOpts = {},
): Promise<string | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  try {
    const r = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: UTILITY_MODEL,
        messages,
        max_tokens: opts.maxTokens ?? 400,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const out = String(j.choices?.[0]?.message?.content ?? "").trim();
    return out || null;
  } catch {
    return null;
  }
}

/**
 * Utility completion that must return JSON. Extracts the first JSON value
 * from the reply (models love to wrap JSON in prose/fences). Null on failure.
 */
export async function utilityJson<T>(
  messages: UtilityMessage[],
  opts: UtilityOpts = {},
): Promise<T | null> {
  const raw = await utilityChat(messages, opts);
  if (!raw) return null;
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  // Try whole string first, then the first {...} or [...] block.
  for (const candidate of [cleaned, cleaned.match(/[\[{][\s\S]*[\]}]/)?.[0]]) {
    if (!candidate) continue;
    try { return JSON.parse(candidate) as T; } catch { /* next */ }
  }
  return null;
}
