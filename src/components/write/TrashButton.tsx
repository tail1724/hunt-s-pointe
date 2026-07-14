import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  count: number;
  onClick: () => void;
}

export function TrashButton({ count, onClick }: Props) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      aria-label={`Open trash (${count} ${count === 1 ? "item" : "items"})`}
      className="group relative gap-2 transition-all duration-300 hover:border-accent/60 hover:shadow-[0_6px_18px_-8px_hsl(var(--accent)/0.5)]"
    >
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <Trash2
          className="h-4 w-4 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:rotate-[-6deg] motion-reduce:transform-none"
        />
      </span>
      <span className="hidden sm:inline">Trash</span>
      {count > 0 && (
        <span
          className={cn(
            "ml-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 py-0.5",
            "text-[10px] font-semibold leading-none text-accent-foreground",
            "animate-in zoom-in-50 duration-300",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
