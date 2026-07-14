import { useMemo, useRef, useState } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners,
  useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { haptics } from "@/lib/haptics";
import { playTick } from "@/lib/voice/ui-sound";
import { cn } from "@/lib/utils";
import type { BoardBundle, BoardColumn, Card, OrganizeTag } from "@/lib/organize/types";
import { ORGANIZE_COLORS, colorSwatch, positionBetween } from "@/lib/organize/types";
import {
  useCreateCard, useCreateColumn, useDeleteColumn, useUpdateCard, useUpdateColumn,
} from "@/lib/organize/queries";
import { CardItem } from "./CardItem";

interface Props {
  bundle: BoardBundle;
  tags: OrganizeTag[];
  /** null = no filter active; otherwise cards not in the set render dimmed. */
  matched: Set<string> | null;
  onOpenCard: (card: Card) => void;
}

type Orders = Record<string, string[]>;

const colDragId = (id: string) => `col:${id}`;
const isColDrag = (id: string | number) => String(id).startsWith("col:");
const stripCol = (id: string | number) => String(id).slice(4);

export function BoardView({ bundle, tags, matched, onOpenCard }: Props) {
  const updateCard = useUpdateCard(bundle.board.id);
  const updateColumn = useUpdateColumn(bundle.board.id);

  const cardById = useMemo(() => new Map(bundle.cards.map((c) => [c.id, c])), [bundle.cards]);
  const tagsByCard = useMemo(() => {
    const tagById = new Map(tags.map((t) => [t.id, t]));
    const map = new Map<string, OrganizeTag[]>();
    for (const ct of bundle.cardTags) {
      const t = tagById.get(ct.tag_id);
      if (!t) continue;
      map.set(ct.card_id, [...(map.get(ct.card_id) ?? []), t]);
    }
    return map;
  }, [bundle.cardTags, tags]);
  const linksByCard = useMemo(() => {
    const map = new Map<string, BoardBundle["links"]>();
    for (const l of bundle.links) map.set(l.card_id, [...(map.get(l.card_id) ?? []), l]);
    return map;
  }, [bundle.links]);

  const columnsSorted = useMemo(
    () => [...bundle.columns].sort((a, z) => a.position - z.position),
    [bundle.columns],
  );
  const baseOrders = useMemo<Orders>(() => {
    const orders: Orders = Object.fromEntries(bundle.columns.map((c) => [c.id, []]));
    for (const card of [...bundle.cards].sort((a, z) => a.position - z.position)) {
      (orders[card.column_id] ??= []).push(card.id);
    }
    return orders;
  }, [bundle.columns, bundle.cards]);

  // Drag state: live orders while a card is in flight, live column order for
  // column drags. Rendering prefers the live versions.
  const [dragOrders, setDragOrders] = useState<Orders | null>(null);
  const [dragColOrder, setDragColOrder] = useState<string[] | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeColumn, setActiveColumn] = useState<BoardColumn | null>(null);
  const ordersRef = useRef<Orders | null>(null);

  const orders = dragOrders ?? baseOrders;
  const colIds = dragColOrder ?? columnsSorted.map((c) => c.id);
  const columnById = useMemo(() => new Map(bundle.columns.map((c) => [c.id, c])), [bundle.columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findColumnOf = (cardId: string, o: Orders): string | undefined =>
    Object.keys(o).find((colId) => o[colId].includes(cardId));

  const onDragStart = ({ active }: DragStartEvent) => {
    haptics.tap();
    if (isColDrag(active.id)) {
      setActiveColumn(columnById.get(stripCol(active.id)) ?? null);
      setDragColOrder(columnsSorted.map((c) => c.id));
      return;
    }
    setActiveCard(cardById.get(String(active.id)) ?? null);
    const snapshot = structuredClone(baseOrders);
    ordersRef.current = snapshot;
    setDragOrders(snapshot);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || isColDrag(active.id)) return;
    const o = ordersRef.current;
    if (!o) return;
    const cardId = String(active.id);
    const from = findColumnOf(cardId, o);
    if (!from) return;

    let overId = String(over.id);
    if (overId.endsWith(":body")) overId = overId.slice(0, -":body".length);
    const to = isColDrag(overId)
      ? stripCol(overId)
      : overId in o
        ? overId
        : findColumnOf(overId, o);
    if (!to || !(to in o)) return;

    if (from === to) {
      const fromIdx = o[from].indexOf(cardId);
      const toIdx = isColDrag(overId) || overId === to ? o[to].length - 1 : o[to].indexOf(overId);
      if (toIdx < 0 || fromIdx === toIdx) return;
      const next = { ...o, [from]: arrayMove(o[from], fromIdx, toIdx) };
      ordersRef.current = next;
      setDragOrders(next);
      return;
    }
    const fromList = o[from].filter((id) => id !== cardId);
    const overIdx = isColDrag(overId) || overId === to ? o[to].length : o[to].indexOf(overId);
    const toList = [...o[to]];
    toList.splice(overIdx < 0 ? toList.length : overIdx, 0, cardId);
    const next = { ...o, [from]: fromList, [to]: toList };
    ordersRef.current = next;
    setDragOrders(next);
  };

  const finishDrag = () => {
    setActiveCard(null);
    setActiveColumn(null);
    setDragOrders(null);
    setDragColOrder(null);
    ordersRef.current = null;
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    // Column reorder: fractional position between final neighbors.
    if (isColDrag(active.id)) {
      if (over && dragColOrder) {
        const fromIdx = dragColOrder.indexOf(stripCol(active.id));
        const toIdx = dragColOrder.indexOf(stripCol(over.id));
        if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
          const finalOrder = arrayMove(dragColOrder, fromIdx, toIdx);
          const idx = finalOrder.indexOf(stripCol(active.id));
          const before = columnById.get(finalOrder[idx - 1] ?? "")?.position;
          const after = columnById.get(finalOrder[idx + 1] ?? "")?.position;
          updateColumn.mutate({ id: stripCol(active.id), position: positionBetween(before, after) });
          playTick();
        }
      }
      finishDrag();
      return;
    }

    const o = ordersRef.current;
    const cardId = String(active.id);
    const col = o ? findColumnOf(cardId, o) : undefined;
    if (o && col) {
      const list = o[col];
      const idx = list.indexOf(cardId);
      const before = cardById.get(list[idx - 1] ?? "")?.position;
      const after = cardById.get(list[idx + 1] ?? "")?.position;
      const card = cardById.get(cardId);
      const position = positionBetween(before, after);
      if (card && (card.column_id !== col || card.position !== position)) {
        updateCard.mutate({ id: cardId, column_id: col, position });
        playTick();
        haptics.tap();
      }
    }
    finishDrag();
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={finishDrag}
    >
      <div className="flex h-full items-start gap-4 overflow-x-auto px-4 pb-6 pt-2 md:px-6">
        <SortableContext items={colIds.map(colDragId)} strategy={horizontalListSortingStrategy}>
          {colIds.map((colId) => {
            const column = columnById.get(colId);
            if (!column) return null;
            return (
              <ColumnView
                key={colId}
                column={column}
                cardIds={orders[colId] ?? []}
                cardById={cardById}
                tagsByCard={tagsByCard}
                linksByCard={linksByCard}
                matched={matched}
                activeCardId={activeCard?.id ?? null}
                onOpenCard={onOpenCard}
                boardId={bundle.board.id}
              />
            );
          })}
        </SortableContext>
        <AddColumn boardId={bundle.board.id} columns={bundle.columns} />
      </div>

      <DragOverlay>
        {activeCard && (
          <CardItem
            card={activeCard}
            links={linksByCard.get(activeCard.id) ?? []}
            tags={tagsByCard.get(activeCard.id) ?? []}
            overlay
          />
        )}
        {activeColumn && (
          <div className="w-72 rounded-2xl border border-accent/50 bg-card/90 p-3 shadow-xl">
            <p className="font-display text-sm font-semibold">{activeColumn.title}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ------------------------------------------------------------------ column

interface ColumnProps {
  column: BoardColumn;
  cardIds: string[];
  cardById: Map<string, Card>;
  tagsByCard: Map<string, OrganizeTag[]>;
  linksByCard: Map<string, BoardBundle["links"]>;
  matched: Set<string> | null;
  activeCardId: string | null;
  onOpenCard: (card: Card) => void;
  boardId: string;
}

function ColumnView({
  column, cardIds, cardById, tagsByCard, linksByCard, matched, activeCardId, onOpenCard, boardId,
}: ColumnProps) {
  const updateColumn = useUpdateColumn(boardId);
  const deleteColumn = useDeleteColumn(boardId);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: colDragId(column.id),
    data: { type: "column" },
  });
  const { setNodeRef: setBodyRef } = useDroppable({ id: colDragId(column.id) + ":body" });

  const overWip = column.wip_limit != null && cardIds.length > column.wip_limit;

  const commitRename = () => {
    setRenaming(false);
    const t = title.trim();
    if (t && t !== column.title) updateColumn.mutate({ id: column.id, title: t });
    else setTitle(column.title);
  };

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "organize-column flex max-h-full w-72 shrink-0 flex-col",
        isDragging && "opacity-40",
      )}
      aria-label={`Column ${column.title}`}
    >
      <header className="flex items-center gap-1.5 px-3 pb-1 pt-2.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder column ${column.title}`}
          className="tactile -ml-1 cursor-grab rounded p-1 text-muted-foreground/60 hover:text-foreground"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        {column.color && (
          <span className="h-2 w-2 rounded-full" style={{ background: colorSwatch(column.color) }} aria-hidden />
        )}
        {renaming ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => e.key === "Enter" && commitRename()}
            className="h-6 min-w-0 flex-1 rounded border border-input bg-background px-1.5 font-display text-sm font-semibold outline-none focus:border-accent"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => setRenaming(true)}
            className="min-w-0 flex-1 truncate text-left font-display text-sm font-semibold"
            title="Double-click to rename"
          >
            {column.title}
          </button>
        )}
        <span
          className={cn(
            "rounded-md px-1.5 font-mono text-[10px]",
            overWip ? "bg-red-400/15 text-red-500 dark:text-red-400" : "text-muted-foreground",
          )}
          title={column.wip_limit != null ? `Work-in-progress limit: ${column.wip_limit}` : undefined}
        >
          {cardIds.length}
          {column.wip_limit != null && `/${column.wip_limit}`}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Column ${column.title} options`}
              className="tactile rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-widest">Column</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setRenaming(true)}>Rename</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>WIP limit</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {[null, 3, 5, 8].map((n) => (
                  <DropdownMenuItem
                    key={String(n)}
                    onClick={() => updateColumn.mutate({ id: column.id, wip_limit: n })}
                    className={cn(column.wip_limit === n && "text-accent")}
                  >
                    {n === null ? "Off" : n}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Color</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => updateColumn.mutate({ id: column.id, color: null })}>
                  None
                </DropdownMenuItem>
                {Object.entries(ORGANIZE_COLORS).map(([key, c]) => (
                  <DropdownMenuItem key={key} onClick={() => updateColumn.mutate({ id: column.id, color: key })}>
                    <span className="mr-2 h-2.5 w-2.5 rounded-full" style={{ background: c.swatch }} aria-hidden />
                    {c.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (cardIds.length === 0) deleteColumn.mutate(column.id);
                else setConfirmDelete(true);
              }}
              className="text-red-500 focus:text-red-500"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Delete “${column.title}”?`}
          description={`Its ${cardIds.length} card${cardIds.length === 1 ? "" : "s"} will be deleted with it. This cannot be undone.`}
          confirmLabel="Delete column"
          onConfirm={() => deleteColumn.mutate(column.id)}
        />
      </header>

      <div ref={setBodyRef} className="min-h-10 flex-1 space-y-2 overflow-y-auto px-3 pb-2 pt-1">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cardIds.map((id) => {
            const card = cardById.get(id);
            if (!card) return null;
            return (
              <SortableCard
                key={id}
                card={card}
                links={linksByCard.get(id) ?? []}
                tags={tagsByCard.get(id) ?? []}
                dimmed={matched !== null && !matched.has(id)}
                dragging={activeCardId === id}
                onOpen={onOpenCard}
              />
            );
          })}
        </SortableContext>
      </div>

      <CardComposer boardId={boardId} columnId={column.id} siblings={cardIds.map((id) => cardById.get(id)).filter(Boolean) as Card[]} />
    </section>
  );
}

