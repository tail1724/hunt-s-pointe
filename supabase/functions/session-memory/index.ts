// Rolling conversation memory for PressRoom sessions (pipeline v2).
//
// Called fire-and-forget after each completed assistant turn. Maintains one
// row per session: a running summary plus a short list of salient facts
// (passage under study, sermon date, audience, decisions made). Generation
// then sends `summary + last N verbatim turns` instead of the whole
// transcript — long conversations keep their memory without bloating the
// context window.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";
import { utilityJson } from "../_shared/utility-model.ts";

const BodySchema = z.object({
  session_id: z.string().uuid(),
});

const MAX_NEW_TURNS_PER_UPDATE = 12;
const CLIP_CHARS = 900;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  let bodyJson: unknown;
  try { bodyJson = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);
  const { session_id } = parsed.data;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const { data: session } = await admin
      .from("partner_sessions")
      .select("id, user_id, messages")
      .eq("id", session_id)
      .maybeSingle();
    if (!session) return jsonResponse({ error: "Session not found" }, 404);
    if ((session as any).user_id !== userId) return jsonResponse({ error: "Forbidden" }, 403);

    const messages = Array.isArray((session as any).messages) ? (session as any).messages : [];
    const { data: memory } = await admin
      .from("session_memories")
      .select("summary, facts, turns_covered")
      .eq("session_id", session_id)
      .maybeSingle();

    const covered = (memory as any)?.turns_covered ?? 0;
    if (messages.length <= covered) {
      return jsonResponse({ ok: true, unchanged: true, turns_covered: covered });
    }

    const newTurns = messages
      .slice(covered, covered + MAX_NEW_TURNS_PER_UPDATE)
      .map((m: any) => `${m.role === "user" ? "User" : "PressRoom"}: ${String(m.content ?? "").slice(0, CLIP_CHARS)}`)
      .join("\n\n");
    const coveredNow = Math.min(messages.length, covered + MAX_NEW_TURNS_PER_UPDATE);

    const out = await utilityJson<{ summary: string; facts: string[] }>([
      {
        role: "system",
        content:
          `You maintain the running memory of a conversation between an editor/writer and PressRoom, an editorial research assistant.\n` +
          `Given the EXISTING memory and the NEW turns, return JSON only: {"summary": "...", "facts": ["..."]}.\n` +
          `summary: a dense third-person summary of the whole conversation so far, max 1200 characters. Preserve the story being worked, sources under discussion, the deliverable being built, decisions made, and open questions.\n` +
          `facts: up to 8 short stable facts worth pinning (e.g. "Filing the transit story Friday", "Audience: newsletter subscribers", "House style: no oxford comma"). Carry forward still-true facts; drop superseded ones.`,
      },
      {
        role: "user",
        content:
          `EXISTING memory summary:\n${(memory as any)?.summary || "(none — conversation just started)"}\n\n` +
          `EXISTING facts:\n${JSON.stringify((memory as any)?.facts ?? [])}\n\n` +
          `NEW turns:\n${newTurns}`,
      },
    ], { maxTokens: 600, timeoutMs: 10_000 });

    if (!out || typeof out.summary !== "string") {
      // Model failed — advance nothing; next call retries the same turns.
      return jsonResponse({ ok: false, unchanged: true, turns_covered: covered });
    }

    const row = {
      session_id,
      user_id: userId,
      summary: out.summary.slice(0, 2000),
      facts: Array.isArray(out.facts) ? out.facts.slice(0, 8).map((f) => String(f).slice(0, 200)) : [],
      turns_covered: coveredNow,
      updated_at: new Date().toISOString(),
    };
    await admin.from("session_memories").upsert(row as any, { onConflict: "session_id" } as any);

    logEvent("session-memory", userId, 200, Date.now() - t0, {
      session_id, turns: messages.length, covered: coveredNow,
    });
    return jsonResponse({ ok: true, summary: row.summary, facts: row.facts, turns_covered: coveredNow });
  } catch (e) {
    const msg = String((e as any)?.message ?? e).slice(0, 400);
    logEvent("session-memory", userId, 500, Date.now() - t0, { error: msg });
    return jsonResponse({ error: msg }, 500);
  }
});
