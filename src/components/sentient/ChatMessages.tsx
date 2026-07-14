import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QuickExport } from "@/components/QuickExport";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, BookmarkPlus, RefreshCw, Pencil, Check, X, Activity, Pin, FileText, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { detectArtifact } from "./ArtifactPanel";
import { InlineDocumentCard } from "@/components/write/InlineDocumentCard";
import { ScriptureArtifact, type ScriptureArtifactData } from "./ScriptureArtifact";
import { toast } from "sonner";

export type MsgMeta = {
  model?: string;
  latency_ms?: number;
  tokens?: number;
  tools?: { name: string; args?: any; result?: any }[];
  scripture_artifact?: ScriptureArtifactData;
};
export type Msg = {
  role: "user" | "assistant";
  content: string;
  cancelled?: boolean;
  pinned?: boolean;
  meta?: MsgMeta;
};

interface ChatMessagesProps {
  messages: Msg[];
  isLoading: boolean;
  onSendToBuild: (text: string) => void;
  onSaveAsTemplate: (text: string) => void;
  onRegenerate: () => void;
  onEditMessage?: (index: number, newContent: string) => void;
  onForceBenchmark?: (index: number) => void;
  onTogglePin?: (index: number) => void;
  onOpenArtifact?: (index: number, title: string) => void;
  sessionId?: string | null;
}

function NucleusAvatar() {
  return (
    <div className="shrink-0 w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center mb-1 overflow-hidden">
      <svg viewBox="0 0 28 28" className="w-5 h-5" aria-hidden="true">
        <defs>
          <radialGradient id="avatar-bio-grad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="hsl(35 100% 60%)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(18 100% 50%)" stopOpacity="0.3" />
          </radialGradient>
        </defs>
        <path d="M14,3 C19,2 25,7 24,14 C23,21 18,26 13,25 C8,24 2,19 4,13 C6,7 9,4 14,3Z" fill="url(#avatar-bio-grad)" />
      </svg>
    </div>
  );
}

function ToolChips({ tools }: { tools: NonNullable<MsgMeta["tools"]> }) {
  if (!tools?.length) return null;
  return (
    <div className="mb-1.5 flex flex-wrap gap-1">
      {tools.map((t, i) => {
        const count = Array.isArray(t.result?.matches) ? t.result.matches.length : null;
        const label =
          t.name === "search_knowledge_base" ? `🔎 KB: "${t.args?.query?.slice(0, 28) || ""}"${count != null ? ` · ${count}` : ""}` :
          t.name === "lookup_past_prompts"  ? `📜 Past: "${t.args?.query?.slice(0, 28) || ""}"${count != null ? ` · ${count}` : ""}` :
          t.name === "remember"             ? `🧠 Remembered: ${t.args?.fact?.slice(0, 40) || ""}` :
          t.name === "plan"                 ? `🗺️ Plan: ${t.args?.steps?.length || 0} steps` :
          t.name;
        return (
          <span key={i} className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] text-primary">
            {label}
          </span>
        );
      })}
    </div>
  );
}

function MetaBadge({ meta }: { meta?: MsgMeta }) {
  if (!meta) return null;
  const bits: string[] = [];
  if (meta.model) bits.push(meta.model.split("/").pop() || meta.model);
  if (meta.latency_ms) bits.push(`${(meta.latency_ms / 1000).toFixed(1)}s`);
  if (meta.tokens) bits.push(`${meta.tokens} tok`);
  if (!bits.length) return null;
  return <div className="mt-1 text-[10px] text-muted-foreground/70">{bits.join(" · ")}</div>;
}

