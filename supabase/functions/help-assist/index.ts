import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse } from "../_shared/auth.ts";
import { utilityChat } from "../_shared/utility-model.ts";
import { planResponse, SYSTEM_PROMPT } from "./plan.ts";

// Ezra Guide: a docs-grounded helper for "how do I use Ezra" questions. It
// retrieves only from the published guide corpus (corpus.json, generated from
// src/data/guides.ts) — it cannot surface anything that isn't in the guides,
// which keeps implementation details and prompts out of reach by construction.
// Public endpoint (prospective users can ask too); no auth required.

const BodySchema = z.object({ question: z.string().min(1).max(500) });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: "Invalid request" }, 400);
  const question = parsed.data.question.trim();

  const plan = planResponse(question);

  if (plan.mode === "redirect") {
    return jsonResponse({
      answer:
        "That sounds like a Bible study question rather than a how-to. Ezra itself is built for exactly that — open a chat and ask it there.",
      actions: [{ label: "Open Ezra", to: "/app/ezra" }],
      escalated: false,
      redirect: "ezra",
    });
  }

  if (plan.mode === "escalate") {
    // Nothing relevant in the guides → offer a human rather than guess.
    return jsonResponse({
      answer:
        "I couldn't find that in the how-to guides. Browse the guides below, or email us and a person will help you out.",
      actions: [],
      escalated: true,
    });
  }

  const readGuide = { label: "Read the guide", to: `/learning/${plan.guideSlug}` };

  const llm = await utilityChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `CONTEXT:\n${plan.context}\n\nQUESTION: ${question}` },
    ],
    { maxTokens: 220, temperature: 0.2, timeoutMs: 8000 },
  );

  if (llm === "REDIRECT_EZRA") {
    return jsonResponse({
      answer: "That's a Bible study question — ask Ezra directly and it'll dig in with citations.",
      actions: [{ label: "Open Ezra", to: "/app/ezra" }],
      escalated: false,
      redirect: "ezra",
    });
  }

  // LLM unavailable (no key/timeout) or declined → fall back to the matched
  // guide itself, which is still genuinely useful: summarize and link out.
  if (!llm || llm === "NO_ANSWER") {
    return jsonResponse({
      answer: `Here's the guide that covers that: “${plan.guideTitle}.” Open it for step-by-step help.`,
      actions: [readGuide, ...plan.actions].slice(0, 3),
      escalated: false,
      guideSlug: plan.guideSlug,
    });
  }

  return jsonResponse({
    answer: llm,
    actions: plan.actions.length ? plan.actions : [readGuide],
    escalated: false,
    guideSlug: plan.guideSlug,
  });
});
