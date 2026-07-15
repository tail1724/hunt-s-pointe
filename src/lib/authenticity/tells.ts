// Algorithmic tell / n-gram detection (addendum feature 14). A curated,
// versioned lexicon of statistically over-indexed LLM vocabulary — words
// that read as machine-made to both human readers and detection tools.
// Runs entirely client-side; ships with the app, no server round-trip.

export const AI_TELL_WORDS: readonly string[] = [
  "delve", "delving", "tapestry", "crucial", "multifaceted", "overarching",
  "landscape", "leverage", "robust", "boasts", "testament", "elevate",
  "foster", "seamless", "embark", "realm", "underscore", "underscores",
  "paramount", "intricate", "nuanced", "holistic", "synergy", "myriad",
  "plethora", "cutting-edge", "game-changer", "unlock", "unleash",
  "navigate", "navigating", "furthermore", "moreover", "in conclusion",
  "in summary", "it's important to note", "in today's world",
];

export interface TellMatch {
  word: string;
  index: number;
}

const isWordChar = (ch: string | undefined) => !!ch && /[a-z0-9]/i.test(ch);

/** Case-insensitive, word-boundary matches for every tell in `text`. */
export function findTells(text: string): TellMatch[] {
  const lower = text.toLowerCase();
  const matches: TellMatch[] = [];
  for (const word of AI_TELL_WORDS) {
    let from = 0;
    for (;;) {
      const at = lower.indexOf(word, from);
      if (at === -1) break;
      const before = at > 0 ? lower[at - 1] : undefined;
      const after = lower[at + word.length];
      if (!isWordChar(before) && !isWordChar(after)) matches.push({ word, index: at });
      from = at + word.length;
    }
  }
  return matches.sort((a, b) => a.index - b.index);
}

/** Tells per 1,000 words — the document-level stat shown beside the cadence dial. */
export function tellDensity(text: string): number {
  const words = (text.match(/\S+/g) || []).length;
  if (words === 0) return 0;
  return (findTells(text).length / words) * 1000;
}