export function ChatMessages({
  messages, isLoading,
  onSendToBuild, onSaveAsTemplate, onRegenerate,
  onEditMessage, onForceBenchmark, onTogglePin, onOpenArtifact, sessionId,
}: ChatMessagesProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const startEdit = (i: number, content: string) => { setEditingIndex(i); setEditText(content); };
  const commitEdit = () => {
    if (editingIndex !== null && editText.trim() && onEditMessage) onEditMessage(editingIndex, editText.trim());
    setEditingIndex(null);
  };
  const cancelEdit = () => setEditingIndex(null);
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };

  return (
    <>
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1;
        const isAssistant = msg.role === "assistant";
        const isUser = msg.role === "user";
        const isEditing = editingIndex === i;
        const artifact = isAssistant ? detectArtifact(msg.content) : null;

        return (
          <div key={i} className={`flex items-start gap-2 ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
            {isAssistant && <NucleusAvatar />}

            <div className={`group relative text-sm ${
              isUser
                ? "max-w-[78%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm"
                : "max-w-[92%] text-foreground"
            } ${msg.pinned ? (isUser ? "ring-1 ring-accent/60" : "") : ""}`}>

              {msg.pinned && (
                <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-0.5 shadow" title="Pinned to context">
                  <Pin className="h-2.5 w-2.5 fill-current" />
                </div>
              )}

              {isAssistant ? (
                <div>
                  {msg.meta?.tools && <ToolChips tools={msg.meta.tools} />}

                  {msg.meta?.scripture_artifact ? (
                    <div className="rounded-2xl border border-border bg-card/60 p-4">
                      <ScriptureArtifact data={msg.meta.scripture_artifact} />
                    </div>
                  ) : artifact?.isArtifact ? (
                    <div className="space-y-2">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {!isLoading && (
                        <InlineDocumentCard
                          initialMarkdown={msg.content}
                          initialTitle={artifact.title}
                          sessionId={sessionId ?? null}
                          messageIndex={i}
                          messageKey={`${sessionId ?? "tmp"}:${i}`}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}

                  <MetaBadge meta={msg.meta} />


                  {msg.content.length > 50 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                      <QuickExport promptText={msg.content} />
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-6" onClick={() => copyToClipboard(msg.content)} aria-label="Copy text">
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-6" onClick={() => onSendToBuild(msg.content)} aria-label="Send to Build">
                        <ArrowRight className="h-3 w-3" /> Build
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs h-6" onClick={() => onSaveAsTemplate(msg.content)} aria-label="Save as template">
                        <BookmarkPlus className="h-3 w-3" /> Save
                      </Button>
                      {onTogglePin && (
                        <Button variant="outline" size="sm" className={`gap-1.5 text-xs h-6 ${msg.pinned ? "bg-primary/15" : ""}`} onClick={() => onTogglePin(i)} aria-label={msg.pinned ? "Unpin from context" : "Pin to context"}>
                          <Pin className="h-3 w-3" /> {msg.pinned ? "Unpin" : "Pin"}
                        </Button>
                      )}
                      {onForceBenchmark && (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-6" onClick={() => onForceBenchmark(i)} aria-label="Run benchmark now">
                          <Activity className="h-3 w-3" /> Benchmark
                        </Button>
                      )}
                      {isLast && !isLoading && (
                        <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-6" onClick={onRegenerate} aria-label="Regenerate response">
                          <RefreshCw className="h-3 w-3" /> Regen
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : isEditing ? (
                <div className="flex flex-col gap-2 min-w-[260px]">
                  <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="text-sm text-foreground bg-background min-h-[60px]" autoFocus aria-label="Edit message" />
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs" onClick={cancelEdit} aria-label="Cancel edit"><X className="h-3 w-3" /> Cancel</Button>
                    <Button size="sm" variant="default" className="h-6 gap-1 text-xs" onClick={commitEdit} aria-label="Save edit"><Check className="h-3 w-3" /> Save & Regen</Button>
                  </div>
                </div>
              ) : (
                <>
                  <span>{msg.content}</span>
                  {onEditMessage && !isLoading && (
                    <button
                      type="button"
                      onClick={() => startEdit(i, msg.content)}
                      className="absolute -left-7 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted border border-border opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      aria-label="Edit message"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </>
              )}
            </div>

            {isUser && (
              <div className="shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary mb-1" aria-hidden="true">U</div>
            )}
          </div>
        );
      })}
    </>
  );
}
