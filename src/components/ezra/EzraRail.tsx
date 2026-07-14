import { useEffect, useRef, useState } from "react";
import { Plus, Search, History, PanelLeftClose, PanelLeftOpen, MessageSquare, MoreHorizontal, Pencil, Pin, PinOff, Tag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { InputDialog } from "@/components/ui/input-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEzraSessions } from "./useEzraSessions";

interface Props {
  open: boolean;
  onToggle: () => void;
  activeSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  onNewSession: () => void;
  refreshKey: number;
}

export function EzraRail({
  open,
  onToggle,
  activeSessionId,
  onSelectSession,
  onNewSession,
  refreshKey,
}: Props) {
  const {
    loading,
    query,
    setQuery,
    filtered,
    grouped,
    renamingId,
    renameValue,
    setRenameValue,
    startRename,
    commitRename,
    cancelRename,
    handleDelete,
    categories,
    togglePin,
    setCategory,
  } = useEzraSessions({
    activeSessionId,
    refreshKey,
    onActiveDeleted: () => onSelectSession(null),
  });
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [categoryFor, setCategoryFor] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (renamingId) {
      requestAnimationFrame(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      });
    }
  }, [renamingId]);

  return (
    <aside
      className={cn(
        "shrink-0 h-full flex flex-col border-r border-[var(--ezra-border)] bg-[var(--ezra-panel)] ezra-rail-transition rounded-r-xl",
        open ? "w-[260px]" : "w-[56px]",
      )}
      aria-label="Ezra chat history"
    >
      <div className={cn("flex items-center h-12 px-2", open ? "justify-between" : "justify-center")}>
        {open && (
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70 pl-2 flex items-center gap-1.5">
            <History className="h-3 w-3" /> Chats
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          aria-label={open ? "Collapse history" : "Expand history"}
          className="h-8 w-8 ezra-tactile"
        >
          {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </Button>
      </div>

      <div className="px-2 space-y-1">
        <RailButton
          icon={<Plus className="h-4 w-4" />}
          label="New chat"
          open={open}
          active={!activeSessionId}
          onClick={onNewSession}
        />
        {open ? (
          <div className="relative pt-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="h-8 pl-8 text-xs bg-[var(--ezra-composer-bg)] border-[var(--ezra-border)] text-[var(--ezra-fg)] placeholder:text-[var(--ezra-fg-muted)]/60"
            />
          </div>
        ) : (
          <RailButton
            icon={<Search className="h-4 w-4" />}
            label="Search chats"
            open={open}
            onClick={onToggle}
          />
        )}
      </div>

      {open ? (
        <div className="flex-1 min-h-0 mt-3 px-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1.5 px-1 pt-1" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-7 animate-pulse rounded-md bg-[var(--ezra-hover-bg)]"
                  style={{ opacity: 1 - i * 0.15 }}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground/60">
              {query ? "No chats match your search." : "Your studies will gather here."}
            </div>
          ) : (
            grouped.map((group) => (
              <div key={`${group.kind}:${group.label}`} className="mb-2">
                <div className="flex items-center gap-1 px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                  {group.kind === "pinned" && <Pin className="h-2.5 w-2.5 fill-current text-accent" />}
                  {group.kind === "category" && <Tag className="h-2.5 w-2.5 text-accent" />}
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.rows.map((s) => (
                    <div
                      key={s.id}
                      className={cn(
                        "group relative flex items-center rounded-md ezra-tactile",
                        activeSessionId === s.id
                          ? "bg-[var(--ezra-active-bg)]"
                          : "hover:bg-[var(--ezra-hover-bg)]",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full transition-colors",
                          activeSessionId === s.id ? "bg-[var(--ezra-active-border)]" : "bg-transparent",
                        )}
                      />
                      {renamingId === s.id ? (
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") cancelRename();
                          }}
                          aria-label="Rename chat"
                          className="mx-1.5 my-1 w-full rounded border border-[var(--ezra-active-border)] bg-[var(--ezra-composer-bg)] px-1.5 py-0.5 text-xs text-[var(--ezra-fg)] outline-none"
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onSelectSession(s.id)}
                            onDoubleClick={() => startRename(s)}
                            className={cn(
                              "flex-1 min-w-0 text-left pl-2.5 pr-1 py-1.5 text-xs truncate",
                              activeSessionId === s.id
                                ? "text-[var(--ezra-fg)]"
                                : "text-[var(--ezra-fg-muted)] hover:text-[var(--ezra-fg)]",
                            )}
                          >
                            {s.pinned_at ? (
                              <Pin className="inline h-3 w-3 mr-1.5 fill-current text-accent" />
                            ) : (
                              <MessageSquare className="inline h-3 w-3 mr-1.5 opacity-60" />
                            )}
                            {s.title || "Untitled"}
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Chat options"
                                // Always visible on touch (no real hover state
                                // there); hover-revealed on desktop pointers.
                                className="h-6 w-6 mr-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 text-[var(--ezra-fg-muted)] hover:text-[var(--ezra-fg)]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => togglePin(s.id)}>
                                {s.pinned_at ? (
                                  <><PinOff className="h-3.5 w-3.5 mr-2" /> Unpin</>
                                ) : (
                                  <><Pin className="h-3.5 w-3.5 mr-2" /> Pin to top</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <Tag className="h-3.5 w-3.5 mr-2" /> Category
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-44">
                                  {categories
                                    .filter((c) => c !== s.category)
                                    .map((c) => (
                                      <DropdownMenuItem key={c} onClick={() => setCategory(s.id, c)}>
                                        <Tag className="h-3.5 w-3.5 mr-2 opacity-60" /> {c}
                                      </DropdownMenuItem>
                                    ))}
                                  <DropdownMenuItem onClick={() => setCategoryFor(s.id)}>
                                    <Plus className="h-3.5 w-3.5 mr-2" /> New category…
                                  </DropdownMenuItem>
                                  {s.category && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => setCategory(s.id, null)}>
                                        <X className="h-3.5 w-3.5 mr-2" /> Remove from “{s.category}”
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuItem onClick={() => startRename(s)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteId(s.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <InputDialog
        open={categoryFor !== null}
        onOpenChange={(o) => !o && setCategoryFor(null)}
        title="New category"
        description="Name a shelf for this chat — it appears as a group in your history."
        label="Category name"
        placeholder="Sermons, Advent, Counseling…"
        confirmLabel="Create"
        onSubmit={(name) => categoryFor && setCategory(categoryFor, name)}
      />
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this chat?"
        description="The conversation and its messages will be gone. This cannot be undone."
        confirmLabel="Delete chat"
        onConfirm={() => deleteId && handleDelete(deleteId)}
      />
    </aside>
  );
}

function RailButton({
  icon,
  label,
  open,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  open: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={!open ? label : undefined}
      className={cn(
        "w-full flex items-center gap-2 px-2 h-9 rounded-md text-xs ezra-tactile",
        active
          ? "bg-[var(--ezra-active-bg)] text-[var(--ezra-fg)]"
          : "text-[var(--ezra-fg-muted)] hover:bg-[var(--ezra-hover-bg)] hover:text-[var(--ezra-fg)]",
        !open && "justify-center",
      )}
    >
      <span className="shrink-0">{icon}</span>
      {open && <span className="truncate">{label}</span>}
    </button>
  );
}
