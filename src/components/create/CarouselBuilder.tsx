import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { useToast } from "@/hooks/use-toast";
import { useImageLightbox } from "@/contexts/ImageLightboxContext";
import { Film, Loader2, Download, Share2, Play, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ExportDialog } from "@/components/create/ExportDialog";

interface Scene {
  scene_number: number;
  caption: string;
  image_prompt: string;
  result_url?: string;
}

type BuildPhase = "idle" | "decomposing" | "reviewing" | "generating" | "paused" | "done";

interface CarouselBuilderProps {
  videoPrompt: string;
  negativePrompt: string | null;
  promptHistoryId: string | null;
  campaignId: string | null;
}

const PROGRESS_QUIPS = [
  "Preparing your scene…",
  "Rendering the next frame…",
  "Composing visual elements…",
  "Applying creative adjustments…",
  "Processing details…",
  "Building the composition…",
  "Polishing the output…",
  "Assembling the final layout…",
  "Almost there…",
  "Adding finishing touches…",
];

export function CarouselBuilder({
  videoPrompt,
  negativePrompt,
  promptHistoryId,
  campaignId,
}: CarouselBuilderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { openLightbox } = useImageLightbox();

  const [slideCount, setSlideCount] = useState(12);
  const [phase, setPhase] = useState<BuildPhase>("idle");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [nudges, setNudges] = useState<Record<number, string>>({});
  const [currentScene, setCurrentScene] = useState(0);
  const [quip, setQuip] = useState("");
  const [driftFeedback, setDriftFeedback] = useState("");
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const abortRef = useRef(false);
  const checkpointResolveRef = useRef<((feedback: string) => void) | null>(null);

  const getQuip = (index: number) =>
    PROGRESS_QUIPS[index % PROGRESS_QUIPS.length];

  // Step 1: Decompose scenes
  const handleDecompose = async () => {
    if (!videoPrompt.trim()) return;
    setPhase("decomposing");
    setScenes([]);
    setNudges({});
    setDriftFeedback("");
    setCurrentScene(0);
    abortRef.current = false;
    setQuip("Breaking your epic into bite-sized scenes…");

    try {
      const { data, error } = await supabase.functions.invoke("decompose-scenes", {
        body: { video_prompt: videoPrompt, negative_prompt: negativePrompt, scene_count: slideCount },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Decomposition failed", description: data.error, variant: "destructive" });
        setPhase("idle");
        return;
      }

      const decomposed: Scene[] = data.scenes;
      setScenes(decomposed);
      setPhase("reviewing");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message || "Something went wrong", variant: "destructive" });
      setPhase("idle");
    }
  };

  // Step 2: Generate images with nudges and drift checkpoint
  const handleStartGenerating = async () => {
    setPhase("generating");
    const carouselGroupId = crypto.randomUUID();
    const halfwayIndex = Math.floor(scenes.length / 2);
    let activeDriftFeedback = "";

    try {
      for (let i = 0; i < scenes.length; i++) {
        if (abortRef.current) break;

        // Drift checkpoint at halfway
        if (i === halfwayIndex && halfwayIndex > 0) {
          setPhase("paused");
          activeDriftFeedback = await new Promise<string>((resolve) => {
            checkpointResolveRef.current = resolve;
          });
          setPhase("generating");
        }

        const scene = scenes[i];
        setCurrentScene(i + 1);
        setQuip(getQuip(i));

        // Build the final prompt with nudge and drift correction
        let finalPrompt = scene.image_prompt;
        const nudge = nudges[i];
        if (nudge && nudge.trim()) {
          finalPrompt += `\n\n[CREATIVE DIRECTION]: ${nudge.trim()}`;
        }
        if (activeDriftFeedback && i >= halfwayIndex) {
          finalPrompt += `\n\n[COURSE CORRECTION]: ${activeDriftFeedback}`;
        }

        const { data: genData, error: genError } = await supabase.functions.invoke("generate-image", {
          body: {
            prompt: finalPrompt,
            negative_prompt: negativePrompt,
            prompt_history_id: promptHistoryId,
            campaign_id: campaignId,
            carousel_group_id: carouselGroupId,
            scene_order: scene.scene_number,
          },
        });

        if (genError) {
          console.error(`Scene ${i + 1} error:`, genError);
          toast({ title: `Scene ${i + 1} failed`, description: genError.message, variant: "destructive" });
          continue;
        }
        if (genData?.error) {
          toast({ title: `Scene ${i + 1} failed`, description: genData.error, variant: "destructive" });
          continue;
        }

        setScenes((prev) =>
          prev.map((s, idx) => (idx === i ? { ...s, result_url: genData.url } : s))
        );
      }

      if (user) {
        await supabase.from("usage_logs" as any).insert({
          user_id: user.id,
          event_type: "build_carousel",
          metadata: { carousel_group_id: carouselGroupId, scene_count: scenes.length },
        });
      }

      setPhase("done");
      toast({ title: "Carousel complete!", description: `${scenes.length} scenes generated.` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message || "Something went wrong", variant: "destructive" });
      setPhase("idle");
    }
  };

  const handleCheckpointContinue = (withFeedback: boolean) => {
    const feedback = withFeedback ? driftFeedback.trim() : "";
    checkpointResolveRef.current?.(feedback);
    checkpointResolveRef.current = null;
  };

  const completedScenes = scenes.filter((s) => s.result_url);
  const progress = scenes.length > 0 ? (completedScenes.length / scenes.length) * 100 : 0;

  const handleDownloadAll = () => {
    completedScenes.forEach((scene) => {
      if (!scene.result_url) return;
      const a = document.createElement("a");
      a.href = scene.result_url;
      a.download = `carousel-scene-${scene.scene_number}.png`;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    });
  };

  const isGenerating = phase === "generating" || phase === "paused";

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Carousel Builder</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Micro-Story
            </span>
          </div>
          <CardDescription>
            Turn your video prompt into a swipeable visual micro-story
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Slide Count Selector */}
          {phase === "idle" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Number of Slides</Label>
                <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {slideCount}
                </span>
              </div>
              <Slider
                min={6}
                max={20}
                step={1}
                value={[slideCount]}
                onValueChange={([v]) => setSlideCount(v)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>6 (quick)</span>
                <span>20 (detailed)</span>
              </div>
            </div>
          )}

          {/* Build / Decompose Button */}
          {phase === "idle" && (
            <Button onClick={handleDecompose} disabled={!videoPrompt.trim()}>
              <Film className="mr-2 h-4 w-4" />
              Build Carousel
            </Button>
          )}

          {/* Decomposing spinner */}
          {phase === "decomposing" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="italic">{quip}</span>
            </div>
          )}

          {/* Scene Review Panel with Nudges */}
          {phase === "reviewing" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  Review {scenes.length} scenes — add nudges to guide the visuals
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto space-y-3 border border-border rounded-lg p-3">
                {scenes.map((scene, idx) => (
                  <div key={idx} className="space-y-1.5 pb-3 border-b border-border last:border-0 last:pb-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      Scene {scene.scene_number}
                    </p>
                    <p className="text-sm leading-snug">{scene.caption}</p>
                    <Input
                      placeholder="Nudge: e.g. 'warmer tones', 'more dramatic angle'…"
                      value={nudges[idx] || ""}
                      onChange={(e) =>
                        setNudges((prev) => ({ ...prev, [idx]: e.target.value }))
                      }
                      className="text-xs h-8"
                    />
                  </div>
                ))}
              </div>
              <Button onClick={handleStartGenerating}>
                <Play className="mr-2 h-4 w-4" />
                Start Generating
              </Button>
            </div>
          )}

          {/* Generation Progress */}
          {isGenerating && phase !== "paused" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground italic">{quip}</span>
                <span className="font-mono text-xs">
                  {currentScene}/{scenes.length}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Drift Checkpoint */}
          {phase === "paused" && (
            <div className="space-y-3 border border-primary/30 bg-primary/5 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Drift Checkpoint — Halfway Review</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {completedScenes.length} of {scenes.length} scenes generated. Review the carousel above and optionally provide corrections for the remaining scenes.
              </p>
              <Textarea
                placeholder="e.g. 'Shift to cooler blue tones', 'Make the subject more prominent'…"
                value={driftFeedback}
                onChange={(e) => setDriftFeedback(e.target.value)}
                className="text-base md:text-sm min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleCheckpointContinue(false)}>
                  Looks good, continue
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleCheckpointContinue(true)}
                  disabled={!driftFeedback.trim()}
                >
                  Continue with corrections
                </Button>
              </div>
            </div>
          )}

          {/* Carousel Result */}
          {completedScenes.length > 0 && (
            <div className="space-y-4">
              <Carousel className="w-full max-w-lg mx-auto">
                <CarouselContent>
                  {scenes.map((scene, idx) => (
                    <CarouselItem key={idx}>
                      <div className="relative">
                        {scene.result_url ? (
                          <img
                            src={scene.result_url}
                            alt={`Scene ${scene.scene_number}`}
                            className="rounded-lg border border-border w-full aspect-square object-cover cursor-pointer"
                            onClick={() => openLightbox(scene.result_url!, scene.caption)}
                          />
                        ) : (
                          <div className="rounded-lg border border-border w-full aspect-square bg-muted flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/80 to-transparent p-4 rounded-b-lg">
                          <p className="text-background text-sm leading-snug">
                            {scene.caption}
                          </p>
                          <span className="text-background/60 text-xs mt-1 block">
                            Scene {scene.scene_number} of {scenes.length}
                          </span>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2 sm:-left-12 bg-background/80 backdrop-blur-sm" />
                <CarouselNext className="right-2 sm:-right-12 bg-background/80 backdrop-blur-sm" />
              </Carousel>

              {phase === "done" && (
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm" onClick={handleDownloadAll}>
                    <Download className="mr-2 h-4 w-4" />
                    Download All
                  </Button>
                  {completedScenes[0]?.result_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExportUrl(completedScenes[0].result_url!)}
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {exportUrl && (
        <ExportDialog
          open={!!exportUrl}
          onOpenChange={(o) => !o && setExportUrl(null)}
          imageUrl={exportUrl}
        />
      )}
    </>
  );
}
