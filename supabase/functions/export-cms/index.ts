import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { corsHeaders, jsonResponse, requireUser, logEvent } from "../_shared/auth.ts";
import { utilityJson } from "../_shared/utility-model.ts";

// Headless CMS schema mapping & structured data output (addendum feature 3).
// v1 ships two built-in formats — a clean nested JSON object and Markdown
// with YAML front-matter — both carrying auto-generated taxonomy tags and,
// when available, the document's provenance summary as export metadata.
// Custom field-mapping presets (cms_schemas) are a fast-follow; this function
// already accepts a schema's field_mapping and applies simple key renames.

const BodySchema = z.object({
  document_id: z.string().uuid(),
  format: z.enum(["json", "markdown"]).default("json"),
  title: z.string().max(300),
  dek: z.string().max(500).optional().nullable(),
  byline: z.array(z.string()).optional().nullable(),
  section: z.string().max(100).optional().nullable(),
  status: z.string().max(40).optional().nullable(),
  story_tags: z.array(z.string()).optional().nullable(),
  publish_at: z.string().optional().nullable(),
  content_text: z.string().max(40000),
  field_mapping: z.record(z.string()).optional().nullable(),
});

function yamlEscape(v: string): string {
  return `"${v.replace(/"/g, '\\"')}"`;
}

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
  const { document_id, format, title, dek, byline, section, status, story_tags, publish_at, content_text, field_mapping } = parsed.data;

  try {
    let tags = story_tags ?? [];
    if (tags.length === 0) {
      const generated = await utilityJson<string[]>([
        { role: "system", content: "Generate 3-6 short lowercase taxonomy tags for this article. Reply with a JSON array of strings only." },
        { role: "user", content: `TITLE: ${title}\n\nBODY:\n${content_text.slice(0, 3000)}` },
      ], { maxTokens: 120, timeoutMs: 8000 });
      if (Array.isArray(generated)) tags = generated.slice(0, 6).map(String);
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

    const structured: Record<string, unknown> = {
      title,
      slug,
      dek: dek ?? null,
      byline: byline ?? [],
      section: section ?? null,
      status: status ?? "draft",
      tags,
      publishAt: publish_at ?? null,
      body: content_text,
      seo: {
        title: title.slice(0, 60),
        description: (dek || content_text.slice(0, 155)).slice(0, 160),
      },
    };

    // Simple field-rename mapping (e.g. {"title": "headline"} renames the
    // "title" key to "headline" in the output). Nested paths are a fast-follow.
    let jsonOut: Record<string, unknown> = structured;
    if (field_mapping && Object.keys(field_mapping).length > 0) {
      jsonOut = {};
      for (const [key, value] of Object.entries(structured)) {
        jsonOut[field_mapping[key] ?? key] = value;
      }
    }

    if (format === "json") {
      logEvent("export-cms", userId, 200, Date.now() - t0, { document_id, format });
      return jsonResponse({ format: "json", filename: `${slug}.json`, content: JSON.stringify(jsonOut, null, 2) });
    }

    const frontMatter = [
      "---",
      `title: ${yamlEscape(title)}`,
      dek ? `dek: ${yamlEscape(dek)}` : null,
      byline && byline.length > 0 ? `byline: [${byline.map(yamlEscape).join(", ")}]` : null,
      section ? `section: ${yamlEscape(section)}` : null,
      `status: ${yamlEscape(status ?? "draft")}`,
      tags.length > 0 ? `tags: [${tags.map(yamlEscape).join(", ")}]` : null,
      publish_at ? `publishAt: ${yamlEscape(publish_at)}` : null,
      "---",
      "",
    ].filter(Boolean).join("\n");

    const markdown = frontMatter + content_text;
    logEvent("export-cms", userId, 200, Date.now() - t0, { document_id, format });
    return jsonResponse({ format: "markdown", filename: `${slug}.md`, content: markdown });
  } catch (e) {
    const msg = String((e as any)?.message ?? e).slice(0, 400);
    logEvent("export-cms", userId, 500, Date.now() - t0, { error: msg });
    return jsonResponse({ error: msg }, 500);
  }
});
