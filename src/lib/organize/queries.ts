// Data layer for Organize: TanStack Query over the typed Supabase client.
// Board content is fetched as one bundle per board; drags patch the cache
// optimistically and reconcile via invalidation (plus Realtime for other tabs).

import { useEffect } from "react";
import {
  useMutation, useQuery, useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Board, BoardBundle, BoardColumn, Card, CardLink, OrganizeTag, OrgEvent,
} from "./types";
import { nextPosition, POSITION_GAP } from "./types";

const keys = {
  boards: ["organize", "boards"] as const,
  bundle: (boardId: string) => ["organize", "board", boardId] as const,
  tags: ["organize", "tags"] as const,
  events: ["organize", "events"] as const,
};

// ---------------------------------------------------------------- boards

export function useBoards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.boards,
    enabled: !!user,
    queryFn: async (): Promise<Board[]> => {
      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .order("position");
      if (error) throw error;
      return data;
    },
  });
}

const STARTER_COLUMNS = ["Ideas", "In progress", "Ready", "Done"];

/** Quantum Newsroom editorial pipeline stages (integration PRD §5.2). */
export const EDITORIAL_PIPELINE_COLUMNS = [
  "Inbox",
  "Research",
  "Prompt Ready",
  "Drafting",
  "Human Edit",
  "Assets",
  "Ready for Review",
  "Sent to Payload",
  "Published",
];

export const BOARD_TEMPLATES = {
  starter: { label: "Starter", columns: STARTER_COLUMNS },
  editorial: { label: "Editorial pipeline", columns: EDITORIAL_PIPELINE_COLUMNS },
} as const;

export type BoardTemplate = keyof typeof BOARD_TEMPLATES;

export function useCreateBoard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      emoji?: string;
      seedColumns?: boolean;
      template?: BoardTemplate;
    }) => {
      if (!user) throw new Error("Not signed in");
      const { data: board, error } = await supabase
        .from("boards")
        .insert({ user_id: user.id, title: input.title, emoji: input.emoji ?? null })
        .select("*")
        .single();
      if (error) throw error;
      if (input.seedColumns !== false) {
        const columns = BOARD_TEMPLATES[input.template ?? "starter"].columns;
        const { error: colError } = await supabase.from("board_columns").insert(
          columns.map((title, i) => ({
            board_id: board.id,
            user_id: user.id,
            title,
            position: (i + 1) * POSITION_GAP,
          })),
        );
        if (colError) throw colError;
      }
      return board;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.boards }),
  });
}

export function useUpdateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string } & Partial<Pick<Board, "title" | "emoji" | "tint">>) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from("boards").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.boards }),
  });
}

export function useDeleteBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("boards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organize"] }),
  });
}

// ---------------------------------------------------------------- bundle

export function useBoardBundle(boardId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.bundle(boardId ?? "none"),
    enabled: !!user && !!boardId,
    queryFn: async (): Promise<BoardBundle> => {
      const id = boardId as string;
      const [board, columns, cards, links, cardTags] = await Promise.all([
        supabase.from("boards").select("*").eq("id", id).single(),
        supabase.from("board_columns").select("*").eq("board_id", id).order("position"),
        supabase.from("cards").select("*").eq("board_id", id).order("position"),
        supabase.from("card_links").select("*"),
        supabase.from("card_tags").select("card_id, tag_id"),
      ]);
      const firstError = board.error ?? columns.error ?? cards.error ?? links.error ?? cardTags.error;
      if (firstError) throw firstError;
      const cardIds = new Set((cards.data ?? []).map((c) => c.id));
      return {
        board: board.data,
        columns: columns.data ?? [],
        cards: cards.data ?? [],
        links: (links.data ?? []).filter((l) => cardIds.has(l.card_id)),
        cardTags: (cardTags.data ?? []).filter((ct) => cardIds.has(ct.card_id)),
      };
    },
  });
}

function patchBundle(
  qc: ReturnType<typeof useQueryClient>,
  boardId: string,
  fn: (b: BoardBundle) => BoardBundle,
) {
  qc.setQueryData<BoardBundle>(keys.bundle(boardId), (prev) => (prev ? fn(prev) : prev));
}

// ---------------------------------------------------------------- columns

export function useCreateColumn(boardId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; columns: BoardColumn[] }) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("board_columns").insert({
        board_id: boardId,
        user_id: user.id,
        title: input.title,
        position: nextPosition(input.columns),
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.bundle(boardId) }),
  });
}

export function useUpdateColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string } & Partial<Pick<BoardColumn, "title" | "color" | "wip_limit" | "position">>) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from("board_columns").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async (input) => {
      patchBundle(qc, boardId, (b) => ({
        ...b,
        columns: b.columns
          .map((c) => (c.id === input.id ? { ...c, ...input } : c))
          .sort((a, z) => a.position - z.position),
      }));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.bundle(boardId) }),
  });
}

