// Curated art-direction presets for the PressRoom image suite.
//
// Every preset encodes a real design tradition — modern editorial or classic
// sacred art — with explicit craft constraints so output reads as designed,
// not as generic "AI art". The `prompt` fragment is appended server-side by
// the generate-image edge function; `negative` lists the slop to suppress.
// Keep ids stable: they're persisted on generation records via the caption
// field ("style:<id>") and shown as badges in the File Cabinet.

export type StyleFamily = "modern" | "classic";

export interface ImageStyle {
  id: string;
  family: StyleFamily;
  name: string;
  /** One-line description shown in the picker. */
  blurb: string;
  /** Art direction appended to the user's subject. */
  prompt: string;
  /** Style-specific things to avoid, merged with the global negative list. */
  negative?: string;
  /** True when the style is built around large rendered type. */
  typographic?: boolean;
}

/** Slop suppressed on every generation, regardless of style. */
export const GLOBAL_NEGATIVE =
  "generic AI-art gloss, plastic skin, waxy faces, extra fingers, warped hands, " +
  "lens-flare kitsch, oversaturated HDR, neon cyberpunk palette, watermark, " +
  "signature, stock-photo staging, uncanny photorealistic Jesus face, " +
  "cluttered composition, random meaningless glyphs, misspelled or garbled text";

export const IMAGE_STYLES: ImageStyle[] = [
  // ---- Modern ----
  {
    id: "modern-verse-type",
    family: "modern",
    name: "Verse Typography",
    blurb: "The words carry the image — big, confident editorial type",
    typographic: true,
    prompt:
      "Bold contemporary typographic poster. The featured text is the hero: set large in an elegant high-contrast serif (Spectral/Canela feel) with tight, deliberate kerning, generous margins, and a strict grid. Muted paper background (warm ivory or deep slate), one restrained brass-gold accent rule or ornament. Swiss-poster discipline meets sacred text. Flat, print-ready, no photographic elements.",
    negative: "gradient wordart, drop shadows on text, more than two typefaces",
  },
  {
    id: "modern-minimal",
    family: "modern",
    name: "Modern Minimal",
    blurb: "Quiet geometry, one symbol, lots of air",
    prompt:
      "Minimalist sacred design: a single geometric symbol distilled from the subject, rendered in flat shapes with generous negative space. Two or three colors maximum on a warm paper or deep slate field, with a brass-gold accent. Composition balanced like a gallery print. Calm, contemporary, reverent.",
  },
  {
    id: "modern-editorial",
    family: "modern",
    name: "Editorial Print",
    blurb: "Magazine-cover craft — grain, grid, restraint",
    prompt:
      "Contemporary editorial illustration in the manner of a serious culture magazine: textured risograph grain, limited earthy palette (ivory, ink, ochre, sage), confident asymmetric composition on a visible grid, subtle paper texture. Human figures stylized and dignified, never photoreal. Feels hand-crafted and printed, not rendered.",
  },
  {
    id: "modern-abstract-light",
    family: "modern",
    name: "Abstract Light",
    blurb: "Atmosphere and light standing in for the sacred",
    prompt:
      "Abstract contemplative artwork: soft volumetric light breaking through darkness, layered translucent color fields in indigo, ivory and gold, painterly texture like large-format oil on linen. No figures, no literal objects — pure light, depth, and atmosphere evoking the transcendent. Museum-quality restraint.",
  },
  // ---- Classic ----
  {
    id: "classic-illuminated",
    family: "classic",
    name: "Illuminated Manuscript",
    blurb: "Gold leaf, ornament borders, scribal lettering",
    typographic: true,
    prompt:
      "Medieval illuminated manuscript plate: intricate hand-painted border of vines and gold leaf, a large historiated initial capital, featured text lettered in careful blackletter-inspired calligraphy on aged vellum. Lapis blue, vermilion, and burnished gold pigments. Authentic scriptorium craft, symmetrical and precise.",
    negative: "modern fonts, clean digital edges",
  },
  {
    id: "classic-stained-glass",
    family: "classic",
    name: "Stained Glass",
    blurb: "Leaded panes, jewel color, cathedral light",
    prompt:
      "Cathedral stained-glass window: bold black leading dividing luminous jewel-toned panes (cobalt, ruby, amber, emerald), figures in the elongated, serene Gothic manner, light appearing to glow through the glass. Symmetrical architectural framing with a rose-window motif. Reverent and monumental.",
  },
  {
    id: "classic-oil",
    family: "classic",
    name: "Renaissance Oil",
    blurb: "Chiaroscuro drama in the old-master manner",
    prompt:
      "Old-master oil painting: Rembrandt-school chiaroscuro with warm candlelit highlights emerging from deep umber shadow, dignified naturalistic figures with weight and humanity, visible brushwork and craquelure, composed like a Baroque altarpiece. Solemn, humane, timeless.",
    negative: "airbrushed smoothness, digital painting sheen",
  },
  {
    id: "classic-engraving",
    family: "classic",
    name: "Engraving",
    blurb: "Doré-style linework, ink on paper",
    prompt:
      "Nineteenth-century steel engraving in the manner of Gustave Doré: dense parallel hatching and cross-hatching building dramatic light, monochrome ink on cream paper, epic scale and swirling atmosphere, fine controlled linework throughout. Printed-book plate aesthetic.",
    negative: "color, halftone dots, sketchy pencil texture",
  },
];

export const STYLE_BY_ID: Record<string, ImageStyle> = Object.fromEntries(
  IMAGE_STYLES.map((s) => [s.id, s]),
);

export const DEFAULT_STYLE_ID = "modern-verse-type";

/** Encode a style id into the generations.caption field. */
export function encodeStyleCaption(styleId: string): string {
  return `style:${styleId}`;
}

/** Decode a style from a generations.caption value, if present. */
export function decodeStyleCaption(caption: string | null | undefined): ImageStyle | null {
  if (!caption) return null;
  const m = caption.match(/style:([a-z0-9-]+)/);
  return m ? STYLE_BY_ID[m[1]] ?? null : null;
}
