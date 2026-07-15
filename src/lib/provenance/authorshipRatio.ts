import type { DocumentVersion } from "@/lib/annotations/types";

/**
 * Rough human/AI authorship split for the provenance certificate: the
 * character delta between each consecutive version is attributed to that
 * version's author_kind. Not exact (a human edit inside an AI-authored
 * paragraph still counts as "ai_suggestion" until the next human save
 * overwrites it) but directionally honest and fully derived from the
 * existing attributed version history — no new tracking required.
 */
export function computeAuthorshipRatio(versions: DocumentVersion[]): { humanChars: number; aiChars: number; humanPct: number } {
  const chronological = [...versions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  let humanChars = 0;
  let aiChars = 0;
  for (let i = 1; i < chronological.length; i++) {
    const delta = Math.abs(chronological[i].content_text.length - chronological[i - 1].content_text.length);
    if (chronological[i].author_kind === "human") humanChars += delta;
    else aiChars += delta;
  }
  // The first version's own length counts as the initial human draft (or
  // whatever produced the document before versioning began).
  if (chronological[0]) humanChars += chronological[0].content_text.length;
  const total = humanChars + aiChars;
  return { humanChars, aiChars, humanPct: total > 0 ? (humanChars / total) * 100 : 100 };
}
