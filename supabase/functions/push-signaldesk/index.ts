import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";

// Stage a document as a DRAFT in SignalDesk (Hampton Roads History).
//
// SignalDesk's ingest endpoint (POST /api/integrations/hunts-pointe) always
// creates a draft — a human editor publishes it in Payload's /admin. This
// function signs the payload with an HMAC shared secret and forwards it.
//
// Edge Function secrets (never exposed to the browser):
//   SIGNALDESK_INGEST_URL     e.g. https://<signaldesk-host>/api/integrations/hunts-pointe
//   SIGNALDESK_WEBHOOK_SECRET shared HMAC secret (matches SignalDesk WEBHOOK_SECRET)

const BodySchema = z.object({
  title: z.string().min(1).max(300),
  dek: z.string().max(500).optional().nullable(),
  byline: z.array(z.string()).optional().nullable(),
  section: z.string().max(100).optional().nullable(),
  story_tags: z.array(z.string()).optional().nullable(),
  publish_at: z.string().optional().nullable(),
  content_text: z.string().min(1).max(50000),
  slug: z.string().max(120).optional().nullable(),
});

async function hmacBase64(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { userId } = auth;

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const parsed = BodySchema.safeParse(input);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);

  const ingestUrl = Deno.env.get("SIGNALDESK_INGEST_URL");
  const secret = Deno.env.get("SIGNALDESK_WEBHOOK_SECRET");
  if (!ingestUrl || !secret) {
    return jsonResponse({ error: "SignalDesk integration is not configured" }, 500);
  }

  // The signed bytes must be byte-for-byte what we POST.
  const bodyStr = JSON.stringify(parsed.data);
  const signature = await hmacBase64(secret, bodyStr);

  let resp: Response;
  try {
    resp = await fetch(ingestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-signature": signature },
      body: bodyStr,
    });
  } catch (err) {
    logEvent("push-signaldesk", userId, 502, Date.now() - t0, { error: String(err) });
    return jsonResponse({ error: "Could not reach SignalDesk" }, 502);
  }

  const result = await resp.json().catch(() => ({}));
  logEvent("push-signaldesk", userId, resp.status, Date.now() - t0, { ok: resp.ok });
  if (!resp.ok) {
    return jsonResponse({ error: "SignalDesk rejected the draft", detail: result }, 502);
  }
  return jsonResponse({ ok: true, signaldesk_id: result.id ?? null, status: "draft" }, 200);
});
