// Board/calendar filter model: search, tags, content kind, due window.
// Filtering dims non-matching cards in place rather than removing them.

import type { Card, CardLink, LinkKind } from "./types";

export type KindFacet = LinkKind | "plain";
export type DueFacet = "all" | "overdue" | "week" | "none";

export interface OrganizeFilters {
  q: string;
  tagIds: string[];
  kinds: KindFacet[];
  due: DueFacet;
}

export const EMPTY_FILTERS: OrganizeFilters = { q: "", tagIds: [], kinds: [], due: "all" };

export function isFilterActive(f: OrganizeFilters): boolean {
  return f.q.trim() !== "" || f.tagIds.length > 0 || f.kinds.length > 0 || f.due !== "all";
}

const DAY = 24 * 60 * 60 * 1000;

export function matchCard(
  card: Card,
  links: CardLink[],
  cardTagIds: string[],
  f: OrganizeFilters,
  now: Date = new Date(),
): boolean {
  const q = f.q.trim().toLowerCase();
  if (q) {
    const haystack = [card.title, card.description ?? "", ...links.map((l) => l.title)]
      .join("\n")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (f.tagIds.length > 0 && !f.tagIds.some((t) => cardTagIds.includes(t))) return false;

  if (f.kinds.length > 0) {
    const kinds = new Set(links.map((l) => l.kind as LinkKind));
    const matchesKind = f.kinds.some((k) => (k === "plain" ? links.length === 0 : kinds.has(k)));
    if (!matchesKind) return false;
  }

  if (f.due !== "all") {
    const due = card.due_at ? new Date(card.due_at).getTime() : null;
    const done = card.completed_at != null;
    if (f.due === "none") return due === null;
    if (due === null || done) return false;
    if (f.due === "overdue") return due < now.getTime();
    if (f.due === "week") return due >= now.getTime() - DAY && due <= now.getTime() + 7 * DAY;
  }
  return true;
}
