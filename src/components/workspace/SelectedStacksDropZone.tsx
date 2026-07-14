import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface SortableChipProps {
  id: string;
  stack: Tables<"context_stacks"> | undefined;
  onRemove: () => void;
}

function SortableChip({ id, stack, onRemove }: SortableChipProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs font-medium text-card-foreground",
        "transition-shadow",
        isDragging && "z-50 shadow-lg opacity-80 border-primary"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-3 w-3" />
      </button>
      <span className="truncate max-w-[120px]">{stack?.name ?? id}</span>
      <button onClick={onRemove} className="text-muted-foreground hover:text-destructive">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

interface SelectedStacksDropZoneProps {
  selectedIds: string[];
  stacks: Tables<"context_stacks">[];
  onRemove: (id: string) => void;
  onReorder: (ids: string[]) => void;
}

export function SelectedStacksDropZone({
  selectedIds,
  stacks,
  onRemove,
  onReorder,
}: SelectedStacksDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id: "selected-drop-zone" });

  const stackMap = new Map(stacks.map((s) => [s.id, s]));

  return (
    <div className="space-y-2">
      <label className="font-display text-sm font-semibold text-foreground">
        Selected Stacks
      </label>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[56px] rounded-lg border-2 border-dashed p-3 transition-colors duration-200",
          isOver
            ? "border-primary bg-primary/5"
            : selectedIds.length > 0
            ? "border-border bg-card/50"
            : "border-muted-foreground/30 bg-muted/30"
        )}
      >
        {selectedIds.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-1">
            Drag context cards here or click to select
          </p>
        ) : (
          <SortableContext items={selectedIds} strategy={horizontalListSortingStrategy}>
            <div className="flex flex-wrap gap-2">
              {selectedIds.map((id) => (
                <SortableChip
                  key={id}
                  id={id}
                  stack={stackMap.get(id)}
                  onRemove={() => onRemove(id)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
