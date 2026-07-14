// Deno tests for the prompt-partner turn machinery — the pre-deploy
// validation gate for the stream_first path. Run via `npm run functions:test`
// (deno test with the _check config so remote imports resolve through npm).
import nodeAssert from "node:assert/strict";

const assert = (cond: unknown, msg?: string) => nodeAssert.ok(cond, msg);
const assertEquals = (a: unknown, b: unknown) => nodeAssert.deepEqual(a, b);
const assertInstanceOf = (v: unknown, c: new (...args: never[]) => unknown) =>
  nodeAssert.ok(v instanceof c, `expected instance of ${c.name}`);
const assertStringIncludes = (s: string, sub: string) =>
  nodeAssert.ok(s.includes(sub), `expected output to include ${sub}`);
import {
  GatewayLimitError,
  pipeCompletionStream,
  runAgentLoop,
  runStreamFirstTurn,
  validateCitations,
} from "./turn.ts";

const enc = new TextEncoder();

/** Fake gateway SSE response from an array of already-formatted lines. */
function sseResponse(lines: string[], status = 200): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const l of lines) controller.enqueue(enc.encode(l + "\n"));
      controller.close();
    },
  });
  return new Response(body, { status });
}

const dataLine = (obj: unknown) => `data: ${JSON.stringify(obj)}`;

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  return out;
}

