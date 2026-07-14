// Pure helpers for multi-turn context management — unit-tested, no I/O.

export interface TurnLike {
  role: "user" | "assistant" | "system";
  content: string;
  pinned?: boolean;
}

/**
 * Windows a transcript for generation: keep pinned turns + the most recent
 * `maxTurns` turns, and report how many were omitted (those are covered by
 * the rolling session summary instead).
 */
export function windowTranscript<T extends TurnLike>(
  messages: T[],
  maxTurns = 8,
): { kept: T[]; omitted: number } {
  if (messages.length <= maxTurns) return { kept: messages, omitted: 0 };
  const recent = messages.slice(-maxTurns);
  const olderPinned = messages.slice(0, -maxTurns).filter((m) => m.pinned);
  return { kept: [...olderPinned, ...recent], omitted: messages.length - maxTurns - olderPinned.length };
}

/**
 * Compact history for the retrieval condenser: last `maxTurns` turns with
 * each clipped, oldest first. The condenser only needs enough to resolve
 * pronouns and follow-ups — not the whole conversation.
 */
export function retrievalHistory(
  messages: TurnLike[],
  maxTurns = 6,
  clipChars = 500,
): { role: "user" | "assistant"; content: string }[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-maxTurns - 1, -1) // exclude the current (last) user message
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.length > clipChars ? m.content.slice(0, clipChars) + "…" : m.content,
    }));
}

/** Rough heuristic: does this message even need retrieval? */
export function isSubstantiveQuery(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const words = t.split(/\s+/).filter(Boolean).length;
  return words > 6 || t.endsWith("?");
}
