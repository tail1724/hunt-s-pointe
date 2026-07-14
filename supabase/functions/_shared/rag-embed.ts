// RAG embedder — uses openai/text-embedding-3-small at 1536 dimensions.
// This is the model used for collection_item_chunks / query_embedding_cache /
// bible_verse_embeddings. Kept separate from the legacy `_shared/embed.ts`
// (which serves the older `knowledge_entries` path) so we don't disturb that.

const RAG_EMBED_MODEL = "openai/text-embedding-3-small";
const RAG_DIMS = 1536;

export async function ragEmbed(input: string): Promise<number[]> {
  const arr = await ragEmbedBatch([input]);
  return arr[0];
}

export async function ragEmbedBatch(inputs: string[]): Promise<number[][]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  if (inputs.length === 0) return [];

  const clipped = inputs.map((s) => (s ?? "").slice(0, 30_000));

  // Batch in groups of 64 to stay under provider limits.
  const out: number[][] = [];
  for (let i = 0; i < clipped.length; i += 64) {
    const batch = clipped.slice(i, i + 64);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: RAG_EMBED_MODEL,
        input: batch,
        dimensions: RAG_DIMS,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Embed failed ${res.status}: ${t.slice(0, 300)}`);
    }
    const json = await res.json();
    const data = (json.data ?? []) as Array<{ embedding: number[] }>;
    for (const d of data) out.push(d.embedding);
  }
  return out;
}

export const RAG_EMBED_MODEL_ID = RAG_EMBED_MODEL;
export const RAG_EMBED_DIMS = RAG_DIMS;
