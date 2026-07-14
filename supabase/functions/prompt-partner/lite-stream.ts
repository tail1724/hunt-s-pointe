// Synthetic SSE stream that mimics OpenAI delta format the client already parses.
// Chunks the canned text into 3–6 word groups, jittered 25–45ms between frames.

import { corsHeaders } from "../_shared/auth.ts";
import { Bucket, nexusClosingPayload } from "./lite-library.ts";

function chunkWords(text: string): string[] {
  // Preserve code fences as single chunks so markdown doesn't break mid-stream.
  const parts: string[] = [];
  const segments = text.split(/(```[\s\S]*?```)/g);
  for (const seg of segments) {
    if (!seg) continue;
    if (seg.startsWith("```")) { parts.push(seg); continue; }
    const tokens = seg.match(/\S+\s*/g) ?? [seg];
    let buf = "";
    let count = 0;
    const target = 3 + Math.floor(Math.random() * 4); // 3–6 words per chunk
    for (const t of tokens) {
      buf += t;
      count++;
      if (count >= target) { parts.push(buf); buf = ""; count = 0; }
    }
    if (buf) parts.push(buf);
  }
  return parts;
}

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

export function streamCanned(text: string, bucket: Bucket, startMs: number): Response {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const chunks = chunkWords(text);

  (async () => {
    try {
      // Initial role frame.
      await writer.write(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { role: "assistant" } }] })}\n\n`));
      // Tiny initial pause to feel like the model is "thinking".
      await sleep(220 + Math.random() * 180);

      for (const c of chunks) {
        const frame = { choices: [{ delta: { content: c } }] };
        await writer.write(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
        await sleep(25 + Math.random() * 20);
      }

      // Closing nexus signal so the UI returns to idle / triggers the pulse.
      const nexus = nexusClosingPayload(bucket);
      await writer.write(encoder.encode(`data: ${JSON.stringify({ __nexus: nexus })}\n\n`));

      // Synthetic usage envelope matching the authed path shape.
      const usage = {
        prompt_tokens: 0,
        completion_tokens: Math.ceil(text.length / 4),
        total_tokens: Math.ceil(text.length / 4),
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify({ __nexus: { type: "usage", model: "sentient-lite", latency_ms: Date.now() - startMs, usage } })}\n\n`));
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (e) {
      console.error("lite stream error:", e);
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}
