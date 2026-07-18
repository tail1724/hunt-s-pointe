import { z } from "https://esm.sh/zod@3.23.8";

/**
 * EditorialPackage v1 — the canonical Hunt's Pointe → SignalDesk handoff
 * contract (Quantum Newsroom integration PRD §6).
 *
 * The schema block below must stay value-identical with SignalDesk's copy in
 * hampton-roads-history/lib/integrations/editorial-package.ts (only the zod
 * import line differs). This file additionally carries the package builder
 * used by the push-signaldesk edge function — assembly happens server-side
 * where the verified JWT identity lives, never in the browser.
 */

export const EDITORIAL_PACKAGE_CONTRACT = "editorial-package" as const;
export const EDITORIAL_PACKAGE_VERSION = 1 as const;

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const PackageActorSchema = z.object({
  id: trimmed(200),
  role: z.string().trim().max(60).optional(),
  name: z.string().trim().max(120).optional(),
});

/** Concurrency, diff, rollback, and audit lineage. */
export const PackageRevisionSchema = z.object({
  revision: z.number().int().positive(),
  parent_revision: z.number().int().nonnegative().nullable(),
  /** sha-256 (hex) over editorialChecksumInput(). */
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  created_at: z.string().trim().min(1).max(64),
  actor: PackageActorSchema,
});

export const PackageAuthorSchema = z.object({
  name: trimmed(120),
  external_id: z.string().trim().min(1).max(200).optional(),
});

export const PackageBodySchema = z.object({
  format: z.enum(["text", "markdown"]),
  value: z.string().trim().min(1).max(200_000),
});

export const PackageEditorialSchema = z.object({
  title: trimmed(300),
  dek: z.string().trim().max(500).nullish(),
  excerpt: z.string().trim().max(1_000).nullish(),
  body: PackageBodySchema,
  authors: z.array(PackageAuthorSchema).max(20),
  notes: z.string().trim().max(5_000).nullish(),
});

export const PackageTaxonomySchema = z.object({
  section: z.string().trim().max(100).nullish(),
  tags: z.array(trimmed(100)).max(100),
  audience: z.string().trim().max(200).nullish(),
  intent: z.string().trim().max(200).nullish(),
});

export const PackageSeoSchema = z.object({
  slug: z.string().trim().max(120).nullish(),
  keywords: z.array(trimmed(80)).max(25).optional(),
  meta_description: z.string().trim().max(320).nullish(),
});

export const PackageAssetSchema = z.object({
  url: z.string().url().max(2_000),
  alt: z.string().trim().max(500),
  credit: z.string().trim().max(300).optional(),
  caption: z.string().trim().max(500).optional(),
  rights: z.enum(["owned", "licensed", "review"]),
});

export const PackageProvenanceSchema = z.object({
  sources: z.array(z.unknown()).max(100),
  model: z.string().trim().max(120).optional(),
  prompt_version: z.string().trim().max(120).optional(),
  /** Set server-side from a verified identity — never client-trusted. */
  human_editor_id: z.string().trim().max(200).optional(),
  ai_assisted: z.boolean().optional(),
});

export const PackageValidationCheckSchema = z.object({
  check: trimmed(80),
  ok: z.boolean(),
  detail: z.string().trim().max(300).optional(),
});

export const PackageValidationSchema = z.object({
  word_count: z.number().int().nonnegative(),
  ready: z.boolean(),
  checks: z.array(PackageValidationCheckSchema).max(40),
});

/** A proposal only — Payload remains authoritative for publishing. */
export const PackagePublishingSchema = z.object({
  proposed_publish_at: z.string().trim().max(100).nullish(),
});

export const PackageIdentitySchema = z.object({
  package_id: z.string().uuid(),
  source_document_id: trimmed(200),
  publication_id: trimmed(100),
  /** The receiver's article id, when the sender already knows it. */
  article_id: z.string().trim().max(200).nullish(),
  source_card_id: z.string().trim().max(200).nullish(),
});

export const PackageSyncSchema = z.object({
  source: z.literal("hunts-pointe"),
  destination: z.literal("signaldesk"),
  idempotency_key: z.string().trim().min(8).max(500),
});

export const EditorialPackageSchema = z.object({
  identity: PackageIdentitySchema,
  revision: PackageRevisionSchema,
  editorial: PackageEditorialSchema,
  taxonomy: PackageTaxonomySchema,
  seo: PackageSeoSchema.optional(),
  assets: z.array(PackageAssetSchema).max(50),
  provenance: PackageProvenanceSchema,
  validation: PackageValidationSchema,
  publishing: PackagePublishingSchema.optional(),
  sync: PackageSyncSchema,
});

export const EditorialPackageEnvelopeSchema = z.object({
  contract: z.literal(EDITORIAL_PACKAGE_CONTRACT),
  contract_version: z.literal(EDITORIAL_PACKAGE_VERSION),
  package: EditorialPackageSchema,
});

export type PackageAuthor = z.infer<typeof PackageAuthorSchema>;
export type PackageAsset = z.infer<typeof PackageAssetSchema>;
export type EditorialPackage = z.infer<typeof EditorialPackageSchema>;
export type EditorialPackageEnvelope = z.infer<typeof EditorialPackageEnvelopeSchema>;

/**
 * Canonical string the revision checksum is computed over. Both sides build
 * this exact string and hash it with sha-256, so a mismatch means the
 * editorial content was altered somewhere between the two systems.
 */