function SortableCard({
  card, links, tags, dimmed, dragging, onOpen,
}: {
  card: Card;
  links: BoardBundle["links"];
  tags: OrganizeTag[];
  dimmed: boolean;
  dragging: boolean;
  onOpen: (card: Card) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: card.id,
    data: { type: "card" },
  });
  return (
    <CardItem
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      attributes={attributes as unknown as React.HTMLAttributes<HTMLDivElement>}
      listeners={listeners as unknown as React.HTMLAttributes<HTMLDivElement>}
      card={card}
      links={links}
      tags={tags}
      dimmed={dimmed}
      dragging={dragging}
      onOpen={onOpen}
    />
  );
}

// ------------------------------------------------------------------ compose

function CardComposer({ boardId, columnId, siblings }: { boardId: string; columnId: string; siblings: Card[] }) {
  const createCard = useCreateCard(boardId);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const submit = () => {
    const t = title.trim();
    if (t) {
      createCard.mutate({ columnId, title: t, siblings });
      haptics.tap();
    }
    setTitle("");
    if (!t) setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tactile mx-2 mb-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" /> Add card
      </button>
    );
  }
  return (
    <div className="px-3 pb-3">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => { if (!title.trim()) setOpen(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") { setTitle(""); setOpen(false); }
        }}
        placeholder="Card title, Enter to add"
        className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}

function AddColumn({ boardId, columns }: { boardId: string; columns: BoardColumn[] }) {
  const createColumn = useCreateColumn(boardId);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  return (
    <div className="w-64 shrink-0">
      {open ? (
        <div className="organize-column p-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { if (!title.trim()) setOpen(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && title.trim()) {
                createColumn.mutate({ title: title.trim(), columns });
                setTitle("");
              }
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Column name, Enter to add"
            className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tactile inline-flex w-full items-center gap-1.5 rounded-2xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground hover:border-accent/60 hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Add column
        </button>
      )}
    </div>
  );
}
