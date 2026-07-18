import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  Brain,
  ChevronDown,
  Copy,
  FileText,
  Pencil,
  PenLine,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { InlineDocumentCard } from "@/components/write/InlineDocumentCard";
import { PressRoomImageOffer } from "./PressRoomImageOffer";
import { PressRoomSourcesTabs } from "./PressRoomSourcesTabs";
import { PressRoomMarkdown } from "./PressRoomMarkdown";
import { PressRoomPipelineIndicator, type PipelineState } from "./PressRoomPipelineIndicator";
import { ScriptureArtifact } from "@/components/sentient/ScriptureArtifact";
import { parsePressRoomMessage } from "@/lib/parse-pressroom-message";
import { cn } from "@/lib/utils";
import type { PressRoomMsg } from "./usePressRoomChat";

interface Props {
  messages: PressRoomMsg[];
  isLoading: boolean;
  pipeline: PipelineState;
  sessionId: string | null;
  onRegenerate: () => void;
  onEditAndResend?: (index: number, text: string) => void;
}

/** How close to the bottom (px) still counts as "reading the latest". */
const FOLLOW_THRESHOLD = 120;

/** Answers longer than this collapse into a document artifact with a preview. */
const LONG_ANSWER_THRESHOLD = 1400;
/** Roughly how much of the answer stays visible as the in-chat preview. */
const INTRO_TARGET = 320;

/**
 * Splits a long, delimiter-less answer into a short conversational intro and
 * a document body, so walls of text present as an artifact card instead of
 * filling the thread. Returns null when the answer is short enough to read
 * comfortably inline.
 */
