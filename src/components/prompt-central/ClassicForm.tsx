import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SeedInput } from "@/components/workspace/SeedInput";
import { GranularitySlider } from "@/components/workspace/GranularitySlider";
import { SmartExpandToggle, type ExpandMode } from "@/components/workspace/SmartExpandToggle";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { SentientPulse } from "./SentientPulse";

export function ClassicForm() {
  const { user } = useAuth();
  const [seed, setSeed] = useState("");
  const [granularity, setGranularity] = useState(50);
  const [smartExpand, setSmartExpand] = useState<ExpandMode>("creative");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!seed.trim() || !user) return;
    setIsLoading(true);
    setOutput("");

    try {
      const { data, error } = await supabase.functions.invoke("orchestrate", {
        body: {
          seed: seed.trim(),
          selectedStacks: [],
          granularity,
          vibes: [],
          variables: {},
          smartExpand,
          negativePrompt: "",
          mode: "creative",
        },
      });

      if (error) throw error;
      setOutput(data?.output_openai || data?.output_midjourney || "No output generated.");
    } catch (e: any) {
      console.error(e);
      toast.error("Generation failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-2xl mx-auto">
      <SeedInput value={seed} onChange={setSeed} />

      <div className="grid gap-4">
        <GranularitySlider value={granularity} onChange={setGranularity} />
        <SmartExpandToggle value={smartExpand} onChange={setSmartExpand} />
      </div>

      <Button onClick={handleGenerate} disabled={isLoading || !seed.trim()} className="w-full gap-2">
        <Sparkles className="h-4 w-4" />
        Generate Prompt
      </Button>

      {isLoading && <SentientPulse />}

      {output && (
        <div className="rounded-xl border border-primary/20 bg-card p-4 md:p-6">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Output</p>
          <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">{output}</pre>
        </div>
      )}
    </div>
  );
}
