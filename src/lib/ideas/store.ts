import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Idea Board — local-first brainstorming store.
 *
 * Ideas save to localStorage before any network acknowledgement (integration
 * PRD §5.1: capture must be visibly safe within five seconds, survive refresh,
 * crash, and connectivity loss). Promotion into the Organize Kanban is the
 * explicit sync step; until then an idea lives entirely on this device.
 */

export interface IdeaNote {
  id: string;
  text: string;
  /** Accent key shared with the Organize palette (types.ORGANIZE_COLORS). */
  color: string;
  /** Freeform canvas position (px, desktop spatial view). */
  x: number;
  y: number;
  createdAt: string;
  updatedAt: string;
  /** Set once the idea has been promoted to a Kanban card. */
  promotedTo: { boardId: string; cardId: string } | null;
}

export const IDEA_CANVAS_WIDTH = 2400;
export const IDEA_CANVAS_HEIGHT = 1600;
export const IDEA_NOTE_WIDTH = 224;

const STORE_VERSION = 1;

interface IdeaStoreShape {
  version: number;
  ideas: IdeaNote[];
}

function storageKey(userId: string | undefined): string {
  return `hp:idea-board:v${STORE_VERSION}:${userId ?? "anon"}`;
}

function readStore(key: string): IdeaNote[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IdeaStoreShape;
    if (!parsed || !Array.isArray(parsed.ideas)) return [];
    return parsed.ideas.filter((i) => i && typeof i.id === "string" && typeof i.text === "string");
  } catch {
    return [];
  }
}

function writeStore(key: string, ideas: IdeaNote[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify({ version: STORE_VERSION, ideas } satisfies IdeaStoreShape));
    return true;
  } catch {
    return false;
  }
}

/** Cascade fresh captures across the top-left of the canvas so they never stack. */
export function nextCapturePosition(count: number): { x: number; y: number } {
  const col = count % 4;
  const row = Math.floor(count / 4) % 6;
  return {
    x: 48 + col * (IDEA_NOTE_WIDTH + 40) + row * 18,
    y: 48 + row * 150 + col * 10,
  };
}

export type IdeaSaveState = "saved" | "error";

export function useIdeaBoard() {
  const { user } = useAuth();
  const key = storageKey(user?.id);
  const [ideas, setIdeas] = useState<IdeaNote[]>(() => readStore(key));
  const [saveState, setSaveState] = useState<IdeaSaveState>("saved");
  const keyRef = useRef(key);

  // Account switches (or first sign-in) re-point the store.
  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      setIdeas(readStore(key));
    }
  }, [key]);

  // Cross-tab sync: another tab capturing an idea updates this one.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === keyRef.current) setIdeas(readStore(keyRef.current));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((updater: (prev: IdeaNote[]) => IdeaNote[]) => {
    setIdeas((prev) => {
      const next = updater(prev);
      setSaveState(writeStore(keyRef.current, next) ? "saved" : "error");
      return next;
    });
  }, []);

  const addIdea = useCallback(
    (text: string, position?: { x: number; y: number }): IdeaNote => {
      const now = new Date().toISOString();
      const idea: IdeaNote = {
        id: crypto.randomUUID(),
        text: text.trim(),
        color: "gold",
        ...(position ?? nextCapturePosition(0)),
        createdAt: now,
        updatedAt: now,
        promotedTo: null,
      };
      commit((prev) => {
        const pos = position ?? nextCapturePosition(prev.length);
        return [...prev, { ...idea, x: pos.x, y: pos.y }];
      });
      return idea;
    },
    [commit],
  );

  const updateIdea = useCallback(
    (id: string, patch: Partial<Pick<IdeaNote, "text" | "color" | "x" | "y" | "promotedTo">>) => {
      commit((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i)),
      );
    },
    [commit],
  );

  const removeIdea = useCallback(
    (id: string) => {
      commit((prev) => prev.filter((i) => i.id !== id));
    },
    [commit],
  );

  const sortedNewestFirst = useMemo(
    () => [...ideas].sort((a, z) => z.createdAt.localeCompare(a.createdAt)),
    [ideas],
  );

  return { ideas, sortedNewestFirst, saveState, addIdea, updateIdea, removeIdea };
}
