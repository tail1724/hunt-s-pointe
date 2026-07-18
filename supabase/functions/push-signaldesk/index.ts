import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";
import { buildEditorialPackage } from "../_shared/editorial-package.ts";

// Stage a document as a DRAFT in SignalDesk (Hampton Roads History).
//
// SignalDesk's ingest endpoint (POST /api/integrations/hunts-pointe) creates
// or updates exactly one linked review draft — a human editor publishes it in
// Payload's /admin. This function signs the payload with an HMAC shared
// secret and forwards it.
//
// Quantum Newsroom handoff upgrade: the outbound body is now a versioned,
// schema-validated EditorialPackage v1 envelope (integration PRD §6) —
// identity, revision lineage + checksum, editorial content, taxonomy, SEO,
// assets, provenance, a deterministic validation snapshot, and a publishing
// *proposal* (Payload stays authoritative for publishing). source_version
// increments per *push* (tracked in signaldesk_pushes) and doubles as the
// package revision; the Idempotency-Key is derived from it. The verified
// JWT user id is the package actor — never trust a client-supplied one.
//
// Edge Function secrets (never exposed to the browser):
//   SIGNALDESK_INGEST_URL     e.g. https://<signaldesk-host>/api/integrations/hunts-pointe
//   SIGNALDESK_WEBHOOK_SECRET shared HMAC secret (matches SignalDesk WEBHOOK_SECRET)
//   SUPABASE_SERVICE_ROLE_KEY used only to upsert signaldesk_pushes as the calling user (RLS-scoped)

const MediaSchema = z.object({
  url: z.string().url(),
  alt: z.string().max(500),
  credit: z.string().max(300).optional(),
  caption: z.string().max(500).optional(),
  rights: z.enum(["owned", "licensed", "review"]),
});

const BodySchema = z.object({
  document_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  dek: z.string().max(500).optional().nullable(),
  excerpt: z.string().max(1000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  byline: z.array(z.string()).optional().nullable(),
  section: z.string().max(100).optional().nullable(),
  story_tags: z.array(z.string()).optional().nullable(),
  seo_keywords: z.array(z.string().max(80)).max(25).optional().nullable(),
  source_card_id: z.string().max(200).optional().nullable(),
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
    .select("id, push_count, last_draft_id")
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

  // Assemble the canonical EditorialPackage v1 envelope. Revision equals the
  // push counter; the parent is the previous acked push (null on first push)
  // so SignalDesk can enforce PRD §7.2 revision preconditions.
  const outboundPayload = await buildEditorialPackage(body, {
    actorId: userId,
    revision: sourceVersion,
    parentRevision: existingPush ? existingPush.push_count : null,
    idempotencyKey,
    publicationId: "hampton-roads",
    knownArticleId: existingPush?.last_draft_id ?? null,
  });

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
    // PRD §7.2: a stale or editorially-locked package is an explicit,
    // actionable conflict — never a silent overwrite. Surface it distinctly
    // so the preflight can explain what happened and what to do next.
    const conflictCode = resp.status === 409 && typeof result?.code === "string" ? result.code : null;
    await supabase
      .from("signaldesk_pushes")
      .update({
        last_status: conflictCode ? "conflict" : "error",
        last_error:
          conflictCode ?? (typeof result?.error === "string" ? result.error : `HTTP ${resp.status}`),
        updated_at: new Date().toISOString(),
      })
      .eq("document_id", body.document_id);
    if (conflictCode) {
      return jsonResponse(
        {
          error: "SignalDesk reported a conflict",
          code: conflictCode,
          current_revision: result?.current_revision ?? null,
          workflow_stage: result?.workflow_stage ?? null,
          admin_path: result?.admin_path ?? null,
        },
        409
      );
    }
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
      revision: result.revision ?? sourceVersion,
      action: result.action ?? "created",
      replayed: Boolean(result.replayed),
    },
    200
  );
});
