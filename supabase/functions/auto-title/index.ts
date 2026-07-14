import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";

const Body = z.object({
  session_id: z.string().uuid(),
  first_user_msg: z.string().min(1).max(4000),
  first_assistant_msg: z.string().min(1).max(8000),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();
  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);
  const { session_id, first_user_msg, first_assistant_msg } = parsed.data;

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return jsonResponse({ error: "AI not configured" }, 500);

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Generate a 2-5 word title for this conversation. Plain text only, no quotes, no punctuation, Title Case." },
          { role: "user", content: `User: ${first_user_msg}\n\nAssistant: ${first_assistant_msg.slice(0, 600)}` },
        ],
        max_tokens: 16,
      }),
    });
    if (!res.ok) {
      logEvent("auto-title", ctx.userId, res.status, Date.now() - t0);
      return jsonResponse({ error: "Title gen failed" }, 502);
    }
    const json = await res.json();
    let title = (json.choices?.[0]?.message?.content || "").trim().replace(/^["']|["']$/g, "").slice(0, 60);
    if (!title) title = first_user_msg.slice(0, 40);

    await ctx.supabase.from("partner_sessions" as any).update({ title }).eq("id", session_id).eq("user_id", ctx.userId);
    logEvent("auto-title", ctx.userId, 200, Date.now() - t0);
    return jsonResponse({ title });
  } catch (e) {
    console.error("auto-title err", e);
    logEvent("auto-title", ctx.userId, 500, Date.now() - t0);
    return jsonResponse({ error: "Unknown error" }, 500);
  }
});
