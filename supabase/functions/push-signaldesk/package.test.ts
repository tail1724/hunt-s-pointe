// node:assert (not the remote std asserts) so the test runs offline through
// the _check config, matching prompt-partner/turn.test.ts.
import nodeAssert from "node:assert/strict";
import {
  buildEditorialPackage,
  buildValidation,
  EditorialPackageEnvelopeSchema,
  editorialChecksumInput,
  sha256Hex,
} from "../_shared/editorial-package.ts";

const assert = (cond: unknown, msg?: string) => nodeAssert.ok(cond, msg);
const assertEquals = (a: unknown, b: unknown) => nodeAssert.deepEqual(a, b);

const input = {
  document_id: "8b7f2f2e-6f0d-4d2e-9b7a-3f4a5b6c7d8e",
  title: "A working waterfront prepares for the next century",
  dek: "Shipyards, ports, and the people between them.",
  byline: ["Jordan Ellis"],
  section: "business",
  story_tags: ["ports", "resilience", "ports"],
  publish_at: null,
  content_text: Array(140).fill("word").join(" "),
  slug: "working-waterfront",
  media: [
    { url: "https://example.com/a.jpg", alt: "Cranes at dawn", rights: "owned" as const },
    { url: "https://example.com/b.jpg", alt: "Dock detail", rights: "review" as const },
  ],
};

const ctx = {
  actorId: "user-123",
  revision: 4,
  parentRevision: 3,
  idempotencyKey: "hp:8b7f2f2e-6f0d-4d2e-9b7a-3f4a5b6c7d8e:4",
  publicationId: "hampton-roads",
  knownArticleId: "article-9",
  now: "2026-07-18T00:00:00.000Z",
};

Deno.test("buildEditorialPackage produces a schema-valid v1 envelope", async () => {
  const envelope = await buildEditorialPackage(input, ctx);
  const parsed = EditorialPackageEnvelopeSchema.safeParse(envelope);
  assert(parsed.success, JSON.stringify(!parsed.success ? parsed.error.flatten() : null));
  assertEquals(envelope.contract_version, 1);
  assertEquals(envelope.package.identity.source_document_id, input.document_id);
  assertEquals(envelope.package.identity.article_id, "article-9");
  assertEquals(envelope.package.revision.revision, 4);
  assertEquals(envelope.package.revision.parent_revision, 3);
  assertEquals(envelope.package.sync.idempotency_key, ctx.idempotencyKey);
  // Tags are deduplicated.
  assertEquals(envelope.package.taxonomy.tags, ["ports", "resilience"]);
});

Deno.test("the revision checksum matches a recomputation over the editorial content", async () => {
  const envelope = await buildEditorialPackage(input, ctx);
  const recomputed = await sha256Hex(editorialChecksumInput(envelope.package));
  assertEquals(envelope.package.revision.checksum, recomputed);
});

Deno.test("the actor is the verified server identity, never client input", async () => {
  const envelope = await buildEditorialPackage(input, ctx);
  assertEquals(envelope.package.revision.actor.id, "user-123");
  assertEquals(envelope.package.provenance.human_editor_id, "user-123");
});

Deno.test("validation snapshot flags gaps without blocking the push", () => {
  const validation = buildValidation({
    document_id: input.document_id,
    title: "Untitled",
    content_text: "Too short to publish.",
    media: input.media,
  });
  assertEquals(validation.ready, false);
  const byCheck = Object.fromEntries(validation.checks.map((c) => [c.check, c]));
  assertEquals(byCheck.title.ok, true);
  assertEquals(byCheck.dek.ok, false);
  assertEquals(byCheck.byline.ok, false);
  assertEquals(byCheck.substantial_body.ok, false);
  assertEquals(byCheck.media_rights.ok, false);
  assert(byCheck.media_rights.detail?.includes("1 media item"));
});

Deno.test("a complete, rights-cleared draft is marked ready", () => {
  const validation = buildValidation({
    ...input,
    media: [{ url: "https://example.com/a.jpg", alt: "Cranes at dawn", rights: "owned" as const }],
  });
  assertEquals(validation.checks.every((c) => c.ok), true);
  assertEquals(validation.ready, true);
  assertEquals(validation.word_count, 140);
});