export function editorialChecksumInput(
  pkg: Pick<EditorialPackage, "editorial" | "taxonomy">,
): string {
  const e = pkg.editorial;
  const t = pkg.taxonomy;
  return JSON.stringify({
    title: e.title,
    dek: e.dek ?? null,
    excerpt: e.excerpt ?? null,
    body_format: e.body.format,
    body_value: e.body.value,
    authors: e.authors.map((a) => a.name),
    notes: e.notes ?? null,
    section: t.section ?? null,
    tags: t.tags,
  });
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ------------------------------------------------------------------
// Package assembly (Hunt's Pointe side only)
// ------------------------------------------------------------------

export interface PackageDraftInput {
  document_id: string;
  title: string;
  dek?: string | null;
  excerpt?: string | null;
  notes?: string | null;
  byline?: string[] | null;
  section?: string | null;
  story_tags?: string[] | null;
  publish_at?: string | null;
  content_text: string;
  slug?: string | null;
  seo_keywords?: string[] | null;
  source_card_id?: string | null;
  media?: Array<{
    url: string;
    alt: string;
    credit?: string;
    caption?: string;
    rights: "owned" | "licensed" | "review";
  }> | null;
}

export interface PackageBuildContext {
  /** Verified server-side actor (JWT user id) — never client-supplied. */
  actorId: string;
  revision: number;
  parentRevision: number | null;
  idempotencyKey: string;
  publicationId: string;
  /** SignalDesk article id from the previous push receipt, if known. */
  knownArticleId?: string | null;
  now?: string;
}

export function countWords(text: string): number {
  return (text.match(/\S+/g) || []).length;
}

/** Deterministic readiness snapshot (integration PRD §4 "Validate"). */
export function buildValidation(input: PackageDraftInput) {
  const wordCount = countWords(input.content_text);
  const pendingRights = (input.media || []).filter((m) => m.rights === "review").length;
  const checks = [
    { check: "title", ok: input.title.trim().length > 0 },
    { check: "dek", ok: Boolean(input.dek?.trim()), detail: input.dek?.trim() ? undefined : "No dek set" },
    {
      check: "byline",
      ok: (input.byline || []).some((b) => b.trim()),
      detail: (input.byline || []).some((b) => b.trim()) ? undefined : "No byline set",
    },
    {
      check: "section",
      ok: Boolean(input.section?.trim()),
      detail: input.section?.trim() ? undefined : "No section suggested",
    },
    {
      check: "substantial_body",
      ok: wordCount >= 120,
      detail: wordCount >= 120 ? undefined : `Only ${wordCount} words`,
    },
    {
      check: "media_rights",
      ok: pendingRights === 0,
      detail: pendingRights === 0 ? undefined : `${pendingRights} media item(s) pending rights review`,
    },
  ];
  return {
    word_count: wordCount,
    ready: checks.every((c) => c.ok),
    checks,
  };
}

/** Assemble and checksum a complete v1 envelope. */
export async function buildEditorialPackage(
  input: PackageDraftInput,
  ctx: PackageBuildContext,
): Promise<EditorialPackageEnvelope> {
  const authors: PackageAuthor[] = (input.byline || [])
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name }));

  const editorial = {
    title: input.title.trim(),
    dek: input.dek?.trim() || null,
    excerpt: input.excerpt?.trim() || null,
    body: { format: "text" as const, value: input.content_text },
    authors,
    notes: input.notes?.trim() || null,
  };

  const taxonomy = {
    section: input.section?.trim() || null,
    tags: [...new Set((input.story_tags || []).map((t) => t.trim()).filter(Boolean))],
    audience: null,
    intent: null,
  };

  const checksum = await sha256Hex(editorialChecksumInput({ editorial, taxonomy }));
  const now = ctx.now ?? new Date().toISOString();

  return {
    contract: EDITORIAL_PACKAGE_CONTRACT,
    contract_version: EDITORIAL_PACKAGE_VERSION,
    package: {
      identity: {
        package_id: crypto.randomUUID(),
        source_document_id: input.document_id,
        publication_id: ctx.publicationId,
        article_id: ctx.knownArticleId ?? null,
        source_card_id: input.source_card_id ?? null,
      },
      revision: {
        revision: ctx.revision,
        parent_revision: ctx.parentRevision,
        checksum,
        created_at: now,
        actor: { id: ctx.actorId, role: "hunts_pointe_editor" },
      },
      editorial,
      taxonomy,
      seo: {
        slug: input.slug?.trim() || null,
        keywords: (input.seo_keywords || []).map((k) => k.trim()).filter(Boolean).slice(0, 25),
        meta_description: (input.dek || input.excerpt || "").trim().slice(0, 320) || null,
      },
      assets: (input.media || []).map((m) => ({
        url: m.url,
        alt: m.alt,
        credit: m.credit,
        caption: m.caption,
        rights: m.rights,
      })),
      provenance: {
        // No per-document citation ledger is wired up yet — an honest empty
        // list beats a fabricated one.
        sources: [],
        model: "hunt-s-pointe",
        human_editor_id: ctx.actorId,
        ai_assisted: true,
      },
      validation: buildValidation(input),
      publishing: { proposed_publish_at: input.publish_at || null },
      sync: {
        source: "hunts-pointe",
        destination: "signaldesk",
        idempotency_key: ctx.idempotencyKey,
      },
    },
  };
}
