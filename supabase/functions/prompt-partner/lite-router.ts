// Lite-mode router: keyword-first, optional cheap classifier fallback.
// Vertical: Hunt's Pointe — independent-publication editorial buckets.

import { Bucket, BUCKETS, LIBRARY } from "./lite-library.ts";

type Match = { bucket: Bucket; confidence: number };

const KEYWORDS: Array<{ bucket: Bucket; rx: RegExp; weight: number }> = [
  // Headlines & hooks
  { bucket: "headline", rx: /\b(headline|hed|title (for|options|ideas)|clickbait|hook|a\/b test)\b/i, weight: 0.95 },

  // SEO & metadata
  { bucket: "seo_meta", rx: /\b(seo|meta description|title tag|slug|keyword|search (ranking|traffic)|serp)\b/i, weight: 0.95 },

  // Newsletter
  { bucket: "newsletter", rx: /\b(newsletter|subject line|email (edition|blast|digest)|substack)\b/i, weight: 0.95 },

  // Social syndication
  { bucket: "social_thread", rx: /\b(thread|tweet|social (post|copy|thread)|twitter|x post|linkedin post|instagram caption)\b/i, weight: 0.9 },

  // News briefs / press releases / wire
  { bucket: "news_brief", rx: /\b(news brief|press release|wire (copy|feed|story)|syndication|briefs?|standardi[sz]e)\b/i, weight: 0.9 },

  // Article outlines & structure
  { bucket: "article_outline", rx: /\b(outline|structure|article plan|story (structure|arc|plan)|organi[sz]e (my|this|an) (article|story|piece|draft)|nut graf|lede|lead paragraph)\b/i, weight: 0.9 },
  { bucket: "article_outline", rx: /\b(explainer|longform|feature|investigation)\b/i, weight: 0.6 },

  // Interviews & transcripts
  { bucket: "interview", rx: /\b(interview|transcript|q&a|pull[- ]?quote|source prep|prep sheet)\b/i, weight: 0.9 },

  // Editing, style, voice
  { bucket: "style_edit", rx: /\b(edit|copyedit|line edit|proofread|style guide|house style|passive voice|tighten|polish|tone|voice|grammar)\b/i, weight: 0.85 },

  // Fact-checking & verification
  { bucket: "fact_check", rx: /\b(fact[- ]?check|verify|verification|source[- ]?check|citation|corroborate|accuracy|correction)\b/i, weight: 0.95 },

  // Generic "write/draft" leans toward outline scaffolding
  { bucket: "article_outline", rx: /\b(write|draft)\b/i, weight: 0.5 },
];

export function routeByKeyword(text: string): Match {
  const scores = new Map<Bucket, number>();
  for (const k of KEYWORDS) {
    if (k.rx.test(text)) {
      scores.set(k.bucket, Math.max(scores.get(k.bucket) ?? 0, k.weight));
    }
  }
  if (scores.size === 0) return { bucket: "fallback", confidence: 0 };
  let best: Match = { bucket: "fallback", confidence: 0 };
  for (const [bucket, confidence] of scores) {
    if (confidence > best.confidence) best = { bucket, confidence };
  }
  return best;
}

// Cheap classifier fallback. Single tool-call to gemini-2.5-flash-lite.
export async function classifyWithModel(text: string, apiKey: string): Promise<Bucket> {
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Classify the user's editorial / publishing request into exactly one bucket. Return only the tool call." },
          { role: "user", content: text.slice(0, 600) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify",
            description: "Pick the single best bucket for this editorial request.",
            parameters: {
              type: "object",
              properties: { bucket: { type: "string", enum: BUCKETS as unknown as string[] } },
              required: ["bucket"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify" } },
      }),
    });
    if (!r.ok) return "fallback";
    const j = await r.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return "fallback";
    const parsed = JSON.parse(args);
    return BUCKETS.includes(parsed.bucket) ? parsed.bucket : "fallback";
  } catch {
    return "fallback";
  }
}

// Deterministic variant pick: same input → same variant.
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickVariant(bucket: Bucket, userText: string): string {
  const variants = LIBRARY[bucket];
  const idx = hashString(userText) % variants.length;
  return variants[idx];
}

export async function pickResponse(text: string, apiKey: string | undefined): Promise<{ bucket: Bucket; content: string; usedClassifier: boolean }> {
  const m = routeByKeyword(text);
  let bucket = m.bucket;
  let usedClassifier = false;
  if (m.confidence < 0.6 && apiKey) {
    bucket = await classifyWithModel(text, apiKey);
    usedClassifier = true;
  }
  return { bucket, content: pickVariant(bucket, text), usedClassifier };
}
