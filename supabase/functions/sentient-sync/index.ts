import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  const ctx = await requireUser(req);
  if (ctx instanceof Response) return ctx;
  const userId = ctx.userId;

  try {
    // Use service role for cross-table aggregation
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: history } = await sb
      .from("prompt_history")
      .select("seed, mode, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    const { data: logs } = await sb
      .from("nexus_logs")
      .select("action_taken, mode, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    const totalEntries = (history?.length || 0) + (logs?.length || 0);
    const harmonyScore = Math.min(100, Math.max(20, totalEntries * 3 + 40));

    const now = new Date();
    const workflowDelta = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().slice(0, 10);
      const count = (history || []).filter((h: any) => h.created_at?.slice(0, 10) === dayStr).length;
      workflowDelta.push({ label: day.toLocaleDateString("en", { weekday: "short" }), value: count });
    }

    const modeCounts: Record<string, number> = {};
    for (const h of history || []) modeCounts[h.mode] = (modeCounts[h.mode] || 0) + 1;
    const resourceAllocation = Object.entries(modeCounts).map(([label, value]) => ({ label, value }));

    await sb.from("system_settings").upsert(
      { user_id: userId, harmony_score: harmonyScore, last_sync: new Date().toISOString() },
      { onConflict: "user_id" }
    );

    logEvent("sentient-sync", userId, 200, Date.now() - t0, { harmony: harmonyScore });
    return jsonResponse({ harmony_score: harmonyScore, workflow_delta: workflowDelta, resource_allocation: resourceAllocation });
  } catch (e) {
    console.error("sentient-sync error:", e);
    logEvent("sentient-sync", userId, 500, Date.now() - t0);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
