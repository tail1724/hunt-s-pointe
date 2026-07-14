import { useState, useEffect, useRef, useCallback } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INSTAGRAM_FORMATS, coverCrop } from "@/lib/image-formats";
import { cn } from "@/lib/utils";

type ViewMode = "fit" | "original" | string; // string = ratio like "4:5"

interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  alt?: string;
}

const SIZE_OPTIONS = [
  { key: "fit", label: "Fit" },
  { key: "original", label: "Original" },
  ...INSTAGRAM_FORMATS.map((f) => ({ key: f.ratio, label: f.ratio })),
] as const;

export function ImageLightbox({ open, onOpenChange, imageUrl, alt }: ImageLightboxProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("fit");
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setViewMode("fit");
      setCroppedUrl(null);
    }
  }, [open, imageUrl]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  // Generate cropped preview for aspect ratio modes
  useEffect(() => {
    if (!open || viewMode === "fit" || viewMode === "original") {
      setCroppedUrl(null);
      return;
    }
    const format = INSTAGRAM_FORMATS.find((f) => f.ratio === viewMode);
    if (!format) return;

    setCropping(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      coverCrop(canvas, img, format.width, format.height);
      setCroppedUrl(canvas.toDataURL("image/png"));
      setCropping(false);
    };
    img.onerror = () => setCropping(false);
    img.src = imageUrl;
  }, [viewMode, imageUrl, open]);

  const handleDownload = useCallback(() => {
    const url = croppedUrl || imageUrl;
    const a = document.createElement("a");
    a.href = url;
    a.download = `image-${viewMode}-${Date.now()}.png`;
    a.click();
  }, [croppedUrl, imageUrl, viewMode]);

  if (!open) return null;

  const displayUrl = croppedUrl || imageUrl;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md animate-in fade-in-0 duration-200"
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 z-10">
        <span className="text-xs text-muted-foreground truncate max-w-[50%]">{alt || "Image preview"}</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image */}
      <div
        className={cn(
          "flex-1 flex items-center justify-center w-full px-4 py-14",
          viewMode === "original" && "overflow-auto"
        )}
      >
        {cropping ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <img
            src={displayUrl}
            alt={alt || ""}
            className={cn(
              "rounded-lg shadow-lg transition-all duration-300",
              viewMode === "fit" && "max-h-[80vh] max-w-full object-contain",
              viewMode === "original" && "max-w-none",
              viewMode !== "fit" && viewMode !== "original" && "max-h-[80vh] object-contain"
            )}
          />
        )}
      </div>

      {/* Bottom size controls */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 p-3 z-10">
        <div className="flex items-center gap-1 rounded-full bg-card/80 backdrop-blur-sm border border-border px-2 py-1">
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setViewMode(opt.key)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                viewMode === opt.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
