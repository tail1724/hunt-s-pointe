import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock, CheckCircle2, ExternalLink, Link2, Plus, Tag, Trash2, X,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import type { BoardBundle, Card, ChecklistItem, OrganizeTag } from "@/lib/organize/types";
import { LINK_KIND_META, ORGANIZE_COLORS, colorSwatch, parseChecklist, type LinkKind } from "@/lib/organize/types";
import {
  useAddCardLink, useCreateTag, useDeleteCard, useRemoveCardLink, useSetCardTag, useUpdateCard,
  type CardPatch,
} from "@/lib/organize/queries";
import { searchContent, type ContentHit } from "@/lib/organize/content-search";
import { LINK_ICONS } from "./CardItem";

interface Props {
  bundle: BoardBundle;
  tags: OrganizeTag[];
  cardId: string | null;
  onClose: () => void;
}

/** Full card editor: title, notes, schedule, color, tags, checklist, content links. */
export function CardDialog({ bundle, tags, cardId, onClose }: Props) {
  const navigate = useNavigate();
  const card = bundle.cards.find((c) => c.id === cardId) ?? null;
  const links = useMemo(() => bundle.links.filter((l) => l.card_id === cardId), [bundle.links, cardId]);
  const cardTagIds = useMemo(
    () => new Set(bundle.cardTags.filter((ct) => ct.card_id === cardId).map((ct) => ct.tag_id)),
    [bundle.cardTags, cardId],
  );

  const updateCard = useUpdateCard(bundle.board.id);
  const deleteCard = useDeleteCard(bundle.board.id);
  const setCardTag = useSetCardTag(bundle.board.id);
  const createTag = useCreateTag();
  const addLink = useAddCardLink(bundle.board.id);
  const removeLink = useRemoveCardLink(bundle.board.id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newItem, setNewItem] = useState("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description ?? "");
    }
  }, [card?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reset drafts only when switching cards

  if (!card) return null;
  const checklist = parseChecklist(card.checklist);

  const patch = (p: CardPatch) => updateCard.mutate({ id: card.id, ...p });

  const commitTitle = () => {
    const t = title.trim();
    if (t && t !== card.title) patch({ title: t });
    else setTitle(card.title);
  };

  const setChecklist = (items: ChecklistItem[]) => patch({ checklist: items as unknown as Card["checklist"] });

  const dueValue = card.due_at ? new Date(card.due_at).toISOString().slice(0, 10) : "";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">Edit card</DialogTitle>
          <div className="flex items-start gap-2 pr-6">
            <button
              type="button"
              onClick={() => {
                haptics.tap();
                patch({ completed_at: card.completed_at ? null : new Date().toISOString() });
              }}
              aria-pressed={!!card.completed_at}
              aria-label={card.completed_at ? "Mark as not done" : "Mark as done"}
              className={cn(
                "tactile mt-1 shrink-0 rounded-full",
                card.completed_at ? "text-accent" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CheckCircle2 className="h-5 w-5" />
            </button>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => e.key === "Enter" && commitTitle()}
              aria-label="Card title"
              className={cn(
                "w-full border-none bg-transparent font-display text-lg font-semibold outline-none",
                card.completed_at && "text-muted-foreground line-through",
              )}
            />
          </div>
        </DialogHeader>

        {/* Schedule + cover color */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            <input
              type="date"
              value={dueValue}
              onChange={(e) =>
                patch({ due_at: e.target.value ? new Date(`${e.target.value}T09:00:00`).toISOString() : null })
              }
              aria-label="Due date"
              className="bg-transparent outline-none"
            />
            {card.due_at && (
              <button type="button" onClick={() => patch({ due_at: null })} aria-label="Clear due date">
                <X className="h-3 w-3" />
              </button>
            )}
          </label>
          <div className="ml-auto flex items-center gap-1" role="group" aria-label="Cover color">
            <button
              type="button"
              onClick={() => patch({ cover_color: null })}
              aria-label="No cover color"
              className={cn(
                "tactile h-5 w-5 rounded-full border border-border",
                !card.cover_color && "ring-2 ring-accent ring-offset-1 ring-offset-background",
              )}
            />
            {Object.entries(ORGANIZE_COLORS).map(([key, c]) => (
              <button
                key={key}
                type="button"
                onClick={() => patch({ cover_color: key })}
                aria-label={`Cover ${c.label}`}
                style={{ background: c.swatch }}
                className={cn(
                  "tactile h-5 w-5 rounded-full border border-border/60",
                  card.cover_color === key && "ring-2 ring-accent ring-offset-1 ring-offset-background",
                )}
              />
            ))}
          </div>
        </div>

        {/* Notes */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            const d = description.trim() || null;
            if (d !== (card.description ?? null)) patch({ description: d });
          }}
          placeholder="Notes…"
          rows={3}
          aria-label="Card notes"
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />

        {/* Tags */}
        <section aria-label="Tags">
          <h3 className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Tag className="h-3 w-3" /> Tags
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((t) => {
              const on = cardTagIds.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCardTag.mutate({ cardId: card.id, tagId: t.id, on: !on })}
                  aria-pressed={on}
                  className={cn(
                    "tactile inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs",
                    on
                      ? "border-accent/60 bg-accent/15 text-foreground"
                      : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground",
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: colorSwatch(t.color) }} aria-hidden />
                  {t.name}
                </button>
              );
            })}
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key !== "Enter") return;
                const name = newTag.trim();
                if (!name) return;
                setNewTag("");
                const colorKeys = Object.keys(ORGANIZE_COLORS);
                try {
                  const tag = await createTag.mutateAsync({
                    name,
                    color: colorKeys[tags.length % colorKeys.length],
                  });
                  setCardTag.mutate({ cardId: card.id, tagId: tag.id, on: true });
                } catch {
                  toast.error("Couldn't create that tag");
                }
              }}
              placeholder="New tag…"
              aria-label="Create tag"
              className="h-6 w-24 rounded-full border border-dashed border-border bg-transparent px-2 text-xs outline-none focus:border-accent"
            />
          </div>
        </section>

        {/* Checklist */}
        <section aria-label="Checklist">
          <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Checklist{checklist.length > 0 && ` · ${checklist.filter((i) => i.done).length}/${checklist.length}`}
          </h3>
          <ul className="space-y-1">
            {checklist.map((item) => (
              <li key={item.id} className="group flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() =>
                    setChecklist(checklist.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
                  }
                  aria-label={item.text}
                  className="h-3.5 w-3.5 accent-[hsl(40_49%_53%)]"
                />
                <span className={cn("flex-1 text-sm", item.done && "text-muted-foreground line-through")}>
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => setChecklist(checklist.filter((i) => i.id !== item.id))}
                  aria-label={`Remove ${item.text}`}
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newItem.trim()) {
                  setChecklist([...checklist, { id: crypto.randomUUID(), text: newItem.trim(), done: false }]);
                  setNewItem("");
                }
              }}
              placeholder="Add checklist item"
              aria-label="Add checklist item"
              className="h-7 flex-1 rounded-lg border border-transparent bg-transparent px-1 text-sm outline-none focus:border-input"
            />
          </div>
        </section>

        {/* Linked content — the deep-integration surface */}
        <section aria-label="Linked content">
          <h3 className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Link2 className="h-3 w-3" /> Linked content
          </h3>
          <ul className="space-y-1">
            {links.map((l) => {
              const kind = l.kind as LinkKind;
              const Icon = LINK_ICONS[kind];
              return (
                <li key={l.id} className="group flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm">{l.title}</span>
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">
                    {LINK_KIND_META[kind].label}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(LINK_KIND_META[kind].route(l.target_id))}
                    aria-label={`Open ${l.title}`}
                    className="tactile text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLink.mutate(l.id)}
                    aria-label={`Unlink ${l.title}`}
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              );
            })}
          </ul>
          <AddContentPopover
            onPick={(hit) =>
              addLink.mutate({ card_id: card.id, kind: hit.kind, target_id: hit.id, title: hit.title })
            }
          />
        </section>

        <div className="flex justify-end border-t border-border pt-3">
          <button
            type="button"
            onClick={() => {
              deleteCard.mutate(card.id);
              onClose();
              toast.success("Card deleted");
            }}
            className="tactile inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete card
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** cmdk palette over the user's documents, collections, creations, and chats. */
function AddContentPopover({ onPick }: { onPick: (hit: ContentHit) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ContentHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearching(true);
    const t = window.setTimeout(() => {
      searchContent(query)
        .then(setHits)
        .finally(() => setSearching(false));
    }, 180);
    return () => window.clearTimeout(t);
  }, [open, query]);

  const groups = useMemo(() => {
    const byKind = new Map<LinkKind, ContentHit[]>();
    for (const h of hits) byKind.set(h.kind, [...(byKind.get(h.kind) ?? []), h]);
    return [...byKind.entries()];
  }, [hits]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="tactile mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:border-accent/60 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Attach from your library
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search documents, collections…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{searching ? "Searching…" : "Nothing found."}</CommandEmpty>
            {groups.map(([kind, list]) => (
              <CommandGroup key={kind} heading={LINK_KIND_META[kind].label}>
                {list.map((hit) => {
                  const Icon = LINK_ICONS[hit.kind];
                  return (
                    <CommandItem
                      key={`${hit.kind}-${hit.id}`}
                      value={`${hit.kind}-${hit.id}`}
                      onSelect={() => {
                        onPick(hit);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <Icon className="mr-2 h-3.5 w-3.5 text-accent" aria-hidden />
                      <span className="truncate">{hit.title}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
