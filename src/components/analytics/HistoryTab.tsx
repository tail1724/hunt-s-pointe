import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, formatDistanceToNowStrict } from "date-fns";
import { History, ChevronDown, ThumbsUp, ThumbsDown, Wand2, MessagesSquare } from "lucide-react";
import { CampaignSelector } from "@/components/campaign/CampaignSelector";
import { QuickExport } from "@/components/QuickExport";
import { VizEmpty } from "./ChartKit";
import type { Tables } from "@/integrations/supabase/types";

export default function HistoryTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Tables<"prompt_history">[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("prompt_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("prompt_feedback" as any).select("*").eq("user_id", user.id),
    ]).then(([historyRes, feedbackRes]) => {
      if (historyRes.data) setItems(historyRes.data);
      if (feedbackRes.data) {
        const map: Record<string, any[]> = {};
        (feedbackRes.data as any[]).forEach((f: any) => {
          if (!map[f.prompt_history_id]) map[f.prompt_history_id] = [];
          map[f.prompt_history_id].push(f);
        });
        setFeedbackMap(map);
      }
    });
  }, [user]);

  // Reopen the conversation this entry came from (newer rows carry a
  // session_id) with the seed prefilled, ready to run again. Legacy rows
  // without a session fall back to prefilling a fresh chat.
  const continueInEzra = (item: Tables<"prompt_history">) => {
    const sid = (item as any).session_id as string | null | undefined;
    if (sid) {
      navigate(`/app/ezra?session=${sid}`, { state: { prefill: item.seed } });
    } else {
      navigate("/app/ezra", { state: { prefill: item.seed } });
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Your past studies. Pick one up again and Ezra will carry it into a fresh conversation.
      </p>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50">
          <VizEmpty
            icon={History}
            title="No studies yet"
            body="Everything you generate is kept here so you can return to it."
            action={
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/app/ezra")}>
                <Wand2 className="h-3.5 w-3.5" /> Open Ezra
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const feedback = feedbackMap[item.id] || [];
            const latestVote = feedback.find((f: any) => f.vote);
            const latestScore = feedback.find((f: any) => f.accuracy_score != null);
            const refinements = feedback.filter((f: any) => f.corrective_input);

            return (
              <Collapsible key={item.id}>
                <article
                  className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] card-elevate rise-in overflow-hidden"
                  style={{ "--stagger-i": Math.min(idx, 8) } as React.CSSProperties}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-sm font-semibold leading-snug text-foreground">
                        {item.seed.slice(0, 110)}
                        {item.seed.length > 110 ? "…" : ""}
                      </h3>
                      <span className="shrink-0 text-[11px] text-muted-foreground" title={format(new Date(item.created_at), "PPp")}>
                        {formatDistanceToNowStrict(new Date(item.created_at))} ago
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {item.selected_stacks.length === 0 ? (
                        <Badge variant="secondary" className="text-[11px]">Ezra</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] capitalize">{item.mode}</Badge>
                      )}
                      {latestVote && (
                        <Badge variant={latestVote.vote === "up" ? "default" : "destructive"} className="gap-1 text-[11px]">
                          {latestVote.vote === "up" ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                          {latestVote.vote}
                        </Badge>
                      )}
                      {latestScore && <Badge variant="secondary" className="text-[11px]">{latestScore.accuracy_score}/10</Badge>}
                      {refinements.length > 0 && (
                        <Badge variant="outline" className="text-[11px]">{refinements.length} refinement{refinements.length > 1 ? "s" : ""}</Badge>
                      )}
                    </div>

                    {item.output_midjourney && (
                      <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/70 p-3 font-mono text-xs leading-relaxed text-foreground/90">
                        {item.output_midjourney.slice(0, 200)}
                        {item.output_midjourney.length > 200 ? "…" : ""}
                      </pre>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button size="sm" onClick={() => continueInEzra(item)} className="gap-1.5 text-xs">
                        <MessagesSquare className="h-3.5 w-3.5" /> Continue in Ezra
                      </Button>
                      <CampaignSelector
                        value={(item as any).campaign_id || null}
                        onChange={async (cid) => {
                          await supabase.from("prompt_history").update({ campaign_id: cid }).eq("id", item.id);
                          setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, campaign_id: cid } as any : i));
                        }}
                      />
                      {item.output_midjourney && <QuickExport promptText={item.output_midjourney} promptId={item.id} />}
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="ml-auto gap-1.5 text-xs text-muted-foreground group/trigger">
                          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]/trigger:rotate-180" />
                          All outputs
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent className="space-y-3 pt-3">
                      {item.output_video && (
                        <OutputBlock label="Video">{item.output_video}</OutputBlock>
                      )}
                      {item.output_audio && (
                        <OutputBlock label="Audio">{item.output_audio}</OutputBlock>
                      )}
                      {item.output_openai && (
                        <OutputBlock label="OpenAI">{item.output_openai}</OutputBlock>
                      )}
                      {item.negative_prompt && (
                        <div>
                          <h4 className="mb-1 text-xs font-semibold text-muted-foreground">Negative</h4>
                          <pre className="whitespace-pre-wrap rounded-lg border border-destructive/30 bg-destructive/5 p-3 font-mono text-xs text-muted-foreground">{item.negative_prompt}</pre>
                        </div>
                      )}
                      {refinements.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-muted-foreground">Refinements</h4>
                          {refinements.map((r: any) => (
                            <div key={r.id} className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3">
                              <div className="flex items-center gap-2">
                                {r.accuracy_score != null && <Badge variant="secondary" className="text-[10px]">Score: {r.accuracy_score}/10</Badge>}
                                <span className="text-[10px] text-muted-foreground">{format(new Date(r.created_at), "PPp")}</span>
                              </div>
                              <p className="text-xs text-foreground"><span className="font-medium">Correction:</span> {r.corrective_input}</p>
                              {r.refinement_output && Object.entries(r.refinement_output).map(([platform, text]) => (
                                <div key={platform}>
                                  <h5 className="text-[10px] font-semibold capitalize text-muted-foreground">{platform} (refined)</h5>
                                  <pre className="whitespace-pre-wrap rounded bg-muted p-2 font-mono text-[10px] text-foreground">{(text as string).slice(0, 200)}…</pre>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </article>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OutputBlock({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold text-muted-foreground">{label}</h4>
      <pre className="whitespace-pre-wrap rounded-lg bg-muted/70 p-3 font-mono text-xs text-foreground">{children}</pre>
    </div>
  );
}
