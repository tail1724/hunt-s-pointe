import { useEffect, useRef, useState } from "react";
import { Plus, Search, MessageSquare, MoreHorizontal, Pencil, Pin, PinOff, Tag, Trash2, X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputDialog } from "@/components/ui/input-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { usePressRoomSessions } from "./usePressRoomSessions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSessionId: string | null;
  onSelectSession: (id: string | null) => void;
  onNewSession: () => void;
  refreshKey: number;
}

/**
 * Mobile's answer to the desktop PressRoomRail — a bottom sheet instead of a
 * side panel, opened from PressRoomMobileHeader. Shares all data/mutation logic
 * with the rail through usePressRoomSessions so history, rename, and delete
 * behave identically on both surfaces.
 */
export function PressRoomSessionsDrawer({
  open,
  onOpenChange,
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
    categories,
    renamingId,
    renameValue,
    setRenameValue,
    startRename,
    commitRename,
    cancelRename,
    handleDelete,
    togglePin,
    setCategory,
  } = usePressRoomSessions({
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh] pb-safe">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="font-display">Your chats</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-2 flex items-center gap-2">
          <Button
            type="button"
            onClick={() => {
              onNewSession();
              onOpenChange(false);
            }}
            className="h-11 flex-1 gap-1.5 rounded-xl"
          >
            <Plus className="h-4 w-4" /> New chat
          </Button>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="h-11 pl-9"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-4">
          {loading ? (
            <div className="space-y-2 px-2" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" style={{ opacity: 1 - i * 0.15 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {query ? "No chats match your search." : "Your studies will gather here."}
            </div>
          ) : (
            grouped.map((group) => (
              <div key={`${group.kind}:${group.label}`} className="mb-3">
                <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.kind === "pinned" && <Pin className="h-3 w-3 fill-current text-accent" />}
                  {group.kind === "category" && <Tag className="h-3 w-3 text-accent" />}
                  {group.label}
                </div>
                <div className="space-y-1">
                  {group.rows.map((s) => (
                    <div
                      key={s.id}
                      className={cn(
                        "flex items-center rounded-lg",
                        activeSessionId === s.id ? "bg-primary/10" : "active:bg-muted",
                      )}
                    >
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
                          className="mx-2 my-1.5 w-full rounded-lg border border-primary/40 bg-background px-3 py-2 text-sm outline-none"
                        />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectSession(s.id);
                              onOpenChange(false);
                            }}
                            className={cn(
                              "flex-1 min-w-0 text-left pl-3 pr-1 py-3 text-sm truncate",
                              activeSessionId === s.id ? "text-foreground font-medium" : "text-foreground/80",
                            )}
                          >
                            {s.pinned_at ? (
                              <Pin className="inline h-3.5 w-3.5 mr-2 fill-current text-accent" />
                            ) : (
                              <MessageSquare className="inline h-3.5 w-3.5 mr-2 opacity-60" />
                            )}
                            {s.title || "Untitled"}
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Chat options"
                                className="h-10 w-10 mr-1 shrink-0 text-muted-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
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
      </DrawerContent>
    </Drawer>
  );
}
