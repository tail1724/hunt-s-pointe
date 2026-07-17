import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";

// Stage a document as a DRAFT in SignalDesk (Hampton Roads History).
//
// SignalDesk's ingest endpoint (POST /api/integrations/hunts-pointe) always
// creates a draft — a human editor publishes it in Payload's /admin. This
// function signs the payload with an HMAC shared secret and forwards it.
//
// Epic F (VaporNet Americana gap-remediation plan) upgrade: source_version
// now increments per *push* (tracked in signaldesk_pushes, not per edit),
// an Idempotency-Key header is derived from it, byline strings are promoted
// to authors[], and provenance (including the server-verified human editor
// id — never trust a client-supplied one) travels with every push.
//
// Edge Function secrets (never exposed to the browser):
//   SIGNALDESK_INGEST_URL     e.g. https://<signaldesk-host>/api/integrations/hunts-pointe
//   SIGNALDESK_WEBHOOK_SECRET shared HMAC secret (matches SignalDesk WEBHOOK_SECRET)
//   SUPABASE_SERVICE_ROLE_KEY used only to upsert signaldesk_pushes as the calling user (RLS-scoped)

const MediaSchema = z.object({
  url: z.string().url(),
  alt: z.string().max(500),
  credit: z.string().max(300).optional(),
  rights: z.enum(["owned", "licensed", "review"]),
});

const BodySchema = z.object({
  document_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  dek: z.string().max(500).optional().nullable(),
  byline: z.array(z.string()).optional().nullable(),
  section: z.string().max(100).optional().nullable(),
  story_tags: z.array(z.string()).optional().nullable(),
  publish_at: z.string().optional().nullable(),
  content_text: z.string().min(1).max(50000),
  slug: z.string().max(120).optional().nullable(),
  media: z.array(MediaSchema).max(50).optional().nullable(),
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
  const { userId, authHeader } = auth;

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const parsed = BodySchema.safeParse(input);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten() }, 400);
  const body = parsed.data;

  const ingestUrl = Deno.env.get("SIGNALDESK_INGEST_URL");
  const secret = Deno.env.get("SIGNALDESK_WEBHOOK_SECRET");
  if (!ingestUrl || !secret) {
    return jsonResponse({ error: "SignalDesk integration is not configured" }, 500);
  }

  // RLS-scoped to the calling user via their own JWT — this can only ever
  // touch signaldesk_pushes rows this user owns.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  // source_version increments once per *push*, independent of edit history —
  // read-modify-write against signaldesk_pushes. A lost update under
  // concurrent pushes of the same document is possible but low-stakes: the
  // worst case is a reused Idempotency-Key, which SignalDesk's payload-hash
  // check turns into a 409 rather than a silent duplicate draft.
  const { data: existingPush } = await supabase
    .from("signaldesk_pushes")
    .select("id, push_count")
    .eq("document_id", body.document_id)
    .maybeSingle();

  const sourceVersion = (existingPush?.push_count ?? 0) + 1;

  if (existingPush) {
    await supabase
      .from("signaldesk_pushes")
      .update({ push_count: sourceVersion, updated_at: new Date().toISOString() })
      .eq("id", existingPush.id);
  } else {
    await supabase.from("signaldesk_pushes").insert({
      document_id: body.document_id,
      user_id: userId,
      push_count: sourceVersion,
    });
  }

  const idempotencyKey = `hp:${body.document_id}:${sourceVersion}`;
  const authors = (body.byline || [])
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name }));

  const outboundPayload = {
    source_document_id: body.document_id,
    source_version: sourceVersion,
    title: body.title,
    dek: body.dek,
    authors,
    section: body.section,
    story_tags: body.story_tags,
    publish_at: body.publish_at,
    content_text: body.content_text,
    slug: body.slug,
    media: body.media || [],
    provenance: {
      // No per-document citation ledger is wired up yet — an honest empty
      // list beats a fabricated one. See docs/hunts-pointe-omnibus-plan.md
      // for the citation-verification surface this should eventually read.
      sources: [],
      model: "hunt-s-pointe",
      // Set server-side from the verified JWT, never trusted from the client.
      human_editor_id: userId,
    },
  };

  // The signed bytes must be byte-for-byte what we POST.
  const bodyStr = JSON.stringify(outboundPayload);
  const signature = await hmacBase64(secret, bodyStr);

  let resp: Response;
  try {
    resp = await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": signature,
        "Idempotency-Key": idempotencyKey,
      },
      body: bodyStr,
    });
  } catch (err) {
    logEvent("push-signaldesk", userId, 502, Date.now() - t0, { error: String(err) });
    await supabase
      .from("signaldesk_pushes")
      .update({ last_status: "error", last_error: "unreachable", updated_at: new Date().toISOString() })
      .eq("document_id", body.document_id);
    return jsonResponse({ error: "Could not reach SignalDesk" }, 502);
  }

  const result = await resp.json().catch(() => ({}));
  logEvent("push-signaldesk", userId, resp.status, Date.now() - t0, { ok: resp.ok });

  if (!resp.ok) {
    await supabase
      .from("signaldesk_pushes")
      .update({
        last_status: "error",
        last_error: typeof result?.error === "string" ? result.error : `HTTP ${resp.status}`,
        updated_at: new Date().toISOString(),
      })
      .eq("document_id", body.document_id);
    return jsonResponse({ error: "SignalDesk rejected the draft", detail: result }, 502);
  }

  await supabase
    .from("signaldesk_pushes")
    .update({
      last_status: "draft",
      last_draft_id: result.id ?? null,
      last_admin_path: result.admin_path ?? null,
      last_error: null,
      last_pushed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("document_id", body.document_id);

  return jsonResponse(
    {
      ok: true,
      signaldesk_id: result.id ?? null,
      status: "draft",
      admin_path: result.admin_path ?? null,
      source_version: sourceVersion,
      replayed: Boolean(result.replayed),
    },
    200
  );
});
