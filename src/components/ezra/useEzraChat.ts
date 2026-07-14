import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePowerLevel } from "@/hooks/usePowerLevel";
import { toast } from "sonner";
import { buildBibleContext } from "@/lib/bible/resolver";
import { useActiveCollection } from "@/lib/collections/useActiveCollection";
import { buildContextBlock } from "@/lib/collections/buildContextBlock";
import { tagArtifact } from "@/lib/collections/useCollections";
import { retrievalHistory, isSubstantiveQuery, windowTranscript } from "@/lib/rag/history";
import type { ScriptureArtifactData } from "@/components/sentient/ScriptureArtifact";
import type { CitationVerdict } from "@/lib/rag/types";
import type { PipelineState } from "./EzraPipelineIndicator";
import { computeDrainStep } from "./drain";
import { haptics } from "@/lib/haptics";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prompt-partner`;
const AUTOTITLE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-title`;

export type EzraMsgMeta = {
  model?: string;
  latency_ms?: number;
  tokens?: number;
  sources?: { title?: string; url: string; snippet?: string }[];
  images?: { url: string; alt?: string; source?: string }[];
  scripture_artifact?: ScriptureArtifactData;
  citation_verdict?: CitationVerdict;
  memory_summary?: string;
};

export type EzraMsg = {
  role: "user" | "assistant";
  content: string;
  cancelled?: boolean;
  meta?: EzraMsgMeta;
};

interface Options {
  sessionId: string | null;
  onSessionCreated?: (id: string) => void;
  scriptureMode?: "on" | "off";
  scripturePrefs?: any | null;
}


