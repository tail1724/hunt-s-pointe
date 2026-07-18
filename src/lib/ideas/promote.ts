import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { nextPosition } from "@/lib/organize/types";
import type { IdeaNote } from "./store";

/**
 * Promote a locally captured idea into the Organize Kanban: the card lands
 * at the end of the board's first (leftmost) column — the pipeline's inbox.
 * The local note stays on the Idea Board, flagged with its destination, so
 * capture history is never silently destroyed.
 */
export function usePromoteIdea() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { idea: IdeaNote; boardId: string }) => {
      if (!user) throw new Error("Not signed in");
      const { data: columns, error: colError } = await supabase
        .from("board_columns")
        .select("id, position")
        .eq("board_id", input.boardId)
        .order("position")
        .limit(1);
      if (colError) throw colError;
      const inbox = columns?.[0];
      if (!inbox) throw new Error("That board has no columns yet");

      const { data: siblings, error: sibError } = await supabase
        .from("cards")
        .select("position")
        .eq("column_id", inbox.id);
      if (sibError) throw sibError;

      const text = input.idea.text.trim();
      const newline = text.indexOf("\n");
      const title = (newline === -1 ? text : text.slice(0, newline)).slice(0, 140) || "Untitled idea";
      const description = newline === -1 && text.length <= 140 ? null : text;

      const { data: card, error } = await supabase
        .from("cards")
        .insert({
          user_id: user.id,
          board_id: input.boardId,
          column_id: inbox.id,
          title,
          description,
          cover_color: input.idea.color,
          position: nextPosition(siblings ?? []),
        })
        .select("id")
        .single();
      if (error) throw error;
      return { cardId: card.id, boardId: input.boardId };
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ["organize", "board", input.boardId] });
    },
  });
}