export function useDeleteColumn(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("board_columns").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.bundle(boardId) }),
  });
}

// ---------------------------------------------------------------- cards

export function useCreateCard(boardId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      columnId: string;
      title: string;
      siblings: Card[];
      due_at?: string | null;
    }) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("cards")
        .insert({
          board_id: boardId,
          column_id: input.columnId,
          user_id: user.id,
          title: input.title,
          due_at: input.due_at ?? null,
          position: nextPosition(input.siblings),
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.bundle(boardId) }),
  });
}

export type CardPatch = Partial<
  Pick<Card, "title" | "description" | "cover_color" | "due_at" | "all_day" | "checklist" | "completed_at" | "column_id" | "position">
>;

export function useUpdateCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string } & CardPatch) => {
      const { id, ...patch } = input;
      const { error } = await supabase.from("cards").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async (input) => {
      patchBundle(qc, boardId, (b) => ({
        ...b,
        cards: b.cards
          .map((c) => (c.id === input.id ? { ...c, ...input } : c))
          .sort((a, z) => a.position - z.position),
      }));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.bundle(boardId) });
      qc.invalidateQueries({ queryKey: keys.events });
    },
  });
}

export function useDeleteCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cards").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      patchBundle(qc, boardId, (b) => ({ ...b, cards: b.cards.filter((c) => c.id !== id) }));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.bundle(boardId) }),
  });
}

// ---------------------------------------------------------------- links

export function useAddCardLink(boardId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Pick<CardLink, "card_id" | "kind" | "target_id" | "title">) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("card_links").insert({ ...input, user_id: user.id });
      if (error && error.code !== "23505") throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.bundle(boardId) }),
  });
}

export function useRemoveCardLink(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("card_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.bundle(boardId) }),
  });
}

// ---------------------------------------------------------------- tags

export function useTags() {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.tags,
    enabled: !!user,
    queryFn: async (): Promise<OrganizeTag[]> => {
      const { data, error } = await supabase.from("organize_tags").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTag() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color: string }) => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("organize_tags")
        .insert({ user_id: user.id, name: input.name, color: input.color })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.tags }),
  });
}

export function useSetCardTag(boardId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { cardId: string; tagId: string; on: boolean }) => {
      if (!user) throw new Error("Not signed in");
      if (input.on) {
        const { error } = await supabase
          .from("card_tags")
          .insert({ card_id: input.cardId, tag_id: input.tagId, user_id: user.id });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("card_tags")
          .delete()
          .eq("card_id", input.cardId)
          .eq("tag_id", input.tagId);
        if (error) throw error;
      }
    },
    onMutate: async (input) => {
      patchBundle(qc, boardId, (b) => ({
        ...b,
        cardTags: input.on
          ? [...b.cardTags, { card_id: input.cardId, tag_id: input.tagId }]
          : b.cardTags.filter((ct) => !(ct.card_id === input.cardId && ct.tag_id === input.tagId)),
      }));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.bundle(boardId) }),
  });
}

// ---------------------------------------------------------------- events

export function useEvents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.events,
    enabled: !!user,
    queryFn: async (): Promise<OrgEvent[]> => {
      const { data, error } = await supabase.from("events").select("*").order("starts_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveEvent() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: { id?: string } & Pick<OrgEvent, "title" | "starts_at" | "ends_at" | "all_day" | "color"> &
        Partial<Pick<OrgEvent, "description" | "card_id">>,
    ) => {
      if (!user) throw new Error("Not signed in");
      const { id, ...fields } = input;
      if (id) {
        const { error } = await supabase.from("events").update(fields).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert({ ...fields, user_id: user.id });
        if (error) throw error;
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.events }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.events }),
  });
}

// ---------------------------------------------------------------- realtime

/** Other tabs/devices: any change to this user's Organize rows refetches. */
export function useOrganizeRealtime(boardId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user || !boardId) return;
    let timer: number | undefined;
    const refetch = () => {
      // Coalesce bursts (a drag writes several rows).
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        qc.invalidateQueries({ queryKey: keys.bundle(boardId) });
        qc.invalidateQueries({ queryKey: keys.boards });
        qc.invalidateQueries({ queryKey: keys.events });
      }, 400);
    };
    const channel = supabase
      .channel(`organize-${boardId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cards", filter: `board_id=eq.${boardId}` }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "board_columns", filter: `board_id=eq.${boardId}` }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "events", filter: `user_id=eq.${user.id}` }, refetch)
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [user, boardId, qc]);
}
