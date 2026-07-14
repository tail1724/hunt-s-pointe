// Shared JWT auth + structured logging helpers for edge functions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function makeAuthedClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

export interface AuthedContext {
  userId: string;
  authHeader: string;
  // ReturnType of the actual factory call — `ReturnType<typeof createClient>`
  // resolves to the wrong overload (bare, no options) and its generic
  // defaults don't match the client this module really constructs.
  supabase: ReturnType<typeof makeAuthedClient>;
}

/**
 * Validate JWT in Authorization header; returns user_id from claims.
 * Returns Response on failure (caller should return it as-is).
 */
export async function requireUser(req: Request): Promise<AuthedContext | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const supabase = makeAuthedClient(authHeader);
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  return { userId: data.claims.sub as string, authHeader, supabase };
}

export function logEvent(fn: string, userId: string, status: number, latencyMs: number, extra: Record<string, unknown> = {}) {
  console.log(JSON.stringify({
    fn,
    user_id: userId,
    ts: new Date().toISOString(),
    latency_ms: latencyMs,
    status,
    ...extra,
  }));
}
