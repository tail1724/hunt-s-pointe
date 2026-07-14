/**
 * Parses an Ezra assistant message into preface / draft / followup sections.
 *
 * Ezra emits long-form drafts wrapped in lightweight delimiters:
 *
 *   <<<DRAFT title="Forgiveness: The Father's Foundation">>>
 *   …markdown…
 *   <<<END_DRAFT>>>
 *
 *   <<<FOLLOWUP>>>
 *   How does this feel?
 *   <<<END_FOLLOWUP>>>
 *
 * Short replies have no delimiters and come back as { preface }.
 */
export interface ParsedEzraMessage {
  preface: string;
  draft: string | null;
  draftTitle: string | null;
  followup: string | null;
}

const DRAFT_RE = /<<<DRAFT(?:\s+title="([^"]*)")?>>>([\s\S]*?)<<<END_DRAFT>>>/;
const FOLLOWUP_RE = /<<<FOLLOWUP>>>([\s\S]*?)<<<END_FOLLOWUP>>>/;

export function parseEzraMessage(content: string): ParsedEzraMessage {
  if (!content) return { preface: "", draft: null, draftTitle: null, followup: null };

  const draftMatch = content.match(DRAFT_RE);
  const followupMatch = content.match(FOLLOWUP_RE);

  if (!draftMatch && !followupMatch) {
    return { preface: content.trim(), draft: null, draftTitle: null, followup: null };
  }

  let remaining = content;
  let draft: string | null = null;
  let draftTitle: string | null = null;
  let followup: string | null = null;

  if (draftMatch) {
    draftTitle = draftMatch[1]?.trim() || null;
    draft = draftMatch[2].trim();
    remaining = remaining.replace(draftMatch[0], "").trim();
  }
  if (followupMatch) {
    followup = followupMatch[1].trim();
    remaining = remaining.replace(followupMatch[0], "").trim();
  }

  // Derive a title from first H1/H2 in draft if none provided.
  if (draft && !draftTitle) {
    const titleLine = draft.split("\n").find((l) => /^#{1,3}\s+/.test(l));
    if (titleLine) draftTitle = titleLine.replace(/^#+\s*/, "").trim();
  }

  return { preface: remaining.trim(), draft, draftTitle, followup };
}
