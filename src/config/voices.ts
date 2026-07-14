/**
 * Scripture Audio voice personas.
 *
 * Five listening characters, expressed today through the browser speech
 * engine (best-matching system voice + rate/pitch shaping) and designed to be
 * re-pointed at a hosted TTS provider later: `hostedVoiceId` is the reserved
 * mapping slot, and nothing else in the audio stack knows which engine is
 * underneath (see docs/awwwards-build-plan.md §2).
 */

export interface VoicePersona {
  id: string;
  name: string;
  tagline: string;
  /** Audition line played from the voice picker. */
  sampleText: string;
  /** Base speaking rate (multiplied by the user's speed setting). */
  rate: number;
  pitch: number;
  /**
   * Ordered preferences for picking a system voice; earlier = better match.
   * Tested against `${voice.name} ${voice.lang}`.
   */
  voiceHints: RegExp[];
  /** Reserved: provider voice ID once hosted TTS is provisioned. */
  hostedVoiceId?: string;
}

export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: "shepherd",
    name: "The Shepherd",
    tagline: "Warm and unhurried — evening reading",
    sampleText: "The Lord is my shepherd; I shall not want.",
    rate: 0.92,
    pitch: 0.9,
    voiceHints: [
      /google uk english male/i,
      /(ryan|george|thomas|alan).*(en-|english)/i,
      /daniel/i,
      /en-GB/i,
    ],
    hostedVoiceId: "JBFqnCBsd6RMkjVDRZzb",
  },
  {
    id: "psalmist",
    name: "The Psalmist",
    tagline: "Gentle and clear — psalms and letters",
    sampleText: "He leadeth me beside the still waters.",
    rate: 0.96,
    pitch: 1.06,
    voiceHints: [
      /(samantha|aria|jenny|libby|sonia)/i,
      /google us english/i,
      /(karen|moira|serena|tessa)/i,
      /female.*en-/i,
    ],
    hostedVoiceId: "EXAVITQu4vr4xnSDxMaL",
  },
  {
    id: "herald",
    name: "The Herald",
    tagline: "Bright and forward — Acts and the prophets",
    sampleText: "Prepare ye the way of the Lord; make his paths straight.",
    rate: 1.06,
    pitch: 1.0,
    voiceHints: [
      /(guy|davis|christopher|brandon).*(en-|english)/i,
      /alex/i,
      /google us english/i,
      /en-US/i,
    ],
    hostedVoiceId: "nPczCjzI2devNBz1zQrb",
  },
  {
    id: "storyteller",
    name: "The Storyteller",
    tagline: "Rich and dramatic — Genesis to Revelation",
    sampleText: "In the beginning, God created the heaven and the earth.",
    rate: 0.88,
    pitch: 0.82,
    voiceHints: [
      /daniel/i,
      /google uk english male/i,
      /(ryan|george|fred).*(en-|english)/i,
      /en-GB/i,
    ],
    hostedVoiceId: "onwK4e9ZLuTAKqWW03F9",
  },
  {
    id: "still",
    name: "The Still Small Voice",
    tagline: "Calm and close — devotion and rest",
    sampleText: "Be still, and know that I am God.",
    rate: 0.82,
    pitch: 0.96,
    voiceHints: [
      /(libby|sonia|victoria|allison)/i,
      /(samantha|aria|jenny)/i,
      /google uk english female/i,
      /female.*en-/i,
    ],
    hostedVoiceId: "pFZP5JQG7iQjIQuC4Bku",
  },
];

export const DEFAULT_PERSONA_ID = "shepherd";

export function getPersona(id: string | null | undefined): VoicePersona {
  return VOICE_PERSONAS.find((p) => p.id === id) ?? VOICE_PERSONAS[0];
}

/** Quality heuristics: cloud/neural voices read far better than legacy local ones. */
function qualityScore(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  let score = 0;
  if (/natural|neural|premium|enhanced|online/.test(n)) score += 6;
  if (/google|microsoft/.test(n)) score += 3;
  if (v.lang.toLowerCase().startsWith("en")) score += 2;
  return score;
}

/**
 * Resolve all five personas against the voices this browser actually has.
 * Greedy by persona order; avoids assigning one voice twice while
 * alternatives exist, so personas stay distinct wherever possible.
 */
export function resolvePersonaVoices(
  voices: SpeechSynthesisVoice[],
): Map<string, SpeechSynthesisVoice | null> {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = english.length > 0 ? english : voices;
  const used = new Set<string>();
  const result = new Map<string, SpeechSynthesisVoice | null>();

  for (const persona of VOICE_PERSONAS) {
    let best: SpeechSynthesisVoice | null = null;
    let bestScore = -Infinity;
    for (const v of pool) {
      const haystack = `${v.name} ${v.lang}`;
      const hintIdx = persona.voiceHints.findIndex((h) => h.test(haystack));
      const score =
        (hintIdx >= 0 ? (persona.voiceHints.length - hintIdx) * 10 : 0) +
        qualityScore(v) +
        (used.has(v.voiceURI) ? -8 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    if (best) used.add(best.voiceURI);
    result.set(persona.id, best);
  }
  return result;
}
