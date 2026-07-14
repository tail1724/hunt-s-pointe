import { useState } from "react";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2 } from "lucide-react";
import { INSTAGRAM_FORMATS, coverCrop, type InstagramFormat } from "@/lib/image-formats";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  promptText?: string;
}

export function ExportDialog({ open, onOpenChange, imageUrl, promptText }: ExportDialogProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: InstagramFormat) => {
    setExporting(format.label);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = imageUrl;
      });

      const canvas = document.createElement("canvas");
      coverCrop(canvas, img, format.width, format.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Canvas export failed");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${format.ratio.replace(":", "x")}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Exported!", description: `${format.label} (${format.width}×${format.height})` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export for Instagram</DialogTitle>
          <DialogDescription>Choose a format to resize and download your image.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {INSTAGRAM_FORMATS.map((fmt) => {
            const Icon = fmt.icon;
            const isActive = exporting === fmt.label;
            return (
              <Button
                key={fmt.label}
                variant="outline"
                className="h-auto flex-col gap-1.5 py-4"
                disabled={!!exporting}
                onClick={() => handleExport(fmt)}
              >
                {isActive ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <Icon className="h-5 w-5 text-primary" />
                )}
                <span className="text-xs font-medium">{fmt.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {fmt.width}×{fmt.height}
                </span>
              </Button>
            );
          })}
        </div>
        {promptText && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{promptText}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
