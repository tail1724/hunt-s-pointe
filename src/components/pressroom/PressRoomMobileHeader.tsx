import { useEffect, useState } from "react";
import { History, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  sessionId: string | null;
  onOpenHistory: () => void;
  onNewSession: () => void;
}

/**
 * Mobile-only thread header, sitting just under the shell's status bar.
 * This is the entire mobile answer to "how do I see past chats / start a
 * new one" — the desktop rail simply doesn't render below the md
 * breakpoint, so without this row mobile PressRoom has no path to either.
 */
export function PressRoomMobileHeader({ sessionId, onOpenHistory, onNewSession }: Props) {
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setTitle(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("partner_sessions" as any)
      .select("title")
      .eq("id", sessionId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setTitle((data as any)?.title ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="flex items-center gap-2 border-b border-[var(--pressroom-border)] bg-[var(--pressroom-panel)]/80 px-3 py-2">
      <button
        type="button"
        onClick={onOpenHistory}
        aria-label="Chat history"
        className="pressroom-tactile flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--pressroom-fg-muted)] hover:bg-[var(--pressroom-hover-bg)] hover:text-[var(--pressroom-fg)]"
      >
        <History className="h-[18px] w-[18px]" />
      </button>
      <span className="min-w-0 flex-1 truncate text-center text-sm font-medium text-[var(--pressroom-fg)]">
        {sessionId ? title || "Untitled" : "New chat"}
      </span>
      <button
        type="button"
        onClick={onNewSession}
        aria-label="New chat"
        disabled={!sessionId}
        className="pressroom-tactile flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--pressroom-fg-muted)] hover:bg-[var(--pressroom-hover-bg)] hover:text-[var(--pressroom-fg)] disabled:opacity-30"
      >
        <Plus className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}
