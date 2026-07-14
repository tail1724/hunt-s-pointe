import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { SentientPulse } from "./SentientPulse";
import { ChatMessages, type Msg } from "./ChatMessages";
import { SaveTemplateDialog } from "./SaveTemplateDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prompt-partner`;

interface PartnerChatProps {
  lite?: boolean;
  onTurnLimitReached?: () => void;
  sessionId?: string | null;
  onSessionCreated?: (id: string) => void;
  injectedText?: string;
  onInjectedTextConsumed?: () => void;
}

export function PartnerChat({
  lite = false,
  onTurnLimitReached,
  sessionId,
  onSessionCreated,
  injectedText,
  onInjectedTextConsumed,
}: PartnerChatProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState<any>(null);
  const [userTurns, setUserTurns] = useState(0);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle injected text from research panel
  useEffect(() => {
    if (injectedText) {
      setInput((prev) => (prev ? prev + "\n\n" + injectedText : injectedText));
      onInjectedTextConsumed?.();
      textareaRef.current?.focus();
    }
  }, [injectedText, onInjectedTextConsumed]);

  // Load session on mount
  useEffect(() => {
    if (!sessionId || !user) return;
    (async () => {
      const { data } = await supabase
        .from("partner_sessions" as any)
        .select("messages")
        .eq("id", sessionId)
        .single();
      if (data && Array.isArray((data as any).messages)) {
        setMessages((data as any).messages);
      }
    })();
  }, [sessionId, user]);

  // Fetch user context
  useEffect(() => {
    if (!user || lite) return;
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
  }, [user, lite]);

  // Save session after each assistant response
  const saveSession = useCallback(
    async (msgs: Msg[]) => {
      if (!user || lite || msgs.length === 0) return;
      const title = msgs.find((m) => m.role === "user")?.content.slice(0, 60) || "Untitled Session";

      if (sessionId) {
        await supabase
          .from("partner_sessions" as any)
          .update({ messages: msgs as any, title } as any)
          .eq("id", sessionId);
      } else {
        const { data } = await supabase
          .from("partner_sessions" as any)
          .insert({ user_id: user.id, messages: msgs as any, title } as any)
          .select("id")
          .single();
        if (data) onSessionCreated?.((data as any).id);
      }
    },
    [user, lite, sessionId, onSessionCreated]
  );

  const send = async (overrideMessages?: Msg[]) => {
    const allMessages = overrideMessages || [...messages, { role: "user" as const, content: input.trim() }];
    const text = overrideMessages ? "" : input.trim();

    if (!overrideMessages) {
      if (!text || isLoading) return;
      if (lite && userTurns >= 2) {
        onTurnLimitReached?.();
        return;
      }
      setInput("");
      setMessages(allMessages);
      setUserTurns((t) => t + 1);
    }

    setIsLoading(true);

    if (user && !lite && !overrideMessages) {
      supabase
        .from("usage_logs" as any)
        .insert({ user_id: user.id, event_type: "partner_message", metadata: { turn: userTurns + 1 } })
        .then(() => {});
    }

    let assistantSoFar = "";

    try {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
          user_context: lite ? undefined : userContext,
          lite,
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
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
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
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to connect to Context Engine");
    } finally {
      setIsLoading(false);
      // Save session and log to prompt_history
      setMessages((final) => {
        saveSession(final);
        // Log to prompt_history for visibility in History page
        if (user && !lite && assistantSoFar) {
          const lastUserMsg = [...final].reverse().find((m) => m.role === "user");
          supabase.from("prompt_history").insert({
            user_id: user.id,
            seed: lastUserMsg?.content || "",
            selected_stacks: [],
            mode: "creative",
            granularity: 50,
            output_openai: assistantSoFar,
          }).then(() => {});
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
  }, [input]);

  return (
    <div className="flex flex-col h-[60vh] md:h-[65vh]">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          onSendToBuild={handleSendToBuild}
          onSaveAsTemplate={(text) => setTemplateContent(text)}
          onRegenerate={handleRegenerate}
        />
        {isLoading && <SentientPulse />}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2 items-end"
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your creative vision… (Shift+Enter for new line)"
            className="flex-1 min-h-[42px] max-h-[150px] resize-none text-base md:text-sm"
            disabled={isLoading}
            rows={1}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <SaveTemplateDialog
        open={!!templateContent}
        onOpenChange={(open) => !open && setTemplateContent(null)}
        content={templateContent || ""}
      />
    </div>
  );
}
