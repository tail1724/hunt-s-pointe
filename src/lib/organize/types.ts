import type { Tables } from "@/integrations/supabase/types";

export type Board = Tables<"boards">;
export type BoardColumn = Tables<"board_columns">;
export type Card = Tables<"cards">;
export type CardLink = Tables<"card_links">;
export type OrganizeTag = Tables<"organize_tags">;
export type OrgEvent = Tables<"events">;

export type LinkKind = "document" | "collection" | "generation" | "session";

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export function parseChecklist(raw: Card["checklist"]): ChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).filter(
    (i): i is ChecklistItem =>
      !!i && typeof i === "object" && "id" in i && "text" in i && "done" in i,
  );
}

/** Everything one board renders; fetched as a bundle, updated optimistically. */
export interface BoardBundle {
  board: Board;
  columns: BoardColumn[];
  cards: Card[];
  links: CardLink[];
  cardTags: { card_id: string; tag_id: string }[];
}

/** Shared accent palette: tags, card covers, calendar events. */
export const ORGANIZE_COLORS: Record<string, { label: string; swatch: string }> = {
  gold: { label: "Gold", swatch: "hsl(40 49% 53%)" },
  sage: { label: "Sage", swatch: "hsl(95 25% 50%)" },
  sky: { label: "Sky", swatch: "hsl(205 45% 55%)" },
  rose: { label: "Rose", swatch: "hsl(355 45% 60%)" },
  plum: { label: "Plum", swatch: "hsl(285 30% 55%)" },
  slate: { label: "Slate", swatch: "hsl(210 15% 50%)" },
};

export function colorSwatch(key: string | null | undefined): string {
  return ORGANIZE_COLORS[key ?? ""]?.swatch ?? ORGANIZE_COLORS.gold.swatch;
}

/** Fractional ordering: midpoint between neighbors, gap at the end. */
export const POSITION_GAP = 1024;

export function positionBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return POSITION_GAP;
  if (before === undefined) return (after as number) / 2;
  if (after === undefined) return before + POSITION_GAP;
  return (before + after) / 2;
}

export function nextPosition(items: { position: number }[]): number {
  return items.length === 0 ? POSITION_GAP : Math.max(...items.map((i) => i.position)) + POSITION_GAP;
}

export const LINK_KIND_META: Record<LinkKind, { label: string; route: (id: string) => string }> = {
  document: { label: "Document", route: (id) => `/app/write/${id}` },
  collection: { label: "Collection", route: (id) => `/app/knowledge/${id}` },
  generation: { label: "Creation", route: () => "/app/file-cabinet" },
  session: { label: "PressRoom chat", route: () => "/app/pressroom" },
};
