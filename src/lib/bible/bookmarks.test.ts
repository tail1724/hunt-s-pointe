import { beforeEach, describe, expect, it, vi } from "vitest";

// Signed-out path only: the Supabase client must not be constructed in tests.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { loadAllBookmarks, loadChapterBookmarks, toggleBookmark } from "./bookmarks";

describe("bible bookmarks (localStorage fallback, signed out)", () => {
  beforeEach(() => localStorage.clear());

  it("toggles a chapter ribbon on and off", async () => {
    expect(await toggleBookmark(undefined, "KJV", "john", 3, null, false)).toBe(true);
    let marks = await loadChapterBookmarks(undefined, "john", 3);
    expect(marks).toHaveLength(1);
    expect(marks[0].verse).toBeNull();

    expect(await toggleBookmark(undefined, "KJV", "john", 3, null, true)).toBe(false);
    marks = await loadChapterBookmarks(undefined, "john", 3);
    expect(marks).toHaveLength(0);
  });

  it("keeps verse bookmarks distinct from the chapter ribbon", async () => {
    await toggleBookmark(undefined, "KJV", "john", 3, null, false);
    await toggleBookmark(undefined, "KJV", "john", 3, 16, false);
    const marks = await loadChapterBookmarks(undefined, "john", 3);
    expect(marks.map((m) => m.verse).sort()).toEqual([16, null].sort());
    // Removing the verse leaves the ribbon.
    await toggleBookmark(undefined, "KJV", "john", 3, 16, true);
    const after = await loadChapterBookmarks(undefined, "john", 3);
    expect(after).toHaveLength(1);
    expect(after[0].verse).toBeNull();
  });

  it("scopes chapters and lists everything newest first", async () => {
    await toggleBookmark(undefined, "KJV", "john", 3, 16, false);
    await toggleBookmark(undefined, "KJV", "psalms", 23, null, false);
    expect(await loadChapterBookmarks(undefined, "john", 4)).toHaveLength(0);
    const all = await loadAllBookmarks(undefined);
    expect(all).toHaveLength(2);
    expect(all.map((b) => b.book).sort()).toEqual(["john", "psalms"]);
  });
});
