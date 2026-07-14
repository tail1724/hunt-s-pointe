import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useEzraSessions } from "./useEzraSessions";

// Stable user object: the real AuthContext returns a stable reference, and the
// loader effect is keyed on `user`. A fresh object each render would re-run the
// loader and clobber optimistic updates (pin/category).
const MOCK_USER = { id: "user-1" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: MOCK_USER }),
}));

// Relative to the real clock (no fake timers) so `waitFor`'s internal
// polling — which relies on real timer advancement — still resolves.
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const row = (over: Record<string, unknown>) => ({
  pinned_at: null,
  category: null,
  ...over,
});

const ROWS = [
  row({ id: "a", title: "Today's study", updated_at: iso(0) }),
  row({ id: "b", title: "Yesterday's outline", updated_at: iso(1) }),
  row({ id: "c", title: "Last week notes", updated_at: iso(4) }),
  row({ id: "d", title: "Old sermon", updated_at: iso(30) }),
];

const orderMock = vi.fn();
const eqMock = vi.fn();
const selectMock = vi.fn();
const updateMock = vi.fn();
const fromMock = vi.fn();
let rowsData = ROWS;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => fromMock(...args),
  },
}));

describe("useEzraSessions", () => {
  beforeEach(() => {
    orderMock.mockReset();
    eqMock.mockReset();
    selectMock.mockReset();
    updateMock.mockReset();
    fromMock.mockReset();
    rowsData = ROWS;

    orderMock.mockReturnValue({ limit: () => Promise.resolve({ data: rowsData }) });
    eqMock.mockReturnValue({ order: orderMock });
    selectMock.mockReturnValue({ eq: eqMock });
    // update(...).eq(...) resolves with no error
    updateMock.mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    fromMock.mockReturnValue({ select: selectMock, update: updateMock });
  });

  it("groups sessions into Today/Yesterday/Previous 7 days/Older", async () => {
    const { result } = renderHook(() => useEzraSessions({ activeSessionId: null, refreshKey: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const labels = result.current.grouped.map((g) => g.label);
    expect(labels).toEqual(["Today", "Yesterday", "Previous 7 days", "Older"]);
    expect(result.current.grouped.find((g) => g.label === "Today")?.rows[0].id).toBe("a");
    expect(result.current.grouped.find((g) => g.label === "Older")?.rows[0].id).toBe("d");
  });

  it("filters sessions by search query (case-insensitive)", async () => {
    const { result } = renderHook(() => useEzraSessions({ activeSessionId: null, refreshKey: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setQuery("SERMON"));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("d");
  });

  it("returns an empty group list when search matches nothing", async () => {
    const { result } = renderHook(() => useEzraSessions({ activeSessionId: null, refreshKey: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setQuery("zzz-no-match"));
    expect(result.current.filtered).toHaveLength(0);
    expect(result.current.grouped).toHaveLength(0);
  });

  it("orders groups Pinned → categories (alphabetical) → time buckets", async () => {
    rowsData = [
      row({ id: "p", title: "Pinned one", updated_at: iso(0), pinned_at: iso(0) }),
      row({ id: "s", title: "Sermon prep", updated_at: iso(0), category: "Sermons" }),
      row({ id: "a", title: "Advent notes", updated_at: iso(0), category: "Advent" }),
      row({ id: "t", title: "Loose thought", updated_at: iso(0) }),
    ];
    const { result } = renderHook(() => useEzraSessions({ activeSessionId: null, refreshKey: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.grouped.map((g) => g.label)).toEqual(["Pinned", "Advent", "Sermons", "Today"]);
    expect(result.current.grouped[0].kind).toBe("pinned");
    expect(result.current.categories).toEqual(["Advent", "Sermons"]);
  });

  it("pins optimistically, moving the row into the Pinned group", async () => {
    const { result } = renderHook(() => useEzraSessions({ activeSessionId: null, refreshKey: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.togglePin("d"); });
    const pinned = result.current.grouped.find((g) => g.kind === "pinned");
    expect(pinned?.rows.map((r) => r.id)).toEqual(["d"]);
    expect(updateMock).toHaveBeenCalled();
  });
});
