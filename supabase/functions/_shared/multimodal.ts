// Multimodal extraction — per-type analysis prompts, all through the
// multimodal utility model. Each media type gets its own algorithm:
//   images  → caption + OCR + (auto-detected) chart/graph data extraction
//   audio   → transcription with rough timestamps
//   video   → scene description + speech transcription (best-effort)
// The output is TEXT that accompanies the original asset, so retrieval and
// the context window work over words while the UI can still show the media.

import { utilityChat, type UtilityContentPart } from "./utility-model.ts";

const MAX_INLINE_BYTES = 12 * 1024 * 1024; // inline base64 analysis cap

export type MediaKind = "image" | "audio" | "video";

export function mediaKindFor(mime: string, name: string): MediaKind | null {
  const m = (mime || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (m.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/.test(n)) return "image";
  if (m.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|flac|aac)$/.test(n)) return "audio";
  if (m.startsWith("video/") || /\.(mp4|mov|webm|mkv|avi)$/.test(n)) return "video";
  return null;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

const IMAGE_PROMPT =
  `Analyze this image for a research assistant's retrieval index. Respond in plain text with these sections (omit a section if empty):\n` +
  `DESCRIPTION: 2-4 sentences describing what the image shows.\n` +
  `TEXT: any readable text in the image, transcribed exactly (OCR).\n` +
  `DATA: if this is a chart, graph, table, or diagram — name the chart type, the axes/series, the overall trend in one sentence, and reproduce the underlying data as a markdown table if legible.`;

const AUDIO_PROMPT =
  `Transcribe this audio for a research assistant's retrieval index. Produce a clean transcript. ` +
  `Insert an approximate [mm:ss] marker at each speaker change or new topic (roughly every 30-60 seconds). ` +
  `If there is meaningful non-speech audio (music, congregation, applause), note it in [brackets].`;

const VIDEO_PROMPT =
  `Analyze this video for a research assistant's retrieval index. Respond in plain text:\n` +
  `SUMMARY: 2-4 sentences on what the video shows.\n` +
  `TRANSCRIPT: transcription of all speech with approximate [mm:ss] markers at topic/speaker changes.\n` +
  `VISUALS: notable on-screen text, slides, charts, or scenes worth indexing, each with its rough timestamp.`;

/**
 * Analyze one media asset into index-ready text. Returns null when the file
 * is too large for inline analysis or the provider rejects the modality —
 * callers surface a clear item error rather than failing silently.
 */
export async function analyzeMedia(
  kind: MediaKind,
  bytes: Uint8Array,
  mime: string,
): Promise<{ text: string } | { error: string }> {
  if (bytes.length > MAX_INLINE_BYTES) {
    return { error: `File is ${(bytes.length / 1024 / 1024).toFixed(1)}MB — inline analysis is capped at ${MAX_INLINE_BYTES / 1024 / 1024}MB. Trim or compress the file.` };
  }
  const b64 = toBase64(bytes);

  let parts: UtilityContentPart[];
  if (kind === "image") {
    parts = [
      { type: "text", text: IMAGE_PROMPT },
      { type: "image_url", image_url: { url: `data:${mime || "image/png"};base64,${b64}` } },
    ];
  } else if (kind === "audio") {
    const format = (mime.split("/")[1] || "mp3").replace("mpeg", "mp3");
    parts = [
      { type: "text", text: AUDIO_PROMPT },
      { type: "input_audio", input_audio: { data: b64, format } },
    ];
  } else {
    // Video rides through the image_url part as a data URI — multimodal
    // gateways forward the mime type to providers that accept video parts
    // (Gemini does). If the provider rejects it, we degrade with a clear error.
    parts = [
      { type: "text", text: VIDEO_PROMPT },
      { type: "image_url", image_url: { url: `data:${mime || "video/mp4"};base64,${b64}` } },
    ];
  }

  const out = await utilityChat(
    [{ role: "user", content: parts }],
    { maxTokens: 2000, timeoutMs: 60_000 },
  );
  if (!out) {
    return {
      error: kind === "video"
        ? "Video analysis isn't available from the current model provider — try uploading the audio track or a transcript."
        : `Couldn't analyze this ${kind} — the analysis model returned no result.`,
    };
  }
  return { text: out };
}
