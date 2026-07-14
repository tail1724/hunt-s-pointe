import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Download, Copy, FileText, FileJson, FileCode, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface QuickExportProps {
  promptText: string;
  promptId?: string;
}

type Format = "raw" | "json" | "markdown";

function formatPrompt(text: string, format: Format): string {
  switch (format) {
    case "json":
      return JSON.stringify({ prompt: text, exported_at: new Date().toISOString() }, null, 2);
    case "markdown":
      return `# Exported Prompt\n\n${text}\n\n---\n*Exported on ${new Date().toLocaleDateString()}*`;
    default:
      return text;
  }
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function QuickExport({ promptText, promptId }: QuickExportProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!promptText) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    toast.success("Copied to clipboard!");
    setOpen(false);
  };

  const handleExport = (format: Format) => {
    const content = formatPrompt(promptText, format);
    const ext = format === "json" ? "json" : format === "markdown" ? "md" : "txt";
    const mime = format === "json" ? "application/json" : "text/plain";
    downloadFile(content, `prompt.${ext}`, mime);
    toast.success(`Exported as ${ext.toUpperCase()}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-6">
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 space-y-2" align="end">
        <p className="text-xs font-semibold text-foreground mb-2">Quick Export</p>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={handleCopy}>
          <Copy className="h-3.5 w-3.5" /> Copy to clipboard
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={() => handleExport("raw")}>
          <FileText className="h-3.5 w-3.5" /> Raw Text (.txt)
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={() => handleExport("json")}>
          <FileJson className="h-3.5 w-3.5" /> JSON (.json)
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={() => handleExport("markdown")}>
          <FileCode className="h-3.5 w-3.5" /> Markdown (.md)
        </Button>
        <div className="border-t border-border pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center gap-1.5 text-xs"
            onClick={() => {
              setOpen(false);
              navigate(promptId ? `/app/export?promptId=${promptId}` : "/app/export");
            }}
          >
            Full Export Options <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