function splitLongAnswer(md: string): { intro: string; body: string; title: string } | null {
  if (md.length < LONG_ANSWER_THRESHOLD) return null;
  const paras = md.split(/\n{2,}/);
  let intro = "";
  let i = 0;
  while (i < paras.length && intro.length < INTRO_TARGET) {
    // A heading marks the start of the document body — keep it out of the intro.
    if (intro && /^#{1,4}\s/.test(paras[i])) break;
    intro += (intro ? "\n\n" : "") + paras[i];
    i++;
  }
  const body = paras.slice(i).join("\n\n").trim();
  if (body.length < 600) return null;
  const headingLine =
    body.split("\n").find((l) => /^#{1,4}\s+/.test(l)) ||
    md.split("\n").find((l) => /^#{1,4}\s+/.test(l));
  const boldLine = body.split("\n").find((l) => /^\*\*[^*]+\*\*:?\s*$/.test(l.trim()));
  const title =
    headingLine?.replace(/^#+\s*/, "").trim() ||
    boldLine?.trim().replace(/^\*\*/, "").replace(/\*\*:?\s*$/, "").trim() ||
    "Study notes";
  return { intro, body, title };
}

export function PressRoomThread({ messages, isLoading, pipeline, sessionId, onRegenerate, onEditAndResend }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const [showJump, setShowJump] = useState(false);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_THRESHOLD;
    followRef.current = near;
    setShowJump(!near);
  }, []);

  // Follow the stream by pinning to the bottom — at most one scroll write per
  // frame, no smooth-scroll animation per token, and never when the reader
  // has scrolled up to re-read something.
  useEffect(() => {
    if (!followRef.current || rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (followRef.current) {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }
    });
  }, [messages, isLoading, pipeline.stage]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // A new turn always snaps the reader back to the latest exchange.
  const turnCount = messages.length;
  useEffect(() => {
    followRef.current = true;
    setShowJump(false);
    scrollToBottom();
  }, [turnCount, scrollToBottom]);

  const last = messages[messages.length - 1];
  const showIndicator =
    isLoading && (last?.role === "user" || (last?.role === "assistant" && last.content.length === 0));

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="pressroom-scroll-hidden h-full overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto w-full max-w-3xl space-y-7 px-4 pb-6 pt-8">
          {messages.map((msg, i) =>
            msg.role === "user" ? (
              <div key={i} className="pressroom-msg-cell">
                <UserMessage
                  content={msg.content}
                  index={i}
                  isLoading={isLoading}
                  onEditAndResend={onEditAndResend}
                />
              </div>
            ) : (
              <div key={i} className="pressroom-msg-cell space-y-3">
                <AssistantMessage
                  msg={msg}
                  index={i}
                  isLast={i === messages.length - 1}
                  isLoading={isLoading}
                  sessionId={sessionId}
                  onRegenerate={onRegenerate}
                />
                {/* Per-turn image offer — every completed answer invites (never
                    forces) turning the study into a designed image. */}
                {i === messages.length - 1 && !isLoading && msg.content.length > 0 && (
                  <PressRoomImageOffer
                    key={`img-${i}`}
                    userPrompt={messages[i - 1]?.role === "user" ? messages[i - 1].content : ""}
                    assistantText={msg.content}
                  />
                )}
              </div>
            ),
          )}

          {showIndicator && <PressRoomPipelineIndicator state={pipeline} />}
        </div>
      </div>

      {showJump && (
        <button
          type="button"
          onClick={() => {
            followRef.current = true;
            setShowJump(false);
            scrollToBottom(true);
          }}
          className="pressroom-tactile absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[var(--pressroom-border)] bg-[var(--pressroom-panel)]/95 px-3 py-1.5 text-xs font-medium text-[var(--pressroom-fg)] shadow-lg backdrop-blur"
          aria-label="Jump to latest message"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          Latest
        </button>
      )}
    </div>
  );
}

/**
 * A user turn, with an edit affordance — the one gap this thread had versus
 * ChatGPT/Claude's own mobile clients: no way to fix a bad prompt without
 * typing a whole new follow-up. Editing truncates everything from this
 * point forward and resends, matching that same-app convention.
 */
const UserMessage = memo(function UserMessage({
  content,
  index,
  isLoading,
  onEditAndResend,
}: {
  content: string;
  index: number;
  isLoading: boolean;
  onEditAndResend?: (index: number, text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  const cancel = useCallback(() => {
    setDraft(content);
    setEditing(false);
  }, [content]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onEditAndResend?.(index, trimmed);
    setEditing(false);
  }, [draft, index, onEditAndResend]);

  if (editing) {
    return (
      <div className="flex justify-end">
        <div className="pressroom-msg-enter w-full max-w-[85%] space-y-2 rounded-2xl border border-[var(--pressroom-active-border)] bg-[var(--pressroom-composer-bg)] p-3">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") cancel();
            }}
            rows={Math.min(8, Math.max(2, draft.split("\n").length))}
            aria-label="Edit message"
            className="w-full resize-none bg-transparent text-base md:text-sm leading-relaxed text-[var(--pressroom-fg)] outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancel}
              className="pressroom-tactile rounded-full px-3 py-1.5 text-xs font-medium text-[var(--pressroom-fg-muted)] hover:bg-[var(--pressroom-hover-bg)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commit}
              disabled={!draft.trim()}
              className="pressroom-tactile rounded-full bg-[var(--pressroom-accent)] px-3 py-1.5 text-xs font-medium text-[var(--pressroom-accent-fg)] disabled:opacity-50"
            >
              Save &amp; resend
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start justify-end gap-1.5">
      {onEditAndResend && !isLoading && (
        <button
          type="button"
          onClick={() => {
            setDraft(content);
            setEditing(true);
          }}
          aria-label="Edit message"
          className="pressroom-tactile mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--pressroom-fg-muted)] opacity-100 hover:bg-[var(--pressroom-hover-bg)] hover:text-[var(--pressroom-fg)] md:opacity-0 md:group-hover:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="pressroom-msg-enter max-w-[80%] rounded-2xl bg-[var(--pressroom-accent)] px-4 py-2.5 text-sm text-[var(--pressroom-accent-fg)] shadow-[0_1px_2px_hsl(222_43%_8%/0.4)]">
        {content}
      </div>
    </div>
  );
});

/**
 * One assistant turn. Memoized so streaming updates re-render only the row
 * whose message object actually changed — historical turns keep their
 * reference and skip both the re-render and the markdown re-parse.
 *
 * onRegenerate is deliberately excluded from the comparison: its identity
 * changes on every streamed token (it closes over `messages`), which would
 * defeat the memo. It's only clickable on the last row after loading ends,
 * by which point that row has re-rendered with the fresh closure.
 */
const AssistantMessage = memo(function AssistantMessage({
  msg,
  index,
  isLast,
  isLoading,
  sessionId,
  onRegenerate,
}: {
  msg: PressRoomMsg;
  index: number;
  isLast: boolean;
  isLoading: boolean;
  sessionId: string | null;
  onRegenerate: () => void;
}) {
  const navigate = useNavigate();
  const [readInChat, setReadInChat] = useState(false);
  const streaming = isLoading && isLast;

  const parsed = parsePressRoomMessage(msg.content);
  const showFollowup = !!parsed.followup && !isLoading;

  // While streaming, hold back any unfinished <<<…>>> block so the reader
  // never sees raw delimiters scroll past; show a drafting skeleton instead.
  let preface = parsed.preface;
  let draftPending = false;
  if (streaming && preface.includes("<<<")) {
    const cut = preface.indexOf("<<<");
    draftPending = preface.slice(cut).startsWith("<<<DRAFT");
    preface = preface.slice(0, cut).trimEnd();
  }
  const showDraftSkeleton = streaming && (draftPending || !!parsed.draft);

  // Long delimiter-less answers present as a document artifact too: a short
  // conversational intro stays in the thread, the body becomes a card the
  // reader can open in Write or expand right here in the conversation.
  const longSplit = !streaming && !parsed.draft ? splitLongAnswer(preface) : null;
  if (longSplit) preface = longSplit.intro;

  const artifactMarkdown = parsed.draft ?? longSplit?.body ?? null;
  const artifactTitle = parsed.draft
    ? parsed.draftTitle || "Untitled draft"
    : longSplit?.title || "Study notes";
  // Drafts keep their original key so existing auto-saved documents are reused.
  const artifactKey = parsed.draft
    ? `${sessionId ?? "tmp"}:${index}`
    : `${sessionId ?? "tmp"}:${index}:auto`;
  const showChip = !!artifactMarkdown && !isLoading;
  const copyTarget = artifactMarkdown || parsed.preface || msg.content;

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast.success("Copied");
  };

  // Stagger index for post-stream artifact reveals (scripture → draft → followup).
  let reveal = 0;

  return (
    <div className="pressroom-msg-enter space-y-3">
      <div className="flex select-none items-center gap-2" aria-hidden>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--pressroom-active-bg)] ring-1 ring-[var(--pressroom-active-border)]/40">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--pressroom-accent)]" />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--pressroom-fg-muted)]">PressRoom</span>
      </div>
      <PressRoomSourcesTabs
        answer={
          <div className="space-y-3">
            {preface && (
              <div className={cn("px-1 py-1", streaming && "pressroom-stream-caret")}>
                <PressRoomMarkdown>{preface}</PressRoomMarkdown>
              </div>
            )}

            {showDraftSkeleton && <DraftSkeleton />}

            {msg.meta?.scripture_artifact && !isLoading && (
              <div className="pressroom-artifact-reveal" style={{ "--reveal-i": reveal++ } as React.CSSProperties}>
                <ScriptureArtifact data={msg.meta.scripture_artifact} />
              </div>
            )}

            {showChip && (
              <div className="pressroom-artifact-reveal space-y-2" style={{ "--reveal-i": reveal++ } as React.CSSProperties}>
                <InlineDocumentCard
                  initialMarkdown={artifactMarkdown!}
                  initialTitle={artifactTitle}
                  sessionId={sessionId}
                  messageIndex={index}
                  messageKey={artifactKey}
                />
                <button
                  type="button"
                  onClick={() => setReadInChat((v) => !v)}
                  className="pressroom-tactile inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-[var(--pressroom-accent)] hover:bg-[var(--pressroom-active-bg)]"
                  aria-expanded={readInChat}
                >
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", readInChat && "rotate-180")} />
                  {readInChat ? "Collapse" : "Read it here in chat"}
                </button>
                {readInChat && (
                  <div className="pressroom-msg-enter border-l-2 border-[var(--pressroom-active-border)]/40 pl-4 pr-1 py-1">
                    <PressRoomMarkdown>{artifactMarkdown!}</PressRoomMarkdown>
                  </div>
                )}
              </div>
            )}

            {showFollowup && (
              <div
                className="pressroom-artifact-reveal px-1 py-1"
                style={{ "--reveal-i": reveal++ } as React.CSSProperties}
              >
                <PressRoomMarkdown>{parsed.followup!}</PressRoomMarkdown>
              </div>
            )}
          </div>
        }
        sources={msg.meta?.sources}
        images={msg.meta?.images}
      />

      {!isLoading && msg.content.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1 text-muted-foreground">
          <ActionBtn label="Copy" onClick={() => copy(copyTarget)}>
            <Copy className="h-3.5 w-3.5" />
          </ActionBtn>
          {isLast && (
            <ActionBtn label="Regenerate" onClick={onRegenerate}>
              <RefreshCw className="h-3.5 w-3.5" />
            </ActionBtn>
          )}
          <ActionBtn label="Good response" onClick={() => toast.success("Thanks for the feedback")}>
            <ThumbsUp className="h-3.5 w-3.5" />
          </ActionBtn>
          <ActionBtn label="Needs work" onClick={() => toast("Noted")}>
            <ThumbsDown className="h-3.5 w-3.5" />
          </ActionBtn>
          {!artifactMarkdown && (
            <ActionBtn
              label="Continue in Write"
              onClick={() => {
                navigator.clipboard.writeText(copyTarget);
                toast.success("Copied — paste it into your new page");
                navigate("/app/write");
              }}
            >
              <PenLine className="h-3.5 w-3.5" />
            </ActionBtn>
          )}
          {msg.meta?.citation_verdict && (
            // Popover (tap-to-open) instead of Tooltip (hover-only) — the
            // explanation is the whole point of the badge, and a hover-only
            // reveal is unreachable on touch.
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "pressroom-badge-in pressroom-tactile ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    msg.meta.citation_verdict === "verified" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                    msg.meta.citation_verdict === "partial" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    msg.meta.citation_verdict === "unverified" && "bg-red-500/15 text-red-600 dark:text-red-400",
                  )}
                >
                  {msg.meta.citation_verdict === "verified" ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                  {msg.meta.citation_verdict === "verified"
                    ? "Citations verified"
                    : msg.meta.citation_verdict === "partial"
                      ? "Partially verified"
                      : "Unverified"}
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="w-auto max-w-xs p-2.5 text-xs">
                {msg.meta.citation_verdict === "verified"
                  ? "All claims are grounded in source material"
                  : "Some claims could not be verified against sources"}
              </PopoverContent>
            </Popover>
          )}
          {msg.meta?.memory_summary && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="pressroom-badge-in pressroom-tactile ml-1 inline-flex items-center gap-1 rounded-full bg-[hsl(40_56%_51%/0.12)] px-2 py-0.5 text-[10px] font-medium text-[hsl(40_56%_55%)]"
                >
                  <Brain className="h-3 w-3" />
                  PressRoom remembers
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="w-auto max-w-xs p-2.5 text-xs">
                {msg.meta.memory_summary}
              </PopoverContent>
            </Popover>
          )}
          {msg.meta?.model && (
            <span className="ml-2 text-[10px] opacity-60">
              {msg.meta.model.split("/").pop()}
              {msg.meta.latency_ms ? ` · ${(msg.meta.latency_ms / 1000).toFixed(1)}s` : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
},
(prev, next) =>
  prev.msg === next.msg &&
  prev.index === next.index &&
  prev.isLast === next.isLast &&
  prev.isLoading === next.isLoading &&
  prev.sessionId === next.sessionId,
);

function DraftSkeleton() {
  return (
    <div
      className="space-y-2.5 rounded-xl border border-[var(--pressroom-border)] bg-[var(--pressroom-panel)]/60 p-4"
      aria-label="Drafting document"
    >
      <div className="flex items-center gap-2 text-xs text-[var(--pressroom-fg-muted)]">
        <FileText className="h-3.5 w-3.5 text-[var(--pressroom-accent)]" />
        Drafting document…
      </div>
      <div className="shimmer h-3 w-3/4 rounded" />
      <div className="shimmer h-3 w-full rounded" />
      <div className="shimmer h-3 w-5/6 rounded" />
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClick}
          aria-label={label}
          className={cn("pressroom-tactile h-7 w-7 text-muted-foreground hover:text-foreground")}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
