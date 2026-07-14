// Shared embedding helper — calls Lovable AI Gateway /embeddings.
export async function embedText(input: string, dimensions = 1536): Promise<number[]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-embedding-001",
      input: input.slice(0, 30000),
      dimensions,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embed failed ${res.status}: ${t}`);
  }
  const json = await res.json();
  return json.data?.[0]?.embedding as number[];
}
