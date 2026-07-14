import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RefinementPanelProps {
  promptHistoryId: string | null;
  seed: string;
  platform: string;
  currentOutput: string;
  onRefined: (refined: string) => void;
}

function getScoreLabel(score: number): string {
  if (score <= 3) return "Full hallucination — missed the goal";
  if (score <= 5) return "Right concept, wrong execution";
  if (score <= 7) return "Close, needs rework";
  if (score <= 9) return "Almost there, minor tweaks";
  return "Perfect — cosmetic only";
}

export function RefinementPanel({ promptHistoryId, seed, platform, currentOutput, onRefined }: RefinementPanelProps) {
  const { user } = useAuth();
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [accuracyScore, setAccuracyScore] = useState(5);
  const [correctiveInput, setCorrectiveInput] = useState("");
  const [refining, setRefining] = useState(false);

  if (!currentOutput || !promptHistoryId) return null;

  const handleVote = async (v: "up" | "down") => {
    setVote(v);
    if (!user) return;
    try {
      await supabase.from("prompt_feedback" as any).insert({
        user_id: user.id,
        prompt_history_id: promptHistoryId,
        vote: v,
      });
      await supabase.from("usage_logs" as any).insert({
        user_id: user.id,
        event_type: "vote",
        metadata: { prompt_history_id: promptHistoryId, vote: v, platform },
      });
      toast.success(`Vote recorded: ${v === "up" ? "👍" : "👎"}`);
    } catch {
      toast.error("Failed to save vote");
    }
  };

  const handleRefine = async () => {
    if (!correctiveInput.trim()) {
      toast.error("Describe what to adjust first.");
      return;
    }
    if (!user) return;
    setRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke("refine", {
        body: {
          original_output: currentOutput,
          corrective_input: correctiveInput,
          accuracy_score: accuracyScore,
          seed,
          platform,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const refined = data.refined;
      onRefined(refined);

      // Save feedback
      await supabase.from("prompt_feedback" as any).insert({
        user_id: user.id,
        prompt_history_id: promptHistoryId,
        vote,
        accuracy_score: accuracyScore,
        corrective_input: correctiveInput,
        refinement_output: { [platform]: refined },
      });
      await supabase.from("usage_logs" as any).insert({
        user_id: user.id,
        event_type: "refine",
        metadata: { prompt_history_id: promptHistoryId, accuracy_score: accuracyScore, platform },
      });

      setCorrectiveInput("");
      toast.success("Output refined!");
    } catch (e: any) {
      console.error(e);
      if (e?.message?.includes("429") || e?.context?.status === 429) {
        toast.error("Rate limit exceeded. Please wait and try again.");
      } else if (e?.message?.includes("402") || e?.context?.status === 402) {
        toast.error("AI credits exhausted. Please add funds.");
      } else {
        toast.error("Refinement failed.");
      }
    } finally {
      setRefining(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h4 className="font-display text-xs font-semibold text-foreground">Refinement Feedback</h4>

      {/* Vote buttons */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Rate this output:</span>
        <Button
          variant={vote === "up" ? "default" : "outline"}
          size="sm"
          onClick={() => handleVote("up")}
          className={cn("h-8 w-8 p-0", vote === "up" && "bg-primary text-primary-foreground")}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={vote === "down" ? "destructive" : "outline"}
          size="sm"
          onClick={() => handleVote("down")}
          className="h-8 w-8 p-0"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Accuracy slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Accuracy: {accuracyScore}/10</span>
          <span className="text-[10px] text-muted-foreground italic">{getScoreLabel(accuracyScore)}</span>
        </div>
        <Slider
          value={[accuracyScore]}
          onValueChange={([v]) => setAccuracyScore(v)}
          min={1}
          max={10}
          step={1}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>1 — Hallucination</span>
          <span>5 — Concept OK</span>
          <span>10 — Perfect</span>
        </div>
      </div>

      {/* Corrective input */}
      <Textarea
        placeholder="Describe what to adjust…"
        value={correctiveInput}
        onChange={(e) => setCorrectiveInput(e.target.value)}
        className="min-h-[60px] max-h-[100px] resize-none text-xs"
      />

      {/* Refine button */}
      <Button
        onClick={handleRefine}
        disabled={refining || !correctiveInput.trim()}
        size="sm"
        className="gap-1.5"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", refining && "animate-spin")} />
        {refining ? "Refining…" : "Refine Output"}
      </Button>
    </div>
  );
}