export function useEzraChat({ sessionId, onSessionCreated, scriptureMode = "off", scripturePrefs = null }: Options) {
  const { user } = useAuth();
  // The power dial drives both the model and the retrieval breadth; members
  // no longer pick a raw model name.
  const { model, topK } = usePowerLevel();
  const { collection: activeCollection } = useActiveCollection("mary");
  const [messages, setMessages] = useState<EzraMsg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // True only while switching *into* an existing session — the thread keeps
  // showing its previous content (or a skeleton, per the consumer) instead
  // of flashing the empty/starter state between the old messages clearing
  // and the new ones arriving.
  const [isHydrating, setIsHydrating] = useState(false);
  // Pipeline telemetry surfaced as staged UI copy — each transition below is
  // set at the moment the real work happens, never on a timer.
  const [pipeline, setPipeline] = useState<PipelineState>({ stage: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const autoTitledRef = useRef<Set<string>>(new Set());
  const [userContext, setUserContext] = useState<any>(null);
  const [memorySummary, setMemorySummary] = useState<string | null>(null);
  const [memoryFacts, setMemoryFacts] = useState<string[]>([]);

  // Load context
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profileRes, historyRes] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", user.id).single(),
        supabase
          .from("prompt_history")
          .select("seed, mode, selected_stacks")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      setUserContext({
        display_name: profileRes.data?.display_name,
        recent_projects: historyRes.data || [],
      });
    })();
  }, [user]);

  // Load session messages
  useEffect(() => {
    if (!sessionId || !user) {
      setMessages([]);
      setIsHydrating(false);
      setMemorySummary(null);
      setMemoryFacts([]);
      return;
    }
    let cancelled = false;
    setIsHydrating(true);
    (async () => {
      const { data } = await supabase
        .from("partner_sessions" as any)
        .select("messages")
        .eq("id", sessionId)
        .single();
      if (cancelled) return;
      if (data && Array.isArray((data as any).messages)) {
        setMessages((data as any).messages);
      }
      setIsHydrating(false);
    })();
    // Load session memory if it exists.
    supabase
      .from("session_memories" as any)
      .select("summary, facts")
      .eq("session_id", sessionId)
      .maybeSingle()
      .then(({ data: mem }) => {
        if (cancelled) return;
        if (mem) {
          setMemorySummary((mem as any).summary || null);
          setMemoryFacts(Array.isArray((mem as any).facts) ? (mem as any).facts : []);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, user]);

  const saveSession = useCallback(
    async (msgs: EzraMsg[]): Promise<string | null> => {
      if (!user || msgs.length === 0) return null;
      const fallbackTitle =
        msgs.find((m) => m.role === "user")?.content.slice(0, 60) || "Untitled Session";
      if (sessionId) {
        await supabase
          .from("partner_sessions" as any)
          .update({ messages: msgs as any } as any)
          .eq("id", sessionId);
        return sessionId;
      }
      const { data } = await supabase
        .from("partner_sessions" as any)
        .insert({ user_id: user.id, messages: msgs as any, title: fallbackTitle } as any)
        .select("id")
        .single();
      if (data) {
        onSessionCreated?.((data as any).id);
        return (data as any).id;
      }
      return null;
    },
    [user, sessionId, onSessionCreated],
  );

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
        body: JSON.stringify({
          session_id: sid,
          first_user_msg: userMsg,
          first_assistant_msg: assistantMsg,
        }),
      });
    } catch {
      /* non-critical */
    }
  }, []);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const send = useCallback(
    async (textOrOverride: string | EzraMsg[]) => {
      const allMessages: EzraMsg[] = Array.isArray(textOrOverride)
        ? textOrOverride
        : [...messages, { role: "user", content: textOrOverride.trim() }];
      if (!Array.isArray(textOrOverride) && !textOrOverride.trim()) return;
      if (isLoading) return;

      haptics.tap();
      if (!Array.isArray(textOrOverride)) setMessages(allMessages);
      setIsLoading(true);
      setPipeline({ stage: "preparing" });

      let assistantSoFar = "";   // full text received from server
      let assistantVisible = "";  // text currently shown (typewriter)
      let aborted = false;
      let streamErrored = false; // in-stream __nexus error (stream_first path)
      let usageMeta: { model?: string; latency_ms?: number; tokens?: number } = {};
      const isFirstMessageOfSession =
        !sessionId && allMessages.filter((m) => m.role === "user").length === 1;
      const firstUserText = allMessages.find((m) => m.role === "user")?.content || "";
      const controller = new AbortController();
      abortRef.current = controller;

      // Typewriter pacing — drains chars from assistantSoFar into the visible message.
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      let rafId: number | null = null;
      let lastTick = 0;
      let punctHold = 0; // ticks to skip after sentence punctuation
      // Once the stream itself has finished, any remaining backlog is only
      // a rendering lag, not new content to savor — the drain accelerates
      // to land the last of it within CATCHUP_MS instead of trickling out
      // at reading speed (or, previously, snapping instantly).
      let streamEnded = false;
      let catchupDeadline = 0;
      const CATCHUP_MS = 400;

      const writeVisible = (text: string) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: text } : m,
            );
          }
          return [...prev, { role: "assistant", content: text }];
        });
      };

      const drainLoop = (ts: number) => {
        if (!lastTick) lastTick = ts;
        const dt = ts - lastTick;
        const interval = 22; // ms per tick → ~45 cps baseline
        if (dt >= interval) {
          lastTick = ts;
          if (punctHold > 0 && !streamEnded) {
            // Punctuation holds are a reading-rhythm cue for live text —
            // once the stream is over there's nothing left to pace against,
            // so skip straight to the catch-up drain below.
            punctHold -= 1;
          } else if (assistantVisible.length < assistantSoFar.length) {
            const behind = assistantSoFar.length - assistantVisible.length;
            const step = computeDrainStep({
              behind,
              streamEnded,
              msUntilDeadline: catchupDeadline - ts,
              intervalMs: interval,
            });
            const nextLen = Math.min(assistantSoFar.length, assistantVisible.length + step);
            assistantVisible = assistantSoFar.slice(0, nextLen);
            writeVisible(assistantVisible);
            if (!streamEnded) {
              const tail = assistantVisible.slice(-2);
              const lastChar = tail.slice(-1);
              if (lastChar === "." || lastChar === "!" || lastChar === "?") punctHold = 4;
              else if (tail === "\n\n") punctHold = 3;
              else if (lastChar === "," || lastChar === ";") punctHold = 1;
            }
          }
        }
        if (!aborted) rafId = requestAnimationFrame(drainLoop);
      };
      if (!reduceMotion) rafId = requestAnimationFrame(drainLoop);

      const flushVisible = () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
        if (assistantVisible !== assistantSoFar) {
          assistantVisible = assistantSoFar;
          writeVisible(assistantVisible);
        }
      };

      // Called once the network stream is fully read. Rather than snapping
      // straight to the final text, gives the drain loop one bounded
      // CATCHUP_MS window to visibly finish the reveal, then flushes as a
      // safety net for whatever rounding gap remains.
      const drainToCompletion = () =>
        new Promise<void>((resolve) => {
          if (reduceMotion || assistantVisible.length >= assistantSoFar.length) {
            flushVisible();
            resolve();
            return;
          }
          streamEnded = true;
          catchupDeadline = performance.now() + CATCHUP_MS;
          const check = () => {
            if (assistantVisible.length >= assistantSoFar.length || aborted) {
              flushVisible();
              resolve();
            } else {
              requestAnimationFrame(check);
            }
          };
          requestAnimationFrame(check);
        });

      let scriptureArtifact: ScriptureArtifactData | null = null;
      let bibleContextPayload: any | null = null;
      let collectionContext: string | null = null;
      let collectionName: string | null = null;
      let ragChunks: { id: string; item_id: string; item_title: string | null; content: string; source: string }[] | null = null;
      let ragRewritten: string | null = null;

      // Single session fetch for the whole turn — this used to run twice
      // (once for RAG, once for the chat call), adding a redundant network
      // round trip before the model ever saw the request.
      const { data: sessData } = await supabase.auth.getSession();
      const authToken = sessData.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const lastUser = [...allMessages].reverse().find((m) => m.role === "user")?.content?.trim() || "";

      // Scripture resolution, collection context, and RAG retrieval are
      // mutually independent — they used to run one after another even
      // though nothing downstream depends on their relative order. Racing
      // them cuts up to two full round trips off the critical path.
      const scripturePromise = (async () => {
        if (scriptureMode !== "on" || !scripturePrefs) return;
        setPipeline({ stage: "scripture" });
        try {
          const ctx = await buildBibleContext(lastUser, scripturePrefs as any);
          if (ctx && Array.isArray((ctx as any).verses) && (ctx as any).verses.length > 0) {
            bibleContextPayload = ctx;
          }
        } catch (e) {
          console.warn("[ezra bible_context] build error", e);
        }
      })();

      const collectionPromise = (async () => {
        if (!activeCollection) return;
        setPipeline({ stage: "collection", detail: activeCollection.name });
        try {
          const built = await buildContextBlock(activeCollection.id);
          if (built && built.includedItems.length > 0) {
            collectionContext = built.contextBlock;
            collectionName = built.collectionName;
          }
        } catch (e) {
          console.warn("[ezra collection_context] build error", e);
        }
      })();

      const ragPromise = (async () => {
        if (!activeCollection || !isSubstantiveQuery(lastUser)) return;
        setPipeline({ stage: "retrieving", detail: activeCollection.name });
        try {
          const history = retrievalHistory(allMessages);
          const ragResp = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-retrieve`,
            {
              method: "POST",
              signal: controller.signal,
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
              body: JSON.stringify({
                query: lastUser,
                collection_id: activeCollection.id,
                top_k: topK,
                history,
                history_summary: memorySummary || undefined,
              }),
            },
          );
          if (ragResp.ok) {
            const j = await ragResp.json();
            if (Array.isArray(j.chunks) && j.chunks.length > 0) {
              ragChunks = j.chunks;
              ragRewritten = j.rewritten_query ?? null;
              const n = j.chunks.length;
              setPipeline({ stage: "found", detail: `${n} passage${n === 1 ? "" : "s"}` });
            }
          }
        } catch (e) {
          console.warn("[ezra rag-retrieve] failed", e);
        }
      })();

      await Promise.all([scripturePromise, collectionPromise, ragPromise]);

      try {
        setPipeline({ stage: "connecting" });
        const { kept: windowedMessages } = windowTranscript(allMessages);
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            messages: windowedMessages.map((m) => ({ role: m.role, content: m.content })),
            user_context: userContext,
            lite: false,
            mode: "presence",
            model,
            bible_context: bibleContextPayload,
            scripture_prefs: bibleContextPayload ? scripturePrefs : undefined,
            collection_context: collectionContext,
            collection_name: collectionName,
            rag_chunks: ragChunks,
            rag_rewritten_query: ragRewritten,
            memory_summary: memorySummary || undefined,
            memory_facts: memoryFacts.length > 0 ? memoryFacts : undefined,
            // Server returns the SSE envelope BEFORE its internal agent-tool
            // rounds run, emitting tool_status progress events instead of
            // leaving this fetch hanging through 1-2 non-streamed LLM calls.
            // Gateway failures after that point arrive as in-stream
            // __nexus error events (handled below) rather than HTTP statuses.
            stream_first: true,
          }),
        });


        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Unknown error" }));
          toast.error(err.error || `Error ${resp.status}`);
          setIsLoading(false);
          return;
        }
        if (!resp.body) throw new Error("No response body");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";

        const upsertAssistant = (chunk: string) => {
          if (assistantSoFar.length === 0) setPipeline({ stage: "streaming" });
          assistantSoFar += chunk;
          if (reduceMotion) {
            assistantVisible = assistantSoFar;
            writeVisible(assistantVisible);
          } else if (assistantVisible.length === 0) {
            // Seed an empty assistant bubble so the trace flips to streaming view.
            writeVisible("");
          }
        };


        const attachMeta = () => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role !== "assistant") return prev;
            const meta: EzraMsgMeta = {
              ...(last.meta || {}),
              ...usageMeta,
              ...(scriptureArtifact ? { scripture_artifact: scriptureArtifact } : {}),
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
                const sig = parsed.__nexus;
                if (sig.type === "usage") {
                  usageMeta = {
                    model: sig.model,
                    latency_ms: sig.latency_ms,
                    tokens: sig.usage?.completion_tokens,
                    ...(memorySummary ? { memory_summary: memorySummary } : {}),
                  };
                  attachMeta();
                } else if (sig.type === "scripture_artifact") {
                  scriptureArtifact = (sig as any).data as ScriptureArtifactData;
                  attachMeta();
                } else if (sig.type === "tool_status") {
                  // stream_first: the server is running its pre-answer
                  // agent-tool rounds. Real progress, not a spinner phrase.
                  setPipeline({ stage: "tools" });
                } else if (sig.type === "error") {
                  // stream_first: headers were already sent, so gateway
                  // failures arrive in-stream. Same copy as the legacy
                  // HTTP-status toasts.
                  streamErrored = true;
                  toast.error(
                    sig.code === 429 ? "Rate limited"
                      : sig.code === 402 ? "Credits exhausted"
                      : "AI gateway error",
                  );
                }
                continue;
              }

              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) upsertAssistant(content);
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }
        await drainToCompletion();
        attachMeta();
        if (assistantSoFar && !streamErrored) haptics.turnComplete();
      } catch (e: any) {
        if (e?.name === "AbortError") {
          aborted = true;
          flushVisible();
          if (assistantSoFar) {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1
                    ? { ...m, content: m.content + "\n\n_— stopped —_", cancelled: true }
                    : m,
                );
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
        flushVisible();
        setIsLoading(false);
        setPipeline({ stage: "idle" });
        abortRef.current = null;
        setMessages((final) => {
          (async () => {
            const sid = await saveSession(final);
            if (sid && isFirstMessageOfSession && assistantSoFar && !aborted) {
              triggerAutoTitle(sid, firstUserText, assistantSoFar);
            }
            // History entry carries the session id so "Continue in Ezra"
            // reopens this conversation instead of seeding a fresh one.
            if (user && assistantSoFar && !aborted) {
              const lastUserMsg = [...final].reverse().find((m) => m.role === "user");
              supabase
                .from("prompt_history")
                .insert({
                  user_id: user.id,
                  seed: lastUserMsg?.content || "",
                  selected_stacks: [],
                  mode: "creative",
                  granularity: 50,
                  output_openai: assistantSoFar,
                  session_id: sid ?? null,
                } as any)
                .then(() => {});
            }
            // Fire-and-forget session memory update.
            if (sid && !aborted) {
              fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/session-memory`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
                body: JSON.stringify({ session_id: sid }),
              }).then((r) => r.ok ? r.json() : null).then((j) => {
                if (j?.summary) setMemorySummary(j.summary);
                if (Array.isArray(j?.facts)) setMemoryFacts(j.facts);
              }).catch(() => {});
            }
            // Verify citations if RAG chunks were used.
            if (sid && ragChunks && ragChunks.length > 0 && assistantSoFar && !aborted) {
              fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-citations`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
                body: JSON.stringify({
                  response: assistantSoFar.slice(0, 8000),
                  sources: ragChunks.map((c) => ({ content: c.content, chunk_index: 0 })),
                }),
              }).then((r) => r.ok ? r.json() : null).then((j) => {
                if (j?.verdict) {
                  setMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (last?.role !== "assistant") return prev;
                    return prev.map((m, i) =>
                      i === prev.length - 1
                        ? { ...m, meta: { ...m.meta, citation_verdict: j.verdict as CitationVerdict } }
                        : m,
                    );
                  });
                }
              }).catch(() => {});
            }
            // Tag this Ezra session to the active collection (idempotent upsert).
            if (sid && activeCollection && user && assistantSoFar && !aborted) {
              tagArtifact({
                collectionId: activeCollection.id,
                userId: user.id,
                artifactType: "mary_session",
                artifactId: sid,
                previewTitle: firstUserText.slice(0, 80) || "Ezra session",
                previewSnippet: assistantSoFar.slice(0, 200),
              }).catch(() => {});
            }
          })();
          return final;
        });
      }
    },
    [messages, isLoading, sessionId, userContext, model, topK, user, saveSession, triggerAutoTitle, scriptureMode, scripturePrefs, activeCollection],
  );

  const regenerate = useCallback(() => {
    if (isLoading || messages.length < 2) return;
    const withoutLast = messages.filter((_, i) => i !== messages.length - 1);
    setMessages(withoutLast);
    send(withoutLast);
  }, [isLoading, messages, send]);

  // Editing an earlier user turn discards it and everything after it, then
  // resends from that point — the same "fix a bad prompt" flow ChatGPT and
  // Claude's own mobile clients support, which this thread was missing.
  const editAndResend = useCallback(
    (index: number, newText: string) => {
      if (isLoading) return;
      const trimmed = newText.trim();
      if (!trimmed) return;
      const updated: EzraMsg[] = [...messages.slice(0, index), { role: "user", content: trimmed }];
      setMessages(updated);
      send(updated);
    },
    [isLoading, messages, send],
  );

  const reset = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, isHydrating, pipeline, send, stop, regenerate, editAndResend, reset };
}
