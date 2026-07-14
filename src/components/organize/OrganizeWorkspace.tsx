import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  CalendarDays, ChevronDown, KanbanSquare, Plus, RefreshCw, Trash2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import type { Card } from "@/lib/organize/types";
import {
  useBoardBundle, useBoards, useCreateBoard, useDeleteBoard, useOrganizeRealtime, useTags,
} from "@/lib/organize/queries";
import { EMPTY_FILTERS, isFilterActive, matchCard, type OrganizeFilters } from "@/lib/organize/filters";
import { BoardDialog } from "./BoardDialog";
import { BoardView } from "./BoardView";
import { CalendarView } from "./CalendarView";
import { CardDialog } from "./CardDialog";
import { FilterRail } from "./FilterRail";

/** /app/organize — Kanban board + calendar, wearing the reader's paper-desk aesthetic. */
export function OrganizeWorkspace() {
  const navigate = useNavigate();
  const { boardId: routeBoardId } = useParams<{ boardId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "calendar" ? "calendar" : "board";

  const boards = useBoards();
  const deleteBoard = useDeleteBoard();
  const tags = useTags();

  const activeBoardId =
    routeBoardId && boards.data?.some((b) => b.id === routeBoardId)
      ? routeBoardId
      : boards.data?.[0]?.id ?? null;
  const activeBoard = boards.data?.find((b) => b.id === activeBoardId) ?? null;

  const bundle = useBoardBundle(activeBoardId);
  useOrganizeRealtime(activeBoardId);

  const [filters, setFilters] = useState<OrganizeFilters>(EMPTY_FILTERS);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [confirmBoardDelete, setConfirmBoardDelete] = useState(false);

  const bundleData = bundle.data;
  const linksByCard = useMemo(() => {
    const map = new Map<string, NonNullable<typeof bundleData>["links"]>();
    for (const l of bundleData?.links ?? []) map.set(l.card_id, [...(map.get(l.card_id) ?? []), l]);
    return map;
  }, [bundleData]);
  const tagIdsByCard = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const ct of bundleData?.cardTags ?? []) map.set(ct.card_id, [...(map.get(ct.card_id) ?? []), ct.tag_id]);
    return map;
  }, [bundleData]);

  const matched = useMemo(() => {
    if (!bundleData || !isFilterActive(filters)) return null;
    return new Set(
      bundleData.cards
        .filter((c) => matchCard(c, linksByCard.get(c.id) ?? [], tagIdsByCard.get(c.id) ?? [], filters))
        .map((c) => c.id),
    );
  }, [bundleData, filters, linksByCard, tagIdsByCard]);

  const setView = (v: "board" | "calendar") => {
    const next = new URLSearchParams(searchParams);
    if (v === "calendar") next.set("view", "calendar");
    else next.delete("view");
    setSearchParams(next, { replace: true });
  };

  const goToBoard = (id: string) =>
    navigate(`/app/organize/board/${id}${view === "calendar" ? "?view=calendar" : ""}`);

  const openCard = (card: Card) => setOpenCardId(card.id);

  const hasBoards = (boards.data?.length ?? 0) > 0;

  return (
    <div className="organize-surface flex h-full min-h-0 flex-col">
      {/* Reading-room chrome — the Bible toolbar's quiet voice */}
      <header className="relative z-10 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 md:px-6">
          <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:inline-flex">
            <KanbanSquare className="h-3.5 w-3.5 text-accent" />
            Organize
          </span>
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />

          {hasBoards && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="tactile inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 font-display text-sm font-semibold hover:border-accent/60"
                >
                  <span aria-hidden>{activeBoard?.emoji ?? "🗂️"}</span>
                  <span className="max-w-44 truncate">{activeBoard?.title ?? "Boards"}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-widest">Boards</DropdownMenuLabel>
                {(boards.data ?? []).map((b) => (
                  <DropdownMenuItem
                    key={b.id}
                    onClick={() => goToBoard(b.id)}
                    className={cn(b.id === activeBoardId && "text-accent")}
                  >
                    <span className="mr-2" aria-hidden>{b.emoji ?? "🗂️"}</span>
                    <span className="truncate">{b.title}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setBoardDialogOpen(true)}>
                  <Plus className="mr-2 h-3.5 w-3.5" /> New board
                </DropdownMenuItem>
                {activeBoard && (boards.data?.length ?? 0) > 1 && (
                  <DropdownMenuItem
                    onClick={() => setConfirmBoardDelete(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete this board
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div
            role="tablist"
            aria-label="Organize view"
            className="ml-auto inline-flex rounded-lg border border-border bg-card p-0.5"
          >
            {([
              { key: "board", label: "Board", icon: KanbanSquare },
              { key: "calendar", label: "Calendar", icon: CalendarDays },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={cn(
                  "tactile inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium",
                  view === key ? "bg-accent/15 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {hasBoards && <div className="relative z-10 pt-2"><FilterRail filters={filters} onChange={setFilters} tags={tags.data ?? []} /></div>}

      <div className="relative z-10 min-h-0 flex-1">
        {boards.isError ? (
          <ErrorPanel
            message="Organize couldn't load your boards."
            onRetry={() => boards.refetch()}
          />
        ) : boards.isLoading || (activeBoardId && bundle.isLoading) ? (
          <div className="flex h-full items-start gap-4 px-4 pt-2 md:px-6" aria-label="Loading board">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-64 w-72 shrink-0 animate-pulse rounded-2xl bg-muted/40" style={{ opacity: 1 - i * 0.18 }} />
            ))}
          </div>
        ) : !hasBoards ? (
          <WelcomePanel onCreated={goToBoard} />
        ) : bundle.isError ? (
          <ErrorPanel
            message="This board couldn't load."
            onRetry={() => bundle.refetch()}
          />
        ) : bundleData ? (
          <div className="page-lift h-full min-h-0">
            {view === "board" ? (
              <BoardView bundle={bundleData} tags={tags.data ?? []} matched={matched} onOpenCard={openCard} />
            ) : (
              <CalendarView bundle={bundleData} matched={matched} onOpenCard={openCard} />
            )}
          </div>
        ) : null}
      </div>

      {bundleData && (
        <CardDialog
          bundle={bundleData}
          tags={tags.data ?? []}
          cardId={openCardId}
          onClose={() => setOpenCardId(null)}
        />
      )}

      <BoardDialog open={boardDialogOpen} onOpenChange={setBoardDialogOpen} onCreated={goToBoard} />

      {activeBoard && (
        <ConfirmDialog
          open={confirmBoardDelete}
          onOpenChange={setConfirmBoardDelete}
          title={`Delete “${activeBoard.title}”?`}
          description="The board, its columns, and every card on it will be gone. This cannot be undone."
          confirmLabel="Delete board"
          onConfirm={() => {
            deleteBoard.mutate(activeBoard.id, {
              onError: () => toast.error("Couldn't delete the board"),
            });
            navigate("/app/organize");
          }}
        />
      )}
    </div>
  );
}

/** First visit: a set-up moment in the reader's voice, not an empty void. */
function WelcomePanel({ onCreated }: { onCreated: (boardId: string) => void }) {
  const createBoard = useCreateBoard();
  const [title, setTitle] = useState("");

  const submit = async () => {
    if (createBoard.isPending) return;
    try {
      const board = await createBoard.mutateAsync({ title: title.trim() || "My workboard", emoji: "🗂️" });
      haptics.tap();
      onCreated(board.id);
    } catch (e) {
      console.error("Board creation failed", e);
      toast.error(e instanceof Error ? `Couldn't create the board — ${e.message}` : "Couldn't create the board");
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="organize-panel page-lift w-full max-w-lg p-8 text-center md:p-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Organize</p>
        <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          A place for the work<br />around your studies.
        </h2>
        <div className="mx-auto mt-4 flex items-center justify-center gap-3 text-accent" aria-hidden>
          <span className="h-px w-10 bg-accent/50" />
          <KanbanSquare className="h-4 w-4" />
          <span className="h-px w-10 bg-accent/50" />
        </div>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Sermons in motion, series being planned, tasks that can&apos;t slip — on a board and calendar
          that link straight to your documents, collections, and chats.
        </p>
        <div className="mx-auto mt-6 flex max-w-sm items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Name your first board"
            aria-label="Board name"
            className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3.5 text-sm outline-none transition-colors focus:border-accent"
          />
          <button
            type="button"
            onClick={submit}
            disabled={createBoard.isPending}
            className={cn(
              "tactile h-11 shrink-0 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground",
              createBoard.isPending && "opacity-60",
            )}
          >
            {createBoard.isPending ? "Setting up…" : "Create"}
          </button>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
          Ideas · In progress · Ready · Done
        </p>
      </div>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="organize-panel w-full max-w-md p-8 text-center">
        <h2 className="font-display text-lg font-semibold">{message}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Check your connection and try again — your data is safe.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="tactile mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      </div>
    </div>
  );
}
