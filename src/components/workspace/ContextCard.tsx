import { useDraggable } from "@dnd-kit/core";
import { Check, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

interface ContextCardProps {
  stack: Tables<"context_stacks">;
  selected: boolean;
  onToggle: () => void;
}

export function ContextCard({ stack, selected, onToggle }: ContextCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: stack.id,
    data: { stack },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative rounded-lg border bg-card p-3 text-left transition-all duration-200",
        "hover:shadow-[var(--shadow-card-hover)] hover:border-primary/40",
        selected
          ? "border-primary shadow-[var(--glow-zest)]"
          : "border-border shadow-[var(--shadow-card)]",
        isDragging && "opacity-50 scale-95"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 cursor-grab text-muted-foreground/50 hover:text-muted-foreground touch-none"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {selected && (
        <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary">
          <Check className="h-3 w-3 text-secondary-foreground" />
        </div>
      )}

      {/* Click area for toggle */}
      <button onClick={onToggle} className="w-full text-left pr-5">
        <p className="font-display text-sm font-semibold text-card-foreground leading-tight">
          {stack.name}
        </p>
        {stack.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {stack.description}
          </p>
        )}
        <span className="mt-2 inline-block rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {stack.category}
        </span>
      </button>
    </div>
  );
}
