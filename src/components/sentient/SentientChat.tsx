import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, MicOff, Square, Maximize2, Minimize2, Share2, Sparkles, BookOpen } from "lucide-react";
import { NexusPulse } from "./NexusPulse";
import { ChatMessages, type Msg, type MsgMeta } from "./ChatMessages";
import { BenchmarkCard, type BenchmarkResult } from "./BenchmarkCard";
import { SaveTemplateDialog } from "@/components/prompt-central/SaveTemplateDialog";
import { ArtifactPanel } from "./ArtifactPanel";
import { ShareSessionDialog } from "./ShareSessionDialog";
import { ModelPicker } from "./ModelPicker";
import { SlashCommandPalette, type SlashAction } from "./SlashCommandPalette";
import { ScripturePreferencesDialog } from "./ScripturePreferencesDialog";
import { useScripturePreferences } from "@/hooks/useScripturePreferences";
import { buildBibleContext } from "@/lib/bible/resolver";
import type { ScriptureArtifactData } from "./ScriptureArtifact";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useNexusVoice } from "@/hooks/useNexusVoice";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBenchmarkPreferences } from "@/hooks/useBenchmarkPreferences";
import { useModelPreference } from "@/hooks/useModelPreference";
import { useFocusMode } from "@/hooks/useFocusMode";
import type { NexusState } from "./NexusAnchor";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prompt-partner`;
const BENCHMARK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inference-benchmark`;
const AUTOTITLE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-title`;

interface NexusSignal {
  nexus_state?: string;
  action?: string;
  viz_payload?: { type: string; energy: number };
  type?: string;
}

interface SentientChatProps {
  lite?: boolean;
  onTurnLimitReached?: () => void;
  sessionId?: string | null;
  onSessionCreated?: (id: string) => void;
  injectedText?: string;
  onInjectedTextConsumed?: () => void;
  onNexusSignal?: (signal: NexusSignal) => void;
}

export function SentientChat({
  lite = false, onTurnLimitReached, sessionId, onSessionCreated,
  injectedText, onInjectedTextConsumed, onNexusSignal,
}: SentientChatProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { prefs: benchPrefs } = useBenchmarkPreferences();
  const { model, setModel } = useModelPreference();
  const { focus, toggle: toggleFocus } = useFocusMode();
  const { prefs: scripturePrefs, loaded: prefsLoaded, needsOnboarding, dismissOnboarding } = useScripturePreferences();
  const [scriptureDialogOpen, setScriptureDialogOpen] = useState(false);
  const [scriptureMode, setScriptureMode] = useState<"on" | "off">("on");
  const [messages, setMessages] = useState<Msg[]>([]);

  const [input, setInput] = useState("");
  const [ghostText, setGhostText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState<any>(null);
  const [userTurns, setUserTurns] = useState(0);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [benchmarkResults, setBenchmarkResults] = useState<Map<number, BenchmarkResult>>(new Map());
  const [lastBenchmarkAt, setLastBenchmarkAt] = useState<number>(0);
  const [artifact, setArtifact] = useState<{ index: number; title: string } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoTitledRef = useRef<Set<string>>(new Set());

  // First-time onboarding: open the dialog once when prefs row is missing.
  useEffect(() => {
    if (!lite && user && prefsLoaded && needsOnboarding) {
      setScriptureDialogOpen(true);
    }
  }, [lite, user, prefsLoaded, needsOnboarding]);

  const voiceEnabled = !!user && !lite;
  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) { setInput((p) => (p ? p + " " + text : text)); setGhostText(""); }
    else setGhostText(text);
  }, []);
  const { start: startVoice, stop: stopVoice, isListening, isSupported } = useNexusVoice({
    mode: "presence", onTranscript: handleTranscript, onAudioLevel: setAudioLevel, enabled: voiceEnabled,
  });

  const nexusState: NexusState = isLoading ? "processing" : isListening ? "listening" : "idle";

  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && messages.length >= prevMsgCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (injectedText) {
      setInput((prev) => (prev ? prev + "\n\n" + injectedText : injectedText));
      onInjectedTextConsumed?.();
      textareaRef.current?.focus();
    }
  }, [injectedText, onInjectedTextConsumed]);

  useEffect(() => {
    if (!sessionId || !user) return;
    (async () => {
      const { data } = await supabase.from("partner_sessions" as any).select("messages").eq("id", sessionId).single();
      if (data && Array.isArray((data as any).messages)) setMessages((data as any).messages);
    })();
  }, [sessionId, user]);

  useEffect(() => {
    if (!user || lite) return;
    (async () => {
      const [profileRes, historyRes] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", user.id).single(),
        supabase.from("prompt_history").select("seed, mode, selected_stacks").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
      ]);
      setUserContext({
        display_name: profileRes.data?.display_name,
        recent_projects: historyRes.data || [],
      });
    })();
  }, [user, lite]);

  const saveSession = useCallback(async (msgs: Msg[]): Promise<string | null> => {
    if (!user || lite || msgs.length === 0) return null;
    const fallbackTitle = msgs.find((m) => m.role === "user")?.content.slice(0, 60) || "Untitled Session";
    if (sessionId) {
      await supabase.from("partner_sessions" as any).update({ messages: msgs as any } as any).eq("id", sessionId);
      return sessionId;
    } else {
      const { data } = await supabase.from("partner_sessions" as any)
        .insert({ user_id: user.id, messages: msgs as any, title: fallbackTitle } as any)
        .select("id").single();
      if (data) { onSessionCreated?.((data as any).id); return (data as any).id; }
      return null;
    }
  }, [user, lite, sessionId, onSessionCreated]);

  const runBenchmark = useCallback(async (seed: string, msgIndex: number, force = false) => {
    if (!user || lite) return;
    if (!force && !benchPrefs.enabled) return;
    if (!force) {
      const sinceMs = Date.now() - lastBenchmarkAt;
      if (sinceMs < benchPrefs.cooldown_sec * 1000) return;
    }
    try {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData.session?.access_token;
      if (!token) return;
      const resp = await fetch(BENCHMARK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ seed, force, cooldown_sec: benchPrefs.cooldown_sec }),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.skipped) return;
      setBenchmarkResults((prev) => new Map(prev).set(msgIndex, data));
      setLastBenchmarkAt(Date.now());
    } catch (e) { console.error("Benchmark failed:", e); }
  }, [user, lite, benchPrefs, lastBenchmarkAt]);

  const handleStop = () => abortRef.current?.abort();

  const triggerAutoTitle = useCallback(async (sid: string, userMsg: string, assistantMsg: string) => {
    if (autoTitledRef.current.has(sid)) return;
    autoTitledRef.current.add(sid);
    try {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData.session?.access_token;
      if (!token) return;
      await fetch(AUTOTITLE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: sid, first_user_msg: userMsg, first_assistant_msg: assistantMsg }),
      });
    } catch (e) { /* non-critical */ }
  }, []);

  const send = async (overrideMessages?: Msg[]) => {
    const allMessages = overrideMessages || [...messages, { role: "user" as const, content: input.trim() }];
    const text = overrideMessages ? "" : input.trim();

    if (!overrideMessages) {
      if (!text || isLoading) return;
      if (lite && userTurns >= 2) { onTurnLimitReached?.(); return; }
      setInput(""); setGhostText("");
      setMessages(allMessages);
      setUserTurns((t) => t + 1);
    }

    setIsLoading(true);
    if (user && !lite && !overrideMessages) {
      supabase.from("usage_logs" as any).insert({ user_id: user.id, event_type: "partner_message", metadata: { turn: userTurns + 1 } }).then(() => {});
    }

    let assistantSoFar = "";
    let aborted = false;
    let toolEvents: NonNullable<MsgMeta["tools"]> = [];
    let usageMeta: { model?: string; latency_ms?: number; tokens?: number } = {};
    let scriptureArtifact: ScriptureArtifactData | null = null;
    const isFirstMessageOfSession = !sessionId && allMessages.filter((m) => m.role === "user").length === 1;
    const firstUserText = allMessages.find((m) => m.role === "user")?.content || "";
    const userSeed = allMessages.filter((m) => m.role === "user").pop()?.content || "";
    const controller = new AbortController();
    abortRef.current = controller;

    // Build scripture grounding context (only when scripture mode is ON for this turn).
    let bibleContextPayload: any = null;
    if (!lite && user && scripturePrefs && scriptureMode === "on") {
      try {
        const lastUser = allMessages.filter((m) => m.role === "user").pop()?.content || "";
        const ctx = await buildBibleContext(lastUser, scripturePrefs as any);
        if (ctx) bibleContextPayload = ctx;
      } catch (e) { console.warn("[bible_context] build error", e); }
    }


    try {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content, pinned: m.pinned })),
          user_context: lite ? undefined : userContext,
          lite, mode: "presence", model,
          bible_context: bibleContextPayload,
          scripture_prefs: bibleContextPayload ? scripturePrefs : undefined,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        toast.error(err.error || `Error ${resp.status}`);
        setIsLoading(false); return;
      }
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      const attachMetaToLastAssistant = () => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role !== "assistant") return prev;
          const meta: MsgMeta = {
            ...(last.meta || {}),
            ...(toolEvents.length ? { tools: toolEvents } : {}),
            ...(scriptureArtifact ? { scripture_artifact: scriptureArtifact } : {}),
            ...usageMeta,
          };
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, meta } : m));
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.__nexus) {
              const sig = parsed.__nexus as NexusSignal;
              // New envelope types from extended prompt-partner
              if (sig.type === "tool_result") {
                toolEvents = [...toolEvents, { name: (sig as any).name, args: (sig as any).args, result: (sig as any).result }];
                attachMetaToLastAssistant();
                if ((sig as any).name === "remember" && (sig as any).args?.fact) {
                  toast.success(`Ezra remembered: ${(sig as any).args.fact}`);
                }
                continue;
              }
              if (sig.type === "scripture_artifact") {
                scriptureArtifact = (sig as any).data as ScriptureArtifactData;
                // Ensure an assistant message exists to attach to.
                if (!assistantSoFar) upsertAssistant("");
                attachMetaToLastAssistant();
                continue;
              }
              if (sig.type === "usage") {
                usageMeta = {
                  model: (sig as any).model,
                  latency_ms: (sig as any).latency_ms,
                  tokens: (sig as any).usage?.completion_tokens,
                };
                attachMetaToLastAssistant();
                continue;
              }

              // Legacy nexus_signal — restrict mitosis to UI_RESTRUCTURE only.
              onNexusSignal?.(sig);
              if (user && !lite && sig.action && sig.action !== "NONE") {
                supabase.from("nexus_logs").insert({
                  user_id: user.id, mode: "presence",
                  action_taken: sig.action || "NONE",
                  viz_payload: sig.viz_payload || null,
                } as any).then(() => {});
              }
              continue;
            }
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer; break;
          }
        }
      }
      // Final flush of meta in case usage arrived after content.
      attachMetaToLastAssistant();
    } catch (e: any) {
      if (e?.name === "AbortError") {
        aborted = true;
        if (assistantSoFar) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: m.content + "\n\n_— stopped —_", cancelled: true } : m);
            }
            return prev;
          });
        }
        toast.info("Response stopped");
      } else {
        console.error(e);
        toast.error("Failed to connect to Ezra");
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      setMessages((final) => {
        (async () => {
          const sid = await saveSession(final);
          if (sid && isFirstMessageOfSession && assistantSoFar && !aborted) {
            triggerAutoTitle(sid, firstUserText, assistantSoFar);
          }
        })();
        if (user && !lite && assistantSoFar && !aborted) {
          const lastUserMsg = [...final].reverse().find((m) => m.role === "user");
          supabase.from("prompt_history").insert({
            user_id: user.id, seed: lastUserMsg?.content || "",
            selected_stacks: [], mode: "creative", granularity: 50, output_openai: assistantSoFar,
          }).then(() => {});
        }
        if (userSeed && !lite && !aborted) {
          const assistantIdx = final.length - 1;
          runBenchmark(userSeed, assistantIdx);
        }
        return final;
      });
    }
  };

  const handleRegenerate = () => {
    if (isLoading || messages.length < 2) return;
    const withoutLast = messages.filter((_, i) => i !== messages.length - 1);
    setMessages(withoutLast);
    send(withoutLast);
  };

  const handleSendToBuild = (text: string) => {
    sessionStorage.setItem("prefill-seed", text);
    navigate("/app/sentient");
    toast.success("Prompt saved");
  };

  const handleEditMessage = async (index: number, newContent: string) => {
    if (index < 0 || index >= messages.length || isLoading) return;
    const tail = messages.slice(index);
    if (user && sessionId && tail.length > 0) {
      const label = `Edit at msg ${index + 1} · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      await supabase.from("session_branches" as any).insert({
        session_id: sessionId, user_id: user.id,
        parent_message_index: index, messages: tail as any, label,
      } as any);
      toast.success(`Previous branch saved · ${tail.length} message${tail.length === 1 ? "" : "s"}`);
    }
    const truncated = messages.slice(0, index);
    const newTail = [...truncated, { role: "user" as const, content: newContent }];
    setMessages(newTail);
    send(newTail);
  };

  const handleTogglePin = (index: number) => {
    setMessages((prev) => {
      const next = prev.map((m, i) => i === index ? { ...m, pinned: !m.pinned } : m);
      saveSession(next);
      return next;
    });
  };

  const handleUpdateArtifact = (next: string) => {
    if (!artifact) return;
    setMessages((prev) => {
      const updated = prev.map((m, i) => i === artifact.index ? { ...m, content: next } : m);
      saveSession(updated);
      return updated;
    });
  };

  const handleSlash = (action: SlashAction) => {
    if (action === "clear") { setMessages([]); toast.success("Cleared"); return; }
    if (action === "focus") { toggleFocus(); return; }
    if (action === "share") { setShareOpen(true); return; }
    if (action === "build") {
      const last = [...messages].reverse().find((m) => m.role === "assistant");
      if (last) handleSendToBuild(last.content); else toast.info("No response yet");
      return;
    }
    if (action === "save") {
      const last = [...messages].reverse().find((m) => m.role === "assistant");
      if (last) setTemplateContent(last.content); else toast.info("No response yet");
      return;
    }
    if (action === "research") { setInput((v) => v + " (research mode)"); textareaRef.current?.focus(); return; }
    if (action === "persona") { setInput((v) => v + " @persona:"); textareaRef.current?.focus(); return; }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setInput(v);
    if (v === "/") setSlashOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
  }, [input]);

  const toggleVoice = () => { if (isListening) stopVoice(); else startVoice(); };

  const cooldownRemaining = (() => {
    if (!benchPrefs.enabled) return 0;
    const elapsed = (Date.now() - lastBenchmarkAt) / 1000;
    return Math.max(0, Math.ceil(benchPrefs.cooldown_sec - elapsed));
  })();

  // Approx tokens for budget hint (chars/4)
  const approxTokens = Math.round(input.length / 4);
  const budgetHint = approxTokens > 2000 ? `~${(approxTokens / 1000).toFixed(1)}k tok` : null;

  const isEmpty = messages.length === 0;

  return (
    <div className={`flex flex-col h-full ${focus ? "max-w-3xl mx-auto w-full" : ""}`}>
      {/* Top inline toolbar */}
      {!lite && user && !isEmpty && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border/60 text-xs">
          <ModelPicker model={model} onChange={setModel} />
          <div className="flex-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={scriptureMode === "on" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 gap-1 tactile text-[11px]"
                onClick={() => setScriptureMode((m) => (m === "on" ? "off" : "on"))}
                aria-label="Toggle scripture grounding"
              >
                <BookOpen className="h-3 w-3" />
                Scripture: {scriptureMode === "on" ? "On" : "Off"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ground answers in Bible verses (per-turn). Shift+click for preferences.</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 tactile" onClick={() => setScriptureDialogOpen(true)} aria-label="Scripture preferences">
                <BookOpen className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Scripture preferences</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 tactile" onClick={() => setShareOpen(true)} aria-label="Share session">
                <Share2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share / export</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 tactile" onClick={toggleFocus} aria-label="Toggle focus mode">
                {focus ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Focus mode (⌘+.)</TooltipContent>
          </Tooltip>
        </div>
      )}

      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 workspace-vignette" aria-hidden />
          <div className="relative w-full max-w-2xl text-center mb-8 animate-fade-in">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight">
              Where should we begin?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Share your vision. Ezra will breathe with your workflow and co-create the perfect prompt.
            </p>
          </div>
          <div id="empty-composer-anchor" className="relative w-full max-w-2xl composer-glow rounded-2xl" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-5">
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            onSendToBuild={handleSendToBuild}
            onSaveAsTemplate={(text) => setTemplateContent(text)}
            onRegenerate={handleRegenerate}
            onEditMessage={handleEditMessage}
            onTogglePin={handleTogglePin}
            onOpenArtifact={(index, title) => setArtifact({ index, title })}
            sessionId={sessionId ?? null}
            onForceBenchmark={(idx) => {
              const lastUser = [...messages.slice(0, idx + 1)].reverse().find((m) => m.role === "user");
              if (lastUser) runBenchmark(lastUser.content, idx, true);
            }}
          />
          {messages.map((msg, i) =>
            msg.role === "assistant" && benchmarkResults.has(i) ? (
              <BenchmarkCard key={`bench-${i}`} result={benchmarkResults.get(i)!} />
            ) : null
          )}
          {isLoading && <NexusPulse state="processing" inline />}
          <div ref={bottomRef} />
        </div>
      )}


      <div className={`${isEmpty ? "pb-8 px-4" : "border-t border-border p-4"}`}>
        <div className={isEmpty ? "max-w-2xl mx-auto -mt-24 relative z-10 rounded-2xl border border-border bg-card/95 backdrop-blur-md composer-glow p-3" : ""}>
        {!lite && user && (
          <div className="flex items-center justify-between mb-2 text-[10px] text-muted-foreground">
            <span aria-live="polite">
              {benchPrefs.enabled
                ? cooldownRemaining > 0 ? `Benchmark cooldown: ${cooldownRemaining}s` : "Benchmark ready"
                : "Benchmark off"}
            </span>
            {benchPrefs.enabled && cooldownRemaining > 0 && (
              <div className="flex-1 mx-3 h-0.5 bg-muted rounded overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${(1 - cooldownRemaining / benchPrefs.cooldown_sec) * 100}%` }} />
              </div>
            )}
            <span className="flex items-center gap-2">
              {budgetHint && <span>{budgetHint}</span>}
              <span>{model.split("/").pop()}</span>
            </span>
          </div>
        )}
        <div className="relative">
          {ghostText && (
            <div className="absolute inset-0 pointer-events-none px-3 py-2 text-sm text-muted-foreground/40 italic overflow-hidden whitespace-nowrap text-ellipsis">
              {input}{ghostText}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 items-end">
            <SlashCommandPalette
              open={slashOpen}
              onOpenChange={setSlashOpen}
              onSelect={(a) => { setInput(""); handleSlash(a); }}
              anchor={<span className="absolute" />}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" size="icon" variant="ghost" className="shrink-0" onClick={() => setSlashOpen(true)} aria-label="Slash commands">
                  <Sparkles className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Slash commands (/)</TooltipContent>
            </Tooltip>

            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Share your vision — type / for commands… (Shift+Enter for new line)"
              className="flex-1 min-h-[42px] max-h-[150px] resize-none text-base md:text-sm"
              disabled={isLoading}
              rows={1}
              aria-label="Message Ezra"
            />

            {isSupported && voiceEnabled ? (
              <Button
                type="button" size="icon"
                variant={isListening ? "default" : "outline"}
                onClick={toggleVoice} disabled={isLoading}
                className={isListening ? "animate-pulse" : ""}
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" size="icon" variant="outline" disabled className="opacity-40" aria-label="Voice unavailable">
                    <Mic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Voice not supported in this browser</TooltipContent>
              </Tooltip>
            )}

            {isLoading ? (
              <Button type="button" size="icon" variant="destructive" onClick={handleStop}
                aria-label="Stop response" className="transition-all animate-pulse">
                <Square className="h-4 w-4 fill-current" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send message">
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
        </div>
        </div>
      </div>


      <SaveTemplateDialog open={!!templateContent} onOpenChange={(open) => !open && setTemplateContent(null)} content={templateContent || ""} />

      {artifact && (
        <ArtifactPanel
          open={!!artifact}
          onOpenChange={(open) => !open && setArtifact(null)}
          title={artifact.title}
          content={messages[artifact.index]?.content || ""}
          onSave={handleUpdateArtifact}
        />
      )}

      <ShareSessionDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        sessionId={sessionId || null}
        title={messages.find((m) => m.role === "user")?.content.slice(0, 60) || "Ezra Session"}
        messages={messages}
      />

      {!lite && user && (
        <ScripturePreferencesDialog
          open={scriptureDialogOpen}
          onOpenChange={(v) => { setScriptureDialogOpen(v); if (!v) dismissOnboarding(); }}
        />
      )}
    </div>
  );
}
