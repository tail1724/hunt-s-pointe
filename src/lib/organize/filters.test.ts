import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, isFilterActive, matchCard } from "./filters";
import type { Card, CardLink } from "./types";

const card = (over: Partial<Card> = {}): Card => ({
  id: "c1",
  board_id: "b1",
  column_id: "col1",
  user_id: "u1",
  title: "Sermon on the Mount outline",
  description: null,
  cover_color: null,
  due_at: null,
  all_day: true,
  checklist: [],
  completed_at: null,
  position: 1024,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
  ...over,
});

const link = (kind: string, title: string): CardLink => ({
  id: "l1",
  card_id: "c1",
  user_id: "u1",
  kind,
  target_id: "t1",
  title,
  created_at: "2026-07-01T00:00:00Z",
});

const NOW = new Date("2026-07-10T12:00:00Z");

describe("organize filters", () => {
  it("is inactive by default and matches everything", () => {
    expect(isFilterActive(EMPTY_FILTERS)).toBe(false);
    expect(matchCard(card(), [], [], EMPTY_FILTERS, NOW)).toBe(true);
  });

  it("searches title, description, and linked-content titles", () => {
    const f = { ...EMPTY_FILTERS, q: "beatitudes" };
    expect(matchCard(card(), [], [], f, NOW)).toBe(false);
    expect(matchCard(card({ description: "Cover the Beatitudes" }), [], [], f, NOW)).toBe(true);
    expect(matchCard(card(), [link("document", "Beatitudes draft")], [], f, NOW)).toBe(true);
  });

  it("matches any selected tag", () => {
    const f = { ...EMPTY_FILTERS, tagIds: ["t-a", "t-b"] };
    expect(matchCard(card(), [], ["t-b"], f, NOW)).toBe(true);
    expect(matchCard(card(), [], ["t-c"], f, NOW)).toBe(false);
  });

  it("filters by content kind including plain cards", () => {
    const docs = { ...EMPTY_FILTERS, kinds: ["document" as const] };
    expect(matchCard(card(), [link("document", "x")], [], docs, NOW)).toBe(true);
    expect(matchCard(card(), [link("session", "x")], [], docs, NOW)).toBe(false);
    const plain = { ...EMPTY_FILTERS, kinds: ["plain" as const] };
    expect(matchCard(card(), [], [], plain, NOW)).toBe(true);
    expect(matchCard(card(), [link("document", "x")], [], plain, NOW)).toBe(false);
  });

  it("understands due windows and completion", () => {
    const overdue = { ...EMPTY_FILTERS, due: "overdue" as const };
    expect(matchCard(card({ due_at: "2026-07-01T09:00:00Z" }), [], [], overdue, NOW)).toBe(true);
    expect(
      matchCard(card({ due_at: "2026-07-01T09:00:00Z", completed_at: "2026-07-02T09:00:00Z" }), [], [], overdue, NOW),
    ).toBe(false);
    const week = { ...EMPTY_FILTERS, due: "week" as const };
    expect(matchCard(card({ due_at: "2026-07-14T09:00:00Z" }), [], [], week, NOW)).toBe(true);
    expect(matchCard(card({ due_at: "2026-08-01T09:00:00Z" }), [], [], week, NOW)).toBe(false);
    const none = { ...EMPTY_FILTERS, due: "none" as const };
    expect(matchCard(card(), [], [], none, NOW)).toBe(true);
    expect(matchCard(card({ due_at: "2026-07-14T09:00:00Z" }), [], [], none, NOW)).toBe(false);
  });
});
