import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PressRoomSessionRow {
  id: string;
  title: string | null;
  updated_at: string;
  pinned_at: string | null;
  category: string | null;
}

type TimeGroupKey = "Today" | "Yesterday" | "Previous 7 days" | "Older";
const TIME_GROUP_ORDER: TimeGroupKey[] = ["Today", "Yesterday", "Previous 7 days", "Older"];

/** A rendered group in the drawer: pinned, a named category, or a time bucket. */
export type SessionGroupKind = "pinned" | "category" | "time";
export interface SessionGroup {
  label: string;
  kind: SessionGroupKind;
  rows: PressRoomSessionRow[];
}

function timeGroupFor(updatedAt: string): TimeGroupKey {
  const d = new Date(updatedAt);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "Previous 7 days";
  return "Older";
}

/**
 * Session list, search, rename, and delete — shared between the desktop
 * PressRoomRail and the mobile PressRoomSessionsDrawer so both surfaces stay in sync
 * and neither re-implements the same Supabase calls.
 */
export function usePressRoomSessions({
  activeSessionId,
  refreshKey,
  onActiveDeleted,
}: {
  activeSessionId: string | null;
  refreshKey: number;
  /** Called when the currently-open session is the one being deleted. */
  onActiveDeleted?: () => void;
}) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PressRoomSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("partner_sessions")
        .select("id, title, updated_at, pinned_at, category")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(40);
      if (data) setSessions(data as PressRoomSessionRow[]);
      setLoading(false);
    })();
  }, [user, refreshKey, activeSessionId]);

  const filtered = useMemo(
    () => {
      const q = query.trim().toLowerCase();
      if (!q) return sessions;
      return sessions.filter(
        (s) =>
          (s.title || "").toLowerCase().includes(q) ||
          (s.category || "").toLowerCase().includes(q),
      );
    },
    [sessions, query],
  );

  // Group order: Pinned first, then categories (alphabetical), then the
  // time buckets for everything uncategorized. A search still narrows the
  // rows; the groups just reflect whatever survives the filter.
  const grouped = useMemo<SessionGroup[]>(() => {
    const pinned = filtered
      .filter((s) => s.pinned_at)
      .sort((a, b) => (b.pinned_at || "").localeCompare(a.pinned_at || ""));

    const rest = filtered.filter((s) => !s.pinned_at);
    const categoryMap = new Map<string, PressRoomSessionRow[]>();
    const uncategorized: PressRoomSessionRow[] = [];
    for (const s of rest) {
      const cat = s.category?.trim();
      if (cat) {
        if (!categoryMap.has(cat)) categoryMap.set(cat, []);
        categoryMap.get(cat)!.push(s);
      } else {
        uncategorized.push(s);
      }
    }

    const timeMap = new Map<TimeGroupKey, PressRoomSessionRow[]>();
    for (const s of uncategorized) {
      const g = timeGroupFor(s.updated_at);
      if (!timeMap.has(g)) timeMap.set(g, []);
      timeMap.get(g)!.push(s);
    }

    const groups: SessionGroup[] = [];
    if (pinned.length) groups.push({ label: "Pinned", kind: "pinned", rows: pinned });
    for (const cat of [...categoryMap.keys()].sort((a, b) => a.localeCompare(b))) {
      groups.push({ label: cat, kind: "category", rows: categoryMap.get(cat)! });
    }
    for (const g of TIME_GROUP_ORDER) {
      if (timeMap.has(g)) groups.push({ label: g, kind: "time", rows: timeMap.get(g)! });
    }
    return groups;
  }, [filtered]);

  /** Distinct categories the user has already used (for the assign menu). */
  const categories = useMemo(
    () =>
      [...new Set(sessions.map((s) => s.category?.trim()).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b),
      ),
    [sessions],
  );

  const startRename = useCallback((s: PressRoomSessionRow) => {
    setRenamingId(s.id);
    setRenameValue(s.title || "");
  }, []);

  const cancelRename = useCallback(() => setRenamingId(null), []);

  const commitRename = useCallback(async () => {
    const id = renamingId;
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!id || !trimmed) return;
    const prev = sessions.find((s) => s.id === id)?.title;
    if (trimmed === prev) return;
    setSessions((rows) => rows.map((s) => (s.id === id ? { ...s, title: trimmed } : s)));
    const { error } = await supabase
      .from("partner_sessions")
      .update({ title: trimmed })
      .eq("id", id);
    if (error) {
      toast.error("Failed to rename");
      setSessions((rows) => rows.map((s) => (s.id === id ? { ...s, title: prev ?? null } : s)));
    }
  }, [renamingId, renameValue, sessions]);

  const togglePin = useCallback(
    async (id: string) => {
      const row = sessions.find((s) => s.id === id);
      if (!row) return;
      const nextPinned = row.pinned_at ? null : new Date().toISOString();
      setSessions((rows) => rows.map((s) => (s.id === id ? { ...s, pinned_at: nextPinned } : s)));
      const { error } = await supabase
        .from("partner_sessions")
        .update({ pinned_at: nextPinned })
        .eq("id", id);
      if (error) {
        toast.error("Failed to update pin");
        setSessions((rows) => rows.map((s) => (s.id === id ? { ...s, pinned_at: row.pinned_at } : s)));
      }
    },
    [sessions],
  );

  const setCategory = useCallback(
    async (id: string, category: string | null) => {
      const row = sessions.find((s) => s.id === id);
      if (!row) return;
      const next = category?.trim() || null;
      setSessions((rows) => rows.map((s) => (s.id === id ? { ...s, category: next } : s)));
      const { error } = await supabase
        .from("partner_sessions")
        .update({ category: next })
        .eq("id", id);
      if (error) {
        toast.error("Failed to update category");
        setSessions((rows) => rows.map((s) => (s.id === id ? { ...s, category: row.category } : s)));
      } else if (next) {
        toast.success(`Moved to "${next}"`);
      }
    },
    [sessions],
  );

  /** Deletes immediately — callers confirm first (designed ConfirmDialog, not window.confirm). */
  const handleDelete = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("partner_sessions").delete().eq("id", id);
      if (error) {
        toast.error("Failed to delete");
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) onActiveDeleted?.();
      toast.success("Deleted");
    },
    [activeSessionId, onActiveDeleted],
  );

  return {
    sessions,
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
    cancelRename,
    commitRename,
    handleDelete,
    togglePin,
    setCategory,
  };
}
