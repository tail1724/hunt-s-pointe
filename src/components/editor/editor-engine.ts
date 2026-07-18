// `letterSpacing` is a valid Canvas 2D property but not yet in the lib DOM
// typings; narrow it here instead of reaching for `any`.
type Ctx2D = CanvasRenderingContext2D & { letterSpacing: string };

// Pure canvas compositor for the PressRoom photo editor.
//
// The editor is non-destructive: the base image plus an ordered list of layers
// (text, adjustments, frame) are data, and rendering is a pure function of that
// data at any target resolution. The on-screen preview and the full-resolution
// export call the exact same render() — so what you see is what you export.

export type AspectKey = "original" | "square" | "story" | "wide";

export const ASPECTS: { key: AspectKey; label: string; ratio: number | null }[] = [
  { key: "original", label: "Original", ratio: null },
  { key: "square", label: "Square", ratio: 1 },
  { key: "story", label: "Story", ratio: 9 / 16 },
  { key: "wide", label: "Wide", ratio: 16 / 9 },
];

export type FontKey = "verse" | "reference" | "quote";

export const FONTS: Record<FontKey, { family: string; weight: number; upper?: boolean; tracking?: number; label: string }> = {
  verse: { family: "'Spectral', Georgia, serif", weight: 600, label: "Verse" },
  reference: { family: "'Spectral', Georgia, serif", weight: 600, upper: true, tracking: 0.14, label: "Reference" },
  quote: { family: "'Spectral', Georgia, serif", weight: 500, label: "Quote" },
};

export const TEXT_COLORS = ["#F4EFE3", "#16222D", "#C79A4B"]; // paper · ink · brass

export interface TextLayer {
  id: string;
  text: string;
  xN: number; // center x, normalized 0..1 of output
  yN: number; // center y, normalized 0..1 of output
  sizeN: number; // font size as fraction of output height
  font: FontKey;
  color: string;
  scrim: boolean;
}

export interface Tune {
  light: number; // -100..100
  warmth: number; // -100..100
  fade: number; // 0..100
}

export interface FrameOpts {
  border: number; // 0..1 (fraction of the short side)
  color: string;
  cornerMark: boolean;
}

export interface EditorState {
  crop: AspectKey;
  rotation: number; // 0 | 90 | 180 | 270
  flipH: boolean;
  tune: Tune;
  frame: FrameOpts;
  layers: TextLayer[];
}

export const DEFAULT_STATE: EditorState = {
  crop: "original",
  rotation: 0,
  flipH: false,
  tune: { light: 0, warmth: 0, fade: 0 },
  frame: { border: 0, color: "#F4EFE3", cornerMark: false },
  layers: [],
};

export const TUNE_PRESETS: { label: string; tune: Tune }[] = [
  { label: "None", tune: { light: 0, warmth: 0, fade: 0 } },
  { label: "Vesper", tune: { light: -8, warmth: 34, fade: 14 } },
  { label: "Manuscript", tune: { light: 6, warmth: 12, fade: 28 } },
  { label: "Morning", tune: { light: 16, warmth: 20, fade: 6 } },
];

/** Output pixel size for a base image under a crop aspect, at a target height. */
export function outputSize(img: { width: number; height: number }, state: EditorState, targetH: number) {
  const rotated = state.rotation === 90 || state.rotation === 270;
  const baseW = rotated ? img.height : img.width;
  const baseH = rotated ? img.width : img.height;
  const aspect = ASPECTS.find((a) => a.key === state.crop)?.ratio ?? baseW / baseH;
  const h = targetH;
  const w = Math.round(h * aspect);
  return { w, h };
}

function cssFilter(tune: Tune): string {
  const brightness = 1 + (tune.light / 100) * 0.5;
  const contrast = 1 - (tune.fade / 100) * 0.28;
  const saturate = 1 - (tune.fade / 100) * 0.2;
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
}

function drawBaseCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource, srcW: number, srcH: number, state: EditorState, w: number, h: number) {
  ctx.save();
  ctx.filter = cssFilter(state.tune);
  ctx.translate(w / 2, h / 2);
  if (state.rotation) ctx.rotate((state.rotation * Math.PI) / 180);
  if (state.flipH) ctx.scale(-1, 1);
  // After rotation the drawing axes may be swapped; cover-fit the source into
  // the (un-rotated) output rect.
  const rotated = state.rotation === 90 || state.rotation === 270;
  const boxW = rotated ? h : w;
  const boxH = rotated ? w : h;
  const scale = Math.max(boxW / srcW, boxH / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();

  // Warmth as a soft-light color wash (warm = amber, cool = blue).
  if (state.tune.warmth !== 0) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    const a = Math.min(0.6, Math.abs(state.tune.warmth) / 100);
    ctx.fillStyle = state.tune.warmth > 0 ? `rgba(255,176,74,${a})` : `rgba(74,150,255,${a})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  // Fade lifts the blacks slightly with a translucent paper wash.
  if (state.tune.fade > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighten";
    ctx.fillStyle = `rgba(244,239,227,${(state.tune.fade / 100) * 0.18})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) { out.push(""); continue; }
    let line = words[0];
    for (let i = 1; i < words.length; i++) {
      const test = `${line} ${words[i]}`;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

export function drawTextLayer(ctx: CanvasRenderingContext2D, layer: TextLayer, w: number, h: number) {
  const font = FONTS[layer.font];
  const fontPx = Math.max(8, layer.sizeN * h);
  const text = font.upper ? layer.text.toUpperCase() : layer.text;
  ctx.save();
  ctx.font = `${font.weight} ${fontPx}px ${font.family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  (ctx as Ctx2D).letterSpacing = font.tracking ? `${font.tracking * fontPx}px` : "0px";

  const maxWidth = w * 0.86;
  const lines = wrapLines(ctx, text, maxWidth);
  const lineHeight = fontPx * 1.28;
  const blockH = lines.length * lineHeight;
  const cx = layer.xN * w;
  const cy = layer.yN * h;

  if (layer.scrim) {
    let widest = 0;
    for (const l of lines) widest = Math.max(widest, ctx.measureText(l).width);
    const padX = fontPx * 0.6;
    const padY = fontPx * 0.5;
    const grad = ctx.createLinearGradient(0, cy - blockH / 2 - padY, 0, cy + blockH / 2 + padY);
    grad.addColorStop(0, "rgba(10,14,18,0)");
    grad.addColorStop(0.5, "rgba(10,14,18,0.5)");
    grad.addColorStop(1, "rgba(10,14,18,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(cx - widest / 2 - padX, cy - blockH / 2 - padY, widest + padX * 2, blockH + padY * 2);
  }

  ctx.fillStyle = layer.color;
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = fontPx * 0.12;
  let y = cy - blockH / 2 + lineHeight / 2;
  for (const line of lines) {
    ctx.fillText(line, cx, y);
    y += lineHeight;
  }
  ctx.restore();
}

function drawFrame(ctx: CanvasRenderingContext2D, frame: FrameOpts, w: number, h: number) {
  if (frame.border > 0) {
    const b = frame.border * Math.min(w, h);
    ctx.save();
    ctx.strokeStyle = frame.color;
    ctx.lineWidth = b;
    ctx.strokeRect(b / 2, b / 2, w - b, h - b);
    ctx.restore();
  }
  if (frame.cornerMark) {
    ctx.save();
    const px = Math.max(11, h * 0.022);
    ctx.font = `600 ${px}px 'Spectral', Georgia, serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    (ctx as Ctx2D).letterSpacing = `${px * 0.14}px`;
    ctx.fillStyle = "rgba(244,239,227,0.82)";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = px * 0.3;
    ctx.fillText("EZRA RESEARCH", w - h * 0.03, h - h * 0.03);
    ctx.restore();
  }
}

/** Render the full composite into ctx at w×h. */
export function render(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  srcW: number,
  srcH: number,
  state: EditorState,
  w: number,
  h: number,
) {
  ctx.clearRect(0, 0, w, h);
  drawBaseCover(ctx, img, srcW, srcH, state, w, h);
  drawFrame(ctx, state.frame, w, h);
  for (const layer of state.layers) drawTextLayer(ctx, layer, w, h);
}

/** Render at full source resolution and return a Blob for download/upload. */
export function exportBlob(img: HTMLImageElement, state: EditorState, type = "image/png"): Promise<Blob> {
  const { w, h } = outputSize(img, state, Math.max(img.naturalHeight, 1024));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  render(ctx, img, img.naturalWidth, img.naturalHeight, state, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("export failed"))), type, 0.95);
  });
}
