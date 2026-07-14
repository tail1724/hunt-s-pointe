// Internal-only cost ledger writer.
//
// Records the true dollar cost of a billable AI call alongside the credits the
// user was charged. The internal_cost_ledger table is service-role only (RLS
// on, no user policies), so this uses the service key rather than the caller's
// JWT. It is strictly best-effort: any failure is logged and swallowed so a
// bookkeeping problem can never fail the user's actual request.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

export interface LedgerEntry {
  userId: string;
  eventType: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  rawCostUsd: number;
  creditsCharged: number;
  powerLevel?: number;
  turbo?: boolean;
  metadata?: Record<string, unknown>;
}

export async function recordInternalCost(entry: LedgerEntry): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return;
    const admin = createClient(url, serviceKey);
    await admin.from("internal_cost_ledger").insert({
      user_id: entry.userId,
      event_type: entry.eventType,
      model: entry.model ?? null,
      input_tokens: entry.inputTokens ?? null,
      output_tokens: entry.outputTokens ?? null,
      raw_cost_usd: entry.rawCostUsd,
      credits_charged: entry.creditsCharged,
      power_level: entry.powerLevel ?? null,
      turbo: entry.turbo ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    console.error("recordInternalCost failed", e);
  }
}
