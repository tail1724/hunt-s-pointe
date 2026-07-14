import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, FileText, Film, Music, MessageSquare, Grid2x2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { OutputDiffViewer } from "./OutputDiffViewer";
import { RefinementPanel } from "./RefinementPanel";
import { QuickExport } from "@/components/QuickExport";
import { supabase } from "@/integrations/supabase/client";

interface OutputPanelProps {
  midjourney: string;
  video: string;
  audio: string;
  openai: string;
  negative: string;
  seed: string;
  promptHistoryId?: string | null;
  onOutputUpdate?: (platform: string, value: string) => void;
}

function CopyBtn({ text, platform }: { text: string; platform?: string }) {
  const copy = () => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };
  return (
    <Button variant="outline" size="sm" onClick={copy} className="gap-1.5 text-xs">
      <Copy className="h-3.5 w-3.5" /> Copy
    </Button>
  );
}

function DistillBtn({ text }: { text: string }) {
  const [loading, setLoading] = useState(false);
  const [distilled, setDistilled] = useState<string | null>(null);

  const distill = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("distill", {
        body: { prompt: text },
      });
      if (error) throw error;
      setDistilled(data.distilled);
      toast.success("Output distilled!");
    } catch {
      toast.error("Distillation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={distill} disabled={loading || !text} className="gap-1.5 text-xs">
        <Minimize2 className="h-3.5 w-3.5" /> {loading ? "Distilling..." : "Distill"}
      </Button>
      {distilled && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold text-muted-foreground">Distilled</h5>
            <CopyBtn text={distilled} />
          </div>
          <pre className="whitespace-pre-wrap rounded-lg border border-accent/30 bg-accent/5 p-3 font-mono text-xs text-foreground leading-relaxed">{distilled}</pre>
        </div>
      )}
    </div>
  );
}

function OutputBlock({ label, text, icon: Icon, platform, seed, promptHistoryId, onRefined }: {
  label: string; text: string; icon: React.ElementType; platform: string;
  seed?: string; promptHistoryId?: string | null; onRefined?: (refined: string) => void;
}) {
  if (!text) return <p className="py-12 text-center text-sm text-muted-foreground">Process a seed to see output here.</p>;
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Icon className="h-4 w-4" /> {label}
        </div>
        <div className="flex items-center gap-2">
          <DistillBtn text={text} />
          <CopyBtn text={text} platform={platform} />
          <QuickExport promptText={text} />
        </div>
      </div>
      <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/50 p-4 font-mono text-sm text-foreground leading-relaxed">{text}</pre>
      {seed && onRefined && (
        <RefinementPanel
          promptHistoryId={promptHistoryId || null}
          seed={seed}
          platform={platform}
          currentOutput={text}
          onRefined={onRefined}
        />
      )}
    </div>
  );
}

export function OutputPanel({ midjourney, video, audio, openai, negative, seed, promptHistoryId, onOutputUpdate }: OutputPanelProps) {
  const [viewMode, setViewMode] = useState<"tabs" | "grid">("tabs");
  const hasOutput = !!(midjourney || video || audio || openai);

  const handleRefined = (platform: string) => (refined: string) => {
    onOutputUpdate?.(platform, refined);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground">5. Export</h3>
        {hasOutput && (
          <Button variant="ghost" size="sm" onClick={() => setViewMode(viewMode === "tabs" ? "grid" : "tabs")} className="gap-1.5 text-xs">
            <Grid2x2 className="h-3.5 w-3.5" /> {viewMode === "tabs" ? "All Outputs" : "Tabs"}
          </Button>
        )}
      </div>

      {hasOutput && <OutputDiffViewer seed={seed} output={midjourney || video || openai} />}

      {viewMode === "tabs" ? (
        <Tabs defaultValue="output_a">
          <TabsList className="bg-muted">
            <TabsTrigger value="output_a" className="gap-1 text-xs"><FileText className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Output A</span></TabsTrigger>
            <TabsTrigger value="output_b" className="gap-1 text-xs"><Film className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Output B</span></TabsTrigger>
            <TabsTrigger value="output_c" className="gap-1 text-xs"><Music className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Output C</span></TabsTrigger>
            <TabsTrigger value="output_d" className="gap-1 text-xs"><MessageSquare className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Output D</span></TabsTrigger>
          </TabsList>
          <TabsContent value="output_a"><OutputBlock label="Output A" text={midjourney} icon={FileText} platform="midjourney" seed={seed} promptHistoryId={promptHistoryId} onRefined={handleRefined("midjourney")} /></TabsContent>
          <TabsContent value="output_b"><OutputBlock label="Output B" text={video} icon={Film} platform="video" seed={seed} promptHistoryId={promptHistoryId} onRefined={handleRefined("video")} /></TabsContent>
          <TabsContent value="output_c"><OutputBlock label="Output C" text={audio} icon={Music} platform="audio" seed={seed} promptHistoryId={promptHistoryId} onRefined={handleRefined("audio")} /></TabsContent>
          <TabsContent value="output_d"><OutputBlock label="Output D" text={openai} icon={MessageSquare} platform="openai" seed={seed} promptHistoryId={promptHistoryId} onRefined={handleRefined("openai")} /></TabsContent>
        </Tabs>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <OutputBlock label="Output A" text={midjourney} icon={FileText} platform="midjourney" seed={seed} promptHistoryId={promptHistoryId} onRefined={handleRefined("midjourney")} />
          <OutputBlock label="Output B" text={video} icon={Film} platform="video" seed={seed} promptHistoryId={promptHistoryId} onRefined={handleRefined("video")} />
          <OutputBlock label="Output C" text={audio} icon={Music} platform="audio" seed={seed} promptHistoryId={promptHistoryId} onRefined={handleRefined("audio")} />
          <OutputBlock label="Output D" text={openai} icon={MessageSquare} platform="openai" seed={seed} promptHistoryId={promptHistoryId} onRefined={handleRefined("openai")} />
        </div>
      )}

      {negative && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-xs font-semibold text-muted-foreground">Negative Output</h4>
            <CopyBtn text={negative} />
          </div>
          <pre className="whitespace-pre-wrap rounded-lg border border-destructive/30 bg-destructive/5 p-3 font-mono text-xs text-muted-foreground leading-relaxed">{negative}</pre>
        </div>
      )}
    </div>
  );
}