/** Stub global fetch with a queue of responses; returns captured request bodies. */
function stubFetch(responses: (() => Response)[]): { calls: any[]; restore: () => void } {
  const original = globalThis.fetch;
  const calls: any[] = [];
  globalThis.fetch = ((_url: unknown, init?: RequestInit) => {
    calls.push(init?.body ? JSON.parse(init.body as string) : null);
    const next = responses.shift();
    if (!next) throw new Error("stubFetch: no responses left");
    return Promise.resolve(next());
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

const BIBLE_CTX = {
  verses: [{ translation: "KJV", book: "John", chapter: 3, verse: 16, text: "For God so loved…" }],
};

Deno.test("validateCitations drops citations not in the supplied verses", () => {
  const artifact = {
    title: "T",
    sections: [{ prose: "p", citation_ids: [1, 2] }],
    citations: [
      { id: 1, translation: "KJV", book: "John", chapter: 3, verse_start: 16, text: "For God" },
      { id: 2, translation: "KJV", book: "Luke", chapter: 15, verse_start: 1, text: "invented" },
    ],
  };
  const out = validateCitations(artifact, BIBLE_CTX);
  assertEquals(out.citations.length, 1);
  assertEquals(out.citations[0].id, 1);
  assertEquals(out.sections[0].citation_ids, [1]);
});

Deno.test("pipeCompletionStream: tool events first, text passthrough, artifact + usage on [DONE]", async () => {
  const gateway = sseResponse([
    dataLine({ choices: [{ delta: { content: "Hello" } }] }),
    "",
    dataLine({
      choices: [{
        delta: {
          tool_calls: [{
            index: 0,
            function: {
              name: "document_artifact",
              arguments: JSON.stringify({
                title: "Study",
                sections: [{ prose: "body", citation_ids: [1, 2] }],
                citations: [
                  { id: 1, translation: "KJV", book: "John", chapter: 3, verse_start: 16, text: "For God" },
                  { id: 2, translation: "KJV", book: "Luke", chapter: 15, verse_start: 1, text: "invented" },
                ],
              }),
            },
          }],
        },
      }],
    }),
    "",
    dataLine({ choices: [], usage: { completion_tokens: 42 } }),
    "",
    "data: [DONE]",
    "",
  ]);

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const outPromise = readAll(readable);
  await pipeCompletionStream({
    writer,
    toolEventsForClient: [{ name: "plan", args: { steps: ["a"] }, result: { ok: true } }],
    response: gateway,
    hasBibleCtx: true,
    bible_context: BIBLE_CTX,
    chosenModel: "test-model",
  });
  const out = await outPromise;

  // Ordering: tool_result before any answer text.
  const toolIdx = out.indexOf('"tool_result"');
  const helloIdx = out.indexOf("Hello");
  assert(toolIdx !== -1 && helloIdx !== -1 && toolIdx < helloIdx, "tool_result must precede content");

  // Artifact flushed on [DONE] with the invented citation stripped.
  const artifactLine = out.split("\n").find((l) => l.includes('"scripture_artifact"'));
  assert(artifactLine, "scripture_artifact event missing");
  const artifact = JSON.parse(artifactLine!.slice("data: ".length)).__nexus.data;
  assertEquals(artifact.citations.length, 1);
  assertEquals(artifact.sections[0].citation_ids, [1]);

  // Usage event carries the chosen model + gateway usage.
  assertStringIncludes(out, '"type":"usage"');
  assertStringIncludes(out, '"model":"test-model"');
  assertStringIncludes(out, '"completion_tokens":42');
  assertStringIncludes(out, "data: [DONE]");
});

Deno.test("runAgentLoop executes agent tools, reports rounds, then breaks", async () => {
  const stub = stubFetch([
    () => new Response(JSON.stringify({
      choices: [{ message: { role: "assistant", content: null, tool_calls: [
        { id: "tc1", function: { name: "plan", arguments: JSON.stringify({ steps: ["a", "b"] }) } },
      ] } }],
    }), { status: 200 }),
    () => new Response(JSON.stringify({
      choices: [{ message: { role: "assistant", content: "done", tool_calls: [] } }],
    }), { status: 200 }),
  ]);
  try {
    const rounds: number[] = [];
    const finalMessages = [{ role: "system", content: "s" }, { role: "user", content: "u" }];
    const { workingMessages, toolEventsForClient } = await runAgentLoop({
      useTools: true, lite: false, authCtx: { userId: "u1", supabase: {} },
      finalMessages, tools: [], chosenModel: "test-model", LOVABLE_API_KEY: "k",
      onRoundStart: (r) => rounds.push(r),
    });
    assertEquals(rounds, [0, 1]);
    assertEquals(stub.calls.length, 2);
    assertEquals(toolEventsForClient.length, 1);
    assertEquals(toolEventsForClient[0].name, "plan");
    // assistant tool-call message + tool result appended.
    assertEquals(workingMessages.length, finalMessages.length + 2);
    assertEquals(workingMessages.at(-1).role, "tool");
  } finally {
    stub.restore();
  }
});

Deno.test("runAgentLoop surfaces gateway limits as GatewayLimitError", async () => {
  const stub = stubFetch([() => new Response("rate", { status: 429 })]);
  try {
    let thrown: unknown = null;
    try {
      await runAgentLoop({
        useTools: true, lite: false, authCtx: { userId: "u1", supabase: {} },
        finalMessages: [{ role: "user", content: "u" }], tools: [],
        chosenModel: "test-model", LOVABLE_API_KEY: "k",
      });
    } catch (e) {
      thrown = e;
    }
    assertInstanceOf(thrown, GatewayLimitError);
    assertEquals((thrown as GatewayLimitError).status, 429);
  } finally {
    stub.restore();
  }
});

Deno.test("runStreamFirstTurn: happy path emits tool_status before the answer stream", async () => {
  const stub = stubFetch([
    // Agent round 0: no tool calls -> break to streaming.
    () => new Response(JSON.stringify({
      choices: [{ message: { role: "assistant", content: "", tool_calls: [] } }],
    }), { status: 200 }),
    // Final streamed answer.
    () => sseResponse([
      dataLine({ choices: [{ delta: { content: "Answer" } }] }),
      "",
      "data: [DONE]",
      "",
    ]),
  ]);
  try {
    let done: { status: number; toolsUsed: number } | null = null;
    const res = runStreamFirstTurn({
      useTools: true, lite: false, authCtx: { userId: "u1", supabase: {} },
      finalMessages: [{ role: "user", content: "u" }], tools: [], streamTools: undefined,
      chosenModel: "test-model", LOVABLE_API_KEY: "k",
      hasBibleCtx: false, bible_context: null,
      corsHeaders: { "Access-Control-Allow-Origin": "*" },
      onDone: (info) => { done = info; },
    });
    assertEquals(res.headers.get("Content-Type"), "text/event-stream");
    const out = await readAll(res.body!);
    // onDone (telemetry-only) fires one microtask after the stream closes —
    // the client never depends on it, but the assertion below does.
    await new Promise((r) => setTimeout(r, 0));

    const statusIdx = out.indexOf('"tool_status"');
    const answerIdx = out.indexOf("Answer");
    assert(statusIdx !== -1, "tool_status event missing");
    assert(answerIdx !== -1, "answer content missing");
    assert(statusIdx < answerIdx, "tool_status must arrive before the answer");
    assertStringIncludes(out, '"round":0');
    assertStringIncludes(out, "data: [DONE]");
    assertEquals(done, { status: 200, toolsUsed: 0 });
  } finally {
    stub.restore();
  }
});

Deno.test("runStreamFirstTurn: gateway 429 becomes an in-stream error event + [DONE]", async () => {
  const stub = stubFetch([
    // useTools=false skips the agent loop; this is the final (streaming) call.
    () => new Response("rate", { status: 429 }),
  ]);
  try {
    let done: { status: number; toolsUsed: number } | null = null;
    const res = runStreamFirstTurn({
      useTools: false, lite: false, authCtx: null,
      finalMessages: [{ role: "user", content: "u" }], tools: undefined, streamTools: undefined,
      chosenModel: "test-model", LOVABLE_API_KEY: "k",
      hasBibleCtx: false, bible_context: null,
      corsHeaders: {},
      onDone: (info) => { done = info; },
    });
    const out = await readAll(res.body!);
    assertStringIncludes(out, '"type":"error"');
    assertStringIncludes(out, '"code":429');
    assertStringIncludes(out, "data: [DONE]");
    assertEquals(done, { status: 429, toolsUsed: 0 });
  } finally {
    stub.restore();
  }
});

Deno.test("runStreamFirstTurn: agent-loop GatewayLimitError converts to in-stream error", async () => {
  const stub = stubFetch([
    // Agent round 0 hits the credit wall.
    () => new Response("out", { status: 402 }),
  ]);
  try {
    let done: { status: number; toolsUsed: number } | null = null;
    const res = runStreamFirstTurn({
      useTools: true, lite: false, authCtx: { userId: "u1", supabase: {} },
      finalMessages: [{ role: "user", content: "u" }], tools: [], streamTools: undefined,
      chosenModel: "test-model", LOVABLE_API_KEY: "k",
      hasBibleCtx: false, bible_context: null,
      corsHeaders: {},
      onDone: (info) => { done = info; },
    });
    const out = await readAll(res.body!);
    assertStringIncludes(out, '"type":"error"');
    assertStringIncludes(out, '"code":402');
    assertStringIncludes(out, "data: [DONE]");
    assertEquals(done, { status: 402, toolsUsed: 0 });
  } finally {
    stub.restore();
  }
});
