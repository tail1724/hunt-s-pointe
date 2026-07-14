import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Image, Video, Music, Download, Loader2, Sparkles, ExternalLink, Share2, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PhotoEditor } from "@/components/editor/PhotoEditor";
import { ExportDialog } from "@/components/create/ExportDialog";
import { CarouselBuilder } from "@/components/create/CarouselBuilder";
import { CampaignSelector } from "@/components/campaign/CampaignSelector";
import { useImageLightbox } from "@/contexts/ImageLightboxContext";
import type { Tables } from "@/integrations/supabase/types";

export default function Create() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { openLightbox } = useImageLightbox();

  const [historyItems, setHistoryItems] = useState<Tables<"prompt_history">[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("");
  const [promptText, setPromptText] = useState("");
  const [negativePrompt, setNegativePrompt] = useState<string | null>(null);
  const [promptTab, setPromptTab] = useState<"midjourney" | "openai" | "video" | "audio">("midjourney");

  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [featuredText, setFeaturedText] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);

  const [generations, setGenerations] = useState<Tables<"generations">[]>([]);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  // Fetch history for source selector
  useEffect(() => {
    if (!user) return;
    supabase
      .from("prompt_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setHistoryItems(data);
      });
  }, [user]);

  // Fetch past generations
  useEffect(() => {
    if (!user) return;
    supabase
      .from("generations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setGenerations(data as Tables<"generations">[]);
      });
  }, [user]);

  // When a history item is selected, populate the prompt
  useEffect(() => {
    if (!selectedHistoryId) {
      setPromptText("");
      return;
    }
    const item = historyItems.find((h) => h.id === selectedHistoryId);
    if (!item) return;

    const map: Record<string, string | null> = {
      midjourney: item.output_midjourney,
      openai: item.output_openai,
      video: item.output_video,
      audio: item.output_audio,
    };
    setPromptText(map[promptTab] || "");
    setNegativePrompt(item.negative_prompt || null);
  }, [selectedHistoryId, promptTab, historyItems]);

  const handleGenerate = async () => {
    if (!promptText.trim()) {
      toast({ title: "No prompt", description: "Enter or select a prompt first.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setGeneratedUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: { prompt: promptText, negative_prompt: negativePrompt, prompt_history_id: selectedHistoryId || null, campaign_id: campaignId },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Generation failed", description: data.error, variant: "destructive" });
        return;
      }

      setGeneratedUrl(data.url);
      toast({ title: "Image generated!", description: "Your image is ready." });

      // Log usage
      if (user) {
        await supabase.from("usage_logs" as any).insert({
          user_id: user.id,
          event_type: "generate_image",
          metadata: { prompt_history_id: selectedHistoryId || null, campaign_id: campaignId },
        });
      }

      // Refresh gallery
      const { data: gens } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (gens) setGenerations(gens as Tables<"generations">[]);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message || "Something went wrong", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // Persist an edited copy from the photo editor as a NEW generation, keeping
  // the original intact (non-destructive). Uploads to the same public bucket
  // the edge function uses.
  const saveEditedImage = async (blob: Blob) => {
    if (!user) return;
    try {
      const path = `${user.id}/edited-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("generated-media")
        .upload(path, blob, { contentType: "image/png", upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("generated-media").getPublicUrl(path);
      const { error: insErr } = await supabase.from("generations").insert({
        user_id: user.id,
        media_type: "image",
        source_prompt: promptText || "Edited image",
        result_url: pub.publicUrl,
        status: "complete",
      } as any);
      if (insErr) throw insErr;
      setGeneratedUrl(pub.publicUrl);
      const { data: gens } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (gens) setGenerations(gens as Tables<"generations">[]);
      toast({ title: "Saved", description: "Your edited image is in the gallery." });
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e.message || "Upload failed", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-extrabold tracking-tight">Create</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Turn your processed outputs into images, video & audio.
        </p>
      </div>

      <CampaignSelector value={campaignId} onChange={setCampaignId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — Source */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Source Prompt</CardTitle>
            <CardDescription>Pick from history or write your own</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedHistoryId} onValueChange={setSelectedHistoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select from history…" />
              </SelectTrigger>
              <SelectContent>
                {historyItems.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.seed.slice(0, 60)}{h.seed.length > 60 ? "…" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedHistoryId && (
              <Tabs value={promptTab} onValueChange={(v) => setPromptTab(v as any)}>
                <TabsList className="w-full">
                  <TabsTrigger value="midjourney" className="flex-1 text-xs">Output A</TabsTrigger>
                  <TabsTrigger value="openai" className="flex-1 text-xs">OpenAI</TabsTrigger>
                  <TabsTrigger value="video" className="flex-1 text-xs">Video</TabsTrigger>
                  <TabsTrigger value="audio" className="flex-1 text-xs">Audio</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            <Textarea
              placeholder="Paste or edit your prompt here…"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={5}
              className="font-mono text-xs"
            />
          </CardContent>
        </Card>

        {/* Right column — Generation panels */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image generation */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Image Generation</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Gemini</span>
              </div>
              <CardDescription>Generate images using Lovable AI (no API key needed)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="featured-text" className="text-xs font-medium text-muted-foreground">
                  Featured text <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <Input
                  id="featured-text"
                  value={featuredText}
                  onChange={(e) => setFeaturedText(e.target.value)}
                  placeholder="e.g. For God so loved the world — John 3:16"
                />
                <p className="text-[11px] text-muted-foreground/70">
                  Added as crisp, editable typography in the editor — never baked into the AI render, so it always reads perfectly.
                </p>
              </div>

              <Button onClick={handleGenerate} disabled={generating || !promptText.trim()}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Image
                  </>
                )}
              </Button>

              {generating && (
                <Skeleton className="w-full aspect-square max-w-md rounded-lg" />
              )}

              {generatedUrl && (
                <div className="space-y-3">
                  <img
                    src={generatedUrl}
                    alt="Generated image"
                    className="rounded-lg border border-border w-full max-w-full md:max-w-md cursor-pointer"
                    onClick={() => openLightbox(generatedUrl, promptText)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setEditorOpen(true)}>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Edit &amp; add text
                    </Button>
                    <a href={generatedUrl} download target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </a>
                    <Button variant="outline" size="sm" onClick={() => setExportUrl(generatedUrl)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Instagram Export
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Carousel Builder */}
          <CarouselBuilder
            videoPrompt={
              selectedHistoryId
                ? historyItems.find((h) => h.id === selectedHistoryId)?.output_video || ""
                : ""
            }
            negativePrompt={negativePrompt}
            promptHistoryId={selectedHistoryId || null}
            campaignId={campaignId}
          />


          <Card className="opacity-75">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-accent" />
                <CardTitle className="text-base">Video Generation</CardTitle>
              </div>
              <CardDescription>Connect an external API to generate video from your prompts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled>
                <ExternalLink className="mr-2 h-4 w-4" />
                Connect External API (Coming Soon)
              </Button>
            </CardContent>
          </Card>

          {/* Audio placeholder */}
          <Card className="opacity-75">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5 text-secondary" />
                <CardTitle className="text-base">Audio Generation</CardTitle>
              </div>
              <CardDescription>Connect an external API to generate audio from your prompts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled>
                <ExternalLink className="mr-2 h-4 w-4" />
                Connect External API (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gallery */}
      {generations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Generations</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {generations.map((gen) => (
              <div key={gen.id} className="group relative">
                {gen.result_url ? (
                  <img
                    src={gen.result_url}
                    alt="Generated"
                    className="rounded-lg border border-border aspect-square object-cover w-full cursor-pointer"
                    onClick={() => openLightbox(gen.result_url!, gen.source_prompt)}
                  />
                ) : (
                  <div className="rounded-lg border border-border aspect-square bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    {gen.status}
                  </div>
                )}
                <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end p-2">
                  <p className="text-background text-xs line-clamp-3">{gen.source_prompt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {exportUrl && (
        <ExportDialog
          open={!!exportUrl}
          onOpenChange={(o) => !o && setExportUrl(null)}
          imageUrl={exportUrl}
          promptText={promptText}
        />
      )}

      {generatedUrl && (
        <PhotoEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          imageUrl={generatedUrl}
          initialText={featuredText || undefined}
          onSave={saveEditedImage}
        />
      )}
    </div>
  );
}
