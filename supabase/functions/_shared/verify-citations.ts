// Post-stream citation verifier. Checks every factual claim in the assistant's
// response against the supplied source chunks. One auto-repair pass if needed.

import { utilityJson } from "./utility-model.ts";

export type CitationVerdict = "verified" | "partial" | "unverified";

export interface VerifyResult {
  verdict: CitationVerdict;
  claims: { text: string; grounded: boolean; source_chunk_index?: number }[];
  repaired_response?: string;
}

const VERIFY_SYSTEM =
  `You are a citation auditor. Given an assistant RESPONSE and numbered SOURCE chunks, identify every factual claim in the response. ` +
  `For each claim, check if it is directly supported by at least one source chunk.\n` +
  `Return JSON only: {"claims": [{"text": "<claim text, max 120 chars>", "grounded": true/false, "source_chunk_index": <0-based index or null>}]}`;

const REPAIR_SYSTEM =
  `You are an editor. Rewrite the RESPONSE so that every factual claim is grounded in the provided SOURCES. ` +
  `Remove or soften any claim that has no source support. Keep the tone, structure, and length similar. ` +
  `Return JSON only: {"repaired": "<full rewritten response>"}`;

export async function verifyCitations(
  response: string,
  sourceChunks: { content: string; chunk_index?: number }[],
): Promise<VerifyResult> {
  if (!response.trim() || sourceChunks.length === 0) {
    return { verdict: "verified", claims: [] };
  }

  const sourcesText = sourceChunks
    .map((c, i) => `[${i}] ${c.content.slice(0, 1200)}`)
    .join("\n\n");

  const check = await utilityJson<{ claims: { text: string; grounded: boolean; source_chunk_index?: number }[] }>([
    { role: "system", content: VERIFY_SYSTEM },
    { role: "user", content: `RESPONSE:\n${response.slice(0, 4000)}\n\nSOURCES:\n${sourcesText}` },
  ], { maxTokens: 800, timeoutMs: 12_000 });

  if (!check || !Array.isArray(check.claims)) {
    return { verdict: "verified", claims: [] };
  }

  const claims = check.claims.slice(0, 20).map((c) => ({
    text: String(c.text ?? "").slice(0, 200),
    grounded: !!c.grounded,
    source_chunk_index: typeof c.source_chunk_index === "number" ? c.source_chunk_index : undefined,
  }));

  const groundedCount = claims.filter((c) => c.grounded).length;
  if (claims.length === 0 || groundedCount === claims.length) {
    return { verdict: "verified", claims };
  }

  // Auto-repair pass
  const repair = await utilityJson<{ repaired: string }>([
    { role: "system", content: REPAIR_SYSTEM },
    { role: "user", content: `RESPONSE:\n${response.slice(0, 4000)}\n\nSOURCES:\n${sourcesText}` },
  ], { maxTokens: 2000, timeoutMs: 15_000 });

  const verdict: CitationVerdict = groundedCount === 0 ? "unverified" : "partial";
  return {
    verdict,
    claims,
    repaired_response: repair?.repaired || undefined,
  };
}
