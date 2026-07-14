// Lite-mode router: keyword-first, optional cheap classifier fallback.
// Vertical: Ezra Research — religious prose buckets.

import { Bucket, BUCKETS, LIBRARY } from "./lite-library.ts";

type Match = { bucket: Bucket; confidence: number };

const KEYWORDS: Array<{ bucket: Bucket; rx: RegExp; weight: number }> = [
  // Wedding
  { bucket: "wedding", rx: /\b(wedding|marriage|vows?|bride|groom|matrimony|ceremony)\b/i, weight: 0.95 },

  // Funeral / memorial
  { bucket: "funeral", rx: /\b(funeral|memorial|eulogy|grief|condolence|bereavement|passing|loss|mourn(ing)?)\b/i, weight: 0.95 },

  // VBS
  { bucket: "vbs", rx: /\b(vbs|vacation bible school|kids[' ]?camp|summer camp|kids week)\b/i, weight: 0.95 },

  // Bible study / small group
  { bucket: "bible_study", rx: /\b(bible study|small group|study guide|discussion guide|study lesson|sunday school lesson)\b/i, weight: 0.9 },
  { bucket: "bible_study", rx: /\bstudy\b/i, weight: 0.55 },

  // Devotional / encouragement
  { bucket: "devotional", rx: /\b(devotional|devotion|reflection|daily reading|encourage(ment)?|meditation)\b/i, weight: 0.9 },

  // Theology / independent study
  { bucket: "theology", rx: /\b(theology|theological|doctrine|systematic|exegesis|hermeneutic|reformation|grace|sanctification|justification)\b/i, weight: 0.85 },

  // Youth ministry
  { bucket: "youth", rx: /\b(youth|teen|teenager|student ministry|youth group|gen[- ]?z)\b/i, weight: 0.9 },

  // Church communications
  { bucket: "communications", rx: /\b(announcement|newsletter|email blast|pastoral letter|congregation update|bulletin|email to (the )?church)\b/i, weight: 0.9 },

  // Holidays
  { bucket: "holidays", rx: /\b(easter|christmas|advent|good friday|palm sunday|pentecost|thanksgiving|holiday sermon|nativity)\b/i, weight: 0.95 },

  // Sermon → most often weddings/funerals/holidays; otherwise treat as bible_study fallback
  { bucket: "bible_study", rx: /\bsermon\b/i, weight: 0.5 },
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
          { role: "system", content: "Classify the user's pastoral / ministry request into exactly one bucket. Return only the tool call." },
          { role: "user", content: text.slice(0, 600) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify",
            description: "Pick the single best bucket for this ministry request.",
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
