import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";
import { utilityChat } from "../_shared/utility-model.ts";

// Intention-driven bulk processing & pipeline orchestrator (addendum
// feature 9). Runs one instruction template across a batch of raw inputs —
// press releases, wire copy, interview transcripts — and files every
// output as a `draft` document. Nothing here skips human review: every
// item lands in the same Newsroom queue a manually created document would,
// flagged `auto_created` like every other system-generated draft.

const MAX_ITEMS = 20;

const BodySchema = z.object({
  template_name: z.string().max(200),
  instruction: z.string().min(1).max(2000),
  output_status: z.enum(["draft", "in_review"]).default("draft"),
  raw_inputs: z.array(z.string().min(1).max(12000)).min(1).max(MAX_ITEMS),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { userId, supabase } = auth;

  let bodyJson: unknown;
  try { bodyJson = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);
  const { template_name, instruction, output_status, raw_inputs } = parsed.data;

  const { data: run, error: runErr } = await supabase.from("pipeline_runs" as any).insert({
    user_id: userId, status: "running", item_count: raw_inputs.length,
  } as any).select("*").single();
  if (runErr || !run) return jsonResponse({ error: "Could not start pipeline run" }, 500);
  const runId = (run as any).id as string;

  const results: Array<{ status: "done" | "failed"; document_id?: string; error?: string }> = [];

  for (const rawInput of raw_inputs) {
    const { data: item } = await supabase.from("pipeline_run_items" as any).insert({
      run_id: runId, user_id: userId, raw_input: rawInput.slice(0, 12000), status: "pending",
    } as any).select("*").single();
    const itemId = (item as any)?.id as string | undefined;

    try {
      const system = `You run a production pipeline step for an independent publication: "${template_name}".\nInstruction: ${instruction}\nTake the RAW INPUT and produce a clean, standardized, publication-ready draft in markdown. Include a headline as a level-1 heading. Never invent facts not present in the input.`;
      const draft = await utilityChat([
        { role: "system", content: system },
        { role: "user", content: `RAW INPUT:\n${rawInput}` },
      ], { maxTokens: 1600, timeoutMs: 20_000 });

      if (!draft) throw new Error("Model returned no draft");

      const headlineMatch = draft.match(/^#\s+(.+)$/m);
      const title = headlineMatch?.[1]?.trim().slice(0, 200) || template_name;
      const body = draft.replace(/^#\s+.+\n?/, "").trim();

      const { data: doc, error: docErr } = await supabase.from("documents" as any).insert({
        user_id: userId,
        title,
        headline: title,
        content: { type: "doc", content: body.split(/\n{2,}/).filter(Boolean).map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })) },
        content_text: body,
        source: "manual",
        auto_created: true,
        status: output_status,
      } as any).select("id").single();
      if (docErr || !doc) throw new Error(docErr?.message || "Could not create document");

      if (itemId) {
        await supabase.from("pipeline_run_items" as any).update({ status: "done", document_id: (doc as any).id } as any).eq("id", itemId);
      }
      results.push({ status: "done", document_id: (doc as any).id });
    } catch (e) {
      const msg = String((e as any)?.message ?? e).slice(0, 300);
      if (itemId) {
        await supabase.from("pipeline_run_items" as any).update({ status: "failed", error: msg } as any).eq("id", itemId);
      }
      results.push({ status: "failed", error: msg });
    }
  }

  const anyFailed = results.some((r) => r.status === "failed");
  await supabase.from("pipeline_runs" as any).update({
    status: anyFailed && results.every((r) => r.status === "failed") ? "failed" : "completed",
    completed_at: new Date().toISOString(),
  } as any).eq("id", runId);

  logEvent("pipeline-run", userId, 200, Date.now() - t0, {
    items: raw_inputs.length, done: results.filter((r) => r.status === "done").length,
  });
  return jsonResponse({ run_id: runId, results });
});
