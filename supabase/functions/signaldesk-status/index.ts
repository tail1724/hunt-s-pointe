import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";

// Read-only downstream-status check for a document already staged in
// SignalDesk (Epic F, VaporNet Americana plan). Mirrors push-signaldesk's
// HMAC scheme but signs the document id itself (there's no POST body).
//
// Edge Function secrets:
//   SIGNALDESK_STATUS_URL     optional override; defaults to
//                              SIGNALDESK_INGEST_URL + "/status"
//   SIGNALDESK_INGEST_URL     e.g. https://<signaldesk-host>/api/integrations/hunts-pointe
//   SIGNALDESK_WEBHOOK_SECRET shared HMAC secret (matches SignalDesk WEBHOOK_SECRET)

const BodySchema = z.object({ document_id: z.string().uuid() });

async function hmacBase64(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function deriveStatusUrl(): string | null {
  const override = Deno.env.get("SIGNALDESK_STATUS_URL");
  if (override) return override;
  const ingestUrl = Deno.env.get("SIGNALDESK_INGEST_URL");
  if (!ingestUrl) return null;
  return ingestUrl.replace(/\/?$/, "") + "/status";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { userId, authHeader } = auth;

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const parsed = BodySchema.safeParse(input);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);
  const { document_id: documentId } = parsed.data;

  // RLS-scoped: only surfaces status for a document this user has actually
  // pushed themselves — this endpoint never becomes a way to probe other
  // users' documents by guessing a UUID.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: push } = await supabase
    .from("signaldesk_pushes")
    .select("document_id, last_status, last_draft_id, last_admin_path, last_pushed_at")
    .eq("document_id", documentId)
    .maybeSingle();

  if (!push) {
    return jsonResponse({ error: "This document has not been staged to SignalDesk yet" }, 404);
  }

  const statusUrl = deriveStatusUrl();
  const secret = Deno.env.get("SIGNALDESK_WEBHOOK_SECRET");
  if (!statusUrl || !secret) {
    // Governance-safe fallback: report the last known state from our own
    // receipt row rather than fail closed.
    return jsonResponse({
      status: push.last_status,
      draft_id: push.last_draft_id,
      admin_path: push.last_admin_path,
      updatedAt: push.last_pushed_at,
      source: "local_receipt",
    });
  }

  const signature = await hmacBase64(secret, documentId);
  let resp: Response;
  try {
    resp = await fetch(`${statusUrl}?source_document_id=${encodeURIComponent(documentId)}`, {
      headers: { "x-webhook-signature": signature },
    });
  } catch (err) {
    logEvent("signaldesk-status", userId, 502, Date.now() - t0, { error: String(err) });
    return jsonResponse({
      status: push.last_status,
      draft_id: push.last_draft_id,
      admin_path: push.last_admin_path,
      updatedAt: push.last_pushed_at,
      source: "local_receipt_fallback",
    });
  }

  logEvent("signaldesk-status", userId, resp.status, Date.now() - t0, { ok: resp.ok });
  if (!resp.ok) {
    return jsonResponse({
      status: push.last_status,
      draft_id: push.last_draft_id,
      admin_path: push.last_admin_path,
      updatedAt: push.last_pushed_at,
      source: "local_receipt_fallback",
    });
  }

  const result = await resp.json().catch(() => ({}));
  return jsonResponse({
    status: result.status ?? push.last_status,
    draft_id: result.draft_id ?? push.last_draft_id,
    admin_path: result.admin_path ?? push.last_admin_path,
    updatedAt: result.updatedAt ?? push.last_pushed_at,
    source: "signaldesk",
  });
});
