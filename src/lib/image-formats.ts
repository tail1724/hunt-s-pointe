import { RectangleVertical, Square, Smartphone, RectangleHorizontal } from "lucide-react";

export const INSTAGRAM_FORMATS = [
  { label: "Portrait (Feed)", width: 1080, height: 1350, ratio: "4:5", icon: RectangleVertical },
  { label: "Square (Feed)", width: 1080, height: 1080, ratio: "1:1", icon: Square },
  { label: "Stories & Reels", width: 1080, height: 1920, ratio: "9:16", icon: Smartphone },
  { label: "Landscape (Feed)", width: 1080, height: 566, ratio: "1.91:1", icon: RectangleHorizontal },
] as const;

export type InstagramFormat = (typeof INSTAGRAM_FORMATS)[number];

export function coverCrop(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  targetW: number,
  targetH: number
) {
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = targetW / targetH;

  let sx: number, sy: number, sw: number, sh: number;

  if (imgRatio > targetRatio) {
    sh = img.naturalHeight;
    sw = sh * targetRatio;
    sx = (img.naturalWidth - sw) / 2;
    sy = 0;
  } else {
    sw = img.naturalWidth;
    sh = sw / targetRatio;
    sx = 0;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
}
